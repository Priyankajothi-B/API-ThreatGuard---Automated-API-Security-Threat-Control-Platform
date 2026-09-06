import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  timeout: 10000
});

export const getSecurityPosture = () => api.get('/security/posture');
export const getSecurityEvents = (params) => api.get('/security/events', { params });
export const getIncidents = () => api.get('/security/incidents');
export const getEndpointsInventory = () => api.get('/security/endpoints');
export const getSecurityPolicy = () => api.get('/security/policy');
export const updateSecurityPolicy = (policyData) => api.put('/security/policy', policyData);
export const overrideDecision = (overrideData) => api.post('/security/override', overrideData);
export const getBlockedIPs = () => api.get('/security/blocked-ips');
export const unblockIP = (ip) => api.post('/security/unblock-ip', { ip });
export const getAuditLogs = () => api.get('/security/audit-logs');
export const getAnomalousReputations = () => api.get('/security/reputation');
export const getAttackChains = () => api.get('/security/attack-chains');
export const getAttackCampaigns = () => api.get('/security/campaigns');
export const triggerSimulation = (scenario) => api.post('/simulation/trigger', { scenario });

export default api;
