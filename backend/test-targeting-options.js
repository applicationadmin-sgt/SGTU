const axios = require('axios');

async function testTargetingOptions() {
  try {
    console.log('Testing targeting options API...');
    
    // Test without auth first to see the error
    const response = await axios.get('http://localhost:5000/api/announcements/targeting-options');
    
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('Error status:', error.response?.status);
    console.log('Error message:', error.response?.data?.message || error.message);
    console.log('Error details:', error.response?.data);
  }
}

testTargetingOptions();