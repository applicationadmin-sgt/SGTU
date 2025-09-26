const mongoose = require('mongoose');
require('dotenv').config();

async function checkQuizLocks() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const QuizLock = require('./models/QuizLock');
    const User = require('./models/User');
    const Quiz = require('./models/Quiz');
    
    const locks = await QuizLock.find({}).populate('studentId', 'name regNo').populate('quizId', 'title');
    console.log(`\n📊 Current QuizLock entries: ${locks.length}\n`);
    
    if (locks.length === 0) {
      console.log('❌ No QuizLock entries found - this explains why teachers see no unlock requests!');
      
      // Check if there are failed quiz attempts without locks
      const QuizAttempt = require('./models/QuizAttempt');
      const failedAttempts = await QuizAttempt.find({ 
        isPassed: false, 
        isSubmitted: true 
      }).populate('student', 'name regNo').populate('quiz', 'title');
      
      console.log(`\n🔍 Found ${failedAttempts.length} failed quiz attempts without QuizLocks:`);
      failedAttempts.forEach(attempt => {
        console.log(`   - ${attempt.student?.name} (${attempt.student?.regNo}) failed "${attempt.quiz?.title}" with ${attempt.score}%`);
      });
      
    } else {
      locks.forEach(lock => {
        console.log(`- ${lock.studentId?.name} (${lock.studentId?.regNo}) - ${lock.quizId?.title} - Locked: ${lock.isLocked} - Reason: ${lock.failureReason}`);
      });
    }
    
    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkQuizLocks();