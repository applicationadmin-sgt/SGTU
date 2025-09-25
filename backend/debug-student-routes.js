const axios = require('axios');

// Test student routes with detailed logging
async function testStudentRoutes() {
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2OGM0YThkODE2MzkzMTQ0ZGUwOGI5OWIiLCJpZCI6IjY4YzRhOGQ4MTYzOTMxNDRkZTA4Yjk5YiIsImVtYWlsIjoiZGlwYW53aXRha3U3bmR1MDJAZ21haWwuY29tIiwicm9sZSI6InN0dWRlbnQiLCJpYXQiOjE3NTc3Mjg0MDMsImV4cCI6MTc1NzgxNDgwM30.DQP5lDFaX0RSYbZUNHd1fo8CCoZhmTggbhI8VTjWUyE';
  
  console.log('Testing various student endpoints to check routing...\n');
  
  // Test different student endpoints
  const endpoints = [
    '/api/student/courses',
    '/api/student/notifications/unread-count',
    '/api/student/quiz-attempt/test',  // Should 404 but reach backend
    '/api/student/non-existent'       // Should 404 but show which route handles it
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\n--- Testing ${endpoint} ---`);
      const response = await axios.get(`http://localhost:5000${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });
      
      console.log(`✓ Status: ${response.status}`);
      console.log(`✓ Data:`, response.data);
      
    } catch (error) {
      console.log(`✗ Status: ${error.response?.status || 'No response'}`);
      console.log(`✗ Error:`, error.response?.data || error.message);
    }
  }
}

testStudentRoutes().catch(console.error);