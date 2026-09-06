import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  autoConnect: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 2000
});

export default socket;
