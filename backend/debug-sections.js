const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sgt-learning');

const Section = require('./models/Section');
const Course = require('./models/Course');
const User = require('./models/User');

async function checkSections() {
  console.log('=== Checking Sections and Students ===');
  
  const sections = await Section.find()
    .populate('teacher', 'name email')
    .populate('courses', 'title courseCode')
    .populate('students', 'name email regNo');
  
  console.log('Total sections found:', sections.length);
  
  sections.forEach((section, i) => {
    console.log(`Section ${i + 1}: ${section.name}`);
    console.log('  Teacher:', section.teacher?.name || 'No teacher');
    console.log('  Courses:', section.courses?.map(c => c.title).join(', ') || 'No courses');
    console.log('  Students:', section.students?.length || 0);
    if (section.students?.length > 0) {
      section.students.forEach(student => {
        console.log(`    - ${student.name} (${student.regNo || 'No regNo'})`);
      });
    }
  });
  
  const courses = await Course.find()
    .populate('students', 'name email regNo');
  
  console.log('\n=== Courses with Students ===');
  courses.forEach(course => {
    if (course.students?.length > 0) {
      console.log(`Course: ${course.title} (${course.courseCode}) - Students: ${course.students.length}`);
      course.students.forEach(student => {
        console.log(`  - ${student.name} (${student.regNo || 'No regNo'})`);
      });
    }
  });
  
  mongoose.disconnect();
}

checkSections().catch(console.error);