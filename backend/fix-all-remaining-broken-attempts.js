const mongoose = require('mongoose');
require('dotenv').config();

const QuizAttempt = require('./models/QuizAttempt');
const QuizPool = require('./models/QuizPool');
const Course = require('./models/Course');
const Unit = require('./models/Unit');
const User = require('./models/User');

async function fixAllRemainingBrokenAttempts() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Find all attempts with missing quizPool links
        const brokenAttempts = await QuizAttempt.find({
            $or: [
                { quizPool: { $exists: false } },
                { quizPool: null },
                { quizPool: undefined }
            ],
            course: { $exists: true },
            unit: { $exists: true }
        }).populate('student', 'name regNo').populate('course', 'courseCode title');

        console.log('\n=== FINDING ALL REMAINING BROKEN ATTEMPTS ===');
        console.log('Total broken attempts:', brokenAttempts.length);

        if (brokenAttempts.length === 0) {
            console.log('✅ No broken attempts found - all quiz pool links are valid!');
            return;
        }

        let fixedCount = 0;

        for (const attempt of brokenAttempts) {
            console.log(`\nBroken Attempt:`);
            console.log(`  Course: ${attempt.course?.courseCode} - ${attempt.course?.title}`);
            console.log(`  Student: ${attempt.student?.name || 'Unknown'} (${attempt.student?.regNo || 'No RegNo'})`);
            console.log(`  Unit: ${attempt.unit}`);
            console.log(`  Score: ${attempt.score}/${attempt.maxScore}`);

            // Try to find matching quiz pool
            const matchingPool = await QuizPool.findOne({
                course: attempt.course._id,
                unit: attempt.unit
            });

            if (matchingPool) {
                console.log(`  → ✅ Found matching pool: ${matchingPool.title}`);
                
                await QuizAttempt.updateOne(
                    { _id: attempt._id },
                    { $set: { quizPool: matchingPool._id } }
                );
                
                fixedCount++;
                console.log(`  → ✅ FIXED: Linked to ${matchingPool.title}`);
            } else {
                console.log(`  → ❌ No matching pool found - cannot fix`);
            }
        }

        console.log(`\n🎉 Successfully fixed ${fixedCount} more quiz attempts!`);

        // Final verification
        console.log('\n=== FINAL VERIFICATION ===');
        const remainingBroken = await QuizAttempt.find({
            $or: [
                { quizPool: { $exists: false } },
                { quizPool: null },
                { quizPool: undefined }
            ]
        });

        console.log(`Remaining broken attempts: ${remainingBroken.length}`);
        
        if (remainingBroken.length === 0) {
            console.log('✅ ALL QUIZ ATTEMPTS NOW HAVE PROPER QUIZ POOL LINKS!');
        } else {
            console.log('⚠️ Some attempts still cannot be fixed (likely orphaned data)');
        }

        // Show final state for C000008
        console.log('\n=== FINAL STATE FOR C000008 ===');
        const c000008Course = await Course.findOne({ courseCode: 'C000008' });
        const c000008Pools = await QuizPool.find({ course: c000008Course._id });
        
        for (const pool of c000008Pools) {
            const poolAttempts = await QuizAttempt.find({ quizPool: pool._id }).populate('student', 'name regNo');
            console.log(`${pool.title}: ${poolAttempts.length} attempts`);
            for (const attempt of poolAttempts) {
                console.log(`  - ${attempt.student?.name} (${attempt.score}/${attempt.maxScore})`);
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

fixAllRemainingBrokenAttempts();