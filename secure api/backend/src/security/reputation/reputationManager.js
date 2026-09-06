const ipReputationStore = new Map();   // key: ip, value: { score, level, lastThreatAt, lastSeen }
const userReputationStore = new Map(); // key: userId, value: { score, level, lastThreatAt, lastSeen }

const DECAY_HALFLIFE_MS = 10 * 60 * 1000; // 10 minutes halflife decay for clean periods

function getReputation(key) {
  const now = Date.now();
  let record = ipReputationStore.get(key) || userReputationStore.get(key);

  if (!record) {
    return {
      score: 0,
      level: 'CLEAN',
      decayedScore: 0,
      reason: 'No threat history recorded. Clean reputation.'
    };
  }

  // Calculate exponential time-based decay for clean elapsed time
  const timeElapsed = now - record.lastThreatAt;
  const decayFactor = Math.pow(0.5, timeElapsed / DECAY_HALFLIFE_MS);
  const decayedScore = Math.max(0, Math.round(record.score * decayFactor));

  let level = 'CLEAN';
  if (decayedScore >= 85) level = 'BLOCKED';
  else if (decayedScore >= 70) level = 'HIGH_RISK';
  else if (decayedScore >= 40) level = 'SUSPICIOUS';
  else if (decayedScore >= 16) level = 'LOW_RISK';

  return {
    score: record.score,
    decayedScore,
    level,
    lastThreatAt: record.lastThreatAt,
    reason: `Subject '${key}' reputation level: ${level} (decayed score: ${decayedScore}/100 from historical peak ${record.score})`
  };
}

function recordThreatEvent(key, riskContribution) {
  const now = Date.now();
  let record = ipReputationStore.get(key) || { score: 0, lastThreatAt: now, lastSeen: now };

  // Update reputation score (capped at 100)
  const currentRep = getReputation(key);
  record.score = Math.min(100, currentRep.decayedScore + Math.round(riskContribution * 0.4));
  record.lastThreatAt = now;
  record.lastSeen = now;

  ipReputationStore.set(key, record);
}

function getTopAnomalousSources() {
  const sources = [];
  for (const [key, val] of ipReputationStore.entries()) {
    const rep = getReputation(key);
    if (rep.decayedScore > 10) {
      sources.push({ subject: key, ...rep });
    }
  }
  return sources.sort((a, b) => b.decayedScore - a.decayedScore);
}

module.exports = {
  getReputation,
  recordThreatEvent,
  getTopAnomalousSources
};
