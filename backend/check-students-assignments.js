const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('./models/User');
const Section = require('./models/Section');
const Course = require('./models/Course');

async function checkStudentAssignments() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // List of students to check
    const studentEmails = [
      'mpollav02@gmail.com',
      'konkana369@gmail.com', 
      'asmita2912@gmail.com',
      'anikpatra@gmail.com',
      'arkakarmakar@gmail.com',
      'rohan05@gmail.com'
    ];

    console.log('\n🔍 CHECKING STUDENT ASSIGNMENTS\n');

    for (const email of studentEmails) {
      console.log(`\n👤 Student: ${email}`);
      
      // Find the student in User collection
      const student = await User.findOne({ email }).populate('coursesAssigned');
      
      if (!student) {
        console.log('   ❌ Student not found in database');
        continue;
      }

      console.log(`   📝 Name: ${student.name}`);
      console.log(`   🆔 Reg No: ${student.regNo}`);
      console.log(`   📚 Role: ${student.role}`);
      
      // Check courses assigned directly to student
      console.log(`   🎓 Courses Assigned (${student.coursesAssigned?.length || 0}):`);
      if (student.coursesAssigned && student.coursesAssigned.length > 0) {
        for (const course of student.coursesAssigned) {
          console.log(`      - ${course.title} (${course.courseCode})`);
        }
      } else {
        console.log('      - No courses assigned directly');
      }

      // Check sections where this student is enrolled
      console.log(`   📋 Sections:`);
      const sectionsAsStudent = await Section.find({ 
        students: student._id 
      }).populate('courses', 'title courseCode');

      if (sectionsAsStudent.length > 0) {
        for (const section of sectionsAsStudent) {
          console.log(`      - Section: ${section.name}`);
          console.log(`        Students count: ${section.students?.length || 0}`);
          if (section.courses && section.courses.length > 0) {
            console.log(`        Courses in section:`);
            for (const course of section.courses) {
              console.log(`          * ${course.title} (${course.courseCode})`);
            }
          }
        }
      } else {
        console.log('      - Not enrolled in any sections');
      }

      // Check if student has sections field in their user record
      if (student.sections && student.sections.length > 0) {
        console.log(`   📂 Sections in user profile (${student.sections.length}):`);
        const userSections = await Section.find({ 
          _id: { $in: student.sections } 
        }).populate('courses', 'title courseCode');
        
        for (const section of userSections) {
          console.log(`      - ${section.name}`);
          if (section.courses) {
            for (const course of section.courses) {
              console.log(`        Course: ${course.title} (${course.courseCode})`);
            }
          }
        }
      } else {
        console.log('   📂 No sections in user profile');
      }

      console.log('   ' + '─'.repeat(50));
    }

    // Also check all sections and their students for reference
    console.log('\n\n📋 ALL SECTIONS AND THEIR STUDENTS:\n');
    
    const allSections = await Section.find({})
      .populate('students', 'name email regNo')
      .populate('courses', 'title courseCode')
      .populate('teacher', 'name email')
      .populate('teachers', 'name email');

    for (const section of allSections) {
      console.log(`📋 Section: ${section.name}`);
      console.log(`   👥 Students (${section.students?.length || 0}):`);
      
      if (section.students && section.students.length > 0) {
        for (const student of section.students) {
          console.log(`      - ${student.name} (${student.regNo}) - ${student.email}`);
        }
      } else {
        console.log('      - No students');
      }

      console.log(`   🎓 Courses (${section.courses?.length || 0}):`);
      if (section.courses && section.courses.length > 0) {
        for (const course of section.courses) {
          console.log(`      - ${course.title} (${course.courseCode})`);
        }
      }

      console.log(`   👨‍🏫 Teachers:`);
      if (section.teacher) {
        console.log(`      - Main: ${section.teacher.name} (${section.teacher.email})`);
      }
      if (section.teachers && section.teachers.length > 0) {
        for (const teacher of section.teachers) {
          console.log(`      - ${teacher.name} (${teacher.email})`);
        }
      }
      console.log('   ' + '─'.repeat(40));
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

checkStudentAssignments();