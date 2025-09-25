const mongoose = require('mongoose');
const User = require('./models/User');
const Section = require('./models/Section');

async function assignToCosmo2() {
  try {
    await mongoose.connect('mongodb://localhost:27017/sgt3');
    console.log('Connected to MongoDB');
    
    // Get COSMO-2 section
    const cosmo2 = await Section.findOne({ name: 'COSMO-2' });
    console.log('COSMO-2 found:', cosmo2 ? cosmo2.name : 'NOT FOUND');
    
    // Get remaining unassigned students
    const unassigned = await User.find({
      roles: 'student',
      $or: [
        { assignedSections: { $exists: false } },
        { assignedSections: [] }
      ]
    }).select('name email');
    
    console.log('Unassigned students:', unassigned.length);
    unassigned.forEach(s => console.log(`- ${s.name}`));
    
    if (unassigned.length > 0 && cosmo2) {
      for (const student of unassigned.slice(0, 2)) {
        await User.findByIdAndUpdate(student._id, {
          $addToSet: { assignedSections: cosmo2._id }
        });
        console.log(`✅ ${student.name} assigned to COSMO-2`);
      }
      
      // Check final assignments
      const cosmo2Students = await User.find({
        assignedSections: cosmo2._id
      }).select('name');
      
      console.log(`\nCOSMO-2 now has ${cosmo2Students.length} students:`);
      cosmo2Students.forEach(s => console.log(`- ${s.name}`));
    } else {
      console.log('No unassigned students or COSMO-2 not found');
    }
    
    mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    mongoose.connection.close();
  }
}

assignToCosmo2();