const mongoose = require('mongoose');
require('dotenv').config();

const Course = require('./models/Course');
const Unit = require('./models/Unit');
const Video = require('./models/Video');
const User = require('./models/User');
const StudentProgress = require('./models/StudentProgress');

async function investigateStudentVideoAccess() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Find the student
        const student = await User.findOne({ email: 'munmun2912@gmail.com' });
        console.log('\n=== STUDENT INFORMATION ===');
        if (!student) {
            console.log('❌ Student not found with email: munmun2912@gmail.com');
            return;
        }
        
        console.log('Student found:', student.name);
        console.log('Student ID:', student._id);
        console.log('Student Role:', student.role);
        console.log('Student RegNo:', student.regNo);

        // Find course C000008
        const course = await Course.findOne({ courseCode: 'C000008' }).populate('videos').populate('units');
        console.log('\n=== COURSE C000008 INFORMATION ===');
        console.log('Course found:', !!course);
        console.log('Course Title:', course?.title);
        console.log('Course Videos:', course?.videos?.length || 0);
        console.log('Course Units:', course?.units?.length || 0);
        console.log('Has Units:', course?.hasUnits);

        // Check if student is enrolled in the course
        console.log('\n=== ENROLLMENT CHECK ===');
        const isStudentInCourse = course.students?.includes(student._id);
        console.log('Student in course.students array:', isStudentInCourse);
        
        const studentCoursesAssigned = student.coursesAssigned || [];
        const isStudentAssigned = studentCoursesAssigned.some(courseId => courseId.toString() === course._id.toString());
        console.log('Course in student.coursesAssigned:', isStudentAssigned);

        // Check student progress
        const studentProgress = await StudentProgress.findOne({
            student: student._id,
            course: course._id
        });
        console.log('\n=== STUDENT PROGRESS ===');
        console.log('Student progress record exists:', !!studentProgress);
        if (studentProgress) {
            console.log('Progress units:', studentProgress.units?.length || 0);
            console.log('Current unit:', studentProgress.currentUnit);
            console.log('Overall progress:', studentProgress.overallProgress);
        }

        // Get detailed unit information
        console.log('\n=== UNIT DETAILS ===');
        const units = await Unit.find({ course: course._id }).populate('videos').sort({ order: 1 });
        
        for (const unit of units) {
            console.log(`\n--- Unit ${unit.order + 1}: ${unit.title} ---`);
            console.log(`Unit ID: ${unit._id}`);
            console.log(`Videos in unit: ${unit.videos?.length || 0}`);
            
            if (unit.videos && unit.videos.length > 0) {
                for (const video of unit.videos) {
                    console.log(`  Video: ${video.title || 'Untitled'} (${video._id})`);
                }
            }

            // Check student's progress for this unit
            if (studentProgress) {
                const unitProgress = studentProgress.units.find(u => u.unitId?.toString() === unit._id.toString());
                if (unitProgress) {
                    console.log(`Student progress for this unit:`);
                    console.log(`  Status: ${unitProgress.status}`);
                    console.log(`  Unlocked: ${unitProgress.unlocked}`);
                    console.log(`  Videos watched: ${unitProgress.videosWatched?.length || 0}`);
                } else {
                    console.log(`❌ No progress record found for this unit`);
                }
            }
        }

        // Check course-level videos (if any)
        if (course.videos && course.videos.length > 0) {
            console.log('\n=== COURSE-LEVEL VIDEOS ===');
            for (const video of course.videos) {
                console.log(`Video: ${video.title || 'Untitled'} (${video._id})`);
            }
        }

        // Check if there are any access restrictions
        console.log('\n=== ACCESS ANALYSIS ===');
        if (!isStudentInCourse && !isStudentAssigned) {
            console.log('❌ ISSUE: Student is not properly enrolled in the course');
        } else if (!studentProgress) {
            console.log('❌ ISSUE: Student has no progress record for this course');
        } else if (units.length === 0) {
            console.log('❌ ISSUE: Course has no units');
        } else if (units.every(unit => !unit.videos || unit.videos.length === 0)) {
            console.log('❌ ISSUE: Units have no videos');
        } else {
            console.log('✅ Basic setup looks correct - checking unit unlock status...');
            
            const firstUnit = units[0];
            const firstUnitProgress = studentProgress.units.find(u => u.unitId?.toString() === firstUnit._id.toString());
            
            if (!firstUnitProgress) {
                console.log('❌ ISSUE: First unit is not in student progress');
            } else if (!firstUnitProgress.unlocked) {
                console.log('❌ ISSUE: First unit is not unlocked for student');
            } else {
                console.log('🔍 Need to check frontend logic for video display');
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

investigateStudentVideoAccess();