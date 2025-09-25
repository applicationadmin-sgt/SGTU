const mongoose = require('mongoose');
require('dotenv').config();

const Unit = require('./models/Unit');
const QuizPool = require('./models/QuizPool');
const Course = require('./models/Course');

async function checkUnitQuizPoolLinks() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Check Course C000008 units and their quiz pool links
        const course = await Course.findOne({ courseCode: 'C000008' });
        console.log('\n=== COURSE C000008 UNITS ===');
        console.log('Course ID:', course._id);
        console.log('Course Title:', course.title);

        // Get all units for this course
        const units = await Unit.find({ course: course._id }).populate('quizPool');
        console.log('\nUnits found:', units.length);

        for (const unit of units) {
            console.log(`\n--- Unit: ${unit.title} ---`);
            console.log(`Unit ID: ${unit._id}`);
            console.log(`Quiz Pool: ${unit.quizPool ? unit.quizPool.title : 'NOT LINKED'}`);
            console.log(`Quiz Pool ID: ${unit.quizPool ? unit.quizPool._id : 'null'}`);
            console.log(`Direct quizzes: ${unit.quizzes ? unit.quizzes.length : 0}`);
        }

        // Check what quiz pools exist for this course
        console.log('\n=== QUIZ POOLS FOR C000008 ===');
        const quizPools = await QuizPool.find({ course: course._id }).populate('unit');
        
        for (const pool of quizPools) {
            console.log(`\n--- Pool: ${pool.title} ---`);
            console.log(`Pool ID: ${pool._id}`);
            console.log(`Unit: ${pool.unit ? pool.unit.title : 'NOT LINKED'}`);
            console.log(`Unit ID: ${pool.unit ? pool.unit._id : 'null'}`);
        }

        // Check if there's a mismatch - units should reference quiz pools AND quiz pools should reference units
        console.log('\n=== CHECKING FOR MISMATCHES ===');
        
        const unitsWithoutPools = units.filter(unit => !unit.quizPool);
        const poolsWithoutUnits = quizPools.filter(pool => !pool.unit);
        
        console.log(`Units without quiz pools: ${unitsWithoutPools.length}`);
        unitsWithoutPools.forEach(unit => {
            console.log(`  - ${unit.title} (${unit._id})`);
        });
        
        console.log(`Quiz pools without units: ${poolsWithoutUnits.length}`);
        poolsWithoutUnits.forEach(pool => {
            console.log(`  - ${pool.title} (${pool._id})`);
        });

        // Try to find if there are orphaned quiz pools that should be linked to units
        if (unitsWithoutPools.length > 0 && poolsWithoutUnits.length > 0) {
            console.log('\n=== POTENTIAL FIXES ===');
            console.log('Attempting to match units with quiz pools...');
            
            for (const unit of unitsWithoutPools) {
                // Look for a quiz pool that references this unit
                const matchingPool = quizPools.find(pool => 
                    pool.unit && pool.unit._id.toString() === unit._id.toString()
                );
                
                if (matchingPool) {
                    console.log(`✅ Unit "${unit.title}" should link to pool "${matchingPool.title}"`);
                    console.log(`   Fix: Unit.updateOne({_id: "${unit._id}"}, {quizPool: "${matchingPool._id}"})`);
                }
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

checkUnitQuizPoolLinks();