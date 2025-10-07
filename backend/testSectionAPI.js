const mongoose = require('mongoose');
require('dotenv').config();
const Section = require('./models/Section');
const School = require('./models/School');
const Course = require('./models/Course');
const Department = require('./models/Department');
const User = require('./models/User');

async function testAPI() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    console.log('🔍 Testing Section.find with course department population...');
    const sections = await Section.find()
      .populate('school')
      .populate({
        path: 'courses',
        populate: {
          path: 'department',
          select: 'name code'
        }
      })
      .populate('teacher');
      
    console.log('📊 Sections found:', sections.length);
    sections.forEach((section, index) => {
      console.log(`${index + 1}. ${section.sectionName} - ID: ${section._id}`);
      console.log(`   - School: ${section.school?.name || 'None'}`);
      console.log(`   - Courses: ${section.courses?.length || 0}`);
      
      if (section.courses && section.courses.length > 0) {
        section.courses.forEach((course, courseIndex) => {
          console.log(`     ${courseIndex + 1}. ${course.courseName} (Department: ${course.department?.name || 'None'})`);
          console.log(`        - Dept ID: ${course.department?._id || 'None'}`);
          console.log(`        - Dept Code: ${course.department?.code || 'None'}`);
        });
      }
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testAPI();