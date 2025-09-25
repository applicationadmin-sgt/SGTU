const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Course = require('./models/Course');
const User = require('./models/User');

async function validateAndFixCCAssignments() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sgt-learning', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    console.log('\n🔍 Checking CC Assignment Violations...\n');

    // 1. Find courses with multiple coordinators (violation of "one course = one CC")
    const coursesWithMultipleCCs = await Course.find({
      coordinators: { $exists: true, $not: { $size: 0 } }
    }).populate('coordinators', 'name email teacherId').populate('department', 'name');

    const violatingCourses = coursesWithMultipleCCs.filter(course => course.coordinators.length > 1);
    
    if (violatingCourses.length > 0) {
      console.log(`❌ Found ${violatingCourses.length} courses with multiple CCs (violating "one course = one CC" rule):`);
      violatingCourses.forEach(course => {
        console.log(`   Course: ${course.title} (${course.courseCode}) - Department: ${course.department.name}`);
        console.log(`   CCs: ${course.coordinators.map(cc => cc.name).join(', ')}`);
      });
    } else {
      console.log('✅ No courses found with multiple CCs');
    }

    // 2. Find teachers assigned as CC to multiple courses (violation of "one teacher = one course")
    const allCCAssignments = await Course.find({
      coordinators: { $exists: true, $not: { $size: 0 } }
    }).populate('coordinators', 'name email teacherId');

    const ccCountMap = new Map(); // teacherId -> [courses]
    
    allCCAssignments.forEach(course => {
      course.coordinators.forEach(cc => {
        if (!ccCountMap.has(cc._id.toString())) {
          ccCountMap.set(cc._id.toString(), []);
        }
        ccCountMap.get(cc._id.toString()).push({
          courseId: course._id,
          title: course.title,
          courseCode: course.courseCode,
          ccName: cc.name,
          ccEmail: cc.email,
          teacherId: cc.teacherId
        });
      });
    });

    const violatingTeachers = Array.from(ccCountMap.entries()).filter(([teacherId, courses]) => courses.length > 1);
    
    if (violatingTeachers.length > 0) {
      console.log(`\n❌ Found ${violatingTeachers.length} teachers assigned as CC to multiple courses (violating "one teacher = one course" rule):`);
      violatingTeachers.forEach(([teacherId, courses]) => {
        console.log(`   Teacher: ${courses[0].ccName} (${courses[0].teacherId || courses[0].ccEmail})`);
        console.log(`   Assigned to ${courses.length} courses:`);
        courses.forEach(course => {
          console.log(`     - ${course.title} (${course.courseCode})`);
        });
      });
    } else {
      console.log('✅ No teachers found assigned as CC to multiple courses');
    }

    // 3. Summary of current CC assignments
    const totalCCAssignments = Array.from(ccCountMap.values()).reduce((sum, courses) => sum + courses.length, 0);
    const uniqueTeachers = ccCountMap.size;
    
    console.log(`\n📊 CC Assignment Summary:`);
    console.log(`   Total CC assignments: ${totalCCAssignments}`);
    console.log(`   Unique teachers as CC: ${uniqueTeachers}`);
    console.log(`   Courses with CCs: ${coursesWithMultipleCCs.length}`);
    console.log(`   Courses with multiple CCs: ${violatingCourses.length}`);
    console.log(`   Teachers with multiple CC roles: ${violatingTeachers.length}`);

    // 4. Option to fix violations automatically
    if (violatingCourses.length > 0 || violatingTeachers.length > 0) {
      console.log(`\n🔧 To fix these violations, run: node fix-cc-violations.js`);
      console.log(`   This will enforce: One course = One CC, One teacher = One course`);
    } else {
      console.log(`\n✅ All CC assignments are compliant with the rules!`);
    }

  } catch (error) {
    console.error('❌ Error during validation:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n📋 Validation completed');
  }
}

// Run the validation
validateAndFixCCAssignments();