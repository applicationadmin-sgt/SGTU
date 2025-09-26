const mongoose = require('mongoose');
const User = require('./models/User');
const QuizLock = require('./models/QuizLock');
const QuizAttempt = require('./models/QuizAttempt');
const StudentProgress = require('./models/StudentProgress');

// Use dotenv to load environment variables
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI).then(() => {
  console.log('Connected to MongoDB');
}).catch((error) => {
  console.error('MongoDB connection error:', error);
  process.exit(1);
});

async function checkAvailabilityDebug() {
  try {
    console.log('🔍 Debugging Quiz Availability for Sourav...\n');

    // Find Sourav
    const student = await User.findOne({ name: 'Sourav' });
    if (!student) {
      console.log('❌ Student not found');
      return;
    }

    const unitId = '68d4fcad7e9ff2d35c0876d4'; // unit 1 ID
    const studentId = student._id;

    // 1. Check QuizLock
    const quizLock = await QuizLock.findOne({ studentId });
    console.log('📋 QuizLock Status:');
    if (quizLock) {
      console.log(`Is Locked: ${quizLock.isLocked}`);
      console.log(`Teacher Unlock Count: ${quizLock.teacherUnlockCount}`);
      console.log(`HOD Unlock Count: ${quizLock.hodUnlockCount}`);
      console.log(`Dean Unlock Count: ${quizLock.deanUnlockCount}`);
      console.log(`Admin Unlock Count: ${quizLock.adminUnlockCount}`);
      
      const totalUnlocks = (quizLock.teacherUnlockCount || 0) + 
                          (quizLock.hodUnlockCount || 0) + 
                          (quizLock.deanUnlockCount || 0) + 
                          (quizLock.adminUnlockCount || 0);
      console.log(`Total Unlock Attempts Granted: ${totalUnlocks}`);
    } else {
      console.log('No QuizLock found');
    }

    // 2. Check Quiz Attempts
    const attemptsTaken = await QuizAttempt.countDocuments({
      student: studentId,
      unit: unitId,
      $or: [
        { completedAt: { $ne: null } },
        { isComplete: true }
      ]
    });
    console.log(`\n📊 Quiz Attempts: ${attemptsTaken}`);

    // 3. Check Student Progress
    const progress = await StudentProgress.findOne({ student: studentId });
    if (progress) {
      const unitProgress = progress.units.find(u => u.unitId.toString() === unitId);
      if (unitProgress) {
        console.log('\n📋 Unit Progress:');
        console.log(`Extra Attempts: ${unitProgress.extraAttempts || 0}`);
        console.log(`Security Lock: ${unitProgress.securityLock?.locked || false}`);
        console.log(`Quiz Completed: ${unitProgress.unitQuizCompleted}`);
        console.log(`Quiz Passed: ${unitProgress.unitQuizPassed}`);
      }
    }

    // 4. Calculate availability
    const baseAttemptLimit = 1;
    const extraAttempts = progress?.units?.find(u => u.unitId.toString() === unitId)?.extraAttempts || 0;
    const teacherUnlockAttempts = quizLock ? 
      (quizLock.teacherUnlockCount || 0) + 
      (quizLock.hodUnlockCount || 0) + 
      (quizLock.deanUnlockCount || 0) + 
      (quizLock.adminUnlockCount || 0) : 0;
    
    const adjustedAttemptLimit = baseAttemptLimit + extraAttempts + teacherUnlockAttempts;
    const remainingAttempts = Math.max(0, adjustedAttemptLimit - attemptsTaken);
    
    console.log('\n📈 Calculated Availability:');
    console.log(`Base Attempt Limit: ${baseAttemptLimit}`);
    console.log(`Extra Attempts: ${extraAttempts}`);
    console.log(`Unlock Granted Attempts: ${teacherUnlockAttempts}`);
    console.log(`Total Attempt Limit: ${adjustedAttemptLimit}`);
    console.log(`Attempts Taken: ${attemptsTaken}`);
    console.log(`Remaining Attempts: ${remainingAttempts}`);
    console.log(`Should Be Available: ${remainingAttempts > 0 && !(quizLock?.isLocked)}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkAvailabilityDebug();