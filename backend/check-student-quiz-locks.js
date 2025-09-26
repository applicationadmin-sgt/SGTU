const mongoose = require('mongoose');
require('dotenv').config();

async function checkStudentQuizLocks() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const QuizLock = require('./models/QuizLock');
        const User = require('./models/User');
        const Quiz = require('./models/Quiz');

        // Find the student
        const student = await User.findOne({ regNo: 'S999989' });
        if (!student) {
            console.log('Student not found');
            return;
        }

        // Find the quiz
        const quiz = await Quiz.findOne({ title: { $regex: 'As001', $options: 'i' } });
        if (!quiz) {
            console.log('Quiz not found');
            return;
        }

        console.log(`\nStudent: ${student.name} (${student.regNo})`);
        console.log(`Quiz: ${quiz.title}`);
        console.log('\n=== QuizLock History (newest first) ===');

        // Get all QuizLock entries for this student-quiz combination
        const locks = await QuizLock.find({ 
            studentId: student._id, 
            quizId: quiz._id 
        }).sort({ lockTimestamp: -1 });

        if (locks.length === 0) {
            console.log('No QuizLock entries found');
            return;
        }

        locks.forEach((lock, index) => {
            console.log(`\n${index + 1}. Lock Entry:`);
            console.log(`   - ID: ${lock._id}`);
            console.log(`   - Reason: ${lock.failureReason}`);
            console.log(`   - Currently Locked: ${lock.isLocked}`);
            console.log(`   - Authorization Level: ${lock.unlockAuthorizationLevel}`);
            console.log(`   - Lock Timestamp: ${lock.lockTimestamp}`);
            console.log(`   - Teacher Unlocks: ${lock.teacherUnlockCount}/3`);
            console.log(`   - HOD Unlocks: ${lock.hodUnlockCount}`);
            console.log(`   - Dean Unlocks: ${lock.deanUnlockCount}`);
            console.log(`   - Admin Unlocks: ${lock.adminUnlockCount}`);
            if (lock.unlockHistory && lock.unlockHistory.length > 0) {
                console.log(`   - Unlock History:`);
                lock.unlockHistory.forEach((history, histIndex) => {
                    console.log(`     ${histIndex + 1}. ${history.unlockedBy} (${history.role}) at ${history.timestamp}`);
                });
            }
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        mongoose.connection.close();
    }
}

checkStudentQuizLocks();