const mongoose = require('mongoose');
const QuizLock = require('./models/QuizLock');
const User = require('./models/User');

// Use dotenv to load environment variables
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI).then(() => {
  console.log('Connected to MongoDB');
}).catch((error) => {
  console.error('MongoDB connection error:', error);
  process.exit(1);
});

async function testUnlockLimits() {
  try {
    console.log('🔍 Testing New Unlock Limits...\n');

    // Find a student with QuizLock
    const student = await User.findOne({ name: 'Sourav' });
    if (!student) {
      console.log('❌ Student not found');
      return;
    }

    const quizLock = await QuizLock.findOne({ studentId: student._id });
    if (!quizLock) {
      console.log('❌ No QuizLock found');
      return;
    }

    console.log('📋 Current Unlock Status:');
    console.log(`Student: ${student.name}`);
    console.log('');
    
    console.log('👨‍🏫 TEACHER UNLOCKS:');
    console.log(`  Used: ${quizLock.teacherUnlockCount}/3`);
    console.log(`  Remaining: ${quizLock.remainingTeacherUnlocks}`);
    console.log(`  Can Unlock: ${quizLock.canTeacherUnlock}`);
    console.log('');
    
    console.log('👨‍💼 HOD UNLOCKS:');
    console.log(`  Used: ${quizLock.hodUnlockCount}/3`);
    console.log(`  Remaining: ${quizLock.remainingHodUnlocks}`);
    console.log(`  Can Unlock: ${quizLock.canHodUnlock}`);
    console.log('');
    
    console.log('👨‍💻 DEAN UNLOCKS:');
    console.log(`  Used: ${quizLock.deanUnlockCount} (unlimited)`);
    console.log(`  Remaining: Unlimited`);
    console.log('');
    
    console.log('👨‍💼 ADMIN UNLOCKS:');
    console.log(`  Used: ${quizLock.adminUnlockCount || 0} (unlimited override)`);
    console.log(`  Remaining: Unlimited`);
    console.log('');
    
    console.log('📈 UNLOCK FLOW:');
    console.log(`Current Authorization Level: ${quizLock.unlockAuthorizationLevel}`);
    
    if (quizLock.unlockAuthorizationLevel === 'TEACHER') {
      if (quizLock.teacherUnlockCount < 3) {
        console.log(`✅ Teacher can unlock (${3 - quizLock.teacherUnlockCount} unlocks remaining)`);
      } else {
        console.log('❌ Teacher limit exceeded → HOD required');
      }
    } else if (quizLock.unlockAuthorizationLevel === 'HOD') {
      if (quizLock.hodUnlockCount < 3) {
        console.log(`✅ HOD can unlock (${3 - quizLock.hodUnlockCount} unlocks remaining)`);
      } else {
        console.log('❌ HOD limit exceeded → Dean required');
      }
    } else if (quizLock.unlockAuthorizationLevel === 'DEAN') {
      console.log('✅ Dean can unlock (unlimited)');
    }
    
    console.log('');
    console.log('🎯 TOTAL ADDITIONAL ATTEMPTS GRANTED:');
    const totalUnlocks = quizLock.teacherUnlockCount + quizLock.hodUnlockCount + quizLock.deanUnlockCount + (quizLock.adminUnlockCount || 0);
    console.log(`Total Unlocks: ${totalUnlocks}`);
    console.log(`Base Attempts: 1`);
    console.log(`Additional Attempts: ${totalUnlocks}`);
    console.log(`Final Attempt Limit: ${1 + totalUnlocks}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

testUnlockLimits();