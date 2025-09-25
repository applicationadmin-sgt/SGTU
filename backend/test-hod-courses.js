const axios = require('axios');

async function testHODCoursesEndpoint() {
  try {
    console.log('Testing HOD Courses Endpoint...');
    
    // Login as HOD
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: '123@gmail.com',
      password: '123456'
    });
    
    const token = loginResponse.data.token;
    console.log('HOD login successful');
    
    // Test courses endpoint
    const coursesResponse = await axios.get('http://localhost:5000/api/hod/courses', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('\n=== HOD Courses Response ===');
    console.log('Department:', coursesResponse.data.department?.name);
    console.log('Number of courses:', coursesResponse.data.courses?.length || 0);
    
    if (coursesResponse.data.courses && coursesResponse.data.courses.length > 0) {
      console.log('\n=== Course Details ===');
      coursesResponse.data.courses.forEach((course, index) => {
        console.log(`${index + 1}. ${course.title} (${course.courseCode})`);
        console.log(`   Teachers: ${course.teacherCount || 0} assigned`);
        console.log(`   Students: ${course.studentCount || 0} enrolled`);
        console.log(`   Videos: ${course.videoCount || 0} available`);
        if (course.assignedTeachers && course.assignedTeachers.length > 0) {
          console.log(`   Teacher names: ${course.assignedTeachers.map(t => t.name).join(', ')}`);
        }
        console.log('');
      });
    } else {
      console.log('No courses found');
    }

  } catch (error) {
    console.error('Test error:', error.response?.data || error.message);
  }
}

testHODCoursesEndpoint();