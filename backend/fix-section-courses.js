const mongoose = require('mongoose');
require('dotenv').config();

const Section = require('./models/Section');
const Course = require('./models/Course');
const User = require('./models/User');
const Department = require('./models/Department');

async function fixSectionCourses() {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/sgtlms';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find HOD and their department
    const hod = await User.findOne({ role: 'hod' }).populate('department');
    if (!hod || !hod.department) {
      console.log('❌ No HOD with department found');
      return;
    }

    console.log(`\n👤 HOD: ${hod.name}`);
    console.log(`🏢 Department: ${hod.department.name}`);

    // Get all courses in this department
    const courses = await Course.find({ department: hod.department._id })
      .select('title courseCode _id');
    
    console.log(`\n📚 Found ${courses.length} courses in department:`);
    courses.forEach(course => {
      console.log(`  - ${course.courseCode}: ${course.title}`);
    });

    // Get all sections in this department
    const sections = await Section.find({ department: hod.department._id });
    
    console.log(`\n📋 Found ${sections.length} sections in department:`);
    
    if (sections.length === 0) {
      console.log('❌ No sections found in department');
      return;
    }

    // Assign all department courses to all sections
    const courseIds = courses.map(c => c._id);
    
    for (const section of sections) {
      console.log(`\n📌 Section: ${section.name}`);
      console.log(`   Current courses: ${section.courses ? section.courses.length : 0}`);
      
      // Update section to include all department courses
      section.courses = courseIds;
      await section.save();
      
      console.log(`   ✅ Updated with ${courseIds.length} courses`);
    }

    console.log('\n✅ All sections updated successfully!');
    
    // Verify the update
    console.log('\n🔍 Verification:');
    const updatedSections = await Section.find({ 
      department: hod.department._id,
      courses: { $in: courseIds }
    });
    
    console.log(`   ${updatedSections.length} sections now have courses assigned`);

    await mongoose.disconnect();
    console.log('\n✅ Done');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixSectionCourses();
