const axios = require('axios');

async function testLiveClassAPI() {
  try {
    console.log('🔍 Testing Live Class API...\n');

    // Step 1: Login as student
    console.log('1️⃣ Logging in as student...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'sourav20@gmail.com',
      password: 'Admin@1234' // Assuming this is the student password
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Student logged in successfully');

    // Step 2: Test live classes endpoint
    console.log('\n2️⃣ Testing student live classes endpoint...');
    const liveClassesResponse = await axios.get(
      'http://localhost:5000/api/live-classes/student/classes',
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    console.log('✅ Live classes API response:', {
      success: liveClassesResponse.data.success,
      classCount: liveClassesResponse.data.classes?.length || 0,
      total: liveClassesResponse.data.pagination?.total || 0
    });

    if (liveClassesResponse.data.classes && liveClassesResponse.data.classes.length > 0) {
      console.log('\n📚 Found classes:');
      liveClassesResponse.data.classes.forEach((cls, index) => {
        console.log(`  ${index + 1}. ${cls.title} - ${cls.status} (${cls.scheduledAt})`);
      });
    } else {
      console.log('\n📚 No live classes found for this student');
    }

  } catch (error) {
    console.error('❌ Error testing live class API:', error.response?.data || error.message);
    if (error.response?.status) {
      console.error(`Status: ${error.response.status}`);
    }
  }
}

testLiveClassAPI();