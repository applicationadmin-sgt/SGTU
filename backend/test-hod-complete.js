const axios = require('axios');

async function testCompleteHODWorkflow() {
  try {
    console.log('🔍 Testing Complete HOD Dashboard Workflow...\n');
    
    // Test 1: Login as HOD
    console.log('1. Testing HOD login...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: '123@gmail.com',
      password: '123456'
    });
    
    if (!loginResponse.data.token) {
      console.log('❌ HOD login failed - no token received');
      return;
    }
    
    console.log('✅ HOD login successful');
    const token = loginResponse.data.token;
    const authHeaders = { Authorization: `Bearer ${token}` };
    
    // Test 2: Check user role
    console.log('\n2. Verifying HOD role...');
    try {
      const profileResponse = await axios.get('http://localhost:5000/api/auth/me', {
        headers: authHeaders
      });
      console.log(`✅ User role: ${profileResponse.data.role}`);
      console.log(`   Department: ${profileResponse.data.department || 'Not assigned'}`);
    } catch (error) {
      console.log('❌ Profile check failed:', error.response?.data?.message || error.message);
    }
    
    // Test 3: Test HOD dashboard endpoint
    console.log('\n3. Testing HOD dashboard...');
    try {
      const dashboardResponse = await axios.get('http://localhost:5000/api/hod/dashboard', {
        headers: authHeaders
      });
      console.log('✅ HOD dashboard endpoint working');
      console.log('   Dashboard data keys:', Object.keys(dashboardResponse.data));
    } catch (error) {
      console.log('❌ HOD dashboard failed:', error.response?.status, error.response?.data?.message || error.message);
    }
    
    // Test 4: Test pending announcements (multiple endpoints)
    console.log('\n4. Testing pending announcements endpoints...');
    
    // Try HOD-specific endpoint
    try {
      const pendingHOD = await axios.get('http://localhost:5000/api/hod/announcements/pending', {
        headers: authHeaders
      });
      console.log('✅ HOD pending announcements working');
      console.log(`   Pending count: ${pendingHOD.data.announcements?.length || pendingHOD.data.length || 0}`);
    } catch (error) {
      console.log('❌ HOD pending announcements failed:', error.response?.status, error.response?.data?.message || error.message);
    }
    
    // Try general pending endpoint
    try {
      const pendingGeneral = await axios.get('http://localhost:5000/api/announcements/pending-approvals', {
        headers: authHeaders
      });
      console.log('✅ General pending announcements working');
      console.log(`   Pending count: ${pendingGeneral.data.announcements?.length || 0}`);
    } catch (error) {
      console.log('❌ General pending announcements failed:', error.response?.status, error.response?.data?.message || error.message);
    }
    
    // Test 5: Test approval history
    console.log('\n5. Testing approval history...');
    try {
      const historyResponse = await axios.get('http://localhost:5000/api/hod/announcements/history', {
        headers: authHeaders
      });
      console.log('✅ Approval history endpoint working');
      console.log(`   History count: ${historyResponse.data.announcements?.length || 0}`);
    } catch (error) {
      console.log('❌ Approval history failed:', error.response?.status, error.response?.data?.message || error.message);
    }
    
    // Test 6: Test announcement creation
    console.log('\n6. Testing HOD announcement creation...');
    try {
      const createResponse = await axios.post('http://localhost:5000/api/announcements', {
        title: 'Test HOD Announcement',
        message: 'This is a test announcement from HOD to verify the creation flow.',
        priority: 'normal',
        targetAudience: {
          targetRoles: ['teacher', 'student']
        }
      }, { headers: authHeaders });
      console.log('✅ HOD announcement creation working');
      console.log(`   Created announcement ID: ${createResponse.data.announcement?._id}`);
    } catch (error) {
      console.log('❌ HOD announcement creation failed:', error.response?.status, error.response?.data?.message || error.message);
    }
    
    // Test 7: Test announcement targeting options
    console.log('\n7. Testing targeting options...');
    try {
      const optionsResponse = await axios.get('http://localhost:5000/api/announcements/targeting-options', {
        headers: authHeaders
      });
      console.log('✅ Targeting options working');
      console.log('   Available options:', Object.keys(optionsResponse.data));
    } catch (error) {
      console.log('❌ Targeting options failed:', error.response?.status, error.response?.data?.message || error.message);
    }
    
    // Test 8: Test getting all announcements
    console.log('\n8. Testing get announcements...');
    try {
      const announcementsResponse = await axios.get('http://localhost:5000/api/announcements', {
        headers: authHeaders
      });
      console.log('✅ Get announcements working');
      console.log(`   Total announcements: ${announcementsResponse.data.announcements?.length || 0}`);
    } catch (error) {
      console.log('❌ Get announcements failed:', error.response?.status, error.response?.data?.message || error.message);
    }
    
    console.log('\n🏁 HOD Dashboard Test Complete!');
    
  } catch (error) {
    console.log('💥 Test failed with error:', error.message);
  }
}

testCompleteHODWorkflow();