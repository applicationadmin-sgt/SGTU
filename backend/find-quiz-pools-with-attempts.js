const mongoose = require('mongoose');

// Load models
const QuizAttempt = require('./models/QuizAttempt');
const User = require('./models/User');
const Quiz = require('./models/Quiz');
const QuizPool = require('./models/QuizPool');
const Course = require('./models/Course');

async function findQuizPoolWithAttempts() {
  try {
    // Load environment variables
    require('dotenv').config();
    
    // Connect to MongoDB using the same URI as the backend
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    await mongoose.connect(mongoUri);
    
    console.log('Connected to MongoDB Atlas');
    
    // Find quiz pools that have attempts
    const quizPoolsWithAttempts = await QuizAttempt.distinct('quizPool');
    console.log(`\n📊 Found ${quizPoolsWithAttempts.length} quiz pools with attempts`);
    
    // Get details for each quiz pool
    for (const poolId of quizPoolsWithAttempts.slice(0, 5)) { // Check first 5
      if (poolId) {
        const pool = await QuizPool.findById(poolId).populate('course', 'title');
        if (pool) {
          const attemptCount = await QuizAttempt.countDocuments({ quizPool: poolId });
          console.log(`\n🎯 Quiz Pool: ${pool.title}`);
          console.log(`   ID: ${pool._id}`);
          console.log(`   Course: ${pool.course?.title || 'Unknown'} (${pool.course?._id || 'Unknown'})`);
          console.log(`   Attempts: ${attemptCount}`);
          console.log(`   Active: ${pool.isActive}`);
          
          // Test if this pool would show up in the course API
          if (pool.course?._id) {
            const courseQuizPools = await QuizPool.find({ 
              course: pool.course._id, 
              isActive: true 
            });
            console.log(`   Pools in course API: ${courseQuizPools.length}`);
            const thisPoolInApi = courseQuizPools.find(p => p._id.toString() === pool._id.toString());
            console.log(`   This pool in API: ${!!thisPoolInApi}`);
            
            if (!thisPoolInApi) {
              console.log(`   ❌ Pool not showing in API because:`);
              console.log(`      - isActive: ${pool.isActive}`);
              console.log(`      - course match: ${pool.course._id.toString()}`);
            }
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

findQuizPoolWithAttempts();