const axios = require('axios');

async function testTeacherProfile() {
  try {
    // Login as teacher
    console.log('Logging in as teacher...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'dipanwitakund1u02@gmail.com',
      password: '123456'
    });
    
    const token = loginResponse.data.token;
    console.log('Login successful');
    
    // Test profile API
    console.log('\nTesting teacher profile API...');
    const profileResponse = await axios.get('http://localhost:5000/api/teacher/profile', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('Teacher Profile Data:');
    console.log('===================');
    console.log('Name:', profileResponse.data.name);
    console.log('Email:', profileResponse.data.email);
    console.log('Teacher ID:', profileResponse.data.teacherId);
    console.log('Department:', profileResponse.data.department?.name);
    console.log('HOD:', profileResponse.data.hod?.name);
    console.log('Dean:', profileResponse.data.dean?.name);
    console.log('Sections:', profileResponse.data.sections?.length || 0);
    
    if (profileResponse.data.sections?.length > 0) {
      console.log('\nAssigned Sections:');
      profileResponse.data.sections.forEach((section, index) => {
        console.log(`${index + 1}. ${section.name} (${section.studentCount} students)`);
      });
    }
    
    console.log('\n✅ Teacher profile API is working correctly!');
    console.log('You should now be able to see the profile in the teacher dashboard.');
    
  } catch (error) {
    console.error('❌ Error testing teacher profile:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
    
    if (error.response?.status === 404) {
      console.log('\n📝 Note: The server needs to be restarted to pick up the new profile API route.');
    }
  }
}

testTeacherProfile();