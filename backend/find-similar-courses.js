const mongoose = require('mongoose');
require('dotenv').config();

const Course = require('./models/Course');
const QuizPool = require('./models/QuizPool');
const QuizAttempt = require('./models/QuizAttempt');

async function findSimilarCourses() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Find all courses with IDs containing C000008 or similar patterns
        const allCourses = await Course.find({});
        console.log('\n=== ALL COURSES IN DATABASE ===');
        console.log('Total courses:', allCourses.length);

        // Look for courses with similar IDs
        const similarCourses = allCourses.filter(course => 
            course.courseId && (
                course.courseId.includes('C000008') ||
                course.courseId.includes('8') ||
                course.courseId.startsWith('C0000')
            )
        );

        console.log('\n=== COURSES WITH SIMILAR IDs ===');
        for (const course of similarCourses) {
            console.log(`Course ID: ${course.courseId}`);
            console.log(`Course Name: ${course.courseName}`);
            console.log(`Created: ${course.createdAt}`);
            console.log('---');
        }

        // Also check if there are any courses that might have unit-wise quizzes
        console.log('\n=== COURSES WITH QUIZ POOLS ===');
        const coursesWithPools = await QuizPool.distinct('courseId');
        console.log('Course IDs with quiz pools:', coursesWithPools);

        for (const courseId of coursesWithPools) {
            const course = await Course.findOne({ courseId });
            const pools = await QuizPool.find({ courseId });
            const attempts = await QuizAttempt.find({ 
                quizId: { $in: pools.map(p => p._id) },
                quizType: 'pool'
            });

            console.log(`\n--- ${courseId} ---`);
            console.log(`Course Name: ${course?.courseName || 'Unknown'}`);
            console.log(`Quiz Pools: ${pools.length}`);
            console.log(`Total Attempts: ${attempts.length}`);
            
            // Show pool details
            for (const pool of pools) {
                const poolAttempts = await QuizAttempt.find({ 
                    quizId: pool._id,
                    quizType: 'pool'
                });
                console.log(`  Pool: ${pool.poolName} (Unit ${pool.unitNumber || 'N/A'}) - ${poolAttempts.length} attempts`);
            }
        }

        // Show recent courses
        console.log('\n=== RECENT COURSES (Last 10) ===');
        const recentCourses = await Course.find({}).sort({ createdAt: -1 }).limit(10);
        for (const course of recentCourses) {
            console.log(`${course.courseId} - ${course.courseName} (Created: ${course.createdAt})`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

findSimilarCourses();