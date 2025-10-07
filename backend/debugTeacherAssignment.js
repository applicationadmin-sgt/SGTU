const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('./models/User');
const Department = require('./models/Department');
const Course = require('./models/Course');
const Section = require('./models/Section');
const School = require('./models/School');

async function debugTeacherAssignment() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🔗 Connected to MongoDB\n');

    // 1. Check all users with teacher role
    console.log('='.repeat(60));
    console.log('🔍 CHECKING USERS WITH TEACHER ROLE');
    console.log('='.repeat(60));

    const teachersWithRoles = await User.find({ 
      roles: { $in: ['teacher'] }
    }).populate('department', 'name code').select('name email roles role department teacherId');

    const teachersWithLegacyRole = await User.find({ 
      role: 'teacher' 
    }).populate('department', 'name code').select('name email roles role department teacherId');

    console.log(`📊 Teachers with 'roles' array containing 'teacher': ${teachersWithRoles.length}`);
    teachersWithRoles.forEach((teacher, index) => {
      console.log(`  ${index + 1}. ${teacher.name} (${teacher.email})`);
      console.log(`     - teacherId: ${teacher.teacherId || 'Not set'}`);
      console.log(`     - roles: [${teacher.roles?.join(', ') || 'None'}]`);
      console.log(`     - legacy role: ${teacher.role || 'None'}`);
      console.log(`     - department: ${teacher.department?.name || 'None'} (${teacher.department?._id || 'No ID'})`);
      console.log('');
    });

    console.log(`📊 Teachers with legacy 'role' field as 'teacher': ${teachersWithLegacyRole.length}`);
    teachersWithLegacyRole.forEach((teacher, index) => {
      console.log(`  ${index + 1}. ${teacher.name} (${teacher.email})`);
      console.log(`     - teacherId: ${teacher.teacherId || 'Not set'}`);
      console.log(`     - roles: [${teacher.roles?.join(', ') || 'None'}]`);
      console.log(`     - legacy role: ${teacher.role || 'None'}`);
      console.log(`     - department: ${teacher.department?.name || 'None'} (${teacher.department?._id || 'No ID'})`);
      console.log('');
    });

    // 2. Check all departments
    console.log('='.repeat(60));
    console.log('🏢 CHECKING DEPARTMENTS');
    console.log('='.repeat(60));

    const departments = await Department.find().populate('school', 'name code');
    console.log(`📊 Total departments: ${departments.length}`);
    departments.forEach((dept, index) => {
      console.log(`  ${index + 1}. ${dept.name} (${dept.code}) - ID: ${dept._id}`);
      console.log(`     - School: ${dept.school?.name || 'None'}`);
      console.log('');
    });

    // 3. Check courses and their departments
    console.log('='.repeat(60));
    console.log('📚 CHECKING COURSES');
    console.log('='.repeat(60));

    const courses = await Course.find().populate('department', 'name code').populate('school', 'name code');
    console.log(`📊 Total courses: ${courses.length}`);
    courses.forEach((course, index) => {
      console.log(`  ${index + 1}. ${course.title} (${course.courseCode}) - ID: ${course._id}`);
      console.log(`     - Department: ${course.department?.name || 'None'} (${course.department?._id || 'No ID'})`);
      console.log(`     - School: ${course.school?.name || 'None'}`);
      console.log('');
    });

    // 4. Check sections
    console.log('='.repeat(60));
    console.log('🏫 CHECKING SECTIONS');
    console.log('='.repeat(60));

    const sections = await Section.find()
      .populate('school', 'name code')
      .populate('department', 'name code')
      .populate('courses', 'title courseCode department')
      .populate('teacher', 'name email roles role department');

    console.log(`📊 Total sections: ${sections.length}`);
    sections.forEach((section, index) => {
      console.log(`  ${index + 1}. ${section.name} - ID: ${section._id}`);
      console.log(`     - School: ${section.school?.name || 'None'}`);
      console.log(`     - Department: ${section.department?.name || 'None'} (${section.department?._id || 'No ID'})`);
      console.log(`     - Teacher: ${section.teacher?.name || 'None'}`);
      console.log(`     - Courses: ${section.courses?.length || 0}`);
      if (section.courses && section.courses.length > 0) {
        section.courses.forEach((course, cIndex) => {
          console.log(`       ${cIndex + 1}. ${course.title} (${course.courseCode})`);
          console.log(`          - Course Dept ID: ${course.department || 'None'}`);
        });
      }
      console.log('');
    });

    // 5. Test the role query function
    console.log('='.repeat(60));
    console.log('🔧 TESTING ROLE QUERY FUNCTION');
    console.log('='.repeat(60));

    const { createRoleQuery } = require('./utils/roleUtils');
    const teacherQuery = createRoleQuery('teacher');
    console.log('🔍 Teacher role query:', JSON.stringify(teacherQuery, null, 2));

    const teachersFromQuery = await User.find(teacherQuery)
      .populate('department', 'name code')
      .select('name email roles role department teacherId isActive');

    console.log(`📊 Teachers found with role query: ${teachersFromQuery.length}`);
    teachersFromQuery.forEach((teacher, index) => {
      console.log(`  ${index + 1}. ${teacher.name} (${teacher.email})`);
      console.log(`     - teacherId: ${teacher.teacherId || 'Not set'}`);
      console.log(`     - roles: [${teacher.roles?.join(', ') || 'None'}]`);
      console.log(`     - legacy role: ${teacher.role || 'None'}`);
      console.log(`     - department: ${teacher.department?.name || 'None'} (${teacher.department?._id || 'No ID'})`);
      console.log(`     - isActive: ${teacher.isActive}`);
      console.log('');
    });

    // 6. Test specific department query
    if (departments.length > 0) {
      const testDepartmentId = departments[0]._id;
      console.log('='.repeat(60));
      console.log(`🎯 TESTING QUERY FOR DEPARTMENT: ${departments[0].name} (${testDepartmentId})`);
      console.log('='.repeat(60));

      const departmentTeacherQuery = {
        ...createRoleQuery('teacher'),
        department: testDepartmentId,
        isActive: { $ne: false }
      };

      console.log('🔍 Full query:', JSON.stringify(departmentTeacherQuery, null, 2));

      const departmentTeachers = await User.find(departmentTeacherQuery)
        .populate('department', 'name code')
        .select('name email roles role department teacherId isActive');

      console.log(`📊 Teachers in department ${departments[0].name}: ${departmentTeachers.length}`);
      departmentTeachers.forEach((teacher, index) => {
        console.log(`  ${index + 1}. ${teacher.name} (${teacher.email})`);
        console.log(`     - teacherId: ${teacher.teacherId || 'Not set'}`);
        console.log(`     - roles: [${teacher.roles?.join(', ') || 'None'}]`);
        console.log(`     - legacy role: ${teacher.role || 'None'}`);
        console.log(`     - department: ${teacher.department?.name || 'None'} (${teacher.department?._id || 'No ID'})`);
        console.log(`     - isActive: ${teacher.isActive}`);
        console.log('');
      });
    }

    // 7. Check all users for debugging
    console.log('='.repeat(60));
    console.log('👥 ALL USERS SUMMARY');
    console.log('='.repeat(60));

    const allUsers = await User.find().select('name email roles role department isActive');
    console.log(`📊 Total users in database: ${allUsers.length}`);
    
    const roleStats = {};
    allUsers.forEach(user => {
      const userRoles = user.roles || (user.role ? [user.role] : []);
      userRoles.forEach(role => {
        roleStats[role] = (roleStats[role] || 0) + 1;
      });
    });

    console.log('📊 Role distribution:');
    Object.entries(roleStats).forEach(([role, count]) => {
      console.log(`  - ${role}: ${count}`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Database debug complete!');

  } catch (error) {
    console.error('❌ Error debugging database:', error);
    process.exit(1);
  }
}

debugTeacherAssignment();