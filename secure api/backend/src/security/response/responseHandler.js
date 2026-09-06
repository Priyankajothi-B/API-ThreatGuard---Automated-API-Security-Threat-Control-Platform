const { HEADERS, DECISION } = require('../../config/constants');

function applyGatewayHeaders(res, { requestId, riskScore, confidence, decision, latencyMs }) {
  res.setHeader(HEADERS.GATEWAY, 'Active');
  res.setHeader(HEADERS.REQUEST_ID, requestId);
  res.setHeader(HEADERS.RISK_SCORE, String(riskScore));
  res.setHeader(HEADERS.CONFIDENCE, `${confidence}%`);
  res.setHeader(HEADERS.DECISION, decision);
  res.setHeader(HEADERS.LATENCY, `${latencyMs.toFixed(2)}ms`);
}

function sendBlockedResponse(res, telemetry) {
  applyGatewayHeaders(res, telemetry);
  
  const authThreats = ['MISSING_AUTHENTICATION', 'MALFORMED_JWT', 'INVALID_JWT', 'EXPIRED_JWT', 'INVALID_CREDENTIALS'];
  const isAuthFailure = telemetry.threatTypes && telemetry.threatTypes.some(t => authThreats.includes(t));
  const statusCode = isAuthFailure ? 401 : 403;

  return res.status(statusCode).json({
    success: false,
    securityGateway: {
      intercepted: true,
      requestId: telemetry.requestId,
      decision: DECISION.BLOCK,
      riskScore: telemetry.riskScore,
      confidence: telemetry.confidence,
      severity: telemetry.severity,
      threatTypes: telemetry.threatTypes,
      latencyMs: telemetry.latencyMs,
      explanation: telemetry.explanation
    },
    error: {
      code: isAuthFailure ? 'UNAUTHORIZED' : 'SECURITY_GATEWAY_BLOCK',
      message: isAuthFailure 
        ? 'Authentication required or token invalid.' 
        : 'Access denied by API Security Gateway & Threat Control System.',
      reason: telemetry.explanation
    }
  });
}

function sendRateLimitedResponse(res, telemetry) {
  applyGatewayHeaders(res, telemetry);
  res.setHeader('Retry-After', '60');

  return res.status(429).json({
    success: false,
    securityGateway: {
      intercepted: true,
      requestId: telemetry.requestId,
      decision: DECISION.RATE_LIMIT,
      riskScore: telemetry.riskScore,
      confidence: telemetry.confidence,
      severity: telemetry.severity,
      threatTypes: telemetry.threatTypes,
      latencyMs: telemetry.latencyMs,
      explanation: telemetry.explanation
    },
    error: {
      code: 'SECURITY_RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please slow down and try again after 60 seconds.',
      reason: telemetry.explanation
    }
  });
}

module.exports = {
  applyGatewayHeaders,
  sendBlockedResponse,
  sendRateLimitedResponse
};
