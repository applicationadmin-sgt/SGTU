/**
 * TEST SCRIPT: Check Section Department Status
 * 
 * Purpose: Check current state of sections and their department assignments
 * This will help us understand which sections need the migration
 */

const mongoose = require('mongoose');
const Section = require('./backend/models/Section');
const Course = require('./backend/models/Course');
const Department = require('./backend/models/Department');

async function checkSectionDepartmentStatus() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/sgtlms', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    console.log('📊 SECTION DEPARTMENT ANALYSIS:\n');

    // 1. Sections with courses but no department
    const sectionsWithoutDept = await Section.find({
      courses: { $exists: true, $ne: [] },
      $or: [
        { department: { $exists: false } },
        { department: null }
      ]
    }).populate('courses', 'title courseCode department');

    console.log(`🔍 Sections with courses but NO department: ${sectionsWithoutDept.length}`);
    for (const section of sectionsWithoutDept) {
      console.log(`   - ${section.name} (${section._id})`);
      console.log(`     Courses: ${section.courses.map(c => c.title).join(', ')}`);
      
      if (section.courses.length > 0) {
        const depts = [...new Set(section.courses.map(c => c.department?.toString()))];
        console.log(`     Course departments: ${depts.length} unique - ${depts}`);
      }
    }

    // 2. Sections with department but no courses
    const sectionsWithDeptNoCourses = await Section.find({
      department: { $exists: true, $ne: null },
      $or: [
        { courses: { $exists: false } },
        { courses: { $size: 0 } }
      ]
    }).populate('department', 'name');

    console.log(`\n🔍 Sections with department but NO courses: ${sectionsWithDeptNoCourses.length}`);
    for (const section of sectionsWithDeptNoCourses) {
      console.log(`   - ${section.name} (${section.department?.name || 'Unknown Dept'})`);
    }

    // 3. Sections with both department and courses (good state)
    const sectionsProperlyConfigured = await Section.find({
      department: { $exists: true, $ne: null },
      courses: { $exists: true, $ne: [] }
    }).populate('department', 'name').populate('courses', 'title');

    console.log(`\n✅ Properly configured sections: ${sectionsProperlyConfigured.length}`);
    for (const section of sectionsProperlyConfigured) {
      console.log(`   - ${section.name} (${section.department?.name}) - ${section.courses.length} courses`);
    }

    // 4. Total sections summary
    const totalSections = await Section.countDocuments();
    console.log(`\n📈 SUMMARY:`);
    console.log(`   Total sections: ${totalSections}`);
    console.log(`   Need department fix: ${sectionsWithoutDept.length}`);
    console.log(`   Have dept, no courses: ${sectionsWithDeptNoCourses.length}`);
    console.log(`   Properly configured: ${sectionsProperlyConfigured.length}`);

  } catch (error) {
    console.error('❌ Analysis failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the analysis
if (require.main === module) {
  checkSectionDepartmentStatus();
}

module.exports = checkSectionDepartmentStatus;