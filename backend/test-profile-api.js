const axios = require('axios');

async function testProfileAPI() {
  try {
    console.log('🔍 Testing actual teacher profile API...\n');
    
    // First login to get a token
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: '2707dipa@gmail.com',
      password: '123456'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful\n');
    
    // Call the teacher profile API
    const profileResponse = await axios.get('http://localhost:5000/api/teacher/profile', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const profile = profileResponse.data;
    
    console.log('📊 Teacher Profile API Response:');
    console.log('===============================');
    console.log(`Name: ${profile.teacher?.name}`);
    console.log(`Email: ${profile.teacher?.email}`);
    console.log(`Department: ${profile.department?.name}`);
    console.log(`\n📈 Statistics:`);
    console.log(`Total Sections: ${profile.statistics?.totalSections}`);
    console.log(`Total Students: ${profile.statistics?.totalStudents}`);
    console.log(`Total Courses: ${profile.statistics?.totalCourses}`);
    console.log(`Direct Students: ${profile.statistics?.directStudents}`);
    console.log(`Coordinated Students: ${profile.statistics?.coordinatedStudents}`);
    console.log(`Coordinated Courses Count: ${profile.statistics?.coordinatedCoursesCount}`);
    
    console.log(`\n📚 Assigned Sections (${profile.assignedSections?.length || 0}):`);
    if (profile.assignedSections && profile.assignedSections.length > 0) {
      profile.assignedSections.forEach((section, index) => {
        console.log(`   ${index + 1}. ${section.name} - ${section.studentCount} students, ${section.courseCount} courses`);
      });
    } else {
      console.log('   No sections found in API response');
    }
    
    console.log(`\n🎓 Coordinated Courses (${profile.coordinatedCourses?.length || 0}):`);
    if (profile.coordinatedCourses && profile.coordinatedCourses.length > 0) {
      profile.coordinatedCourses.forEach((course, index) => {
        console.log(`   ${index + 1}. ${course.title} (${course.courseCode}) - ${course.studentsCount} students`);
      });
    } else {
      console.log('   No coordinated courses found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testProfileAPI();