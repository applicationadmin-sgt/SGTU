const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function getAdminTokenAndTest() {
  console.log('🔑 Getting fresh admin token and testing endpoint...\n');
  
  try {
    // Login as admin to get fresh token
    console.log('🔐 Logging in as admin...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'admin@gmail.com',
      password: 'admin123'
    });
    
    const adminToken = loginResponse.data.token;
    console.log('✅ Admin login successful');
    
    // Test student section endpoint
    console.log('🧪 Testing student section endpoint...');
    const studentId = '675a41b47c270704c481da8f'; // Known student ID
    
    const response = await axios.get(`${BASE_URL}/api/sections/student/${studentId}`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ SUCCESS! Status:', response.status);
    console.log('✅ Response received:', JSON.stringify(response.data, null, 2));
    
    // Verify the data structure
    if (response.data.section) {
      console.log('\n📋 Section Details:');
      console.log('- Name:', response.data.section.name);
      console.log('- ID:', response.data.section._id);
      
      if (response.data.section.courses) {
        console.log('- Courses:', response.data.section.courses.length, 'courses found');
        response.data.section.courses.forEach((course, i) => {
          console.log(`  ${i+1}. ${course.name || course.title || course._id}`);
        });
      }
      
      if (response.data.section.teacher) {
        console.log('- Teacher:', response.data.section.teacher.name || response.data.section.teacher.username);
      }
      
      if (response.data.section.students) {
        console.log('- Total students:', response.data.section.students.length);
      }
      
      console.log('\n🎉 The "My Section" page should now load properly!');
    }
    
  } catch (error) {
    console.log('❌ Error:', error.response?.status || 'Network Error');
    console.log('❌ Message:', error.response?.data?.message || error.message);
    if (error.response?.data) {
      console.log('❌ Full response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

getAdminTokenAndTest();