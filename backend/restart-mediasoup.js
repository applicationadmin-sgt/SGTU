/**
 * Script to restart Mediasoup service with expanded port range
 * This will help fix the "no more available ports" error
 */

const { exec } = require('child_process');

// Kill any existing Node.js processes
console.log('🔄 Stopping existing backend processes...');

exec('taskkill /F /IM node.exe', (error) => {
  if (error && !error.message.includes('not found')) {
    console.error('Error stopping processes:', error);
  }
  
  setTimeout(() => {
    console.log('🚀 Starting backend with expanded port range...');
    
    // Set environment variables for expanded port range
    process.env.MEDIASOUP_MIN_PORT = '10000';
    process.env.MEDIASOUP_MAX_PORT = '11000'; // 1000 ports instead of 100
    process.env.MEDIASOUP_ANNOUNCED_IP = '192.168.7.20';
    process.env.EXTERNAL_IP = '192.168.7.20';
    
    // Start the server
    require('./server.js');
    
  }, 2000);
});