const mongoose = require('mongoose');
const SectionCourseTeacher = require('./models/SectionCourseTeacher');
const User = require('./models/User');
const Section = require('./models/Section');
const Course = require('./models/Course');
require('dotenv').config();

async function checkMeghaAssignments() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    // Find Megha by email
    const megha = await User.findOne({ email: 'megha@gmail.com' });
    console.log('\n👩‍🏫 Teacher found:', megha ? `${megha.name} (${megha._id})` : 'NOT FOUND');
    
    if (!megha) {
      console.log('❌ Megha not found!');
      return;
    }
    
    // Get all assignments for Megha
    const assignments = await SectionCourseTeacher.find({
      teacher: megha._id,
      isActive: true
    }).populate('section', 'name')
      .populate('course', 'title courseCode')
      .populate('assignedBy', 'name email');
    
    console.log(`\n📋 Total active assignments: ${assignments.length}`);
    
    if (assignments.length === 0) {
      console.log('❌ No active assignments found for Megha');
      return;
    }
    
    // Group assignments by section
    const sectionMap = new Map();
    
    assignments.forEach((assignment, index) => {
      console.log(`\n   Assignment ${index + 1}:`);
      console.log(`   - Section: ${assignment.section.name} (${assignment.section._id})`);
      console.log(`   - Course: ${assignment.course.title} (${assignment.course.courseCode})`);
      console.log(`   - Assigned by: ${assignment.assignedBy?.name || 'Unknown'}`);
      console.log(`   - Assigned at: ${assignment.assignedAt}`);
      
      // Track unique sections
      if (!sectionMap.has(assignment.section._id.toString())) {
        sectionMap.set(assignment.section._id.toString(), {
          name: assignment.section.name,
          courses: []
        });
      }
      sectionMap.get(assignment.section._id.toString()).courses.push(assignment.course.title);
    });
    
    console.log('\n📊 Summary by Section:');
    console.log(`   Total unique sections: ${sectionMap.size}`);
    
    sectionMap.forEach((sectionData, sectionId) => {
      console.log(`\n   Section: ${sectionData.name}`);
      console.log(`   Courses: ${sectionData.courses.join(', ')}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

checkMeghaAssignments();