const mongoose = require('mongoose');
const QuizLock = require('./models/QuizLock');
const User = require('./models/User');

async function debugQuizLocks() {
  try {
    // Connect to database
    await mongoose.connect('mongodb+srv://sourav092002_db_user:aq5UgwNDh2tgyZcB@cluster0.nvkrxcx.mongodb.net/');
    console.log('✅ Connected to database');
    
    // Find all quiz locks
    const allLocks = await QuizLock.find({});
    console.log(`\n📊 Total quiz locks found: ${allLocks.length}`);
    
    if (allLocks.length > 0) {
      console.log('\n🔍 Quiz lock details:');
      for (const lock of allLocks) {
        console.log({
          id: lock._id,
          studentId: lock.studentId,
          quizId: lock.quizId,
          courseId: lock.courseId,
          isLocked: lock.isLocked,
          unlockAuthorizationLevel: lock.unlockAuthorizationLevel,
          failureReason: lock.failureReason,
          lockTimestamp: lock.lockTimestamp
        });
      }
    }
    
    // Find a teacher to test with
    const teacher = await User.findOne({ role: 'teacher' });
    if (teacher) {
      console.log(`\n👨‍🏫 Testing with teacher: ${teacher.name} (${teacher._id})`);
      
      try {
        const lockedStudents = await QuizLock.getLockedStudentsByTeacher(teacher._id);
        console.log(`📋 Locked students for teacher: ${lockedStudents.length}`);
        
        for (const student of lockedStudents) {
          console.log({
            studentName: student.studentId?.name || 'N/A',
            studentId: student.studentId,
            quizTitle: student.quizId?.title || 'N/A',
            courseName: student.courseId?.name || 'N/A',
            reason: student.failureReason
          });
        }
      } catch (error) {
        console.error('❌ Error in getLockedStudentsByTeacher:', error.message);
        console.error('Stack:', error.stack);
      }
    }
    
  } catch (error) {
    console.error('❌ Database connection error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from database');
  }
}

debugQuizLocks();