const mongoose = require('mongoose');
require('dotenv').config();
const QuizAttempt = require('./models/QuizAttempt');
const User = require('./models/User');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  try {
    console.log('Connected to database...');
    
    // Find quiz attempts with fullscreen permission errors that were penalized
    const attempts = await QuizAttempt.find({
      'securityData.violations': { $regex: /fullscreen-error.*Permissions check failed/i },
      'securityData.securityPenalty': { $gt: 0 }
    }).populate('student', 'name regNo');
    
    console.log(`Found ${attempts.length} quiz attempts with fullscreen permission penalties`);
    
    for (const attempt of attempts) {
      console.log(`\n--- Fixing Quiz Attempt ---`);
      console.log('Student:', attempt.student?.name, '(', attempt.student?.regNo, ')');
      console.log('Current Score:', attempt.score, '/', attempt.maxScore, '(', attempt.percentage, '%)');
      console.log('Original Score:', attempt.securityData.originalScore, '/', attempt.maxScore, '(', attempt.securityData.originalPercentage, '%)');
      
      // Filter out fullscreen permission errors from violations
      const filteredViolations = attempt.securityData.violations.filter(violation => {
        return !(violation.includes('fullscreen-error') && violation.includes('Permissions check failed'));
      });
      
      // Recalculate penalty without fullscreen permission errors
      let newPenalty = 0;
      if (filteredViolations.length > 0 || attempt.securityData.tabSwitchCount > 3) {
        newPenalty = Math.min(20, filteredViolations.length * 5 + (attempt.securityData.tabSwitchCount > 3 ? 10 : 0));
      }
      
      // Calculate new final percentage and score
      const newPercentage = Math.max(0, attempt.securityData.originalPercentage - newPenalty);
      const newScore = Math.round((newPercentage / 100) * attempt.maxScore);
      const newPassed = newPercentage >= 70;
      
      console.log('New Penalty:', newPenalty, '%');
      console.log('New Score:', newScore, '/', attempt.maxScore, '(', newPercentage, '%)');
      console.log('New Passed Status:', newPassed);
      
      // Update the attempt
      attempt.score = newScore;
      attempt.percentage = newPercentage;
      attempt.passed = newPassed;
      attempt.securityData.securityPenalty = newPenalty;
      attempt.securityData.violations = filteredViolations;
      
      await attempt.save();
      console.log('✅ Updated successfully');
    }
    
    console.log(`\n🎉 Fixed ${attempts.length} quiz attempts`);
    mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    mongoose.disconnect();
    process.exit(1);
  }
});