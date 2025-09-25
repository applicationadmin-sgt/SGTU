const mongoose = require('mongoose');
const SectionCourseTeacher = require('./models/SectionCourseTeacher');
const Section = require('./models/Section');
const Course = require('./models/Course');
const User = require('./models/User');
const Department = require('./models/Department');
const School = require('./models/School');
require('dotenv').config();

async function checkMeghaAssignments() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    // Megha's ID
    const meghaId = '68cba9bcaf91a41ca93194bf';
    
    // Get Megha's info
    const megha = await User.findById(meghaId);
    console.log(`\n👩‍🏫 Teacher: ${megha?.name} (${megha?.email})`);
    
    // Get all assignments for Megha
    const assignments = await SectionCourseTeacher.find({
      teacher: meghaId,
      isActive: true
    }).populate({
      path: 'section',
      select: 'name',
      populate: {
        path: 'school',
        select: 'name'
      }
    }).populate('course', 'title courseCode');
    
    console.log(`\n📋 Total active assignments: ${assignments.length}`);
    
    assignments.forEach((assignment, index) => {
      console.log(`\n   Assignment ${index + 1}:`);
      console.log(`   - Section: ${assignment.section?.name}`);
      console.log(`   - Course: ${assignment.course?.title} (${assignment.course?.courseCode})`);
      console.log(`   - School: ${assignment.section?.school?.name}`);
      console.log(`   - Assigned: ${assignment.assignedAt}`);
    });
    
    // Get unique sections
    const uniqueSections = [...new Set(assignments.map(a => a.section?._id?.toString()))];
    console.log(`\n🏫 Unique sections: ${uniqueSections.length}`);
    
    // Get unique courses
    const uniqueCourses = [...new Set(assignments.map(a => a.course?._id?.toString()))];
    console.log(`📖 Unique courses: ${uniqueCourses.length}`);
    
    // Test the teacher controller logic
    console.log('\n🔍 Testing teacher controller logic...');
    
    // Simulate what the teacherController.getTeacherCourses does
    const teacherAssignments = await SectionCourseTeacher.find({
      teacher: meghaId,
      isActive: true
    }).populate({
        path: 'section',
        select: 'name school department courses',
        populate: [
          {
            path: 'school',
            select: 'name'
          },
          {
            path: 'department', 
            select: 'name'
          }
        ]
      })
      .populate('course', 'title courseCode');
    
    console.log(`\n🎯 Teacher assignments found: ${teacherAssignments.length}`);
    
    // Group by section
    const sectionGroups = {};
    teacherAssignments.forEach(assignment => {
      const sectionId = assignment.section._id.toString();
      if (!sectionGroups[sectionId]) {
        sectionGroups[sectionId] = {
          section: assignment.section,
          courses: []
        };
      }
      sectionGroups[sectionId].courses.push(assignment.course);
    });
    
    console.log(`\n📊 Sections with courses:`);
    Object.values(sectionGroups).forEach((group, index) => {
      console.log(`\n   Section ${index + 1}: ${group.section.name}`);
      console.log(`   School: ${group.section.school?.name}`);
      console.log(`   Courses: ${group.courses.length}`);
      group.courses.forEach(course => {
        console.log(`     - ${course.title} (${course.courseCode})`);
      });
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

checkMeghaAssignments();