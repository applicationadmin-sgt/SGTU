const axios = require('axios');

const debugHODSectionsAPI = async () => {
  try {
    console.log('🔍 Debugging HOD Sections API...\n');

    // Login as HOD
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'pawanhod@gmail.com',
      password: 'pawanhod@gmail.com'
    });

    const token = loginResponse.data.token;
    console.log('✅ HOD logged in\n');

    // Call the API and log detailed response
    const response = await axios.get('http://localhost:5000/api/hod/sections', {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('📊 Raw API Response:');
    console.log(JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.response?.data?.message || error.message);
    if (error.response?.data) {
      console.log('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
};

debugHODSectionsAPI();