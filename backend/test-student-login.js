const axios = require('axios');

async function testStudentLogin() {
  try {
    console.log('Testing student login...');
    
    const loginData = {
      email: 'dipanwitaku7ndu02@gmail.com',
      password: '123456'
    };
    
    const response = await axios.post('http://localhost:5000/api/auth/login', loginData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Login Response Status:', response.status);
    console.log('✅ Login Response Data:', JSON.stringify(response.data, null, 2));
    
    if (response.data.token) {
      console.log('✅ Token received, testing API access...');
      
      // Test the courses API with the received token
      const coursesResponse = await axios.get('http://localhost:5000/api/student/courses', {
        headers: {
          'Authorization': `Bearer ${response.data.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Courses API Status:', coursesResponse.status);
      console.log('✅ Courses Data:', JSON.stringify(coursesResponse.data, null, 2));
      console.log('Number of courses:', coursesResponse.data.length);
    }
    
  } catch (error) {
    if (error.response) {
      console.error('❌ API Error:', error.response.status, error.response.data);
    } else {
      console.error('❌ Request Error:', error.message);
    }
  }
}

testStudentLogin();