const axios = require('axios');

async function testStudentDeadlineWarnings() {
  try {
    console.log('🧪 Testing Student Deadline Warnings');
    console.log('====================================');

    // Step 1: Login as admin to add deadline
    console.log('🔐 Step 1: Login as admin...');
    const adminLoginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'sourav11092002@gmail.com',
      password: 'Admin@1234'
    });
    
    const adminToken = adminLoginResponse.data.token;
    console.log('✅ Admin login successful');

    // Step 2: Add deadline to a unit in course C000011 (Astrophysics)
    console.log('\n📝 Step 2: Add deadline to unit in Astrophysics course...');
    
    // First get units for course C000011
    const coursesResponse = await axios.get('http://localhost:5000/api/admin/courses', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    const astrophysicsCourse = coursesResponse.data.find(c => c.courseCode === 'C000011');
    if (!astrophysicsCourse) {
      console.log('❌ Astrophysics course (C000011) not found');
      return;
    }
    
    console.log('📚 Found course:', astrophysicsCourse.title, 'ID:', astrophysicsCourse._id);
    
    const unitsResponse = await axios.get(`http://localhost:5000/api/admin/course/${astrophysicsCourse._id}/units`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    if (unitsResponse.data.length === 0) {
      console.log('❌ No units found in Astrophysics course');
      return;
    }
    
    const unitId = unitsResponse.data[0]._id;
    console.log('📝 Using unit:', unitsResponse.data[0].title, 'ID:', unitId);
    
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

    // Step 3: Login as student to test warnings
    console.log('\n👨‍🎓 Step 3: Login as student...');
    
    // Use the provided student credentials
    console.log('📚 Using student: titli@gmail.com');

    let studentToken = null;
    try {
      const studentLoginResponse = await axios.post('http://localhost:5000/api/auth/login', {
        email: 'titli@gmail.com',
        password: '123456'
      });
      studentToken = studentLoginResponse.data.token;
      console.log('✅ Student login successful');
    } catch (err) {
      console.log('❌ Student login failed:', err.response?.data?.message || err.message);
      return;
    }

    // Step 4: Get student deadline warnings
    console.log('\n⏰ Step 4: Get student deadline warnings...');
    try {
      const warningsResponse = await axios.get('http://localhost:5000/api/student/deadline-warnings', {
        headers: { 'Authorization': `Bearer ${studentToken}` }
      });
      
      console.log('✅ Deadline warnings retrieved successfully');
      console.log('📊 Warnings summary:', JSON.stringify(warningsResponse.data.summary, null, 2));
      
      if (warningsResponse.data.deadlineWarnings.length > 0) {
        console.log('📋 Deadline warnings:');
        warningsResponse.data.deadlineWarnings.forEach((warning, index) => {
          console.log(`  ${index + 1}. ${warning.course.title} - ${warning.unit.title}`);
          console.log(`     Deadline: ${warning.unit.deadline}`);
          console.log(`     Days remaining: ${warning.warning.daysRemaining}`);
          console.log(`     Is expired: ${warning.warning.isExpired}`);
          console.log('');
        });
      } else {
        console.log('📋 No deadline warnings found for this student');
      }
    } catch (err) {
      console.log('❌ Error getting deadline warnings:', err.response?.data?.message || err.message);
    }

    // Step 5: Clean up - remove the test deadline
    console.log('\n🗑️ Step 5: Clean up test deadline...');
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

    console.log('\n🎉 Student deadline warnings test completed!');

  } catch (error) {
    console.log('❌ Test failed:', error.message);
    console.log('Error details:', error);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Response data:', error.response.data);
    }
  }
}

testStudentDeadlineWarnings();