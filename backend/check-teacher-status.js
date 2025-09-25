const axios = require('axios');

async function checkTeacherStatus() {
  try {
    console.log('Checking teacher permission status...');
    
    // Login as the teacher
    console.log('Logging in as teacher...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'dipanwitakund1u02@gmail.com',
      password: '123456'
    });
    
    const token = loginResponse.data.token;
    console.log('Teacher login successful');
    console.log('User data from login:', loginResponse.data.user);
    
    // Check teacher announcement permission using the correct route
    console.log('\nChecking announcement permission...');
    const permissionResponse = await axios.get(`http://localhost:5000/api/teacher/${loginResponse.data.user.id}/can-announce`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('Announcement permission response:', permissionResponse.data);
    
    // Check teacher courses
    console.log('\nGetting teacher courses...');
    try {
      const coursesResponse = await axios.get('http://localhost:5000/api/teacher/courses', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('Teacher courses:', coursesResponse.data.length, 'courses found');
      coursesResponse.data.forEach((course, index) => {
        console.log(`${index + 1}. ${course.title} (${course.courseCode})`);
      });
    } catch (coursesError) {
      console.log('Error getting courses:', coursesError.response?.data?.message || coursesError.message);
    }
    
    if (permissionResponse.data.canAnnounce) {
      console.log('\n✅ Teacher has announcement permission!');
      console.log('The issue might be frontend caching. Try:');
      console.log('1. Hard refresh the page (Ctrl+F5)');
      console.log('2. Clear browser cache');
      console.log('3. Log out and log back in');
    } else {
      console.log('\n❌ Teacher still does not have announcement permission');
      console.log('The database update may not have worked properly');
    }
    
  } catch (error) {
    console.error('Error checking teacher status:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
  }
}

checkTeacherStatus();