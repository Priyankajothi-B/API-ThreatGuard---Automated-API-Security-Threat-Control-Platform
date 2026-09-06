const { runAIInference } = require('./modelManager');
const { addSample } = require('./trainingDataManager');

function evaluateAIRiskAdjustment(telemetry, req, user, profile, behavior, reputation) {
  const aiResult = runAIInference(telemetry, behavior, profile, reputation);

  const deterministicRiskScore = telemetry.riskScore || 0;
  let aiAdjustment = 0;

  if (aiResult.aiAvailable) {
    // If AI detects high anomaly or threat probability, add bounded risk increase (+0 to +20)
    if (aiResult.threatProbability >= 80 || aiResult.anomalyScore >= 80) {
      aiAdjustment = 20;
    } else if (aiResult.threatProbability >= 60 || aiResult.anomalyScore >= 60) {
      aiAdjustment = 12;
    } else if (aiResult.threatProbability >= 40 || aiResult.anomalyScore >= 40) {
      aiAdjustment = 6;
    }
  }

  // Safety Constraint: Deterministic risk score remains authoritative.
  // Critical deterministic blocks (SQLi, XSS, BOLA, Auth) cannot be downgraded by AI.
  const finalRiskScore = Math.min(100, Math.max(deterministicRiskScore, deterministicRiskScore + aiAdjustment));

  // Add sample to AI training dataset asynchronously
  addSample(telemetry, behavior, profile, reputation);

  return {
    finalRiskScore,
    deterministicRiskScore,
    aiBoundedAdjustment: aiAdjustment,
    aiAnomalyScore: aiResult.anomalyScore || 0,
    aiThreatProbability: aiResult.threatProbability || 0,
    aiConfidence: aiResult.confidence || 0,
    aiAvailable: aiResult.aiAvailable,
    aiExplanation: aiResult.explanation,
    aiDetails: aiResult
  };
}

module.exports = {
  evaluateAIRiskAdjustment
};
