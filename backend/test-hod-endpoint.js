require('dotenv').config();
const axios = require('axios');

async function testHODEndpoint() {
  try {
    console.log('🔗 Testing HOD Dashboard endpoint...');
    
    // First login to get token
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'sourav1192002@gmail.com',
      password: 'Admin@123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful, token received');
    
    // Test HOD dashboard endpoint
    const dashboardResponse = await axios.get('http://localhost:5000/api/hod/dashboard', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ HOD Dashboard Response:');
    console.log(JSON.stringify(dashboardResponse.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testHODEndpoint();