const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../../config/constants');

function validateJwt(req) {
  const authHeader = req.headers.authorization || req.headers['x-access-token'];
  
  if (!authHeader) {
    return {
      isValid: false,
      user: null,
      threat: {
        type: 'MISSING_AUTHENTICATION',
        severity: 'HIGH',
        scoreContribution: 30,
        confidence: 100,
        reason: 'Protected endpoint accessed without Authorization header'
      }
    };
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return {
      isValid: false,
      user: null,
      threat: {
        type: 'MALFORMED_JWT',
        severity: 'HIGH',
        scoreContribution: 35,
        confidence: 95,
        reason: 'Authorization header does not follow "Bearer <token>" format'
      }
    };
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return {
      isValid: true,
      user: decoded,
      threat: null
    };
  } catch (error) {
    let reason = 'Invalid JWT token signature';
    let type = 'INVALID_JWT';
    
    if (error.name === 'TokenExpiredError') {
      reason = 'JWT token has expired';
      type = 'EXPIRED_JWT';
    }

    return {
      isValid: false,
      user: null,
      threat: {
        type,
        severity: 'HIGH',
        scoreContribution: 35,
        confidence: 100,
        reason
      }
    };
  }
}

module.exports = { validateJwt };
