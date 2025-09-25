const axios = require('axios');

async function testTeachingAssignmentsAPI() {
  try {
    console.log('Testing /api/hierarchy/my-teaching-assignments endpoint...');
    
    // First, let's test if the server is responding
    const healthResponse = await axios.get('http://localhost:5000/api/hierarchy/overview');
    console.log('✅ Server is responding. Hierarchy routes are working.');
    
    // Now test the specific endpoint (this will likely fail due to auth, but we'll see the error)
    try {
      const response = await axios.get('http://localhost:5000/api/hierarchy/my-teaching-assignments');
      console.log('✅ Teaching assignments endpoint responded:', response.data);
    } catch (authError) {
      if (authError.response?.status === 401) {
        console.log('✅ Teaching assignments endpoint exists but requires authentication (expected)');
        console.log('Response:', authError.response.data);
      } else if (authError.response?.status === 404) {
        console.log('❌ Teaching assignments endpoint not found (404)');
        console.log('Response:', authError.response.data);
      } else {
        console.log('❌ Unexpected error:', authError.message);
        if (authError.response) {
          console.log('Status:', authError.response.status);
          console.log('Response:', authError.response.data);
        }
      }
    }
  } catch (error) {
    console.log('❌ Server is not responding or hierarchy routes have issues');
    console.log('Error:', error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Response:', error.response.data);
    }
  }
}

testTeachingAssignmentsAPI();