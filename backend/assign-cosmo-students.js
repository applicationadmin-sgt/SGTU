const mongoose = require('mongoose');
const User = require('./models/User');
const Section = require('./models/Section');

async function assignStudentsToCOSMO() {
  try {
    await mongoose.connect('mongodb://localhost:27017/sgt3');
    console.log('Connected to MongoDB');
    
    // Get COSMO-1 section
    const cosmo1 = await Section.findOne({ name: 'COSMO-1' });
    if (!cosmo1) {
      console.log('COSMO-1 section not found');
      return;
    }
    
    // Get students without assignments
    const unassignedStudents = await User.find({ 
      roles: 'student',
      $or: [
        { assignedSections: { $exists: false } },
        { assignedSections: [] }
      ]
    }).select('name email');
    
    console.log('Unassigned students:', unassignedStudents.length);
    
    // Assign first 2 students to COSMO-1
    if (unassignedStudents.length >= 2) {
      const studentsToAssign = unassignedStudents.slice(0, 2);
      
      for (const student of studentsToAssign) {
        console.log(`Assigning ${student.name} to COSMO-1...`);
        
        // Update student's assignedSections
        await User.findByIdAndUpdate(student._id, {
          $addToSet: { assignedSections: cosmo1._id }
        });
        
        console.log(`✅ ${student.name} assigned to COSMO-1`);
      }
      
      // Verify assignments
      const cosmoStudents = await User.find({
        assignedSections: cosmo1._id
      }).select('name email');
      
      console.log(`\\nCOSMO-1 now has ${cosmoStudents.length} students:`);
      cosmoStudents.forEach(s => {
        console.log(`- ${s.name} (${s.email})`);
      });
      
    } else {
      console.log('Not enough unassigned students');
    }
    
    mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    mongoose.connection.close();
  }
}

assignStudentsToCOSMO();