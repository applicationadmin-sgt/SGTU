const axios = require('axios');

async function testDeanCourseRelations() {
  try {
    console.log('=== Testing Dean Course Relations ===\n');

    // Step 1: Login as Dean
    console.log('1. Attempting Dean login...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'sourav@gmail.com',
      password: '123456'
    });
    
    const token = loginResponse.data.token;
    const user = loginResponse.data.user;
    console.log('✅ Dean login successful');
    console.log(`   User: ${user.name} (${user.role})`);
    console.log(`   Token: ${token.substring(0, 20)}...`);

    const authHeaders = { Authorization: `Bearer ${token}` };

    // Step 2: Get Dean Overview
    console.log('\n2. Testing Dean overview...');
    const overviewResponse = await axios.get('http://localhost:5000/api/dean/overview', {
      headers: authHeaders
    });
    console.log('✅ Dean overview accessible');
    console.log(`   School: ${overviewResponse.data.school.name}`);
    console.log(`   Stats: ${JSON.stringify(overviewResponse.data.stats)}`);

    // Step 3: Get Departments
    console.log('\n3. Getting departments...');
    const deptResponse = await axios.get('http://localhost:5000/api/dean/departments', {
      headers: authHeaders
    });
    console.log('✅ Departments accessible');
    
    const mechatronicsDept = deptResponse.data.departments.find(d => 
      d.name.toLowerCase().includes('mecatronics') || d.name.toLowerCase().includes('mechatronics')
    );
    
    if (!mechatronicsDept) {
      console.log('❌ Mechatronics department not found');
      return;
    }
    
    console.log(`   Mechatronics Department: ${mechatronicsDept.name}`);
    console.log(`   Teachers: ${mechatronicsDept.counts.teachers}`);
    console.log(`   Courses: ${mechatronicsDept.counts.courses}`);
    console.log(`   Students: ${mechatronicsDept.counts.students}`);

    // Step 4: Get Department Courses
    console.log('\n4. Getting department courses...');
    const coursesResponse = await axios.get(`http://localhost:5000/api/dean/department/${mechatronicsDept._id}/courses`, {
      headers: authHeaders
    });
    console.log('✅ Department courses accessible');
    console.log(`   Found ${coursesResponse.data.courses.length} courses:`);
    
    let targetCourse = null;
    coursesResponse.data.courses.forEach(course => {
      console.log(`   - ${course.title} (${course.courseCode})`);
      if (course.title === '1247' || course.courseCode === 'C000007') {
        targetCourse = course;
      }
    });

    if (!targetCourse) {
      console.log('❌ Course 1247/C000007 not found');
      return;
    }

    // Step 5: Get Course Relations (BEFORE FIX)
    console.log(`\n5. Testing course relations for ${targetCourse.title}...`);
    try {
      const relationsResponse = await axios.get(`http://localhost:5000/api/dean/course/${targetCourse._id}/relations`, {
        headers: authHeaders
      });
      console.log('✅ Course relations accessible');
      console.log(`   Teachers: ${relationsResponse.data.teachers.length}`);
      console.log(`   Students: ${relationsResponse.data.students.length}`);
      
      if (relationsResponse.data.teachers.length > 0) {
        console.log('   Teacher details:');
        relationsResponse.data.teachers.forEach(t => {
          console.log(`     - ${t.name} (${t.email}) - ID: ${t.teacherId}`);
        });
      } else {
        console.log('   ❌ No teachers found - this is the issue!');
      }
      
      if (relationsResponse.data.students.length > 0) {
        console.log('   Student details:');
        relationsResponse.data.students.forEach(s => {
          console.log(`     - ${s.name} (${s.email}) - Reg: ${s.regNo}`);
        });
      }
    } catch (error) {
      console.log('❌ Course relations failed:', error.response?.data?.message || error.message);
    }

    console.log('\n=== Test Complete ===');
    console.log('If teachers = 0, the issue is in the getCourseRelations function');
    console.log('It needs to check both section assignments AND User.coursesAssigned');

  } catch (error) {
    console.error('❌ Error:', error.response?.data?.message || error.message);
  }
}

testDeanCourseRelations();