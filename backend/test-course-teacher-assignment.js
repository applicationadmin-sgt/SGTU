const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Section = require('./models/Section');
const Course = require('./models/Course');
const User = require('./models/User');
const School = require('./models/School');
const Department = require('./models/Department');
const SectionCourseTeacher = require('./models/SectionCourseTeacher');

async function testCourseTeacherAssignment() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Find a sample section with courses
    console.log('\n📋 Finding a section with courses...');
    const section = await Section.findOne({ courses: { $exists: true, $ne: [] } })
      .populate('courses', 'title courseCode')
      .populate('school', 'name')
      .populate('department', 'name');
    
    if (!section) {
      console.log('❌ No section with courses found');
      return;
    }

    console.log(`✅ Found section: ${section.name}`);
    console.log(`   School: ${section.school?.name || 'Unknown'}`);
    console.log(`   Department: ${section.department?.name || 'Unknown'}`);
    console.log(`   Courses (${section.courses.length}):`);
    section.courses.forEach((course, index) => {
      console.log(`   ${index + 1}. ${course.title} (${course.courseCode})`);
    });

    // Find some teachers
    console.log('\n👩‍🏫 Finding available teachers...');
    const teachers = await User.find({ role: 'teacher' })
      .select('name email teacherId')
      .limit(3);
    
    if (teachers.length === 0) {
      console.log('❌ No teachers found');
      return;
    }

    console.log(`✅ Found ${teachers.length} teachers:`);
    teachers.forEach((teacher, index) => {
      console.log(`   ${index + 1}. ${teacher.name} (${teacher.email}) - ID: ${teacher.teacherId || 'N/A'}`);
    });

    // Test: Get unassigned courses
    console.log('\n🔍 Testing getUnassignedCourses...');
    const unassignedCourses = await SectionCourseTeacher.getUnassignedCourses(section._id);
    console.log(`✅ Found ${unassignedCourses.length} unassigned courses:`);
    unassignedCourses.forEach((course, index) => {
      console.log(`   ${index + 1}. ${course.title} (${course.courseCode})`);
    });

    if (unassignedCourses.length > 0 && teachers.length > 0) {
      // Test: Assign a teacher to a course
      console.log('\n🎯 Testing course-teacher assignment...');
      const courseToAssign = unassignedCourses[0];
      const teacherToAssign = teachers[0];

      // Find or create an admin user for assignedBy
      let admin = await User.findOne({ role: 'admin' });
      if (!admin) {
        console.log('⚠️ No admin found, creating temporary admin...');
        admin = new User({
          name: 'Test Admin',
          email: 'test.admin@test.com',
          password: 'password123',
          role: 'admin'
        });
        await admin.save();
      }

      const assignment = new SectionCourseTeacher({
        section: section._id,
        course: courseToAssign._id,
        teacher: teacherToAssign._id,
        assignedBy: admin._id,
        academicYear: section.academicYear || '2023-24',
        semester: section.semester || 'Fall'
      });

      await assignment.save();
      console.log(`✅ Assigned ${teacherToAssign.name} to ${courseToAssign.title}`);

      // Test: Get section course teachers
      console.log('\n📋 Testing getSectionCourseTeachers...');
      const assignments = await SectionCourseTeacher.getSectionCourseTeachers(section._id);
      console.log(`✅ Found ${assignments.length} course-teacher assignments:`);
      assignments.forEach((assignment, index) => {
        console.log(`   ${index + 1}. ${assignment.course.title} -> ${assignment.teacher.name}`);
        console.log(`      Assigned by: ${assignment.assignedBy.name}`);
        console.log(`      Date: ${assignment.assignedAt.toDateString()}`);
      });

      // Test: Get teacher assignments
      console.log('\n👩‍🏫 Testing getTeacherAssignments...');
      const teacherAssignments = await SectionCourseTeacher.getTeacherAssignments(teacherToAssign._id);
      console.log(`✅ Found ${teacherAssignments.length} assignments for ${teacherToAssign.name}:`);
      teacherAssignments.forEach((assignment, index) => {
        console.log(`   ${index + 1}. Section: ${assignment.section.name}`);
        console.log(`      Course: ${assignment.course.title}`);
        console.log(`      School: ${assignment.section.school.name}`);
      });

      // Test: Check if course is assigned
      console.log('\n🔍 Testing isCourseAssigned...');
      const isAssigned = await SectionCourseTeacher.isCourseAssigned(section._id, courseToAssign._id);
      console.log(`✅ Course assignment status: ${isAssigned ? 'ASSIGNED' : 'NOT ASSIGNED'}`);

      // Test: Get teacher for course
      console.log('\n👩‍🏫 Testing getTeacherForCourse...');
      const assignedTeacher = await SectionCourseTeacher.getTeacherForCourse(section._id, courseToAssign._id);
      if (assignedTeacher) {
        console.log(`✅ Teacher for course: ${assignedTeacher.name} (${assignedTeacher.email})`);
      } else {
        console.log('❌ No teacher found for course');
      }

      // Test: Get updated unassigned courses
      console.log('\n🔍 Testing updated unassigned courses...');
      const updatedUnassignedCourses = await SectionCourseTeacher.getUnassignedCourses(section._id);
      console.log(`✅ Updated unassigned courses count: ${updatedUnassignedCourses.length}`);
      
      // Clean up - remove the test assignment
      console.log('\n🧹 Cleaning up test assignment...');
      await SectionCourseTeacher.findByIdAndDelete(assignment._id);
      console.log('✅ Test assignment cleaned up');
    }

    console.log('\n🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Error during testing:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run the test
testCourseTeacherAssignment();