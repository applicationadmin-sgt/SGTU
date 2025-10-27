/**
 * Diagnostic Script: Check Course-Section Assignments
 * 
 * This script helps diagnose why courses might not show students in analytics.
 * It checks if courses are properly linked to sections and if sections have students.
 * 
 * Usage: node check-course-sections.js <courseId>
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Course = require('./models/Course');
const Section = require('./models/Section');
const User = require('./models/User');

async function checkCourseSections(courseId) {
  try {
    console.log('\n🔍 Course-Section Diagnostic Tool\n');
    console.log('=' .repeat(60));

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // 1. Check if course exists
    const course = await Course.findById(courseId).populate('department');
    if (!course) {
      console.log('❌ Course not found with ID:', courseId);
      process.exit(1);
    }

    console.log('📚 Course Information:');
    console.log('   Title:', course.courseTitle);
    console.log('   Code:', course.courseCode);
    console.log('   Department:', course.department?.name || 'N/A');
    console.log('   ID:', course._id);
    console.log('');

    // 2. Find sections that have this course
    const sections = await Section.find({ courses: courseId })
      .populate('students', 'name email regNo uid')
      .populate('teachers', 'name email')
      .populate('department', 'name');

    console.log('📋 Sections with this course:');
    console.log('   Total sections:', sections.length);
    console.log('');

    if (sections.length === 0) {
      console.log('⚠️  WARNING: This course is not assigned to any sections!');
      console.log('');
      console.log('💡 Solution:');
      console.log('   1. Go to Sections management in the admin/HOD dashboard');
      console.log('   2. Edit each section where this course should be taught');
      console.log('   3. Add this course to the section\'s courses array');
      console.log('');
      
      // Find all sections in the same department
      if (course.department) {
        const deptSections = await Section.find({ department: course.department._id })
          .select('name students');
        console.log(`   Sections in ${course.department.name} department:`);
        deptSections.forEach((sec, idx) => {
          console.log(`   ${idx + 1}. ${sec.name} (${sec.students?.length || 0} students)`);
        });
      }
    } else {
      let totalStudents = 0;
      
      sections.forEach((section, idx) => {
        console.log(`   Section ${idx + 1}:`);
        console.log(`   ├─ Name: ${section.name}`);
        console.log(`   ├─ ID: ${section._id}`);
        console.log(`   ├─ Department: ${section.department?.name || 'N/A'}`);
        console.log(`   ├─ Students: ${section.students?.length || 0}`);
        console.log(`   ├─ Teachers: ${section.teachers?.length || 0}`);
        console.log(`   └─ Courses assigned: ${section.courses?.length || 0}`);
        
        if (section.students && section.students.length > 0) {
          console.log(`      Students enrolled:`);
          section.students.slice(0, 5).forEach((student, i) => {
            console.log(`      ${i + 1}. ${student.name} (${student.regNo || student.uid || student.email})`);
          });
          if (section.students.length > 5) {
            console.log(`      ... and ${section.students.length - 5} more`);
          }
        } else {
          console.log(`      ⚠️  No students enrolled in this section`);
        }
        
        console.log('');
        totalStudents += section.students?.length || 0;
      });

      console.log(`   Total students across all sections: ${totalStudents}`);
      console.log('');

      if (totalStudents === 0) {
        console.log('⚠️  WARNING: Sections found but no students enrolled!');
        console.log('');
        console.log('💡 Solution:');
        console.log('   1. Go to Sections management');
        console.log('   2. Add students to the sections');
        console.log('   3. Or use bulk upload feature to enroll students');
        console.log('');
      } else {
        console.log('✅ Course is properly configured!');
        console.log(`   ${sections.length} section(s) with ${totalStudents} total student(s)`);
        console.log('');
      }
    }

    // 3. Check if sections have this course in their array
    const allSections = await Section.find().select('name courses');
    const sectionsWithCourse = allSections.filter(s => 
      s.courses?.some(c => c.toString() === courseId)
    );
    
    console.log('🔗 Cross-check:');
    console.log(`   Sections containing course ID ${courseId}:`, sectionsWithCourse.length);
    if (sectionsWithCourse.length !== sections.length) {
      console.log('   ⚠️  Mismatch detected! Some sections may have incorrect course references.');
    }
    console.log('');

    console.log('=' .repeat(60));
    console.log('✅ Diagnostic complete\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Get courseId from command line argument
const courseId = process.argv[2];

if (!courseId) {
  console.log('Usage: node check-course-sections.js <courseId>');
  console.log('');
  console.log('Example:');
  console.log('  node check-course-sections.js 507f1f77bcf86cd799439011');
  process.exit(1);
}

checkCourseSections(courseId);
