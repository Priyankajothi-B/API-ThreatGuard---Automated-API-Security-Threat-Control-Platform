const bcrypt = require('bcryptjs');

// Hash demo password "password123" synchronously for reliable demo authentication
const DEMO_PASSWORD_HASH = bcrypt.hashSync('password123', 10);

const MOCK_USERS = [
  { id: 'user_1', userId: 'user_1', username: 'alice', email: 'alice@example.com', password: DEMO_PASSWORD_HASH, role: 'USER' },
  { id: 'user_2', userId: 'user_2', username: 'bob', email: 'bob@example.com', password: DEMO_PASSWORD_HASH, role: 'USER' },
  { id: 'user_3', userId: 'user_3', username: 'charlie', email: 'charlie@example.com', password: DEMO_PASSWORD_HASH, role: 'USER' },
  { id: 'admin_1', userId: 'admin_1', username: 'admin', email: 'admin@secgateway.io', password: DEMO_PASSWORD_HASH, role: 'ADMIN' }
];

const MOCK_PRODUCTS = [
  { id: 'prod_1', name: 'Enterprise API Security Gateway', price: 999, category: 'Cybersecurity' },
  { id: 'prod_2', name: 'Threat Intelligence Feed', price: 499, category: 'Analytics' },
  { id: 'prod_3', name: 'Zero Trust Authorization Engine', price: 799, category: 'Security' }
];

const MOCK_ORDERS = [
  { id: 'ord_101', userId: 'user_1', product: 'Enterprise API Security Gateway', amount: 999, status: 'COMPLETED' },
  { id: 'ord_102', userId: 'user_2', product: 'Threat Intelligence Feed', amount: 499, status: 'PROCESSING' }
];

function findUserByUsername(username) {
  return MOCK_USERS.find(u => u.username === username);
}

function findUserById(id) {
  return MOCK_USERS.find(u => u.id === id || u.userId === id);
}

function findOrderById(id) {
  return MOCK_ORDERS.find(o => o.id === id);
}

function addOrder(order) {
  MOCK_ORDERS.push(order);
  return order;
}

module.exports = {
  MOCK_USERS,
  MOCK_PRODUCTS,
  MOCK_ORDERS,
  findUserByUsername,
  findUserById,
  findOrderById,
  addOrder
};
