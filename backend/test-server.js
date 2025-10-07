const express = require('express');
require('dotenv').config();

console.log('🔍 Backend Startup Debug');
console.log('Environment Variables:');
console.log('- PORT:', process.env.PORT);
console.log('- HOST:', process.env.HOST);
console.log('- MONGO_URI:', process.env.MONGO_URI ? 'Set' : 'Not Set');
console.log('- HTTPS_ENABLED:', process.env.HTTPS_ENABLED);

const app = express();
const PORT = process.env.PORT || 5000;

// Test basic server startup
app.get('/test', (req, res) => {
  res.json({ message: 'Backend is working!' });
});

// Try to start HTTP first to test basic functionality
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Test HTTP server running on port ${PORT}`);
  console.log(`   Test URL: http://192.168.7.20:${PORT}/test`);
  console.log(`   Test URL: http://localhost:${PORT}/test`);
});

server.on('error', (err) => {
  console.error('❌ Server startup error:', err.message);
  if (err.code === 'EADDRINUSE') {
    console.error(`   Port ${PORT} is already in use. Try a different port.`);
  }
});