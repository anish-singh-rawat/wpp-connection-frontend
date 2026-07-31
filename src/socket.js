import { io } from 'socket.io-client';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8086';

function getJwt() {
  return localStorage.getItem('wpp_jwt') || '';
}

const socket = io(BASE_URL, {
  transports: ['websocket', 'polling'],
  auth: (cb) => cb({ token: getJwt() }),
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 10000,
  autoConnect: true,
});

socket.on('connect', () => {
  console.info('[Socket] ✅ Connected — id:', socket.id, '| transport:', socket.io.engine.transport.name);
});

socket.on('disconnect', (reason) => {
  console.info('[Socket] ❌ Disconnected:', reason);
});

socket.on('connect_error', (err) => {
  console.error('[Socket] 🔴 Connection error:', err.message);
});

socket.io.on('reconnect_attempt', (n) => {
  console.info(`[Socket] 🔄 Reconnect attempt #${n}`);
});

socket.io.on('reconnect', () => {
  console.info('[Socket] ✅ Reconnected');
});

export default socket;
