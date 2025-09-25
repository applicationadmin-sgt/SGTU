const axios = require('axios');

async function testSimplifiedProfile() {
  try {
    console.log('🔍 Testing simplified teacher profile logic...\n');
    
    // Login with any valid teacher credentials
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'mukherjee.sourav@gmail.com', // Try different email format
      password: 'password123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    
    // Get simplified profile
    const profileResponse = await axios.get('http://localhost:5000/api/teacher/profile', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const profile = profileResponse.data;
    
    console.log('📊 Simplified Profile Statistics:');
    console.log(`   Total Sections: ${profile.statistics?.totalSections || 0}`);
    console.log(`   Total Students: ${profile.statistics?.totalStudents || 0}`);
    console.log(`   Direct Students: ${profile.statistics?.directStudents || 0}`);
    console.log(`   Coordinated Students: ${profile.statistics?.coordinatedStudents || 0}`);
    console.log(`   CC Courses: ${profile.statistics?.coordinatedCoursesCount || 0}`);
    
    console.log('\n📚 Assigned Sections:');
    if (profile.assignedSections && profile.assignedSections.length > 0) {
      profile.assignedSections.forEach((section, i) => {
        console.log(`   ${i + 1}. ${section.name} - ${section.studentCount} students`);
      });
    } else {
      console.log('   No sections assigned');
    }
    
    console.log('\n🎓 CC Quiz Coordination:');
    if (profile.coordinatedCourses && profile.coordinatedCourses.length > 0) {
      profile.coordinatedCourses.forEach((course, i) => {
        console.log(`   ${i + 1}. ${course.title} (${course.courseCode}) - Quiz Review Role`);
      });
    } else {
      console.log('   No quiz coordination roles');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

testSimplifiedProfile();