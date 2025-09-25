const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Section = require('./models/Section');

async function assignStudentsToSections() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sgt-learning');
    console.log('✅ Connected to MongoDB');

    // Get first 5 students
    const students = await User.find({ role: 'student' }).limit(10);
    console.log(`👥 Found ${students.length} students to assign`);

    // Get the "de" section (where admin is assigned)
    const deSection = await Section.findOne({ name: 'de' });
    if (!deSection) {
      console.log('❌ Section "de" not found');
      return;
    }
    
    console.log(`🏫 Assigning students to section: ${deSection.name}`);

    // Assign first 5 students to the "de" section
    const studentsToAssign = students.slice(0, 5);
    
    for (const student of studentsToAssign) {
      // Check if student is already assigned to this section
      if (!student.assignedSections.includes(deSection._id)) {
        // Use updateOne to avoid validation issues
        await User.updateOne(
          { _id: student._id },
          { $push: { assignedSections: deSection._id } }
        );
        console.log(`   ✅ Assigned ${student.name} (${student.regNo}) to ${deSection.name}`);
      } else {
        console.log(`   ➡️ ${student.name} already assigned to ${deSection.name}`);
      }
    }

    // Verify the assignments
    const updatedStudents = await User.find({ 
      role: 'student', 
      assignedSections: deSection._id 
    });
    
    console.log(`\n🎉 Section "${deSection.name}" now has ${updatedStudents.length} students:`);
    updatedStudents.forEach((student, index) => {
      console.log(`   ${index + 1}. ${student.name} (${student.regNo})`);
    });

    // Now check admin's assignments
    const admin = await User.findOne({ email: 'sourav11092002@gmail.com' });
    if (admin) {
      const SectionCourseTeacher = require('./models/SectionCourseTeacher');
      const adminAssignments = await SectionCourseTeacher.find({ teacher: admin._id })
        .populate('section course');
      
      console.log(`\n👨‍🏫 Admin has ${adminAssignments.length} teaching assignments:`);
      adminAssignments.forEach(assignment => {
        console.log(`   - Section: ${assignment.section?.name} → Course: ${assignment.course?.name || assignment.course?._id}`);
      });
    }

    console.log(`\n✅ Setup complete! Admin can now see students for video unlock requests.`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

assignStudentsToSections();