/**
 * DEBUG SCRIPT: Check Populated Data in Dean Unlock History
 * 
 * Purpose: Debug why Course and Student names are showing as N/A
 * This will check what the actual populated data looks like
 */

const mongoose = require('mongoose');
const QuizLock = require('./backend/models/QuizLock');
const User = require('./backend/models/User');
const Course = require('./backend/models/Course');
const Quiz = require('./backend/models/Quiz');

async function debugDeanUnlockHistory() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/sgtlms', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    console.log('🔍 DEBUGGING DEAN UNLOCK HISTORY DATA:\n');

    // Build the same query as the Dean endpoint
    const baseQuery = {
      $or: [
        { 'teacherUnlockHistory.0': { $exists: true } },
        { 'hodUnlockHistory.0': { $exists: true } },
        { 'deanUnlockHistory.0': { $exists: true } },
        { 'adminUnlockHistory.0': { $exists: true } }
      ]
    };

    console.log('📊 Base query:', JSON.stringify(baseQuery, null, 2));

    // Get one lock record to examine
    const lock = await QuizLock.findOne(baseQuery)
      .populate('studentId', 'name email regno regNo')
      .populate('quizId', 'title name')
      .populate('courseId', 'title name courseCode code');

    if (!lock) {
      console.log('❌ No lock found with unlock history');
      return;
    }

    console.log('\n🔍 EXAMINING LOCK RECORD:');
    console.log(`Lock ID: ${lock._id}`);
    console.log(`Is Locked: ${lock.isLocked}`);
    console.log(`Lock Reason: ${lock.failureReason}`);

    console.log('\n📝 RAW POPULATED DATA:');
    console.log('Student ID field:', lock.studentId);
    console.log('Course ID field:', lock.courseId);
    console.log('Quiz ID field:', lock.quizId);

    // Check the actual populated data
    if (lock.studentId) {
      console.log('\n👤 STUDENT DATA:');
      console.log(`  Student ID: ${lock.studentId._id}`);
      console.log(`  Student Name: ${lock.studentId.name}`);
      console.log(`  Student Email: ${lock.studentId.email}`);
      console.log(`  Student regno: ${lock.studentId.regno}`);
      console.log(`  Student regNo: ${lock.studentId.regNo}`);
      console.log(`  All fields:`, Object.keys(lock.studentId._doc || lock.studentId));
    } else {
      console.log('❌ Student not populated');
    }

    if (lock.courseId) {
      console.log('\n📚 COURSE DATA:');
      console.log(`  Course ID: ${lock.courseId._id}`);
      console.log(`  Course title: ${lock.courseId.title}`);
      console.log(`  Course name: ${lock.courseId.name}`);
      console.log(`  Course courseCode: ${lock.courseId.courseCode}`);
      console.log(`  Course code: ${lock.courseId.code}`);
      console.log(`  All fields:`, Object.keys(lock.courseId._doc || lock.courseId));
    } else {
      console.log('❌ Course not populated');
    }

    if (lock.quizId) {
      console.log('\n❓ QUIZ DATA:');
      console.log(`  Quiz ID: ${lock.quizId._id}`);
      console.log(`  Quiz title: ${lock.quizId.title}`);
      console.log(`  Quiz name: ${lock.quizId.name}`);
      console.log(`  All fields:`, Object.keys(lock.quizId._doc || lock.quizId));
    } else {
      console.log('❌ Quiz not populated');
    }

    // Check admin unlock history
    if (lock.adminUnlockHistory && lock.adminUnlockHistory.length > 0) {
      console.log('\n🔧 ADMIN UNLOCK HISTORY:');
      const adminUnlock = lock.adminUnlockHistory[0];
      console.log(`  Unlock timestamp: ${adminUnlock.unlockTimestamp}`);
      console.log(`  Reason: ${adminUnlock.reason}`);
      console.log(`  Admin ID: ${adminUnlock.adminId}`);
      console.log(`  Override level: ${adminUnlock.overrideLevel}`);
      console.log(`  Lock reason: ${adminUnlock.lockReason}`);
    }

    // Let's also check a few more records
    console.log('\n📊 CHECKING MULTIPLE RECORDS:');
    const locks = await QuizLock.find(baseQuery)
      .populate('studentId', 'name email regno regNo')
      .populate('quizId', 'title name')
      .populate('courseId', 'title name courseCode code')
      .limit(3);

    locks.forEach((lock, index) => {
      console.log(`\n📋 Record ${index + 1}:`);
      console.log(`  Student: ${lock.studentId?.name || 'NULL'} (${lock.studentId?.regno || lock.studentId?.regNo || 'NO REGNO'})`);
      console.log(`  Course: ${lock.courseId?.title || lock.courseId?.name || 'NULL'} (${lock.courseId?.courseCode || lock.courseId?.code || 'NO CODE'})`);
      console.log(`  Quiz: ${lock.quizId?.title || lock.quizId?.name || 'NULL'}`);
      console.log(`  Admin unlocks: ${lock.adminUnlockHistory?.length || 0}`);
    });

  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the debug
if (require.main === module) {
  debugDeanUnlockHistory();
}

module.exports = debugDeanUnlockHistory;