const axios = require('axios');

async function testSpecificQuizPoolAnalytics() {
  try {
    // Login as admin
    console.log('🔐 Logging in as admin...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'sourav11092002@gmail.com',
      password: 'Admin@1234'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Admin login successful');
    
    // Test specific quiz pools that we know have attempts
    const quizPoolsToTest = [
      { id: '68c4e97005b516bb0e732cd9', name: '123 Quiz Pool', courseId: '68c4a82816393144de08b900' },
      { id: '68c5048e1226bb6f70fe7100', name: 'unit 2 Quiz Pool', courseId: '68c4a82816393144de08b900' },
      { id: '68c0f02f360bfdd246c14da4', name: 'Unit 1 Quiz Pool', courseId: '68c0ee7c360bfdd246c14bf4' }
    ];
    
    for (const pool of quizPoolsToTest) {
      console.log(`\n🎯 Testing ${pool.name} (${pool.id})`);
      
      try {
        // Test the analytics API
        const analyticsResponse = await axios.get(`http://localhost:5000/api/quiz-pools/${pool.id}/analytics`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('✅ Analytics API successful');
        console.log('📊 Response structure:');
        const data = analyticsResponse.data;
        
        console.log(`   - quizPool: ${!!data.quizPool} (${data.quizPool?.title || 'N/A'})`);
        console.log(`   - analytics: ${!!data.analytics}`);
        console.log(`   - attempts: ${!!data.attempts} (${data.attempts?.length || 0} items)`);
        
        if (data.analytics) {
          console.log(`   - analytics.totalAttempts: ${data.analytics.totalAttempts}`);
          console.log(`   - analytics.passedAttempts: ${data.analytics.passedAttempts}`);
          console.log(`   - analytics.averageScore: ${data.analytics.averageScore?.toFixed(1) || 'N/A'}`);
        }
        
        if (data.attempts && data.attempts.length > 0) {
          console.log('   - Sample attempts:');
          data.attempts.slice(0, 3).forEach((attempt, index) => {
            console.log(`     ${index + 1}. ${attempt.student?.name || 'Unknown'} - ${attempt.score}/${attempt.maxScore} (${attempt.percentage?.toFixed(1) || 0}%) - ${attempt.passed ? 'PASSED' : 'FAILED'}`);
          });
        }
        
        // Also test the course quiz pools API
        console.log(`\n🔍 Testing course quiz pools API for course ${pool.courseId}`);
        const coursePoolsResponse = await axios.get(`http://localhost:5000/api/quiz-pools/course/${pool.courseId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const foundPool = coursePoolsResponse.data.find(p => p._id === pool.id);
        console.log(`   - Found in course API: ${!!foundPool}`);
        if (foundPool) {
          console.log(`   - Pool title in API: ${foundPool.title}`);
        }
        
      } catch (error) {
        console.error(`❌ Error testing ${pool.name}:`, error.response?.data || error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testSpecificQuizPoolAnalytics();