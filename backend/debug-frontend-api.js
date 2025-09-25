const axios = require('axios');

const BASE_URL = 'http://localhost:3000'; // Frontend URL
const API_BASE_URL = 'http://localhost:5000/api'; // Backend API URL

async function testStudentDashboardAPI() {
  try {
    console.log('� Testing student login and deadline warnings...');
    
    // First login to get token
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'titli@gmail.com',
      password: '123456'
    });

    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    console.log('Token (first 50 chars):', token.substring(0, 50) + '...');

    // Test the API call that the frontend makes
    console.log('\n🎯 Testing deadline warnings API...');
    const response = await axios.get(`${API_BASE_URL}/student/deadline-warnings`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('\n📋 Response Status:', response.status);
    console.log('� Response Headers:', response.headers['content-type']);
    console.log('\n📋 Full API Response:');
    console.log(JSON.stringify(response.data, null, 2));

    // Also check user info
    console.log('\n� Testing user info...');
    const userResponse = await axios.get(`${API_BASE_URL}/auth/user`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('User info:', {
      name: userResponse.data.name,
      email: userResponse.data.email,
      role: userResponse.data.role,
      id: userResponse.data._id
    });

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    }
  }
}

testStudentDashboardAPI();