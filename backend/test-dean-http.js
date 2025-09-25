const axios = require('axios');

async function testDeanEndpointViaHTTP() {
  try {
    console.log('Testing dean endpoint via HTTP...');
    
    // First login to get a valid token
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'vishumam@gmail.com',
      password: '123456'
    });
    
    console.log('Login successful');
    const token = loginResponse.data.token;
    
    // Now test the dean endpoint
    const response = await axios.get('http://localhost:5000/api/quiz-unlock/dean-locked-students', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Dean endpoint success!');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('Error testing dean endpoint:');
    console.error('Status:', error.response?.status);
    console.error('Message:', error.response?.data?.message);
    console.error('Error details:', error.response?.data?.error);
    console.error('Full response:', JSON.stringify(error.response?.data, null, 2));
  }
}

testDeanEndpointViaHTTP();