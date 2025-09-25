const axios = require('axios');

async function testStudentSectionEndpoint() {
  try {
    console.log('🧪 Testing student section endpoint...\n');
    
    // Login as a student
    console.log('Logging in as a student...');
    
    // Try to find a valid student credential from the database first
    // Let's use the student we saw in the screenshot: "Surjo" who seems to be logged in
    
    // First, let's try with a known admin to get student info
    const adminLogin = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'vishumam@gmail.com',
      password: '123456'
    });
    
    console.log('✅ Admin login successful');
    const adminToken = adminLogin.data.token;
    
    // Now let's try to test the student section endpoint with a known student ID
    // From previous database queries, we saw student ID: 68bec3f9c1a9d9ac3fa6a3ec (Dipanwita)
    const studentId = '68bec3f9c1a9d9ac3fa6a3ec';
    
    console.log(`🧑‍🎓 Testing student section endpoint for student ID: ${studentId}`);
    
    const response = await axios.get(`http://localhost:5000/api/sections/student/${studentId}`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Student section response received');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error testing student section endpoint:');
    console.error('Status:', error.response?.status);
    console.error('Message:', error.response?.data?.message);
    console.error('Error details:', error.response?.data);
    
    if (error.response?.status === 404) {
      console.log('\n🔍 Student is not assigned to any section - this is the issue!');
    }
  }
}

testStudentSectionEndpoint();