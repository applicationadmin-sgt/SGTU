const mongoose = require('mongoose');
require('dotenv').config();

const QuizPool = require('./models/QuizPool');
const QuizAttempt = require('./models/QuizAttempt');
const Course = require('./models/Course');
const User = require('./models/User');

async function testCourseC000008QuizPools() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Find course C000008
        const course = await Course.findOne({ courseId: 'C000008' });
        console.log('\n=== COURSE C000008 ===');
        console.log('Course found:', course ? 'Yes' : 'No');
        if (course) {
            console.log('Course ID:', course.courseId);
            console.log('Course Name:', course.courseName);
            console.log('Course _id:', course._id);
        }

        // Find all quiz pools for this course
        const quizPools = await QuizPool.find({ courseId: 'C000008' });
        console.log('\n=== QUIZ POOLS FOR C000008 ===');
        console.log('Total quiz pools found:', quizPools.length);
        
        for (const pool of quizPools) {
            console.log(`\nQuiz Pool: ${pool.poolName}`);
            console.log(`Pool ID: ${pool._id}`);
            console.log(`Unit: ${pool.unitNumber || 'Not specified'}`);
            console.log(`Questions count: ${pool.questions ? pool.questions.length : 0}`);
            console.log(`Created: ${pool.createdAt}`);
        }

        // Find all quiz attempts for C000008 quiz pools
        const poolIds = quizPools.map(pool => pool._id);
        const attempts = await QuizAttempt.find({ 
            quizId: { $in: poolIds },
            quizType: 'pool'
        }).populate('userId', 'name email regNo');

        console.log('\n=== QUIZ ATTEMPTS FOR C000008 POOLS ===');
        console.log('Total attempts found:', attempts.length);

        const attemptsByPool = {};
        for (const attempt of attempts) {
            const poolId = attempt.quizId.toString();
            if (!attemptsByPool[poolId]) {
                attemptsByPool[poolId] = [];
            }
            attemptsByPool[poolId].push(attempt);
        }

        for (const pool of quizPools) {
            const poolAttempts = attemptsByPool[pool._id.toString()] || [];
            console.log(`\n--- ${pool.poolName} ---`);
            console.log(`Attempts: ${poolAttempts.length}`);
            
            for (const attempt of poolAttempts) {
                console.log(`  Student: ${attempt.userId?.name || 'Unknown'} (${attempt.userId?.regNo || 'No RegNo'})`);
                console.log(`  Score: ${attempt.score}/${attempt.totalQuestions}`);
                console.log(`  Date: ${attempt.submittedAt}`);
                console.log(`  Quiz ID: ${attempt.quizId}`);
            }
        }

        // Also check for any direct quiz attempts for C000008
        const directAttempts = await QuizAttempt.find({ 
            courseId: 'C000008',
            quizType: { $ne: 'pool' }
        }).populate('userId', 'name email regNo');

        console.log('\n=== DIRECT QUIZ ATTEMPTS FOR C000008 ===');
        console.log('Total direct attempts found:', directAttempts.length);
        
        for (const attempt of directAttempts) {
            console.log(`Student: ${attempt.userId?.name || 'Unknown'} (${attempt.userId?.regNo || 'No RegNo'})`);
            console.log(`Quiz ID: ${attempt.quizId}`);
            console.log(`Score: ${attempt.score}/${attempt.totalQuestions}`);
            console.log(`Date: ${attempt.submittedAt}`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

testCourseC000008QuizPools();