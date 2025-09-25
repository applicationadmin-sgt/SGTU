const axios = require('axios');

// Test script to check student data structure
async function testStudentData() {
  try {
    // You'll need to replace this with an actual student JWT token
    const studentToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY2ZWE3NzE3MzQxZjAzMWI2MWZiMjYwNiIsInJvbGUiOiJzdHVkZW50IiwiaWF0IjoxNzI2NzM3NTkzLCJleHAiOjE3Mjc2MDE1OTN9.6mJNpU2ChUqPbOk-aI9nORcWOt0K5yBRSJQfNJJaRts'; // Replace with actual token
    
    console.log('Testing Student API Endpoints...\n');
    
    // Test student courses endpoint
    console.log('1. Testing /api/student/courses...');
    try {
      const coursesResponse = await axios.get('http://localhost:5000/api/student/courses', {
        headers: { Authorization: `Bearer ${studentToken}` }
      });
      
      console.log('Courses Response Status:', coursesResponse.status);
      console.log('Courses Data Structure:');
      console.log(JSON.stringify(coursesResponse.data, null, 2));
      
      if (coursesResponse.data.length > 0) {
        const firstCourse = coursesResponse.data[0];
        console.log('\nFirst Course Details:');
        console.log('- Title:', firstCourse.title);
        console.log('- Progress:', firstCourse.progress);
        console.log('- Videos Completed:', firstCourse.videosCompleted);
        console.log('- Videos Started:', firstCourse.videosStarted);
        console.log('- Total Videos:', firstCourse.totalVideos);
        console.log('- Video Count:', firstCourse.videoCount);
      }
    } catch (err) {
      console.error('Error fetching courses:', err.response?.data || err.message);
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Test student watch history endpoint
    console.log('2. Testing /api/student/watch-history...');
    try {
      const watchResponse = await axios.get('http://localhost:5000/api/student/watch-history', {
        headers: { Authorization: `Bearer ${studentToken}` }
      });
      
      console.log('Watch History Response Status:', watchResponse.status);
      console.log('Watch History Data Structure:');
      console.log(JSON.stringify(watchResponse.data, null, 2));
      
      if (watchResponse.data.length > 0) {
        const firstWatch = watchResponse.data[0];
        console.log('\nFirst Watch Record Details:');
        console.log('- Video Title:', firstWatch.videoTitle);
        console.log('- Course Name:', firstWatch.courseName);
        console.log('- Watch Time:', firstWatch.watchTime);
        console.log('- Total Watch Time:', firstWatch.totalWatchTime);
        console.log('- Last Watched:', firstWatch.lastWatched);
        console.log('- Progress:', firstWatch.progress);
      }
    } catch (err) {
      console.error('Error fetching watch history:', err.response?.data || err.message);
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Test quiz results endpoint
    console.log('3. Testing /api/student/quiz-results...');
    try {
      const quizResponse = await axios.get('http://localhost:5000/api/student/quiz-results', {
        headers: { Authorization: `Bearer ${studentToken}` }
      });
      
      console.log('Quiz Results Response Status:', quizResponse.status);
      console.log('Quiz Results Data Structure:');
      console.log(JSON.stringify(quizResponse.data, null, 2));
    } catch (err) {
      console.error('Error fetching quiz results:', err.response?.data || err.message);
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Run the test
testStudentData();