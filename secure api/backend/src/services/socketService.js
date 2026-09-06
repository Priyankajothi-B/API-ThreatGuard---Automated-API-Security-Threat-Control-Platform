let ioInstance = null;

const initSocket = (io) => {
  ioInstance = io;
  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);
    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });
};

const broadcastEvent = (eventName, data) => {
  if (ioInstance) {
    ioInstance.emit(eventName, data);
  }
};

module.exports = { initSocket, broadcastEvent };
