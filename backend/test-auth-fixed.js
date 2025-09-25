const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function testFixedEndpoint() {
  console.log('🔧 Testing fixed student section endpoint with admin token...\n');
  
  try {
    // Use admin token directly 
    const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NzVhNDFiNDdjMjcwNzA0YzQ4MWRhNzAiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3MzQ4OTQ0NzUsImV4cCI6MTczNDk4MDg3NX0.nDMm8kLOZkVmHe6nJr7UNPwzKKT6pDOGJdWBOgNzgNY';
    
    // Test with a known student ID
    const studentId = '675a41b47c270704c481da8f'; // ID from our previous checks
    
    const response = await axios.get(`${BASE_URL}/api/sections/student/${studentId}`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Success! Status:', response.status);
    console.log('✅ Student section data:', JSON.stringify(response.data, null, 2));
    
    // Verify the data structure
    if (response.data.section) {
      console.log('\n📋 Section Info:');
      console.log('- Section Name:', response.data.section.name);
      console.log('- Section ID:', response.data.section._id);
      
      if (response.data.section.courses && response.data.section.courses.length > 0) {
        console.log('- Courses:', response.data.section.courses.map(c => c.name || c.title).join(', '));
      }
      
      if (response.data.section.teacher) {
        console.log('- Teacher:', response.data.section.teacher.name || response.data.section.teacher.username);
      }
      
      if (response.data.section.students && response.data.section.students.length > 0) {
        console.log('- Classmates:', response.data.section.students.length, 'students');
      }
    }
    
  } catch (error) {
    console.log('❌ Error:', error.response?.status || 'Network Error');
    console.log('❌ Message:', error.response?.data?.message || error.message);
    if (error.response?.data) {
      console.log('❌ Full response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testFixedEndpoint();