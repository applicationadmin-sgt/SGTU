const axios = require('axios');

async function testAnnouncement() {
  try {
    console.log('Logging in as admin...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'sourav11092002@gmail.com',
      password: 'Admin@1234'
    });
    
    console.log('Login successful, got token');
    const token = loginResponse.data.token;
    
    console.log('Creating simple announcement...');
    const announcementData = {
      title: 'Test Title',
      message: 'Test announcement message with HOD and Dean recipients',
      recipients: ['teacher', 'student', 'hod', 'dean']
    };
    
    console.log('Sending data:', announcementData);
    const createResponse = await axios.post('http://localhost:5000/api/admin/announcement', 
      announcementData, 
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Success! Response:', createResponse.data);
    
  } catch (error) {
    console.error('Error testing announcement creation:');
    console.error('Status:', error.response?.status);
    console.error('Status Text:', error.response?.statusText);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
  }
}

testAnnouncement();