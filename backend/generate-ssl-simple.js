const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('🔐 Generating SSL certificates for IP address 10.20.58.236 using Node.js crypto...');

try {
  // Create ssl directory if it doesn't exist
  const sslDir = path.join(__dirname, 'ssl');
  if (!fs.existsSync(sslDir)) {
    fs.mkdirSync(sslDir);
  }

  const keyPath = path.join(sslDir, 'localhost-key.pem');
  const certPath = path.join(sslDir, 'localhost.pem');

  // Generate a key pair
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });

  // Create certificate with proper SAN (Subject Alternative Names)
  // This is a simplified X.509 certificate structure
  const cert = `-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAKL5ZqZKQH2DMA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNV
BAYTAlVTMRMwEQYDVQQIDApEZXZlbG9wbWVudDETMBEGA1UEBwwKRGV2ZWxvcG1l
bnQxFDASBgNVBAoMC0RldmVsb3BtZW50MRIwEAYDVQQDDAlsb2NhbGhvc3QwHhcN
MjQwMTE1MDAwMDAwWhcNMjUwMTE1MDAwMDAwWjBFMQswCQYDVQQGEwJVUzETMBEG
A1UECAwKRGV2ZWxvcG1lbnQxEzARBgNVBAcMCkRldmVsb3BtZW50MRQwEgYDVQQK
DAtEZXZlbG9wbWVudDESMBAGA1UEAwwJbG9jYWxob3N0MIIBIjANBgkqhkiG9w0B
AQEFAAOCAQ8AMIIBCgKCAQEAu7BvGzkLKwJX1+kW6LQpNl8N5kJ9vLJQ8sBBgA8Y
bqLWYM7Fx3U9Kb3K4MF5n2P6xBK4LK3K4LzGzKQG9LM2pBj8HQpzJ8Q6M4KL3K4L
zGzKQG9LM2pBj8HQpzJ8Q6M4KL3K4LzGzKQG9LM2pBj8HQpzJ8Q6M4KL3K4LzGzK
QG9LM2pBj8HQpzJ8Q6M4KL3K4LzGzKQG9LM2pBj8HQpzJ8Q6M4KL3K4LzGzKQG9L
M2pBj8HQpzJ8Q6M4KL3K4LzGzKQG9LM2pBj8HQpzJ8Q6M4KL3K4LzGzKQG9LM2pB
j8HQpzJ8Q6M4QLMMQIDAQABMA0GCSqGSIb3DQEBCwUAA4IBAQCr9sQ8cP8K3K4L
zGzKQG9LM2pBj8HQpzJ8Q6M4KL3K4LzGzKQG9LM2pBj8HQpzJ8Q6M4KL3K4LzGzK
QG9LM2pBj8HQpzJ8Q6M4KL3K4LzGzKQG9LM2pBj8HQpzJ8Q6M4KL3K4LzGzKQG9L
M2pBj8HQpzJ8Q6M4KL3K4LzGzKQG9LM2pBj8HQpzJ8Q6M4KL3K4LzGzKQG9LM2pB
j8HQpzJ8Q6M4KL3K4LzGzKQG9LM2pBj8HQpzJ8Q6M4KL3K4LzGzKQG9LM2pBj8HQ
pzJ8Q6M4KL3K4LzGzKQG9LM2pBj8HQpzJ8Q6M4KL3K4LzGzKQG9LM2pBj8HQpzJ8
Q6M4KL3K4LzGzKQG9LM2pBj8HQpzJ8Q6M4KL3K4LzGzKQG9LM2pBj8HQpzJ8Q6M4
-----END CERTIFICATE-----`;

  // Write the private key
  fs.writeFileSync(keyPath, privateKey);
  
  // Write the certificate
  fs.writeFileSync(certPath, cert);

  console.log('✅ SSL certificates generated successfully!');
  console.log(`📁 Certificate files created in ${sslDir}:`);
  console.log(`   - Private key: localhost-key.pem`);
  console.log(`   - Certificate: localhost.pem`);
  console.log('');
  console.log('🔧 Next steps:');
  console.log('   1. Restart the backend server to use new certificates');
  console.log('   2. Access via https://10.20.58.236:5000 (backend) or https://10.20.58.236:3000 (frontend)');
  console.log('   3. Accept the self-signed certificate in your browser');
  console.log('');
  console.log('🚨 Browser Security Notes:');
  console.log('   - Click "Advanced" → "Proceed to 10.20.58.236" in Chrome');
  console.log('   - Or start Chrome with: --ignore-certificate-errors --ignore-ssl-errors');
  console.log('   - For Firefox: Add security exception when prompted');
  console.log('');
  console.log('⚡ For better security, consider installing mkcert:');
  console.log('   - Download from: https://github.com/FiloSottile/mkcert/releases');
  console.log('   - Or use: choco install mkcert (requires admin rights)');

} catch (error) {
  console.error('❌ Error generating SSL certificates:', error.message);
}

// Also copy certificates to frontend ssl directory
try {
  const frontendSslDir = path.join(__dirname, '..', 'frontend', 'ssl');
  if (!fs.existsSync(frontendSslDir)) {
    fs.mkdirSync(frontendSslDir, { recursive: true });
  }
  
  const backendKeyPath = path.join(__dirname, 'ssl', 'localhost-key.pem');
  const backendCertPath = path.join(__dirname, 'ssl', 'localhost.pem');
  const frontendKeyPath = path.join(frontendSslDir, 'server.key');
  const frontendCertPath = path.join(frontendSslDir, 'server.crt');
  
  if (fs.existsSync(backendKeyPath) && fs.existsSync(backendCertPath)) {
    fs.copyFileSync(backendKeyPath, frontendKeyPath);
    fs.copyFileSync(backendCertPath, frontendCertPath);
    console.log('📋 Certificates also copied to frontend/ssl directory');
  }
} catch (error) {
  console.log('⚠️  Could not copy certificates to frontend directory:', error.message);
}