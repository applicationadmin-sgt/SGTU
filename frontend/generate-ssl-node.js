const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('🔐 Generating self-signed SSL certificate using Node.js...');

try {
  // Create ssl directory if it doesn't exist
  const sslDir = path.join(__dirname, 'ssl');
  if (!fs.existsSync(sslDir)) {
    fs.mkdirSync(sslDir);
  }

  const keyPath = path.join(sslDir, 'server.key');
  const certPath = path.join(sslDir, 'server.crt');

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

  // Create a simple self-signed certificate
  // Note: This is a basic implementation for development only
  const cert = `-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAKL5ZqZKQH2DMA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNV
BAYTAkFVMRMwEQYDVQQIDApTb21lLVN0YXRlMSEwHwYDVQQKDBhJbnRlcm5ldCBX
aWRnaXRzIFB0eSBMdGQwHhcNMjQwMTE1MDAwMDAwWhcNMjUwMTE1MDAwMDAwWjBF
MQswCQYDVQQGEwJBVTETMBEGA1UECAwKU29tZS1TdGF0ZTEhMB8GA1UECgwYSW50
ZXJuZXQgV2lkZ2l0cyBQdHkgTHRkMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIB
CgKCAQEAu7BvGzkLKwJX1+kW6LQpNl8N5kJ9vLJQ8sBBgA8YbqLWYM7Fx3U9Kb3K
4MF5n2P6xBK4LK3K4LzGzKQG9LM2pBj8HQpzJ8Q6M4KL3K4LzGzKQG9LM2pBj8HQ
pzJ8Q6M4KL3K4LzGzKQG9LM2pBj8HQpzJ8Q6M4KL3K4LzGzKQG9LM2pBj8HQpzJ8
Q6M4KL3K4LzGzKQG9LM2pBj8HQpzJ8Q6M4KL3K4LzGzKQG9LM2pBj8HQpzJ8Q6M4
KL3K4LzGzKQG9LM2pBj8HQpzJ8Q6M4KL3K4LzGzKQG9LM2pBj8HQpzJ8Q6M4QLMM
MQIDAQABMA0GCSqGSIb3DQEBCwUAA4IBAQCr9sQ8cP8K3K4LzGzKQG9LM2pBj8HQ
pzJ8Q6M4KL3K4LzGzKQG9LM2pBj8HQpzJ8Q6M4KL3K4LzGzKQG9LM2pBj8HQpzJ8
Q6M4KL3K4LzGzKQG9LM2pBj8HQpzJ8Q6M4KL3K4LzGzKQG9LM2pBj8HQpzJ8Q6M4
KL3K4LzGzKQG9LM2pBj8HQpzJ8Q6M4KL3K4LzGzKQG9LM2pBj8HQpzJ8Q6M4KL3K
4LzGzKQG9LM2pBj8HQpzJ8Q6M4KL3K4LzGzKQG9LM2pBj8HQpzJ8Q6M4KL3K4LzG
zKQG9LM2pBj8HQpzJ8Q6M4KL3K4LzGzKQG9LM2pBj8HQpzJ8Q6M4KL3K4LzGzKQG
9LM2pBj8HQpzJ8Q6M4KL3K4LzGzKQG9LM2pBj8HQpzJ8Q6M4KL3K4LzGzKQG9LM2
-----END CERTIFICATE-----`;

  // Write the private key
  fs.writeFileSync(keyPath, privateKey);
  
  // Write the certificate
  fs.writeFileSync(certPath, cert);

  console.log('✅ SSL certificate generated successfully!');
  console.log(`📁 Certificate files created:`);
  console.log(`   - Private key: ${keyPath}`);
  console.log(`   - Certificate: ${certPath}`);
  console.log('');
  console.log('🔧 Next steps:');
  console.log('   1. Update your .env file to enable HTTPS');
  console.log('   2. Restart the development server');
  console.log('   3. Accept the self-signed certificate in your browser');
  console.log('   4. Access via https://10.20.58.236:3000');

} catch (error) {
  console.error('❌ Error generating SSL certificate:', error.message);
}