require('dotenv').config();
const axios = require('axios');

// Test API endpoint directly
async function testUnitCreation() {
  console.log('🧪 Testing Unit Creation API');
  console.log('=============================');
  
  try {
    // First, let's test if the server is running
    console.log('1. Testing server health...');
    const healthCheck = await axios.get('http://localhost:5000/api/health');
    console.log('✅ Server is running:', healthCheck.status);
  } catch (err) {
    console.log('❌ Server is not running or health endpoint not found');
    console.log('Error:', err.message);
    return;
  }
  
  try {
    // Now test unit creation endpoint
    console.log('\n2. Testing unit creation endpoint...');
    const testData = {
      title: 'Test Unit with Deadline API',
      description: 'Testing deadline fields through API',
      courseId: '68bec2fbc1a9d9ac3fa6a393', // Use the course ID from our previous test
      hasDeadline: true,
      deadline: '2025-12-31T23:59:00',
      deadlineDescription: 'API Test Deadline',
      strictDeadline: true,
      warningDays: 5
    };
    
    console.log('📝 Sending data:', JSON.stringify(testData, null, 2));
    
    // Try admin endpoint (this is what frontend uses)
    const response = await axios.post('http://localhost:5000/api/admin/course/68bec2fbc1a9d9ac3fa6a393/unit', testData, {
      headers: {
        'Content-Type': 'application/json',
        // Note: This will fail without proper auth, but we'll see if the endpoint is being hit
      }
    });
    
    console.log('✅ Unit created successfully:', response.data);
    
  } catch (err) {
    console.log('❌ API call failed:');
    if (err.response) {
      console.log('Status:', err.response.status);
      console.log('Response:', err.response.data);
    } else {
      console.log('Error:', err.message);
    }
  }
}

testUnitCreation();