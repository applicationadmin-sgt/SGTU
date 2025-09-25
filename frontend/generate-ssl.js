const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔐 Generating self-signed SSL certificate for HTTPS development...');

try {
  // Create ssl directory if it doesn't exist
  const sslDir = path.join(__dirname, 'ssl');
  if (!fs.existsSync(sslDir)) {
    fs.mkdirSync(sslDir);
  }

  const keyPath = path.join(sslDir, 'server.key');
  const certPath = path.join(sslDir, 'server.crt');

  // Generate private key
  execSync(`openssl genrsa -out "${keyPath}" 2048`, { stdio: 'inherit' });
  
  // Generate certificate
  const certCommand = `openssl req -new -x509 -key "${keyPath}" -out "${certPath}" -days 365 -subj "/C=US/ST=State/L=City/O=Organization/OU=OrgUnit/CN=localhost"`;
  execSync(certCommand, { stdio: 'inherit' });

  console.log('✅ SSL certificate generated successfully!');
  console.log(`📁 Certificate files created:`);
  console.log(`   - Private key: ${keyPath}`);
  console.log(`   - Certificate: ${certPath}`);
  console.log('');
  console.log('🔧 To use HTTPS:');
  console.log('   1. Set HTTPS=true in your .env file');
  console.log('   2. Set SSL_CRT_FILE and SSL_KEY_FILE paths');
  console.log('   3. Accept the self-signed certificate in your browser');
  console.log('');
  console.log('⚠️  Note: You may need to install OpenSSL if not available');

} catch (error) {
  console.error('❌ Error generating SSL certificate:', error.message);
  console.log('');
  console.log('📋 Manual steps if OpenSSL is not available:');
  console.log('   1. Install OpenSSL or Git (which includes OpenSSL)');
  console.log('   2. Run this script again');
  console.log('   3. Or use browser flags for development (see README)');
}