const axios = require('axios');

const testHODSectionsData = async () => {
  try {
    console.log('🧪 Testing HOD Sections Data API...\n');

    // HOD login
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'pawanhod@gmail.com',
      password: 'pawanhod@gmail.com'
    });

    const token = loginResponse.data.token;
    console.log('✅ HOD logged in successfully\n');

    // Test HOD sections endpoint
    console.log('📋 Testing HOD Sections API...');
    const sectionsResponse = await axios.get('http://localhost:5000/api/hod/sections', {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log(`✅ Found ${sectionsResponse.data.sections.length} sections\n`);

    // Display detailed section data
    sectionsResponse.data.sections.forEach((section, index) => {
      console.log(`📍 Section ${index + 1}: ${section.name} (${section.code})`);
      console.log(`   ID: ${section._id}`);
      console.log(`   Students: ${section.students?.length || section.studentCount || 0}`);
      console.log(`   Courses: ${section.courses?.length || section.courseCount || 0}`);
      
      if (section.students && section.students.length > 0) {
        console.log('   👥 Students:');
        section.students.forEach(student => {
          console.log(`      - ${student.name} (${student.studentId || student.email})`);
        });
      }
      
      if (section.courses && section.courses.length > 0) {
        console.log('   📚 Courses:');
        section.courses.forEach(course => {
          console.log(`      - ${course.title} (${course.courseCode}) [ID: ${course._id}]`);
        });
      }
      
      console.log('');
    });

    // Test group chat navigation data
    if (sectionsResponse.data.sections.length > 0) {
      const firstSection = sectionsResponse.data.sections[0];
      if (firstSection.courses && firstSection.courses.length > 0) {
        const firstCourse = firstSection.courses[0];
        console.log('🔗 Group Chat URL would be:');
        console.log(`   /group-chat/${firstCourse._id}/${firstSection._id}`);
        console.log(`   Course: ${firstCourse.title} (${firstCourse.courseCode})`);
        console.log(`   Section: ${firstSection.name} (${firstSection.code})`);
      } else {
        console.log('⚠️ No courses found in sections - group chat buttons won\'t work');
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data?.message || error.message);
    if (error.response?.data) {
      console.log('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
};

// Run the test
testHODSectionsData();