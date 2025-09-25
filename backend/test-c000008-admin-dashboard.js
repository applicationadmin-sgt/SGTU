const mongoose = require('mongoose');
require('dotenv').config();

const QuizAttempt = require('./models/QuizAttempt');
const QuizPool = require('./models/QuizPool');
const Course = require('./models/Course');
const User = require('./models/User');

async function testC000008AdminDashboard() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Simulate the exact query that the admin dashboard would make
        const course = await Course.findOne({ courseCode: 'C000008' });
        console.log('\n=== COURSE C000008 ===');
        console.log('Course found:', !!course);
        console.log('Course Title:', course?.title);

        if (!course) {
            console.log('❌ Course not found!');
            return;
        }

        // Get quiz pools for this course (what the frontend would see)
        const quizPools = await QuizPool.find({ course: course._id });
        console.log('\n=== QUIZ POOLS FOR ADMIN DASHBOARD ===');
        console.log('Total quiz pools:', quizPools.length);

        for (const pool of quizPools) {
            console.log(`\n--- ${pool.title} ---`);
            console.log(`Pool ID: ${pool._id}`);
            console.log(`Unit: ${pool.unit}`);
            console.log(`Active: ${pool.isActive}`);
            console.log(`Questions per attempt: ${pool.questionsPerAttempt}`);
            console.log(`Time limit: ${pool.timeLimit} minutes`);
            console.log(`Passing score: ${pool.passingScore}%`);

            // Simulate the getQuizPoolAnalytics API call
            const attempts = await QuizAttempt.find({ quizPool: pool._id })
                .populate('student', 'name regNo');

            console.log(`\n📊 Analytics for ${pool.title}:`);
            console.log(`Total attempts: ${attempts.length}`);

            if (attempts.length > 0) {
                const passedAttempts = attempts.filter(a => a.passed).length;
                const passRate = (passedAttempts / attempts.length) * 100;
                const averageScore = attempts.reduce((sum, a) => sum + a.percentage, 0) / attempts.length;

                console.log(`Passed attempts: ${passedAttempts}`);
                console.log(`Pass rate: ${passRate.toFixed(1)}%`);
                console.log(`Average score: ${averageScore.toFixed(1)}%`);
                
                console.log('\nStudent attempts:');
                attempts.forEach(attempt => {
                    console.log(`  - ${attempt.student?.name || 'Unknown'} (${attempt.student?.regNo || 'No RegNo'}): ${attempt.score}/${attempt.maxScore} (${attempt.percentage}%) - ${attempt.passed ? 'PASSED' : 'FAILED'}`);
                    console.log(`    Date: ${attempt.completedAt || attempt.startedAt}`);
                });
            } else {
                console.log('❌ No student attempts found');
            }
        }

        // Test the exact API structure that the frontend expects
        console.log('\n=== API RESPONSE SIMULATION ===');
        const apiResponse = [];
        
        for (const pool of quizPools) {
            const attempts = await QuizAttempt.find({ quizPool: pool._id })
                .populate('student', 'name regNo');
            
            apiResponse.push({
                poolId: pool._id,
                title: pool.title,
                totalAttempts: attempts.length,
                passedAttempts: attempts.filter(a => a.passed).length,
                passRate: attempts.length > 0 ? (attempts.filter(a => a.passed).length / attempts.length) * 100 : 0,
                averageScore: attempts.length > 0 ? attempts.reduce((sum, a) => sum + a.percentage, 0) / attempts.length : 0,
                attempts: attempts.map(attempt => ({
                    student: {
                        name: attempt.student?.name || 'Unknown',
                        regNo: attempt.student?.regNo || 'No RegNo'
                    },
                    score: attempt.score,
                    maxScore: attempt.maxScore,
                    percentage: attempt.percentage,
                    passed: attempt.passed,
                    completedAt: attempt.completedAt || attempt.startedAt
                }))
            });
        }

        console.log('API Response for Admin Dashboard:');
        console.log(JSON.stringify(apiResponse, null, 2));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

testC000008AdminDashboard();