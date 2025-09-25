const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Video = require('./models/Video');
const Course = require('./models/Course');
const Unit = require('./models/Unit');
const StudentProgress = require('./models/StudentProgress');

async function fixStudentVideoAccess() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/student-dashboard');
    console.log('Connected to MongoDB');

    // Find the current student
    const studentId = '68ca4f502ff2c9bed48af370';
    const courseId = '68c8e5486a8d60601e77f327';

    const student = await User.findById(studentId);
    console.log('✅ Found student:', student.name, student.email);

    // Find the student's progress
    const progress = await StudentProgress.findOne({ 
      student: studentId, 
      course: courseId 
    });

    if (!progress) {
      console.log('❌ No progress record found for student');
      return;
    }

    console.log('Current unlocked videos:', progress.unlockedVideos.map(id => id.toString()));

    // Find Unit 1 and its first video
    const unit1 = await Unit.findOne({ 
      course: courseId,
      $or: [
        { title: { $regex: /unit 1/i } },
        { order: 0 }
      ]
    }).populate('videos');

    if (!unit1) {
      console.log('❌ Unit 1 not found');
      return;
    }

    console.log('✅ Found Unit 1:', unit1.title, unit1._id);
    console.log('Unit 1 videos:', unit1.videos.map(v => ({ id: v._id, title: v.title })));

    if (unit1.videos && unit1.videos.length > 0) {
      const firstVideo = unit1.videos.sort((a, b) => (a.sequence || 0) - (b.sequence || 0))[0];
      console.log('First video in Unit 1:', firstVideo.title, firstVideo._id);

      // Check if this video is already unlocked
      if (!progress.unlockedVideos.includes(firstVideo._id.toString())) {
        console.log('🔓 Unlocking first video in Unit 1...');
        
        // Add the video to unlocked list
        progress.unlockedVideos.push(firstVideo._id);
        
        // Ensure Unit 1 is marked as unlocked in progress
        const unit1Progress = progress.units.find(u => u.unitId.toString() === unit1._id.toString());
        if (unit1Progress) {
          unit1Progress.unlocked = true;
          unit1Progress.status = 'in-progress';
        } else {
          progress.units.push({
            unitId: unit1._id,
            status: 'in-progress',
            unlocked: true,
            unlockedAt: new Date(),
            videosWatched: [],
            quizAttempts: [],
            unitQuizCompleted: false,
            unitQuizPassed: false,
            allVideosWatched: false
          });
        }
        
        await progress.save();
        console.log('✅ Successfully unlocked first video in Unit 1!');
        console.log('Updated unlocked videos:', progress.unlockedVideos.map(id => id.toString()));
      } else {
        console.log('✅ First video in Unit 1 is already unlocked');
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

fixStudentVideoAccess();