// Load environment variables
require('dotenv').config();

const mongoose = require('mongoose');

// Initialize models first
const User = require('./models/User');
const Course = require('./models/Course');
const Section = require('./models/Section');
const Quiz = require('./models/Quiz');
const Unit = require('./models/Unit');
const QuizLock = require('./models/QuizLock');
const SectionCourseTeacher = require('./models/SectionCourseTeacher');

// MongoDB connection - use MONGO_URI from environment
const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/sgt-lms';

async function listAdminOverrides() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('🔍 Finding all QuizLock records with admin override history...\n');

    // Find all QuizLock records that have admin override history
    const quizLocks = await QuizLock.find({
      'adminUnlockHistory.0': { $exists: true }
    })
      .populate('studentId', 'name regno email assignedSections')
      .populate('courseId', 'title courseCode name')
      .populate('quizId', 'title') // quizId references Unit model
      .lean();

    console.log(`📊 Found ${quizLocks.length} QuizLock records with admin overrides\n`);

    if (quizLocks.length === 0) {
      console.log('❌ No admin override records found in the database.');
      process.exit(0);
    }

    let totalOverrides = 0;
    const overrideDetails = [];

    // Process each QuizLock record
    for (const lock of quizLocks) {
      const student = lock.studentId;
      const course = lock.courseId;
      const quiz = lock.quizId;

      if (!student || !course || !quiz) {
        console.log('⚠️  Skipping record with missing data:', lock._id);
        continue;
      }

      // Get student's sections
      const studentSections = student.assignedSections || [];
      
      // Get section details
      const sections = await Section.find({
        _id: { $in: studentSections }
      }).select('name code').lean();

      // For each admin override in this lock
      for (const override of lock.adminUnlockHistory) {
        totalOverrides++;

        // Get admin details
        const admin = await User.findById(override.adminId).select('name email').lean();

        // Find the teacher assigned to this course for each of the student's sections
        const teacherAssignments = await SectionCourseTeacher.find({
          course: course._id,
          section: { $in: studentSections },
          isActive: true
        })
          .populate('teacher', 'name email')
          .populate('section', 'name code')
          .lean();

        // Extract unique teachers
        const teachers = teacherAssignments.map(ta => ({
          name: ta.teacher?.name || 'Unknown',
          email: ta.teacher?.email || 'N/A',
          section: ta.section?.name || 'Unknown'
        }));

        overrideDetails.push({
          overrideNumber: totalOverrides,
          student: {
            name: student.name || 'Unknown',
            regno: student.regno || 'N/A',
            email: student.email || 'N/A'
          },
          course: {
            title: course.title || course.name || 'Unknown',
            code: course.courseCode || 'N/A'
          },
          quiz: {
            title: quiz.title || 'Unknown'
          },
          sections: sections.map(s => s.name).join(', ') || 'None',
          teachers: teachers,
          override: {
            adminName: admin?.name || 'Unknown Admin',
            adminEmail: admin?.email || 'N/A',
            overrideLevel: override.overrideLevel || 'N/A',
            timestamp: override.unlockTimestamp,
            reason: override.reason || 'No reason provided',
            lockReason: override.lockReason || 'N/A'
          }
        });
      }
    }

    // Display results
    console.log('═'.repeat(100));
    console.log('📋 ADMIN OVERRIDE RECORDS - DETAILED LIST');
    console.log('═'.repeat(100));
    console.log(`\n📊 Total Admin Overrides Found: ${totalOverrides}\n`);

    overrideDetails.forEach((detail, index) => {
      console.log(`\n${'─'.repeat(100)}`);
      console.log(`🔢 Override #${detail.overrideNumber}`);
      console.log(`${'─'.repeat(100)}`);
      
      console.log(`\n👤 STUDENT INFORMATION:`);
      console.log(`   Name:        ${detail.student.name}`);
      console.log(`   Reg No:      ${detail.student.regno}`);
      console.log(`   Email:       ${detail.student.email}`);
      console.log(`   Section(s):  ${detail.sections}`);
      
      console.log(`\n📚 COURSE INFORMATION:`);
      console.log(`   Course:      ${detail.course.title}`);
      console.log(`   Code:        ${detail.course.code}`);
      console.log(`   Quiz:        ${detail.quiz.title}`);
      
      console.log(`\n👨‍🏫 ASSIGNED TEACHER(S):`);
      if (detail.teachers.length > 0) {
        detail.teachers.forEach((teacher, idx) => {
          console.log(`   ${idx + 1}. ${teacher.name} (${teacher.email})`);
          console.log(`      Section: ${teacher.section}`);
        });
      } else {
        console.log(`   ⚠️  No teacher assigned to this course/section combination`);
      }
      
      console.log(`\n🛡️  ADMIN OVERRIDE DETAILS:`);
      console.log(`   Admin:       ${detail.override.adminName} (${detail.override.adminEmail})`);
      console.log(`   Level:       ${detail.override.overrideLevel}`);
      console.log(`   Timestamp:   ${new Date(detail.override.timestamp).toLocaleString()}`);
      console.log(`   Reason:      ${detail.override.reason}`);
      console.log(`   Lock Reason: ${detail.override.lockReason}`);
    });

    console.log(`\n${'═'.repeat(100)}`);
    console.log(`✅ SUMMARY: ${totalOverrides} admin override(s) found across ${quizLocks.length} QuizLock record(s)`);
    console.log(`${'═'.repeat(100)}\n`);

    // Group by course and count
    console.log('\n📊 OVERRIDES BY COURSE:');
    const byCourse = {};
    overrideDetails.forEach(detail => {
      const courseKey = `${detail.course.code} - ${detail.course.title}`;
      byCourse[courseKey] = (byCourse[courseKey] || 0) + 1;
    });
    Object.entries(byCourse).forEach(([course, count]) => {
      console.log(`   ${course}: ${count} override(s)`);
    });

    // Group by override level
    console.log('\n📊 OVERRIDES BY LEVEL:');
    const byLevel = {};
    overrideDetails.forEach(detail => {
      const level = detail.override.overrideLevel;
      byLevel[level] = (byLevel[level] || 0) + 1;
    });
    Object.entries(byLevel).forEach(([level, count]) => {
      console.log(`   ${level}: ${count} override(s)`);
    });

    // Group by section
    console.log('\n📊 OVERRIDES BY SECTION:');
    const bySection = {};
    overrideDetails.forEach(detail => {
      const sections = detail.sections.split(', ');
      sections.forEach(section => {
        bySection[section] = (bySection[section] || 0) + 1;
      });
    });
    Object.entries(bySection).forEach(([section, count]) => {
      console.log(`   ${section}: ${count} override(s)`);
    });

    console.log('\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
    process.exit(0);
  }
}

// Run the script
console.log('\n🚀 Starting Admin Override List Script...\n');
listAdminOverrides();
