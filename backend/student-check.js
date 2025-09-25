const mongoose = require('mongoose');
const User = require('./models/User');
const Section = require('./models/Section');

async function checkStudents() {
  try {
    await mongoose.connect('mongodb://localhost:27017/sgt3');
    console.log('Connected to MongoDB');
    
    const students = await User.find({ roles: 'student' }).select('name email assignedSections');
    console.log('Total students:', students.length);
    
    const withSections = students.filter(s => s.assignedSections && s.assignedSections.length > 0);
    console.log('Students with sections:', withSections.length);
    
    withSections.forEach(s => {
      console.log(`- ${s.name}: ${s.assignedSections.length} sections`);
    });
    
    const withoutSections = students.filter(s => !s.assignedSections || s.assignedSections.length === 0);
    console.log('Students without sections:', withoutSections.length);
    withoutSections.forEach(s => {
      console.log(`- ${s.name} (${s.email}): NO SECTIONS`);
    });
    
    mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    mongoose.connection.close();
  }
}

async function checkDetailedAssignments() {
  try {
    await mongoose.connect('mongodb://localhost:27017/sgt3');
    console.log('\n=== DETAILED SECTION ASSIGNMENTS ===');
    
    const students = await User.find({ 
      roles: 'student',
      assignedSections: { $exists: true, $ne: [] }
    }).populate('assignedSections', 'name').select('name email assignedSections');
    
    console.log('Students with section assignments:');
    for (const student of students) {
      console.log(`- ${student.name}:`);
      student.assignedSections.forEach(section => {
        console.log(`  * ${section.name} (${section._id})`);
      });
    }
    
    // Check COSMO sections
    const cosmoSections = await Section.find({ name: /COSMO/ });
    console.log('\nCOSMO sections available:');
    cosmoSections.forEach(section => {
      console.log(`- ${section.name} (${section._id})`);
    });
    
    mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    mongoose.connection.close();
  }
}

checkStudents().then(() => checkDetailedAssignments());