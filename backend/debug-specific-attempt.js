const mongoose = require('mongoose');
require('dotenv').config();
const QuizAttempt = require('./models/QuizAttempt');
const User = require('./models/User');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  try {
    console.log('Connected to database...');
    
    // Find the specific quiz attempt with 5% penalty
    const attempt = await QuizAttempt.findById('68ca51032ff2c9bed48af8b0');
    
    if (attempt) {
      console.log('Quiz Attempt Details:');
      console.log('ID:', attempt._id);
      console.log('Score:', attempt.score, '/', attempt.maxScore);
      console.log('Original Percentage:', (attempt.score / attempt.maxScore * 100).toFixed(1), '%');
      console.log('Final Percentage:', attempt.percentage, '%');
      console.log('\nSecurity Data:');
      console.log(JSON.stringify(attempt.securityData, null, 2));
    }
    
    mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    mongoose.disconnect();
    process.exit(1);
  }
});