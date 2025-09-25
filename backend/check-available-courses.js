const mongoose = require('mongoose');
const Course = require('./models/Course');
const School = require('./models/School');
const Department = require('./models/Department');
require('dotenv').config();

async function checkAvailableCourses() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    // Find all courses in the system
    const courses = await Course.find().populate('school', 'name code').populate('department', 'name code');
    
    console.log(`\n📚 Total courses available: ${courses.length}\n`);
    
    courses.forEach((course, index) => {
      console.log(`${index + 1}. ${course.title} (${course.courseCode})`);
      console.log(`   School: ${course.school?.name || 'N/A'}`);
      console.log(`   Department: ${course.department?.name || 'N/A'}`);
      console.log(`   ID: ${course._id}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

checkAvailableCourses();