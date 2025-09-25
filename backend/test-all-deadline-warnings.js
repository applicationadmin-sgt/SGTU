const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testGetAllDeadlineWarnings() {
  try {
    // First login to get token
    console.log('🔐 Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'titli@gmail.com',
      password: '123456'
    });

    const token = loginResponse.data.token;
    console.log('✅ Login successful, token received');

    // Test getAllDeadlineWarnings
    console.log('\n🚨 Testing getAllDeadlineWarnings...');
    const response = await axios.get(`${BASE_URL}/student/deadline-warnings`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('\n📋 API Response:');
    console.log(JSON.stringify(response.data, null, 2));

    // Also test the course-specific one for comparison
    console.log('\n🔍 Testing course-specific deadline warnings for comparison...');
    const courseResponse = await axios.get(`${BASE_URL}/student/course/68cba8b0af91a41ca931936b/deadline-warnings`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('\n📋 Course-specific Response:');
    console.log(JSON.stringify(courseResponse.data, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testGetAllDeadlineWarnings();