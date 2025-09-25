const mongoose = require('mongoose');
require('dotenv').config();

const QuizAttempt = require('./models/QuizAttempt');
const QuizPool = require('./models/QuizPool');
const Course = require('./models/Course');
const User = require('./models/User');

async function fixAllBrokenQuizPoolLinks() {
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

        console.log('\n=== ALL BROKEN QUIZ POOL LINKS ===');
        console.log('Total broken attempts:', brokenAttempts.length);

        if (brokenAttempts.length === 0) {
            console.log('✅ No broken attempts found - all quiz pool links are valid!');
            return;
        }

        const fixResults = [];
        const courseStats = {};

        for (const attempt of brokenAttempts) {
            const courseCode = attempt.course?.courseCode || 'Unknown';
            
            if (!courseStats[courseCode]) {
                courseStats[courseCode] = {
                    courseName: attempt.course?.title || 'Unknown',
                    brokenCount: 0,
                    fixableCount: 0
                };
            }
            courseStats[courseCode].brokenCount++;

            console.log(`\nBroken Attempt:`);
            console.log(`  Course: ${courseCode} - ${attempt.course?.title || 'Unknown'}`);
            console.log(`  Student: ${attempt.student?.name || 'Unknown'} (${attempt.student?.regNo || 'No RegNo'})`);
            console.log(`  Unit: ${attempt.unit}`);
            console.log(`  Score: ${attempt.score}/${attempt.maxScore}`);

            // Try to find matching quiz pool
            const matchingPool = await QuizPool.findOne({
                course: attempt.course._id,
                unit: attempt.unit
            });

            if (matchingPool) {
                console.log(`  → ✅ Can fix: ${matchingPool.title}`);
                courseStats[courseCode].fixableCount++;
                fixResults.push({
                    attemptId: attempt._id,
                    poolId: matchingPool._id,
                    poolTitle: matchingPool.title,
                    courseCode: courseCode,
                    studentName: attempt.student?.name || 'Unknown'
                });
            } else {
                console.log(`  → ❌ No matching pool found`);
            }
        }

        console.log('\n=== SUMMARY BY COURSE ===');
        for (const [courseCode, stats] of Object.entries(courseStats)) {
            console.log(`${courseCode} (${stats.courseName}):`);
            console.log(`  Broken attempts: ${stats.brokenCount}`);
            console.log(`  Fixable attempts: ${stats.fixableCount}`);
            console.log(`  Unable to fix: ${stats.brokenCount - stats.fixableCount}`);
        }

        if (fixResults.length > 0) {
            console.log('\n=== APPLYING FIXES ===');
            let fixedCount = 0;

            for (const fix of fixResults) {
                await QuizAttempt.updateOne(
                    { _id: fix.attemptId },
                    { $set: { quizPool: fix.poolId } }
                );
                fixedCount++;
                console.log(`✅ Fixed ${fix.courseCode}: ${fix.studentName} → ${fix.poolTitle}`);
            }

            console.log(`\n🎉 Successfully fixed ${fixedCount} quiz attempts across all courses!`);
        }

        // Verify fix by checking each course's quiz pool analytics
        console.log('\n=== VERIFICATION FOR ALL COURSES ===');
        const allCourses = await Course.find({ hasUnits: true });
        
        for (const course of allCourses) {
            const pools = await QuizPool.find({ course: course._id });
            if (pools.length > 0) {
                console.log(`\n${course.courseCode} - ${course.title}:`);
                for (const pool of pools) {
                    const attempts = await QuizAttempt.find({ quizPool: pool._id });
                    console.log(`  ${pool.title}: ${attempts.length} attempts`);
                }
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

fixAllBrokenQuizPoolLinks();