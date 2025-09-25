const axios = require('axios');

async function testWatchHistoryAPI() {
  try {
    console.log('Testing watch history update API...');
    
    // Use the current token from the frontend
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4YzRhOGQ4MTYzOTMxNDRkZTA4Yjk5YiIsInJvbGUiOiJzdHVkZW50IiwicGVybWlzc2lvbnMiOltdLCJpYXQiOjE3NTc3MzQxOTEsImV4cCI6MTc1NzgyMDU5MX0.dtMNxR-VvjxcKmQOk6k8SvsEiV6UgtdcCbBsx1nRK9Y';
    
    const videoId = '68c4e05a3c6f751dd6a876a6'; // Video ID from the course
    const url = `http://localhost:5000/api/student/video/${videoId}/watch`;
    
    console.log('Requesting URL:', url);
    
    const watchData = {
      timeSpent: 30, // 30 seconds
      sessionTime: 30,
      segmentTime: 30,
      currentTime: 30,
      duration: 100,
      isCompleted: false,
      sessionCount: 1,
      segmentsWatched: 6,
      totalSegments: 20,
      completionPercentage: 30
    };
    
    console.log('Sending watch data:', JSON.stringify(watchData, null, 2));
    
    const response = await axios.post(url, watchData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Watch History API Status:', response.status);
    console.log('✅ Watch History Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    if (error.response) {
      console.error('❌ API Error:', error.response.status);
      console.error('❌ Error Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('❌ Request Error:', error.message);
    }
  }
}

testWatchHistoryAPI();