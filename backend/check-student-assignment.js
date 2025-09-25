const mongoose = require('mongoose');
const User = require('./models/User');
const Section = require('./models/Section');

async function checkStudentAssignment() {
  try {
    await mongoose.connect('mongodb://localhost:27017/sgt3');
    console.log('Connected to MongoDB (sgt3)');
    
    // Find all sections to see what exists
    const allSections = await Section.find({}).select('name _id school');
    console.log('\nAll sections in database:');
    allSections.forEach(s => {
      console.log('- Section:', s.name, 'ID:', s._id);
    });
    
    // Find the section CS0000004
    const section = await Section.findOne({ name: 'CS0000004' });
    console.log('\nSection CS0000004 found:', section ? section.name : 'Not found');
    
    // Also try to find by the section ID we saw in logs: 68cd0182961b22fd80c819e0
    const sectionById = await Section.findById('68cd0182961b22fd80c819e0');
    console.log('Section by ID found:', sectionById ? sectionById.name : 'Not found');
    
    const targetSection = section || sectionById;
    if (targetSection) {
      // Check the specific student we just assigned
      const student = await User.findById('68d21cad17843187b755b519')
        .select('name email role roles assignedSections isActive');
      console.log('\nSpecific student (Dinu):');
      console.log('- Name:', student?.name);
      console.log('- Role:', student?.role);
      console.log('- Roles:', student?.roles);
      console.log('- isActive:', student?.isActive);
      console.log('- assignedSections:', student?.assignedSections);
      
      // Test our query
      const count1 = await User.countDocuments({
        $or: [{ role: 'student' }, { roles: 'student' }],
        isActive: { $ne: false },
        assignedSections: targetSection._id
      });
      console.log('\nQuery 1 (original) count:', count1);
      
      // Test alternative queries
      const count2 = await User.countDocuments({
        roles: 'student',
        isActive: { $ne: false },
        assignedSections: targetSection._id
      });
      console.log('Query 2 (roles only) count:', count2);
      
      const count3 = await User.countDocuments({
        assignedSections: targetSection._id
      });
      console.log('Query 3 (sections only) count:', count3);
      
      // Get all students with sections
      const studentsWithSections = await User.find({
        assignedSections: { $exists: true, $ne: [] }
      }).select('name email role roles assignedSections isActive');
      
      console.log('\nAll students with assigned sections:', studentsWithSections.length);
      studentsWithSections.forEach(s => {
        console.log('- Student:', s.name, 'Role:', s.role, 'Roles:', s.roles, 'Active:', s.isActive);
        console.log('  Sections:', s.assignedSections);
      });
    }
    
    mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    mongoose.connection.close();
  }
}

checkStudentAssignment();

