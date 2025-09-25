const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Section = require('./models/Section');
const Course = require('./models/Course');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log('Connected to MongoDB');
  
  // Find the student by email
  const student = await User.findOne({ email: 'dipanwitaku7ndu02@gmail.com' });
  
  if (!student) {
    console.log('❌ Student not found with email: dipanwitaku7ndu02@gmail.com');
    process.exit(1);
  }
  
  console.log('✅ Found student:');
  console.log('  Name:', student.name);
  console.log('  ID:', student._id);
  console.log('  Email:', student.email);
  console.log('  Role:', student.role);
  
  // Check sections where this student is assigned
  const sections = await Section.find({ students: student._id });
  
  console.log('\n📚 Section assignments:');
  if (sections.length === 0) {
    console.log('❌ Student is NOT assigned to any sections');
  } else {
    console.log(`✅ Student is assigned to ${sections.length} section(s):`);
    sections.forEach((section, index) => {
      console.log(`Section ${index + 1}:`);
      console.log('  ID:', section._id);
      console.log('  Name:', section.name);
      console.log('  Students count:', section.students?.length || 0);
      console.log('  Courses count:', section.courses?.length || 0);
      console.log('  Teacher ID:', section.teacher);
      console.log('');
    });
  }
  
  process.exit();
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});