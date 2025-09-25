const mongoose = require('mongoose');
require('dotenv').config();

const QuizAttempt = require('./models/QuizAttempt');
const QuizPool = require('./models/QuizPool');
const Course = require('./models/Course');

async function checkC000008Attempts() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Find C000008 course and its quiz pools
        const course = await Course.findOne({ courseCode: 'C000008' });
        console.log('\n=== COURSE C000008 ===');
        console.log('Course ID:', course._id);
        console.log('Course Title:', course.title);

        // Find quiz pools for this course
        const quizPools = await QuizPool.find({ course: course._id });
        console.log('\n=== QUIZ POOLS FOR C000008 ===');
        console.log('Total pools:', quizPools.length);

        for (const pool of quizPools) {
            console.log(`\nPool: ${pool.title}`);
            console.log(`Pool ID: ${pool._id}`);
            console.log(`Unit ID: ${pool.unit}`);
            console.log(`Quizzes: ${pool.quizzes.length}`);
        }

        // Check all quiz attempts with detailed structure
        const allAttempts = await QuizAttempt.find({});
        console.log('\n=== ALL QUIZ ATTEMPTS FULL STRUCTURE ===');
        console.log('Total attempts:', allAttempts.length);

        for (let i = 0; i < Math.min(5, allAttempts.length); i++) {
            const attempt = allAttempts[i];
            console.log(`\n--- Attempt ${i + 1} Full Structure ---`);
            console.log(JSON.stringify(attempt, null, 2));
        }

        // Check QuizAttempt schema
        console.log('\n=== QUIZ ATTEMPT SCHEMA PATHS ===');
        const attemptPaths = Object.keys(QuizAttempt.schema.paths);
        console.log('Available fields in QuizAttempt model:', attemptPaths);

        // Try to find attempts related to C000008 quiz pools
        const poolIds = quizPools.map(pool => pool._id);
        console.log('\n=== SEARCHING FOR ATTEMPTS BY POOL IDs ===');
        console.log('Pool IDs to search:', poolIds.map(id => id.toString()));

        const attemptsByPoolId = await QuizAttempt.find({ quizId: { $in: poolIds } });
        console.log('Attempts found by pool IDs:', attemptsByPoolId.length);

        // Try different field names in case the schema uses different field names
        const attemptsByQuiz = await QuizAttempt.find({ quiz: { $in: poolIds } });
        console.log('Attempts found by quiz field:', attemptsByQuiz.length);

        const attemptsByQuizPool = await QuizAttempt.find({ quizPool: { $in: poolIds } });
        console.log('Attempts found by quizPool field:', attemptsByQuizPool.length);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

checkC000008Attempts();