require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function updateExistingWatchHistory() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all users with watch history
    const users = await User.find({ 'watchHistory.0': { $exists: true } });
    
    console.log(`Found ${users.length} users with watch history`);
    
    let totalUpdated = 0;
    
    for (const user of users) {
      let userUpdated = false;
      
      // Update watch history records that don't have playbackRate
      for (const watchRecord of user.watchHistory) {
        if (watchRecord.playbackRate === undefined || watchRecord.playbackRate === null) {
          watchRecord.playbackRate = 1; // Default to 1x speed
          userUpdated = true;
        }
      }
      
      if (userUpdated) {
        await user.save();
        totalUpdated++;
        console.log(`Updated watch history for user: ${user.name || user.email}`);
      }
    }
    
    console.log(`\n✅ Updated ${totalUpdated} users with default playback rates`);
    
    // For the specific user who watched at 2x speed, let's check their recent watch history
    // and update it based on the video they watched
    const specificUser = await User.findById('68ca4f512ff2c9bed48af37a');
    if (specificUser) {
      console.log('\n🔍 Checking specific user watch history...');
      
      // Find the "unit 2" video watch record
      const unit2WatchRecord = specificUser.watchHistory.find(
        record => record.video && record.video.toString() === '68c8eb5b6a8d60601e77f9d1'
      );
      
      if (unit2WatchRecord) {
        // Based on the logs, this video was watched at 2x speed
        unit2WatchRecord.playbackRate = 2;
        await specificUser.save();
        console.log('✅ Updated "unit 2" video to 2x playback rate');
      }
      
      // Display current watch history for verification
      console.log('\n📊 Current watch history for user:');
      specificUser.watchHistory.forEach(record => {
        console.log(`  Video: ${record.video}, Time: ${record.timeSpent}s, Rate: ${record.playbackRate}x`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

updateExistingWatchHistory();