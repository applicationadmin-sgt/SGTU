require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('./models/Course');
const Section = require('./models/Section');
const Department = require('./models/Department');
const School = require('./models/School');

async function checkAllCourseSections() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all courses
    const courses = await Course.find()
      .populate('department')
      .sort({ courseCode: 1 });

    console.log(`📚 Total Courses: ${courses.length}\n`);
    console.log('='.repeat(80));

    for (const course of courses) {
      console.log(`\n📖 Course: ${course.courseCode} - ${course.courseTitle}`);
      console.log(`   Department: ${course.department?.name || 'N/A'}`);
      console.log(`   Course ID: ${course._id}`);

      // Find sections that include this course
      const sections = await Section.find({ 
        courses: course._id 
      }).populate('department');

      console.log(`   📊 Sections using this course: ${sections.length}`);

      if (sections.length === 0) {
        console.log('   ⚠️  WARNING: This course is not assigned to any sections!');
        console.log('   💡 Fix: Assign this course to sections in the admin/HOD panel');
      } else {
        sections.forEach(section => {
          console.log(`      - ${section.name} (${section.students?.length || 0} students)`);
        });
      }

      console.log('-'.repeat(80));
    }

    console.log('\n\n📊 SUMMARY');
    console.log('='.repeat(80));

    const coursesWithoutSections = [];
    for (const course of courses) {
      const sectionCount = await Section.countDocuments({ courses: course._id });
      if (sectionCount === 0) {
        coursesWithoutSections.push(`${course.courseCode} - ${course.courseTitle}`);
      }
    }

    if (coursesWithoutSections.length > 0) {
      console.log('\n⚠️  Courses NOT assigned to any sections:');
      coursesWithoutSections.forEach(c => console.log(`   - ${c}`));
      console.log('\n💡 These courses will show "0 Students" in analytics');
      console.log('💡 To fix: Go to Section Management and assign courses to sections\n');
    } else {
      console.log('\n✅ All courses are assigned to at least one section!\n');
    }

    // Check sections without courses
    const sectionsWithoutCourses = await Section.find({
      $or: [
        { courses: { $exists: false } },
        { courses: { $size: 0 } }
      ]
    });

    if (sectionsWithoutCourses.length > 0) {
      console.log('\n⚠️  Sections WITHOUT any courses:');
      sectionsWithoutCourses.forEach(s => {
        console.log(`   - ${s.name} (${s.students?.length || 0} students)`);
      });
      console.log('\n💡 These sections need courses assigned\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkAllCourseSections();
