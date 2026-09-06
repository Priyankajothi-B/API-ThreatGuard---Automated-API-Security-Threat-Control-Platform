const request = require('supertest');
const { connectDB, disconnectDB } = require('../src/services/db');
const { validateJwt } = require('../src/security/auth/jwtValidator');
const { checkBolaAuthorization } = require('../src/security/auth/bolaDetector');
const { detectSqlInjection } = require('../src/security/injection/sqliDetector');
const { detectXss } = require('../src/security/xss/xssDetector');
const { checkRateLimit, unblockIP } = require('../src/security/rateLimit/rateLimiter');
const { detectBehavioralEnumeration } = require('../src/security/enumeration/enumerationDetector');
const { calculateRiskAndConfidence } = require('../src/security/risk/riskScorer');
const app = require('../src/app');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../src/config/constants');

jest.setTimeout(60000);

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await disconnectDB();
});

describe('1. Authentication & Demo Login', () => {
  test('POST /api/login succeeds with valid username and password', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ username: 'alice', password: 'password123' });
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.username).toBe('alice');
  });

  test('POST /api/login fails (401) with incorrect password', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ username: 'alice', password: 'wrongpassword' });
    
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toBe('Invalid username or password');
  });

  test('POST /api/login fails (401) with unknown username', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ username: 'nonexistent_user', password: 'password123' });
    
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toBe('Invalid username or password');
  });

  test('Detects missing JWT header (+30 risk)', () => {
    const req = { headers: {} };
    const res = validateJwt(req);
    expect(res.isValid).toBe(false);
    expect(res.threat.type).toBe('MISSING_AUTHENTICATION');
  });

  test('Detects invalid JWT signature (+35 risk)', () => {
    const req = { headers: { authorization: 'Bearer invalid_signature_token' } };
    const res = validateJwt(req);
    expect(res.isValid).toBe(false);
    expect(res.threat.type).toBe('INVALID_JWT');
  });

  test('Validates legitimate JWT token', () => {
    const token = jwt.sign({ userId: 'user_1', role: 'USER' }, JWT_SECRET);
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = validateJwt(req);
    expect(res.isValid).toBe(true);
    expect(res.user.userId).toBe('user_1');
  });
});

describe('2. Endpoint-Aware BOLA / Authorization Detector', () => {
  const user1 = { userId: 'user_1', role: 'USER' };

  test('Allows user_1 accessing own profile (/api/users/user_1)', () => {
    const req = { originalUrl: '/api/users/user_1', params: { id: 'user_1' }, query: {}, body: {} };
    const threat = checkBolaAuthorization(req, user1);
    expect(threat).toBeNull();
  });

  test('Flags BOLA attempt when user_1 accesses user_2 profile (/api/users/user_2)', () => {
    const req = { originalUrl: '/api/users/user_2', params: { id: 'user_2' }, query: {}, body: {} };
    const threat = checkBolaAuthorization(req, user1);
    expect(threat).not.toBeNull();
    expect(threat.type).toBe('BOLA_AUTHORIZATION_VIOLATION');
    expect(threat.reason).toContain('user_1');
    expect(threat.reason).toContain('user_2');
  });

  test('Allows user_1 accessing own order (/api/orders/ord_101)', () => {
    // ord_101 belongs to user_1
    const req = { originalUrl: '/api/orders/ord_101', params: { id: 'ord_101' }, query: {}, body: {} };
    const threat = checkBolaAuthorization(req, user1);
    expect(threat).toBeNull();
  });

  test('Flags BOLA attempt when user_1 accesses user_2 order (/api/orders/ord_102)', () => {
    // ord_102 belongs to user_2
    const req = { originalUrl: '/api/orders/ord_102', params: { id: 'ord_102' }, query: {}, body: {} };
    const threat = checkBolaAuthorization(req, user1);
    expect(threat).not.toBeNull();
    expect(threat.type).toBe('BOLA_AUTHORIZATION_VIOLATION');
    expect(threat.reason).toContain('ord_102 owned by user_2');
  });

  test('Allows ADMIN role to access any resource', () => {
    const admin = { userId: 'admin_1', role: 'ADMIN' };
    const req = { originalUrl: '/api/orders/ord_102', params: { id: 'ord_102' }, query: {}, body: {} };
    const threat = checkBolaAuthorization(req, admin);
    expect(threat).toBeNull();
  });
});

describe('3. Multi-Signal SQL Injection Detector', () => {
  test('Detects SQL injection tautology payload (\' OR 1=1 --)', () => {
    const req = { query: { q: "laptop' OR 1=1 --" }, params: {}, body: {} };
    const threat = detectSqlInjection(req);
    expect(threat).not.toBeNull();
    expect(threat.type).toBe('SQL_INJECTION');
  });

  test('Detects UNION SELECT payload', () => {
    const req = { query: { id: "1 UNION SELECT username, password FROM users" }, params: {}, body: {} };
    const threat = detectSqlInjection(req);
    expect(threat).not.toBeNull();
    expect(threat.type).toBe('SQL_INJECTION');
  });

  test('Does not flag legitimate search query', () => {
    const req = { query: { q: "macbook pro 16 inch" }, params: {}, body: {} };
    const threat = detectSqlInjection(req);
    expect(threat).toBeNull();
  });
});

describe('4. XSS & Malicious Input Detector', () => {
  test('Detects script tag payload', () => {
    const req = { body: { comment: "<script>alert('xss')</script>" } };
    const threat = detectXss(req);
    expect(threat).not.toBeNull();
    expect(threat.type).toBe('XSS_MALICIOUS_INPUT');
  });

  test('Detects onerror event handler payload', () => {
    const req = { body: { name: "<img src=x onerror=alert(1)>" } };
    const threat = detectXss(req);
    expect(threat).not.toBeNull();
  });

  test('Does not flag clean plain text input', () => {
    const req = { body: { comment: "Great cybersecurity product!" } };
    const threat = detectXss(req);
    expect(threat).toBeNull();
  });
});

describe('5. Progressive Rate Limiter', () => {
  test('Elevates rate limit status on repeated requests', () => {
    const ip = '192.168.1.100';
    unblockIP(ip);
    const policy = {
      rateLimitWindowMs: 60000,
      rateLimitMaxRequests: 5,
      rateLimitElevatedThreshold: 2,
      rateLimitCriticalThreshold: 10
    };

    let req = { ip, connection: { remoteAddress: ip } };
    
    checkRateLimit(req, policy);
    const r2 = checkRateLimit(req, policy);
    expect(r2.isRateLimited).toBe(false);

    const r3 = checkRateLimit(req, policy);
    expect(r3.isElevated).toBe(true);

    checkRateLimit(req, policy);
    checkRateLimit(req, policy);
    const r6 = checkRateLimit(req, policy);
    expect(r6.isRateLimited).toBe(true);
  });
});

describe('6. Behavioral Resource Enumeration Detector', () => {
  test('Detects rapid access to multiple distinct object IDs', () => {
    const ip = '10.0.0.5';
    const policy = { enumerationWindowMs: 60000, enumerationMaxUniqueIds: 3 };

    for (let i = 1; i <= 3; i++) {
      const req = { ip, params: { id: `id_${i}` }, baseUrl: '/api', path: `/users/id_${i}` };
      detectBehavioralEnumeration(req, policy);
    }

    const req4 = { ip, params: { id: 'id_4' }, baseUrl: '/api', path: '/users/id_4' };
    const threat = detectBehavioralEnumeration(req4, policy);
    expect(threat).not.toBeNull();
    expect(threat.type).toBe('BEHAVIORAL_RESOURCE_ENUMERATION');
  });
});

describe('7. Risk & Confidence Scoring Engine', () => {
  test('Calculates aggregate risk score, confidence percentage, and explanations', () => {
    const threats = [
      { type: 'SQL_INJECTION', scoreContribution: 40, confidence: 95, reason: 'Tautology pattern' },
      { type: 'MISSING_AUTHENTICATION', scoreContribution: 30, confidence: 100, reason: 'No auth header' }
    ];

    const result = calculateRiskAndConfidence(threats, {}, null);
    expect(result.riskScore).toBe(70);
    expect(result.confidence).toBe(98);
    expect(result.severity).toBe('HIGH');
  });

  test('Caps risk score at 100', () => {
    const threats = [
      { type: 'SQL_INJECTION', scoreContribution: 40, confidence: 95, reason: 'SQLi' },
      { type: 'BOLA_AUTHORIZATION_VIOLATION', scoreContribution: 35, confidence: 95, reason: 'BOLA' },
      { type: 'XSS_MALICIOUS_INPUT', scoreContribution: 35, confidence: 95, reason: 'XSS' }
    ];

    const result = calculateRiskAndConfidence(threats, {}, null);
    expect(result.riskScore).toBe(100);
  });
});

describe('8. End-to-End Gateway Integration', () => {
  let user1Token;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ username: 'alice', password: 'password123' });
    user1Token = res.body.data.token;
  });

  test('GET /api/products returns 200 OK with explicit X-Security-Gateway headers', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(res.headers['x-security-gateway']).toBe('Active');
    expect(res.headers['x-security-decision']).toBe('ALLOW');
  });

  test('GET /api/profile without JWT returns 401 Unauthorized', async () => {
    const res = await request(app).get('/api/profile');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('GET /api/orders/ord_101 with user_1 JWT returns 200 OK (Own Order)', async () => {
    const res = await request(app)
      .get('/api/orders/ord_101')
      .set('Authorization', `Bearer ${user1Token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('ord_101');
  });

  test('GET /api/orders/ord_102 with user_1 JWT returns 403 Forbidden (BOLA Block)', async () => {
    const res = await request(app)
      .get('/api/orders/ord_102')
      .set('Authorization', `Bearer ${user1Token}`);
    expect(res.status).toBe(403);
    expect(res.body.securityGateway.threatTypes).toContain('BOLA_AUTHORIZATION_VIOLATION');
  });

  test('GET /api/search with SQLi payload returns 403 Forbidden', async () => {
    const res = await request(app).get("/api/search?q=phone' OR 1=1 --");
    expect(res.status).toBe(403);
    expect(res.body.securityGateway.threatTypes).toContain('SQL_INJECTION');
  });
});

describe('9. Phase 2: Endpoint Security Profiles & Behavioral Baseline', () => {
  const { getEndpointProfile } = require('../src/security/policy/endpointProfiles');
  const { detectBehaviorAnomalies } = require('../src/security/behavior/anomalyDetector');
  const { trackRequestBehavior } = require('../src/security/behavior/behaviorBaseline');

  test('Assigns CRITICAL sensitivity profile to /api/orders/:id', () => {
    const profile = getEndpointProfile('/api/orders/ord_123');
    expect(profile.sensitivity).toBe('CRITICAL');
    expect(profile.bolaProtected).toBe(true);
    expect(profile.scoreMultiplier).toBe(1.5);
  });

  test('Assigns LOW sensitivity profile to /api/products', () => {
    const profile = getEndpointProfile('/api/products');
    expect(profile.sensitivity).toBe('LOW');
    expect(profile.scoreMultiplier).toBe(0.8);
  });

  test('Calculates low anomaly score for normal baseline behavior', () => {
    const req = { ip: '192.168.2.1', path: '/api/products' };
    trackRequestBehavior(req, null, 200);
    const anomaly = detectBehaviorAnomalies(req, null, getEndpointProfile('/api/products'));
    expect(anomaly.score).toBeLessThanOrEqual(30);
    expect(anomaly.confidence).toBeGreaterThanOrEqual(75);
    expect(anomaly.explanation).toBeDefined();
  });
});

describe('10. Phase 2: Reputation Decay Manager', () => {
  const { getReputation, recordThreatEvent } = require('../src/security/reputation/reputationManager');

  test('Tracks IP threat history and computes exponential time-decay score', () => {
    const testIp = '10.200.1.50';
    recordThreatEvent(testIp, 80);
    const rep1 = getReputation(testIp);
    expect(rep1.score).toBeGreaterThan(0);
    expect(rep1.decayedScore).toBeGreaterThan(0);
    expect(rep1.level).toBeDefined();
    expect(rep1.reason).toContain(testIp);
  });
});

describe('11. Phase 2: Threat Correlation & Campaign Manager', () => {
  const { correlateThreatEvents, getActiveAttackChains } = require('../src/security/correlation/threatCorrelator');
  const { processCampaign, getActiveCampaigns } = require('../src/security/campaign/campaignManager');

  test('Correlates multiple attack events into a multi-vector attack chain within window', () => {
    const testIp = '172.16.0.99';
    const policy = { correlationWindowMs: 30 * 60 * 1000, campaignWindowMs: 2 * 60 * 60 * 1000 };

    const event1 = {
      requestId: 'REQ-1',
      ipAddress: testIp,
      endpoint: '/api/search',
      method: 'GET',
      threatTypes: ['SQL_INJECTION'],
      riskScore: 70,
      decision: 'BLOCK',
      severity: 'HIGH'
    };

    const event2 = {
      requestId: 'REQ-2',
      ipAddress: testIp,
      endpoint: '/api/users/probe_1',
      method: 'GET',
      threatTypes: ['BEHAVIORAL_RESOURCE_ENUMERATION'],
      riskScore: 60,
      decision: 'MONITOR',
      severity: 'HIGH'
    };

    const chain1 = correlateThreatEvents(event1, policy);
    expect(chain1).not.toBeNull();
    expect(chain1.chainId).toBeDefined();

    const chain2 = correlateThreatEvents(event2, policy);
    expect(chain2.events.length).toBe(2);
    expect(chain2.attackTypes).toContain('SQL_INJECTION');
    expect(chain2.attackTypes).toContain('BEHAVIORAL_RESOURCE_ENUMERATION');

    const campaign = processCampaign(chain2, policy);
    expect(campaign).not.toBeNull();
    expect(campaign.campaignId).toBeDefined();
    expect(campaign.source).toBe(testIp);
  });
});

describe('12. Phase 2: Security Posture API & Analyst Feedback Loop', () => {
  test('GET /api/security/posture returns posture score, threat metrics, and active campaign counts', async () => {
    const res = await request(app).get('/api/security/posture');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.securityScore).toBeGreaterThanOrEqual(0);
    expect(res.body.data.securityScore).toBeLessThanOrEqual(100);
    expect(res.body.data.threatDistribution).toBeDefined();
  });

  test('GET /api/security/reputation returns anomalous sources', async () => {
    const res = await request(app).get('/api/security/reputation');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/security/attack-chains returns active attack chains', async () => {
    const res = await request(app).get('/api/security/attack-chains');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/security/campaigns returns active attack campaigns', async () => {
    const res = await request(app).get('/api/security/campaigns');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

