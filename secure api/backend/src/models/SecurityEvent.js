const mongoose = require('mongoose');

const securityEventSchema = new mongoose.Schema({
  requestId: { type: String, required: true, index: true },
  timestamp: { type: Date, default: Date.now, index: true },
  ipAddress: { type: String, required: true, index: true },
  userId: { type: String, default: 'anonymous' },
  method: { type: String, required: true },
  endpoint: { type: String, required: true, index: true },
  threatTypes: [{ type: String }],
  severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'LOW' },
  confidence: { type: Number, min: 0, max: 100, default: 100 },
  riskScore: { type: Number, min: 0, max: 100, required: true },
  riskBreakdown: [{
    detector: String,
    score: Number,
    reason: String
  }],
  decision: { type: String, enum: ['ALLOW', 'MONITOR', 'RATE_LIMIT', 'ALERT', 'BLOCK'], required: true },
  reason: { type: String, required: true },
  explanation: { type: String, required: true },
  detectionSource: { type: String, default: 'GATEWAY_ENGINE' },
  latencyMs: { type: Number, required: true },
  overrideStatus: {
    isOverridden: { type: Boolean, default: false },
    overriddenBy: { type: String },
    originalDecision: { type: String },
    newDecision: { type: String },
    overrideReason: { type: String },
    overriddenAt: { type: Date }
  }
}, { timestamps: true });

module.exports = mongoose.model('SecurityEvent', securityEventSchema);
