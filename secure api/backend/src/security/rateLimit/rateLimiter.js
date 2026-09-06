const requestStore = new Map(); // key: ip, value: array of timestamps
const blockedIPs = new Map();   // key: ip, value: expiryTimestamp

function checkRateLimit(req, policy, adaptiveContext = {}) {
  const ip = req.ip || req.connection?.remoteAddress || '127.0.0.1';
  const now = Date.now();

  const windowMs = policy.rateLimitWindowMs || 60000;
  let maxRequests = policy.rateLimitMaxRequests || 50;
  let elevatedThreshold = policy.rateLimitElevatedThreshold || 30;
  let criticalThreshold = policy.rateLimitCriticalThreshold || 100;
  let blockDuration = policy.tempBlockDurationMs || 900000;

  // Adaptive threshold adjustment based on client risk & reputation context
  if (adaptiveContext.reputation && adaptiveContext.reputation.level !== 'CLEAN') {
    if (adaptiveContext.reputation.level === 'HIGH_RISK') {
      maxRequests = Math.max(10, Math.round(maxRequests * 0.3));
      elevatedThreshold = Math.max(5, Math.round(elevatedThreshold * 0.3));
    } else if (adaptiveContext.reputation.level === 'SUSPICIOUS') {
      maxRequests = Math.max(20, Math.round(maxRequests * 0.5));
      elevatedThreshold = Math.max(10, Math.round(elevatedThreshold * 0.5));
    }
  }

  if (adaptiveContext.profile && adaptiveContext.profile.rateLimitMax) {
    maxRequests = Math.min(maxRequests, adaptiveContext.profile.rateLimitMax);
  }

  // 1. Check if IP is explicitly in temporary block list
  if (blockedIPs.has(ip)) {
    const expiry = blockedIPs.get(ip);
    if (now < expiry) {
      const remainingSeconds = Math.ceil((expiry - now) / 1000);
      return {
        isBlocked: true,
        threat: {
          type: 'TEMPORARY_IP_BLOCK',
          severity: 'CRITICAL',
          scoreContribution: 40,
          confidence: 100,
          reason: `IP address ${ip} is temporarily blocked due to excessive security violations. Block expires in ${remainingSeconds}s.`
        }
      };
    } else {
      blockedIPs.delete(ip); // Block expired
    }
  }

  // 2. Sliding window counter for active requests
  let timestamps = requestStore.get(ip) || [];
  timestamps = timestamps.filter(t => (now - t) < windowMs);
  timestamps.push(now);
  requestStore.set(ip, timestamps);

  const count = timestamps.length;

  // 3. Evaluate Adaptive Progressive Levels
  if (count > criticalThreshold) {
    blockedIPs.set(ip, now + blockDuration);
    return {
      isBlocked: true,
      threat: {
        type: 'RATE_LIMIT_CRITICAL_EXCEEDED',
        severity: 'CRITICAL',
        scoreContribution: 40,
        confidence: 100,
        reason: `Request rate (${count} req/min) exceeded critical block threshold (${criticalThreshold} req/min). IP temporarily blocked.`
      }
    };
  } else if (count > maxRequests) {
    return {
      isBlocked: false,
      isRateLimited: true,
      threat: {
        type: 'RATE_LIMIT_EXCEEDED',
        severity: 'HIGH',
        scoreContribution: 25,
        confidence: 95,
        reason: `Adaptive request rate (${count} req/min) exceeded safe threshold (${maxRequests} req/min) for current client risk profile.`
      }
    };
  } else if (count > elevatedThreshold) {
    return {
      isBlocked: false,
      isElevated: true,
      threat: {
        type: 'ELEVATED_REQUEST_RATE',
        severity: 'MEDIUM',
        scoreContribution: 15,
        confidence: 85,
        reason: `Elevated request rate detected (${count} req/min, baseline threshold ${elevatedThreshold} req/min).`
      }
    };
  }

  return {
    isBlocked: false,
    isRateLimited: false,
    threat: null,
    currentCount: count
  };
}

function getBlockedIPs() {
  const result = [];
  const now = Date.now();
  for (const [ip, expiry] of blockedIPs.entries()) {
    if (now < expiry) {
      result.push({ ip, expiresAt: new Date(expiry), remainingMs: expiry - now });
    }
  }
  return result;
}

function unblockIP(ip) {
  return blockedIPs.delete(ip);
}

function blockIPManually(ip, durationMs = 900000) {
  blockedIPs.set(ip, Date.now() + durationMs);
}

module.exports = { checkRateLimit, getBlockedIPs, unblockIP, blockIPManually };
