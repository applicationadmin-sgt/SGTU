const mongoose = require('mongoose');
const User = require('./models/User');
const Unit = require('./models/Unit');
const QuizLock = require('./models/QuizLock');
const { checkUnitQuizAvailability } = require('./controllers/unitQuizController');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sgtlms', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function testControllerDirectly() {
  try {
    console.log('🔍 Testing Controller Function Directly...\n');

    // Find Trisha's data
    const student = await User.findOne({ name: 'Trisha' });
    const unit = await Unit.findOne({ title: 'unit 1' });

    if (!student || !unit) {
      console.log('❌ Student or unit not found');
      return;
    }

    // Check QuizLock directly first
    const quizLock = await QuizLock.findOne({ 
      studentId: student._id,
      quizId: { $in: unit.quizzes }
    });

    console.log('📋 Direct QuizLock Check:');
    console.log(`Student: ${student.name} (${student.email})`);
    console.log(`Unit: ${unit.title}`);
    console.log(`Unit ID: ${unit._id}`);
    if (quizLock) {
      console.log(`QuizLock exists: ${quizLock.isLocked}`);
      console.log(`Authorization Level: ${quizLock.unlockAuthorizationLevel}`);
      console.log(`HOD Unlock Count: ${quizLock.hodUnlockCount}`);
    } else {
      console.log('No QuizLock found');
    }

    // Mock request and response objects
    const req = {
      params: { unitId: unit._id.toString() },
      user: { _id: student._id }
    };

    let responseData = null;
    const res = {
      status: (code) => ({
        json: (data) => {
          console.log(`❌ Error Response (${code}):`, data);
          responseData = { error: true, code, data };
        }
      }),
      json: (data) => {
        console.log('\n✅ Success Response:');
        console.log(`Available: ${data.available}`);
        console.log(`Is Locked: ${data.isLocked}`);
        console.log(`Lock Info:`, data.lockInfo);
        console.log(`Teacher Unlocks: ${data.teacherUnlocks}`);
        console.log(`Attempts Taken: ${data.attemptsTaken}`);
        console.log(`Remaining Attempts: ${data.remainingAttempts}`);
        console.log(`Attempt Limit: ${data.attemptLimit}`);
        console.log(`Can Take Quiz: ${data.canTakeQuiz}`);
        responseData = data;
      }
    };

    // Call the controller function
    console.log('\n🎯 Calling checkUnitQuizAvailability...');
    await checkUnitQuizAvailability(req, res);

    // Additional analysis
    if (responseData && !responseData.error) {
      console.log('\n📊 Analysis:');
      console.log(`QuizLock shows locked: ${quizLock ? quizLock.isLocked : 'No lock exists'}`);
      console.log(`Controller returns locked: ${responseData.isLocked}`);
      
      if (quizLock && quizLock.isLocked !== responseData.isLocked) {
        console.log('🚨 MISMATCH DETECTED! QuizLock and Controller disagree on lock status!');
      } else if (quizLock && quizLock.isLocked === responseData.isLocked) {
        console.log('✅ QuizLock and Controller agree on lock status');
      }
    }

  } catch (error) {
    console.error('❌ Error in controller test:', error);
    console.error('Stack:', error.stack);
  } finally {
    mongoose.connection.close();
  }
}

testControllerDirectly();
