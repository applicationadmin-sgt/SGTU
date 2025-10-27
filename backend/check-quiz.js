require('dotenv').config();
const mongoose = require('mongoose');
const Quiz = require('./models/Quiz');
const Unit = require('./models/Unit');

async function checkQuiz() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const quizId = '68e5e2e129b7c9df01300342';
    const quiz = await Quiz.findById(quizId).populate('unit');

    if (quiz) {
      console.log('Quiz Details:');
      console.log(`  Quiz ID: ${quiz._id}`);
      console.log(`  Title: ${quiz.title}`);
      console.log(`  Unit ID: ${quiz.unit?._id}`);
      console.log(`  Unit Title: ${quiz.unit?.title}`);
      console.log('');
    } else {
      console.log('❌ Quiz not found');
    }

    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkQuiz();
