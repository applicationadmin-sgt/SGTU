// Simple test script to verify resume functionality
const axios = require('axios');

const testResumeEndpoint = async () => {
  try {
    // Replace these with actual values
    const token = 'your-jwt-token-here';
    const videoId = 'your-video-id-here';
    
    console.log('Testing resume endpoint...');
    
    const response = await axios.get(`http://localhost:5000/api/student/video/${videoId}/resume-position`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Resume endpoint response:', response.data);
    
    if (response.data.hasResumePosition) {
      console.log(`✅ Resume functionality working - Position: ${response.data.currentPosition}s`);
    } else {
      console.log(`ℹ️ No resume position found`);
    }
    
  } catch (error) {
    console.error('❌ Error testing resume endpoint:', error.response?.data || error.message);
  }
};

testResumeEndpoint();