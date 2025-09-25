const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000';

async function testCourseProgressAPI() {
  try {
    console.log('🔍 Testing Course Progress API...\n');

    // First, login as student
    console.log('1. Logging in as student...');
    const loginResponse = await axios.post(`${API_BASE_URL}/api/auth/login`, {
      email: 'dipanwitaku7ndu02@gmail.com',
      password: '123456'
    });

    if (loginResponse.data.token) {
      console.log('✅ Student login successful');
      console.log('User:', loginResponse.data.user.name, '-', loginResponse.data.user.role);
    } else {
      console.log('❌ Login failed');
      return;
    }

    const token = loginResponse.data.token;

    // Get student's courses
    console.log('\n2. Getting student courses...');
    const coursesResponse = await axios.get(`${API_BASE_URL}/api/student/courses`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ Courses endpoint working');
    console.log('Enrolled courses:', coursesResponse.data.length);
    
    if (coursesResponse.data.length > 0) {
      const firstCourse = coursesResponse.data[0];
      console.log('First course:', firstCourse.title, '(ID:', firstCourse._id + ')');

      // Test course progress API for the specific course ID from the URL
      const specificCourseId = '68c8e5486a8d60601e77f327';
      console.log('\n3. Testing course progress API for specific course...');
      console.log('Course ID:', specificCourseId);
      
      const progressResponse = await axios.get(`${API_BASE_URL}/api/student/course/${specificCourseId}/progress`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('✅ Course progress endpoint working');
      console.log('Progress data structure:');
      console.log('- Course ID:', progressResponse.data.courseId);
      console.log('- Course Title:', progressResponse.data.courseTitle);
      console.log('- Course Code:', progressResponse.data.courseCode);
      console.log('- Total Videos:', progressResponse.data.totalVideos);
      console.log('- Videos Started:', progressResponse.data.videosStarted);
      console.log('- Videos Completed:', progressResponse.data.videosCompleted);
      console.log('- Overall Percentage:', progressResponse.data.overallPercentage + '%');
      console.log('- Video Progress Count:', progressResponse.data.videoProgress ? progressResponse.data.videoProgress.length : 0);

      if (progressResponse.data.videoProgress && progressResponse.data.videoProgress.length > 0) {
        console.log('\n📹 Video Progress Details:');
        progressResponse.data.videoProgress.forEach((video, index) => {
          console.log(`${index + 1}. ${video.title}`);
          console.log(`   Time Spent: ${video.timeSpent}s`);
          console.log(`   Percentage: ${video.percentageCompleted}%`);
          console.log(`   Last Watched: ${video.lastWatched || 'Never'}`);
        });
      }
    }

    console.log('\n🏁 Course Progress API Test Complete!');

  } catch (error) {
    console.error('❌ Error testing course progress API:', error.response?.data || error.message);
  }
}

testCourseProgressAPI();