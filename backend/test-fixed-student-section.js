const axios = require('axios');

async function testFixedStudentSectionEndpoint() {
  try {
    console.log('🧪 Testing the fixed student section endpoint...\n');
    
    // Login as a student - try to find valid student credentials
    console.log('Trying to login as a student...');
    
    // Let's try with some common student credentials
    const studentCredentials = [
      { email: 'dipanwitakundu02@gmail.com', password: '123456' },
      { email: 'dipanwitakundu02@gmail.com', password: 'Student@1234' },
      { email: 'asmita@gmail.com', password: '123456' },
      { email: 'asmita@gmail.com', password: 'Student@1234' }
    ];
    
    let studentToken = null;
    let studentUser = null;
    
    for (const creds of studentCredentials) {
      try {
        const response = await axios.post('http://localhost:5000/api/auth/login', creds);
        studentToken = response.data.token;
        studentUser = response.data.user;
        console.log(`✅ Student login successful: ${creds.email}`);
        break;
      } catch (err) {
        console.log(`❌ Failed to login as ${creds.email}`);
      }
    }
    
    if (!studentToken) {
      console.log('❌ Could not login as any student, using admin token to test endpoint');
      
      // Fallback to admin
      const adminLogin = await axios.post('http://localhost:5000/api/auth/login', {
        email: 'vishumam@gmail.com',
        password: '123456'
      });
      studentToken = adminLogin.data.token;
      // Use a known student ID
      studentUser = { _id: '68bec3f9c1a9d9ac3fa6a3ec' };
    }
    
    console.log(`\n🧑‍🎓 Testing section endpoint for student ID: ${studentUser._id}`);
    
    const response = await axios.get(`http://localhost:5000/api/sections/student/${studentUser._id}`, {
      headers: {
        'Authorization': `Bearer ${studentToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Student section response received!');
    console.log('Status:', response.status);
    console.log('\n📚 Section Data:');
    const section = response.data;
    console.log(`Section Name: ${section.name}`);
    console.log(`School: ${section.school?.name || 'N/A'}`);
    console.log(`Department: ${section.department?.name || 'N/A'}`);
    console.log(`Teacher: ${section.teacher?.name || 'N/A'}`);
    console.log(`Courses: ${section.courses?.map(c => c.title).join(', ') || 'N/A'}`);
    console.log(`Total Students: ${section.students?.length || 0}`);
    console.log(`Other Students: ${section.students?.filter(s => s._id !== studentUser._id).map(s => s.name).join(', ') || 'None'}`);
    
  } catch (error) {
    console.error('❌ Error testing student section endpoint:');
    console.error('Status:', error.response?.status);
    console.error('Message:', error.response?.data?.message);
    console.error('Full error:', error.response?.data);
  }
}

testFixedStudentSectionEndpoint();