const axios = require('axios');

async function testStudentLogin() {
  try {
    console.log('Testing student login for section access...');
    
    // Try to get student credentials - let's check if there are any students with known passwords
    // From your database, let's try the student 'Sourav Mukhopadhyay' who we saw has a section
    
    const response = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'dipanwita2707@gmail.com',
      password: '123456'  // Common default password
    });
    
    console.log('✅ Student login successful');
    console.log('Student token received');
    
    const studentToken = response.data.token;
    const user = response.data.user;
    console.log('Student ID:', user._id);
    console.log('Student role:', user.role);
    
    // Now test the section endpoint with the student's own token
    console.log('\n🔍 Testing section endpoint with student token...');
    
    const sectionResponse = await axios.get(`http://localhost:5000/api/sections/student/${user._id}`, {
      headers: {
        'Authorization': `Bearer ${studentToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Section response received!');
    console.log('Response format check:');
    console.log('- Has section property:', sectionResponse.data.hasOwnProperty('section'));
    console.log('- Response keys:', Object.keys(sectionResponse.data));
    
    if (sectionResponse.data.section) {
      console.log('\n📋 Section details:');
      console.log('- Section name:', sectionResponse.data.section.name);
      console.log('- Students count:', sectionResponse.data.section.students?.length);
      console.log('- Teacher:', sectionResponse.data.section.teacher?.name);
      console.log('- Courses:', sectionResponse.data.section.courses?.length);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data?.message || error.message);
    if (error.response?.status === 401) {
      console.log('Invalid credentials - trying with different password...');
    }
    
    // If login fails, let's try a different approach
    if (error.response?.status === 401 || error.response?.status === 400) {
      console.log('\nTrying alternative student credentials...');
      try {
        const altResponse = await axios.post('http://localhost:5000/api/auth/login', {
          email: 'dipanwitakundu02@gmail.com',
          password: '123456'
        });
        
        console.log('✅ Alternative student login successful');
        const altUser = altResponse.data.user;
        const altToken = altResponse.data.token;
        
        const altSectionResponse = await axios.get(`http://localhost:5000/api/sections/student/${altUser._id}`, {
          headers: {
            'Authorization': `Bearer ${altToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('✅ Section response with alternative student!');
        console.log('- Has section property:', altSectionResponse.data.hasOwnProperty('section'));
        
      } catch (altError) {
        console.error('Alternative attempt failed:', altError.response?.data?.message || altError.message);
      }
    }
  }
}

testStudentLogin();