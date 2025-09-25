const mongoose = require('mongoose');
require('dotenv').config();

const Section = require('./models/Section');
const User = require('./models/User');
const Course = require('./models/Course');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log('Connected to MongoDB');
  
  // Check if there are any students assigned to sections
  const sections = await Section.find({})
    .populate('students', 'name email regNo')
    .populate('courses', 'title')
    .populate('teacher', 'name');
  
  console.log('All sections with students:');
  sections.forEach((section, index) => {
    console.log(`Section ${index + 1}: ${section.name}`);
    console.log('  Students:', section.students?.length || 0);
    if (section.students?.length > 0) {
      section.students.forEach(student => {
        console.log(`    - ${student.name} (ID: ${student._id}) Email: ${student.email}`);
      });
    }
    console.log('  Courses:', section.courses?.length || 0);
    console.log('  Teacher:', section.teacher?.name || 'None');
    console.log('');
  });
  
  process.exit();
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});