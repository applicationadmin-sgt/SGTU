// Test announcement creation with new HOD and Dean recipients
const axios = require('axios');

async function testAnnouncementCreation() {
  try {
    // First, login as admin to get token
    console.log('Logging in as admin...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'sourav11092002@gmail.com',
      password: 'Admin@1234'
    });
    
    const token = loginResponse.data.token;
    console.log('Login successful, got token');
    
    // Test creating announcement with all recipient types
    console.log('Creating announcement with all recipients...');
    const announcementResponse = await axios.post('http://localhost:5000/api/admin/announcement', {
      message: 'Test announcement for all recipients including HODs and Deans',
      recipients: ['teacher', 'student', 'hod', 'dean']
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Announcement created successfully:', announcementResponse.data);
    
  } catch (error) {
    console.error('Error testing announcement creation:');
    console.error('Status:', error.response?.status);
    console.error('Status Text:', error.response?.statusText);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
  }
}

testAnnouncementCreation();