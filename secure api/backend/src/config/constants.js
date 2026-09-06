module.exports = {
  PORT: process.env.PORT || 5000,
  JWT_SECRET: process.env.JWT_SECRET || 'hackathon_super_secret_jwt_key_2026',
  
  DECISION: {
    ALLOW: 'ALLOW',
    MONITOR: 'MONITOR',
    RATE_LIMIT: 'RATE_LIMIT',
    ALERT: 'ALERT',
    BLOCK: 'BLOCK'
  },

  SEVERITY: {
    LOW: 'LOW',
    MEDIUM: 'MEDIUM',
    HIGH: 'HIGH',
    CRITICAL: 'CRITICAL'
  },

  DEFAULT_POLICY: {
    rateLimitWindowMs: 60 * 1000, // 1 minute
    rateLimitMaxRequests: 50,      // Allow up to 50 req/min
    rateLimitElevatedThreshold: 30, // Monitor at 30 req/min
    rateLimitCriticalThreshold: 100, // Temp block above 100 req/min
    tempBlockDurationMs: 15 * 60 * 1000, // 15 minutes block
    
    enumerationWindowMs: 60 * 1000,
    enumerationMaxUniqueIds: 5,   // >5 unique object IDs per min triggers alert
    
    riskThresholds: {
      allowMax: 30,
      monitorMax: 60,
      rateLimitMax: 80,
      // 81-100 is BLOCK
    },

    modulesEnabled: {
      jwtAuth: true,
      bolaAuth: true,
      inputValidation: true,
      sqliDetection: true,
      xssDetection: true,
      rateLimiting: true,
      enumerationDetection: true
    }
  },

  HEADERS: {
    GATEWAY: 'X-Security-Gateway',
    REQUEST_ID: 'X-Security-Request-ID',
    RISK_SCORE: 'X-Security-Risk-Score',
    CONFIDENCE: 'X-Security-Confidence',
    DECISION: 'X-Security-Decision',
    LATENCY: 'X-Gateway-Latency-ms'
  }
};
