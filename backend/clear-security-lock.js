const mongoose = require('mongoose');
const User = require('./models/User');
const StudentProgress = require('./models/StudentProgress');
const QuizLock = require('./models/QuizLock');

// Use dotenv to load environment variables
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI).then(() => {
  console.log('Connected to MongoDB');
}).catch((error) => {
  console.error('MongoDB connection error:', error);
  process.exit(1);
});

async function clearSecurityLockAndTest() {
  try {
    console.log('🔧 Manually clearing security lock for Trisha...\n');

    // Find Sourav (current student in screenshot)
    const student = await User.findOne({ name: 'Sourav' });
    if (!student) {
      console.log('❌ Student not found');
      return;
    }

    // Find her progress
    const progress = await StudentProgress.findOne({ student: student._id });
    if (!progress) {
      console.log('❌ Student progress not found');
      return;
    }

    console.log('📋 Before clearing security lock:');
    console.log(`Student: ${student.name} (${student.email})`);
    
    // Check current unit progress for unit 1
    const unitId = '68d4fcad7e9ff2d35c0876d4'; // unit 1 ID
    const unitProgress = progress.units.find(u => u.unitId.toString() === unitId);
    
    if (unitProgress && unitProgress.securityLock) {
      console.log(`Security Lock Status: ${unitProgress.securityLock.locked}`);
      console.log(`Security Lock Reason: ${unitProgress.securityLock.reason}`);
      console.log(`Violation Count: ${unitProgress.securityLock.violationCount}`);
      
      // Clear the security lock
      unitProgress.securityLock.locked = false;
      unitProgress.securityLock.reason = 'Cleared by admin override';
      unitProgress.securityLock.violationCount = 0;
      unitProgress.securityLock.lockedAt = null;
      
      await progress.save();
      
      console.log('\n✅ Security lock cleared manually!');
    } else {
      console.log('No security lock found for this unit');
    }

    // Also check QuizLock status
    const quizLock = await QuizLock.findOne({ studentId: student._id });
    if (quizLock) {
      console.log('\n📋 QuizLock Status:');
      console.log(`Is Locked: ${quizLock.isLocked}`);
      console.log(`Authorization Level: ${quizLock.unlockAuthorizationLevel}`);
      console.log(`HOD Unlock Count: ${quizLock.hodUnlockCount}`);
    }

    console.log('\n🎉 Manual security lock clearing completed!');
    console.log('The student should now be able to access the quiz after refreshing the page.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

clearSecurityLockAndTest();