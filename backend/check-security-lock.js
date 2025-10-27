const mongoose = require('mongoose');
const User = require('./models/User');
const Unit = require('./models/Unit');
const StudentProgress = require('./models/StudentProgress');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sgtlms', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function checkSecurityLock() {
  try {
    console.log('🔍 Checking Security Lock for Trisha...\n');

    // Find Trisha's data
    const student = await User.findOne({ name: 'Trisha' });
    const unit = await Unit.findOne({ title: 'unit 1' });

    if (!student || !unit) {
      console.log('❌ Student or unit not found');
      return;
    }

    // Check student progress
    const progress = await StudentProgress.findOne({ 
      student: student._id, 
      course: unit.course
    });

    if (!progress) {
      console.log('❌ No progress found for student');
      return;
    }

    const unitProgress = progress.units.find(u => u.unitId.toString() === unit._id.toString());
    if (!unitProgress) {
      console.log('❌ No unit progress found');
      return;
    }

    console.log('📋 Security Lock Details:');
    console.log('Security Lock exists:', !!unitProgress.securityLock);
    console.log('Security Lock locked:', unitProgress.securityLock?.locked);
    console.log('Security Lock reason:', unitProgress.securityLock?.reason);
    console.log('Security Lock timestamp:', unitProgress.securityLock?.lockedAt);
    console.log('Security Lock violations:', unitProgress.securityLock?.violationCount);

    console.log('\n📋 Full Security Lock Object:');
    console.log(JSON.stringify(unitProgress.securityLock, null, 2));

    // Check if HOD unlock should have cleared this
    console.log('\n🤔 Analysis:');
    console.log('The HOD unlocked the QuizLock (for failing score)');
    console.log('But the Security Lock (for tab violations) is still active');
    console.log('This means the student still cannot access the quiz');
    console.log('\n💡 Solution: HOD unlock should also clear security violations');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkSecurityLock();