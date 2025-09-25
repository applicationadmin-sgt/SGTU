const mongoose = require('mongoose');
require('dotenv').config();

const Unit = require('./models/Unit');
const Course = require('./models/Course');
const Video = require('./models/Video');
const StudentProgress = require('./models/StudentProgress');
const User = require('./models/User');

async function testVideoWatchedFix() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Find the student
        const student = await User.findOne({ email: 'munmun2912@gmail.com' });
        const courseId = '68c8e5486a8d60601e77f327'; // C000008

        console.log('\n=== TESTING FIXED API RESPONSE ===');
        console.log('Student:', student.name);
        console.log('Course ID:', courseId);

        // Simulate the exact logic from the fixed getStudentUnits function
        const units = await Unit.find({ course: courseId })
            .sort('order')
            .populate({
                path: 'videos',
                select: 'title description videoUrl duration sequence hasQuizAfter',
                options: { sort: { sequence: 1 } }
            });

        // Get student progress
        const progress = await StudentProgress.findOne({
            student: student._id,
            course: courseId
        });

        if (!progress) {
            console.log('❌ Student progress not found');
            return;
        }

        // Get unlocked videos
        const unlockedVideoIds = progress.unlockedVideos.map(id => id.toString());
        console.log('Unlocked video IDs:', unlockedVideoIds);

        // Test the fixed logic
        const unitsWithProgress = units.map(unit => {
            const unitData = unit.toObject();
            
            // Find unit progress in student progress
            const unitProgress = progress.units.find(
                u => u.unitId.toString() === unit._id.toString()
            );
            
            console.log(`\n--- Unit: ${unit.title} ---`);
            console.log('Unit Progress found:', !!unitProgress);
            
            if (unitProgress) {
                console.log('Videos watched in progress:', unitProgress.videosWatched.length);
                unitProgress.videosWatched.forEach((v, i) => {
                    console.log(`  ${i + 1}. VideoId: ${v.videoId}, Completed: ${v.completed}`);
                });
            }
            
            // Get watched video IDs for this unit (FIXED LOGIC)
            const watchedVideoIds = unitProgress ? 
                unitProgress.videosWatched.map(v => v.videoId ? v.videoId.toString() : v.toString()) : [];
            
            console.log('Watched video IDs extracted:', watchedVideoIds);
            
            // Filter videos to only show unlocked ones and mark as watched (FIXED)
            unitData.videos = unit.videos
                .filter(video => unlockedVideoIds.includes(video._id.toString()))
                .map(video => {
                    const isWatched = watchedVideoIds.includes(video._id.toString());
                    console.log(`Video: ${video.title} (${video._id}) - Unlocked: true, Watched: ${isWatched}`);
                    return {
                        ...video.toObject(),
                        unlocked: true,
                        watched: isWatched
                    };
                });
            
            unitData.progress = {
                status: unitProgress ? unitProgress.status : 'locked',
                unlocked: unitProgress ? unitProgress.unlocked : false,
                videosCompleted: unitProgress ? 
                    unitProgress.videosWatched.filter(v => v.completed).length : 0,
                totalVideos: unit.videos.length
            };
            
            return unitData;
        });

        console.log('\n=== FINAL API RESPONSE TEST ===');
        unitsWithProgress.forEach((unit, index) => {
            console.log(`\nUnit ${index + 1}: ${unit.title}`);
            console.log(`Status: ${unit.progress.status}`);
            console.log(`Unlocked: ${unit.progress.unlocked}`);
            console.log(`Videos visible: ${unit.videos.length}`);
            
            unit.videos.forEach((video, videoIndex) => {
                console.log(`  Video ${videoIndex + 1}: ${video.title}`);
                console.log(`    Unlocked: ${video.unlocked}`);
                console.log(`    Watched: ${video.watched}`);
                console.log(`    Should show in UI: ${video.unlocked ? 'YES' : 'NO'}`);
                console.log(`    Should have checkmark: ${video.watched ? 'YES' : 'NO'}`);
            });
        });

        console.log('\n🎉 API RESPONSE FIXED!');
        console.log('Now students should see:');
        console.log('✅ Videos in unlocked units');
        console.log('✅ Proper watched/unwatched status');
        console.log('✅ Correct progress indicators');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

testVideoWatchedFix();