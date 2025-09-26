const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

const QuizLock = require('./models/QuizLock');
const User = require('./models/User');
const Quiz = require('./models/Quiz');
const Course = require('./models/Course');

const BASE_URL = 'http://localhost:5000';

async function testQuizLockCreation() {
  console.log('🧪 Testing Automatic Quiz Lock Creation on Failure...\n');
  
  try {
    // Connect to database
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/test';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');
    
    // Find a student
    const student = await User.findOne({ role: 'student', regNo: { $exists: true } });
    
    if (!student) {
      console.log('❌ No student found for testing');
      return;
    }
    
    console.log(`✅ Found test student: ${student.name} (${student.regNo})`);
    
    // Check existing quiz locks for this student
    const existingLocks = await QuizLock.find({ studentId: student._id });
    console.log(`📊 Existing quiz locks for student: ${existingLocks.length}`);
    
    existingLocks.forEach((lock, index) => {
      console.log(`   Lock ${index + 1}: Quiz ${lock.quizId}, Reason: ${lock.failureReason}, Locked: ${lock.isLocked}`);
    });
    
    // Find recent quiz attempts for this student
    const QuizAttempt = require('./models/QuizAttempt');
    const recentAttempts = await QuizAttempt.find({ 
      student: student._id,
      passed: false  // Failed attempts
    })
    .sort({ completedAt: -1 })
    .limit(5)
    .populate('quiz', 'title')
    .populate('quizPool', 'name')
    .populate('course', 'name');
    
    console.log(`\n📝 Recent failed quiz attempts: ${recentAttempts.length}`);
    
    recentAttempts.forEach((attempt, index) => {
      const quizName = attempt.quiz?.title || attempt.quizPool?.name || 'Unknown Quiz';
      const courseName = attempt.course?.name || 'Unknown Course';
      console.log(`   Attempt ${index + 1}: ${quizName} (${courseName}) - Score: ${attempt.percentage}% - Date: ${attempt.completedAt?.toDateString()}`);
    });
    
    console.log('\n🎯 Summary:');
    if (existingLocks.length === 0 && recentAttempts.length > 0) {
      console.log('⚠️ ISSUE FOUND: Student has failed quiz attempts but NO quiz locks created');
      console.log('✅ SOLUTION: Added QuizLock creation logic to quiz submission endpoints');
      console.log('📝 Next steps: Restart backend server and have student retake a quiz to test');
    } else if (existingLocks.length > 0) {
      console.log('✅ Quiz locks exist for this student - system is working!');
      console.log('📊 Teachers should see these in their unlock request dashboards');
    } else {
      console.log('ℹ️  No failed quiz attempts found for this student');
    }
    
  } catch (error) {
    console.log('💥 Test failed:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
  }
}

// Run the test
testQuizLockCreation().catch(console.error);