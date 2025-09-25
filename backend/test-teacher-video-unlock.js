const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function testVideoUnlockAsTeacher() {
  try {
    console.log('🔐 Logging in as teacher/admin...');
    
    // Login as admin (who has teacher role)
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'sourav11092002@gmail.com',
      password: 'Admin@1234'
    });
    
    if (!loginResponse.data.token) {
      console.log('❌ No token received');
      return;
    }
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful!');
    console.log('👤 User role:', loginResponse.data.user?.role);
    
    const headers = { Authorization: `Bearer ${token}` };
    
    console.log('\n🔍 Testing Video Unlock APIs...');
    
    // Test 1: Get teacher students
    console.log('\n1. Getting teacher students...');
    try {
      const studentsResponse = await axios.get(`${API_URL}/video-unlock/teacher/students`, { headers });
      console.log(`✅ Found ${studentsResponse.data.students?.length || 0} students`);
      
      if (studentsResponse.data.students && studentsResponse.data.students.length > 0) {
        console.log('   Students:');
        studentsResponse.data.students.slice(0, 3).forEach((student, index) => {
          console.log(`   ${index + 1}. ${student.name} (${student.regNo})`);
        });
      }
    } catch (error) {
      console.log(`❌ Error: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
    }
    
    // Test 2: Get teacher requests
    console.log('\n2. Getting teacher unlock requests...');
    try {
      const requestsResponse = await axios.get(`${API_URL}/video-unlock/teacher/requests`, { headers });
      console.log(`✅ Found ${requestsResponse.data.requests?.length || 0} unlock requests`);
    } catch (error) {
      console.log(`❌ Error: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
    }
    
    // Test 3: Get courses for first student
    console.log('\n3. Testing student courses...');
    try {
      const studentsResponse = await axios.get(`${API_URL}/video-unlock/teacher/students`, { headers });
      if (studentsResponse.data.students && studentsResponse.data.students.length > 0) {
        const firstStudent = studentsResponse.data.students[0];
        console.log(`   Testing with student: ${firstStudent.name}`);
        
        const coursesResponse = await axios.get(`${API_URL}/video-unlock/student/${firstStudent._id}/courses`, { headers });
        console.log(`   ✅ Found ${coursesResponse.data.courses?.length || 0} courses for student`);
        
        if (coursesResponse.data.courses && coursesResponse.data.courses.length > 0) {
          const firstCourse = coursesResponse.data.courses[0];
          console.log(`   Sample course: ${firstCourse.name || firstCourse._id}`);
          
          // Test units for this course
          const unitsResponse = await axios.get(`${API_URL}/video-unlock/course/${firstCourse._id}/units`, { headers });
          console.log(`   ✅ Found ${unitsResponse.data.units?.length || 0} units in course`);
          
          if (unitsResponse.data.units && unitsResponse.data.units.length > 0) {
            const firstUnit = unitsResponse.data.units[0];
            console.log(`   Sample unit: ${firstUnit.title}`);
            
            // Test videos for this unit
            const videosResponse = await axios.get(`${API_URL}/video-unlock/unit/${firstUnit._id}/videos`, { headers });
            console.log(`   ✅ Found ${videosResponse.data.videos?.length || 0} videos in unit`);
            
            if (videosResponse.data.videos && videosResponse.data.videos.length > 0) {
              console.log(`   Sample video: ${videosResponse.data.videos[0].title}`);
              console.log('\n🎉 Complete data chain available for video unlock requests!');
            }
          }
        }
      } else {
        console.log('   ⚠️ No students found for teacher');
      }
    } catch (error) {
      console.log(`❌ Error: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
    }
    
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data?.message || error.message);
  }
}

testVideoUnlockAsTeacher();