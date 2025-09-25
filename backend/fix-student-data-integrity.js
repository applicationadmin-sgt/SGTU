const mongoose = require('mongoose');
const User = require('./models/User');
const Section = require('./models/Section');
require('dotenv').config();

async function fixStudentDataIntegrity() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all students without sections
    const studentsWithoutSections = await User.find({ role: 'student' });
    
    console.log(`\n🔍 Checking ${studentsWithoutSections.length} students for section assignment...`);
    
    let studentsInSections = 0;
    let studentsNotInSections = 0;
    const problematicStudents = [];

    for (const student of studentsWithoutSections) {
      // Check if this student is in any section
      const sectionWithStudent = await Section.findOne({ 
        students: student._id 
      });

      if (sectionWithStudent) {
        studentsInSections++;
        console.log(`✅ ${student.name} (${student.regNo}) is in section: ${sectionWithStudent.name}`);
      } else {
        studentsNotInSections++;
        problematicStudents.push({
          name: student.name,
          regNo: student.regNo,
          email: student.email,
          coursesCount: student.coursesAssigned?.length || 0
        });
        console.log(`❌ ${student.name} (${student.regNo}) is NOT in any section`);
      }
    }

    console.log(`\n📊 SUMMARY:`);
    console.log(`✅ Students properly assigned to sections: ${studentsInSections}`);
    console.log(`❌ Students without section assignment: ${studentsNotInSections}`);

    if (problematicStudents.length > 0) {
      console.log(`\n🚨 PROBLEMATIC STUDENTS (${problematicStudents.length}):`);
      problematicStudents.forEach((student, index) => {
        console.log(`${index + 1}. ${student.name} (${student.regNo}) - ${student.email} - ${student.coursesCount} courses`);
      });

      console.log(`\n⚠️  DATA INTEGRITY ISSUE DETECTED!`);
      console.log(`These students were created without proper section assignment.`);
      console.log(`This violates the rule that all students must be assigned to sections.`);
      
      // Recommendation
      console.log(`\n💡 RECOMMENDED ACTIONS:`);
      console.log(`1. Review the bulk upload template to ensure 'section' field is filled`);
      console.log(`2. Create sections for these students or assign them to existing sections`);
      console.log(`3. Update the bulk upload process to make section assignment mandatory`);
    } else {
      console.log(`\n✅ ALL STUDENTS ARE PROPERLY ASSIGNED TO SECTIONS!`);
    }

    // Also check for sections and their student counts
    console.log(`\n🏫 SECTION ANALYSIS:`);
    const sections = await Section.find({}).populate('students', 'name regNo email');
    
    for (const section of sections) {
      console.log(`📚 Section: ${section.name}`);
      console.log(`   Students: ${section.students?.length || 0}`);
      if (section.students?.length > 0) {
        section.students.forEach((student, index) => {
          console.log(`   ${index + 1}. ${student.name} (${student.regNo})`);
        });
      }
      console.log('');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

fixStudentDataIntegrity();