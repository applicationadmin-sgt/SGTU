const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Course = require('./models/Course');
const Department = require('./models/Department');
const School = require('./models/School');
const Section = require('./models/Section');
const SectionCourseTeacher = require('./models/SectionCourseTeacher');

async function checkTeacherCourseDepartments() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('📊 Checking teacher-course department assignments...\n');

    // Get all active section-course-teacher assignments
    const assignments = await SectionCourseTeacher.find({ isActive: true })
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

    console.log(`Found ${assignments.length} active assignments\n`);

    let departmentMismatches = [];

    for (const assignment of assignments) {
      const teacherDept = assignment.teacher?.department?.name || 'No Department';
      const courseDept = assignment.course?.department?.name || 'No Department';
      
      console.log(`🔍 Section: ${assignment.section.sectionCode}`);
      console.log(`   Course: ${assignment.course.title} (${assignment.course.courseCode})`);
      console.log(`   Course Department: ${courseDept}`);
      console.log(`   Teacher: ${assignment.teacher.name}`);
      console.log(`   Teacher Department: ${teacherDept}`);
      
      if (teacherDept !== courseDept) {
        console.log(`   ❌ DEPARTMENT MISMATCH!`);
        departmentMismatches.push({
          section: assignment.section.sectionCode,
          course: `${assignment.course.title} (${assignment.course.courseCode})`,
          courseDept,
          teacher: assignment.teacher.name,
          teacherDept
        });
      } else {
        console.log(`   ✅ Departments match`);
      }
      console.log('');
    }

    if (departmentMismatches.length > 0) {
      console.log('\n🚨 DEPARTMENT MISMATCHES FOUND:');
      departmentMismatches.forEach((mismatch, index) => {
        console.log(`${index + 1}. Section ${mismatch.section}:`);
        console.log(`   Course: ${mismatch.course} (${mismatch.courseDept} dept)`);
        console.log(`   Teacher: ${mismatch.teacher} (${mismatch.teacherDept} dept)`);
      });
    } else {
      console.log('\n✅ All assignments have matching departments!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkTeacherCourseDepartments();