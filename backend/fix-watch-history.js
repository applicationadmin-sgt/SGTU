const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');
const Video = require('./models/Video');

async function fixWatchHistory() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Find the video
    const video = await Video.findOne({ 
      title: { $regex: /unit.*1.*nurology/i } 
    });
    
    if (!video) {
      console.log('Video not found!');
      process.exit(1);
    }
    
    console.log(`Video: ${video.title} (${video._id})`);
    console.log(`Correct duration: ${video.duration} seconds`);
    
    // Find users with watch history for this video where timeSpent > video duration
    const users = await User.find({
      'watchHistory.video': video._id,
      'watchHistory.timeSpent': { $gt: video.duration }
    });
    
    console.log(`\nFound ${users.length} users with potentially incorrect watch times for this video`);
    
    let updatedUsers = 0;
    
    for (const user of users) {
      const watchRecord = user.watchHistory.find(
        record => record.video && record.video.toString() === video._id.toString()
      );
      
      if (watchRecord && watchRecord.timeSpent > video.duration) {
        console.log(`\nUser ${user.name || user.email}:`);
        console.log(`  Old timeSpent: ${watchRecord.timeSpent}s (${(watchRecord.timeSpent/60).toFixed(2)} minutes)`);
        
        // Cap the time spent at the actual video duration
        watchRecord.timeSpent = Math.min(watchRecord.timeSpent, video.duration);
        
        console.log(`  New timeSpent: ${watchRecord.timeSpent}s (${(watchRecord.timeSpent/60).toFixed(2)} minutes)`);
        
        await user.save();
        updatedUsers++;
      }
    }
    
    console.log(`\n✅ Updated ${updatedUsers} users' watch history records`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixWatchHistory();