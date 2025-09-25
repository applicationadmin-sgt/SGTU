const mongoose = require('mongoose');
const Section = require('./models/Section');
const Course = require('./models/Course');
const User = require('./models/User');
const SectionCourseTeacher = require('./models/SectionCourseTeacher');

async function checkAstroChemistryStudents() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sgt_db');
    console.log('Connected to database');
    
    const courseId = '68cba8b0af91a41ca931936b';
    console.log('Checking AstroChemistry course:', courseId);
    
    // Find the course
    const course = await Course.findById(courseId);
    if (!course) {
      console.log('Course not found!');
      process.exit(1);
    }
    console.log(`Found course: ${course.title} (${course.courseCode})`);
    
    // Find sections that contain this course
    const sections = await Section.find({ courses: courseId })
      .populate('students', 'name email regNo')
      .populate('courses', 'title courseCode');
    
    console.log(`\nFound ${sections.length} sections containing this course:`);
    sections.forEach((section, index) => {
      console.log(`${index + 1}. Section: ${section.name}`);
      console.log(`   Students: ${section.students?.length || 0}`);
      console.log(`   Courses: ${section.courses?.map(c => c.courseCode).join(', ')}`);
      if (section.students?.length > 0) {
        section.students.forEach((student, i) => {
          console.log(`     ${i + 1}. ${student.name} (${student.regNo}) - ${student.email}`);
        });
      }
      console.log('');
    });
    
    // Check teacher assignments for this course
    console.log('Teacher assignments for this course:');
    const assignments = await SectionCourseTeacher.find({ 
      course: courseId, 
      isActive: true 
    })
    .populate('teacher', 'name email')
    .populate('section', 'name')
    .populate('course', 'title courseCode');
    
    console.log(`Found ${assignments.length} active teacher assignments:`);
    assignments.forEach((assignment, index) => {
      console.log(`${index + 1}. Teacher: ${assignment.teacher?.name} (${assignment.teacher?.email})`);
      console.log(`   Section: ${assignment.section?.name}`);
      console.log(`   Course: ${assignment.course?.title} (${assignment.course?.courseCode})`);
      console.log('');
    });
    
    mongoose.disconnect();
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkAstroChemistryStudents();