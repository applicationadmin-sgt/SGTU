const mongoose = require('mongoose');
const Section = require('./models/Section');
const Course = require('./models/Course');
const SectionCourseTeacher = require('./models/SectionCourseTeacher');
const User = require('./models/User');
require('dotenv').config();

async function checkSectionCourses() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    // Find section CS00000006
    const section = await Section.findOne({ name: 'CS00000006' }).populate('courses', 'title courseCode _id');
    if (!section) {
      console.log('❌ Section CS00000006 not found');
      return;
    }
    console.log(`\n📚 Section: ${section.name}`);
    console.log('📖 Courses in section:');
    
    for (const course of section.courses) {
      console.log(`\n   Course: ${course.title} (${course.courseCode})`);
      console.log(`   ID: ${course._id}`);
      
      // Check if course has a teacher assigned
      const assignment = await SectionCourseTeacher.findOne({
        section: section._id,
        course: course._id,
        isActive: true
      }).populate('teacher', 'name email');
      
      if (assignment) {
        console.log(`   ✅ Assigned to: ${assignment.teacher.name}`);
      } else {
        console.log(`   ❌ Unassigned`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

checkSectionCourses();