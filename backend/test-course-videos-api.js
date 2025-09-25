const axios = require('axios');

async function testCourseVideosAPI() {
  try {
    console.log('Testing course videos API...');
    
    // Use the current token from the frontend
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4YzRhOGQ4MTYzOTMxNDRkZTA4Yjk5YiIsInJvbGUiOiJzdHVkZW50IiwicGVybWlzc2lvbnMiOltdLCJpYXQiOjE3NTc3MzQxOTEsImV4cCI6MTc1NzgyMDU5MX0.dtMNxR-VvjxcKmQOk6k8SvsEiV6UgtdcCbBsx1nRK9Y';
    
    const courseId = '68c4a82816393144de08b900';
    const url = `http://localhost:5000/api/student/course/${courseId}/videos`;
    
    console.log('Requesting URL:', url);
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Videos API Status:', response.status);
    console.log('✅ Videos Response Data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    if (error.response) {
      console.error('❌ API Error:', error.response.status);
      console.error('❌ Error Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('❌ Request Error:', error.message);
    }
  }
}

testCourseVideosAPI();