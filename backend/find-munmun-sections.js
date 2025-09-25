const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Section = require('./models/Section');
const Course = require('./models/Course');

async function findSectionsForMunmun() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/student-dashboard');
    console.log('Connected to MongoDB');

    // Find Munmun2
    const student = await User.findOne({ 
      email: 'munmun2912@gmail.com'
    });

    console.log('✅ Found student:', student.name, student.email);

    // Find all sections this student is in
    const sections = await Section.find({ 
      students: student._id 
    }).populate('courses', 'title courseCode').populate('teacher', 'name email');

    console.log('📚 Sections student is assigned to:');
    sections.forEach(section => {
      console.log(`  Section: ${section.sectionName}`);
      console.log(`  Teacher: ${section.teacher?.name || 'N/A'}`);
      console.log(`  Courses: ${section.courses.map(c => `${c.courseCode} (${c.title})`).join(', ')}`);
      console.log('  ---');
    });

    // Also search for course C000008 in any section
    const courseC000008 = await Course.findOne({ courseCode: 'C000008' });
    if (courseC000008) {
      console.log(`\n🎯 Found course C000008: ${courseC000008.title}`);
      
      const sectionsWithC000008 = await Section.find({ 
        courses: courseC000008._id 
      }).populate('students', 'name email');

      console.log('📋 Sections that have course C000008:');
      sectionsWithC000008.forEach(section => {
        const hasStudent = section.students.some(s => s._id.toString() === student._id.toString());
        console.log(`  Section: ${section.sectionName} - Student in section: ${hasStudent}`);
        if (hasStudent) {
          console.log('  ✅ MATCH: Student is in this section with C000008!');
        }
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

findSectionsForMunmun();