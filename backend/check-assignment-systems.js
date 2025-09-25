const mongoose = require('mongoose');
const User = require('./models/User');
const Course = require('./models/Course');
const Section = require('./models/Section');
const SectionCourseTeacher = require('./models/SectionCourseTeacher');

async function checkAssignmentSystems() {
  try {
    await mongoose.connect('mongodb://localhost:27017/sgt3');
    console.log('Connected to MongoDB (sgt3)');
    
    // Find teachers with coursesAssigned
    const teachersWithCourses = await User.find({
      coursesAssigned: { $exists: true, $ne: [] }
    }).select('name coursesAssigned roles role');
    
    console.log('\n=== LEGACY SYSTEM (coursesAssigned) ===');
    console.log('Teachers with coursesAssigned:', teachersWithCourses.length);
    teachersWithCourses.forEach(t => {
      console.log(`- ${t.name}: ${t.coursesAssigned.length} courses (role: ${t.role}, roles: ${t.roles})`);
    });
    
    // Find SectionCourseTeacher records
    const sctRecords = await SectionCourseTeacher.find({})
      .populate('teacher', 'name')
      .populate('course', 'name')
      .populate('section', 'name');
      
    console.log('\n=== NEW SYSTEM (SectionCourseTeacher) ===');
    console.log('SectionCourseTeacher records:', sctRecords.length);
    sctRecords.forEach(sct => {
      console.log(`- Teacher: ${sct.teacher?.name}, Course: ${sct.course?.name}, Section: ${sct.section?.name}`);
    });
    
    // Check if same teachers are in both systems
    const sctTeacherIds = sctRecords.map(sct => sct.teacher?._id.toString()).filter(Boolean);
    const legacyTeacherIds = teachersWithCourses.map(t => t._id.toString());
    
    console.log('\n=== COMPARISON ===');
    console.log('Teachers ONLY in legacy system:', legacyTeacherIds.filter(id => !sctTeacherIds.includes(id)).length);
    console.log('Teachers ONLY in new system:', sctTeacherIds.filter(id => !legacyTeacherIds.includes(id)).length);
    console.log('Teachers in BOTH systems:', legacyTeacherIds.filter(id => sctTeacherIds.includes(id)).length);
    
    mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    mongoose.connection.close();
  }
}

checkAssignmentSystems();