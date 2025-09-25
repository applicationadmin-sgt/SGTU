const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Section = require('./models/Section');

async function addStudentsToSection() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Students to add to M.NURO01 section
    const studentEmails = [
      'mpollav02@gmail.com',
      'konkana369@gmail.com', 
      'asmita2912@gmail.com',
      'anikpatra@gmail.com',
      'arkakarmakar@gmail.com',
      'rohan05@gmail.com'
    ];

    console.log('🔧 ADDING STUDENTS TO M.NURO01 SECTION\n');

    // Find the M.NURO01 section
    const section = await Section.findOne({ name: 'M.NURO01' });
    if (!section) {
      console.log('❌ M.NURO01 section not found');
      return;
    }

    console.log(`📋 Found section: ${section.name}`);
    console.log(`   Current students: ${section.students?.length || 0}`);

    // Find all students by email
    const students = await User.find({ 
      email: { $in: studentEmails },
      role: 'student'
    });

    console.log(`\n👥 Found ${students.length} students to add:`);
    for (const student of students) {
      console.log(`   - ${student.name} (${student.regNo}) - ${student.email}`);
    }

    // Add students to section if not already added
    let addedCount = 0;
    for (const student of students) {
      if (!section.students.includes(student._id)) {
        section.students.push(student._id);
        addedCount++;
        console.log(`   ✅ Added ${student.name} to section`);
      } else {
        console.log(`   ⚠️  ${student.name} already in section`);
      }
    }

    if (addedCount > 0) {
      await section.save();
      console.log(`\n✅ Successfully added ${addedCount} students to M.NURO01 section`);
      
      // Show updated section info
      const updatedSection = await Section.findOne({ name: 'M.NURO01' })
        .populate('students', 'name regNo email');
      
      console.log(`\n📋 Updated M.NURO01 section:`);
      console.log(`   Total students: ${updatedSection.students?.length || 0}`);
      for (const student of updatedSection.students) {
        console.log(`   - ${student.name} (${student.regNo}) - ${student.email}`);
      }
    } else {
      console.log('\n⚠️  No students were added (all already in section)');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

addStudentsToSection();