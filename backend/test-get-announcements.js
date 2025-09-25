const axios = require('axios');

async function testGetAnnouncements() {
  try {
    console.log('Logging in as admin...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'sourav11092002@gmail.com',
      password: 'Admin@1234'
    });
    
    console.log('Login successful, getting announcements...');
    const token = loginResponse.data.token;
    
    const getResponse = await axios.get('http://localhost:5000/api/admin/announcement', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Announcements retrieved:');
    console.log('Response data:', getResponse.data);
    
    const announcements = getResponse.data.announcements || getResponse.data;
    if (Array.isArray(announcements)) {
      console.log('Total count:', announcements.length);
      announcements.forEach((announcement, index) => {
        console.log(`\n${index + 1}. Title: ${announcement.title}`);
        console.log(`   Message: ${announcement.message}`);
        console.log(`   Recipients: ${announcement.recipients}`);
        console.log(`   Created: ${new Date(announcement.createdAt).toLocaleString()}`);
      });
    } else {
      console.log('Announcements data is not an array:', announcements);
    }
    
  } catch (error) {
    console.error('Error getting announcements:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
  }
}

testGetAnnouncements();