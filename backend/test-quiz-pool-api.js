const axios = require('axios');

async function testQuizPoolAPI() {
  try {
    // Test with a mock admin token - replace with actual token
    const token = 'test-admin-token';
    
    console.log('Testing /api/admin/courses endpoint...');
    
    // First get a list of courses
    const coursesResponse = await axios.get('http://localhost:5000/api/admin/courses', {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }).catch(err => {
      console.log('Courses API Error:', err.response?.status, err.response?.data || err.message);
      return null;
    });
    
    if (coursesResponse && coursesResponse.data) {
      console.log(`✅ Found ${coursesResponse.data.length} courses`);
      
      if (coursesResponse.data.length > 0) {
        const courseId = coursesResponse.data[0]._id;
        console.log(`Testing with course: ${coursesResponse.data[0].title} (${courseId})`);
        
        // Test quiz pools for this course
        console.log('\nTesting /api/quiz-pools/course/:courseId endpoint...');
        const quizPoolsResponse = await axios.get(`http://localhost:5000/api/quiz-pools/course/${courseId}`, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }).catch(err => {
          console.log('Quiz Pools API Error:', err.response?.status, err.response?.data || err.message);
          return null;
        });
        
        if (quizPoolsResponse && quizPoolsResponse.data) {
          console.log(`✅ Found ${quizPoolsResponse.data.length} quiz pools`);
          
          if (quizPoolsResponse.data.length > 0) {
            const poolId = quizPoolsResponse.data[0]._id;
            console.log(`Testing with quiz pool: ${quizPoolsResponse.data[0].title} (${poolId})`);
            
            // Test quiz pool questions
            console.log('\nTesting /api/quiz-pools/:poolId/questions endpoint...');
            const questionsResponse = await axios.get(`http://localhost:5000/api/quiz-pools/${poolId}/questions`, {
              headers: { 
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }).catch(err => {
              console.log('Quiz Pool Questions API Error:', err.response?.status, err.response?.data || err.message);
              return null;
            });
            
            if (questionsResponse && questionsResponse.data) {
              console.log(`✅ Quiz pool questions response:`, JSON.stringify(questionsResponse.data, null, 2));
            }
          } else {
            console.log('❌ No quiz pools found for this course');
          }
        }
      } else {
        console.log('❌ No courses found');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testQuizPoolAPI();