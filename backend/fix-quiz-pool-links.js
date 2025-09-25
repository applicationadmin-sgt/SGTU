const mongoose = require('mongoose');
require('dotenv').config();

const QuizAttempt = require('./models/QuizAttempt');
const QuizPool = require('./models/QuizPool');
const Course = require('./models/Course');
const User = require('./models/User');

async function fixQuizPoolLinks() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Find all attempts with undefined quizPool but valid course and unit
        const brokenAttempts = await QuizAttempt.find({ 
            quizPool: { $exists: false },
            course: { $exists: true },
            unit: { $exists: true }
        }).populate('student', 'name email regNo');

        console.log('\n=== ATTEMPTS WITH UNDEFINED QUIZ POOL ===');
        console.log('Total broken attempts:', brokenAttempts.length);

        const fixResults = [];

        for (const attempt of brokenAttempts) {
            console.log(`\nBroken Attempt:`);
            console.log(`  Student: ${attempt.student?.name || 'Unknown'} (${attempt.student?.regNo || 'No RegNo'})`);
            console.log(`  Course: ${attempt.course}`);
            console.log(`  Unit: ${attempt.unit}`);
            console.log(`  Score: ${attempt.score}/${attempt.maxScore}`);
            console.log(`  Date: ${attempt.completedAt || attempt.startedAt}`);

            // Try to find the matching quiz pool
            const matchingPool = await QuizPool.findOne({
                course: attempt.course,
                unit: attempt.unit
            });

            if (matchingPool) {
                console.log(`  → Found matching pool: ${matchingPool.title} (${matchingPool._id})`);
                fixResults.push({
                    attemptId: attempt._id,
                    poolId: matchingPool._id,
                    poolTitle: matchingPool.title,
                    studentName: attempt.student?.name || 'Unknown'
                });
            } else {
                console.log(`  → No matching pool found`);
            }
        }

        console.log('\n=== FIX SUMMARY ===');
        console.log(`Total attempts that can be fixed: ${fixResults.length}`);
        
        for (const fix of fixResults) {
            console.log(`${fix.studentName} → ${fix.poolTitle}`);
        }

        // Ask if we should apply the fixes
        console.log('\n=== APPLY FIXES? ===');
        console.log('The following updates would be applied:');
        
        for (const fix of fixResults) {
            console.log(`UPDATE QuizAttempt ${fix.attemptId} SET quizPool = ${fix.poolId}`);
        }

        // Actually apply the fixes
        console.log('\nApplying fixes...');
        let fixedCount = 0;
        
        for (const fix of fixResults) {
            await QuizAttempt.updateOne(
                { _id: fix.attemptId },
                { $set: { quizPool: fix.poolId } }
            );
            fixedCount++;
            console.log(`Fixed attempt ${fix.attemptId} for ${fix.studentName}`);
        }

        console.log(`\n✅ Successfully fixed ${fixedCount} quiz attempts!`);

        // Verify the fixes
        console.log('\n=== VERIFICATION ===');
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

fixQuizPoolLinks();