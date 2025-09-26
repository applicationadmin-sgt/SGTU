const mongoose = require('mongoose');
const QuizLock = require('./models/QuizLock');
const User = require('./models/User');
const Quiz = require('./models/Quiz');
const Course = require('./models/Course');

// Connect to MongoDB
mongoose.connect('mongodb+srv://dipanwitakundu02_db_user:qItA3GEvqVBiGaYJ@cluster0.ak3b8nt.mongodb.net/', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function debugHODUnlock() {
  try {
    console.log('🔍 Starting HOD unlock debugging...\n');

    // Find the specific QuizLock for Trisha
    const lock = await QuizLock.findOne({}).populate('studentId quizId courseId');
    if (!lock) {
      console.log('❌ No QuizLock found');
      return;
    }

    console.log('📋 Current QuizLock State:');
    console.log(`Student: ${lock.studentId?.name} (${lock.studentId?.regno})`);
    console.log(`Quiz: ${lock.quizId?.title}`);
    console.log(`Course: ${lock.courseId?.name || lock.courseId?.title}`);
    console.log(`Is Locked: ${lock.isLocked}`);
    console.log(`Authorization Level: ${lock.unlockAuthorizationLevel}`);
    console.log(`HOD Unlock Count: ${lock.hodUnlockCount}`);
    console.log(`HOD Unlock History:`, JSON.stringify(lock.hodUnlockHistory, null, 2));
    console.log('');

    // Find HOD
    const hod = await User.findOne({ role: 'hod' });
    if (!hod) {
      console.log('❌ No HOD found');
      return;
    }

    console.log(`👨‍💼 HOD: ${hod.name} (${hod.email})`);
    console.log('');

    // Test HOD unlock if quiz is still locked
    if (lock.isLocked && lock.unlockAuthorizationLevel === 'HOD') {
      console.log('🔓 Testing HOD unlock...');
      
      try {
        // Call the unlockByHOD method
        await lock.unlockByHOD(hod._id, 'Debugging unlock issue', 'Manual unlock test');
        
        console.log('✅ HOD unlock method executed successfully');
        
        // Reload the lock to check if changes were saved
        const updatedLock = await QuizLock.findById(lock._id);
        console.log('📋 Updated QuizLock State:');
        console.log(`Is Locked: ${updatedLock.isLocked}`);
        console.log(`Authorization Level: ${updatedLock.unlockAuthorizationLevel}`);
        console.log(`HOD Unlock Count: ${updatedLock.hodUnlockCount}`);
        console.log(`HOD Unlock History:`, JSON.stringify(updatedLock.hodUnlockHistory, null, 2));
        
        if (!updatedLock.isLocked) {
          console.log('✅ Quiz successfully unlocked by HOD');
        } else {
          console.log('❌ Quiz is still locked after HOD unlock');
        }
        
      } catch (unlockError) {
        console.error('❌ Error during HOD unlock:', unlockError.message);
        console.error('Stack:', unlockError.stack);
      }
      
    } else if (!lock.isLocked) {
      console.log('✅ Quiz is already unlocked');
    } else {
      console.log(`⚠️  Quiz requires ${lock.unlockAuthorizationLevel} authorization, not HOD`);
    }

    // Check quiz availability for the student
    console.log('\n🎯 Testing quiz availability check...');
    const studentId = lock.studentId._id;
    const quizId = lock.quizId._id;
    
    const availabilityLock = await QuizLock.findOne({ 
      studentId: studentId, 
      quizId: quizId 
    });
    
    if (availabilityLock) {
      console.log(`Quiz availability - Is Locked: ${availabilityLock.isLocked}`);
      if (availabilityLock.isLocked) {
        console.log('❌ Student will see quiz as locked');
      } else {
        console.log('✅ Student should be able to access quiz');
      }
    } else {
      console.log('✅ No lock found - student should be able to access quiz');
    }

  } catch (error) {
    console.error('❌ Error in HOD unlock debugging:', error);
    console.error('Stack:', error.stack);
  } finally {
    mongoose.connection.close();
  }
}

debugHODUnlock();