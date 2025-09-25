const axios = require('axios');

// Test the student courses API directly
async function testStudentAPI() {
  try {
    console.log('Testing student courses API...');
    
    // Token for dipanwitaku7ndu02@gmail.com (student ID: 68c4a8d816393144de08b99b)
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2OGM0YThkODE2MzkzMTQ0ZGUwOGI5OWIiLCJpZCI6IjY4YzRhOGQ4MTYzOTMxNDRkZTA4Yjk5YiIsImVtYWlsIjoiZGlwYW53aXRha3U3bmR1MDJAZ21haWwuY29tIiwicm9sZSI6InN0dWRlbnQiLCJpYXQiOjE3NTc3MjgxNTUsImV4cCI6MTc1NzgxNDU1NX0.x8ur-QMPn4kBvrxsLoe5UyLEUOO-N6SEUnGEdY330jg';
    
    if (!token) {
      console.log('❌ No token provided');
      return;
    }
    
    const response = await axios.get('http://localhost:5000/api/student/courses', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ API Response Status:', response.status);
    console.log('✅ API Response Data:', JSON.stringify(response.data, null, 2));
    console.log('Number of courses returned:', response.data.length);
    
  } catch (error) {
    if (error.response) {
      console.error('❌ API Error:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('❌ No response received:', error.code || error.message);
    } else {
      console.error('❌ Request Error:', error.message);
    }
    console.error('Full error details:', error);
  }
}

console.log('📝 To test the API:');
console.log('1. Go to browser dev tools (F12)');
console.log('2. Application tab > Local Storage > http://localhost:3001');
console.log('3. Copy the "token" value');
console.log('4. Replace YOUR_JWT_TOKEN_HERE in this file with that token');
console.log('5. Run: node test-student-api.js');
console.log('');

testStudentAPI();