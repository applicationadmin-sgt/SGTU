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

async function debugDeanDashboard() {
  try {
    console.log('🔍 Debugging Dean Dashboard Issues...\n');

    // Check all Dean-level locks
    console.log('1️⃣ Checking for Dean-level locks in database...');
    const deanLevelLocks = await QuizLock.find({
      isLocked: true,
      unlockAuthorizationLevel: 'DEAN'
    });
    
    console.log(`Found ${deanLevelLocks.length} Dean-level locks:`);
    
    for (const lock of deanLevelLocks) {
      const student = await User.findById(lock.studentId).select('name email');
      console.log(`  - Student: ${student?.name || 'Unknown'}`);
      console.log(`    Authorization Level: ${lock.unlockAuthorizationLevel}`);
      console.log(`    Is Locked: ${lock.isLocked}`);
      console.log(`    Teacher Unlocks: ${lock.teacherUnlockCount}`);
      console.log(`    HOD Unlocks: ${lock.hodUnlockCount}`);
      console.log(`    Dean Unlocks: ${lock.deanUnlockCount}`);
      console.log('');
    }

    // Check the specific student (Sourav)
    console.log('2️⃣ Checking Sourav\'s specific lock...');
    const sourav = await User.findOne({ name: 'Sourav' });
    if (sourav) {
      const souravLock = await QuizLock.findOne({ studentId: sourav._id });
      if (souravLock) {
        console.log(`Sourav's Lock Status:`);
        console.log(`  - Is Locked: ${souravLock.isLocked}`);
        console.log(`  - Authorization Level: ${souravLock.unlockAuthorizationLevel}`);
        console.log(`  - Teacher Unlocks: ${souravLock.teacherUnlockCount}/3`);
        console.log(`  - HOD Unlocks: ${souravLock.hodUnlockCount}/3`);
        console.log(`  - Should be at DEAN level: ${souravLock.teacherUnlockCount >= 3 && souravLock.hodUnlockCount >= 3}`);
        console.log('');
        
        // Check if this should be escalated to Dean
        if (souravLock.isLocked && souravLock.teacherUnlockCount >= 3 && souravLock.hodUnlockCount >= 3) {
          if (souravLock.unlockAuthorizationLevel !== 'DEAN') {
            console.log('🚨 ISSUE FOUND: Student should be at DEAN level but isn\'t!');
            console.log('   Fixing authorization level...');
            souravLock.unlockAuthorizationLevel = 'DEAN';
            await souravLock.save();
            console.log('✅ Fixed! Student now at DEAN level.');
          } else {
            console.log('✅ Student is correctly at DEAN level.');
          }
        }
      } else {
        console.log('❌ No QuizLock found for Sourav');
      }
    }

    // Test the Dean dashboard query directly
    console.log('3️⃣ Testing Dean dashboard query...');
    const deanDashboardResults = await QuizLock.getLockedStudentsForDean();
    console.log(`Dean dashboard would show ${deanDashboardResults.length} students:`);
    
    for (const lock of deanDashboardResults) {
      const student = await User.findById(lock.studentId).select('name');
      console.log(`  - ${student?.name || 'Unknown'} (${lock.unlockAuthorizationLevel} level)`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

debugDeanDashboard();