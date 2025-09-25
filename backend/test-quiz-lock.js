// Test Script for Quiz Lock System
// Run this in backend terminal: node test-quiz-lock.js

const mongoose = require('mongoose');
require('dotenv').config();

const QuizLock = require('./models/QuizLock');
const Course = require('./models/Course');
const Section = require('./models/Section');
const User = require('./models/User');

async function testQuizLockSystem() {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Test 1: Create a mock quiz lock
    console.log('\n📝 Test 1: Creating a quiz lock for failed student...');
    
    // Find a student and course for testing
    const student = await User.findOne({ role: 'student' });
    const course = await Course.findOne();
    
    if (!student || !course) {
      console.log('❌ No student or course found for testing');
      return;
    }
    
    console.log(`Student: ${student.name} (${student.email})`);
    console.log(`Course: ${course.name}`);
    
    // Create a quiz lock for failing score
    const lock = await QuizLock.getOrCreateLock(
      student._id,
      new mongoose.Types.ObjectId(), // Mock quiz ID
      course._id,
      70 // passing score
    );
    
    // Record a failing attempt
    await lock.recordAttempt(45); // 45% score
    
    // Lock the quiz
    await lock.lockQuiz('BELOW_PASSING_SCORE', 45, 70);
    
    console.log('✅ Quiz lock created successfully');
    console.log(`   - Student: ${lock.studentId}`);
    console.log(`   - Quiz locked: ${lock.isLocked}`);
    console.log(`   - Authorization level: ${lock.unlockAuthorizationLevel}`);
    console.log(`   - Teacher unlocks remaining: ${lock.remainingTeacherUnlocks}`);

    // Test 2: Find a teacher and check if they can see locked students
    console.log('\n📝 Test 2: Checking teacher dashboard visibility...');
    
    const teacher = await User.findOne({ role: 'teacher' });
    if (!teacher) {
      console.log('❌ No teacher found for testing');
      return;
    }
    
    console.log(`Teacher: ${teacher.name} (${teacher.email})`);
    
    // Get locked students for this teacher
    const lockedStudents = await QuizLock.getLockedStudentsByTeacher(teacher._id);
    console.log(`✅ Found ${lockedStudents.length} locked students for teacher`);
    
    if (lockedStudents.length > 0) {
      for (const locked of lockedStudents) {
        console.log(`   - Student: ${locked.studentId?.name || 'Unknown'}`);
        console.log(`   - Course: ${locked.courseId?.name || 'Unknown'}`);
        console.log(`   - Reason: ${locked.failureReason}`);
        console.log(`   - Remaining unlocks: ${locked.remainingTeacherUnlocks}`);
      }
    }

    // Test 3: Test teacher unlock
    console.log('\n📝 Test 3: Testing teacher unlock...');
    
    if (lock.canTeacherUnlock) {
      console.log('Testing teacher unlock...');
      await lock.unlockByTeacher(teacher._id, 'Testing unlock system', 'Test notes');
      console.log('✅ Teacher unlock successful');
      console.log(`   - Quiz locked: ${lock.isLocked}`);
      console.log(`   - Teacher unlock count: ${lock.teacherUnlockCount}`);
      console.log(`   - Remaining unlocks: ${lock.remainingTeacherUnlocks}`);
      
      // Lock again to test multiple unlocks
      await lock.lockQuiz('BELOW_PASSING_SCORE', 35, 70);
      console.log('   - Quiz re-locked for further testing');
    }

    // Test 4: Test authorization escalation
    console.log('\n📝 Test 4: Testing authorization escalation...');
    
    // Use up all teacher unlocks
    for (let i = lock.teacherUnlockCount; i < 3; i++) {
      if (lock.canTeacherUnlock) {
        await lock.unlockByTeacher(teacher._id, `Test unlock ${i + 1}`, 'Escalation test');
        await lock.lockQuiz('BELOW_PASSING_SCORE', 40 + i, 70);
        console.log(`   - Unlock ${i + 1}/3 completed`);
      }
    }
    
    await lock.save();
    console.log(`✅ Authorization level after 3 unlocks: ${lock.unlockAuthorizationLevel}`);
    console.log(`   - Can teacher unlock: ${lock.canTeacherUnlock}`);
    console.log(`   - Requires dean unlock: ${lock.requiresDeanUnlock}`);

    // Test 5: Test dean unlock
    console.log('\n📝 Test 5: Testing dean unlock...');
    
    const dean = await User.findOne({ role: 'dean' });
    if (dean && lock.requiresDeanUnlock) {
      await lock.unlockByDean(dean._id, 'Dean override for testing', 'Test dean unlock');
      console.log('✅ Dean unlock successful');
      console.log(`   - Quiz locked: ${lock.isLocked}`);
      console.log(`   - Dean unlock count: ${lock.deanUnlockCount}`);
    } else if (!dean) {
      console.log('⚠️ No dean found for testing dean unlock');
    }

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📊 Final lock status:');
    console.log(`   - Student: ${student.name}`);
    console.log(`   - Is locked: ${lock.isLocked}`);
    console.log(`   - Teacher unlocks: ${lock.teacherUnlockCount}/3`);
    console.log(`   - Dean unlocks: ${lock.deanUnlockCount}`);
    console.log(`   - Authorization level: ${lock.unlockAuthorizationLevel}`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run the test
testQuizLockSystem();