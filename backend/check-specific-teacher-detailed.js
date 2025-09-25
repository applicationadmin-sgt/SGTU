const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('./models/User');
const Section = require('./models/Section');
const Course = require('./models/Course');
const Department = require('./models/Department');
const School = require('./models/School');

async function checkSpecificTeacher() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🔗 Connected to MongoDB');
    
    // Find Mukherjee Sourav
    const teacher = await User.findOne({ email: '1109sourav@gmail.com' });
    console.log('\n👨‍🏫 Teacher Info:');
    console.log('Name:', teacher.name);
    console.log('Email:', teacher.email);
    console.log('ID:', teacher._id);
    
    // Check sections where this teacher is assigned
    console.log('\n🔍 Checking section assignments...');
    
    // Check as main teacher
    const mainTeacherSections = await Section.find({ teacher: teacher._id })
      .populate('students', 'name')
      .populate('courses', 'title courseCode');
    
    console.log(`Main teacher in ${mainTeacherSections.length} sections:`);
    mainTeacherSections.forEach((section, i) => {
      console.log(`   ${i + 1}. ${section.name} - ${section.students?.length || 0} students`);
    });
    
    // Check as additional teacher
    const additionalTeacherSections = await Section.find({ teachers: teacher._id })
      .populate('students', 'name')
      .populate('courses', 'title courseCode');
    
    console.log(`Additional teacher in ${additionalTeacherSections.length} sections:`);
    additionalTeacherSections.forEach((section, i) => {
      console.log(`   ${i + 1}. ${section.name} - ${section.students?.length || 0} students`);
    });
    
    // Check coordinated courses
    console.log('\n📚 Checking coordinated courses...');
    const coordinatedCourses = await Course.find({ coordinators: teacher._id })
      .populate('department', 'name')
      .populate('school', 'name');
    
    console.log(`Coordinating ${coordinatedCourses.length} courses:`);
    coordinatedCourses.forEach((course, i) => {
      console.log(`   ${i + 1}. ${course.title} (${course.courseCode})`);
    });
    
    // Check if there are sections that teach the coordinated courses
    if (coordinatedCourses.length > 0) {
      console.log('\n🎯 Sections teaching coordinated courses:');
      for (const course of coordinatedCourses) {
        const sectionsTeachingCourse = await Section.find({ courses: course._id })
          .populate('students', 'name')
          .populate('teacher', 'name email');
        
        console.log(`\nCourse: ${course.title} (${course.courseCode})`);
        console.log(`Sections teaching this course: ${sectionsTeachingCourse.length}`);
        
        sectionsTeachingCourse.forEach((section, i) => {
          console.log(`   ${i + 1}. ${section.name} - ${section.students?.length || 0} students - Teacher: ${section.teacher?.name || 'None'}`);
        });
      }
    }
    
    console.log('\n💡 Analysis:');
    console.log('- Direct sections assigned:', mainTeacherSections.length + additionalTeacherSections.length);
    console.log('- Coordinated courses:', coordinatedCourses.length);
    console.log('- If teacher should have sections, they may need to be manually assigned in the database');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkSpecificTeacher();