const axios = require('axios');

async function testAPI() {
  try {
    console.log('Testing API...');
    
    // Login as admin
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'sourav11092002@gmail.com',
      password: 'Admin@1234'
    });
    
    console.log('✅ Admin login successful');
    const token = loginRes.data.token;
    const studentId = '68bec453c1a9d9ac3fa6a465';
    
    // Test section API
    const sectionRes = await axios.get(`http://localhost:5000/api/sections/student/${studentId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Section API working!');
    console.log('Response format check:');
    console.log('- Is object:', typeof sectionRes.data === 'object');
    console.log('- Has section property:', !!sectionRes.data.section);
    console.log('- Has direct _id:', !!sectionRes.data._id);
    console.log('- Section name:', sectionRes.data.name || sectionRes.data.section?.name);
    console.log('- Response keys:', Object.keys(sectionRes.data).slice(0, 5));
    
    console.log('\n✅ Backend API is working correctly!');
    
  } catch (error) {
    console.log('❌ Error:', error.response?.data?.message || error.message);
    console.log('Status:', error.response?.status);
  }
}

testAPI();