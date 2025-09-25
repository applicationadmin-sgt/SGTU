const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function findWorkingCredentials() {
  console.log('🔍 Testing different admin credentials...\n');
  
  const adminCredentials = [
    { email: 'admin@gmail.com', password: 'admin123' },
    { email: 'admin@sgt.com', password: 'admin123' },
    { email: 'admin@example.com', password: 'admin123' },
    { email: 'admin@admin.com', password: 'admin123' },
    { email: 'admin', password: 'admin123' },
    { email: 'admin@gmail.com', password: 'password' },
    { email: 'admin@gmail.com', password: 'admin' },
  ];
  
  for (const cred of adminCredentials) {
    try {
      console.log(`🔐 Trying: ${cred.email} / ${cred.password}`);
      const response = await axios.post(`${BASE_URL}/api/auth/login`, cred);
      
      console.log('✅ SUCCESS! Found working credentials:');
      console.log(`Email: ${cred.email}`);
      console.log(`Password: ${cred.password}`);
      console.log(`User: ${response.data.user.name} (${response.data.user.role})`);
      console.log(`Token: ${response.data.token.substring(0, 50)}...`);
      
      // Now test the student section endpoint
      await testStudentSectionWithToken(response.data.token);
      return;
      
    } catch (error) {
      console.log(`❌ Failed: ${error.response?.data?.message || error.message}`);
    }
  }
  
  console.log('\n❌ No working admin credentials found');
  console.log('💡 You may need to check the database or create an admin user');
}

async function testStudentSectionWithToken(token) {
  console.log('\n🧪 Testing student section endpoint with valid token...');
  
  try {
    // Get list of students
    const usersResponse = await axios.get(`${BASE_URL}/api/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const students = usersResponse.data.filter(user => user.role === 'student');
    console.log(`Found ${students.length} students`);
    
    if (students.length === 0) {
      console.log('❌ No students found to test with');
      return;
    }
    
    const testStudent = students[0];
    console.log(`Testing with: ${testStudent.name} (${testStudent._id})`);
    
    // Test the section endpoint
    const sectionResponse = await axios.get(`${BASE_URL}/api/sections/student/${testStudent._id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Section API Response:', sectionResponse.status);
    console.log('Data:', JSON.stringify(sectionResponse.data, null, 2));
    
  } catch (error) {
    console.log('❌ Section API Error:');
    console.log('Status:', error.response?.status);
    console.log('Message:', error.response?.data?.message || error.message);
    
    if (error.response?.status === 404) {
      console.log('💡 Student not assigned to any section - this is expected behavior');
      console.log('💡 The frontend should show "No section assigned" message');
    }
  }
}

findWorkingCredentials();