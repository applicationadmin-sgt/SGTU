const axios = require('axios');

async function testDeanCourseRelations() {
  try {
    console.log('Testing Dean Course Relations Endpoint...');
    
    // Test without authentication first to see if we get a meaningful error
    console.log('\n=== Testing Course Relations Endpoint ===');
    try {
      const response = await axios.get('http://localhost:5000/api/dean/course/676c3e0c502f3a74d4c8e5ba/relations', {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      console.log('Response:', response.data);
    } catch (error) {
      console.log('Expected auth error:', error.response?.status, error.response?.data?.message);
    }

    // Test HOD login and then try to access dean endpoint (should fail but let's see the response structure)
    console.log('\n=== Testing with HOD credentials (should fail for dean endpoint) ===');
    try {
      const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
        email: '123@gmail.com',
        password: '123456'
      });
      
      const token = loginResponse.data.token;
      console.log('HOD login successful, trying dean endpoint...');
      
      const courseResponse = await axios.get('http://localhost:5000/api/dean/course/676c3e0c502f3a74d4c8e5ba/relations', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('Course relations:', courseResponse.data);
    } catch (error) {
      console.log('Error accessing dean endpoint with HOD token:', error.response?.status, error.response?.data?.message);
    }

  } catch (error) {
    console.error('Test error:', error.message);
  }
}

testDeanCourseRelations();