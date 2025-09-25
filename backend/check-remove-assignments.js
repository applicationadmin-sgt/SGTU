const mongoose = require('mongoose');
const SectionCourseTeacher = require('./models/SectionCourseTeacher');
const Section = require('./models/Section');
const Course = require('./models/Course');
const User = require('./models/User');
require('dotenv').config();

async function checkSectionAssignments() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    const sectionId = '68ca315f14282465cf09c5a5'; // M.NURO002 - from error logs
    
    // Get section info
    const section = await Section.findById(sectionId).populate('courses', 'title courseCode _id');
    console.log(`\n📚 Section: ${section?.name || 'NOT FOUND'}`);
    
    if (!section) {
      console.log('❌ Section not found!');
      return;
    }
    
    console.log('📖 Courses in section:', section.courses.length);
    
    for (const course of section.courses) {
      console.log(`\n   Course: ${course.title} (${course.courseCode})`);
      console.log(`   ID: ${course._id}`);
      
      // Check ALL assignments for this course (active and inactive)
      const allAssignments = await SectionCourseTeacher.find({
        section: sectionId,
        course: course._id
      }).populate('teacher', 'name email');
      
      console.log(`   Total assignments: ${allAssignments.length}`);
      
      allAssignments.forEach((assignment, index) => {
        console.log(`     ${index + 1}. Teacher: ${assignment.teacher?.name || 'Unknown'}, Active: ${assignment.isActive}`);
      });
      
      if (allAssignments.length === 0) {
        console.log('     ❌ No assignments found for this course');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

checkSectionAssignments();