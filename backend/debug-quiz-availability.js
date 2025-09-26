require('dotenv').config();
const mongoose = require('mongoose');
const QuizLock = require('./models/QuizLock');
const User = require('./models/User');
const Unit = require('./models/Unit');
const StudentProgress = require('./models/StudentProgress');
const QuizAttempt = require('./models/QuizAttempt');

const DEBUG_USER_ID = "66e1a7b68fef7f1d1d10c6e1"; // Trisha's ID
const DEBUG_UNIT_ID = "6d3bd1cdec08a051d98fd4"; // Unit ID from URL

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sgt-learning', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  console.log('Connected to MongoDB');

  try {
    // Get user info
    const user = await User.findById(DEBUG_USER_ID);
    console.log('\n1. USER INFO:');
    console.log(`Name: ${user.name} (${user.regNo})`);
    console.log(`ID: ${user._id}`);

    // Get unit info
    const unit = await Unit.findById(DEBUG_UNIT_ID).populate('quizPool');
    console.log('\n2. UNIT INFO:');
    console.log(`Title: ${unit.title}`);
    console.log(`Course: ${unit.course}`);
    console.log(`Quiz Pool ID: ${unit.quizPool?._id}`);

    // Check for QuizLock
    const quizLock = await QuizLock.findOne({ 
      studentId: DEBUG_USER_ID, 
      quizId: unit.quizPool._id 
    });

    console.log('\n3. QUIZ LOCK STATUS:');
    if (quizLock) {
      console.log('QuizLock found:');
      console.log(`- isLocked: ${quizLock.isLocked}`);
      console.log(`- failureReason: ${quizLock.failureReason}`);
      console.log(`- unlockAuthorizationLevel: ${quizLock.unlockAuthorizationLevel}`);
      console.log(`- teacherUnlockCount: ${quizLock.teacherUnlockCount}`);
      console.log(`- hodUnlockCount: ${quizLock.hodUnlockCount}`);
      console.log(`- deanUnlockCount: ${quizLock.deanUnlockCount}`);
      console.log(`- lockTimestamp: ${quizLock.lockTimestamp}`);
      console.log(`- lastUnlockTimestamp: ${quizLock.lastUnlockTimestamp}`);
    } else {
      console.log('No QuizLock found');
    }

    // Check quiz attempts
    const attempts = await QuizAttempt.find({
      student: DEBUG_USER_ID,
      unit: DEBUG_UNIT_ID
    }).sort({ createdAt: -1 });

    console.log('\n4. QUIZ ATTEMPTS:');
    console.log(`Total attempts: ${attempts.length}`);
    attempts.forEach((attempt, index) => {
      console.log(`Attempt ${index + 1}:`);
      console.log(`  - Score: ${attempt.score}%`);
      console.log(`  - Passed: ${attempt.passed}`);
      console.log(`  - Completed: ${attempt.isComplete}`);
      console.log(`  - Security Violations: ${attempt.securityViolations?.length || 0}`);
      console.log(`  - Created: ${attempt.createdAt}`);
    });

    // Check student progress
    const progress = await StudentProgress.findOne({ 
      student: DEBUG_USER_ID, 
      course: unit.course 
    });

    console.log('\n5. STUDENT PROGRESS:');
    if (progress) {
      const unitProgress = progress.units.find(u => u.unitId.toString() === DEBUG_UNIT_ID);
      if (unitProgress) {
        console.log(`- Videos completed: ${unitProgress.videosCompleted}`);
        console.log(`- Quiz completed: ${unitProgress.unitQuizCompleted}`);
        console.log(`- Quiz passed: ${unitProgress.unitQuizPassed}`);
        console.log(`- Extra attempts: ${unitProgress.extraAttempts || 0}`);
        console.log(`- Security lock: ${JSON.stringify(unitProgress.securityLock)}`);
      } else {
        console.log('Unit progress not found');
      }
    } else {
      console.log('Student progress not found');
    }

    // Simulate the availability check logic
    console.log('\n6. AVAILABILITY CHECK LOGIC:');
    
    const attemptsTaken = attempts.filter(a => a.completedAt || a.isComplete).length;
    const baseAttemptLimit = 1;
    const extraAttempts = progress?.units?.find(u => u.unitId.toString() === DEBUG_UNIT_ID)?.extraAttempts || 0;
    const teacherUnlockAttempts = quizLock?.teacherUnlockCount || 0;
    const adjustedAttemptLimit = baseAttemptLimit + extraAttempts + teacherUnlockAttempts;
    const adjustedRemainingAttempts = Math.max(0, adjustedAttemptLimit - attemptsTaken);
    
    console.log(`- Attempts taken: ${attemptsTaken}`);
    console.log(`- Base attempt limit: ${baseAttemptLimit}`);
    console.log(`- Extra attempts (progress): ${extraAttempts}`);
    console.log(`- Teacher unlock attempts: ${teacherUnlockAttempts}`);
    console.log(`- Adjusted attempt limit: ${adjustedAttemptLimit}`);
    console.log(`- Remaining attempts: ${adjustedRemainingAttempts}`);
    
    const isQuizFailureLocked = quizLock && quizLock.isLocked;
    const canTakeQuiz = !isQuizFailureLocked && attemptsTaken < adjustedAttemptLimit;
    
    console.log(`- Quiz failure locked: ${isQuizFailureLocked}`);
    console.log(`- Can take quiz: ${canTakeQuiz}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.connection.close();
  }
})
.catch(err => {
  console.error('MongoDB connection error:', err);
});