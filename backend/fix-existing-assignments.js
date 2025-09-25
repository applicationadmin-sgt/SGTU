const mongoose = require('mongoose');
const User = require('./models/User');
const Section = require('./models/Section');

async function fixExistingAssignments() {
  try {
    await mongoose.connect('mongodb://localhost:27017/sgt3');
    console.log('Connected to MongoDB (sgt3)');
    
    console.log('🔧 Fixing existing student-section assignment inconsistencies...\n');
    
    // Get all sections that have students
    const sectionsWithStudents = await Section.find({ 
      students: { $exists: true, $ne: [] } 
    }).populate('students', 'name email assignedSections');
    
    console.log(`Found ${sectionsWithStudents.length} sections with students`);
    
    let fixedCount = 0;
    
    for (const section of sectionsWithStudents) {
      console.log(`\n📋 Processing section: ${section.name} (${section.students.length} students)`);
      
      for (const student of section.students) {
        // Check if this section is in the student's assignedSections
        const hasAssignment = student.assignedSections && 
          student.assignedSections.some(sId => sId.toString() === section._id.toString());
        
        if (!hasAssignment) {
          console.log(`  ❌ Student ${student.name} missing section in assignedSections - fixing...`);
          
          // Add the section to student's assignedSections
          await User.findByIdAndUpdate(student._id, {
            $addToSet: { assignedSections: section._id }
          });
          
          fixedCount++;
          console.log(`  ✅ Fixed assignment for ${student.name}`);
        } else {
          console.log(`  ✅ Student ${student.name} assignment is correct`);
        }
      }
    }
    
    console.log(`\n🎉 Fixed ${fixedCount} assignment inconsistencies`);
    
    // Verify the fix by checking the specific student "Dinu"
    console.log('\n📊 Verifying fix for student Dinu...');
    const dinu = await User.findOne({ name: 'Dinu' }).select('name assignedSections');
    if (dinu) {
      console.log(`Student Dinu assignedSections: ${dinu.assignedSections}`);
      
      // Test the HOD query
      const count = await User.countDocuments({
        $or: [{ role: 'student' }, { roles: 'student' }],
        isActive: { $ne: false },
        assignedSections: '68cd0182961b22fd80c819e0' // CS00000004 section ID
      });
      
      console.log(`HOD query result for section CS00000004: ${count} students`);
    }
    
    mongoose.connection.close();
    console.log('\n✅ Fix completed successfully!');
  } catch (error) {
    console.error('❌ Error:', error);
    mongoose.connection.close();
  }
}

fixExistingAssignments();