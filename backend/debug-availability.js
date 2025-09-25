const mongoose = require('mongoose');
const User = require('./models/User');
const Unit = require('./models/Unit');
const Course = require('./models/Course');
const QuizPool = require('./models/QuizPool');
const StudentProgress = require('./models/StudentProgress');
const QuizAttempt = require('./models/QuizAttempt');
const QuizLock = require('./models/QuizLock');

async function debugQuizAvailability() {
  try {
    // Connect to database
    await mongoose.connect('mongodb+srv://sourav092002_db_user:aq5UgwNDh2tgyZcB@cluster0.nvkrxcx.mongodb.net/');
    console.log('✅ Connected to database');
    
    // Find student Munmun
    const student = await User.findOne({ name: 'Munmun' });
    console.log(`\n👤 Student: ${student.name} (${student._id})`);
    
    // Find Unit 2 - using the ID from the screenshot
    const unit = await Unit.findById('68c8eaaf6a8d60601e77f8cc').populate('course').populate('quizPool');
    if (!unit) {
      console.log('❌ Unit not found, searching for any Unit 2...');
      const units = await Unit.find({ title: { $regex: /unit.*2/i } }).populate('course').populate('quizPool');
      console.log(`Found ${units.length} units with "Unit 2" in title:`);
      for (const u of units) {
        console.log(`- ${u.title} (${u._id}) - Course: ${u.course?.name}`);
      }
      return;
    }
    
    console.log(`\n📚 Unit: ${unit.title} (${unit._id})`);
    console.log(`📚 Course: ${unit.course.name} (${unit.course._id})`);
    console.log(`🧩 Quiz Pool: ${unit.quizPool?.title || 'N/A'} (${unit.quizPool?._id || 'N/A'})`);
    
    // Check student progress
    const progress = await StudentProgress.findOne({ 
      student: student._id, 
      course: unit.course._id 
    });
    
    if (!progress) {
      console.log('❌ No progress found for student');
      return;
    }
    
    const unitProgress = progress.units.find(u => u.unitId.toString() === unit._id.toString());
    console.log(`\n📊 Unit Progress:`, {
      unitQuizCompleted: unitProgress.unitQuizCompleted,
      unitQuizPassed: unitProgress.unitQuizPassed,
      videosCompleted: unitProgress.videosCompleted,
      extraAttempts: unitProgress.extraAttempts,
      securityLock: unitProgress.securityLock
    });
    
    // Check quiz attempts
    const attemptsTaken = await QuizAttempt.countDocuments({
      student: student._id,
      unit: unit._id,
      $or: [
        { completedAt: { $ne: null } },
        { isComplete: true }
      ]
    });
    console.log(`\n🎯 Attempts taken: ${attemptsTaken}`);
    
    // Check all attempts details
    const allAttempts = await QuizAttempt.find({
      student: student._id,
      unit: unit._id
    });
    
    console.log(`\n📋 All attempts (${allAttempts.length}):`);
    for (const attempt of allAttempts) {
      console.log({
        id: attempt._id,
        completedAt: attempt.completedAt,
        isComplete: attempt.isComplete,
        passed: attempt.passed,
        score: attempt.score,
        maxScore: attempt.maxScore,
        percentage: attempt.percentage
      });
    }
    
    // Check quiz lock
    const quizId = unit.quizPool?._id || (unit.quizzes && unit.quizzes[0]?._id);
    console.log(`\n🔑 Checking quiz lock for quiz ID: ${quizId}`);
    
    const existingLock = await QuizLock.findOne({ 
      studentId: student._id, 
      quizId: quizId
    });
    
    if (existingLock) {
      console.log(`🔒 Quiz lock found:`, {
        isLocked: existingLock.isLocked,
        failureReason: existingLock.failureReason,
        teacherUnlockCount: existingLock.teacherUnlockCount,
        remainingTeacherUnlocks: existingLock.remainingTeacherUnlocks
      });
    } else {
      console.log('🔓 No quiz lock found');
    }
    
    // Simulate the availability check logic with teacher unlocks
    const baseAttemptLimit = 1;
    const extraAttempts = unitProgress.extraAttempts || 0;
    const teacherUnlockAttempts = (existingLock && existingLock.teacherUnlockCount) ? existingLock.teacherUnlockCount : 0;
    const attemptLimit = baseAttemptLimit + extraAttempts;
    const adjustedAttemptLimit = attemptLimit + teacherUnlockAttempts;
    const remainingAttempts = unitProgress.unitQuizPassed ? 0 : Math.max(0, attemptLimit - attemptsTaken);
    const adjustedRemainingAttempts = unitProgress.unitQuizPassed ? 0 : Math.max(0, adjustedAttemptLimit - attemptsTaken);
    
    const securityLocked = !!(unitProgress.securityLock && unitProgress.securityLock.locked);
    const quizFailureLocked = !!(existingLock && existingLock.isLocked);
    const isLocked = securityLocked || quizFailureLocked;
    
    const hasQuiz = !!unit.quizPool || unit.quizzes.length > 0;
    const allVideosWatched = true; // Assuming all videos are watched
    const quizPassed = unitProgress.unitQuizPassed;
    
    const available = hasQuiz && allVideosWatched && !quizPassed && !isLocked && attemptsTaken < adjustedAttemptLimit;
    
    console.log(`\n🔍 Availability calculation:`, {
      hasQuiz,
      allVideosWatched,
      quizPassed,
      securityLocked,
      quizFailureLocked,
      isLocked,
      attemptsTaken,
      baseAttemptLimit,
      extraAttempts,
      teacherUnlockAttempts,
      originalAttemptLimit: attemptLimit,
      adjustedAttemptLimit,
      remainingAttempts,
      adjustedRemainingAttempts,
      available
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from database');
  }
}

debugQuizAvailability();