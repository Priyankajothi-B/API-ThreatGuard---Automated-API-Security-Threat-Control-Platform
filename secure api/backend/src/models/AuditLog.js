const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: { type: String, required: true }, // e.g., MANUAL_OVERRIDE, POLICY_UPDATE, IP_WHITELIST, IP_BLOCK
  performedBy: { type: String, default: 'Security Engineer' },
  targetId: { type: String }, // e.g. requestId or IP address
  details: { type: Object, required: true },
  timestamp: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', auditLogSchema);
