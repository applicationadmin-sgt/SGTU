require('dotenv').config();
const mongoose = require('mongoose');
const Video = require('./models/Video');
const User = require('./models/User');

async function checkUnit2Video() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find the Unit 2 video that's causing issues
    const video = await Video.findById('68c8eb5b6a8d60601e77f9d1');
    console.log('Video details:', {
      id: video._id,
      title: video.title,
      duration: video.duration,
      videoUrl: video.videoUrl
    });

    // Find the user's watch history for this video
    const user = await User.findById('68ca4f512ff2c9bed48af37a');
    const watchRecord = user.watchHistory.find(
      record => record.video && record.video.toString() === '68c8eb5b6a8d60601e77f9d1'
    );
    
    console.log('Watch record:', {
      timeSpent: watchRecord ? watchRecord.timeSpent : 'None',
      lastWatched: watchRecord ? watchRecord.lastWatched : 'None'
    });

    // This video should have duration of ~45 seconds but shows 600s in database
    console.log('\n🔧 Fixing video duration from 600s to 45s...');
    
    await Video.findByIdAndUpdate('68c8eb5b6a8d60601e77f9d1', {
      duration: 45
    });
    
    console.log('✅ Updated video duration to 45 seconds');

    // Also fix the user's watch history if it shows 600s
    if (watchRecord && watchRecord.timeSpent > 100) {
      console.log('\n🔧 Fixing watch history from', watchRecord.timeSpent, 'to 45s...');
      
      await User.updateOne(
        { 
          _id: '68ca4f512ff2c9bed48af37a',
          'watchHistory.video': '68c8eb5b6a8d60601e77f9d1'
        },
        { 
          $set: { 
            'watchHistory.$.timeSpent': 45,
            'watchHistory.$.lastWatched': new Date()
          } 
        }
      );
      
      console.log('✅ Updated watch history to 45 seconds');
    }

    // Verify the fixes
    const updatedVideo = await Video.findById('68c8eb5b6a8d60601e77f9d1');
    const updatedUser = await User.findById('68ca4f512ff2c9bed48af37a');
    const updatedWatchRecord = updatedUser.watchHistory.find(
      record => record.video && record.video.toString() === '68c8eb5b6a8d60601e77f9d1'
    );

    console.log('\n✅ Verification:');
    console.log('Video duration:', updatedVideo.duration, 'seconds');
    console.log('Watch time:', updatedWatchRecord ? updatedWatchRecord.timeSpent : 'None', 'seconds');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkUnit2Video();