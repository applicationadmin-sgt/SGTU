const mongoose = require('mongoose');
const User = require('./models/User');
const Section = require('./models/Section');

async function fixStudentAssignment() {
  try {
    await mongoose.connect('mongodb://localhost:27017/sgt3');
    console.log('Connected to MongoDB (sgt3)');
    
    // Find the student Dinu
    const student = await User.findById('68d21cad17843187b755b519');
    if (!student) {
      console.log('❌ Student not found');
      return;
    }
    
    console.log('✅ Found student:', student.name);
    console.log('- Current assignedSections:', student.assignedSections);
    
    // Find the section CS00000004
    const section = await Section.findById('68cd0182961b22fd80c819e0');
    if (!section) {
      console.log('❌ Section not found');
      return;
    }
    
    console.log('✅ Found section:', section.name);
    
    // Manually assign the student to the section
    console.log('\n🔧 Manually assigning student to section...');
    
    // Method 1: Direct update
    const result1 = await User.updateOne(
      { _id: student._id },
      { $addToSet: { assignedSections: section._id } }
    );
    
    console.log('Update result:', result1);
    
    // Verify the update
    const updatedStudent = await User.findById(student._id);
    console.log('✅ Updated student assignedSections:', updatedStudent.assignedSections);
    
    // Test the query that the HOD dashboard uses
    const count = await User.countDocuments({
      $or: [{ role: 'student' }, { roles: 'student' }],
      isActive: { $ne: false },
      assignedSections: section._id
    });
    
    console.log('\n📊 Student count query result:', count);
    
    // Also test the query for the specific section analytics
    const students = await User.find({
      $or: [{ role: 'student' }, { roles: 'student' }],
      isActive: { $ne: false },
      assignedSections: section._id
    }).select('name email');
    
    console.log('📋 Students in section:', students.map(s => s.name));
    
    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error);
    mongoose.connection.close();
  }
}

fixStudentAssignment();