const axios = require('axios');

async function getTeacherSectionsData() {
  try {
    // Login as teacher
    console.log('Logging in as teacher...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'dipanwitakund1u02@gmail.com',
      password: '123456'
    });
    
    const token = loginResponse.data.token;
    console.log('Teacher login successful');
    
    // Get teacher courses
    console.log('\nGetting teacher courses...');
    const coursesResponse = await axios.get('http://localhost:5000/api/teacher/courses', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('Teacher courses:');
    coursesResponse.data.forEach((course, index) => {
      console.log(`${index + 1}. ${course.title} (${course.courseCode}) - ID: ${course._id}`);
    });
    
    // Get teacher sections
    console.log('\nGetting teacher sections...');
    try {
      const sectionsResponse = await axios.get('http://localhost:5000/api/teacher/sections', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log('Teacher sections:');
      sectionsResponse.data.forEach((section, index) => {
        console.log(`${index + 1}. Section: ${section.name} (${section.department})`);
        console.log(`   Students: ${section.studentCount}`);
        console.log(`   Courses: ${section.courses.map(c => `${c.title} (${c.courseCode})`).join(', ')}`);
        console.log(`   Section ID: ${section._id}`);
        console.log('');
      });
      
    } catch (sectionsError) {
      console.log('Error getting sections:', sectionsError.response?.data?.message || sectionsError.message);
      console.log('Sections API might not exist, will need to get sections differently');
    }
    
    // Check what announcement creation expects
    console.log('\nChecking what the current announcement API expects...');
    console.log('Current API endpoint: POST /api/teacher/course/:courseId/announcement');
    console.log('This suggests announcements are course-specific, not section-specific');
    
  } catch (error) {
    console.error('Error getting teacher data:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
  }
}

getTeacherSectionsData();