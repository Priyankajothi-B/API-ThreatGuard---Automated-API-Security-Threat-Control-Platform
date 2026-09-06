const activeChains = new Map(); // key: ip, value: chain object

const DEFAULT_CORRELATION_WINDOW_MS = 30 * 60 * 1000; // 30 mins default

function correlateThreatEvents(telemetry, policy) {
  if (!telemetry || telemetry.decision === 'ALLOW') return null;

  const ip = telemetry.ipAddress;
  const userId = telemetry.userId;
  const now = Date.now();
  const windowMs = (policy && policy.correlationWindowMs) || DEFAULT_CORRELATION_WINDOW_MS;

  let chain = activeChains.get(ip);

  if (chain && (now - chain.lastSeen) < windowMs) {
    // Append telemetry to active attack chain
    chain.events.push({
      requestId: telemetry.requestId,
      endpoint: telemetry.endpoint,
      method: telemetry.method,
      threatTypes: telemetry.threatTypes,
      riskScore: telemetry.riskScore,
      decision: telemetry.decision,
      timestamp: telemetry.timestamp || now
    });

    // Update unique attack types set
    const allTypes = new Set(chain.attackTypes);
    (telemetry.threatTypes || []).forEach(t => allTypes.add(t));
    chain.attackTypes = Array.from(allTypes);

    chain.highestRiskScore = Math.max(chain.highestRiskScore, telemetry.riskScore);
    chain.lastSeen = now;
    chain.eventCount = chain.events.length;

    // Escalate chain risk if multiple distinct security vectors are combined
    if (chain.attackTypes.length >= 3) {
      chain.severity = 'CRITICAL';
      chain.correlationBonus = 25;
      chain.explanation = `Correlated Critical Attack Chain: ${chain.attackTypes.length} distinct security vectors (${chain.attackTypes.join(', ')}) executed within ${Math.round((now - chain.firstSeen) / 1000)}s`;
    } else if (chain.attackTypes.length === 2) {
      chain.severity = 'HIGH';
      chain.correlationBonus = 15;
      chain.explanation = `Multi-vector Threat Correlation: Combined ${chain.attackTypes.join(' + ')}`;
    }
  } else {
    // Create new attack chain
    chain = {
      chainId: `CHAIN-${Math.floor(1000 + Math.random() * 9000)}`,
      source: ip,
      userId: userId || 'anonymous',
      events: [{
        requestId: telemetry.requestId,
        endpoint: telemetry.endpoint,
        method: telemetry.method,
        threatTypes: telemetry.threatTypes,
        riskScore: telemetry.riskScore,
        decision: telemetry.decision,
        timestamp: telemetry.timestamp || now
      }],
      attackTypes: telemetry.threatTypes || [],
      highestRiskScore: telemetry.riskScore,
      correlationBonus: 0,
      severity: telemetry.severity || 'MEDIUM',
      confidence: telemetry.confidence || 90,
      explanation: `Attack chain initiated by ${ip} targeting ${telemetry.endpoint}`,
      firstSeen: now,
      lastSeen: now,
      eventCount: 1
    };

    activeChains.set(ip, chain);
  }

  return chain;
}

function getActiveAttackChains() {
  const now = Date.now();
  const result = [];
  for (const [ip, chain] of activeChains.entries()) {
    if ((now - chain.lastSeen) < DEFAULT_CORRELATION_WINDOW_MS) {
      result.push(chain);
    }
  }
  return result.sort((a, b) => b.lastSeen - a.lastSeen);
}

module.exports = {
  correlateThreatEvents,
  getActiveAttackChains
};
