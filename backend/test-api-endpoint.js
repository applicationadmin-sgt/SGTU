const axios = require('axios');

async function testAPI() {
  try {
    console.log('🔄 Testing the API endpoint...');
    
    // Test the API endpoint (without auth for now since it's a test)
    const response = await axios.get('http://localhost:5000/api/hierarchy/teachers-by-department/68d10da16ba964074dd63cfd', {
      // Skip auth for this test - you can add proper token if needed
      validateStatus: function (status) {
        return status < 500; // Accept any status except server errors
      }
    });
    
    console.log('📊 API Response:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ API Error:', error.response?.data || error.message);
  }
}

testAPI();