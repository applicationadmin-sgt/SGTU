const axios = require('axios');

async function testMeghaCoursesViaAdmin() {
  try {
    console.log('🔐 Logging in as Admin...');
    
    // Login as admin
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'sourav11092002@gmail.com',
      password: 'Admin@1234'
    });
    
    if (!loginResponse.data.token) {
      console.log('❌ Failed to get token');
      return;
    }
    
    const token = loginResponse.data.token;
    console.log('✅ Got admin token successfully');
    
    // Get Megha's teacher assignments directly via API
    console.log('\n📚 Getting Megha teacher assignments...');
    const assignmentsResponse = await axios.get('http://localhost:5000/api/sections/teacher/68cba9bcaf91a41ca93194bf/assignments', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Teacher assignments retrieved successfully');
    console.log(`📊 Total assignments: ${assignmentsResponse.data.length}`);
    
    assignmentsResponse.data.forEach((assignment, index) => {
      console.log(`\n   Assignment ${index + 1}:`);
      console.log(`   - Section: ${assignment.section?.name}`);
      console.log(`   - Course: ${assignment.course?.title} (${assignment.course?.courseCode})`);
      console.log(`   - Assigned at: ${assignment.assignedAt}`);
    });
    
  } catch (error) {
    console.log('\n❌ Test failed!');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Error:', error.response.data);
    } else {
      console.log('Error:', error.message);
    }
  }
}

testMeghaCoursesViaAdmin();