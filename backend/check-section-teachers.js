const mongoose = require('mongoose');
require('dotenv').config();
const Section = require('./models/Section');
const User = require('./models/User');
const Course = require('./models/Course');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  try {
    console.log('Checking section and teacher data...');
    
    // Find the section
    const section = await Section.findById('68d4ea7697c9f2c4a2e45bff').populate('teachers students courses');
    console.log('\n=== SECTION DATA ===');
    console.log('Section ID:', section._id);
    console.log('Section Name:', section.name);
    console.log('Teachers in section:', section.teachers.length);
    section.teachers.forEach(teacher => {
      console.log(`  - ${teacher.name} (${teacher.email}) - ID: ${teacher._id}`);
    });
    
    // Find the teacher
    const teacher = await User.findOne({ email: 'teacherpawan@gmail.com' });
    console.log('\n=== TEACHER DATA ===');
    console.log('Teacher ID:', teacher._id);
    console.log('Teacher Email:', teacher.email);
    console.log('Teacher Roles:', teacher.roles);
    
    // Check if teacher is in section
    const isTeacherInSection = section.teachers.some(t => t._id.toString() === teacher._id.toString());
    console.log('\n=== ACCESS CHECK ===');
    console.log('Is teacher in section?', isTeacherInSection);
    
    process.exit();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
});