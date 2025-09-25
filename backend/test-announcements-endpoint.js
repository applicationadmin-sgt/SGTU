const axios = require('axios');

async function testStudentAnnouncements() {
  try {
    console.log('Testing student announcements endpoint...');
    
    // First login as student (from the screenshot I can see the user is "Surjo" with role "STUDENT")
    // Let me try to find a student login first
    console.log('Looking for a student login...');
    
    // Try the user from the screenshot - they seem to be logged in already
    // Let me test with a known admin first to see if the endpoint works
    console.log('Testing with admin credentials first...');
    const adminLogin = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'vishumam@gmail.com',
      password: '123456'
    });
    
    console.log('Admin login successful');
    const adminToken = adminLogin.data.token;
    
    // Test admin announcements
    const adminResponse = await axios.get('http://localhost:5000/api/announcements', {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Admin announcements response:');
    console.log('Status:', adminResponse.status);
    console.log('Data structure:', {
      hasAnnouncements: !!adminResponse.data.announcements,
      announcementsCount: adminResponse.data.announcements?.length || 0,
      hasPagination: !!adminResponse.data.pagination,
      rawDataKeys: Object.keys(adminResponse.data)
    });
    
    if (adminResponse.data.announcements && adminResponse.data.announcements.length > 0) {
      console.log('Sample announcement:');
      const sample = adminResponse.data.announcements[0];
      console.log({
        id: sample._id,
        title: sample.title,
        message: sample.message?.substring(0, 100) + '...',
        sender: sample.sender?.name,
        targetAudience: sample.targetAudience,
        approvalStatus: sample.approvalStatus,
        createdAt: sample.createdAt
      });
    }
    
  } catch (error) {
    console.error('Error testing announcements:');
    console.error('Status:', error.response?.status);
    console.error('Message:', error.response?.data?.message);
    console.error('Error details:', error.response?.data);
    console.error('Full error:', error.message);
  }
}

testStudentAnnouncements();