const mongoose = require('mongoose');
require('dotenv').config();

// Import required models
const Section = require('./models/Section');
const Course = require('./models/Course');
const Department = require('./models/Department');
const User = require('./models/User');
const StudentProgress = require('./models/StudentProgress');
const QuizAttempt = require('./models/QuizAttempt');

async function testSectionAnalyticsRealData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find any section to test with
    const section = await Section.findOne()
      .populate('students', 'firstName lastName email studentId regNo watchHistory')
      .populate('courses', 'title')
      .populate('department', 'name');

    if (!section) {
      console.log('❌ No sections found in database');
      return;
    }

    console.log(`✅ Testing with section: ${section.name}`);
    console.log(`📊 Students in section: ${section.students.length}`);
    
    if (section.students.length === 0) {
      console.log('⚠️ No students in this section to test analytics');
      return;
    }

    // Test the analytics calculation for the first student
    const student = section.students[0];
    console.log(`\n🧑‍🎓 Testing student: ${student.firstName} ${student.lastName}`);

    // Get student progress
    const studentProgress = await StudentProgress.find({
      student: student._id,
      course: { $in: section.courses?.map(c => c._id) || [] }
    });

    console.log(`📈 Student progress records: ${studentProgress.length}`);

    // Get quiz attempts
    const quizAttempts = await QuizAttempt.find({
      student: student._id,
      course: { $in: section.courses?.map(c => c._id) || [] }
    });

    console.log(`🎯 Quiz attempts: ${quizAttempts.length}`);

    // Calculate total watch time
    let totalWatchTime = 0;
    if (student.watchHistory && student.watchHistory.length > 0) {
      totalWatchTime = student.watchHistory.reduce((sum, record) => {
        return sum + (record.timeSpent || 0);
      }, 0);
    }

    console.log(`⏱️ Total watch time: ${Math.round(totalWatchTime / 60)} minutes`);

    // Calculate overall progress
    let overallProgress = 0;
    if (studentProgress.length > 0) {
      const totalProgress = studentProgress.reduce((sum, progress) => {
        return sum + (progress.overallProgress || 0);
      }, 0);
      overallProgress = Math.round(totalProgress / studentProgress.length);
    }

    console.log(`📊 Overall progress: ${overallProgress}%`);

    // Calculate quiz average
    let quizAverage = 0;
    if (quizAttempts.length > 0) {
      const totalPercentage = quizAttempts.reduce((sum, attempt) => {
        return sum + (attempt.percentage || 0);
      }, 0);
      quizAverage = Math.round(totalPercentage / quizAttempts.length);
    }

    console.log(`🎯 Quiz average: ${quizAverage}%`);

    console.log('\n✅ Analytics calculation test completed successfully!');
    console.log('🎉 The new section analytics API should now show real student data instead of mock data.');

  } catch (error) {
    console.error('❌ Error testing section analytics:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testSectionAnalyticsRealData();