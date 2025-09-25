const mongoose = require('mongoose');
const QuizLock = require('./models/QuizLock');
const User = require('./models/User');

async function checkDeanLocks() {
  try {
    // Connect to database
    await mongoose.connect('mongodb+srv://sourav092002_db_user:aq5UgwNDh2tgyZcB@cluster0.nvkrxcx.mongodb.net/');
    console.log('✅ Connected to database');
    
    // Check all quiz locks
    const allLocks = await QuizLock.find({});
    console.log(`\n📊 Total quiz locks: ${allLocks.length}`);
    
    for (const lock of allLocks) {
      console.log({
        id: lock._id,
        studentId: lock.studentId,
        isLocked: lock.isLocked,
        unlockAuthorizationLevel: lock.unlockAuthorizationLevel,
        teacherUnlockCount: lock.teacherUnlockCount,
        requiresDeanUnlock: lock.requiresDeanUnlock
      });
    }
    
    // Check dean level locks specifically
    const deanLocks = await QuizLock.getLockedStudentsForDean();
    console.log(`\n🎯 Dean-level locks: ${deanLocks.length}`);
    
    for (const lock of deanLocks) {
      console.log('Dean lock:', {
        id: lock._id,
        studentId: lock.studentId,
        quizId: lock.quizId,
        courseId: lock.courseId,
        isLocked: lock.isLocked,
        unlockAuthorizationLevel: lock.unlockAuthorizationLevel
      });
    }
    
    // Test dean endpoint logic
    console.log('\n🧪 Testing dean endpoint logic...');
    
    try {
      const lockedStudents = await QuizLock.getLockedStudentsForDean();
      console.log(`Found ${lockedStudents.length} dean-level locked students`);
      
      if (lockedStudents.length > 0) {
        for (const lock of lockedStudents) {
          const student = await User.findById(lock.studentId).select('name email regno');
          console.log(`Dean lock for student: ${student?.name || 'Unknown'} (${lock.studentId})`);
        }
      }
    } catch (error) {
      console.error('❌ Error testing dean endpoint logic:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from database');
  }
}

checkDeanLocks();