const mongoose = require('mongoose');
const Unit = require('./models/Unit');
const StudentProgress = require('./models/StudentProgress');
const User = require('./models/User');

async function diagnoseIssue() {
    try {
        await mongoose.connect('mongodb+srv://Cluster37906:ZOtRFZe8MctGOp7L@cluster0.flx5j.mongodb.net/campus_link_db?retryWrites=true&w=majority');
        console.log('🔍 DIAGNOSING THE PERMANENT ISSUE\n');
        
        // Get student
        const student = await User.findOne({ email: 'munmun2912@gmail.com' });
        console.log(`👤 Student ID: ${student._id}`);
        
        // Get student progress
        const progress = await StudentProgress.findOne({
            student: student._id,
            course: '68c8e5486a8d60601e77f327'
        });
        
        console.log('\n📊 STUDENT PROGRESS ANALYSIS:');
        console.log('Progress found:', !!progress);
        
        if (progress) {
            console.log('Unlocked Videos:', progress.unlockedVideos.length);
            console.log('Unlocked Video IDs:', progress.unlockedVideos.map(id => id.toString()));
            
            console.log('\nUnit Progress:');
            progress.units.forEach((unit, index) => {
                console.log(`  Unit ${index + 1}: ${unit.unitId}`);
                console.log(`    Status: ${unit.status}`);
                console.log(`    Unlocked: ${unit.unlocked}`);
                console.log(`    Videos Watched: ${unit.videosWatched.length}`);
            });
        }
        
        // Get units for the course
        const units = await Unit.find({ course: '68c8e5486a8d60601e77f327' })
            .sort('order')
            .populate('videos');
        
        console.log('\n🎬 UNITS AND VIDEOS IN DATABASE:');
        units.forEach((unit, index) => {
            console.log(`\nUnit ${index + 1}: ${unit.title || unit.unitName} (ID: ${unit._id})`);
            console.log(`  Order: ${unit.order}`);
            console.log(`  Videos count: ${unit.videos ? unit.videos.length : 0}`);
            
            if (unit.videos && unit.videos.length > 0) {
                unit.videos.forEach((video, vIndex) => {
                    console.log(`    Video ${vIndex + 1}: ${video.title} (ID: ${video._id})`);
                });
            } else {
                console.log(`    ❌ NO VIDEOS FOUND`);
            }
        });
        
        console.log('\n🔍 ROOT CAUSE ANALYSIS:');
        console.log('The API filters videos by unlockedVideos array.');
        console.log('If unlockedVideos is empty or missing video IDs, no videos will show.');
        console.log('This is the PERMANENT ISSUE that needs fixing!');
        
    } catch (error) {
        console.error('❌ Diagnosis failed:', error.message);
    } finally {
        await mongoose.disconnect();
    }
}

diagnoseIssue();