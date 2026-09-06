const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');
const SecurityPolicy = require('../models/SecurityPolicy');
const { DEFAULT_POLICY, DECISION } = require('../config/constants');
const { getEndpointProfile } = require('./policy/endpointProfiles');
const { validateJwt } = require('./auth/jwtValidator');
const { checkBolaAuthorization } = require('./auth/bolaDetector');
const { detectSqlInjection } = require('./injection/sqliDetector');
const { detectXss } = require('./xss/xssDetector');
const { trackRequestBehavior } = require('./behavior/behaviorBaseline');
const { detectBehaviorAnomalies } = require('./behavior/anomalyDetector');
const { getReputation, recordThreatEvent } = require('./reputation/reputationManager');
const { correlateThreatEvents } = require('./correlation/threatCorrelator');
const { processCampaign } = require('./campaign/campaignManager');
const { checkRateLimit } = require('./rateLimit/rateLimiter');
const { detectBehavioralEnumeration } = require('./enumeration/enumerationDetector');
const { calculateAdaptiveRiskAndConfidence } = require('./risk/riskScorer');
const { makeDecision } = require('./decision/decisionEngine');
const { sendBlockedResponse, sendRateLimitedResponse, applyGatewayHeaders } = require('./response/responseHandler');
const { logSecurityEvent } = require('./logging/eventLogger');
const { broadcastEvent } = require('../services/socketService');

let activePolicyCache = null;

async function getActivePolicy() {
  if (activePolicyCache) return activePolicyCache;
  if (mongoose.connection.readyState !== 1) return DEFAULT_POLICY;

  try {
    let policy = await SecurityPolicy.findOne({ policyName: 'Global Gateway Security Policy' });
    if (!policy) {
      policy = await SecurityPolicy.create({ policyName: 'Global Gateway Security Policy', ...DEFAULT_POLICY });
    }
    activePolicyCache = policy;
    return activePolicyCache;
  } catch (error) {
    return DEFAULT_POLICY;
  }
}

function clearPolicyCache() {
  activePolicyCache = null;
}

async function securityGateway(req, res, next) {
  const startTime = process.hrtime();
  const requestId = `REQ-${uuidv4().substring(0, 8).toUpperCase()}`;
  const ipAddress = req.ip || req.connection?.remoteAddress || '127.0.0.1';
  
  if (req.path.startsWith('/security') || req.path.startsWith('/simulation') || req.originalUrl.startsWith('/api/security') || req.originalUrl.startsWith('/api/simulation')) {
    return next();
  }

  const policy = await getActivePolicy();
  const profile = getEndpointProfile(req.path);
  const threats = [];

  // Check Whitelist / Blacklist Overrides
  if (policy.whitelistedIPs && policy.whitelistedIPs.includes(ipAddress)) {
    const latencyMs = calculateLatencyMs(startTime);
    const telemetry = {
      requestId,
      ipAddress,
      userId: 'whitelisted_ip',
      method: req.method,
      endpoint: req.originalUrl,
      threatTypes: [],
      severity: 'LOW',
      confidence: 100,
      riskScore: 0,
      riskBreakdown: [],
      decision: DECISION.ALLOW,
      reason: 'IP Whitelisted by Security Policy',
      explanation: 'IP explicitly whitelisted in security settings.',
      latencyMs
    };
    applyGatewayHeaders(res, telemetry);
    req.securityGateway = telemetry;
    logSecurityEvent(telemetry);
    return next();
  }

  if (policy.blacklistedIPs && policy.blacklistedIPs.includes(ipAddress)) {
    const latencyMs = calculateLatencyMs(startTime);
    const telemetry = {
      requestId,
      ipAddress,
      userId: 'blacklisted_ip',
      method: req.method,
      endpoint: req.originalUrl,
      threatTypes: ['BLACKLISTED_IP'],
      severity: 'CRITICAL',
      confidence: 100,
      riskScore: 100,
      riskBreakdown: [{ detector: 'BLACKLISTED_IP', score: 100, reason: 'IP explicitly blacklisted' }],
      decision: DECISION.BLOCK,
      reason: 'IP explicitly blacklisted by Security Policy',
      explanation: 'Access denied: IP address resides on permanent black list.',
      latencyMs
    };
    logSecurityEvent(telemetry);
    return sendBlockedResponse(res, telemetry);
  }

  // 1. JWT Authentication Check
  const publicEndpoints = ['/login', '/products', '/search', '/api/login', '/api/products', '/api/search'];
  const isPublic = publicEndpoints.includes(req.path) || publicEndpoints.includes(req.originalUrl);
  const isProtectedPath = !isPublic;
  let user = null;

  if (policy.modulesEnabled.jwtAuth && isProtectedPath) {
    const authResult = validateJwt(req);
    if (!authResult.isValid && authResult.threat) {
      threats.push(authResult.threat);
    } else if (authResult.user) {
      user = authResult.user;
      req.user = authResult.user; // Propagate req.user
    }
  }

  // 2. Endpoint-Aware BOLA / Authorization Check
  if (policy.modulesEnabled.bolaAuth && user && isProtectedPath) {
    const bolaThreat = checkBolaAuthorization(req, user);
    if (bolaThreat) {
      threats.push(bolaThreat);
    }
  }

  // 3. Multi-Signal SQL Injection Detection
  if (policy.modulesEnabled.sqliDetection) {
    const sqliThreat = detectSqlInjection(req);
    if (sqliThreat) {
      threats.push(sqliThreat);
    }
  }

  // 4. Input Validation & XSS Detection
  if (policy.modulesEnabled.xssDetection) {
    const xssThreat = detectXss(req);
    if (xssThreat) {
      threats.push(xssThreat);
    }
  }

  // 5. Behavioral Resource Enumeration Detection
  if (policy.modulesEnabled.enumerationDetection) {
    const enumThreat = detectBehavioralEnumeration(req, policy);
    if (enumThreat) {
      threats.push(enumThreat);
    }
  }

  // 6. Behavioral Baseline & Anomaly Detection
  trackRequestBehavior(req, user, 200);
  const anomaly = detectBehaviorAnomalies(req, user, profile);

  // 7. IP & User Reputation Lookup
  const reputation = getReputation(ipAddress);

  // 8. Adaptive Multi-Dimensional Risk Engine
  const scoring = calculateAdaptiveRiskAndConfidence(threats, req, user, profile, anomaly, reputation, null);

  // 9. Threat Correlation & Attack Chain Assembly
  let chain = null;
  let campaign = null;
  if (threats.length > 0 || scoring.riskScore >= 40) {
    recordThreatEvent(ipAddress, scoring.riskScore);
    const mockTelemetry = {
      requestId,
      ipAddress,
      userId: user ? (user.username || user.userId) : 'anonymous',
      method: req.method,
      endpoint: req.originalUrl,
      threatTypes: scoring.threatTypes,
      riskScore: scoring.riskScore,
      decision: scoring.riskScore >= 80 ? DECISION.BLOCK : DECISION.MONITOR,
      severity: scoring.severity,
      confidence: scoring.confidence
    };
    chain = correlateThreatEvents(mockTelemetry, policy);
    if (chain) {
      campaign = processCampaign(chain, policy);
    }
  }

  // Re-calculate scoring if correlation bonus applies
  const finalScoring = chain ? calculateAdaptiveRiskAndConfidence(threats, req, user, profile, anomaly, reputation, chain) : scoring;

  // 10. Adaptive Rate Limiting Check
  if (policy.modulesEnabled.rateLimiting) {
    const rateResult = checkRateLimit(req, policy, { profile, reputation, riskScore: finalScoring.riskScore });
    if (rateResult.threat) {
      threats.push(rateResult.threat);
    }
  }

  // 11. Decision Engine Mapping
  const decision = makeDecision(finalScoring.riskScore, finalScoring.threatTypes, policy);
  const latencyMs = calculateLatencyMs(startTime);

  const telemetry = {
    requestId,
    ipAddress,
    userId: user ? (user.username || user.userId) : 'anonymous',
    method: req.method,
    endpoint: req.originalUrl,
    threatTypes: finalScoring.threatTypes,
    severity: finalScoring.severity,
    confidence: finalScoring.confidence,
    riskScore: finalScoring.riskScore,
    riskBreakdown: finalScoring.riskBreakdown,
    breakdown: finalScoring.breakdown,
    behaviorScore: finalScoring.breakdown.behaviorScore,
    endpointScore: finalScoring.breakdown.endpointScore,
    reputationScore: finalScoring.breakdown.reputationScore,
    correlationScore: finalScoring.breakdown.correlationScore,
    decision,
    reason: finalScoring.threatTypes.length > 0 ? finalScoring.threatTypes.join(', ') : 'SAFE_REQUEST',
    explanation: finalScoring.explanation,
    chainId: chain ? chain.chainId : null,
    campaignId: campaign ? campaign.campaignId : null,
    latencyMs
  };

  logSecurityEvent(telemetry);

  // Broadcast real-time Phase 2 Socket.IO updates
  if (anomaly && anomaly.score > 30) broadcastEvent('behavior-anomaly', { ipAddress, anomaly });
  if (campaign) broadcastEvent('attack-campaign', campaign);

  if (decision === DECISION.BLOCK) {
    return sendBlockedResponse(res, telemetry);
  }

  if (decision === DECISION.RATE_LIMIT) {
    return sendRateLimitedResponse(res, telemetry);
  }

  applyGatewayHeaders(res, telemetry);
  req.securityGateway = telemetry;
  next();
}

function calculateLatencyMs(startTime) {
  const diff = process.hrtime(startTime);
  return (diff[0] * 1000) + (diff[1] / 1000000);
}

module.exports = { securityGateway, clearPolicyCache };
