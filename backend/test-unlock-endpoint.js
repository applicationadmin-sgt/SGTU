const mongoose = require('mongoose');
const QuizLock = require('./models/QuizLock');
const Quiz = require('./models/Quiz');
const User = require('./models/User');

async function testUnlockEndpoint() {
  try {
    // Connect to database
    await mongoose.connect('mongodb+srv://sourav092002_db_user:aq5UgwNDh2tgyZcB@cluster0.nvkrxcx.mongodb.net/');
    console.log('✅ Connected to database');
    
    // Find the specific teacher we know has students (Mukherjee Sourav)
    const teacher = await User.findOne({ 
      name: 'Mukherjee Sourav'
    });
    
    if (!teacher) {
      console.log('❌ Mukherjee Sourav teacher not found, trying any teacher...');
      const anyTeacher = await User.findOne({ 
        $or: [
          { role: 'teacher' },
          { role: 'coordinator' }
        ]
      });
      
      if (!anyTeacher) {
        console.log('❌ No teacher found');
        return;
      }
      
      console.log(`\n👨‍🏫 Using teacher: ${anyTeacher.name} (${anyTeacher._id})`);
      return anyTeacher;
    }
    
    console.log(`\n👨‍🏫 Testing with teacher: ${teacher.name} (${teacher._id})`);
    console.log(`📧 Email: ${teacher.email}`);
    console.log(`🔑 Role: ${teacher.role}`);
    
    // Test the method that the endpoint uses
    console.log('\n🔍 Testing QuizLock.getLockedStudentsByTeacher...');
    
    try {
      const lockedStudents = await QuizLock.getLockedStudentsByTeacher(teacher._id);
      console.log(`📋 Found ${lockedStudents.length} locked students`);
      
      if (lockedStudents.length > 0) {
        console.log('\n📊 Locked students details:');
        for (const lock of lockedStudents) {
          console.log({
            lockId: lock._id,
            studentId: lock.studentId,
            studentName: lock.studentId?.name || 'N/A',
            quizId: lock.quizId,
            quizTitle: lock.quizId?.title || 'N/A',
            courseId: lock.courseId,
            courseName: lock.courseId?.name || 'N/A',
            isLocked: lock.isLocked,
            authLevel: lock.unlockAuthorizationLevel,
            reason: lock.failureReason
          });
        }
        
        // Test the enrichment logic from the endpoint
        console.log('\n🔄 Testing enrichment logic...');
        const enrichedData = await Promise.all(lockedStudents.map(async (lock) => {
          return {
            lockId: lock._id,
            student: {
              id: lock.studentId._id,
              name: lock.studentId.name,
              email: lock.studentId.email,
              regno: lock.studentId.regno
            },
            quiz: {
              id: lock.quizId._id,
              title: lock.quizId.title
            },
            course: {
              id: lock.courseId._id,
              name: lock.courseId.name,
              code: lock.courseId.code
            },
            lockInfo: {
              reason: lock.failureReason,
              lockTimestamp: lock.lockTimestamp,
              totalAttempts: lock.totalAttempts,
              lastAttemptScore: lock.lastAttemptScore,
              teacherUnlockCount: lock.teacherUnlockCount,
              remainingTeacherUnlocks: lock.remainingTeacherUnlocks
            }
          };
        }));
        
        console.log(`✅ Enriched data for ${enrichedData.length} students successfully`);
      }
      
    } catch (methodError) {
      console.error('❌ Error in getLockedStudentsByTeacher:', methodError.message);
      console.error('Stack:', methodError.stack);
    }
    
  } catch (error) {
    console.error('❌ Database connection error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from database');
  }
}

testUnlockEndpoint();