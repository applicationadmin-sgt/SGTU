const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sgt-learning');

const Section = require('./models/Section');
const User = require('./models/User');
const Course = require('./models/Course');

async function debugTeacherSections() {
  console.log('=== Debugging Teacher Sections ===');
  
  // Find all teachers
  const teachers = await User.find({ role: 'teacher' });
  console.log('Teachers found:');
  teachers.forEach(teacher => {
    console.log(`  - ${teacher.name} (${teacher.email})`);
  });
  
  // Check sections for each teacher
  for (const teacher of teachers) {
    console.log(`\n--- Sections for ${teacher.name} (${teacher.email}) ---`);
    const sections = await Section.find({ teacher: teacher._id })
      .populate('courses', 'title courseCode')
      .populate('students', 'name email regNo');
    
    console.log(`Sections assigned: ${sections.length}`);
    sections.forEach(section => {
      console.log(`  Section: ${section.name}`);
      console.log(`    Courses: ${section.courses?.map(c => c.title).join(', ') || 'None'}`);
      console.log(`    Students: ${section.students?.length || 0}`);
    });
  }
  
  // Check the specific Astrophysics sections
  console.log('\n=== Astrophysics Related Sections ===');
  const astrophysicsSections = await Section.find({
    $or: [
      { name: /astrophysics/i },
      { 'courses.title': /astrophysics/i }
    ]
  })
  .populate('teacher', 'name email')
  .populate('courses', 'title courseCode')
  .populate('students', 'name email regNo');
  
  astrophysicsSections.forEach(section => {
    console.log(`Section: ${section.name}`);
    console.log(`  Teacher: ${section.teacher?.name || 'No teacher'} (${section.teacher?.email || 'N/A'})`);
    console.log(`  Students: ${section.students?.length || 0}`);
    if (section.students?.length > 0) {
      section.students.forEach(student => {
        console.log(`    - ${student.name} (${student.regNo})`);
      });
    }
  });
  
  mongoose.disconnect();
}

debugTeacherSections().catch(console.error);