const enumerationTracker = new Map(); // key: `${ip}_${endpoint}`, value: { ids: Set, timestamps: Array }

function detectBehavioralEnumeration(req, policy) {
  const resourceId = req.params.id || req.query.id;
  if (!resourceId) return null; // No object ID in route/query

  const ip = req.ip || req.connection.remoteAddress || '127.0.0.1';
  // Standardize endpoint key (replace specific ID with :id placeholder)
  const routePattern = req.baseUrl + req.path.replace(/\/[^\/]+$/, '/:id');
  const key = `${ip}:${routePattern}`;
  const now = Date.now();
  const windowMs = policy.enumerationWindowMs || 60000;
  const maxUniqueIds = policy.enumerationMaxUniqueIds || 5;

  let record = enumerationTracker.get(key) || { ids: new Map(), history: [] };

  // Clean old history outside window
  record.history = record.history.filter(item => (now - item.timestamp) < windowMs);
  record.history.push({ id: String(resourceId), timestamp: now });

  // Count unique IDs accessed within window
  const uniqueIdsInWindow = new Set(record.history.map(item => item.id));

  enumerationTracker.set(key, record);

  if (uniqueIdsInWindow.size > maxUniqueIds) {
    const confidence = Math.min(95, 75 + (uniqueIdsInWindow.size - maxUniqueIds) * 5);
    return {
      type: 'BEHAVIORAL_RESOURCE_ENUMERATION',
      severity: 'HIGH',
      scoreContribution: 25,
      confidence,
      reason: `Behavioral Enumeration Anomaly: ${uniqueIdsInWindow.size} distinct object IDs probed on path '${routePattern}' within 60s (threshold: ${maxUniqueIds})`
    };
  }

  return null;
}

module.exports = { detectBehavioralEnumeration };
