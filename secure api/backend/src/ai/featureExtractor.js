const FEATURE_NAMES = [
  'requestFrequency',
  'uniqueEndpointsCount',
  'uniqueResourceIdsCount',
  'authFailureCount',
  'authSuccessCount',
  'forbidden403Count',
  'notFound404Count',
  'rateLimited429Count',
  'errorRatio',
  'endpointSensitivity',
  'reputationLevel',
  'decayedReputationScore',
  'behaviorAnomalyScore',
  'threatDetectorCount',
  'endpointSwitchingFreq',
  'sequentialResourceIdCount',
  'hasCorrelationIndicator',
  'hasCampaignIndicator'
];

function extractFeatures(eventOrTelemetry = {}, behavior = {}, profile = {}, reputation = {}) {
  const reqCount = behavior.requestCount || 1;
  const uniqueEndpoints = behavior.uniqueEndpointsCount || 1;
  const uniqueResourceIds = behavior.uniqueResourceIdsCount || 0;
  const history = behavior.recentHistory || [];

  const authFailures = history.filter(h => h.statusCode === 401).length;
  const authSuccess = history.filter(h => h.statusCode === 200 || h.statusCode === 201).length;
  const status403 = history.filter(h => h.statusCode === 403).length;
  const status404 = history.filter(h => h.statusCode === 404).length;
  const status429 = history.filter(h => h.statusCode === 429).length;

  const totalErrors = authFailures + status403 + status404 + status429;
  const errorRatio = reqCount > 0 ? parseFloat((totalErrors / reqCount).toFixed(2)) : 0;

  const sensitivityMap = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
  const sensitivityVal = sensitivityMap[profile.sensitivity] || 2;

  const repMap = { CLEAN: 0, LOW_RISK: 1, SUSPICIOUS: 2, HIGH_RISK: 3, BLOCKED: 4 };
  const repVal = repMap[reputation.level] || 0;
  const repScore = reputation.decayedScore || 0;

  const anomalyScore = eventOrTelemetry.behaviorScore || eventOrTelemetry.anomalyScore || 0;
  const threatCount = (eventOrTelemetry.threatTypes || []).length;

  const endpointSwitchingFreq = reqCount > 0 ? parseFloat((uniqueEndpoints / reqCount).toFixed(2)) : 0;
  
  // Check sequential ID access pattern
  let sequentialCount = 0;
  if (uniqueResourceIds > 1) {
    const ids = history.map(h => h.resourceId).filter(Boolean);
    for (let i = 1; i < ids.length; i++) {
      const num1 = parseInt(String(ids[i - 1]).replace(/\D/g, ''), 10);
      const num2 = parseInt(String(ids[i]).replace(/\D/g, ''), 10);
      if (!isNaN(num1) && !isNaN(num2) && Math.abs(num2 - num1) === 1) {
        sequentialCount++;
      }
    }
  }

  const hasCorrelation = eventOrTelemetry.chainId ? 1 : 0;
  const hasCampaign = eventOrTelemetry.campaignId ? 1 : 0;

  const vector = [
    reqCount,
    uniqueEndpoints,
    uniqueResourceIds,
    authFailures,
    authSuccess,
    status403,
    status404,
    status429,
    errorRatio,
    sensitivityVal,
    repVal,
    repScore,
    anomalyScore,
    threatCount,
    endpointSwitchingFreq,
    sequentialCount,
    hasCorrelation,
    hasCampaign
  ];

  // Return feature object & numerical vector array
  const featureObject = {};
  FEATURE_NAMES.forEach((name, idx) => {
    featureObject[name] = vector[idx];
  });

  return {
    vector,
    featureObject,
    featureNames: FEATURE_NAMES
  };
}

module.exports = {
  FEATURE_NAMES,
  extractFeatures
};
