const mongoose = require('mongoose');
const User = require('./models/User');
const Course = require('./models/Course');
const Section = require('./models/Section');
const SectionCourseTeacher = require('./models/SectionCourseTeacher');
const axios = require('axios');

async function testHODAPI() {
  try {
    // First test the database connection
    await mongoose.connect('mongodb://localhost:27017/sgt3');
    console.log('Connected to MongoDB (sgt3)');
    
    // Check the COSMO-1 section specifically
    const section = await Section.findById('68d2456736ef1c0112d32226');
    console.log('\n=== SECTION COSMO-1 ===');
    console.log('Section found:', section ? section.name : 'NOT FOUND');
    
    if (section) {
      // Check students assigned to this section
      const students = await User.find({
        $or: [{ role: 'student' }, { roles: 'student' }],
        isActive: { $ne: false },
        assignedSections: section._id
      }).select('name email assignedSections');
      
      console.log('Students assigned to section:', students.length);
      students.forEach(s => {
        console.log(`- Student: ${s.name} (${s.email})`);
      });
      
      // Check SectionCourseTeacher records for this section
      const sctRecords = await SectionCourseTeacher.find({ section: section._id })
        .populate('course', 'title courseCode')
        .populate('teacher', 'name');
        
      console.log('\nSectionCourseTeacher records:', sctRecords.length);
      sctRecords.forEach(sct => {
        console.log(`- Teacher: ${sct.teacher?.name}, Course: ${sct.course?.title} (${sct.course?.courseCode})`);
      });
    }
    
    // Test login and API calls
    console.log('\n=== TESTING API ===');
    try {
      // Login as HOD Ritik
      const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
        email: 'ritik@example.com',  // Update with correct HOD email
        password: '123456'
      });
      
      const token = loginResponse.data.token;
      console.log('Login successful, token received');
      
      // Test HOD sections endpoint
      const sectionsResponse = await axios.get('http://localhost:5000/api/hod/sections', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('\nHOD Sections API response:');
      console.log('Sections found:', sectionsResponse.data.sections?.length || 0);
      sectionsResponse.data.sections?.forEach(s => {
        console.log(`- Section: ${s.name}, Students: ${s.studentCount}, Courses: ${s.courseCount}`);
      });
      
      // Test specific section analytics
      if (sectionsResponse.data.sections?.length > 0) {
        const firstSection = sectionsResponse.data.sections[0];
        const analyticsResponse = await axios.get(`http://localhost:5000/api/hod/sections/${firstSection._id}/analytics`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('\nSection Analytics API response:');
        console.log('Total students:', analyticsResponse.data.statistics?.totalStudents || 0);
        console.log('Total courses:', analyticsResponse.data.statistics?.totalCourses || 0);
      }
      
    } catch (apiError) {
      console.log('API Error:', apiError.response?.data?.message || apiError.message);
    }
    
    mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    mongoose.connection.close();
  }
}

testHODAPI();