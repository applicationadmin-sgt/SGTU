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

async function checkUnlockCounts() {
  try {
    console.log('🔍 Checking unlock counts for Sourav...\n');

    // Find Sourav
    const student = await User.findOne({ name: 'Sourav' });
    if (!student) {
      console.log('❌ Student not found');
      return;
    }

    // Find QuizLock for Sourav
    const quizLock = await QuizLock.findOne({ studentId: student._id });
    if (!quizLock) {
      console.log('❌ No QuizLock found for Sourav');
      return;
    }

    console.log('📋 QuizLock Unlock Counts:');
    console.log(`Student: ${student.name}`);
    console.log(`Teacher Unlocks: ${quizLock.teacherUnlockCount || 0}`);
    console.log(`HOD Unlocks: ${quizLock.hodUnlockCount || 0}`);
    console.log(`Dean Unlocks: ${quizLock.deanUnlockCount || 0}`);
    console.log(`Admin Unlocks: ${quizLock.adminUnlockCount || 0}`);
    
    const totalUnlocks = (quizLock.teacherUnlockCount || 0) + 
                        (quizLock.hodUnlockCount || 0) + 
                        (quizLock.deanUnlockCount || 0) + 
                        (quizLock.adminUnlockCount || 0);
    
    console.log(`Total Unlocks: ${totalUnlocks}`);
    console.log(`Base Attempt Limit: 1`);
    console.log(`Additional Attempts from Unlocks: ${totalUnlocks}`);
    console.log(`Final Attempt Limit: ${1 + totalUnlocks}`);
    
    console.log('\n✅ The student should now be able to take the quiz with the updated attempt limit!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkUnlockCounts();