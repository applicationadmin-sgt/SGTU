require('dotenv').config();
const mongoose = require('mongoose');

// Import models
require('./models/User');
require('./models/Department');
require('./models/Course');
require('./models/Section');

const Section = mongoose.model('Section');
const Course = mongoose.model('Course');

async function assignSectionsToDepartment() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const cyberSecDeptId = '68d10da16ba964074dd63cfd'; // CYBER SECURITY department

    console.log('\n🎯 Assigning sections to CYBER SECURITY department...');

    // Find sections that contain ethical hacking course
    const ethicalHackingCourse = await Course.findOne({ courseCode: 'C000003' });
    console.log('📚 Found ethical hacking course:', ethicalHackingCourse.title);

    // Find sections with this course
    const sectionsWithEthicalHacking = await Section.find({
      courses: ethicalHackingCourse._id
    });

    console.log(`\n📋 Found ${sectionsWithEthicalHacking.length} sections with ethical hacking:`);

    for (const section of sectionsWithEthicalHacking) {
      console.log(`\n🔄 Updating section: ${section.name || section.code}`);
      console.log(`   Before: Department = ${section.department || 'None'}`);
      
      // Update the section to belong to CYBER SECURITY department
      await Section.findByIdAndUpdate(section._id, {
        department: cyberSecDeptId
      });
      
      console.log(`   After: Department = CYBER SECURITY (${cyberSecDeptId})`);
    }

    // Verify the update
    console.log('\n✅ Verification - Sections now in CYBER SECURITY:');
    const cyberSections = await Section.find({ department: cyberSecDeptId })
      .populate('department', 'name')
      .populate('courses', 'title courseCode');
    
    cyberSections.forEach((section, index) => {
      console.log(`${index + 1}. ${section.name || section.code}`);
      console.log(`   Department: ${section.department.name}`);
      console.log(`   Courses: ${section.courses.length}`);
      section.courses.forEach(course => {
        console.log(`     - ${course.title} (${course.courseCode})`);
      });
    });

    console.log('\n🎉 Section assignment completed!');
    console.log('Now HOD Sourav can:');
    console.log('1. See sections in HOD dashboard');
    console.log('2. Assign teachers to courses within these sections');
    console.log('3. Manage department resources properly');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    console.log('\n🔌 Disconnecting from MongoDB');
    await mongoose.disconnect();
  }
}

assignSectionsToDepartment();