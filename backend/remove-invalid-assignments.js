const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Course = require('./models/Course');
const Department = require('./models/Department');
const School = require('./models/School');
const Section = require('./models/Section');
const SectionCourseTeacher = require('./models/SectionCourseTeacher');

async function removeInvalidAssignments() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🔧 Removing invalid department assignments...\n');

    // Find the problematic assignment
    const invalidAssignments = await SectionCourseTeacher.find({ isActive: true })
      .populate({
        path: 'teacher',
        select: 'name email teacherId department',
        populate: {
          path: 'department',
          select: 'name code'
        }
      })
      .populate({
        path: 'course',
        select: 'title courseCode department',
        populate: {
          path: 'department',
          select: 'name code'
        }
      })
      .populate('section', 'sectionCode');

    console.log(`Found ${invalidAssignments.length} assignments to check\n`);

    let removedCount = 0;

    for (const assignment of invalidAssignments) {
      const teacherDept = assignment.teacher?.department?.name;
      const courseDept = assignment.course?.department?.name;
      
      if (teacherDept !== courseDept) {
        console.log(`❌ REMOVING INVALID ASSIGNMENT:`);
        console.log(`   Section: ${assignment.section.sectionCode}`);
        console.log(`   Course: ${assignment.course.title} (${courseDept} dept)`);
        console.log(`   Teacher: ${assignment.teacher.name} (${teacherDept} dept)`);
        
        // Remove this assignment
        await SectionCourseTeacher.findByIdAndDelete(assignment._id);
        removedCount++;
        console.log(`   ✅ Assignment removed\n`);
      }
    }

    console.log(`🎯 Removed ${removedCount} invalid assignments`);
    
    if (removedCount === 0) {
      console.log('✅ No invalid assignments found');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

removeInvalidAssignments();