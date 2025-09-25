const axios = require('axios');

async function testAssignment() {
  try {
    console.log('🔐 Getting admin token...');
    
    // Login as admin first
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'sourav11092002@gmail.com',
      password: 'Admin@1234'
    });
    
    if (!loginResponse.data.token) {
      console.log('❌ Failed to get token');
      return;
    }
    
    const token = loginResponse.data.token;
    console.log('✅ Got token successfully');
    
    // Test the assignment API call
    const sectionId = '68cc16755ba20b247c9d5909'; // As001
    const courseId = '68cbcc904eb37fd405cae0c2';   // AstroChemistry
    const teacherId = '68cba9bcaf91a41ca93194bf';  // Megha
    
    console.log('\n📝 Testing assignment:');
    console.log(`   Section: ${sectionId}`);
    console.log(`   Course: ${courseId}`);
    console.log(`   Teacher: ${teacherId}`);
    
    const assignmentResponse = await axios.post(
      `http://localhost:5000/api/sections/${sectionId}/assign-course-teacher`,
      {
        courseId: courseId,
        teacherId: teacherId
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('\n✅ Assignment successful!');
    console.log('Response:', assignmentResponse.data);
    
  } catch (error) {
    console.log('\n❌ Assignment failed!');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Error:', error.response.data);
    } else {
      console.log('Error:', error.message);
    }
  }
}

testAssignment();