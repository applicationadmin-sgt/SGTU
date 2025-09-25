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

async function testCourseTeacherAPIWithRealData() {
  try {
    // First get a valid token
    const token = await getAuthToken();
    if (!token) {
      console.log('❌ Could not get valid token, aborting test');
      return;
    }
    
    console.log('\n🔍 Testing Course-Teacher Assignment with Real Data...\n');

    // Get sections
    console.log('1. Getting sections...');
    const sectionsResponse = await axios.get(`${API_URL}/sections`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const sectionWithCourses = sectionsResponse.data.find(s => s.courses && s.courses.length > 0);
    if (!sectionWithCourses) {
      console.log('❌ No sections with courses found');
      return;
    }
    
    console.log(`✅ Found section: ${sectionWithCourses.name} with ${sectionWithCourses.courses.length} courses`);
    const sectionId = sectionWithCourses._id;

    // Get teachers from the admin API
    console.log('\n2. Getting available teachers...');
    try {
      const teachersResponse = await axios.get(`${API_URL}/admin/teachers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const teachers = teachersResponse.data;
      
      if (teachers.length === 0) {
        console.log('❌ No teachers found in the system');
        return;
      }
      
      console.log(`✅ Found ${teachers.length} teachers:`);
      teachers.slice(0, 5).forEach((teacher, index) => {
        console.log(`   ${index + 1}. ${teacher.name} (${teacher.email}) - ID: ${teacher._id}`);
      });
      
      // Test with the first teacher
      const teacherToAssign = teachers[0];
      
      // Get unassigned courses
      console.log('\n3. Getting unassigned courses...');
      const unassignedResponse = await axios.get(`${API_URL}/sections/${sectionId}/unassigned-courses`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (unassignedResponse.data.unassignedCourses.length === 0) {
        console.log('❌ No unassigned courses available');
        return;
      }
      
      const courseToAssign = unassignedResponse.data.unassignedCourses[0];
      console.log(`✅ Will assign course: ${courseToAssign.title} (${courseToAssign.courseCode})`);
      
      // Test the assignment
      console.log('\n4. Testing course-teacher assignment...');
      const assignResponse = await axios.post(`${API_URL}/sections/${sectionId}/assign-course-teacher`, {
        courseId: courseToAssign._id,
        teacherId: teacherToAssign._id
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log(`✅ Assignment successful: ${assignResponse.data.message}`);
      console.log('   Assignment details:');
      console.log(`   - Course: ${assignResponse.data.assignment.course.title}`);
      console.log(`   - Teacher: ${assignResponse.data.assignment.teacher.name}`);
      console.log(`   - Date: ${new Date(assignResponse.data.assignment.assignedAt).toLocaleString()}`);
      
      // Verify the assignment
      console.log('\n5. Verifying assignment...');
      const assignmentsResponse = await axios.get(`${API_URL}/sections/${sectionId}/course-teachers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log(`✅ Verified: ${assignmentsResponse.data.assignments.length} assignments now exist`);
      assignmentsResponse.data.assignments.forEach((assignment, index) => {
        console.log(`   ${index + 1}. ${assignment.course?.title} -> ${assignment.teacher?.name}`);
      });
      
      // Test removal
      console.log('\n6. Testing assignment removal...');
      const removeResponse = await axios.delete(`${API_URL}/sections/${sectionId}/course/${courseToAssign._id}/teacher`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log(`✅ Removal successful: ${removeResponse.data.message}`);
      
      // Final verification
      console.log('\n7. Final verification...');
      const finalAssignmentsResponse = await axios.get(`${API_URL}/sections/${sectionId}/course-teachers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log(`✅ Final verification: ${finalAssignmentsResponse.data.assignments.length} assignments remain`);
      
    } catch (error) {
      console.log(`❌ Error getting teachers: ${error.response?.data?.message || error.message}`);
      return;
    }

    console.log('\n🎉 API testing completed!');

  } catch (error) {
    console.error('❌ Error during API testing:', error.response?.data?.message || error.message);
  }
}

// Run the test
testCourseTeacherAPIWithRealData();