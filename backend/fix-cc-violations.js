const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Course = require('./models/Course');
const User = require('./models/User');

async function fixCCViolations() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sgt-learning', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    console.log('\n🔧 Fixing CC Assignment Violations...\n');

    // 1. Fix "one course = one CC" violations (keep only the first CC for each course)
    const coursesWithMultipleCCs = await Course.find({
      coordinators: { $exists: true, $not: { $size: 0 } }
    }).populate('coordinators', 'name email teacherId');

    const violatingCourses = coursesWithMultipleCCs.filter(course => course.coordinators.length > 1);
    
    if (violatingCourses.length > 0) {
      console.log(`🔨 Fixing ${violatingCourses.length} courses with multiple CCs...`);
      
      for (const course of violatingCourses) {
        const firstCC = course.coordinators[0];
        const removedCCs = course.coordinators.slice(1);
        
        console.log(`   Course: ${course.title} (${course.courseCode})`);
        console.log(`     Keeping CC: ${firstCC.name} (${firstCC.teacherId || firstCC.email})`);
        console.log(`     Removing CCs: ${removedCCs.map(cc => cc.name).join(', ')}`);
        
        // Update course to have only the first CC
        await Course.findByIdAndUpdate(course._id, {
          coordinators: [firstCC._id]
        });
      }
      console.log(`✅ Fixed ${violatingCourses.length} courses with multiple CCs`);
    } else {
      console.log('✅ No courses with multiple CCs found');
    }

    // 2. Fix "one teacher = one course" violations 
    // For teachers assigned to multiple courses, keep only their FIRST assignment
    const allCCAssignments = await Course.find({
      coordinators: { $exists: true, $not: { $size: 0 } }
    }).populate('coordinators', 'name email teacherId');

    const ccCountMap = new Map(); // teacherId -> [course assignments]
    
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
      console.log(`\n🔨 Fixing ${violatingTeachers.length} teachers with multiple CC assignments...`);
      
      for (const [teacherId, courses] of violatingTeachers) {
        const keepCourse = courses[0]; // Keep first assignment
        const removeCourses = courses.slice(1); // Remove rest
        
        console.log(`   Teacher: ${keepCourse.ccName} (${keepCourse.teacherId || keepCourse.ccEmail})`);
        console.log(`     Keeping CC role for: ${keepCourse.title} (${keepCourse.courseCode})`);
        console.log(`     Removing CC role from: ${removeCourses.map(c => `${c.title} (${c.courseCode})`).join(', ')}`);
        
        // Remove this teacher from all other courses
        for (const course of removeCourses) {
          await Course.findByIdAndUpdate(course.courseId, {
            $pull: { coordinators: teacherId }
          });
        }
      }
      console.log(`✅ Fixed ${violatingTeachers.length} teachers with multiple CC assignments`);
    } else {
      console.log('✅ No teachers with multiple CC assignments found');
    }

    // 3. Final validation
    console.log(`\n📋 Running final validation...`);
    
    const finalCoursesWithCCs = await Course.find({
      coordinators: { $exists: true, $not: { $size: 0 } }
    }).populate('coordinators', 'name email teacherId');

    const finalViolatingCourses = finalCoursesWithCCs.filter(course => course.coordinators.length > 1);
    
    const finalCCCountMap = new Map();
    finalCoursesWithCCs.forEach(course => {
      course.coordinators.forEach(cc => {
        if (!finalCCCountMap.has(cc._id.toString())) {
          finalCCCountMap.set(cc._id.toString(), []);
        }
        finalCCCountMap.get(cc._id.toString()).push(course);
      });
    });
    
    const finalViolatingTeachers = Array.from(finalCCCountMap.entries()).filter(([teacherId, courses]) => courses.length > 1);
    
    if (finalViolatingCourses.length === 0 && finalViolatingTeachers.length === 0) {
      console.log('✅ All violations fixed! CC assignments now comply with the rules.');
    } else {
      console.log(`❌ Still have violations: ${finalViolatingCourses.length} courses, ${finalViolatingTeachers.length} teachers`);
    }

    console.log(`\n📊 Final CC Assignment Summary:`);
    console.log(`   Courses with CCs: ${finalCoursesWithCCs.length}`);
    console.log(`   Unique teachers as CC: ${finalCCCountMap.size}`);
    console.log(`   Total CC assignments: ${Array.from(finalCCCountMap.values()).reduce((sum, courses) => sum + courses.length, 0)}`);

  } catch (error) {
    console.error('❌ Error during fixing:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🎯 CC violation fixing completed');
  }
}

// Run the fix
fixCCViolations();