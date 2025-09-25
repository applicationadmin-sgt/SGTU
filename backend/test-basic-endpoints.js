const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function testBasicEndpoints() {
  try {
    console.log('🔐 Getting authentication token...');
    
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'sourav11092002@gmail.com',
      password: 'Admin@1234'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful!');
    
    // Test basic sections endpoint
    console.log('\n1. Testing GET /sections (basic)');
    try {
      const sectionsResponse = await axios.get(`${API_URL}/sections`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log(`✅ Found ${sectionsResponse.data.length} sections`);
      
      if (sectionsResponse.data.length > 0) {
        const sectionId = sectionsResponse.data[0]._id;
        console.log(`   Using section ID: ${sectionId}`);
        
        // Test our new endpoints
        console.log('\n2. Testing our new course-teacher endpoints...');
        
        // Test unassigned courses
        console.log(`   Calling: GET ${API_URL}/sections/${sectionId}/unassigned-courses`);
        try {
          const unassignedResponse = await axios.get(`${API_URL}/sections/${sectionId}/unassigned-courses`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          console.log(`✅ Unassigned courses endpoint works! Found ${unassignedResponse.data.unassignedCourses?.length || 0} courses`);
        } catch (error) {
          console.log(`❌ Unassigned courses error: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
        }
        
        // Test course-teachers
        console.log(`   Calling: GET ${API_URL}/sections/${sectionId}/course-teachers`);
        try {
          const assignmentsResponse = await axios.get(`${API_URL}/sections/${sectionId}/course-teachers`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          console.log(`✅ Course-teachers endpoint works! Found ${assignmentsResponse.data.assignments?.length || 0} assignments`);
        } catch (error) {
          console.log(`❌ Course-teachers error: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
        }
      }
    } catch (error) {
      console.log(`❌ Basic sections endpoint error: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
    }

  } catch (error) {
    console.error('❌ Error during testing:', error.response?.data?.message || error.message);
  }
}

// Run the test
testBasicEndpoints();