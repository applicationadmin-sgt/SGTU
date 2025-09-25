require('dotenv').config();
const mongoose = require('mongoose');

// Import models
require('./models/User');
require('./models/Department');
require('./models/Course');
require('./models/Section');

const User = mongoose.model('User');
const Department = mongoose.model('Department');
const Course = mongoose.model('Course');
const Section = mongoose.model('Section');

async function debugHODDashboard() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Find the HOD user (Sourav)
    console.log('\n👤 Finding HOD User...');
    const hodUser = await User.findOne({ email: 'sourav1192002@gmail.com' }).populate('department');
    
    if (!hodUser) {
      console.log('❌ HOD user not found!');
      return;
    }

    console.log('✅ HOD User found:');
    console.log(`   Name: ${hodUser.name}`);
    console.log(`   Email: ${hodUser.email}`);
    console.log(`   Role: ${hodUser.role}`);
    console.log(`   Roles: [${hodUser.roles ? hodUser.roles.join(', ') : 'none'}]`);
    console.log(`   Department: ${hodUser.department ? hodUser.department.name : 'None'} (${hodUser.department ? hodUser.department._id : 'No ID'})`);

    if (!hodUser.department) {
      console.log('❌ HOD has no department assigned!');
      return;
    }

    const departmentId = hodUser.department._id;
    console.log(`\n🎯 Department ID for queries: ${departmentId}`);

    // Now test the exact queries used in getHODDashboard
    console.log('\n📊 Testing HOD Dashboard Queries...');

    // 1. Teacher Count
    console.log('\n👨‍🏫 Teacher Count Query:');
    const teacherQuery = { 
      department: departmentId, 
      $or: [
        { role: 'teacher' },
        { roles: { $in: ['teacher'] } }
      ],
      isActive: { $ne: false }
    };
    console.log('Query:', JSON.stringify(teacherQuery, null, 2));
    
    const teacherCount = await User.countDocuments(teacherQuery);
    console.log(`Result: ${teacherCount} teachers`);

    // List the actual teachers found
    const teachers = await User.find(teacherQuery).select('name email role roles');
    console.log('Teachers found:');
    teachers.forEach((teacher, index) => {
      console.log(`  ${index + 1}. ${teacher.name} (${teacher.email})`);
      console.log(`     Role: ${teacher.role}, Roles: [${teacher.roles ? teacher.roles.join(', ') : 'none'}]`);
    });

    // 2. Student Count
    console.log('\n👨‍🎓 Student Count Query:');
    const studentQuery = { 
      department: departmentId, 
      $or: [
        { role: 'student' },
        { roles: { $in: ['student'] } }
      ],
      isActive: { $ne: false }
    };
    const studentCount = await User.countDocuments(studentQuery);
    console.log(`Result: ${studentCount} students`);

    // 3. Course Count
    console.log('\n📚 Course Count Query:');
    const courseQuery = { department: departmentId };
    const courseCount = await Course.countDocuments(courseQuery);
    console.log(`Result: ${courseCount} courses`);

    // List the actual courses found
    const courses = await Course.find(courseQuery).select('title courseCode department').populate('department', 'name');
    console.log('Courses found:');
    courses.forEach((course, index) => {
      console.log(`  ${index + 1}. ${course.title} (${course.courseCode})`);
      console.log(`     Department: ${course.department ? course.department.name : 'None'}`);
    });

    // 4. Section Count
    console.log('\n🏫 Section Count Query:');
    const sectionQuery = { department: departmentId };
    const sectionCount = await Section.countDocuments(sectionQuery);
    console.log(`Result: ${sectionCount} sections`);

    // List the actual sections found
    const sections = await Section.find(sectionQuery).select('name code department').populate('department', 'name');
    console.log('Sections found:');
    sections.forEach((section, index) => {
      console.log(`  ${index + 1}. ${section.name} (${section.code})`);
      console.log(`     Department: ${section.department ? section.department.name : 'None'}`);
    });

    console.log('\n📋 Summary:');
    console.log(`Teachers: ${teacherCount}`);
    console.log(`Students: ${studentCount}`);
    console.log(`Courses: ${courseCount}`);
    console.log(`Sections: ${sectionCount}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    console.log('\n🔌 Disconnecting from MongoDB');
    await mongoose.disconnect();
  }
}

debugHODDashboard();