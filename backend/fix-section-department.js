const mongoose = require('mongoose');
require('dotenv').config();

const Section = require('./models/Section');
const Department = require('./models/Department');
const Course = require('./models/Course');
const User = require('./models/User');

async function checkAndFixSections() {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/sgtlms';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find the Python department
    const pythonDept = await Department.findOne({ name: /python/i });
    if (!pythonDept) {
      console.log('❌ Python department not found');
      return;
    }

    console.log(`\n🏢 Python Department ID: ${pythonDept._id}`);
    console.log(`   Name: ${pythonDept.name}`);

    // Find section K22Kg
    const section = await Section.findOne({ name: 'K22Kg' });
    if (!section) {
      console.log('❌ Section K22Kg not found');
      return;
    }

    console.log(`\n📋 Section K22Kg:`);
    console.log(`   ID: ${section._id}`);
    console.log(`   Current Department: ${section.department}`);
    console.log(`   Current Courses: ${section.courses ? section.courses.length : 0}`);

    // Get the course
    const course = await Course.findOne({ courseCode: 'C000001' });
    if (!course) {
      console.log('❌ Course C000001 not found');
      return;
    }

    console.log(`\n📚 Course C000001:`);
    console.log(`   ID: ${course._id}`);
    console.log(`   Title: ${course.title}`);
    console.log(`   Department: ${course.department}`);

    // Update section to have correct department and course
    section.department = pythonDept._id;
    section.courses = [course._id];
    await section.save();

    console.log(`\n✅ Section K22Kg updated:`);
    console.log(`   Department: ${pythonDept.name}`);
    console.log(`   Courses assigned: 1 (${course.courseCode})`);

    // Verify
    const updatedSection = await Section.findById(section._id).populate('department').populate('courses');
    console.log(`\n🔍 Verification:`);
    console.log(`   Section: ${updatedSection.name}`);
    console.log(`   Department: ${updatedSection.department?.name}`);
    console.log(`   Courses: ${updatedSection.courses?.length || 0}`);
    if (updatedSection.courses && updatedSection.courses.length > 0) {
      updatedSection.courses.forEach(c => {
        console.log(`     - ${c.courseCode}: ${c.title}`);
      });
    }

    await mongoose.disconnect();
    console.log('\n✅ Done');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkAndFixSections();
