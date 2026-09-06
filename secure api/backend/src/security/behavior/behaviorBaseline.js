// Memory-bounded behavioral tracker with TTL cleanup
const ipBehaviorStore = new Map();   // key: ip, value: behavior object
const userBehaviorStore = new Map(); // key: userId, value: behavior object

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 mins TTL cleanup
const WINDOW_MS = 60 * 1000;              // 60s sliding window

function trackRequestBehavior(req, user, statusCode = 200) {
  const ip = req.ip || req.connection?.remoteAddress || '127.0.0.1';
  const userId = user ? (user.userId || user.username) : null;
  const endpoint = req.baseUrl ? (req.baseUrl + req.path) : (req.originalUrl || req.path);
  const resourceId = req.params?.id || req.query?.id;
  const now = Date.now();

  // Track IP Behavior
  updateSubjectStore(ipBehaviorStore, ip, endpoint, resourceId, statusCode, now);

  // Track User Behavior if authenticated
  if (userId && userId !== 'anonymous') {
    updateSubjectStore(userBehaviorStore, userId, endpoint, resourceId, statusCode, now);
  }
}

function updateSubjectStore(store, key, endpoint, resourceId, statusCode, now) {
  let record = store.get(key);
  if (!record) {
    record = {
      subject: key,
      history: [],
      endpoints: new Map(),
      resourceIds: new Set(),
      statusCodes: { 200: 0, 401: 0, 403: 0, 404: 0, 429: 0 },
      lastSeen: now
    };
    store.set(key, record);
  }

  // Filter history to current window
  record.history = record.history.filter(item => (now - item.timestamp) < WINDOW_MS);
  record.history.push({ endpoint, resourceId, statusCode, timestamp: now });
  record.lastSeen = now;

  // Track unique endpoints & counts
  const epCount = record.endpoints.get(endpoint) || 0;
  record.endpoints.set(endpoint, epCount + 1);

  if (resourceId) {
    record.resourceIds.add(String(resourceId));
  }

  if (record.statusCodes[statusCode] !== undefined) {
    record.statusCodes[statusCode] += 1;
  } else {
    record.statusCodes[statusCode] = 1;
  }
}

function getSubjectBehavior(key) {
  const now = Date.now();
  const record = ipBehaviorStore.get(key) || userBehaviorStore.get(key);
  if (!record) {
    return {
      requestCount: 0,
      uniqueEndpointsCount: 0,
      uniqueResourceIdsCount: 0,
      errorRatio: 0,
      recentHistory: []
    };
  }

  // Active history in last window
  const activeHistory = record.history.filter(item => (now - item.timestamp) < WINDOW_MS);
  const uniqueEndpoints = new Set(activeHistory.map(h => h.endpoint));
  const uniqueIds = new Set(activeHistory.filter(h => h.resourceId).map(h => h.resourceId));
  const errorCount = activeHistory.filter(h => [401, 403, 404, 429].includes(h.statusCode)).length;
  const errorRatio = activeHistory.length > 0 ? (errorCount / activeHistory.length) : 0;

  return {
    subject: key,
    requestCount: activeHistory.length,
    uniqueEndpointsCount: uniqueEndpoints.size,
    uniqueResourceIdsCount: uniqueIds.size,
    errorRatio: parseFloat(errorRatio.toFixed(2)),
    recentHistory: activeHistory
  };
}

// Periodic TTL cleanup to prevent unbounded memory growth
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, record] of ipBehaviorStore.entries()) {
    if ((now - record.lastSeen) > CLEANUP_INTERVAL_MS) {
      ipBehaviorStore.delete(key);
    }
  }
  for (const [key, record] of userBehaviorStore.entries()) {
    if ((now - record.lastSeen) > CLEANUP_INTERVAL_MS) {
      userBehaviorStore.delete(key);
    }
  }
}, CLEANUP_INTERVAL_MS);
if (cleanupTimer.unref) cleanupTimer.unref();

module.exports = {
  trackRequestBehavior,
  getSubjectBehavior
};
