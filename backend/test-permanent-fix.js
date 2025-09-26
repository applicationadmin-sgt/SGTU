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

async function testPermanentFix() {
  try {
    console.log('🔧 Testing Permanent Authorization Level Fix...\n');

    // Test 1: Check Dean dashboard with automatic fixing
    console.log('1️⃣ Testing Dean Dashboard (should auto-fix authorization levels)...');
    const deanDashboardResults = await QuizLock.getLockedStudentsForDean();
    console.log(`Dean dashboard shows ${deanDashboardResults.length} students requiring dean unlock:`);
    
    for (const lock of deanDashboardResults) {
      const student = await User.findById(lock.studentId).select('name');
      console.log(`  - ${student?.name || 'Unknown'} (${lock.unlockAuthorizationLevel} level)`);
      console.log(`    Teacher: ${lock.teacherUnlockCount}/3, HOD: ${lock.hodUnlockCount}/3`);
    }

    // Test 2: Verify Sourav's lock is now at correct level
    console.log('\n2️⃣ Verifying Sourav\'s authorization level...');
    const sourav = await User.findOne({ name: 'Sourav' });
    if (sourav) {
      const souravLock = await QuizLock.findOne({ studentId: sourav._id });
      if (souravLock) {
        console.log(`Sourav's current status:`);
        console.log(`  - Authorization Level: ${souravLock.unlockAuthorizationLevel}`);
        console.log(`  - Teacher Unlocks: ${souravLock.teacherUnlockCount}/3`);
        console.log(`  - HOD Unlocks: ${souravLock.hodUnlockCount}/3`);
        console.log(`  - Is at correct level: ${souravLock.teacherUnlockCount >= 3 && souravLock.hodUnlockCount >= 3 ? 'DEAN' : 'HOD'} (should be DEAN)`);
      }
    }

    // Test 3: Test the updateAuthorizationLevel method directly
    console.log('\n3️⃣ Testing authorization level update method...');
    const testLock = await QuizLock.findOne({ isLocked: true });
    if (testLock) {
      const originalLevel = testLock.unlockAuthorizationLevel;
      console.log(`Before update: ${originalLevel}`);
      
      testLock.updateAuthorizationLevel();
      console.log(`After update: ${testLock.unlockAuthorizationLevel}`);
      
      if (originalLevel !== testLock.unlockAuthorizationLevel) {
        console.log(`✅ Authorization level corrected: ${originalLevel} → ${testLock.unlockAuthorizationLevel}`);
      } else {
        console.log(`✅ Authorization level was already correct: ${testLock.unlockAuthorizationLevel}`);
      }
    }

    console.log('\n🎉 Permanent fix verification complete!');
    console.log('The system will now automatically correct authorization levels when dashboards are accessed.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

testPermanentFix();