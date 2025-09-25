const mongoose = require('mongoose');
require('dotenv').config();

const Course = require('./models/Course');
const Unit = require('./models/Unit');
const Video = require('./models/Video');
const User = require('./models/User');
const StudentProgress = require('./models/StudentProgress');

async function simulateStudentAPICall() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Find the student
        const student = await User.findOne({ email: 'munmun2912@gmail.com' });
        console.log('\n=== SIMULATING STUDENT API CALLS ===');
        console.log('Student:', student.name, '(' + student._id + ')');

        // Simulate GET /api/courses/:courseId (what the frontend calls)
        const courseId = '68c8e5486a8d60601e77f327'; // C000008 course ID
        
        console.log('\n=== API: GET /api/courses/' + courseId + ' ===');
        const course = await Course.findById(courseId)
            .populate({
                path: 'units',
                populate: {
                    path: 'videos',
                    select: 'title duration thumbnail'
                },
                options: { sort: { order: 1 } }
            });

        if (!course) {
            console.log('❌ Course not found');
            return;
        }

        console.log('Course returned:', course.title);
        console.log('Units returned:', course.units.length);

        // Get student progress
        const progress = await StudentProgress.findOne({
            student: student._id,
            course: courseId
        });

        console.log('\n=== STUDENT PROGRESS API RESPONSE ===');
        if (!progress) {
            console.log('❌ No progress found');
            return;
        }

        console.log('Overall progress:', progress.overallProgress + '%');
        console.log('Current unit:', progress.currentUnit);
        console.log('Units in progress:', progress.units.length);

        // Simulate what the frontend sees for each unit
        console.log('\n=== FRONTEND UNIT VIEW SIMULATION ===');
        for (const unit of course.units) {
            const unitProgress = progress.units.find(u => u.unitId && u.unitId.toString() === unit._id.toString());
            
            console.log(`\n--- Unit ${unit.order + 1}: ${unit.title} ---`);
            console.log(`Unit has ${unit.videos.length} videos`);
            
            if (unitProgress) {
                console.log(`Status: ${unitProgress.status}`);
                console.log(`Unlocked: ${unitProgress.unlocked}`);
                console.log(`Videos watched: ${unitProgress.videosWatched.length}`);
                
                // Check if videos should be visible
                if (unitProgress.unlocked && unit.videos.length > 0) {
                    console.log('✅ Videos should be visible to student');
                    for (const video of unit.videos) {
                        const isWatched = unitProgress.videosWatched.includes(video._id.toString());
                        console.log(`  - ${video.title} (${isWatched ? 'WATCHED' : 'NOT WATCHED'})`);
                    }
                } else if (!unitProgress.unlocked) {
                    console.log('🔒 Unit is locked - videos hidden');
                } else if (unit.videos.length === 0) {
                    console.log('📹 No videos in this unit');
                }
            } else {
                console.log('❌ No progress record - unit should be locked');
            }
        }

        // Check the exact API response structure that would be sent to frontend
        console.log('\n=== EXACT API RESPONSE STRUCTURE ===');
        const apiResponse = {
            course: {
                _id: course._id,
                title: course.title,
                courseCode: course.courseCode || 'C000008',
                units: course.units.map(unit => {
                    const unitProgress = progress.units.find(u => u.unitId && u.unitId.toString() === unit._id.toString());
                    return {
                        _id: unit._id,
                        title: unit.title,
                        order: unit.order,
                        videos: unitProgress && unitProgress.unlocked ? unit.videos : [],
                        progress: unitProgress || { status: 'locked', unlocked: false, videosWatched: [] }
                    };
                })
            },
            progress: {
                overallProgress: progress.overallProgress,
                currentUnit: progress.currentUnit,
                units: progress.units
            }
        };

        console.log('Units with videos visible:');
        apiResponse.course.units.forEach((unit, index) => {
            console.log(`Unit ${index + 1}: ${unit.videos.length} videos visible (unlocked: ${unit.progress.unlocked})`);
        });

        // Check if there's a mismatch in the currently displayed unit
        console.log('\n=== UNIT DISPLAY ANALYSIS ===');
        const firstUnit = course.units[0];
        const firstUnitProgress = progress.units.find(u => u.unitId && u.unitId.toString() === firstUnit._id.toString());
        
        console.log('First unit info:');
        console.log('- Title:', firstUnit.title);
        console.log('- Status in DB:', firstUnitProgress?.status);
        console.log('- Unlocked in DB:', firstUnitProgress?.unlocked);
        console.log('- Videos in unit:', firstUnit.videos.length);
        console.log('- Videos watched:', firstUnitProgress?.videosWatched.length);

        if (firstUnitProgress?.status === 'completed') {
            console.log('⚠️ POTENTIAL ISSUE: Unit 1 is completed but student sees "in-progress" in UI');
            console.log('This suggests either:');
            console.log('1. Frontend caching issue');
            console.log('2. API response not matching DB state');
            console.log('3. Progress calculation bug');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

simulateStudentAPICall();