const http = require('http');
const https = require('https');
const { URL } = require('url');

async function testConnection(url, name) {
  return new Promise((resolve) => {
    try {
      const urlObj = new URL(url);
      const isHTTPS = urlObj.protocol === 'https:';
      const client = isHTTPS ? https : http;
      
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHTTPS ? 443 : 80),
        path: urlObj.pathname,
        method: 'GET',
        timeout: 5000,
        rejectUnauthorized: false // Allow self-signed certificates
      };

      const req = client.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            console.log(`✅ ${name}: ${res.statusCode} - ${parsed.message || 'Connected'}`);
          } catch {
            console.log(`✅ ${name}: ${res.statusCode} - Connected`);
          }
          resolve(true);
        });
      });

      req.on('error', (error) => {
        if (error.code === 'ECONNREFUSED') {
          console.log(`❌ ${name}: Server not running`);
        } else if (error.code === 'ENOTFOUND') {
          console.log(`❌ ${name}: Host not found`);
        } else if (error.code === 'ETIMEDOUT') {
          console.log(`❌ ${name}: Connection timeout`);
        } else {
          console.log(`❌ ${name}: ${error.message}`);
        }
        resolve(false);
      });

      req.on('timeout', () => {
        console.log(`❌ ${name}: Connection timeout`);
        req.destroy();
        resolve(false);
      });

      req.end();
    } catch (error) {
      console.log(`❌ ${name}: ${error.message}`);
      resolve(false);
    }
  });
}

async function testConnections() {
  console.log('🧪 Testing SGT Application Connections...\n');

  const endpoints = [
    { name: 'Backend HTTP (localhost)', url: 'http://localhost:5000' },
    { name: 'Backend HTTPS (localhost)', url: 'https://localhost:5000' },
    { name: 'Backend HTTP (Network)', url: 'http://10.20.49.165:5000' },
    { name: 'Backend HTTPS (Network)', url: 'https://10.20.49.165:5000' }
  ];

  for (const endpoint of endpoints) {
    console.log(`Testing ${endpoint.name}...`);
    await testConnection(endpoint.url, endpoint.name);
    console.log('');
  }

  // Test frontend URLs (these will only work if servers are running)
  console.log('📝 Frontend URLs to test in browser:');
  console.log('   - http://localhost:3000 (HTTP)');
  console.log('   - https://localhost:3000 (HTTPS)');
  console.log('   - http://10.20.49.165:3000 (HTTP Network)');
  console.log('   - https://10.20.49.165:3000 (HTTPS Network)');
  console.log('\n🔐 For HTTPS URLs, accept the certificate warning in browser');
}

testConnections().catch(console.error);