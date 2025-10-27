const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

const User = require('./models/User');
const Video = require('./models/Video');
const Course = require('./models/Course');

async function checkWatchHistory() {
  try {
    // Get a sample student
    const students = await User.find({ role: 'student' }).limit(5);
    
    console.log(`\n📊 Found ${students.length} students`);
    
    for (const student of students) {
      console.log(`\n👤 Student: ${student.name} (${student.email})`);
      console.log(`   RegNo: ${student.regNo || 'N/A'}`);
      console.log(`   UID: ${student.uid || 'N/A'}`);
      console.log(`   Watch History Length: ${student.watchHistory?.length || 0}`);
      
      if (student.watchHistory && student.watchHistory.length > 0) {
        console.log(`\n   📺 Watch History Details:`);
        for (let i = 0; i < Math.min(3, student.watchHistory.length); i++) {
          const watch = student.watchHistory[i];
          const video = await Video.findById(watch.video);
          
          console.log(`   ${i + 1}. Video ID: ${watch.video}`);
          console.log(`      Time Spent: ${watch.timeSpent || 0} seconds`);
          console.log(`      Last Watched: ${watch.lastWatched}`);
          console.log(`      Video Title: ${video?.title || 'Not found'}`);
          console.log(`      Video Course: ${video?.course || 'N/A'}`);
        }
      } else {
        console.log(`   ⚠️ No watch history found`);
      }
    }
    
    // Check total videos in system
    const totalVideos = await Video.countDocuments();
    console.log(`\n\n📹 Total Videos in System: ${totalVideos}`);
    
    // Check courses
    const courses = await Course.find().limit(3);
    console.log(`\n📚 Sample Courses:`);
    for (const course of courses) {
      const videos = await Video.find({ course: course._id });
      console.log(`   - ${course.title}: ${videos.length} videos`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkWatchHistory();
