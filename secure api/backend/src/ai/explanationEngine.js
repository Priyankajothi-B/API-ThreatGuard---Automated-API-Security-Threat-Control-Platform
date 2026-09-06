function generateAIExplanation(prediction = {}, telemetry = {}, behavior = {}, profile = {}) {
  const { threatProbability, predictedThreatLevel, predictedThreatTypes, confidence, supportingEvidence, anomalyResult } = prediction;
  const anomalyScore = anomalyResult?.anomalyScore || 0;
  const contributingFeatures = anomalyResult?.contributingFeatures || [];

  const mainVector = (predictedThreatTypes && predictedThreatTypes.length > 0 && predictedThreatTypes[0] !== 'Normal Request Traffic')
    ? predictedThreatTypes.join(' & ')
    : 'Baseline API Interaction';

  let whatDetected = '';
  let whyUnusual = '';
  let recommendedAction = '';

  if (threatProbability >= 75 || anomalyScore >= 75) {
    whatDetected = `AI ML engine identified a ${predictedThreatLevel} probability threat (${threatProbability}% probability) exhibiting ${mainVector}.`;
    whyUnusual = `Client activity deviates significantly from established baseline: ${supportingEvidence.join('; ')}. Top contributing anomaly features: ${contributingFeatures.join(', ') || 'Multi-vector deviation'}.`;
    recommendedAction = `Immediate SOC investigation recommended. Inspect client IP/user session logs, verify authorization scopes, and consider temporary IP rate throttling or session revocation.`;
  } else if (threatProbability >= 40 || anomalyScore >= 40) {
    whatDetected = `AI ML engine flagged suspicious request pattern (${threatProbability}% probability, anomaly score: ${anomalyScore}/100).`;
    whyUnusual = `Behavior exhibits minor anomalies: ${supportingEvidence.join('; ') || 'Elevated request frequency or endpoint switching'}.`;
    recommendedAction = `Monitor client session closely. Review recent 4xx error logs and check for automated scripting behavior.`;
  } else {
    whatDetected = `AI ML engine verified request as normal benign traffic (${confidence}% confidence).`;
    whyUnusual = `Request metrics remain within safe historical baseline parameters for endpoint ${profile.endpoint || 'DEFAULT'}. Zero ML anomaly flags.`;
    recommendedAction = `No analyst action required. Permitted under standard security gateway policies.`;
  }

  const fullNarrative = `${whatDetected} ${whyUnusual} Analyst Recommendation: ${recommendedAction}`;

  return {
    narrative: fullNarrative,
    whatDetected,
    whyUnusual,
    contributingFeatures,
    modelConfidence: confidence,
    supportingEvidence,
    recommendedAction
  };
}

module.exports = {
  generateAIExplanation
};
