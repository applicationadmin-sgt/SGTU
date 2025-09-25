const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Section = require('./models/Section');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log('Connected to MongoDB');
  
  // Get all students (users with role 'student')
  const allStudents = await User.find({ role: 'student' }).select('_id name email regNo');
  console.log('All students in database:');
  allStudents.forEach((student, index) => {
    console.log(`Student ${index + 1}: ${student.name} (ID: ${student._id}) Email: ${student.email}`);
  });
  
  console.log('\n--- Section Assignments ---');
  
  // Check which students are assigned to sections
  const sections = await Section.find({}).populate('students', 'name email regNo');
  const assignedStudentIds = new Set();
  
  sections.forEach(section => {
    if (section.students && section.students.length > 0) {
      section.students.forEach(student => {
        assignedStudentIds.add(student._id.toString());
        console.log(`${student.name} (${student._id}) is assigned to section: ${section.name}`);
      });
    }
  });
  
  console.log('\n--- Students NOT assigned to sections ---');
  allStudents.forEach(student => {
    if (!assignedStudentIds.has(student._id.toString())) {
      console.log(`${student.name} (${student._id}) - NOT ASSIGNED TO ANY SECTION`);
    }
  });
  
  process.exit();
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});