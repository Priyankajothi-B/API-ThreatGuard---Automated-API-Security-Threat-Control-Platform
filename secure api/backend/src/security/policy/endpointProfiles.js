const ENDPOINT_PROFILES = {
  '/api/login': {
    endpoint: '/api/login',
    sensitivity: 'HIGH',
    authRequired: false,
    rateLimitMax: 15,
    enumerationSensitive: true,
    sqliSensitive: true,
    xssSensitive: true,
    scoreMultiplier: 1.3
  },
  '/api/users/:id': {
    endpoint: '/api/users/:id',
    sensitivity: 'HIGH',
    authRequired: true,
    rateLimitMax: 30,
    bolaProtected: true,
    enumerationSensitive: true,
    scoreMultiplier: 1.3
  },
  '/api/orders/:id': {
    endpoint: '/api/orders/:id',
    sensitivity: 'CRITICAL',
    authRequired: true,
    rateLimitMax: 20,
    bolaProtected: true,
    scoreMultiplier: 1.5
  },
  '/api/profile': {
    endpoint: '/api/profile',
    sensitivity: 'MEDIUM',
    authRequired: true,
    rateLimitMax: 60,
    scoreMultiplier: 1.1
  },
  '/api/products': {
    endpoint: '/api/products',
    sensitivity: 'LOW',
    authRequired: false,
    rateLimitMax: 100,
    scoreMultiplier: 0.8
  },
  '/api/orders': {
    endpoint: '/api/orders',
    sensitivity: 'HIGH',
    authRequired: true,
    rateLimitMax: 30,
    xssSensitive: true,
    scoreMultiplier: 1.2
  },
  '/api/search': {
    endpoint: '/api/search',
    sensitivity: 'MEDIUM',
    authRequired: false,
    rateLimitMax: 60,
    sqliSensitive: true,
    scoreMultiplier: 1.1
  }
};

const DEFAULT_PROFILE = {
  endpoint: 'DEFAULT',
  sensitivity: 'MEDIUM',
  authRequired: false,
  rateLimitMax: 50,
  scoreMultiplier: 1.0
};

function getEndpointProfile(path) {
  if (!path) return DEFAULT_PROFILE;

  // 1. Direct match
  if (ENDPOINT_PROFILES[path]) return ENDPOINT_PROFILES[path];

  // 2. Pattern match /users/:id or /orders/:id
  if (path.match(/\/(?:api\/)?users\/[^\/]+/)) return ENDPOINT_PROFILES['/api/users/:id'];
  if (path.match(/\/(?:api\/)?orders\/[^\/]+/)) return ENDPOINT_PROFILES['/api/orders/:id'];

  return DEFAULT_PROFILE;
}

module.exports = {
  ENDPOINT_PROFILES,
  DEFAULT_PROFILE,
  getEndpointProfile
};
