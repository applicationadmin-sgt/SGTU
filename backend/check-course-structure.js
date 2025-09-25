const mongoose = require('mongoose');
require('dotenv').config();

const Course = require('./models/Course');
const QuizPool = require('./models/QuizPool');

async function checkCourseStructure() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Get all courses and show their full structure
        const allCourses = await Course.find({});
        console.log('\n=== ALL COURSES WITH FULL STRUCTURE ===');
        console.log('Total courses:', allCourses.length);

        for (let i = 0; i < allCourses.length; i++) {
            const course = allCourses[i];
            console.log(`\n--- Course ${i + 1} ---`);
            console.log('Full course object:', JSON.stringify(course, null, 2));
        }

        // Check if there are any quiz pools at all
        const allQuizPools = await QuizPool.find({});
        console.log('\n=== ALL QUIZ POOLS ===');
        console.log('Total quiz pools:', allQuizPools.length);

        for (let i = 0; i < allQuizPools.length; i++) {
            const pool = allQuizPools[i];
            console.log(`\n--- Quiz Pool ${i + 1} ---`);
            console.log('Pool Name:', pool.poolName);
            console.log('Course ID:', pool.courseId);
            console.log('Unit Number:', pool.unitNumber);
            console.log('Questions:', pool.questions ? pool.questions.length : 0);
            console.log('Created:', pool.createdAt);
        }

        // Check Course schema to understand the field names
        console.log('\n=== COURSE SCHEMA PATHS ===');
        const coursePaths = Object.keys(Course.schema.paths);
        console.log('Available fields in Course model:', coursePaths);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

checkCourseStructure();