const mongoose = require('mongoose');
const QuizLock = require('./models/QuizLock');
const User = require('./models/User');

async function checkUnlockStatus() {
  try {
    // Connect to database
    await mongoose.connect('mongodb+srv://sourav092002_db_user:aq5UgwNDh2tgyZcB@cluster0.nvkrxcx.mongodb.net/');
    console.log('✅ Connected to database');
    
    // Find the specific student (Munmun)
    const student = await User.findOne({ name: 'Munmun' });
    if (!student) {
      console.log('❌ Student Munmun not found');
      return;
    }
    
    console.log(`\n👤 Student: ${student.name} (${student._id})`);
    
    // Check all quiz locks for this student
    const locks = await QuizLock.find({ studentId: student._id });
    console.log(`\n🔒 Quiz locks found: ${locks.length}`);
    
    for (const lock of locks) {
      console.log({
        lockId: lock._id,
        quizId: lock.quizId,
        courseId: lock.courseId,
        isLocked: lock.isLocked,
        unlockAuthorizationLevel: lock.unlockAuthorizationLevel,
        teacherUnlockCount: lock.teacherUnlockCount,
        remainingTeacherUnlocks: lock.remainingTeacherUnlocks,
        lockTimestamp: lock.lockTimestamp,
        unlockHistory: lock.unlockHistory ? lock.unlockHistory.length : 0
      });
      
      if (lock.unlockHistory && lock.unlockHistory.length > 0) {
        console.log('📋 Unlock history:');
        for (const unlock of lock.unlockHistory) {
          console.log({
            unlockedBy: unlock.unlockedBy,
            unlockTimestamp: unlock.unlockTimestamp,
            reason: unlock.reason
          });
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from database');
  }
}

checkUnlockStatus();