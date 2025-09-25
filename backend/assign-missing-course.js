const mongoose = require('mongoose');
const Section = require('./models/Section');
const Course = require('./models/Course');
require('dotenv').config();

async function assignMissingCourse() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    // Find section CS00000006
    const section = await Section.findOne({ name: 'CS00000006' });
    if (!section) {
      console.log('❌ Section CS00000006 not found');
      return;
    }
    
    // Find Ethical Hacking course
    const ethicalHackingCourse = await Course.findOne({ courseCode: 'C000003' });
    if (!ethicalHackingCourse) {
      console.log('❌ Ethical Hacking course not found');
      return;
    }
    
    console.log(`📚 Section: ${section.name}`);
    console.log(`📖 Course to assign: ${ethicalHackingCourse.title} (${ethicalHackingCourse.courseCode})`);
    console.log(`🏫 Course School: ${ethicalHackingCourse.school}`);
    console.log(`🏫 Section School: ${section.school}`);
    
    // Check if course is already assigned
    const isAlreadyAssigned = section.courses.includes(ethicalHackingCourse._id);
    if (isAlreadyAssigned) {
      console.log('✅ Course is already assigned to this section');
      return;
    }
    
    // Assign the course
    section.courses.push(ethicalHackingCourse._id);
    await section.save();
    
    console.log('✅ Successfully assigned Ethical Hacking course to section CS00000006');
    
    // Verify the assignment
    const updatedSection = await Section.findOne({ name: 'CS00000006' }).populate('courses');
    console.log(`\n📊 Updated section now has ${updatedSection.courses.length} courses:`);
    updatedSection.courses.forEach((course, index) => {
      console.log(`${index + 1}. ${course.title} (${course.courseCode})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

assignMissingCourse();