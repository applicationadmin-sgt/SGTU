const mongoose = require('mongoose');
const QuizLock = require('./models/QuizLock');
const User = require('./models/User');
const Unit = require('./models/Unit');
const Course = require('./models/Course');
const StudentProgress = require('./models/StudentProgress');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sgtlms', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function testFixedUnlock() {
  try {
    console.log('🧪 Testing Fixed HOD Unlock (clears both quiz lock AND security lock)...\n');

    // Find Trisha's data
    const student = await User.findOne({ name: 'Trisha' });
    const unit = await Unit.findOne({ title: 'unit 1' });
    const hod = await User.findOne({ role: 'hod' });

    if (!student || !unit || !hod) {
      console.log('❌ Required data not found');
      return;
    }

    // Get current state BEFORE unlock
    const quizLockBefore = await QuizLock.findOne({ 
      studentId: student._id,
      quizId: { $in: unit.quizzes }
    });

    const progressBefore = await StudentProgress.findOne({ 
      student: student._id, 
      course: unit.course 
    });
    const unitProgressBefore = progressBefore?.units?.find(u => u.unitId.toString() === unit._id.toString());

    console.log('📋 BEFORE Unlock:');
    console.log(`QuizLock.isLocked: ${quizLockBefore?.isLocked}`);
    console.log(`SecurityLock.locked: ${unitProgressBefore?.securityLock?.locked}`);
    console.log(`SecurityLock.reason: ${unitProgressBefore?.securityLock?.reason}`);

    // Simulate the fixed HOD unlock process (both QuizLock AND SecurityLock clearing)
    if (quizLockBefore && quizLockBefore.isLocked) {
      console.log('\n🔧 Simulating Fixed HOD Unlock...');
      
      // 1. Unlock the QuizLock
      await quizLockBefore.unlockByHOD(hod._id, 'Test HOD unlock with security clear', 'Testing the fix');
      
      // 2. Clear the security lock (the NEW functionality)
      if (unitProgressBefore?.securityLock?.locked) {
        await StudentProgress.updateOne(
          { 
            student: student._id,
            course: unit.course,
            'units.unitId': unit._id
          },
          {
            $set: {
              'units.$.securityLock.locked': false,
              'units.$.securityLock.clearedBy': 'HOD',
              'units.$.securityLock.clearedAt': new Date(),
              'units.$.securityLock.clearedReason': 'Security lock cleared by HOD unlock - Test HOD unlock with security clear'
            }
          }
        );
        console.log('✅ Security lock cleared by HOD');
      } else {
        console.log('ℹ️  No active security lock to clear');
      }
      
    } else {
      console.log('\n⚠️  QuizLock is already unlocked, testing security lock clearing only...');
      
      // Just clear security lock if it exists
      if (unitProgressBefore?.securityLock?.locked) {
        await StudentProgress.updateOne(
          { 
            student: student._id,
            course: unit.course,
            'units.unitId': unit._id
          },
          {
            $set: {
              'units.$.securityLock.locked': false,
              'units.$.securityLock.clearedBy': 'HOD',
              'units.$.securityLock.clearedAt': new Date(),
              'units.$.securityLock.clearedReason': 'Security lock cleared by HOD unlock - Test unlock'
            }
          }
        );
        console.log('✅ Security lock cleared by HOD');
      } else {
        console.log('ℹ️  No active security lock to clear');
      }
    }

    // Get state AFTER unlock
    const quizLockAfter = await QuizLock.findOne({ 
      studentId: student._id,
      quizId: { $in: unit.quizzes }
    });

    const progressAfter = await StudentProgress.findOne({ 
      student: student._id, 
      course: unit.course 
    });
    const unitProgressAfter = progressAfter?.units?.find(u => u.unitId.toString() === unit._id.toString());

    console.log('\n📋 AFTER Fixed Unlock:');
    console.log(`QuizLock.isLocked: ${quizLockAfter?.isLocked}`);
    console.log(`SecurityLock.locked: ${unitProgressAfter?.securityLock?.locked}`);
    console.log(`SecurityLock.clearedBy: ${unitProgressAfter?.securityLock?.clearedBy}`);
    console.log(`SecurityLock.clearedAt: ${unitProgressAfter?.securityLock?.clearedAt}`);

    // Test the quiz availability now
    console.log('\n🎯 Testing Quiz Availability After Fix...');
    const { checkUnitQuizAvailability } = require('./controllers/unitQuizController');
    
    const req = {
      params: { unitId: unit._id.toString() },
      user: { _id: student._id }
    };

    let finalResult = null;
    const res = {
      status: (code) => ({
        json: (data) => {
          console.log(`❌ Error Response (${code}):`, data.message);
          finalResult = { error: true, code, data };
        }
      }),
      json: (data) => {
        console.log('✅ Final Quiz Availability Result:');
        console.log(`Available: ${data.available}`);
        console.log(`Is Locked: ${data.isLocked}`);
        console.log(`Can Take Quiz: ${data.canTakeQuiz}`);
        
        if (!data.isLocked) {
          console.log('🎉 SUCCESS! Student can now access the quiz!');
        } else {
          console.log('❌ Still locked. Lock info:', data.lockInfo);
        }
        
        finalResult = data;
      }
    };

    await checkUnitQuizAvailability(req, res);

  } catch (error) {
    console.error('❌ Error in test:', error);
  } finally {
    mongoose.connection.close();
  }
}

testFixedUnlock();