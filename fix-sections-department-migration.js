/**
 * DATA MIGRATION SCRIPT: Fix Sections Missing Department Field
 * 
 * Purpose: Fix existing sections that have courses assigned but no department field set
 * This script will automatically set the section.department based on assigned courses
 * 
 * Run this ONCE after implementing the permanent fix in assignCoursesToSection
 */

const mongoose = require('mongoose');
const Section = require('./backend/models/Section');
const Course = require('./backend/models/Course');

async function fixSectionsDepartmentMigration() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/sgtlms', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Find sections that have courses but no department set
    const sectionsWithoutDepartment = await Section.find({
      courses: { $exists: true, $ne: [] },
      $or: [
        { department: { $exists: false } },
        { department: null }
      ]
    });

    console.log(`📊 Found ${sectionsWithoutDepartment.length} sections with courses but no department`);

    let fixedCount = 0;
    let errorCount = 0;
    
    for (const section of sectionsWithoutDepartment) {
      try {
        console.log(`\n🔧 Processing Section: ${section.name} (${section._id})`);
        console.log(`   Courses: ${section.courses.length} assigned`);

        // Get all courses for this section
        const courses = await Course.find({ _id: { $in: section.courses } });
        
        if (courses.length === 0) {
          console.log(`   ⚠️  No valid courses found - skipping`);
          continue;
        }

        // Check if all courses belong to same department
        const departmentIds = [...new Set(courses.map(course => course.department.toString()))];
        
        if (departmentIds.length > 1) {
          console.log(`   ❌ ERROR: Courses belong to multiple departments: ${departmentIds}`);
          console.log(`   Course departments:`, courses.map(c => ({ title: c.title, dept: c.department })));
          errorCount++;
          continue;
        }

        // Set the department
        const departmentId = departmentIds[0];
        section.department = departmentId;
        await section.save();

        console.log(`   ✅ Fixed: Set department to ${departmentId}`);
        fixedCount++;

      } catch (error) {
        console.log(`   ❌ Error processing section ${section._id}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n📈 MIGRATION COMPLETE:`);
    console.log(`   ✅ Fixed: ${fixedCount} sections`);
    console.log(`   ❌ Errors: ${errorCount} sections`);
    console.log(`   📊 Total: ${sectionsWithoutDepartment.length} sections processed`);

    // Verify the fix
    console.log(`\n🔍 VERIFICATION:`);
    const stillBrokenSections = await Section.find({
      courses: { $exists: true, $ne: [] },
      $or: [
        { department: { $exists: false } },
        { department: null }
      ]
    });
    console.log(`   Remaining broken sections: ${stillBrokenSections.length}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the migration
if (require.main === module) {
  fixSectionsDepartmentMigration();
}

module.exports = fixSectionsDepartmentMigration;