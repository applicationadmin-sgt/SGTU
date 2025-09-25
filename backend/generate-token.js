const jwt = require('jsonwebtoken');
require('dotenv').config();

// Generate a fresh JWT token for Munmun
const token = jwt.sign(
  { _id: '68ca326114282465cf09c7b1', role: 'student' },
  process.env.JWT_SECRET || 'your-secret-key',
  { expiresIn: '24h' }
);

console.log('Fresh JWT Token for API testing:');
console.log(token);

// Create curl command for testing
console.log('\nTest command:');
console.log(`curl -H "Authorization: Bearer ${token}" -H "Content-Type: application/json" http://localhost:5000/api/student/course/68c8e5486a8d60601e77f327/videos`);