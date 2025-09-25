const axios = require('axios');

async function testAdminQuizPools() {
  try {
    // You'll need to replace this with a valid admin token
    const token = 'your-admin-token-here';
    
    console.log('Testing admin quiz pools functionality...');
    
    // Test 1: Get courses
    console.log('\n1. Testing get courses...');
    const coursesResponse = await axios.get('http://localhost:5000/api/admin/courses', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`Found ${coursesResponse.data.length} courses`);
    
    if (coursesResponse.data.length > 0) {
      const courseId = coursesResponse.data[0]._id;
      console.log(`Using course: ${coursesResponse.data[0].title} (${courseId})`);
      
      // Test 2: Get quizzes for course
      console.log('\n2. Testing get course quizzes...');
      const quizzesResponse = await axios.get(`http://localhost:5000/api/quizzes/course/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Quizzes response:', JSON.stringify(quizzesResponse.data, null, 2));
      
      // Test 3: Get quiz pools for course
      console.log('\n3. Testing get course quiz pools...');
      const quizPoolsResponse = await axios.get(`http://localhost:5000/api/quiz-pools/course/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Quiz pools response:', JSON.stringify(quizPoolsResponse.data, null, 2));
      
      if (quizPoolsResponse.data.length > 0) {
        const poolId = quizPoolsResponse.data[0]._id;
        console.log(`Using quiz pool: ${quizPoolsResponse.data[0].title} (${poolId})`);
        
        // Test 4: Get quiz pool questions
        console.log('\n4. Testing get quiz pool questions...');
        const questionsResponse = await axios.get(`http://localhost:5000/api/quiz-pools/${poolId}/questions`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Questions response:', JSON.stringify(questionsResponse.data, null, 2));
      }
    }
    
  } catch (error) {
    console.error('Error testing admin quiz pools:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    }
  }
}

testAdminQuizPools();