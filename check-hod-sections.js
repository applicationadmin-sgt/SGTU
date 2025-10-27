const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./backend/models/User');
const Course = require('./backend/models/Course');
const Section = require('./backend/models/Section');

async function checkHODSections() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find HOD user
    const hod = await User.findOne({ role: 'hod' }).populate('department');
    if (!hod) {
      console.log('❌ No HOD found');
      return;
    }

    console.log(`\n👤 HOD: ${hod.name}`);
    console.log(`🏢 Department: ${hod.department?.name || 'No department'}`);

    // Get courses in HOD's department
    const courses = await Course.find({ department: hod.department._id })
      .select('title courseCode _id');
    
    console.log(`\n📚 Courses in department: ${courses.length}`);
    courses.forEach(course => {
      console.log(`  - ${course.courseCode} - ${course.title}`);
    });

    const courseIds = courses.map(c => c._id);

    // Get sections that have these courses
    const sections = await Section.find({ 
      department: hod.department._id,
      courses: { $in: courseIds }
    })
    .select('name _id courses')
    .lean();

    console.log(`\n📋 Sections with courses: ${sections.length}`);
    
    if (sections.length === 0) {
      console.log('\n⚠️ No sections found with courses assigned!');
      console.log('Checking all sections in department...');
      
      const allSections = await Section.find({ 
        department: hod.department._id 
      })
      .select('name _id courses')
      .lean();
      
      console.log(`\n📋 All sections in department: ${allSections.length}`);
      allSections.forEach(section => {
        console.log(`  - ${section.name} (ID: ${section._id})`);
        console.log(`    Courses: ${section.courses ? section.courses.length : 0}`);
        if (section.courses && section.courses.length > 0) {
          console.log(`    Course IDs: ${section.courses.join(', ')}`);
        }
      });
    } else {
      sections.forEach(section => {
        console.log(`\n  📌 Section: ${section.name}`);
        console.log(`     ID: ${section._id}`);
        console.log(`     Courses assigned: ${section.courses ? section.courses.length : 0}`);
        
        if (section.courses && section.courses.length > 0) {
          section.courses.forEach(courseId => {
            const course = courses.find(c => c._id.toString() === courseId.toString());
            if (course) {
              console.log(`       ✓ ${course.courseCode} - ${course.title}`);
            } else {
              console.log(`       ⚠️ Course ID ${courseId} not in department courses`);
            }
          });
        }
      });
    }

    await mongoose.disconnect();
    console.log('\n✅ Done');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkHODSections();
