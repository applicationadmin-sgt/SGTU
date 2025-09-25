const mongoose = require('mongoose');
require('dotenv').config();

const SectionCourseTeacher = require('./models/SectionCourseTeacher');

async function checkAstroChemistry() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Check AstroChemistry course assignments
    const astroChemAssignments = await SectionCourseTeacher.find({ 
      section: '68cc16755ba20b247c9d5909',
      course: '68bec313c1a9d9ac3fa6a3a3'
    }).populate('teacher', 'name email');
    
    console.log(`AstroChemistry assignments: ${astroChemAssignments.length}`);
    
    astroChemAssignments.forEach((assignment, index) => {
      console.log(`${index + 1}. Active: ${assignment.isActive}`);
      console.log(`   Teacher: ${assignment.teacher?.name} (${assignment.teacher?.email})`);
      console.log(`   Date: ${assignment.assignedAt}`);
      console.log(`   ID: ${assignment._id}`);
      console.log('');
    });
    
    // Check for active assignments specifically
    const activeAssignments = await SectionCourseTeacher.find({ 
      section: '68cc16755ba20b247c9d5909',
      course: '68bec313c1a9d9ac3fa6a3a3',
      isActive: true
    });
    
    console.log(`Active assignments for AstroChemistry: ${activeAssignments.length}`);
    
    if (activeAssignments.length === 0) {
      console.log('✅ AstroChemistry should be available for assignment!');
    } else {
      console.log('❌ AstroChemistry already has an active assignment');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkAstroChemistry();