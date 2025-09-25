const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Course = require('./models/Course');
const Department = require('./models/Department');
const School = require('./models/School');

async function testHierarchicalTeacherLogic() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🧪 Testing Hierarchical Teacher Assignment Logic...\n');

    // Get a sample course
    const course = await Course.findOne({ courseCode: 'C000002' }) // Datascience 1
      .populate('department', 'name code school')
      .populate('school', 'name code');

    if (!course) {
      console.log('❌ No course found with code C000002');
      return;
    }

    console.log('📚 Testing Course:', course.title, '(' + course.courseCode + ')');
    console.log('🏢 Department:', course.department?.name);
    console.log('🏫 School:', course.school?.name);
    console.log('');

    // 1. Get teachers from course department
    const departmentTeachers = await User.find({
      role: 'teacher',
      department: course.department._id,
      isActive: true
    }).select('name email teacherId role');

    console.log('👨‍🏫 Teachers from Course Department:');
    if (departmentTeachers.length === 0) {
      console.log('   ❌ No teachers found in department');
    } else {
      departmentTeachers.forEach((teacher, i) => {
        console.log(`   ${i + 1}. ${teacher.name} (${teacher.email})`);
      });
    }
    console.log('');

    // 2. Get HOD of course department
    const hod = await User.findOne({
      role: 'hod',
      department: course.department._id,
      isActive: true
    }).select('name email teacherId role');

    console.log('👨‍💼 HOD of Course Department:');
    if (!hod) {
      console.log('   ❌ No HOD found for department');
    } else {
      console.log(`   ✅ ${hod.name} (${hod.email})`);
    }
    console.log('');

    // 3. Get Dean of school
    let school = course.school;
    if (!school && course.department?.school) {
      school = await School.findById(course.department.school);
    }

    const dean = await User.findOne({
      role: 'dean',
      school: school?._id,
      isActive: true
    }).select('name email teacherId role');

    console.log('👨‍💻 Dean of School:');
    if (!dean) {
      console.log('   ❌ No Dean found for school');
    } else {
      console.log(`   ✅ ${dean.name} (${dean.email})`);
    }
    console.log('');

    // Summary
    const totalInstructors = departmentTeachers.length + (hod ? 1 : 0) + (dean ? 1 : 0);
    console.log('📊 SUMMARY:');
    console.log(`   Teachers: ${departmentTeachers.length}`);
    console.log(`   HOD: ${hod ? 1 : 0}`);
    console.log(`   Dean: ${dean ? 1 : 0}`);
    console.log(`   Total Available Instructors: ${totalInstructors}`);

    if (totalInstructors === 0) {
      console.log('\n❌ NO INSTRUCTORS AVAILABLE FOR THIS COURSE!');
      console.log('   This means:');
      console.log('   - No teachers in the course department');
      console.log('   - No HOD assigned to the department');
      console.log('   - No dean assigned to the school');
    } else {
      console.log('\n✅ Course can be taught by available instructors!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testHierarchicalTeacherLogic();