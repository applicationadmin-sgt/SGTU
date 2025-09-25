require('dotenv').config();
const mongoose = require('mongoose');

// Import models
require('./models/User');
require('./models/Department');
require('./models/Course');
require('./models/Section');
require('./models/School');

const User = mongoose.model('User');
const Department = mongoose.model('Department');
const Course = mongoose.model('Course');
const Section = mongoose.model('Section');
const School = mongoose.model('School');

async function checkSchoolDepartmentRelationship() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Find HOD user and their department
    console.log('\n👤 HOD User Information:');
    const hodUser = await User.findOne({ email: 'sourav1192002@gmail.com' }).populate('department');
    console.log(`Name: ${hodUser.name}`);
    console.log(`Department: ${hodUser.department ? hodUser.department.name : 'None'}`);
    console.log(`Department ID: ${hodUser.department ? hodUser.department._id : 'None'}`);

    if (!hodUser.department) {
      console.log('❌ HOD has no department!');
      return;
    }

    // Get the department details
    console.log('\n🏢 Department Details:');
    const department = await Department.findById(hodUser.department._id).populate('school');
    console.log(`Department: ${department.name} (${department.code})`);
    console.log(`School: ${department.school ? department.school.name : 'None'}`);
    console.log(`School ID: ${department.school ? department.school._id : 'None'}`);

    if (!department.school) {
      console.log('❌ Department has no school assigned!');
      return;
    }

    // Find all sections in the same school
    console.log('\n🏫 Sections in the Same School:');
    const schoolSections = await Section.find({ school: department.school._id })
      .populate('courses', 'title courseCode department')
      .populate('school', 'name');

    console.log(`Found ${schoolSections.length} sections in school "${department.school.name}"`);
    
    schoolSections.forEach((section, index) => {
      console.log(`\n${index + 1}. Section: ${section.name} (${section.code})`);
      console.log(`   School: ${section.school ? section.school.name : 'None'}`);
      console.log(`   Courses (${section.courses ? section.courses.length : 0}):`);
      
      if (section.courses && section.courses.length > 0) {
        section.courses.forEach((course, courseIndex) => {
          const belongsToCyberSecurity = course.department && 
            course.department.toString() === department._id.toString();
          const marker = belongsToCyberSecurity ? '✅' : '❌';
          console.log(`     ${courseIndex + 1}. ${marker} ${course.title} (${course.courseCode})`);
          console.log(`        Dept ID: ${course.department || 'None'}`);
        });
      }
    });

    // Summary
    console.log('\n📋 Summary:');
    console.log(`HOD "${hodUser.name}" manages CYBER SECURITY department`);
    console.log(`Department belongs to "${department.school.name}" school`);
    console.log(`School has ${schoolSections.length} sections`);
    
    // Count sections that have CYBER SECURITY courses
    const sectionsWithCyberSecurityCourses = schoolSections.filter(section => 
      section.courses && section.courses.some(course => 
        course.department && course.department.toString() === department._id.toString()
      )
    );
    
    console.log(`${sectionsWithCyberSecurityCourses.length} sections contain CYBER SECURITY courses`);
    
    if (sectionsWithCyberSecurityCourses.length > 0) {
      console.log('\n🎯 Sections where HOD can assign teachers:');
      sectionsWithCyberSecurityCourses.forEach(section => {
        const cyberSecurityCourses = section.courses.filter(course => 
          course.department && course.department.toString() === department._id.toString()
        );
        console.log(`- ${section.name}: ${cyberSecurityCourses.map(c => c.title).join(', ')}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    console.log('\n🔌 Disconnecting from MongoDB');
    await mongoose.disconnect();
  }
}

checkSchoolDepartmentRelationship();