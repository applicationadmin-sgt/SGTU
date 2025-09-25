const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Import all required models
const SectionCourseTeacher = require('./models/SectionCourseTeacher');
const Section = require('./models/Section');
const Course = require('./models/Course');
const Department = require('./models/Department');
const School = require('./models/School');
const User = require('./models/User');

async function diagnoseSectionCourseData() {
  try {
    console.log('🔍 Diagnosing Section-Course-Teacher Assignment Data');
    console.log('='.repeat(60));

    // Get all assignments
    const assignments = await SectionCourseTeacher.find({})
      .populate({
        path: 'section',
        select: 'name code academicYear school department',
        populate: [
          {
            path: 'school',
            select: 'name code'
          },
          {
            path: 'department',
            select: 'name code'
          }
        ]
      })
      .populate({
        path: 'course',
        select: 'title courseCode credits description department',
        populate: {
          path: 'department',
          select: 'name code school',
          populate: {
            path: 'school',
            select: 'name code'
          }
        }
      })
      .populate('teacher', 'name email role teacherId')
      .limit(5); // Just check first 5

    console.log(`Found ${assignments.length} assignments to analyze:`);
    console.log('');

    assignments.forEach((assignment, index) => {
      console.log(`📋 Assignment ${index + 1}:`);
      console.log(`   Assignment ID: ${assignment._id}`);
      console.log(`   Teacher: ${assignment.teacher?.name || 'N/A'} (${assignment.teacher?.email || 'N/A'})`);
      
      console.log(`   Section Data:`);
      console.log(`     - Section ID: ${assignment.section?._id || 'MISSING'}`);
      console.log(`     - Section Name: ${assignment.section?.name || 'MISSING'}`);
      console.log(`     - Section Code: ${assignment.section?.code || 'MISSING'}`);
      console.log(`     - School ID: ${assignment.section?.school?._id || 'MISSING'}`);
      console.log(`     - School Name: ${assignment.section?.school?.name || 'MISSING'}`);
      console.log(`     - Department ID: ${assignment.section?.department?._id || 'OPTIONAL'}`);
      console.log(`     - Department Name: ${assignment.section?.department?.name || 'OPTIONAL'}`);
      
      console.log(`   Course Data:`);
      console.log(`     - Course ID: ${assignment.course?._id || 'MISSING'}`);
      console.log(`     - Course Name: ${assignment.course?.title || 'MISSING'}`);
      console.log(`     - Course Code: ${assignment.course?.courseCode || 'MISSING'}`);
      console.log(`     - Course Credits: ${assignment.course?.credits || 'MISSING'}`);
      console.log(`     - Course Dept ID: ${assignment.course?.department?._id || 'MISSING'}`);
      console.log(`     - Course Dept Name: ${assignment.course?.department?.name || 'MISSING'}`);
      
      console.log('   ---');
    });

    // Check for common issues
    console.log('\n🔧 Data Quality Analysis:');
    console.log('='.repeat(30));
    
    const issuesFound = [];
    
    assignments.forEach((assignment, index) => {
      if (!assignment.section) {
        issuesFound.push(`Assignment ${index + 1}: Missing section reference`);
      } else {
        if (!assignment.section.name) {
          issuesFound.push(`Assignment ${index + 1}: Section missing name`);
        }
        if (!assignment.section.school) {
          issuesFound.push(`Assignment ${index + 1}: Section missing school reference`);
        } else if (!assignment.section.school.name) {
          issuesFound.push(`Assignment ${index + 1}: School missing name`);
        }
        // Department is optional for sections, so we don't treat it as an error
      }
      
      if (!assignment.course) {
        issuesFound.push(`Assignment ${index + 1}: Missing course reference`);
      } else {
        if (!assignment.course.title) {
          issuesFound.push(`Assignment ${index + 1}: Course missing name`);
        }
        if (!assignment.course.courseCode) {
          issuesFound.push(`Assignment ${index + 1}: Course missing code`);
        }
        if (!assignment.course.department) {
          issuesFound.push(`Assignment ${index + 1}: Course missing department reference`);
        } else if (!assignment.course.department.name) {
          issuesFound.push(`Assignment ${index + 1}: Course department missing name`);
        }
      }
    });
    
    if (issuesFound.length === 0) {
      console.log('✅ No data quality issues found!');
    } else {
      console.log('❌ Issues found:');
      issuesFound.forEach(issue => console.log(`   - ${issue}`));
    }
    
    console.log('\n📊 Summary:');
    console.log(`   Total assignments checked: ${assignments.length}`);
    console.log(`   Issues found: ${issuesFound.length}`);
    
    if (issuesFound.length > 0) {
      console.log('\n💡 Suggestions:');
      console.log('   1. Check if section, course, and department records exist in database');
      console.log('   2. Verify that foreign key relationships are properly set');
      console.log('   3. Run data migration scripts if needed');
      console.log('   4. Check if populate paths match the actual schema');
    }

  } catch (error) {
    console.error('Error during diagnosis:', error);
  } finally {
    mongoose.connection.close();
  }
}

diagnoseSectionCourseData();