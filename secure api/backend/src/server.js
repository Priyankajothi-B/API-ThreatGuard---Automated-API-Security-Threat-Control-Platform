require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const { connectDB } = require('./services/db');
const { initSocket } = require('./services/socketService');
const { PORT } = require('./config/constants');

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  }
});

initSocket(io);

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`===================================================================`);
    console.log(`🔒 INTELLIGENT API SECURITY GATEWAY & THREAT CONTROL SYSTEM ACTIVE`);
    console.log(`🌐 Server running at: http://localhost:${PORT}`);
    console.log(`⚡ WebSocket Stream:  ws://localhost:${PORT}`);
    console.log(`===================================================================`);
  });
}).catch(err => {
  console.error('Failed to start server:', err);
});

module.exports = { app, server };
