const mongoose = require('mongoose');
const User = require('./models/User');
const Section = require('./models/Section');
require('dotenv').config();

async function fixProblematicStudents() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find students without sections
    const allStudents = await User.find({ role: 'student' });
    const problematicStudents = [];

    for (const student of allStudents) {
      const sectionWithStudent = await Section.findOne({ 
        students: student._id 
      });

      if (!sectionWithStudent) {
        problematicStudents.push(student);
      }
    }

    console.log(`\n🔧 Fixing ${problematicStudents.length} students without section assignment...`);

    // Find available sections
    const sections = await Section.find({});
    console.log(`\n📚 Available sections:`);
    sections.forEach((section, index) => {
      console.log(`${index + 1}. ${section.name} (${section.students?.length || 0} students)`);
    });

    if (sections.length === 0) {
      console.log(`❌ No sections available. Please create sections first.`);
      return;
    }

    // For this example, let's assign them to existing sections based on their courses
    // You can modify this logic based on your business rules

    let fixedCount = 0;
    const defaultSection = sections.find(s => s.name === 'de') || sections[0]; // Use 'de' section as default

    for (const student of problematicStudents) {
      try {
        // Check if student has medical/nurology courses - assign to M.NURO01
        // Otherwise assign to 'de' section
        let targetSection = defaultSection;
        
        // If student has courses, check if any are medical/nurology related
        if (student.coursesAssigned && student.coursesAssigned.length > 0) {
          // You can add more sophisticated logic here
          // For now, we'll use the default section
        }

        // Add student to section
        if (!targetSection.students.includes(student._id)) {
          targetSection.students.push(student._id);
          await targetSection.save();
          
          console.log(`✅ Assigned ${student.name} (${student.regNo}) to section ${targetSection.name}`);
          fixedCount++;
        }

      } catch (error) {
        console.log(`❌ Failed to assign ${student.name} (${student.regNo}): ${error.message}`);
      }
    }

    console.log(`\n📊 REPAIR SUMMARY:`);
    console.log(`✅ Students fixed: ${fixedCount}`);
    console.log(`❌ Students remaining unfixed: ${problematicStudents.length - fixedCount}`);

    // Verify the fix
    console.log(`\n🔍 VERIFICATION - checking again...`);
    const stillProblematic = [];
    
    for (const student of allStudents) {
      const sectionWithStudent = await Section.findOne({ 
        students: student._id 
      });

      if (!sectionWithStudent) {
        stillProblematic.push(student);
      }
    }

    console.log(`\n📊 FINAL VERIFICATION:`);
    console.log(`✅ Students now properly assigned: ${allStudents.length - stillProblematic.length}`);
    console.log(`❌ Students still without sections: ${stillProblematic.length}`);

    if (stillProblematic.length === 0) {
      console.log(`\n🎉 SUCCESS! All students are now properly assigned to sections!`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

fixProblematicStudents();