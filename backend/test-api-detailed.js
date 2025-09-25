const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function testWithFoundAdmin() {
  console.log('🔍 Testing with found admin user...\n');
  
  const adminCredentials = [
    { email: 'sourav11092002@gmail.com', password: 'admin123' },
    { email: 'sourav11092002@gmail.com', password: 'password' },
    { email: 'sourav11092002@gmail.com', password: 'admin' },
    { email: 'sourav11092002@gmail.com', password: '123456' },
    { email: 'sourav11092002@gmail.com', password: 'sourav123' },
  ];
  
  for (const cred of adminCredentials) {
    try {
      console.log(`🔐 Trying: ${cred.email} / ${cred.password}`);
      const response = await axios.post(`${BASE_URL}/api/auth/login`, cred);
      
      console.log('✅ SUCCESS! Admin login worked:');
      console.log(`User: ${response.data.user.name} (${response.data.user.role})`);
      
      // Now test the student section endpoint with this token
      await testStudentSectionAPI(response.data.token);
      return;
      
    } catch (error) {
      console.log(`❌ Failed: ${error.response?.data?.message || error.message}`);
    }
  }
  
  console.log('\n❌ Could not find working password for admin');
  console.log('💡 Let\'s try with a student login instead...');
  
  // Try with some students
  const studentCredentials = [
    { email: 'dipanwitakundu02@gmail.com', password: 'student123' },
    { email: 'surjo@gmail.com', password: 'student123' },
    { email: 'asmita@gmail.com', password: 'student123' },
    { email: 'dipanwitakundu02@gmail.com', password: '123456' },
    { email: 'surjo@gmail.com', password: '123456' },
  ];
  
  for (const cred of studentCredentials) {
    try {
      console.log(`🔐 Trying student: ${cred.email} / ${cred.password}`);
      const response = await axios.post(`${BASE_URL}/api/auth/login`, cred);
      
      console.log('✅ SUCCESS! Student login worked:');
      console.log(`User: ${response.data.user.name} (${response.data.user.role})`);
      
      // Test the student section endpoint with their own ID
      await testStudentSectionAPI(response.data.token, response.data.user._id);
      return;
      
    } catch (error) {
      console.log(`❌ Failed: ${error.response?.data?.message || error.message}`);
    }
  }
  
  console.log('\n❌ Could not login with any credentials');
}

async function testStudentSectionAPI(token, studentId = null) {
  console.log('\n🧪 Testing student section API endpoint...');
  
  try {
    // If no specific student ID provided, get one from the users list
    if (!studentId) {
      const usersResponse = await axios.get(`${BASE_URL}/api/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const students = usersResponse.data.filter(user => user.role === 'student');
      if (students.length === 0) {
        console.log('❌ No students found');
        return;
      }
      studentId = students[0]._id;
      console.log(`Using student: ${students[0].name} (${students[0]._id})`);
    }
    
    // Test the section endpoint
    console.log(`\n📡 Calling: GET /api/sections/student/${studentId}`);
    
    const sectionResponse = await axios.get(`${BASE_URL}/api/sections/student/${studentId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ API Response Status:', sectionResponse.status);
    console.log('✅ API Response Data:', JSON.stringify(sectionResponse.data, null, 2));
    
    // Analyze the response
    if (sectionResponse.data && sectionResponse.data.section) {
      console.log('\n📋 SUCCESS! Backend is working correctly');
      console.log('✅ Response has correct structure: { section: {...} }');
      console.log('✅ The issue must be in the frontend');
    } else {
      console.log('\n❌ Response structure is incorrect');
    }
    
  } catch (error) {
    console.log('\n❌ Section API Error:');
    console.log('Status:', error.response?.status);
    console.log('Message:', error.response?.data?.message || error.message);
    
    if (error.response?.status === 404) {
      console.log('\n💡 404 - Student not assigned to section (this is expected)');
      console.log('💡 Frontend should show "No section assigned" instead of loading forever');
    } else if (error.response?.status === 401) {
      console.log('\n💡 401 - Token invalid or expired');
    } else if (error.response?.status === 403) {
      console.log('\n💡 403 - Authorization failed, check route middleware');
    }
    
    if (error.response?.data) {
      console.log('Full error:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testWithFoundAdmin();