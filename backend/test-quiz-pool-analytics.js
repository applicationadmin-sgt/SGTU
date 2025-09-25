const axios = require('axios');

async function testQuizPoolAnalytics() {
  try {
    // First, let's get a real admin token by logging in
    console.log('🔐 Logging in as admin...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'sourav11092002@gmail.com',
      password: 'Admin@1234'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Admin login successful');
    
    // Get courses
    console.log('\n📚 Getting courses...');
    const coursesResponse = await axios.get('http://localhost:5000/api/admin/courses', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(`Found ${coursesResponse.data.length} courses`);
    
    if (coursesResponse.data.length > 0) {
      // Pick a course (preferably one with nurology unit)
      let targetCourse = coursesResponse.data.find(c => c.title.toLowerCase().includes('neurology') || c.title.toLowerCase().includes('unit'));
      if (!targetCourse) {
        targetCourse = coursesResponse.data[0];
      }
      
      console.log(`Using course: ${targetCourse.title} (${targetCourse._id})`);
      
      // Get quiz pools for this course
      console.log('\n🎯 Getting quiz pools...');
      const quizPoolsResponse = await axios.get(`http://localhost:5000/api/quiz-pools/course/${targetCourse._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log(`Found ${quizPoolsResponse.data.length} quiz pools`);
      
      if (quizPoolsResponse.data.length > 0) {
        // Test each quiz pool
        for (const pool of quizPoolsResponse.data.slice(0, 3)) { // Test first 3 pools
          console.log(`\n🔍 Testing quiz pool: ${pool.title} (${pool._id})`);
          
          try {
            // Get quiz pool analytics
            const analyticsResponse = await axios.get(`http://localhost:5000/api/quiz-pools/${pool._id}/analytics`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            
            console.log('📊 Analytics response structure:');
            console.log('- quizPool:', !!analyticsResponse.data.quizPool);
            console.log('- analytics:', !!analyticsResponse.data.analytics);
            console.log('- attempts:', !!analyticsResponse.data.attempts);
            
            if (analyticsResponse.data.analytics) {
              console.log(`- analytics.totalAttempts: ${analyticsResponse.data.analytics.totalAttempts}`);
              console.log(`- analytics.passedAttempts: ${analyticsResponse.data.analytics.passedAttempts}`);
            }
            
            if (analyticsResponse.data.attempts) {
              console.log(`- attempts.length: ${analyticsResponse.data.attempts.length}`);
              if (analyticsResponse.data.attempts.length > 0) {
                const attempt = analyticsResponse.data.attempts[0];
                console.log(`- Sample attempt:`, {
                  student: attempt.student?.name,
                  score: `${attempt.score}/${attempt.maxScore}`,
                  percentage: `${attempt.percentage}%`,
                  passed: attempt.passed
                });
              }
            }
            
          } catch (error) {
            console.error(`❌ Error getting analytics for ${pool.title}:`, error.response?.data || error.message);
          }
        }
      } else {
        console.log('❌ No quiz pools found for this course');
      }
    } else {
      console.log('❌ No courses found');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testQuizPoolAnalytics();