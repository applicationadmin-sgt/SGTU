const jwt = require('jsonwebtoken');

// Simulating the token from the test
const testToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4YzRhOGQ4MTYzOTMxNDRkZTA4Yjk5YiIsInJvbGUiOiJzdHVkZW50IiwicGVybWlzc2lvbnMiOltdLCJpYXQiOjE3NTgwODI3MzcsImV4cCI6MTc1ODE2OTEzN30.kS0LTVyrYGfE1lccLP-IKITFWbmuLNjGr2gLs2PH3mQ";

try {
  console.log('🔍 Debugging JWT token...\n');
  
  // Decode without verification first
  const decoded = jwt.decode(testToken);
  console.log('📄 Decoded token payload:');
  console.log(JSON.stringify(decoded, null, 2));
  
  console.log('\n🔍 Key fields:');
  console.log('User ID:', decoded.id);
  console.log('Role:', decoded.role);
  console.log('Permissions:', decoded.permissions);
  
  // Check if token is expired
  const now = Math.floor(Date.now() / 1000);
  console.log('\n⏰ Token expiry check:');
  console.log('Current timestamp:', now);
  console.log('Token expires at:', decoded.exp);
  console.log('Is expired:', now > decoded.exp ? 'YES' : 'NO');
  
  console.log('\n💡 Note: The JWT token does not contain the user name!');
  console.log('The frontend needs to get the name from the login response user object, not from the JWT token.');
  
} catch (error) {
  console.error('Error decoding token:', error.message);
}

// Check what parseJwt function would return
const parseJwt = (token) => {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (e) {
    return null;
  }
};

console.log('\n🔧 What parseJwt would return:');
const parsed = parseJwt(testToken);
console.log(JSON.stringify(parsed, null, 2));
console.log('Name field available:', parsed?.name ? 'YES' : 'NO');