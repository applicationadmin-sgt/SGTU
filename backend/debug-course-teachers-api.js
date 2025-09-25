const axios = require('axios');

async function debugCourseTeachers() {
  try {
    console.log('=== Debug Course Teachers in Dean School Management ===\n');

    // Login as dean first
    console.log('1. Logging in as dean...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'dean@example.com', // You may need to adjust this
      password: 'password123'
    });
    const deanToken = loginResponse.data.token;
    console.log('✅ Dean login successful');

    const headers = { Authorization: `Bearer ${deanToken}` };

    // Get departments
    console.log('\n2. Getting departments...');
    const deptResponse = await axios.get('http://localhost:5000/api/dean/departments', { headers });
    const mechatronicsDept = deptResponse.data.departments.find(d => d.name.toLowerCase().includes('mecatronics'));
    
    if (!mechatronicsDept) {
      console.log('❌ Mechatronics department not found');
      return;
    }
    console.log('✅ Found mechatronics department:', mechatronicsDept.name);
    console.log(`   Department counts: ${JSON.stringify(mechatronicsDept.counts)}`);

    // Get courses in mechatronics
    console.log('\n3. Getting courses in mechatronics...');
    const coursesResponse = await axios.get(`http://localhost:5000/api/dean/department/${mechatronicsDept._id}/courses`, { headers });
    const course1247 = coursesResponse.data.courses.find(c => c.title === '1247' || c.courseCode === 'C000007');
    
    if (!course1247) {
      console.log('❌ Course 1247 not found');
      console.log('Available courses:', coursesResponse.data.courses.map(c => `${c.title} (${c.courseCode})`));
      return;
    }
    console.log('✅ Found course 1247:', course1247.title, `(${course1247.courseCode})`);

    // Get course relations (teachers and students)
    console.log('\n4. Getting course relations...');
    const relationsResponse = await axios.get(`http://localhost:5000/api/dean/course/${course1247._id}/relations`, { headers });
    
    console.log('Course relations result:');
    console.log(`- Teachers: ${relationsResponse.data.teachers.length}`);
    relationsResponse.data.teachers.forEach(t => {
      console.log(`  * ${t.name} (${t.email}) - ID: ${t.teacherId}`);
    });
    console.log(`- Students: ${relationsResponse.data.students.length}`);
    relationsResponse.data.students.forEach(s => {
      console.log(`  * ${s.name} (${s.email}) - Reg: ${s.regNo}`);
    });

    console.log('\n=== Analysis ===');
    if (relationsResponse.data.teachers.length === 0) {
      console.log('❌ ISSUE FOUND: No teachers showing for course');
      console.log('This means:');
      console.log('1. Teacher might not be assigned to any section containing this course');
      console.log('2. Or sections containing this course have no teacher assigned');
      console.log('3. Or teacher assignment is tracked differently');
    } else {
      console.log('✅ Teachers are showing correctly');
    }

  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.message?.includes('Dean is not assigned')) {
      console.log('❌ Dean user is not assigned to any school');
      console.log('Try with HOD credentials instead...');
      
      // Try with HOD
      try {
        console.log('\n--- Trying with HOD credentials ---');
        const hodLogin = await axios.post('http://localhost:5000/api/auth/login', {
          email: '123@gmail.com',
          password: '123456'
        });
        const hodHeaders = { Authorization: `Bearer ${hodLogin.data.token}` };
        
        const teachersResponse = await axios.get('http://localhost:5000/api/hod/teachers', { headers: hodHeaders });
        console.log(`✅ HOD can see ${teachersResponse.data.length} teachers:`);
        teachersResponse.data.forEach(t => {
          console.log(`- ${t.name} (${t.email})`);
          console.log(`  Courses: ${t.coursesAssigned?.length || 0}`);
          console.log(`  Sections: ${t.assignedSections?.length || 0}`);
        });
        
      } catch (hodError) {
        console.log('❌ HOD test failed:', hodError.response?.data?.message || hodError.message);
      }
    } else {
      console.log('❌ Error:', error.response?.data?.message || error.message);
    }
  }
}

debugCourseTeachers();