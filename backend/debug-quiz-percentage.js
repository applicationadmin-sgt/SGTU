const mongoose = require('mongoose');
require('dotenv').config();
const QuizAttempt = require('./models/QuizAttempt');
const User = require('./models/User');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  try {
    console.log('Connected to database...');
    
    // Find recent quiz attempts with score 8
    const attempts = await QuizAttempt.find({
      score: 8
    }).populate('student', 'name regNo').sort({ completedAt: -1 }).limit(5);
    
    console.log('Found recent quiz attempts with score 8:', attempts.length);
    attempts.forEach(attempt => {
      const originalPercentage = (attempt.score / attempt.maxScore * 100);
      console.log('\n--- Quiz Attempt ---');
      console.log('ID:', attempt._id);
      console.log('Student:', attempt.student?.name, '(', attempt.student?.regNo, ')');
      console.log('Score:', attempt.score, '/', attempt.maxScore);
      console.log('Calculated Percentage:', originalPercentage.toFixed(1), '%');
      console.log('Stored Percentage:', attempt.percentage, '%');
      console.log('Difference:', (originalPercentage - attempt.percentage).toFixed(1), '%');
      console.log('Passed:', attempt.passed);
      if (attempt.securityData) {
        console.log('Security Penalty:', attempt.securityData.securityPenalty || 0, '%');
        console.log('Tab Switch Count:', attempt.securityData.tabSwitchCount || 0);
        console.log('Violations:', attempt.securityData.violations?.length || 0);
        console.log('Auto Submit:', attempt.securityData.isAutoSubmit || false);
      }
      console.log('Completed At:', attempt.completedAt);
    });
    
    mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    mongoose.disconnect();
    process.exit(1);
  }
});