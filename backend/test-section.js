const mongoose = require('mongoose');
const User = require('./models/User');
const Section = require('./models/Section');
const SectionCourseTeacher = require('./models/SectionCourseTeacher');

async function testSectionAnalytics() {
  try {
    await mongoose.connect('mongodb://localhost:27017/sgt3');
    console.log('Connected to MongoDB');
    
    const sectionId = '68d2456736ef1c0112d32226'; // COSMO-1
    
    // Test the same logic as getSpecificSectionAnalytics
    const section = await Section.findById(sectionId);
    console.log('Section found:', section ? section.name : 'NOT FOUND');
    
    // Get students assigned to this section
    const sectionStudents = await User.find({
      $or: [{ role: 'student' }, { roles: 'student' }],
      isActive: { $ne: false },
      assignedSections: sectionId
    }).select('name email rollNumber');
    
    console.log('\nStudents found:', sectionStudents.length);
    sectionStudents.forEach(s => console.log('- ' + s.name + ' (' + s.email + ')'));
    
    // Get courses for this section
    const sectionCourseTeachers = await SectionCourseTeacher.find({ section: sectionId })
      .populate('course', 'title courseCode')
      .populate('teacher', 'name');
    
    console.log('\nCourses found:', sectionCourseTeachers.length);
    sectionCourseTeachers.forEach(sct => {
      console.log('- Course:', sct.course?.title, '(' + sct.course?.courseCode + ')', 'Teacher:', sct.teacher?.name);
    });
    
    mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    mongoose.connection.close();
  }
}

testSectionAnalytics();