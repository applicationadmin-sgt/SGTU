const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function getAuthToken() {
  try {
    console.log('🔐 Getting authentication token...');
    
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'sourav11092002@gmail.com',
      password: 'Admin@1234'
    });
    
    console.log('✅ Login successful!');
    return loginResponse.data.token;
    
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data?.message || error.message);
    return null;
  }
}

async function testVideoUnlockAPI() {
  try {
    // First get a valid token
    const token = await getAuthToken();
    if (!token) {
      console.log('❌ Could not get valid token, aborting test');
      return;
    }
    
    console.log('\n🔍 Testing Video Unlock System APIs...\n');

    // Test 1: Get teacher students
    console.log('1. Testing GET /video-unlock/teacher/students');
    try {
      const studentsResponse = await axios.get(`${API_URL}/video-unlock/teacher/students`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log(`✅ Teacher students endpoint works! Found ${studentsResponse.data.students?.length || 0} students`);
      
      const students = studentsResponse.data.students || [];
      if (students.length > 0) {
        console.log(`   Sample student: ${students[0].name} (${students[0].email})`);
      }
    } catch (error) {
      console.log(`❌ Teacher students error: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
    }

    // Test 2: Get teacher's unlock requests
    console.log('\n2. Testing GET /video-unlock/teacher/requests');
    try {
      const requestsResponse = await axios.get(`${API_URL}/video-unlock/teacher/requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log(`✅ Teacher requests endpoint works! Found ${requestsResponse.data.requests?.length || 0} requests`);
    } catch (error) {
      console.log(`❌ Teacher requests error: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
    }

    // Test 3: Get pending requests for HOD
    console.log('\n3. Testing GET /video-unlock/hod/pending');
    try {
      const pendingResponse = await axios.get(`${API_URL}/video-unlock/hod/pending`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log(`✅ HOD pending requests endpoint works! Found ${pendingResponse.data.requests?.length || 0} pending requests`);
    } catch (error) {
      console.log(`❌ HOD pending requests error: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
    }

    // Test 4: Get unlock statistics
    console.log('\n4. Testing GET /video-unlock/stats');
    try {
      const statsResponse = await axios.get(`${API_URL}/video-unlock/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log(`✅ Statistics endpoint works!`);
      console.log('   Stats:', statsResponse.data.stats);
    } catch (error) {
      console.log(`❌ Statistics error: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
    }

    // Test 5: Create a sample unlock request (if we have data)
    console.log('\n5. Testing POST /video-unlock/request');
    try {
      // First, let's get some data to create a request
      const sectionsResponse = await axios.get(`${API_URL}/sections`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (sectionsResponse.data.length > 0) {
        const section = sectionsResponse.data[0];
        console.log(`   Using section: ${section.name}`);
        
        // Get students from the section
        const studentsResponse = await axios.get(`${API_URL}/video-unlock/teacher/students?sectionId=${section._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (studentsResponse.data.students && studentsResponse.data.students.length > 0) {
          const student = studentsResponse.data.students[0];
          console.log(`   Using student: ${student.name}`);
          
          // For now, let's just simulate the request structure
          const requestData = {
            studentId: student._id,
            videoId: '507f1f77bcf86cd799439011', // Mock video ID
            unitId: '507f1f77bcf86cd799439011', // Mock unit ID
            courseId: section.courses?.[0] || '507f1f77bcf86cd799439011', // Use first course or mock
            sectionId: section._id,
            reason: 'Student needs additional time to review the material due to technical difficulties',
            priority: 'medium',
            unlockDuration: 48,
            teacherComments: 'Student had internet connectivity issues during the original deadline'
          };
          
          console.log('   Creating unlock request...');
          try {
            const createResponse = await axios.post(`${API_URL}/video-unlock/request`, requestData, {
              headers: { Authorization: `Bearer ${token}` }
            });
            console.log(`✅ Unlock request created successfully!`);
            console.log(`   Request ID: ${createResponse.data.request._id}`);
          } catch (createError) {
            console.log(`⚠️ Create request failed (expected if video/unit don't exist): ${createError.response?.data?.message}`);
          }
        } else {
          console.log('   ⚠️ No students found in section, skipping request creation test');
        }
      } else {
        console.log('   ⚠️ No sections found, skipping request creation test');
      }
    } catch (error) {
      console.log(`❌ Create request test error: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
    }

    console.log('\n🎉 Video unlock API testing completed!');

  } catch (error) {
    console.error('❌ Error during API testing:', error.response?.data?.message || error.message);
  }
}

// Run the test
testVideoUnlockAPI();