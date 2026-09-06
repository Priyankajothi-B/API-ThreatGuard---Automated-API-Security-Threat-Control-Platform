const { findOrderById, findUserById } = require('../../services/demoData');

function checkBolaAuthorization(req, user) {
  if (!user) return null; // Unauthenticated handled by JWT validator
  if (user.role === 'ADMIN') return null; // Admin users bypass BOLA checks

  const fullPath = req.originalUrl || req.path;

  // 1. Endpoint Check for User Profile: /api/users/:id
  const userMatch = fullPath.match(/\/(?:api\/)?users\/([^\/\?]+)/);
  if (userMatch) {
    const targetUserId = userMatch[1];
    // Check if target matches authenticated user's ID
    const isOwner = (user.userId === targetUserId || user.id === targetUserId);
    if (!isOwner) {
      return {
        detected: true,
        type: 'BOLA_AUTHORIZATION_VIOLATION',
        threatType: 'BOLA_AUTHORIZATION_VIOLATION',
        severity: 'HIGH',
        scoreContribution: 35,
        confidence: 95,
        reason: `User ${user.userId || user.username} attempted to access profile belonging to ${targetUserId}`
      };
    }
    return null;
  }

  // 2. Endpoint Check for Order Details: /api/orders/:id
  const orderMatch = fullPath.match(/\/(?:api\/)?orders\/([^\/\?]+)/);
  if (orderMatch) {
    const orderId = orderMatch[1];
    const order = findOrderById(orderId);
    
    // If order exists, verify order.userId against authenticated user.userId
    if (order) {
      const isOwner = (order.userId === user.userId || order.userId === user.id);
      if (!isOwner) {
        return {
          detected: true,
          type: 'BOLA_AUTHORIZATION_VIOLATION',
          threatType: 'BOLA_AUTHORIZATION_VIOLATION',
          severity: 'HIGH',
          scoreContribution: 35,
          confidence: 95,
          reason: `User ${user.userId || user.username} attempted to access ${orderId} owned by ${order.userId}`
        };
      }
    }
    return null;
  }

  // 3. Body/Query ownership parameter check (if endpoint contains explicit userId field)
  const targetUserId = req.query.userId || (req.body && req.body.userId);
  if (targetUserId && targetUserId !== user.userId && targetUserId !== user.id) {
    return {
      detected: true,
      type: 'BOLA_AUTHORIZATION_VIOLATION',
      threatType: 'BOLA_AUTHORIZATION_VIOLATION',
      severity: 'HIGH',
      scoreContribution: 35,
      confidence: 95,
      reason: `User ${user.userId || user.username} attempted to operate on resource belonging to ${targetUserId}`
    };
  }

  return null;
}

module.exports = { checkBolaAuthorization };
