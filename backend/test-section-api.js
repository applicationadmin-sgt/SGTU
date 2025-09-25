const axios = require('axios');

async function findWorkingCredentials() {
  console.log('🔍 Finding working credentials...\n');
  
  // Try admin first
  const adminCredentials = [
    { email: 'sourav11092002@gmail.com', password: 'Admin@1234' },
    { email: 'sourav11092002@gmail.com', password: 'admin123' },
    { email: 'sourav11092002@gmail.com', password: '123456' },
    { email: 'vishumam@gmail.com', password: '123456' },
  ];
  
  for (const cred of adminCredentials) {
    try {
      console.log(`🔐 Trying admin: ${cred.email} / ${cred.password}`);
      const response = await axios.post('http://localhost:5000/api/auth/login', cred);
      
      console.log('✅ Admin login successful!');
      console.log(`User: ${response.data.user.name} (${response.data.user.role})`);
      
      // Test section API with a known student ID
      await testSectionAPI(response.data.token, '68bec453c1a9d9ac3fa6a465');
      return;
      
    } catch (error) {
      console.log(`❌ Failed: ${error.response?.data?.message || error.message}`);
    }
  }
  
  // Try students
  const studentCredentials = [
    { email: 'dipanwitakundu02@gmail.com', password: 'student123' },
    { email: 'dipanwita2707@gmail.com', password: 'student123' },
    { email: 'asmita@gmail.com', password: 'student123' },
    { email: 'kavita@gmail.com', password: 'student123' },
  ];
  
  for (const cred of studentCredentials) {
    try {
      console.log(`🔐 Trying student: ${cred.email} / ${cred.password}`);
      const response = await axios.post('http://localhost:5000/api/auth/login', cred);
      
      console.log('✅ Student login successful!');
      console.log(`User: ${response.data.user.name} (${response.data.user.role})`);
      
      // Test section API with this student's own ID
      await testSectionAPI(response.data.token, response.data.user._id);
      return;
      
    } catch (error) {
      console.log(`❌ Failed: ${error.response?.data?.message || error.message}`);
    }
  }
}

async function testSectionAPI(token, studentId) {
  try {
    console.log(`\n🧪 Testing section API for student: ${studentId}`);
    
    const response = await axios.get(`http://localhost:5000/api/sections/student/${studentId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Section API response received!');
    console.log('Status:', response.status);
    
    // Check if response has the expected format
    console.log('\n🔍 Response format analysis:');
    console.log('- Response is object:', typeof response.data === 'object');
    console.log('- Has "section" property:', response.data.hasOwnProperty('section'));
    console.log('- Response keys:', Object.keys(response.data));
    
    if (response.data.section) {
      console.log('\n📋 Section details found:');
      console.log('- Section name:', response.data.section.name);
      console.log('- Students count:', response.data.section.students?.length);
      console.log('- Teacher:', response.data.section.teacher?.name || 'No teacher');
      console.log('- Courses count:', response.data.section.courses?.length || 0);
      
      console.log('\n🎉 SUCCESS: API returns { section: {...} } format as expected!');
    } else {
      console.log('\n⚠️  Response format issue: section property not found');
      console.log('Raw response:', JSON.stringify(response.data, null, 2));
    }
    
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('❌ Student not assigned to any section');
    } else {
      console.log('❌ API Error:', error.response?.data?.message || error.message);
      console.log('Status:', error.response?.status);
    }
  }
}

findWorkingCredentials();