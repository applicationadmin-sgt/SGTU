const axios = require('axios');

async function testHODTeacherManagement() {
  try {
    console.log('=== Testing HOD Teacher Management ===\n');

    // Step 1: Login as HOD
    console.log('1. Attempting HOD login...');
    let hodToken;
    try {
      const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
        email: '123@gmail.com',
        password: '123456'
      });
      hodToken = loginResponse.data.token;
      console.log('✅ HOD login successful');
      console.log(`   Token: ${hodToken.substring(0, 20)}...`);
      console.log(`   User: ${loginResponse.data.user.name} (${loginResponse.data.user.role})`);
    } catch (loginError) {
      console.log('❌ HOD login failed:', loginError.response?.data?.message || loginError.message);
      console.log('   Please ensure the HOD user exists and has correct credentials');
      return;
    }

    const authHeaders = { Authorization: `Bearer ${hodToken}` };

    // Step 2: Test HOD Dashboard (to get department info)
    console.log('\n2. Testing HOD dashboard access...');
    let dashResponse;
    try {
      dashResponse = await axios.get('http://localhost:5000/api/hod/dashboard', {
        headers: authHeaders
      });
      console.log('✅ HOD dashboard accessible');
      if (dashResponse.data.department) {
        console.log(`   Department: ${dashResponse.data.department.name}`);
        console.log(`   Statistics: ${JSON.stringify(dashResponse.data.statistics)}`);
      } else {
        console.log('⚠️  HOD has no department assigned');
      }
    } catch (dashError) {
      console.log('❌ HOD dashboard failed:', dashError.response?.data?.message || dashError.message);
      return;
    }

    // Step 3: Test HOD Teachers endpoint
    console.log('\n3. Testing HOD teachers endpoint...');
    try {
      const teachersResponse = await axios.get('http://localhost:5000/api/hod/teachers', {
        headers: authHeaders
      });
      console.log('✅ HOD teachers endpoint accessible');
      console.log(`   Found ${teachersResponse.data.length} teachers`);
      
      if (teachersResponse.data.length > 0) {
        const teacher = teachersResponse.data[0];
        console.log(`   Sample teacher: ${teacher.name} (${teacher.email})`);
        console.log(`   Courses: ${teacher.coursesAssigned?.length || 0}`);
        console.log(`   Sections: ${teacher.assignedSections?.length || 0}`);
        
        // Test teacher management operations if we have a teacher
        if (teacher._id) {
          console.log('\n4. Testing teacher management operations...');
          
          // Test getting department courses
          try {
            const coursesResponse = await axios.get(`http://localhost:5000/api/courses/department/${dashResponse.data.department._id}`, {
              headers: authHeaders
            });
            console.log(`✅ Department courses accessible (${coursesResponse.data.length} courses)`);
            if (coursesResponse.data.length > 0) {
              console.log(`   Sample course: ${coursesResponse.data[0].title}`);
            }
          } catch (e) {
            console.log('❌ Failed to get department courses:', e.response?.data?.message || e.message);
          }
          
          // Test getting department sections
          try {
            const sectionsResponse = await axios.get('http://localhost:5000/api/hod/sections', {
              headers: authHeaders
            });
            console.log(`✅ HOD sections accessible (${sectionsResponse.data.length} sections)`);
          } catch (e) {
            console.log('❌ Failed to get HOD sections:', e.response?.data?.message || e.message);
          }
        }
      } else {
        console.log('⚠️  No teachers found in HOD\'s department');
      }
    } catch (teachersError) {
      console.log('❌ HOD teachers endpoint failed:', teachersError.response?.data?.message || teachersError.message);
      if (teachersError.response?.status === 404) {
        console.log('   This suggests the HOD has no department assigned');
      }
    }

    // Step 4: Test frontend accessibility
    console.log('\n5. Testing frontend HOD teachers page...');
    try {
      const frontendResponse = await axios.get('http://localhost:3000/hod/teachers');
      console.log('✅ Frontend HOD teachers page accessible');
    } catch (frontendError) {
      console.log('❌ Frontend HOD teachers page failed:', frontendError.message);
    }

    console.log('\n=== Test Complete ===');
    
  } catch (error) {
    console.error('❌ Unexpected error during testing:', error.message);
  }
}

// Run the test
testHODTeacherManagement();