const { DECISION } = require('../../config/constants');

function makeDecision(riskScore, threatTypes, policy) {
  const allowMax = (policy.riskThresholds && policy.riskThresholds.allowMax) || 30;
  const monitorMax = (policy.riskThresholds && policy.riskThresholds.monitorMax) || 60;
  const rateLimitMax = (policy.riskThresholds && policy.riskThresholds.rateLimitMax) || 80;

  // Critical threat types that trigger immediate block regardless of total score
  const immediateBlockThreats = [
    'MISSING_AUTHENTICATION',
    'INVALID_JWT',
    'EXPIRED_JWT',
    'MALFORMED_JWT',
    'BOLA_AUTHORIZATION_VIOLATION',
    'SQL_INJECTION',
    'XSS_MALICIOUS_INPUT',
    'TEMPORARY_IP_BLOCK',
    'RATE_LIMIT_CRITICAL_EXCEEDED'
  ];

  const hasImmediateBlock = threatTypes.some(t => immediateBlockThreats.includes(t));
  if (hasImmediateBlock || riskScore > rateLimitMax) {
    return DECISION.BLOCK;
  }

  if (threatTypes.includes('RATE_LIMIT_EXCEEDED') || (riskScore > monitorMax && riskScore <= rateLimitMax)) {
    return DECISION.RATE_LIMIT;
  }

  if (threatTypes.includes('ELEVATED_REQUEST_RATE') || threatTypes.includes('BEHAVIORAL_RESOURCE_ENUMERATION') || (riskScore > allowMax && riskScore <= monitorMax)) {
    return DECISION.MONITOR;
  }

  return DECISION.ALLOW;
}

module.exports = { makeDecision };
