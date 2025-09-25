const mongoose = require('mongoose');
const SectionCourseTeacher = require('./models/SectionCourseTeacher');
const User = require('./models/User');
const Course = require('./models/Course');
require('dotenv').config();

async function checkExistingAssignments() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    const sectionId = '68cc16755ba20b247c9d5909'; // As001
    const courseId = '68cbcc904eb37fd405cae0c2';   // AstroChemistry
    
    console.log('\n🔍 Checking ALL assignments for this section-course pair...');
    
    // Find ALL assignments (including inactive)
    const allAssignments = await SectionCourseTeacher.find({
      section: sectionId,
      course: courseId
    }).populate('teacher', 'name email')
      .populate('course', 'title courseCode');
    
    console.log('📋 Total assignments found:', allAssignments.length);
    
    allAssignments.forEach((assignment, index) => {
      console.log(`\n   Assignment ${index + 1}:`);
      console.log(`   - ID: ${assignment._id}`);
      console.log(`   - Teacher: ${assignment.teacher?.name || 'Unknown'}`);
      console.log(`   - Course: ${assignment.course?.title || 'Unknown'}`);
      console.log(`   - Active: ${assignment.isActive}`);
      console.log(`   - Assigned At: ${assignment.assignedAt}`);
    });
    
    // Find only active assignments
    const activeAssignments = await SectionCourseTeacher.find({
      section: sectionId,
      course: courseId,
      isActive: true
    });
    
    console.log('\n📋 Active assignments:', activeAssignments.length);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

checkExistingAssignments();