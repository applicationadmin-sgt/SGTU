const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔐 Generating SSL certificates for IP address 10.20.58.236...');

try {
  // Create ssl directory if it doesn't exist
  const sslDir = path.join(__dirname, 'ssl');
  if (!fs.existsSync(sslDir)) {
    fs.mkdirSync(sslDir);
  }

  // Try to use mkcert if available, otherwise create self-signed certificates
  let mkcertAvailable = false;
  try {
    execSync('mkcert -version', { stdio: 'ignore' });
    mkcertAvailable = true;
    console.log('✅ mkcert is available, using it for certificate generation');
  } catch (error) {
    console.log('⚠️  mkcert not available, using OpenSSL for self-signed certificates');
  }

  if (mkcertAvailable) {
    // Use mkcert to generate trusted certificates
    const certPath = path.join(sslDir, 'localhost.pem');
    const keyPath = path.join(sslDir, 'localhost-key.pem');
    
    // Remove existing certificates
    if (fs.existsSync(certPath)) fs.unlinkSync(certPath);
    if (fs.existsSync(keyPath)) fs.unlinkSync(keyPath);
    
    // Generate new certificates with both localhost and IP
    execSync(`mkcert -install`, { cwd: sslDir });
    execSync(`mkcert localhost 127.0.0.1 10.20.58.236`, { cwd: sslDir });
    
    console.log('✅ mkcert certificates generated successfully!');
    console.log(`📁 Certificate files created in ${sslDir}:`);
    console.log(`   - Private key: localhost-key.pem`);
    console.log(`   - Certificate: localhost.pem`);
    
  } else {
    // Fallback to OpenSSL for self-signed certificates
    const keyPath = path.join(sslDir, 'localhost-key.pem');
    const certPath = path.join(sslDir, 'localhost.pem');
    
    // Create OpenSSL config for SAN (Subject Alternative Names)
    const configContent = `[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = US
ST = Development
L = Development
O = Development
CN = localhost

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
IP.1 = 127.0.0.1
IP.2 = 10.20.58.236
`;

    const configPath = path.join(sslDir, 'ssl.conf');
    fs.writeFileSync(configPath, configContent);

    // Generate private key
    execSync(`openssl genrsa -out "${keyPath}" 2048`, { stdio: 'inherit' });
    
    // Generate certificate signing request
    const csrPath = path.join(sslDir, 'localhost.csr');
    execSync(`openssl req -new -key "${keyPath}" -out "${csrPath}" -config "${configPath}"`, { stdio: 'inherit' });
    
    // Generate self-signed certificate
    execSync(`openssl x509 -req -days 365 -in "${csrPath}" -signkey "${keyPath}" -out "${certPath}" -extensions v3_req -extfile "${configPath}"`, { stdio: 'inherit' });
    
    // Clean up temporary files
    fs.unlinkSync(csrPath);
    fs.unlinkSync(configPath);
    
    console.log('✅ Self-signed certificates generated successfully!');
    console.log(`📁 Certificate files created in ${sslDir}:`);
    console.log(`   - Private key: localhost-key.pem`);
    console.log(`   - Certificate: localhost.pem`);
  }

  console.log('');
  console.log('🔧 Next steps:');
  console.log('   1. Restart the backend server to use new certificates');
  console.log('   2. Access via https://10.20.58.236:5000 (backend) or https://10.20.58.236:3000 (frontend)');
  console.log('   3. Accept the certificate in your browser when prompted');
  console.log('');
  console.log('🚨 Important: For self-signed certificates, you may need to:');
  console.log('   - Click "Advanced" and "Proceed to site" in Chrome');
  console.log('   - Or add --ignore-certificate-errors flag to Chrome');

} catch (error) {
  console.error('❌ Error generating SSL certificates:', error);
  console.error('Make sure OpenSSL is installed and available in your PATH');
}