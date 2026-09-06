const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
  incidentId: { type: String, required: true, unique: true },
  ipAddress: { type: String, required: true, index: true },
  userId: { type: String, default: 'anonymous' },
  primaryThreat: { type: String, required: true },
  eventCount: { type: Number, default: 1 },
  events: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SecurityEvent' }],
  highestRiskScore: { type: Number, default: 0 },
  status: { type: String, enum: ['ACTIVE', 'INVESTIGATING', 'MITIGATED', 'RESOLVED'], default: 'ACTIVE' },
  firstSeen: { type: Date, default: Date.now },
  lastSeen: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Incident', incidentSchema);
