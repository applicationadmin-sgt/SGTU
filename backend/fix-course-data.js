const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Import models
const Course = require('./models/Course');
const Department = require('./models/Department');

async function fixCourseData() {
  try {
    console.log('🔧 Fixing Missing Course Names and Codes');
    console.log('='.repeat(45));

    // Find all courses that are missing name or code
    const courses = await Course.find({
      $or: [
        { name: { $exists: false } },
        { name: null },
        { name: '' },
        { code: { $exists: false } },
        { code: null },
        { code: '' }
      ]
    }).populate('department', 'name');

    console.log(`Found ${courses.length} courses with missing data`);

    if (courses.length === 0) {
      console.log('✅ No courses need fixing!');
      return;
    }

    // Show what we found
    console.log('\n📋 Courses to fix:');
    courses.forEach((course, index) => {
      console.log(`${index + 1}. Course ID: ${course._id}`);
      console.log(`   Current name: ${course.name || 'MISSING'}`);
      console.log(`   Current code: ${course.code || 'MISSING'}`);
      console.log(`   Department: ${course.department?.name || 'Unknown'}`);
      console.log(`   Credits: ${course.credits || 'Unknown'}`);
      console.log('   ---');
    });

    // Fix the courses with default values based on their department
    const updates = [];
    
    for (let i = 0; i < courses.length; i++) {
      const course = courses[i];
      const deptName = course.department?.name || 'General';
      
      // Generate default name and code if missing
      const defaultName = course.name || `${deptName} Course ${i + 1}`;
      const defaultCode = course.code || `${deptName.substring(0, 3).toUpperCase()}${String(i + 1).padStart(3, '0')}`;
      
      updates.push({
        courseId: course._id,
        updates: {
          name: defaultName,
          code: defaultCode
        }
      });
    }

    console.log('\n🔄 Applying fixes...');
    
    // Apply updates
    for (const update of updates) {
      await Course.findByIdAndUpdate(update.courseId, update.updates);
      console.log(`✅ Updated course ${update.courseId}: ${update.updates.name} (${update.updates.code})`);
    }

    console.log('\n✨ Course data fix completed!');
    
    // Verify the fixes
    const fixedCourses = await Course.find({
      _id: { $in: updates.map(u => u.courseId) }
    }).populate('department', 'name');
    
    console.log('\n📊 Verification:');
    fixedCourses.forEach((course, index) => {
      console.log(`${index + 1}. ${course.name} (${course.code}) - ${course.department?.name || 'No Dept'}`);
    });

  } catch (error) {
    console.error('Error fixing course data:', error);
  } finally {
    mongoose.connection.close();
  }
}

fixCourseData();