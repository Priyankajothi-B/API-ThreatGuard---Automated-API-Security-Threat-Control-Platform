const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const SecurityEvent = require('../models/SecurityEvent');
const SecurityPolicy = require('../models/SecurityPolicy');
const Incident = require('../models/Incident');
const AuditLog = require('../models/AuditLog');
const { getBlockedIPs, unblockIP, blockIPManually } = require('../security/rateLimit/rateLimiter');
const { clearPolicyCache } = require('../security/gateway');
const { getTopAnomalousSources } = require('../security/reputation/reputationManager');
const { getActiveAttackChains } = require('../security/correlation/threatCorrelator');
const { getActiveCampaigns } = require('../security/campaign/campaignManager');

// GET /api/security/posture -> Overall API Security Health & Posture Score
router.get('/posture', async (req, res) => {
  try {
    const isDbConnected = mongoose.connection.readyState === 1;

    const totalEvents = isDbConnected ? await SecurityEvent.countDocuments() : 0;
    const blockedCount = isDbConnected ? await SecurityEvent.countDocuments({ decision: 'BLOCK' }) : 0;
    const rateLimitedCount = isDbConnected ? await SecurityEvent.countDocuments({ decision: 'RATE_LIMIT' }) : 0;
    const monitoredCount = isDbConnected ? await SecurityEvent.countDocuments({ decision: 'MONITOR' }) : 0;
    const allowedCount = isDbConnected ? await SecurityEvent.countDocuments({ decision: 'ALLOW' }) : 0;
    const activeIncidents = isDbConnected ? await Incident.countDocuments({ status: 'ACTIVE' }) : 0;
    const blockedIPs = getBlockedIPs();
    const activeCampaigns = getActiveCampaigns();
    const activeChains = getActiveAttackChains();

    const sqliCount = isDbConnected ? await SecurityEvent.countDocuments({ threatTypes: 'SQL_INJECTION' }) : 0;
    const xssCount = isDbConnected ? await SecurityEvent.countDocuments({ threatTypes: 'XSS_MALICIOUS_INPUT' }) : 0;
    const authCount = isDbConnected ? await SecurityEvent.countDocuments({ threatTypes: { $in: ['MISSING_AUTHENTICATION', 'INVALID_JWT', 'EXPIRED_JWT'] } }) : 0;
    const bolaCount = isDbConnected ? await SecurityEvent.countDocuments({ threatTypes: 'BOLA_AUTHORIZATION_VIOLATION' }) : 0;
    const rateAbuseCount = isDbConnected ? await SecurityEvent.countDocuments({ threatTypes: { $in: ['RATE_LIMIT_EXCEEDED', 'RATE_LIMIT_CRITICAL_EXCEEDED'] } }) : 0;
    const enumerationCount = isDbConnected ? await SecurityEvent.countDocuments({ threatTypes: 'BEHAVIORAL_RESOURCE_ENUMERATION' }) : 0;

    // Compute Posture Score (0-100)
    let penalty = (activeIncidents * 5) + (activeCampaigns.length * 8) + (blockedCount > 10 ? 10 : blockedCount) + (blockedIPs.length * 4);
    const securityScore = Math.max(25, 100 - penalty);

    return res.json({
      success: true,
      data: {
        securityScore,
        totalRequests: totalEvents,
        allowedRequests: allowedCount,
        blockedRequests: blockedCount,
        rateLimitedRequests: rateLimitedCount,
        monitoredRequests: monitoredCount,
        activeIncidents,
        activeCampaignsCount: activeCampaigns.length,
        activeChainsCount: activeChains.length,
        activeBlockedIPsCount: blockedIPs.length,
        threatDistribution: {
          sqlInjection: sqliCount,
          xssInput: xssCount,
          authentication: authCount,
          bolaAuthorization: bolaCount,
          rateAbuse: rateAbuseCount,
          enumeration: enumerationCount
        }
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/security/events -> Live security telemetry stream
router.get('/events', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const filter = {};

    if (req.query.decision) filter.decision = req.query.decision;
    if (req.query.severity) filter.severity = req.query.severity;
    if (req.query.threatType) filter.threatTypes = req.query.threatType;

    const events = await SecurityEvent.find(filter)
      .sort({ timestamp: -1 })
      .limit(limit);

    return res.json({ success: true, count: events.length, data: events });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/security/reputation -> Top anomalous source reputations
router.get('/reputation', (req, res) => {
  return res.json({ success: true, data: getTopAnomalousSources() });
});

// GET /api/security/attack-chains -> Active correlated attack chains
router.get('/attack-chains', (req, res) => {
  return res.json({ success: true, count: getActiveAttackChains().length, data: getActiveAttackChains() });
});

// GET /api/security/campaigns -> Active attack campaigns
router.get('/campaigns', (req, res) => {
  return res.json({ success: true, count: getActiveCampaigns().length, data: getActiveCampaigns() });
});

// GET /api/security/incidents -> Grouped active incidents
router.get('/incidents', async (req, res) => {
  try {
    const incidents = await Incident.find()
      .populate('events')
      .sort({ lastSeen: -1 });

    return res.json({ success: true, count: incidents.length, data: incidents });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/security/endpoints -> Endpoint security inventory & heatmap
router.get('/endpoints', async (req, res) => {
  try {
    const pipeline = [
      {
        $group: {
          _id: "$endpoint",
          totalRequests: { $sum: 1 },
          threatCount: {
            $sum: { $cond: [{ $gt: ["$riskScore", 30] }, 1, 0] }
          },
          blockedCount: {
            $sum: { $cond: [{ $eq: ["$decision", "BLOCK"] }, 1, 0] }
          },
          maxRiskScore: { $max: "$riskScore" },
          lastSeen: { $max: "$timestamp" }
        }
      },
      { $sort: { threatCount: -1 } }
    ];

    const results = await SecurityEvent.aggregate(pipeline);

    const endpointsInventory = results.map(r => {
      const threatRate = r.totalRequests > 0 ? (r.threatCount / r.totalRequests) * 100 : 0;
      let riskLevel = 'LOW';
      if (r.maxRiskScore >= 80 || threatRate > 30) riskLevel = 'CRITICAL';
      else if (r.maxRiskScore >= 60 || threatRate > 15) riskLevel = 'HIGH';
      else if (r.maxRiskScore >= 30 || threatRate > 5) riskLevel = 'MEDIUM';

      return {
        endpoint: r._id,
        totalRequests: r.totalRequests,
        threatCount: r.threatCount,
        blockedCount: r.blockedCount,
        threatRate: parseFloat(threatRate.toFixed(1)),
        maxRiskScore: r.maxRiskScore,
        riskLevel,
        lastSeen: r.lastSeen
      };
    });

    return res.json({ success: true, data: endpointsInventory });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/security/policy -> Active security policy
router.get('/policy', async (req, res) => {
  try {
    let policy = await SecurityPolicy.findOne({ policyName: 'Global Gateway Security Policy' });
    if (!policy) {
      policy = await SecurityPolicy.create({ policyName: 'Global Gateway Security Policy' });
    }
    return res.json({ success: true, data: policy });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/security/policy -> Dynamic policy update
router.put('/policy', async (req, res) => {
  try {
    const policy = await SecurityPolicy.findOneAndUpdate(
      { policyName: 'Global Gateway Security Policy' },
      { $set: req.body },
      { new: true, upsert: true }
    );
    clearPolicyCache();

    await AuditLog.create({
      action: 'POLICY_UPDATE',
      performedBy: 'Security Engineer',
      details: req.body
    });

    return res.json({ success: true, message: 'Policy updated successfully', data: policy });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/security/override -> Manual engineer decision override & Analyst Feedback Loop
router.post('/override', async (req, res) => {
  const { eventId, newDecision, reason, markFalsePositive } = req.body;
  try {
    const event = await SecurityEvent.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Security event not found' });
    }

    const originalDecision = event.decision;
    event.overrideStatus = {
      isOverridden: true,
      overriddenBy: 'Security Engineer',
      originalDecision,
      newDecision,
      overrideReason: reason || 'Manual verification by Security Operations Center',
      markFalsePositive: markFalsePositive || false,
      overriddenAt: new Date()
    };
    event.decision = newDecision;
    await event.save();

    await AuditLog.create({
      action: markFalsePositive ? 'MARK_FALSE_POSITIVE' : 'MANUAL_DECISION_OVERRIDE',
      performedBy: 'Security Engineer',
      targetId: event.requestId,
      details: {
        eventId,
        originalDecision,
        newDecision,
        markFalsePositive,
        reason
      }
    });

    return res.json({ success: true, message: `Event ${event.requestId} decision overridden to ${newDecision}`, data: event });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/security/blocked-ips
router.get('/blocked-ips', (req, res) => {
  return res.json({ success: true, data: getBlockedIPs() });
});

// POST /api/security/unblock-ip
router.post('/unblock-ip', async (req, res) => {
  const { ip } = req.body;
  const removed = unblockIP(ip);

  await AuditLog.create({
    action: 'IP_UNBLOCK',
    performedBy: 'Security Engineer',
    targetId: ip,
    details: { ip, removed }
  });

  return res.json({ success: true, message: `IP ${ip} unblocked`, removed });
});

// GET /api/security/audit-logs -> Security audit trail
router.get('/audit-logs', async (req, res) => {
  try {
    const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(100);
    return res.json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
