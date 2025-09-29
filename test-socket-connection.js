const io = require('socket.io-client');

console.log('🔍 Testing Socket.IO connection to backend...');

// Test connection to the new IP
const socket = io('https://10.20.50.12:5000', {
  rejectUnauthorized: false, // Accept self-signed certificates
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('✅ Socket.IO connection successful!');
  console.log('🔌 Socket ID:', socket.id);
  process.exit(0);
});

socket.on('connect_error', (error) => {
  console.error('❌ Socket.IO connection failed:', error.message);
  process.exit(1);
});

socket.on('disconnect', () => {
  console.log('🔌 Socket.IO disconnected');
});

// Timeout after 10 seconds
setTimeout(() => {
  console.log('⏰ Connection timeout');
  socket.close();
  process.exit(1);
}, 10000);