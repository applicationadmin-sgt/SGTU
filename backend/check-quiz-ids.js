require('dotenv').config();
const mongoose = require('mongoose');
const QuizLock = require('./models/QuizLock');

async function checkQuizIds() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find all QuizLock records with admin override history
    const locks = await QuizLock.find({
      'adminUnlockHistory.0': { $exists: true }
    }).select('quizId courseId studentId adminUnlockHistory');

    console.log(`Found ${locks.length} QuizLock records with admin overrides\n`);

    locks.forEach((lock, index) => {
      console.log(`Record #${index + 1}:`);
      console.log(`  Quiz ID: ${lock.quizId}`);
      console.log(`  Course ID: ${lock.courseId}`);
      console.log(`  Student ID: ${lock.studentId}`);
      console.log(`  Admin overrides: ${lock.adminUnlockHistory.length}`);
      console.log('');
    });

    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkQuizIds();
