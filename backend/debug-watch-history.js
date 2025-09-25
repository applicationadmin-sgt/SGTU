const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function debugWatchHistory() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Find the student
    const student = await User.findOne({ email: 'dipanwitaku7ndu02@gmail.com' });
    
    if (!student) {
      console.log('❌ Student not found');
      return;
    }
    
    console.log('✅ Student found:');
    console.log('  ID:', student._id);
    console.log('  Name:', student.name);
    console.log('  Email:', student.email);
    console.log('  Watch History Length:', student.watchHistory ? student.watchHistory.length : 0);
    
    if (student.watchHistory && student.watchHistory.length > 0) {
      console.log('\n📹 Watch History Details:');
      student.watchHistory.forEach((entry, index) => {
        console.log(`${index + 1}. Video ID: ${entry.video}`);
        console.log(`   Time Spent: ${entry.timeSpent}s`);
        console.log(`   Last Watched: ${entry.lastWatched}`);
        console.log(`   Section: ${entry.section || 'N/A'}`);
        console.log('---');
      });
    } else {
      console.log('❌ No watch history found');
    }
    
    // Check if there's a specific course ID in the watch history
    const courseId = '68c8e5486a8d60601e77f327';
    console.log(`\n🔍 Checking videos for course: ${courseId}`);
    
    const Video = require('./models/Video');
    const videos = await Video.find({ course: courseId });
    
    console.log('Videos in this course:');
    videos.forEach(video => {
      console.log(`- ${video.title} (ID: ${video._id})`);
      
      // Check if this video is in watch history
      const watchEntry = student.watchHistory?.find(entry => 
        entry.video && entry.video.toString() === video._id.toString()
      );
      
      if (watchEntry) {
        console.log(`  ✅ Found in watch history: ${watchEntry.timeSpent}s watched`);
      } else {
        console.log(`  ❌ Not in watch history`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.disconnect();
  }
}

debugWatchHistory();