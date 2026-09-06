function calculateAdaptiveRiskAndConfidence(threats, req, user, profile, anomaly, reputation, chain) {
  let threatScore = 0;
  let confidenceSum = 0;
  const threatTypes = [];
  const breakdownList = [];

  // 1. Base Threat Score from detectors
  if (threats && threats.length > 0) {
    for (const t of threats) {
      threatScore += (t.scoreContribution || 0);
      confidenceSum += (t.confidence || 90);
      if (t.type) threatTypes.push(t.type);
      breakdownList.push({
        detector: t.type || t.threatType,
        score: t.scoreContribution || 0,
        reason: t.reason
      });
    }
  }

  // 2. Behavioral Score (0 - 30 max contribution)
  const behaviorScore = anomaly ? Math.min(30, Math.round(anomaly.score * 0.3)) : 0;
  if (behaviorScore > 0) {
    breakdownList.push({
      detector: 'BEHAVIORAL_ANOMALY',
      score: behaviorScore,
      reason: anomaly.explanation || `Behavioral anomaly detected (score: ${anomaly.score}/100)`
    });
  }

  // 3. Endpoint Sensitivity Score
  let endpointScore = 0;
  if (profile) {
    if (profile.sensitivity === 'CRITICAL') endpointScore = 20;
    else if (profile.sensitivity === 'HIGH') endpointScore = 12;
    else if (profile.sensitivity === 'MEDIUM') endpointScore = 5;
    
    if (endpointScore > 0) {
      breakdownList.push({
        detector: 'ENDPOINT_SENSITIVITY',
        score: endpointScore,
        reason: `Target endpoint ${profile.endpoint} has ${profile.sensitivity} security sensitivity profile`
      });
    }
  }

  // 4. Reputation Score (0 - 20 max contribution)
  const reputationScore = reputation ? Math.min(20, Math.round((reputation.decayedScore || 0) * 0.2)) : 0;
  if (reputationScore > 0) {
    breakdownList.push({
      detector: 'HISTORICAL_REPUTATION',
      score: reputationScore,
      reason: reputation.reason || `IP/User reputation level: ${reputation.level}`
    });
  }

  // 5. Threat Correlation Score (0 - 25 max contribution)
  const correlationScore = chain ? (chain.correlationBonus || 0) : 0;
  if (correlationScore > 0) {
    breakdownList.push({
      detector: 'THREAT_CORRELATION',
      score: correlationScore,
      reason: chain.explanation || `Multi-stage attack chain correlation bonus (+${correlationScore})`
    });
  }

  // Calculate total adaptive risk score (capped at 100)
  const rawTotal = threatScore + behaviorScore + endpointScore + reputationScore + correlationScore;
  const adaptiveRiskScore = Math.min(100, Math.max(0, rawTotal));

  // Calculate separate confidence score (0 - 100%)
  const finalConfidence = threats && threats.length > 0
    ? Math.round(confidenceSum / threats.length)
    : 100;

  // Determine Severity
  let severity = 'LOW';
  if (adaptiveRiskScore >= 80) severity = 'CRITICAL';
  else if (adaptiveRiskScore >= 60) severity = 'HIGH';
  else if (adaptiveRiskScore >= 30) severity = 'MEDIUM';

  // Build Transparent Explanations
  let explanation = '';
  if (adaptiveRiskScore >= 60 || threats.length > 0) {
    const mainReasons = breakdownList.map(b => `${b.detector} (+${b.score}): ${b.reason}`).join(' | ');
    explanation = `Flagged with Adaptive Risk Score ${adaptiveRiskScore}/100 (${severity} severity, ${finalConfidence}% confidence). Contributing factors: ${mainReasons}`;
  } else {
    const authStatus = user ? `Valid JWT authentication (User: ${user.username || user.userId})` : 'Public endpoint access permitted';
    explanation = `${authStatus}; Safe request rate; Baseline behavior normal (anomaly: ${anomaly?.score || 0}/100); Endpoint: ${profile?.endpoint || 'DEFAULT'} (${profile?.sensitivity || 'LOW'} sensitivity); IP reputation: ${reputation?.level || 'CLEAN'}; Zero injection or BOLA signatures.`;
  }

  return {
    riskScore: adaptiveRiskScore,
    adaptiveRiskScore,
    confidence: finalConfidence,
    severity,
    threatTypes,
    breakdown: {
      threatScore,
      behaviorScore,
      endpointScore,
      reputationScore,
      correlationScore
    },
    riskBreakdown: breakdownList,
    explanation
  };
}

module.exports = {
  calculateAdaptiveRiskAndConfidence,
  // Alias for Phase 1 backward compatibility
  calculateRiskAndConfidence: calculateAdaptiveRiskAndConfidence
};
