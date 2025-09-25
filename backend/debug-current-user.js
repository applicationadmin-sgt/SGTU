const axios = require('axios');

async function debugCurrentUser() {
  try {
    console.log('🔍 Testing current logged-in user...\n');
    
    // Step 1: Login first
    console.log('🔑 Logging in...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: '1109sourav@gmail.com',
      password: 'password123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    
    // Step 2: Get user profile to check user info
    console.log('\n👤 Getting user profile...');
    const profileResponse = await axios.get('http://localhost:5000/api/teacher/profile', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const profile = profileResponse.data;
    
    console.log('📊 Current User Info:');
    console.log(`   Name: ${profile.personalInfo?.name || 'undefined'}`);
    console.log(`   Email: ${profile.personalInfo?.email || 'undefined'}`);
    console.log(`   Teacher ID: ${profile.personalInfo?.teacherId || 'undefined'}`);
    
    console.log('\n📊 Statistics from API:');
    console.log(`   Total Sections: ${profile.statistics?.totalSections || 0}`);
    console.log(`   Direct Students: ${profile.statistics?.directStudents || 0}`);
    console.log(`   Coordinated Students: ${profile.statistics?.coordinatedStudents || 0}`);
    console.log(`   Coordinated Courses: ${profile.statistics?.coordinatedCoursesCount || 0}`);
    
    console.log('\n📚 Assigned Sections:');
    if (profile.assignedSections && profile.assignedSections.length > 0) {
      profile.assignedSections.forEach((section, i) => {
        console.log(`   ${i + 1}. ${section.name} - ${section.studentCount} students, ${section.courseCount} courses`);
      });
    } else {
      console.log('   No assigned sections found');
    }
    
    console.log('\n🎓 Coordinated Courses:');
    if (profile.coordinatedCourses && profile.coordinatedCourses.length > 0) {
      profile.coordinatedCourses.forEach((course, i) => {
        console.log(`   ${i + 1}. ${course.title} (${course.courseCode}) - ${course.sectionsCount} sections, ${course.studentsCount} students`);
      });
    } else {
      console.log('   No coordinated courses found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

debugCurrentUser();