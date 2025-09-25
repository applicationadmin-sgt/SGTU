const axios = require('axios');

async function testTeacherUnitsAPI() {
  try {
    console.log('🔐 Testing teacher units API...');
    
    // Login as a teacher/admin who can access the course
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'dipanwitakund1u02@gmail.com', // Change this to a teacher/admin email
      password: '123456'
    });

    const token = loginResponse.data.token;
    console.log('✅ Login successful');

    // Test the units API for the AstrochemistryCoure
    const courseId = '68cbcc904eb37fd405cae0c2'; // Astrochemistry course ID
    console.log('\n🎯 Testing units API for course:', courseId);
    
    const response = await axios.get(`http://localhost:5000/api/units/course/${courseId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('\n📋 Response Status:', response.status);
    console.log('\n📋 Units Response:');
    console.log(JSON.stringify(response.data, null, 2));

    // Check if any units have deadline fields
    if (response.data && response.data.length > 0) {
      response.data.forEach((unit, index) => {
        console.log(`\n📝 Unit ${index + 1}: ${unit.title}`);
        console.log('- hasDeadline:', unit.hasDeadline);
        console.log('- deadline:', unit.deadline);
        console.log('- deadlineDescription:', unit.deadlineDescription);
        console.log('- warningDays:', unit.warningDays);
        console.log('- strictDeadline:', unit.strictDeadline);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
    }
  }
}

testTeacherUnitsAPI();