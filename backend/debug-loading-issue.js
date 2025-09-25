const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function debugStudentSectionEndpoint() {
  console.log('🔍 Debugging student section endpoint...\n');
  
  try {
    // First, login as admin to get a fresh token (avoid rate limiting)
    console.log('🔐 Getting admin token...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'admin@gmail.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    const adminUser = loginResponse.data.user;
    console.log('✅ Admin login successful');
    console.log('Token:', token.substring(0, 50) + '...');
    
    // Find a student ID to test with
    console.log('\n🔍 Finding student IDs...');
    const usersResponse = await axios.get(`${BASE_URL}/api/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const students = usersResponse.data.filter(user => user.role === 'student');
    console.log(`Found ${students.length} students`);
    
    if (students.length === 0) {
      console.log('❌ No students found in the system');
      return;
    }
    
    const testStudent = students[0];
    console.log(`Testing with student: ${testStudent.name} (${testStudent.email})`);
    
    // Test the student section endpoint
    console.log(`\n🧪 Testing GET /api/sections/student/${testStudent._id}`);
    
    const sectionResponse = await axios.get(`${BASE_URL}/api/sections/student/${testStudent._id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ API Response Status:', sectionResponse.status);
    console.log('✅ API Response Data:', JSON.stringify(sectionResponse.data, null, 2));
    
    // Check if the response structure is correct
    if (sectionResponse.data && sectionResponse.data.section) {
      console.log('\n📋 Response Structure Analysis:');
      const section = sectionResponse.data.section;
      console.log('- Section ID:', section._id);
      console.log('- Section Name:', section.name);
      console.log('- Courses Count:', section.courses ? section.courses.length : 0);
      console.log('- Students Count:', section.students ? section.students.length : 0);
      console.log('- Teacher:', section.teacher ? section.teacher.name : 'None');
      
      console.log('\n🎉 Backend endpoint is working correctly!');
      console.log('✅ The issue is likely in the frontend API call or response handling');
    } else {
      console.log('❌ Response structure is incorrect');
      console.log('Expected: { section: {...} }');
      console.log('Received:', Object.keys(sectionResponse.data));
    }
    
  } catch (error) {
    console.log('❌ Error testing endpoint:');
    console.log('Status:', error.response?.status || 'Network Error');
    console.log('Message:', error.response?.data?.message || error.message);
    
    if (error.response?.status === 404) {
      console.log('\n💡 404 Error - Student may not be assigned to any section');
    } else if (error.response?.status === 401) {
      console.log('\n💡 401 Error - Authentication failed');
    } else if (error.response?.status === 403) {
      console.log('\n💡 403 Error - Authorization failed');
    } else if (error.response?.status === 429) {
      console.log('\n💡 429 Error - Rate limiting, wait a few minutes');
    }
    
    if (error.response?.data) {
      console.log('Full error response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

debugStudentSectionEndpoint();