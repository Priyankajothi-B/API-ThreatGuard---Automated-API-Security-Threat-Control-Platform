const { activeAnomalyModel } = require('./anomalyModel');
const { extractFeatures } = require('./featureExtractor');

function predictThreat(telemetry = {}, behavior = {}, profile = {}, reputation = {}) {
  const { vector, featureObject } = extractFeatures(telemetry, behavior, profile, reputation);
  const anomalyResult = activeAnomalyModel.predict(vector);

  const supportingEvidence = [];
  const predictedTypesSet = new Set();
  let threatPoints = 0;

  // 1. Incorporate ML Anomaly Score contribution
  if (!anomalyResult.fallback && anomalyResult.anomalyScore > 30) {
    threatPoints += Math.round(anomalyResult.anomalyScore * 0.4);
    supportingEvidence.push(`Isolation Forest ML Anomaly Score: ${anomalyResult.anomalyScore}/100 (${anomalyResult.anomalyLevel})`);
  }

  // 2. Evaluate Specific Behavioral Indicators
  if (featureObject.authFailureCount >= 3) {
    threatPoints += 25;
    predictedTypesSet.add('Credential Abuse');
    supportingEvidence.push(`Elevated 401 Auth Failure Count (${featureObject.authFailureCount} failures in window)`);
  }

  if (featureObject.sequentialResourceIdCount >= 2 || featureObject.uniqueResourceIdsCount >= 4) {
    threatPoints += 25;
    predictedTypesSet.add('API Resource Enumeration');
    supportingEvidence.push(`Sequential object ID probing pattern (${featureObject.uniqueResourceIdsCount} distinct IDs accessed)`);
  }

  if (featureObject.errorRatio >= 0.4 && featureObject.requestFrequency >= 5) {
    threatPoints += 20;
    predictedTypesSet.add('Abnormal Endpoint Traversal');
    supportingEvidence.push(`High HTTP error ratio (${Math.round(featureObject.errorRatio * 100)}% 4xx status responses)`);
  }

  if (featureObject.requestFrequency >= (profile.rateLimitMax || 50) * 0.8) {
    threatPoints += 20;
    predictedTypesSet.add('Abnormal Request Burst');
    supportingEvidence.push(`Request frequency (${featureObject.requestFrequency} req/min) approaching endpoint threshold`);
  }

  if (telemetry.threatTypes && telemetry.threatTypes.length > 0) {
    threatPoints += 30;
    telemetry.threatTypes.forEach(t => {
      if (t.includes('SQL')) predictedTypesSet.add('Injection Payload (SQLi)');
      else if (t.includes('XSS')) predictedTypesSet.add('Injection Payload (XSS)');
      else if (t.includes('BOLA')) predictedTypesSet.add('Authorization Abuse (BOLA)');
      else predictedTypesSet.add(t);
    });
    supportingEvidence.push(`Deterministic signature match: ${telemetry.threatTypes.join(', ')}`);
  }

  // Cap threat probability between 0 and 100
  const threatProbability = Math.min(100, Math.max(0, threatPoints));

  let predictedThreatLevel = 'LOW';
  if (threatProbability >= 80) predictedThreatLevel = 'CRITICAL';
  else if (threatProbability >= 60) predictedThreatLevel = 'HIGH';
  else if (threatProbability >= 35) predictedThreatLevel = 'MEDIUM';

  const predictedThreatTypes = Array.from(predictedTypesSet);
  if (predictedThreatTypes.length === 0) {
    predictedThreatTypes.push('Normal Request Traffic');
  }

  const confidence = Math.min(95, Math.max(70, 75 + supportingEvidence.length * 5));

  return {
    threatProbability,
    predictedThreatLevel,
    predictedThreatTypes,
    confidence,
    supportingEvidence,
    anomalyResult,
    featureVector: vector
  };
}

module.exports = {
  predictThreat
};
