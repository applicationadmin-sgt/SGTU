const mongoose = require('mongoose');
require('dotenv').config();
const Video = require('./models/Video');
const path = require('path');
const fs = require('fs');

async function fixVideoDuration() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Find the specific video
    const video = await Video.findOne({ 
      title: { $regex: /unit.*1.*nurology/i } 
    });
    
    if (!video) {
      console.log('Video not found!');
      process.exit(1);
    }
    
    console.log(`Found video: ${video.title}`);
    console.log(`Current duration in DB: ${video.duration} seconds`);
    console.log(`Video file path: ${video.videoUrl}`);
    
    // Check if the video file exists
    const videoPath = path.join(__dirname, '..', video.videoUrl);
    console.log(`Full video path: ${videoPath}`);
    
    if (fs.existsSync(videoPath)) {
      console.log('✅ Video file exists on disk');
      
      // For now, let's update the database with the correct duration (45 seconds)
      // based on what the user observed
      const correctDuration = 45; // seconds
      
      console.log(`\nUpdating database duration from ${video.duration}s to ${correctDuration}s...`);
      
      video.duration = correctDuration;
      await video.save();
      
      console.log('✅ Successfully updated video duration in database');
      console.log(`New duration: ${correctDuration} seconds (${(correctDuration/60).toFixed(2)} minutes)`);
      
    } else {
      console.log('❌ Video file not found on disk');
      console.log('This might be why the duration is incorrect');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixVideoDuration();