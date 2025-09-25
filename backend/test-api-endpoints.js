const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function getAuthToken() {
  try {
    console.log('🔐 Getting authentication token...');
    
    // Try to login as admin
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

async function testCourseTeacherAPI() {
  try {
    // First get a valid token
    const token = await getAuthToken();
    if (!token) {
      console.log('❌ Could not get valid token, aborting test');
      return;
    }
    
    console.log('\n🔍 Testing Course-Teacher Assignment APIs...\n');

    // First, let's get all sections to find one with courses
    console.log('1. Getting all sections...');
    const sectionsResponse = await axios.get(`${API_URL}/sections`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(`✅ Found ${sectionsResponse.data.length} sections`);
    
    // Find a section with courses
    const sectionWithCourses = sectionsResponse.data.find(s => s.courses && s.courses.length > 0);
    
    if (!sectionWithCourses) {
      console.log('❌ No sections with courses found');
      return;
    }
    
    console.log(`✅ Using section: ${sectionWithCourses.name} with ${sectionWithCourses.courses.length} courses`);
    const sectionId = sectionWithCourses._id;

    // Test 1: Get unassigned courses
    console.log('\n2. Testing GET /sections/:sectionId/unassigned-courses');
    try {
      const unassignedResponse = await axios.get(`${API_URL}/sections/${sectionId}/unassigned-courses`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log(`✅ Unassigned courses: ${unassignedResponse.data.unassignedCourses.length}`);
      unassignedResponse.data.unassignedCourses.forEach((course, index) => {
        console.log(`   ${index + 1}. ${course.title} (${course.courseCode})`);
      });
    } catch (error) {
      console.log(`❌ Error getting unassigned courses: ${error.response?.data?.message || error.message}`);
    }

    // Test 2: Get current course-teacher assignments
    console.log('\n3. Testing GET /sections/:sectionId/course-teachers');
    try {
      const assignmentsResponse = await axios.get(`${API_URL}/sections/${sectionId}/course-teachers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log(`✅ Current assignments: ${assignmentsResponse.data.assignments.length}`);
      assignmentsResponse.data.assignments.forEach((assignment, index) => {
        console.log(`   ${index + 1}. ${assignment.course?.title} -> ${assignment.teacher?.name}`);
      });
    } catch (error) {
      console.log(`❌ Error getting assignments: ${error.response?.data?.message || error.message}`);
    }

    // Test 3: Try to assign a teacher to a course (if there are unassigned courses)
    console.log('\n4. Testing POST /sections/:sectionId/assign-course-teacher');
    try {
      // First get unassigned courses again
      const unassignedResponse = await axios.get(`${API_URL}/sections/${sectionId}/unassigned-courses`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (unassignedResponse.data.unassignedCourses.length > 0) {
        const courseToAssign = unassignedResponse.data.unassignedCourses[0];
        
        // Get available teachers
        const teachersResponse = await axios.get(`${API_URL}/sections`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Try to find a teacher ID (let's use a hardcoded one for now)
        const teacherId = '660ce40b687be5ed8e00c341'; // Teacher 1 ID from our test data
        
        console.log(`   Attempting to assign teacher ${teacherId} to course ${courseToAssign.title}...`);
        
        const assignResponse = await axios.post(`${API_URL}/sections/${sectionId}/assign-course-teacher`, {
          courseId: courseToAssign._id,
          teacherId: teacherId
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log(`✅ Assignment successful: ${assignResponse.data.message}`);
        console.log(`   Assignment details:`, assignResponse.data.assignment);
        
        // Test 4: Remove the assignment we just created
        console.log('\n5. Testing DELETE /sections/:sectionId/course/:courseId/teacher');
        try {
          const removeResponse = await axios.delete(`${API_URL}/sections/${sectionId}/course/${courseToAssign._id}/teacher`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          console.log(`✅ Assignment removal successful: ${removeResponse.data.message}`);
        } catch (removeError) {
          console.log(`❌ Error removing assignment: ${removeError.response?.data?.message || removeError.message}`);
        }
        
      } else {
        console.log('   ⚠️ No unassigned courses available for testing assignment');
      }
    } catch (error) {
      console.log(`❌ Error assigning teacher: ${error.response?.data?.message || error.message}`);
    }

    console.log('\n🎉 API testing completed!');

  } catch (error) {
    console.error('❌ Error during API testing:', error.response?.data?.message || error.message);
  }
}

// Run the test
testCourseTeacherAPI();