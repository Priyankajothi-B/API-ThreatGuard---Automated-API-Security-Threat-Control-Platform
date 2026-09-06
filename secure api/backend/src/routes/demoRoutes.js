const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { JWT_SECRET } = require('../config/constants');
const {
  MOCK_USERS,
  MOCK_PRODUCTS,
  MOCK_ORDERS,
  findUserByUsername,
  findUserById,
  findOrderById,
  addOrder
} = require('../services/demoData');

// Helper to wrap successful response with explicit gateway metadata
function formatSuccessResponse(res, data) {
  const gateway = res.req.securityGateway || { intercepted: true, decision: 'ALLOW' };
  return res.json({
    success: true,
    securityGateway: {
      intercepted: true,
      requestId: gateway.requestId,
      decision: gateway.decision || 'ALLOW',
      riskScore: gateway.riskScore || 0,
      confidence: gateway.confidence || 100,
      latencyMs: gateway.latencyMs || 1.2,
      explanation: gateway.explanation || 'Request allowed by API Security Gateway policy.'
    },
    data
  });
}

// POST /api/login -> Authenticates credentials with bcrypt and returns JWT
router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  
  if (!username || !password) {
    return res.status(401).json({
      success: false,
      securityGateway: res.req.securityGateway || { intercepted: true, decision: 'ALLOW' },
      error: { code: 'UNAUTHORIZED', message: 'Invalid username or password' }
    });
  }

  const user = findUserByUsername(username);
  if (!user) {
    return res.status(401).json({
      success: false,
      securityGateway: res.req.securityGateway || { intercepted: true, decision: 'ALLOW' },
      error: { code: 'UNAUTHORIZED', message: 'Invalid username or password' }
    });
  }

  const isPasswordValid = bcrypt.compareSync(password, user.password);
  if (!isPasswordValid) {
    return res.status(401).json({
      success: false,
      securityGateway: res.req.securityGateway || { intercepted: true, decision: 'ALLOW' },
      error: { code: 'UNAUTHORIZED', message: 'Invalid username or password' }
    });
  }

  const token = jwt.sign(
    { userId: user.userId, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '2h' }
  );

  return formatSuccessResponse(res, {
    token,
    tokenType: 'Bearer',
    expiresIn: 7200,
    user: { userId: user.userId, username: user.username, role: user.role }
  });
});

// GET /api/users -> List users
router.get('/users', (req, res) => {
  return formatSuccessResponse(res, MOCK_USERS.map(({ password, ...u }) => u));
});

// GET /api/users/:id -> User details by ID
router.get('/users/:id', (req, res) => {
  const user = findUserById(req.params.id);
  if (!user) {
    return res.status(404).json({
      success: false,
      securityGateway: res.req.securityGateway,
      error: { code: 'USER_NOT_FOUND', message: `User with ID ${req.params.id} not found.` }
    });
  }
  const { password, ...safeUser } = user;
  return formatSuccessResponse(res, safeUser);
});

// GET /api/profile -> Current authenticated profile using req.user
router.get('/profile', (req, res) => {
  return formatSuccessResponse(res, {
    profile: req.user || findUserById('user_1'),
    lastLogin: new Date(),
    securityStatus: 'PROTECTED_BY_GATEWAY'
  });
});

// GET /api/products -> Public catalog
router.get('/products', (req, res) => {
  return formatSuccessResponse(res, MOCK_PRODUCTS);
});

// POST /api/orders -> Create order for req.user
router.post('/orders', (req, res) => {
  const newOrder = {
    id: `ord_${Math.floor(100 + Math.random() * 900)}`,
    userId: (req.user && req.user.userId) || 'user_1',
    product: req.body.product || 'Threat Intelligence Feed',
    amount: req.body.amount || 499,
    status: 'CREATED',
    createdAt: new Date()
  };
  addOrder(newOrder);
  return formatSuccessResponse(res, newOrder);
});

// GET /api/orders/:id -> Order by ID
router.get('/orders/:id', (req, res) => {
  const order = findOrderById(req.params.id);
  if (!order) {
    return res.status(404).json({
      success: false,
      securityGateway: res.req.securityGateway,
      error: { code: 'ORDER_NOT_FOUND', message: `Order ${req.params.id} not found.` }
    });
  }
  return formatSuccessResponse(res, order);
});

// GET /api/search -> Catalog search (target for SQLi test)
router.get('/search', (req, res) => {
  const query = (req.query.q || '').toLowerCase();
  const results = MOCK_PRODUCTS.filter(p => p.name.toLowerCase().includes(query) || p.category.toLowerCase().includes(query));
  return formatSuccessResponse(res, { query: req.query.q, totalResults: results.length, items: results });
});

module.exports = router;
