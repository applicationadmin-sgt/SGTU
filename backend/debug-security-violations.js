const mongoose = require('mongoose');
require('dotenv').config();

async function checkRecentAttempts() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to database...');
    
    const QuizAttempt = require('./models/QuizAttempt');
    const User = require('./models/User');
    
    // Get most recent attempts with security data
    const attempts = await QuizAttempt.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('student', 'name regNo')
      .select('student score percentage passed securityData tabSwitchCount createdAt completedAt');
    
    console.log('\n📊 Recent Quiz Attempts:');
    attempts.forEach((attempt, i) => {
      console.log(`\nAttempt ${i+1}:`);
      console.log(`Student: ${attempt.student?.name} (${attempt.student?.regNo})`);
      console.log(`Score: ${attempt.score} (${attempt.percentage}%)`);
      console.log(`Passed: ${attempt.passed}`);
      console.log(`Tab Switch Count: ${attempt.securityData?.tabSwitchCount || 0}`);
      console.log(`Violations: ${attempt.securityData?.violations?.length || 0}`);
      console.log(`Auto Submit: ${attempt.securityData?.isAutoSubmit || false}`);
      console.log(`Security Penalty: ${attempt.securityData?.securityPenalty || 0}%`);
      if (attempt.securityData?.violations?.length > 0) {
        console.log('Violation Details:', attempt.securityData.violations.map(v => v.type || v).join(', '));
      }
    });
    
    // Check for any attempts with security issues
    const securityAttempts = await QuizAttempt.find({
      $or: [
        { 'securityData.violations.0': { $exists: true } },
        { 'securityData.tabSwitchCount': { $gt: 0 } },
        { 'securityData.isAutoSubmit': true }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(3)
    .populate('student', 'name regNo');
    
    console.log('\n🚨 Recent Security Violations:');
    securityAttempts.forEach((attempt, i) => {
      console.log(`\nSecurity Issue ${i+1}:`);
      console.log(`Student: ${attempt.student?.name}`);
      console.log(`Violations:`, JSON.stringify(attempt.securityData?.violations || [], null, 2));
      console.log(`Tab Switch Count: ${attempt.securityData?.tabSwitchCount || 0}`);
      console.log(`Auto Submit: ${attempt.securityData?.isAutoSubmit || false}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkRecentAttempts();