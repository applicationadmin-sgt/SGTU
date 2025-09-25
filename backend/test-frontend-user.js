const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000';

async function testFrontendUser() {
  try {
    console.log('🔍 Testing Frontend User Session...\n');

    // Get the token from frontend (you'll need to check localStorage in browser)
    console.log('📝 Instructions:');
    console.log('1. Open browser console on the course progress page');
    console.log('2. Run: localStorage.getItem("token")');
    console.log('3. Copy the token and replace "YOUR_TOKEN_HERE" below');
    console.log('4. Then run this script again');
    
    // Example token - replace with actual token from browser
    const frontendToken = 'YOUR_TOKEN_HERE';
    
    if (frontendToken === 'YOUR_TOKEN_HERE') {
      console.log('❌ Please update the token in this script first');
      return;
    }

    // Test with the frontend token
    console.log('\n🔍 Testing with frontend token...');
    const progressResponse = await axios.get(`${API_BASE_URL}/api/student/course/68c8e5486a8d60601e77f327/progress`, {
      headers: { Authorization: `Bearer ${frontendToken}` }
    });

    console.log('✅ Course progress with frontend token:');
    console.log('- Course Title:', progressResponse.data.courseTitle);
    console.log('- Videos Started:', progressResponse.data.videosStarted);
    console.log('- Total Videos:', progressResponse.data.totalVideos);
    
    console.log('\n📹 Video Progress:');
    progressResponse.data.videoProgress?.forEach((video, index) => {
      console.log(`${index + 1}. ${video.title}`);
      console.log(`   Time Spent: ${video.timeSpent}s`);
      console.log(`   Last Watched: ${video.lastWatched || 'Never'}`);
    });

    // Also check current user profile
    const profileResponse = await axios.get(`${API_BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${frontendToken}` }
    });
    
    console.log('\n👤 Current User:');
    console.log('- Name:', profileResponse.data.name);
    console.log('- Email:', profileResponse.data.email);
    console.log('- ID:', profileResponse.data._id);

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testFrontendUser();