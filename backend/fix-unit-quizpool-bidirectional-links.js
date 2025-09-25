const mongoose = require('mongoose');
require('dotenv').config();

const Unit = require('./models/Unit');
const QuizPool = require('./models/QuizPool');
const Course = require('./models/Course');

async function fixUnitQuizPoolBidirectionalLinks() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Find all quiz pools that reference units
        const allQuizPools = await QuizPool.find({ unit: { $exists: true } }).populate('unit');
        console.log('\n=== QUIZ POOLS WITH UNIT REFERENCES ===');
        console.log('Total quiz pools with units:', allQuizPools.length);

        const fixes = [];

        for (const pool of allQuizPools) {
            if (pool.unit) {
                console.log(`\nPool: ${pool.title}`);
                console.log(`  References Unit: ${pool.unit.title} (${pool.unit._id})`);
                
                // Check if the unit references this pool back
                if (!pool.unit.quizPool || pool.unit.quizPool.toString() !== pool._id.toString()) {
                    console.log(`  ❌ Unit does NOT reference this pool back`);
                    console.log(`  Current unit.quizPool: ${pool.unit.quizPool || 'null'}`);
                    console.log(`  Should be: ${pool._id}`);
                    
                    fixes.push({
                        unitId: pool.unit._id,
                        unitTitle: pool.unit.title,
                        poolId: pool._id,
                        poolTitle: pool.title
                    });
                } else {
                    console.log(`  ✅ Unit correctly references this pool`);
                }
            }
        }

        console.log('\n=== FIXES NEEDED ===');
        console.log(`Total units to fix: ${fixes.length}`);

        if (fixes.length === 0) {
            console.log('✅ All units are properly linked to their quiz pools!');
            return;
        }

        // Apply the fixes
        console.log('\n=== APPLYING FIXES ===');
        let fixedCount = 0;

        for (const fix of fixes) {
            console.log(`Fixing: ${fix.unitTitle} → ${fix.poolTitle}`);
            
            await Unit.updateOne(
                { _id: fix.unitId },
                { $set: { quizPool: fix.poolId } }
            );
            
            fixedCount++;
            console.log(`✅ Fixed unit ${fix.unitTitle}`);
        }

        console.log(`\n🎉 Successfully fixed ${fixedCount} unit-quiz pool links!`);

        // Verify the fixes
        console.log('\n=== VERIFICATION ===');
        for (const fix of fixes) {
            const unit = await Unit.findById(fix.unitId).populate('quizPool');
            if (unit.quizPool && unit.quizPool._id.toString() === fix.poolId.toString()) {
                console.log(`✅ ${unit.title} now correctly links to ${unit.quizPool.title}`);
            } else {
                console.log(`❌ ${unit.title} fix failed`);
            }
        }

        // Check specifically for Course C000008
        console.log('\n=== C000008 VERIFICATION ===');
        const course = await Course.findOne({ courseCode: 'C000008' });
        const c000008Units = await Unit.find({ course: course._id }).populate('quizPool');
        
        for (const unit of c000008Units) {
            console.log(`Unit: ${unit.title}`);
            console.log(`  Quiz Pool: ${unit.quizPool ? unit.quizPool.title : 'NOT LINKED'}`);
            console.log(`  Quiz Pool ID: ${unit.quizPool ? unit.quizPool._id : 'null'}`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

fixUnitQuizPoolBidirectionalLinks();