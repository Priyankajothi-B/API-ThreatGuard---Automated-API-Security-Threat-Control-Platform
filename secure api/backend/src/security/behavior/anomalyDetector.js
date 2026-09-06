const { getSubjectBehavior } = require('./behaviorBaseline');

function detectBehaviorAnomalies(req, user, profile) {
  const ip = req.ip || req.connection?.remoteAddress || '127.0.0.1';
  const userId = user ? (user.userId || user.username) : null;

  // Retrieve behavioral metrics for IP & User
  const ipMetrics = getSubjectBehavior(ip);
  const userMetrics = userId ? getSubjectBehavior(userId) : { requestCount: 0, uniqueEndpointsCount: 0, uniqueResourceIdsCount: 0, errorRatio: 0 };

  const reqCount = Math.max(ipMetrics.requestCount, userMetrics.requestCount);
  const uniqueEndpoints = Math.max(ipMetrics.uniqueEndpointsCount, userMetrics.uniqueEndpointsCount);
  const uniqueResourceIds = Math.max(ipMetrics.uniqueResourceIdsCount, userMetrics.uniqueResourceIdsCount);
  const errorRatio = Math.max(ipMetrics.errorRatio, userMetrics.errorRatio);

  let totalAnomalyScore = 0;
  const signals = [];

  // Signal 1: Request Frequency Anomaly
  const normalMax = profile ? profile.rateLimitMax : 50;
  if (reqCount > (normalMax * 0.7)) {
    const freqScore = Math.min(35, Math.round(((reqCount - (normalMax * 0.7)) / normalMax) * 40));
    totalAnomalyScore += freqScore;
    signals.push({
      type: 'REQUEST_FREQUENCY_BURST',
      score: freqScore,
      reason: `Elevated request frequency (${reqCount} req/min) approaching profile limit (${normalMax} req/min)`
    });
  }

  // Signal 2: Endpoint Diversity Anomaly
  if (uniqueEndpoints > 4) {
    const divScore = Math.min(25, (uniqueEndpoints - 4) * 8);
    totalAnomalyScore += divScore;
    signals.push({
      type: 'ENDPOINT_DIVERSITY_ANOMALY',
      score: divScore,
      reason: `Rapid traversal across ${uniqueEndpoints} distinct endpoints within 60s`
    });
  }

  // Signal 3: Resource Access Anomaly
  if (uniqueResourceIds > 3) {
    const resScore = Math.min(25, (uniqueResourceIds - 3) * 7);
    totalAnomalyScore += resScore;
    signals.push({
      type: 'RESOURCE_ACCESS_ANOMALY',
      score: resScore,
      reason: `Resource probing anomaly: ${uniqueResourceIds} unique object IDs accessed in short window`
    });
  }

  // Signal 4: High Error Ratio Anomaly (401/403/404)
  if (errorRatio > 0.4 && reqCount > 3) {
    const errScore = Math.min(25, Math.round(errorRatio * 30));
    totalAnomalyScore += errScore;
    signals.push({
      type: 'HIGH_ERROR_RATIO_ANOMALY',
      score: errScore,
      reason: `High security error ratio (${Math.round(errorRatio * 100)}% 401/403/404 responses)`
    });
  }

  const finalScore = Math.min(100, Math.max(0, totalAnomalyScore));
  const confidence = signals.length > 0 ? Math.min(95, 75 + signals.length * 5) : 100;

  let explanation = '';
  if (signals.length > 0) {
    explanation = `Behavioral Anomaly Score: ${finalScore}/100 (${confidence}% confidence). Factors: ${signals.map(s => s.reason).join('; ')}`;
  } else {
    explanation = `Normal request behavior within established baseline (${reqCount} req/min, ${uniqueEndpoints} endpoints).`;
  }

  return {
    score: finalScore,
    confidence,
    signals,
    explanation
  };
}

module.exports = { detectBehaviorAnomalies };
