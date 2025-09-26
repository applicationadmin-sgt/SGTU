const SectionCourseTeacher = require('./models/SectionCourseTeacher');
const Course = require('./models/Course');
const User = require('./models/User');
const Section = require('./models/Section');
const Department = require('./models/Department');
const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  try {
    const hod = await User.findOne({email: 'pawanhod@gmail.com'}).populate('department');
    console.log('HOD department:', hod.department?.name, 'ID:', hod.department?._id);

    // Check sections
    const sections = await Section.find({}).lean();
    console.log('\nSections in database:');
    sections.forEach((section, i) => {
      console.log(`${i+1}. ${section.name} (code: ${section.code}) - ID: ${section._id}`);
    });

    // Check SectionCourseTeacher assignments
    const scts = await SectionCourseTeacher.find({}).populate('course').populate('section').lean();
    console.log('\nSectionCourseTeacher assignments:', scts.length);
    scts.forEach((sct, i) => {
      console.log(`${i+1}. Section: ${sct.section?.name}, Course: ${sct.course?.title} (${sct.course?.courseCode})`);
      console.log(`    Course Dept: ${sct.course?.department}, HOD Dept: ${hod.department?._id}`);
      console.log(`    Match: ${sct.course?.department?.toString() === hod.department?._id?.toString()}`);
    });

    // Check courses in HOD's department
    const courses = await Course.find({ department: hod.department._id }).lean();
    console.log('\nCourses in HOD\'s department:', courses.length);
    courses.forEach((course, i) => {
      console.log(`${i+1}. ${course.title} (${course.courseCode}) - ID: ${course._id}`);
    });

  } catch (error) {
    console.error('Error:', error);
  }
  process.exit();
});