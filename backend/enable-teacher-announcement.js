const axios = require('axios');

async function enableTeacherAnnouncement() {
  try {
    // Login as admin
    console.log('Logging in as admin...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'sourav11092002@gmail.com',
      password: 'Admin@1234'
    });
    
    const token = loginResponse.data.token;
    console.log('Login successful');
    
    // First, get list of teachers
    console.log('Getting teachers list...');
    const teachersResponse = await axios.get('http://localhost:5000/api/admin/teachers', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('Available teachers:');
    teachersResponse.data.forEach((teacher, index) => {
      console.log(`${index + 1}. ${teacher.name} (${teacher.email}) - canAnnounce: ${teacher.canAnnounce}`);
    });
    
    // Find the specific teacher
    const teacher = teachersResponse.data.find(t => t.email === 'dipanwitakund1u02@gmail.com');
    if (!teacher) {
      console.log('Teacher with email dipanwitakund1u02@gmail.com not found');
      return;
    }
    
    console.log(`\nEnabling announcement permission for ${teacher.name} (${teacher.email})...`);
    
    const updateResponse = await axios.patch(
      `http://localhost:5000/api/admin/teacher/${teacher._id}/announce-permission`,
      { canAnnounce: true },
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    
    console.log('Success:', updateResponse.data.message);
    console.log(`\nTeacher ${teacher.name} can now create announcements!`);
    console.log('Login credentials for testing:');
    console.log('Email:', teacher.email);
    console.log('You can now test the announcement workflow at http://localhost:3000/teacher/announcements');
    
  } catch (error) {
    console.error('Error enabling teacher announcement:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
  }
}

enableTeacherAnnouncement();