const mongoose = require('mongoose');
const { DEFAULT_POLICY } = require('../config/constants');

const securityPolicySchema = new mongoose.Schema({
  policyName: { type: String, default: 'Global Gateway Security Policy', unique: true },
  rateLimitWindowMs: { type: Number, default: DEFAULT_POLICY.rateLimitWindowMs },
  rateLimitMaxRequests: { type: Number, default: DEFAULT_POLICY.rateLimitMaxRequests },
  rateLimitElevatedThreshold: { type: Number, default: DEFAULT_POLICY.rateLimitElevatedThreshold },
  rateLimitCriticalThreshold: { type: Number, default: DEFAULT_POLICY.rateLimitCriticalThreshold },
  tempBlockDurationMs: { type: Number, default: DEFAULT_POLICY.tempBlockDurationMs },
  enumerationWindowMs: { type: Number, default: DEFAULT_POLICY.enumerationWindowMs },
  enumerationMaxUniqueIds: { type: Number, default: DEFAULT_POLICY.enumerationMaxUniqueIds },
  riskThresholds: {
    allowMax: { type: Number, default: 30 },
    monitorMax: { type: Number, default: 60 },
    rateLimitMax: { type: Number, default: 80 }
  },
  modulesEnabled: {
    jwtAuth: { type: Boolean, default: true },
    bolaAuth: { type: Boolean, default: true },
    inputValidation: { type: Boolean, default: true },
    sqliDetection: { type: Boolean, default: true },
    xssDetection: { type: Boolean, default: true },
    rateLimiting: { type: Boolean, default: true },
    enumerationDetection: { type: Boolean, default: true }
  },
  whitelistedIPs: [{ type: String }],
  blacklistedIPs: [{ type: String }]
}, { timestamps: true });

module.exports = mongoose.model('SecurityPolicy', securityPolicySchema);
