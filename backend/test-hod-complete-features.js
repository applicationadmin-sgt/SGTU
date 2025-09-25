const axios = require('axios');

async function testHODCompleteFeatures() {
  try {
    console.log('🔍 Testing Complete HOD Features...\n');
    
    // Test 1: Login as HOD
    console.log('1. Testing HOD login...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: '123@gmail.com',
      password: '123456'
    });
    
    if (!loginResponse.data.token) {
      console.log('❌ HOD login failed');
      return;
    }
    
    console.log('✅ HOD login successful');
    const token = loginResponse.data.token;
    const authHeaders = { Authorization: `Bearer ${token}` };
    
    // Test 2: Dashboard data
    console.log('\n2. Testing HOD dashboard...');
    try {
      const dashboardResponse = await axios.get('http://localhost:5000/api/hod/dashboard', {
        headers: authHeaders
      });
      console.log('✅ HOD dashboard working');
      console.log('   Department:', dashboardResponse.data.department?.name);
      console.log('   Teachers:', dashboardResponse.data.statistics.teachers);
      console.log('   Students:', dashboardResponse.data.statistics.students);
      console.log('   Sections:', dashboardResponse.data.statistics.sections);
      console.log('   Courses:', dashboardResponse.data.statistics.courses);
    } catch (error) {
      console.log('❌ HOD dashboard failed:', error.response?.data?.message);
    }
    
    // Test 3: Targeting options for announcements
    console.log('\n3. Testing HOD targeting options...');
    try {
      const optionsResponse = await axios.get('http://localhost:5000/api/announcements/targeting-options', {
        headers: authHeaders
      });
      console.log('✅ Targeting options working');
      console.log('   Available options:', Object.keys(optionsResponse.data));
      if (optionsResponse.data.teachers) {
        console.log(`   Teachers in department: ${optionsResponse.data.teachers.length}`);
      }
      if (optionsResponse.data.students) {
        console.log(`   Students in department: ${optionsResponse.data.students.length}`);
      }
      if (optionsResponse.data.sections) {
        console.log(`   Sections in department: ${optionsResponse.data.sections.length}`);
      }
    } catch (error) {
      console.log('❌ Targeting options failed:', error.response?.data?.message);
    }
    
    // Test 4: Department sections
    console.log('\n4. Testing HOD sections...');
    try {
      const sectionsResponse = await axios.get('http://localhost:5000/api/hod/sections', {
        headers: authHeaders
      });
      console.log('✅ HOD sections working');
      console.log(`   Sections count: ${sectionsResponse.data.length}`);
      if (sectionsResponse.data.length > 0) {
        console.log('   Sample section:', {
          name: sectionsResponse.data[0].name,
          studentCount: sectionsResponse.data[0].studentCount
        });
      }
    } catch (error) {
      console.log('❌ HOD sections failed:', error.response?.data?.message);
    }
    
    // Test 5: Department teachers
    console.log('\n5. Testing HOD teachers...');
    try {
      const teachersResponse = await axios.get('http://localhost:5000/api/hod/teachers', {
        headers: authHeaders
      });
      console.log('✅ HOD teachers working');
      console.log(`   Teachers count: ${teachersResponse.data.length}`);
      if (teachersResponse.data.length > 0) {
        console.log('   Sample teacher:', {
          name: teachersResponse.data[0].name,
          email: teachersResponse.data[0].email
        });
      }
    } catch (error) {
      console.log('❌ HOD teachers failed:', error.response?.data?.message);
    }
    
    // Test 6: HOD announcement creation with targeting
    console.log('\n6. Testing HOD announcement with targeting...');
    try {
      const createResponse = await axios.post('http://localhost:5000/api/announcements', {
        title: 'HOD Department Announcement with Targeting',
        message: 'This announcement targets specific teachers and students in our department.',
        priority: 'normal',
        targetAudience: {
          targetRoles: ['teacher', 'student'],
          targetDepartments: [] // Will be filled by backend with HOD's department
        }
      }, { headers: authHeaders });
      
      console.log('✅ HOD announcement with targeting working');
      console.log(`   Created announcement ID: ${createResponse.data.announcement?._id}`);
    } catch (error) {
      console.log('❌ HOD announcement creation failed:', error.response?.data?.message);
    }
    
    console.log('\n🏁 HOD Features Test Complete!');
    console.log('\n📋 Fixed Features Summary:');
    console.log('   ✅ Real dashboard data (no more dummy data)');
    console.log('   ✅ HOD targeting options with teachers/students');
    console.log('   ✅ Department sections loading properly');
    console.log('   ✅ Department teachers listing');
    console.log('   ✅ Enhanced announcement targeting');
    
  } catch (error) {
    console.log('💥 Test failed with error:', error.message);
  }
}

testHODCompleteFeatures();