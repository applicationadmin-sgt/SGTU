const mongoose = require('mongoose');
const Section = require('./models/Section');
const School = require('./models/School');
const Department = require('./models/Department');
const Course = require('./models/Course');
require('dotenv').config();

async function checkSectionCS00000005() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    // Find section CS00000005
    const section = await Section.findOne({ name: 'CS00000005' })
      .populate('school', 'name code _id')
      .populate('department', 'name code _id')
      .populate('courses', 'title courseCode _id department')
      .populate({
        path: 'courses',
        populate: {
          path: 'department',
          select: 'name code _id'
        }
      });
      
    if (!section) {
      console.log('❌ Section CS00000005 not found');
      return;
    }
    
    console.log(`\n📚 Section: ${section.name}`);
    console.log(`🏫 School: ${section.school?.name || 'N/A'} (${section.school?._id})`);
    console.log(`🏢 Department: ${section.department?.name || 'N/A'} (${section.department?._id})`);
    console.log(`\n📖 Courses in this section (${section.courses.length}):`);
    
    section.courses.forEach((course, index) => {
      console.log(`${index + 1}. ${course.title} (${course.courseCode})`);
      console.log(`   Course Department: ${course.department?.name || 'N/A'} (${course.department?._id})`);
      console.log('');
    });
    
    // Check ethical hacking course specifically
    const ethicalHackingCourse = section.courses.find(c => c.courseCode === 'C000003');
    if (ethicalHackingCourse) {
      console.log(`🎯 Ethical Hacking course found in section!`);
      console.log(`   Course Department ID: ${ethicalHackingCourse.department?._id}`);
      console.log(`   Section Department ID: ${section.department?._id}`);
      
      if (ethicalHackingCourse.department?._id && ethicalHackingCourse.department._id.toString() !== section.department?._id?.toString()) {
        console.log(`⚠️  MISMATCH: Course department differs from section department!`);
        console.log(`   Course belongs to: ${ethicalHackingCourse.department.name}`);
        console.log(`   Section belongs to: ${section.department?.name || 'None'}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

checkSectionCS00000005();