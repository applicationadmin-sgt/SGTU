const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Course = require('./models/Course');

async function checkCourseUpdates() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to database');

    const courseIds = [
      '68ccf6819df95f047c763d58',  // First course
      '68cd12a45028f5fc5306b197'   // Second course
    ];

    console.log('\n🔍 Checking course updates directly...\n');

    for (const courseId of courseIds) {
      console.log(`📋 Course ID: ${courseId}`);
      
      // Get the raw document without population
      const course = await Course.findById(courseId).lean();
      
      if (course) {
        console.log(`   Name: "${course.name || 'NOT SET'}"`);
        console.log(`   Code: "${course.code || 'NOT SET'}"`);
        console.log(`   Credits: ${course.credits}`);
        console.log(`   Department: ${course.department}`);
        console.log(`   Raw Document:`, JSON.stringify(course, null, 2));
      } else {
        console.log('   ❌ Course not found');
      }
      console.log('   ---');
    }

    // Also check what fields are defined in the Course schema
    console.log('\n📋 Course Schema Info:');
    console.log('   Schema paths:', Object.keys(Course.schema.paths));
    console.log('   Required fields:', Course.schema.requiredPaths());

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from database');
  }
}

checkCourseUpdates();