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

async function checkSectionsAndCourses() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const cyberSecDeptId = '68d10da16ba964074dd63cfd'; // CYBER SECURITY department

    console.log('\n🏢 CYBER SECURITY Department Analysis:');
    
    // 1. Check all sections in the system
    console.log('\n📋 All Sections in System:');
    const allSections = await Section.find({}).populate('department', 'name').populate('courses', 'title courseCode');
    allSections.forEach((section, index) => {
      console.log(`${index + 1}. ${section.name} (${section.code})`);
      console.log(`   Department: ${section.department ? section.department.name : 'None'} (${section.department ? section.department._id : 'No ID'})`);
      console.log(`   Courses: ${section.courses ? section.courses.length : 0}`);
      if (section.courses && section.courses.length > 0) {
        section.courses.forEach(course => {
          console.log(`     - ${course.title} (${course.courseCode})`);
        });
      }
    });

    // 2. Check sections specifically for CYBER SECURITY department
    console.log('\n🎯 Sections for CYBER SECURITY Department:');
    const cyberSections = await Section.find({ department: cyberSecDeptId }).populate('department', 'name').populate('courses', 'title courseCode');
    console.log(`Found ${cyberSections.length} sections for CYBER SECURITY`);
    cyberSections.forEach((section, index) => {
      console.log(`${index + 1}. ${section.name} (${section.code})`);
      console.log(`   Courses: ${section.courses ? section.courses.length : 0}`);
    });

    // 3. Check courses in CYBER SECURITY department
    console.log('\n📚 Courses in CYBER SECURITY Department:');
    const cyberCourses = await Course.find({ department: cyberSecDeptId }).populate('department', 'name');
    console.log(`Found ${cyberCourses.length} courses for CYBER SECURITY`);
    cyberCourses.forEach((course, index) => {
      console.log(`${index + 1}. ${course.title} (${course.courseCode})`);
      console.log(`   Department: ${course.department ? course.department.name : 'None'}`);
    });

    // 4. Check if there are any sections that have CYBER SECURITY courses
    console.log('\n🔍 Sections containing CYBER SECURITY courses:');
    const sectionsWithCyberCourses = await Section.find({
      courses: { $in: cyberCourses.map(c => c._id) }
    }).populate('department', 'name').populate('courses', 'title courseCode department');
    
    sectionsWithCyberCourses.forEach((section, index) => {
      console.log(`${index + 1}. ${section.name} (${section.code})`);
      console.log(`   Department: ${section.department ? section.department.name : 'None'}`);
      console.log(`   Has CYBER courses:`);
      section.courses.forEach(course => {
        if (course.department && course.department.toString() === cyberSecDeptId) {
          console.log(`     ✅ ${course.title} (${course.courseCode})`);
        }
      });
    });

    // 5. Solution suggestions
    console.log('\n💡 Recommended Actions:');
    console.log('1. Create sections for CYBER SECURITY department, OR');
    console.log('2. Assign existing sections to CYBER SECURITY department, OR');
    console.log('3. Add CYBER SECURITY courses to existing sections');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    console.log('\n🔌 Disconnecting from MongoDB');
    await mongoose.disconnect();
  }
}

checkSectionsAndCourses();