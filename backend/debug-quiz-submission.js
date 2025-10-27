const mongoose = require('mongoose');
require('dotenv').config();

async function debugQuizSubmission() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to database...');
    
    const QuizAttempt = require('./models/QuizAttempt');
    
    // Check the specific attempt ID from the logs
    const attemptId = '68e6209c1515cc6044ab8044';
    
    console.log('\n🔍 Looking for quiz attempt:', attemptId);
    
    const attempt = await QuizAttempt.findById(attemptId);
    
    if (!attempt) {
      console.log('❌ Quiz attempt not found!');
      
      // Check if it's a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(attemptId)) {
        console.log('❌ Invalid ObjectId format');
      } else {
        console.log('✅ Valid ObjectId format, but document doesn\'t exist');
      }
      
      // Find recent attempts to compare
      const recentAttempts = await QuizAttempt.find({})
        .sort({ createdAt: -1 })
        .limit(3)
        .select('_id student createdAt completedAt');
        
      console.log('\n📋 Recent attempts for comparison:');
      recentAttempts.forEach(a => {
        console.log(`ID: ${a._id}, Student: ${a.student}, Created: ${a.createdAt}, Completed: ${a.completedAt}`);
      });
      
    } else {
      console.log('✅ Quiz attempt found!');
      console.log('Details:', {
        id: attempt._id,
        student: attempt.student,
        completed: !!attempt.completedAt,
        score: attempt.score,
        percentage: attempt.percentage,
        questionsCount: attempt.questions?.length || 0
      });
      
      if (attempt.completedAt) {
        console.log('⚠️ ISSUE: Quiz already completed at:', attempt.completedAt);
        console.log('This would cause a 400 error: "Quiz already submitted"');
      } else {
        console.log('✅ Quiz not yet completed, should accept submission');
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

debugQuizSubmission();