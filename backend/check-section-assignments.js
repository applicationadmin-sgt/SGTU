const mongoose = require('mongoose');
require('dotenv').config();

const SectionCourseTeacher = require('./models/SectionCourseTeacher');
const Section = require('./models/Section');
const Course = require('./models/Course');
const User = require('./models/User');

async function checkCurrentAssignments() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sgt-learning');
    console.log('✅ Connected to MongoDB');

    // Find the section As001
    const as001Section = await Section.findOne({ name: 'As001' });
    if (!as001Section) {
      console.log('❌ Section As001 not found');
      
      // Show all sections
      const allSections = await Section.find();
      console.log('\n📋 Available sections:');
      allSections.forEach(section => {
        console.log(`   - ${section.name} (${section.code || 'no code'})`);
      });
      return;
    }
    
    console.log(`\n🏫 Section: ${as001Section.name}`);
    console.log(`   ID: ${as001Section._id}`);
    console.log(`   Courses in section: ${as001Section.courses?.length || 0}`);
    
    // Get all course-teacher assignments for this section
    const assignments = await SectionCourseTeacher.find({ section: as001Section._id })
      .populate('course', 'name title courseCode')
      .populate('teacher', 'name email')
      .populate('assignedBy', 'name email');
    
    console.log(`\n📚 Current Course-Teacher Assignments: ${assignments.length}`);
    
    assignments.forEach((assignment, index) => {
      console.log(`   ${index + 1}. ${assignment.course?.name || assignment.course?.title} (${assignment.course?.courseCode})`);
      console.log(`      → Teacher: ${assignment.teacher?.name} (${assignment.teacher?.email})`);
      console.log(`      → Assigned by: ${assignment.assignedBy?.name}`);
      console.log(`      → Active: ${assignment.isActive}`);
      console.log(`      → Date: ${assignment.assignedAt}`);
      console.log('');
    });
    
    // Check courses in the section
    if (as001Section.courses && as001Section.courses.length > 0) {
      console.log(`\n📖 Courses assigned to section:`);
      for (const courseId of as001Section.courses) {
        const course = await Course.findById(courseId);
        if (course) {
          console.log(`   - ${course.name || course.title} (${course.courseCode})`);
          
          // Check if this course has a teacher assignment
          const courseAssignment = assignments.find(a => a.course._id.toString() === courseId.toString());
          if (courseAssignment) {
            console.log(`     ✅ Assigned to: ${courseAssignment.teacher.name}`);
          } else {
            console.log(`     ❌ No teacher assigned`);
          }
        }
      }
    }
    
    // Show available teachers
    const teachers = await User.find({ role: 'teacher' }).limit(5);
    console.log(`\n👨‍🏫 Available teachers: ${teachers.length}`);
    teachers.forEach(teacher => {
      console.log(`   - ${teacher.name} (${teacher.email})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

checkCurrentAssignments();