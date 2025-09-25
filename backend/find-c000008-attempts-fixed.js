const mongoose = require('mongoose');
require('dotenv').config();

const QuizAttempt = require('./models/QuizAttempt');
const QuizPool = require('./models/QuizPool');
const Course = require('./models/Course');
const User = require('./models/User'); // Add this to fix the populate issue

async function findC000008Attempts() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Find C000008 course and its quiz pools
        const course = await Course.findOne({ courseCode: 'C000008' });
        console.log('\n=== COURSE C000008 ===');
        console.log('Course Object ID:', course._id);
        console.log('Course Title:', course.title);

        // Find quiz pools for this course
        const quizPools = await QuizPool.find({ course: course._id });
        console.log('\n=== QUIZ POOLS FOR C000008 ===');
        for (const pool of quizPools) {
            console.log(`Pool: ${pool.title} (ID: ${pool._id})`);
        }

        // Now search for attempts using the correct field names and course Object ID
        const attemptsByCourse = await QuizAttempt.find({ course: course._id }).populate('student', 'name email regNo');
        console.log('\n=== QUIZ ATTEMPTS FOR C000008 BY COURSE ID ===');
        console.log('Total attempts found:', attemptsByCourse.length);

        for (const attempt of attemptsByCourse) {
            console.log(`\nStudent: ${attempt.student?.name || 'Unknown'} (${attempt.student?.regNo || 'No RegNo'})`);
            console.log(`Quiz Pool ID: ${attempt.quizPool}`);
            console.log(`Score: ${attempt.score}/${attempt.maxScore} (${attempt.percentage}%)`);
            console.log(`Passed: ${attempt.passed}`);
            console.log(`Date: ${attempt.completedAt || attempt.startedAt}`);
        }

        // Find which pool each attempt belongs to
        const poolIds = quizPools.map(pool => pool._id);
        const attemptsByPool = await QuizAttempt.find({ quizPool: { $in: poolIds } }).populate('student', 'name email regNo');
        console.log('\n=== QUIZ ATTEMPTS FOR C000008 BY POOL IDs ===');
        console.log('Total attempts found:', attemptsByPool.length);

        const attemptsByPoolMap = {};
        for (const attempt of attemptsByPool) {
            const poolId = attempt.quizPool.toString();
            if (!attemptsByPoolMap[poolId]) {
                attemptsByPoolMap[poolId] = [];
            }
            attemptsByPoolMap[poolId].push(attempt);
        }

        for (const pool of quizPools) {
            const poolAttempts = attemptsByPoolMap[pool._id.toString()] || [];
            console.log(`\n--- ${pool.title} ---`);
            console.log(`Pool ID: ${pool._id}`);
            console.log(`Attempts: ${poolAttempts.length}`);
            
            for (const attempt of poolAttempts) {
                console.log(`  Student: ${attempt.student?.name || 'Unknown'} (${attempt.student?.regNo || 'No RegNo'})`);
                console.log(`  Score: ${attempt.score}/${attempt.maxScore} (${attempt.percentage}%)`);
                console.log(`  Passed: ${attempt.passed}`);
                console.log(`  Date: ${attempt.completedAt || attempt.startedAt}`);
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

findC000008Attempts();