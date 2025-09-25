const axios = require('axios');

async function testCCTeacher() {
  try {
    console.log('🔍 Testing with CC teacher account (1109sourav@gmail.com)...\n');
    
    // Login as Mukherjee Sourav - CC teacher
    console.log('1. Logging in as Mukherjee Sourav (1109sourav@gmail.com)...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: '1109sourav@gmail.com',
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
    console.log('Direct Students:', profileResponse.data.statistics?.directStudents);
    console.log('Coordinated Students:', profileResponse.data.statistics?.coordinatedStudents);
    console.log('Coordinated Courses Count:', profileResponse.data.statistics?.coordinatedCoursesCount);
    
    console.log('\n📚 Assigned Sections:');
    if (profileResponse.data.assignedSections && profileResponse.data.assignedSections.length > 0) {
      profileResponse.data.assignedSections.forEach((section, index) => {
        console.log(`   ${index + 1}. ${section.name} - ${section.studentCount} students, ${section.courseCount} courses`);
      });
    } else {
      console.log('   No sections found');
    }
    
    console.log('\n🎓 Coordinated Courses (CC):');
    if (profileResponse.data.coordinatedCourses && profileResponse.data.coordinatedCourses.length > 0) {
      profileResponse.data.coordinatedCourses.forEach((course, index) => {
        console.log(`   ${index + 1}. ${course.title} (${course.courseCode}) - Quiz Review Role`);
      });
    } else {
      console.log('   No coordinated courses found');
    }
    
    // Also check personal info
    console.log('\n👤 Personal Info:');
    console.log('Name:', profileResponse.data.personalInfo?.name);
    console.log('Email:', profileResponse.data.personalInfo?.email);
    console.log('Teacher ID:', profileResponse.data.personalInfo?.teacherId);
    console.log('Can Announce:', profileResponse.data.personalInfo?.canAnnounce);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      console.log('\n💡 This might be an authentication error. Let me try with different credentials or check if the user exists.');
    }
  }
}

testCCTeacher();