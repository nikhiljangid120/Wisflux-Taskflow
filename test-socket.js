// test-socket.js — run with: BOB_TOKEN=<token> node test-socket.js
const { io } = require('socket.io-client');

const token = process.env.BOB_TOKEN;
if (!token) {
  console.error('Set BOB_TOKEN environment variable first');
  process.exit(1);
}

const socket = io('http://localhost:3000', {
  auth: { token },
  transports: ['websocket'],
});

socket.on('connect', () => {
  console.log(`✅ Connected with socket id: ${socket.id}`);
  console.log('Waiting for "notification" events... (press Ctrl+C to quit)');
});

socket.on('notification', (data) => {
  console.log('📬 Notification received:', JSON.stringify(data, null, 2));
});

socket.on('connect_error', (err) => {
  console.error('❌ Connection error:', err.message);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});
