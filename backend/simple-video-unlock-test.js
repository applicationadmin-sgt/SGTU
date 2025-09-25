const axios = require('axios');

async function testVideoUnlockAPI() {
  try {
    console.log('🔍 Testing Video Unlock API endpoints...');
    
    // First, let's try to reach the backend
    console.log('1. Testing backend connectivity...');
    try {
      const healthCheck = await axios.get('http://localhost:5000/api/users');
      console.log('❌ Backend should reject without auth - this means it\'s running');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Backend is running (401 auth required as expected)');
      } else {
        console.log('❌ Backend connection failed:', error.message);
        return;
      }
    }

    // Test login
    console.log('\n2. Testing HOD login...');
    let token;
    try {
      const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
        email: 'ritik@gmail.com',
        password: 'Teacher@1234'
      });
      token = loginResponse.data.token;
      console.log('✅ HOD login successful');
    } catch (error) {
      console.log('❌ HOD login failed:', error.response?.data?.message || error.message);
      return;
    }

    // Test video unlock pending endpoint
    console.log('\n3. Testing video unlock pending requests endpoint...');
    try {
      const pendingResponse = await axios.get('http://localhost:5000/api/video-unlock/hod/pending', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Video unlock pending endpoint works!');
      console.log('   Response:', JSON.stringify(pendingResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Video unlock pending endpoint failed:', error.response?.status, error.response?.data?.message || error.message);
      if (error.response?.data) {
        console.log('   Full error:', JSON.stringify(error.response.data, null, 2));
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testVideoUnlockAPI();