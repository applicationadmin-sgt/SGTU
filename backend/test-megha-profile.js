const axios = require('axios');

async function testTeacherProfile() {
  try {
    console.log('🔐 Getting admin token...');
    
    // Login as Megha
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'megha@gmail.com',
      password: '123456'
    });
    
    if (!loginResponse.data.token) {
      console.log('❌ Failed to get token');
      return;
    }
    
    const token = loginResponse.data.token;
    console.log('✅ Got token successfully');
    
    // Get teacher profile
    console.log('\n📊 Getting teacher profile...');
    const profileResponse = await axios.get(
      'http://localhost:5000/api/teacher/profile',
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const profile = profileResponse.data;
    console.log('\n👩‍🏫 Teacher Profile:');
    console.log(`Name: ${profile.personalInfo.name}`);
    console.log(`Email: ${profile.personalInfo.email}`);
    
    console.log('\n📊 Statistics:');
    console.log(`Total Sections: ${profile.statistics.totalSections}`);
    console.log(`Total Students: ${profile.statistics.totalStudents}`);
    console.log(`Total Courses: ${profile.statistics.totalCourses}`);
    
    console.log('\n🏫 Assigned Sections:');
    profile.assignedSections.forEach((section, index) => {
      console.log(`\n   Section ${index + 1}: ${section.name}`);
      console.log(`   Students: ${section.studentCount}`);
      console.log(`   Courses: ${section.courseCount}`);
      section.courses.forEach(course => {
        console.log(`     - ${course.title} (${course.courseCode})`);
      });
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

testTeacherProfile();