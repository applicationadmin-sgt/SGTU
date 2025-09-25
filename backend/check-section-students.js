const mongoose = require('mongoose');
const Section = require('./models/Section');
const User = require('./models/User');
const Course = require('./models/Course');
require('dotenv').config();

async function checkSectionStudents() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find the M.NURO01 section
    const section = await Section.findOne({ name: 'M.NURO01' })
      .populate('students', 'name email regNo')
      .populate('teacher', 'name email')
      .populate('teachers', 'name email')
      .populate('courses', 'title courseCode');

    if (!section) {
      console.log('❌ Section M.NURO01 not found');
      
      // Let's check all sections to see what exists
      const allSections = await Section.find({})
        .select('name students teacher teachers courses')
        .populate('teacher', 'name')
        .populate('teachers', 'name');
      
      console.log('\n📋 All sections in database:');
      allSections.forEach(sec => {
        console.log(`- ${sec.name}: ${sec.students ? sec.students.length : 0} students, Teacher: ${sec.teacher?.name || 'None'}, Teachers: ${sec.teachers?.map(t => t.name).join(', ') || 'None'}`);
      });
      
      return;
    }

    console.log('\n✅ Section M.NURO01 found!');
    console.log('Section Details:');
    console.log('- Name:', section.name);
    console.log('- Students count:', section.students ? section.students.length : 0);
    console.log('- Main teacher:', section.teacher ? section.teacher.name : 'None');
    console.log('- Additional teachers:', section.teachers ? section.teachers.map(t => t.name).join(', ') : 'None');
    console.log('- Courses:', section.courses ? section.courses.map(c => `${c.title} (${c.courseCode})`).join(', ') : 'None');

    if (section.students && section.students.length > 0) {
      console.log('\n👥 Students in M.NURO01:');
      section.students.forEach((student, index) => {
        console.log(`${index + 1}. ${student.name} (${student.regNo}) - ${student.email}`);
      });
    } else {
      console.log('\n⚠️ No students found in this section');
    }

    // Let's also check if there are any students with the section assigned
    const studentsInSection = await User.find({ 
      role: 'student',
      sections: section._id 
    }).select('name email regNo');

    console.log('\n🔍 Students with this section ID in their sections array:');
    if (studentsInSection.length > 0) {
      studentsInSection.forEach((student, index) => {
        console.log(`${index + 1}. ${student.name} (${student.regNo}) - ${student.email}`);
      });
    } else {
      console.log('No students found with this section in their sections array');
    }

    // Check if there are any students in the department/school that might belong to this section
    console.log('\n🏫 Checking for students who might belong to this section...');
    const allStudents = await User.find({ role: 'student' })
      .select('name email regNo sections')
      .populate('sections', 'name');
    
    console.log(`Total students in database: ${allStudents.length}`);
    
    // Show students without proper section assignment
    const studentsWithoutSections = allStudents.filter(s => !s.sections || s.sections.length === 0);
    console.log(`Students without sections: ${studentsWithoutSections.length}`);

  } catch (error) {
    console.error('Error checking section students:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

checkSectionStudents();