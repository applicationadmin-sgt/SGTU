const mongoose = require('mongoose');

// Load models
const QuizAttempt = require('./models/QuizAttempt');
const User = require('./models/User');
const Quiz = require('./models/Quiz');
const QuizPool = require('./models/QuizPool');

async function testQuizAttempts() {
  try {
    // Load environment variables
    require('dotenv').config();
    
    // Connect to MongoDB using the same URI as the backend
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Connected to MongoDB Atlas');
    console.log('Database:', mongoose.connection.db.databaseName);
    
    // Get all quiz attempts
    const allAttempts = await QuizAttempt.find({})
      .populate('student', 'name regNo')
      .populate('quiz', 'title')
      .populate('quizPool', 'title')
      .sort({ completedAt: -1 });
    
    console.log(`\n📊 Total quiz attempts in database: ${allAttempts.length}`);
    
    if (allAttempts.length > 0) {
      console.log('\n--- Recent Quiz Attempts ---');
      allAttempts.slice(0, 10).forEach((attempt, index) => {
        console.log(`${index + 1}. Student: ${attempt.student?.name || 'Unknown'} (${attempt.student?.regNo || 'No RegNo'})`);
        console.log(`   Quiz: ${attempt.quiz?.title || 'Direct Quiz'}`);
        console.log(`   Quiz Pool: ${attempt.quizPool?.title || 'None'}`);
        console.log(`   Score: ${attempt.score}/${attempt.maxScore} (${attempt.percentage?.toFixed(1) || 0}%)`);
        console.log(`   Passed: ${attempt.passed ? 'Yes' : 'No'}`);
        console.log(`   Date: ${attempt.completedAt ? new Date(attempt.completedAt).toLocaleString() : 'Unknown'}`);
        console.log(`   Type: ${attempt.quizPool ? 'Quiz Pool' : 'Direct Quiz'}`);
        console.log('---');
      });
      
      // Count by type
      const poolAttempts = allAttempts.filter(a => a.quizPool);
      const directAttempts = allAttempts.filter(a => a.quiz);
      
      console.log(`\n📈 Breakdown:`);
      console.log(`   Quiz Pool Attempts: ${poolAttempts.length}`);
      console.log(`   Direct Quiz Attempts: ${directAttempts.length}`);
      
      // Check specific quiz pools
      if (poolAttempts.length > 0) {
        console.log('\n🎯 Quiz Pool Attempts by Pool:');
        const poolGroups = {};
        poolAttempts.forEach(attempt => {
          const poolId = attempt.quizPool._id.toString();
          const poolTitle = attempt.quizPool.title;
          if (!poolGroups[poolId]) {
            poolGroups[poolId] = { title: poolTitle, count: 0, attempts: [] };
          }
          poolGroups[poolId].count++;
          poolGroups[poolId].attempts.push(attempt);
        });
        
        Object.values(poolGroups).forEach(pool => {
          console.log(`   ${pool.title}: ${pool.count} attempts`);
        });
      }
    } else {
      console.log('\n❌ No quiz attempts found in the database');
    }
    
  } catch (error) {
    console.error('❌ Error testing quiz attempts:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

testQuizAttempts();