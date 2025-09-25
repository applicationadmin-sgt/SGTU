const axios = require('axios');

async function testDeadlineWarningsDetailed() {
  try {
    console.log('🧪 Testing Deadline Warnings - Detailed Debug');
    console.log('==============================================');

    // Step 1: Login as admin and add deadline
    console.log('🔐 Step 1: Login as admin...');
    const adminLoginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'sourav11092002@gmail.com',
      password: 'Admin@1234'
    });
    
    const adminToken = adminLoginResponse.data.token;
    console.log('✅ Admin login successful');

    // Step 2: Add deadline to Astrophysics unit
    console.log('\n📝 Step 2: Add deadline to Astrophysics unit...');
    const unitId = '68cbacbeaf91a41ca9319e37'; // Astrophysics Unit 1
    const deadlineData = {
      hasDeadline: true,
      deadline: '2025-09-20T23:59:00', // 2 days from now
      deadlineDescription: 'Test deadline for student dashboard',
      strictDeadline: true,
      warningDays: 3,
      action: 'add'
    };

    const addDeadlineResponse = await axios.patch(`http://localhost:5000/api/admin/unit/${unitId}/deadline`, deadlineData, {
      headers: { 
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Deadline added to unit');
    console.log('Deadline details:', JSON.stringify(addDeadlineResponse.data.unit, null, 2));

    // Step 3: Login as student
    console.log('\n👨‍🎓 Step 3: Login as student...');
    const studentLoginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'titli@gmail.com',
      password: '123456'
    });
    const studentToken = studentLoginResponse.data.token;
    console.log('✅ Student login successful');

    // Step 4: Test deadline warnings with detailed logging
    console.log('\n⏰ Step 4: Get student deadline warnings (with server logs)...');
    const warningsResponse = await axios.get('http://localhost:5000/api/student/deadline-warnings', {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    
    console.log('Response:', JSON.stringify(warningsResponse.data, null, 2));

    // Step 5: Also test course-specific deadline warnings
    console.log('\n📚 Step 5: Test course-specific deadline warnings...');
    const courseId = '68cba8b0af91a41ca931936b'; // Astrophysics course ID
    const courseWarningsResponse = await axios.get(`http://localhost:5000/api/student/course/${courseId}/deadline-warnings`, {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    
    console.log('Course warnings:', JSON.stringify(courseWarningsResponse.data, null, 2));

    // Step 6: Clean up
    console.log('\n🗑️ Step 6: Clean up...');
    const removeData = {
      hasDeadline: false,
      action: 'remove'
    };

    await axios.patch(`http://localhost:5000/api/admin/unit/${unitId}/deadline`, removeData, {
      headers: { 
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Test deadline removed');

  } catch (error) {
    console.log('❌ Test failed:', error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Response data:', error.response.data);
    }
  }
}

testDeadlineWarningsDetailed();