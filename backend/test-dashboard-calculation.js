const axios = require('axios');

// Test the updated student dashboard data
async function testDashboardData() {
  try {
    const studentToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2OGM0YThkODE2MzkzMTQ0ZGUwOGI5OWIiLCJpZCI6IjY4YzRhOGQ4MTYzOTMxNDRkZTA4Yjk5YiIsImVtYWlsIjoiZGlwYW53aXRha3U3bmR1MDJAZ21haWwuY29tIiwicm9sZSI6InN0dWRlbnQiLCJpYXQiOjE3NTgwODQyMDEsImV4cCI6MTc1ODE3MDYwMX0.bUTzEhsYXZqBFELggSoTTy3kGoOysS_quSr7rlzJXOg';
    
    console.log('Testing Updated Student Dashboard Data...\n');
    
    // Get courses
    const coursesResponse = await axios.get('http://localhost:5000/api/student/courses', {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    
    console.log('📚 COURSES DATA:');
    coursesResponse.data.forEach((course, index) => {
      console.log(`Course ${index + 1}:`);
      console.log(`  - Title: ${course.title}`);
      console.log(`  - Total Videos: ${course.totalVideos}`);
      console.log(`  - Videos Started: ${course.videosStarted}`);
      console.log(`  - Videos Completed: ${course.videosCompleted}`);
      console.log(`  - Progress: ${course.progress}%`);
      console.log('');
    });
    
    // Get watch history
    const watchResponse = await axios.get('http://localhost:5000/api/student/watch-history', {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    
    console.log('⏱️  WATCH HISTORY DATA:');
    watchResponse.data.forEach((courseHistory, index) => {
      console.log(`Course ${index + 1} (${courseHistory.courseTitle}):`);
      console.log(`  - Total Time Spent: ${courseHistory.totalTimeSpent} seconds`);
      console.log(`  - Videos in History: ${courseHistory.videos?.length || 0}`);
      
      if (courseHistory.videos) {
        courseHistory.videos.forEach((video, vidIndex) => {
          console.log(`    Video ${vidIndex + 1}: ${video.videoTitle}`);
          console.log(`      Time Spent: ${video.timeSpent} seconds`);
          console.log(`      Last Watched: ${video.lastWatched}`);
        });
      }
      console.log('');
    });
    
    // Calculate what the dashboard should show
    console.log('🧮 CALCULATED DASHBOARD STATISTICS:');
    
    const totalCourses = coursesResponse.data.length;
    const totalVideos = coursesResponse.data.reduce((sum, course) => sum + (course.totalVideos || 0), 0);
    
    let totalVideosWatched = 0;
    let totalWatchTime = 0;
    
    watchResponse.data.forEach(courseHistory => {
      if (courseHistory.videos) {
        const watchedInCourse = courseHistory.videos.filter(video => video.timeSpent > 0).length;
        totalVideosWatched += watchedInCourse;
        totalWatchTime += courseHistory.totalTimeSpent || 0;
      }
    });
    
    console.log(`  - Total Courses: ${totalCourses}`);
    console.log(`  - Total Videos Available: ${totalVideos}`);
    console.log(`  - Videos Watched (any time > 0): ${totalVideosWatched}`);
    console.log(`  - Total Watch Time: ${totalWatchTime} seconds (${Math.floor(totalWatchTime/60)}m ${totalWatchTime%60}s)`);
    console.log(`  - Overall Progress: ${Math.round((totalVideosWatched / totalVideos) * 100)}%`);
    
    // Test quiz data
    const quizResponse = await axios.get('http://localhost:5000/api/student/quiz-results', {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    
    console.log('\n🎯 QUIZ RESULTS:');
    if (quizResponse.data.summary) {
      console.log(`  - Total Attempts: ${quizResponse.data.summary.totalAttempts}`);
      console.log(`  - Average Score: ${quizResponse.data.summary.averageScore}%`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testDashboardData();