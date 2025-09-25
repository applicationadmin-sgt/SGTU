const axios = require('axios');

async function testAnnouncementEndpointDirectly() {
  try {
    console.log('🧪 Testing announcement endpoint with debugging...\n');
    
    // Test with admin credentials
    console.log('Logging in as admin...');
    const adminLogin = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'vishumam@gmail.com',
      password: '123456'
    });
    
    console.log('✅ Admin login successful');
    const adminToken = adminLogin.data.token;
    console.log('Token (first 20 chars):', adminToken.substring(0, 20) + '...');
    
    // Add detailed logging to see what's happening
    console.log('\n📡 Making request to /api/announcements...');
    
    const response = await axios.get('http://localhost:5000/api/announcements', {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('✅ Response received');
    console.log('Status:', response.status);
    console.log('Headers Content-Type:', response.headers['content-type']);
    console.log('Response data keys:', Object.keys(response.data));
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
    // Test if the server is actually running our updated code
    console.log('\n🔍 Testing if the server has our fix...');
    
    // Let's make a request with a malformed token to see error handling
    try {
      await axios.get('http://localhost:5000/api/announcements', {
        headers: {
          'Authorization': `Bearer invalid-token`,
          'Content-Type': 'application/json'
        }
      });
    } catch (authError) {
      console.log('Auth error status:', authError.response?.status);
      console.log('Auth error message:', authError.response?.data?.message);
    }
    
  } catch (error) {
    console.error('❌ Error testing endpoint:');
    console.error('Status:', error.response?.status);
    console.error('Status Text:', error.response?.statusText);
    console.error('Error Message:', error.response?.data?.message || error.message);
    console.error('Error Data:', error.response?.data);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('🔴 Server is not running on port 5000');
    }
  }
}

testAnnouncementEndpointDirectly();