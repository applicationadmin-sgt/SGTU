const mongoose = require('mongoose');
require('dotenv').config();

const StudentProgress = require('./models/StudentProgress');
const User = require('./models/User');
const Unit = require('./models/Unit');
const Video = require('./models/Video');

async function debugVideoTracking() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Find the student
        const student = await User.findOne({ email: 'munmun2912@gmail.com' });
        const courseId = '68c8e5486a8d60601e77f327'; // C000008

        console.log('\n=== DETAILED VIDEO TRACKING DEBUG ===');
        
        // Get student progress
        const progress = await StudentProgress.findOne({
            student: student._id,
            course: courseId
        });

        console.log('Student progress found:', !!progress);
        
        if (progress) {
            console.log('\n=== RAW PROGRESS DATA ===');
            console.log(JSON.stringify(progress, null, 2));
        }

        // Get Unit 1 details
        const unit1 = await Unit.findOne({ 
            course: courseId,
            order: 0 
        }).populate('videos');

        console.log('\n=== UNIT 1 DETAILS ===');
        console.log('Unit 1 found:', !!unit1);
        console.log('Unit 1 ID:', unit1?._id);
        console.log('Unit 1 videos:', unit1?.videos?.length);

        if (unit1 && unit1.videos.length > 0) {
            const video = unit1.videos[0];
            console.log('Video ID:', video._id);
            console.log('Video Title:', video.title);

            // Check if this video ID is in student's watched videos
            const unit1Progress = progress.units.find(u => u.unitId?.toString() === unit1._id.toString());
            console.log('\n=== UNIT 1 PROGRESS CHECK ===');
            console.log('Unit 1 progress found:', !!unit1Progress);
            
            if (unit1Progress) {
                console.log('Videos watched array:', unit1Progress.videosWatched);
                console.log('Videos watched count:', unit1Progress.videosWatched.length);
                
                // Check if video ID matches
                const videoIdStr = video._id.toString();
                const isVideoWatched = unit1Progress.videosWatched.some(watchedId => {
                    const watchedIdStr = watchedId.toString();
                    console.log(`Comparing: ${videoIdStr} === ${watchedIdStr} = ${videoIdStr === watchedIdStr}`);
                    return watchedIdStr === videoIdStr;
                });
                
                console.log('Is video marked as watched?', isVideoWatched);
            }
        }

        // Check watch history collection if it exists
        console.log('\n=== CHECKING WATCH HISTORY ===');
        try {
            const WatchHistory = require('./models/WatchHistory');
            const watchHistory = await WatchHistory.find({
                student: student._id,
                course: courseId
            });
            console.log('Watch history records:', watchHistory.length);
            for (const record of watchHistory) {
                console.log(`- Video: ${record.video}, Progress: ${record.progress}%, Completed: ${record.completed}`);
            }
        } catch (err) {
            console.log('No WatchHistory model or data');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

debugVideoTracking();