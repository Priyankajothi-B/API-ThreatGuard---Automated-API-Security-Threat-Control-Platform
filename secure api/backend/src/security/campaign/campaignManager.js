const activeCampaigns = new Map(); // key: campaignId, value: campaign object

const DEFAULT_CAMPAIGN_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours default

function processCampaign(chain, policy) {
  if (!chain) return null;

  const ip = chain.source;
  const now = Date.now();
  const windowMs = (policy && policy.campaignWindowMs) || DEFAULT_CAMPAIGN_WINDOW_MS;

  // Determine campaign type
  let campaignType = 'Multi-Stage Attack';
  if (chain.attackTypes.includes('SQL_INJECTION') || chain.attackTypes.includes('XSS_MALICIOUS_INPUT')) {
    campaignType = 'Injection Campaign';
  } else if (chain.attackTypes.includes('BOLA_AUTHORIZATION_VIOLATION')) {
    campaignType = 'Authorization Abuse Campaign';
  } else if (chain.attackTypes.includes('BEHAVIORAL_RESOURCE_ENUMERATION')) {
    campaignType = 'Enumeration Campaign';
  } else if (chain.attackTypes.some(t => t.includes('AUTH') || t.includes('JWT'))) {
    campaignType = 'Credential Abuse Campaign';
  }

  let campaign = activeCampaigns.get(ip);

  if (campaign && (now - campaign.lastSeen) < windowMs) {
    campaign.eventCount += chain.eventCount;
    campaign.highestRiskScore = Math.max(campaign.highestRiskScore, chain.highestRiskScore);
    campaign.lastSeen = now;
    
    const combinedTypes = new Set(campaign.attackTypes.concat(chain.attackTypes));
    campaign.attackTypes = Array.from(combinedTypes);
    
    if (campaign.attackTypes.length >= 3) {
      campaign.campaignType = 'Multi-Stage Attack';
      campaign.severity = 'CRITICAL';
    }
  } else {
    campaign = {
      campaignId: `CMP-${Math.floor(1000 + Math.random() * 9000)}`,
      campaignType,
      source: ip,
      userId: chain.userId || 'anonymous',
      attackTypes: chain.attackTypes,
      highestRiskScore: chain.highestRiskScore,
      severity: chain.severity || 'HIGH',
      status: 'ACTIVE',
      firstSeen: chain.firstSeen || now,
      lastSeen: now,
      eventCount: chain.eventCount || 1,
      chains: [chain.chainId]
    };
    activeCampaigns.set(ip, campaign);
  }

  return campaign;
}

function getActiveCampaigns() {
  const now = Date.now();
  const result = [];
  for (const [ip, cmp] of activeCampaigns.entries()) {
    if ((now - cmp.lastSeen) < DEFAULT_CAMPAIGN_WINDOW_MS) {
      result.push(cmp);
    }
  }
  return result.sort((a, b) => b.lastSeen - a.lastSeen);
}

module.exports = {
  processCampaign,
  getActiveCampaigns
};
