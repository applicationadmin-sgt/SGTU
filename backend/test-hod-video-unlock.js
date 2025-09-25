const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function testHODLogin() {
  try {
    console.log('🔐 Testing HOD login...');
    
    // Try to login as HOD (Ritik)
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'ritik@gmail.com',
      password: 'Teacher@1234'
    });
    
    console.log('✅ HOD Login successful!');
    const token = loginResponse.data.token;
    
    // Test video unlock endpoints
    console.log('\n🎬 Testing HOD Video Unlock endpoints...\n');

    // Test 1: Get pending requests for HOD
    console.log('1. Testing GET /video-unlock/hod/pending');
    try {
      const pendingResponse = await axios.get(`${API_URL}/video-unlock/hod/pending`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log(`✅ HOD pending requests endpoint works!`);
      console.log(`   Found ${pendingResponse.data.requests?.length || 0} pending requests`);
      console.log(`   HOD manages departments:`, pendingResponse.data.hodDepartments?.map(d => d.name));
    } catch (error) {
      console.log(`❌ HOD pending requests error: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
      if (error.response?.data) {
        console.log('   Full error response:', error.response.data);
      }
    }

    // Test 2: Get video unlock statistics
    console.log('\n2. Testing GET /video-unlock/stats');
    try {
      const statsResponse = await axios.get(`${API_URL}/video-unlock/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log(`✅ Statistics endpoint works!`);
      console.log('   Stats:', JSON.stringify(statsResponse.data, null, 2));
    } catch (error) {
      console.log(`❌ Statistics error: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
    }

    // Test 3: Check if there are any video unlock requests in the database
    console.log('\n3. Checking database for existing unlock requests...');
    try {
      const allRequestsResponse = await axios.get(`${API_URL}/video-unlock/teacher/requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log(`✅ Found ${allRequestsResponse.data.requests?.length || 0} teacher requests in database`);
    } catch (error) {
      console.log(`❌ Teacher requests error: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
    }

    return token;
    
  } catch (error) {
    console.error('❌ HOD Login failed:', error.response?.data?.message || error.message);
    if (error.response?.data) {
      console.log('Full error response:', error.response.data);
    }
    return null;
  }
}

async function checkVideoUnlockSystemHealth() {
  console.log('🏥 Checking Video Unlock System Health...\n');
  
  const token = await testHODLogin();
  if (!token) {
    console.log('❌ Cannot proceed without valid token');
    return;
  }
  
  console.log('\n✅ Video unlock system authentication is working!');
  console.log('🎯 The issue might be in the frontend loading, not the backend API.');
}

// Run the health check
checkVideoUnlockSystemHealth();