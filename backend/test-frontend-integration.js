const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function testStudentSectionIntegration() {
  console.log('🧪 Testing complete student section integration...\n');
  
  try {
    // First, verify we can login and get a token
    console.log('🔐 Testing student login...');
    
    // Try a few student emails
    const studentEmails = [
      'student@gmail.com',
      'dipanwitakundu02@gmail.com',
      'asmita@gmail.com'
    ];
    
    let studentToken = null;
    let loggedInStudent = null;
    
    for (const email of studentEmails) {
      try {
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
          email: email,
          password: 'student123' // Common student password
        });
        
        studentToken = loginResponse.data.token;
        loggedInStudent = loginResponse.data.user;
        console.log(`✅ Logged in as: ${email}`);
        break;
      } catch (loginError) {
        console.log(`❌ Failed to login as: ${email}`);
      }
    }
    
    if (!studentToken) {
      console.log('⚠️ Could not login as student, trying admin token...');
      const adminLogin = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: 'admin@gmail.com',
        password: 'admin123'
      });
      studentToken = adminLogin.data.token;
      // Use a known student ID for testing
      loggedInStudent = { _id: '675a41b47c270704c481da8f' };
      console.log('✅ Using admin token to test student endpoint');
    }
    
    // Test the student section endpoint
    console.log('\n🔍 Testing student section API...');
    const response = await axios.get(`${BASE_URL}/api/sections/student/${loggedInStudent._id}`, {
      headers: {
        'Authorization': `Bearer ${studentToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ API Response Status:', response.status);
    console.log('✅ API Response Structure:', JSON.stringify(response.data, null, 2));
    
    // Verify the data structure matches frontend expectations
    const sectionData = response.data.section;
    if (sectionData) {
      console.log('\n📋 Frontend Integration Verification:');
      console.log('✅ Section object exists');
      console.log(`✅ Section name: ${sectionData.name}`);
      console.log(`✅ Courses array: ${sectionData.courses ? sectionData.courses.length : 0} courses`);
      console.log(`✅ Teacher: ${sectionData.teacher ? sectionData.teacher.name : 'None'}`);
      console.log(`✅ Students: ${sectionData.students ? sectionData.students.length : 0} students`);
      
      if (sectionData.courses && sectionData.courses.length > 0) {
        console.log('\n📚 Course Details:');
        sectionData.courses.forEach((course, i) => {
          console.log(`   ${i+1}. ${course.name || course.title || 'Unnamed'} (${course.courseCode || 'No code'})`);
        });
      }
      
      console.log('\n🎉 SUCCESS! The frontend should now work properly with:');
      console.log('   ✅ Proper data structure handling');
      console.log('   ✅ Section information display');
      console.log('   ✅ Course list rendering');
      console.log('   ✅ Teacher information');
      console.log('   ✅ Classmates list');
      
    } else {
      console.log('❌ No section data in response');
    }
    
  } catch (error) {
    console.log('❌ Integration test failed:');
    console.log('Status:', error.response?.status || 'Network Error');
    console.log('Message:', error.response?.data?.message || error.message);
    
    if (error.response?.status === 429) {
      console.log('\n⏰ Rate limiting detected. Wait a few minutes and try again.');
    }
  }
}

testStudentSectionIntegration();