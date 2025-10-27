// Test script to check filter-options endpoint
const axios = require('axios');

const testFilterOptions = async () => {
  try {
    // You'll need to replace this token with a valid teacher token
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiNjhkYTY0OTdjMzU0MjVhNGFmZjAyNGY5Iiwicm9sZSI6InRlYWNoZXIifSwiaWF0IjoxNzI4NDk4NzA3LCJleHAiOjE3Mjg1ODUxMDd9.iP8bRGzCYrmEjXFcFIayZ3QoRuBsQU5KWfzk--iLMbg';
    
    console.log('Testing filter-options endpoint...');
    
    const response = await axios.get('https://192.168.7.20:5000/api/quiz-unlock/filter-options', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      // Ignore SSL certificate issues for testing
      httpsAgent: new (require('https')).Agent({
        rejectUnauthorized: false
      })
    });
    
    console.log('Success!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
  }
};

testFilterOptions();