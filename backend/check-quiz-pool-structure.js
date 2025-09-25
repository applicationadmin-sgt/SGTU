const mongoose = require('mongoose');
require('dotenv').config();

const QuizPool = require('./models/QuizPool');
const QuizAttempt = require('./models/QuizAttempt');

async function checkQuizPoolStructure() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Get all quiz pools and show their full structure
        const allQuizPools = await QuizPool.find({});
        console.log('\n=== ALL QUIZ POOLS WITH FULL STRUCTURE ===');
        console.log('Total quiz pools:', allQuizPools.length);

        for (let i = 0; i < allQuizPools.length; i++) {
            const pool = allQuizPools[i];
            console.log(`\n--- Quiz Pool ${i + 1} ---`);
            console.log('Full quiz pool object:', JSON.stringify(pool, null, 2));
        }

        // Check QuizPool schema to understand the field names
        console.log('\n=== QUIZ POOL SCHEMA PATHS ===');
        const poolPaths = Object.keys(QuizPool.schema.paths);
        console.log('Available fields in QuizPool model:', poolPaths);

        // Check for any quiz attempts
        const allAttempts = await QuizAttempt.find({});
        console.log('\n=== ALL QUIZ ATTEMPTS ===');
        console.log('Total attempts:', allAttempts.length);

        for (let i = 0; i < Math.min(5, allAttempts.length); i++) {
            const attempt = allAttempts[i];
            console.log(`\n--- Attempt ${i + 1} ---`);
            console.log('Quiz ID:', attempt.quizId);
            console.log('Quiz Type:', attempt.quizType);
            console.log('Course ID:', attempt.courseId);
            console.log('User ID:', attempt.userId);
            console.log('Score:', attempt.score);
            console.log('Submitted:', attempt.submittedAt);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

checkQuizPoolStructure();