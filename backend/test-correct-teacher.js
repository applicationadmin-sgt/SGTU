const axios = require('axios');

async function testCorrectTeacher() {
  try {
    console.log('🔍 Testing with correct teacher account...\n');
    
    // Login as the correct teacher - Dipanwita
    console.log('1. Logging in as Dipanwita (2707dipa@gmail.com)...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: '2707dipa@gmail.com',
      password: '123456'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    console.log('User data:', loginResponse.data.user);
    
    // Get profile data
    console.log('\n2. Getting teacher profile...');
    const profileResponse = await axios.get(`http://localhost:5000/api/teacher/profile`, {
      headers: { 
        Authorization: `Bearer ${token}`
      }
    });
    
    console.log('✅ Profile data received');
    console.log('\n📊 Profile Statistics:');
    console.log('Total Sections:', profileResponse.data.statistics?.totalSections);
    console.log('Total Students:', profileResponse.data.statistics?.totalStudents);
    console.log('Total Courses:', profileResponse.data.statistics?.totalCourses);
    
    console.log('\n📚 Assigned Sections:');
    if (profileResponse.data.assignedSections && profileResponse.data.assignedSections.length > 0) {
      profileResponse.data.assignedSections.forEach((section, index) => {
        console.log(`   ${index + 1}. ${section.name} - ${section.studentCount} students, ${section.courseCount} courses`);
      });
    } else {
      console.log('   No sections found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testCorrectTeacher();