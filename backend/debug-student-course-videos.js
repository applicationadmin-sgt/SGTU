const mongoose = require('mongoose');
require('dotenv').config();

const Course = require('./models/Course');
const Unit = require('./models/Unit');
const Video = require('./models/Video');
const User = require('./models/User');
const StudentProgress = require('./models/StudentProgress');
const Section = require('./models/Section');

async function debugStudentCourseVideos() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Student and course from the scenario
        const studentEmail = 'munmun2912@gmail.com';
        const courseCode = 'C000008';

        // Find the student
        const student = await User.findOne({ email: studentEmail });
        if (!student) {
            console.log('❌ Student not found');
            return;
        }
        console.log('✅ Student found:', student.name, student._id);

        // Find the course
        const course = await Course.findOne({ courseCode: courseCode }).populate('units');
        if (!course) {
            console.log('❌ Course not found');
            return;
        }
        console.log('✅ Course found:', course.title, course._id);

        // Check if student has access via sections
        const section = await Section.findOne({ 
            students: student._id, 
            courses: course._id 
        });
        const hasAccess = !!section;
        console.log('✅ Section-based access:', hasAccess);
        
        if (section) {
            console.log('   Section:', section.name);
        } else {
            console.log('❌ No section found - checking other access methods...');
            
            // Check if student is directly assigned to course
            const directAccess = student.coursesAssigned && student.coursesAssigned.includes(course._id);
            console.log('   Direct course assignment:', directAccess);
            
            if (!directAccess) {
                console.log('❌ Student has no access to this course!');
                return;
            }
        }

        // Get student progress
        const progress = await StudentProgress.findOne({ 
            student: student._id, 
            course: course._id 
        });
        
        console.log('\n=== STUDENT PROGRESS ===');
        console.log('Progress exists:', !!progress);
        
        if (!progress) {
            console.log('❌ No progress record - videos will not be visible');
            return;
        }

        console.log('Unlocked videos:', progress.unlockedVideos?.length || 0);
        console.log('Unlocked video IDs:', progress.unlockedVideos?.map(id => id.toString()) || []);

        // Get units with videos
        const units = await Unit.find({ course: course._id })
            .sort('order')
            .populate({
                path: 'videos',
                select: 'title description videoUrl teacher duration sequence unit',
                options: { sort: { sequence: 1 } }
            });

        console.log('\n=== UNITS AND VIDEOS ===');
        for (const unit of units) {
            console.log(`\n--- Unit: ${unit.title} (${unit._id}) ---`);
            console.log(`Videos in unit: ${unit.videos?.length || 0}`);
            
            const unitProgress = progress.units?.find(u => u.unitId?.toString() === unit._id.toString());
            console.log('Unit progress:', unitProgress ? {
                status: unitProgress.status,
                unlocked: unitProgress.unlocked,
                videosWatched: unitProgress.videosWatched?.length || 0
            } : 'Not found');

            if (unit.videos && unit.videos.length > 0) {
                for (const video of unit.videos) {
                    const isUnlocked = progress.unlockedVideos?.some(id => id.toString() === video._id.toString());
                    console.log(`  📹 Video: ${video.title} (${video._id})`);
                    console.log(`      Unlocked: ${isUnlocked}`);
                    console.log(`      Sequence: ${video.sequence || 'not set'}`);
                }
            }
        }

        // Now simulate the exact logic from studentController.getCourseVideos
        console.log('\n=== SIMULATING BACKEND LOGIC ===');
        const unlockedVideoIds = progress.unlockedVideos?.map(id => id.toString()) || [];
        console.log('Unlocked video IDs array:', unlockedVideoIds);

        const unitsWithProgress = units.map(unit => {
            const unitProgress = progress.units?.find(u => u.unitId?.toString() === unit._id.toString());
            const isUnitUnlocked = unitProgress ? unitProgress.unlocked : (unit.order === 0);
            
            console.log(`\nProcessing unit: ${unit.title}`);
            console.log(`  Unit unlocked: ${isUnitUnlocked}`);
            console.log(`  Unit videos before filter: ${unit.videos?.length || 0}`);
            
            // This is the critical filtering logic from the backend
            const videosWithWatchInfo = unit.videos
                ?.filter(video => {
                    const isVideoUnlocked = unlockedVideoIds.includes(video._id.toString());
                    console.log(`    Video ${video.title}: unlocked = ${isVideoUnlocked}`);
                    return isVideoUnlocked;
                })
                ?.map(video => {
                    // Get watch history simulation
                    const watchRecord = student.watchHistory?.find(
                        record => record.video && record.video.toString() === video._id.toString()
                    );
                    const timeSpent = watchRecord ? watchRecord.timeSpent : 0;
                    const watched = (video.duration && video.duration > 0 && timeSpent >= video.duration * 0.9) ||
                            ((!video.duration || video.duration < 1) && timeSpent >= 5);
                    
                    return {
                        _id: video._id,
                        title: video.title,
                        description: video.description,
                        videoUrl: video.videoUrl,
                        duration: video.duration || 0,
                        timeSpent,
                        watched
                    };
                }) || [];

            console.log(`  Videos after filter: ${videosWithWatchInfo.length}`);
            
            return {
                _id: unit._id,
                title: unit.title,
                description: unit.description,
                order: unit.order,
                unlocked: isUnitUnlocked,
                videos: videosWithWatchInfo
            };
        });

        console.log('\n=== FINAL RESULT ===');
        unitsWithProgress.forEach((unit, index) => {
            console.log(`Unit ${index + 1}: ${unit.title}`);
            console.log(`  Unlocked: ${unit.unlocked}`);
            console.log(`  Videos visible: ${unit.videos.length}`);
            unit.videos.forEach((video, vIndex) => {
                console.log(`    ${vIndex + 1}. ${video.title}`);
            });
        });

        // Check for issues
        console.log('\n=== POTENTIAL ISSUES ===');
        if (progress.unlockedVideos.length === 0) {
            console.log('❌ ISSUE: No videos are unlocked in progress');
        }
        
        const firstUnit = units[0];
        if (firstUnit && firstUnit.videos && firstUnit.videos.length > 0) {
            const firstVideo = firstUnit.videos[0];
            const isFirstVideoUnlocked = progress.unlockedVideos?.some(id => id.toString() === firstVideo._id.toString());
            if (!isFirstVideoUnlocked) {
                console.log('❌ ISSUE: First video is not unlocked');
                console.log('   First video ID:', firstVideo._id.toString());
                console.log('   Unlocked video IDs:', progress.unlockedVideos?.map(id => id.toString()));
            }
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        mongoose.disconnect();
    }
}

debugStudentCourseVideos();