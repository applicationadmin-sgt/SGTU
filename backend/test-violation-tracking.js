const mongoose = require('mongoose');
require('dotenv').config();

async function testViolationTracking() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to database...');
    
    const QuizAttempt = require('./models/QuizAttempt');
    const User = require('./models/User');
    
    // Find the most recent attempt
    const attempt = await QuizAttempt.findOne({})
      .sort({ createdAt: -1 })
      .populate('student', 'name regNo');
    
    if (!attempt) {
      console.log('No quiz attempts found');
      process.exit(0);
    }
    
    console.log('\n🔍 Most Recent Attempt Analysis:');
    console.log('Student:', attempt.student?.name);
    console.log('Date:', attempt.createdAt);
    console.log('Score:', attempt.score, '/', attempt.maxScore);
    console.log('Auto Submit:', attempt.securityData?.isAutoSubmit);
    console.log('Tab Switch Count:', attempt.securityData?.tabSwitchCount);
    
    console.log('\n📋 Security Data Details:');
    console.log('Full Security Data:', JSON.stringify(attempt.securityData, null, 2));
    
    console.log('\n🚨 Violations Analysis:');
    if (attempt.securityData?.violations) {
      console.log('Violations array length:', attempt.securityData.violations.length);
      console.log('Violations content:', attempt.securityData.violations);
      console.log('Violations type:', typeof attempt.securityData.violations);
      console.log('Is array:', Array.isArray(attempt.securityData.violations));
    } else {
      console.log('No violations field found');
    }
    
    // Check if the problem is in data structure
    console.log('\n🔬 Data Structure Analysis:');
    console.log('Security data keys:', Object.keys(attempt.securityData || {}));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testViolationTracking();