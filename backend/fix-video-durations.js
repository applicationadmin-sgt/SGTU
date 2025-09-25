const mongoose = require('mongoose');
require('dotenv').config();
const Video = require('./models/Video');
const fs = require('fs');
const path = require('path');

// Function to extract duration from video file using HTML5 video element approach
// Since we don't have ffprobe, we'll set reasonable default durations based on file names or use a simple method

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  try {
    console.log('Connected to database...');
    
    // Find all videos without duration
    const videosWithoutDuration = await Video.find({
      $or: [
        { duration: { $exists: false } },
        { duration: null },
        { duration: 0 }
      ]
    });
    
    console.log(`Found ${videosWithoutDuration.length} videos without duration.`);
    
    let updated = 0;
    
    for (const video of videosWithoutDuration) {
      try {
        // For now, let's set a reasonable default duration based on video naming or other heuristics
        // In a real scenario, you would use ffprobe or similar tool
        
        let estimatedDuration = 300; // 5 minutes default
        
        // Try to estimate duration based on title or other clues
        const title = video.title.toLowerCase();
        if (title.includes('unit') || title.includes('chapter')) {
          estimatedDuration = 600; // 10 minutes for unit videos
        } else if (title.includes('basic') || title.includes('introduction')) {
          estimatedDuration = 450; // 7.5 minutes for intro videos
        } else if (title.includes('test') || title.includes('demo')) {
          estimatedDuration = 180; // 3 minutes for test videos
        }
        
        // Update the video with estimated duration
        video.duration = estimatedDuration;
        await video.save();
        
        console.log(`Updated "${video.title}" with duration: ${estimatedDuration} seconds (${Math.round(estimatedDuration/60)} minutes)`);
        updated++;
        
      } catch (error) {
        console.error(`Error updating video ${video._id}:`, error.message);
      }
    }
    
    console.log(`\\nSuccessfully updated ${updated} videos with estimated durations.`);
    console.log('Note: These are estimated durations. For accurate durations, upload new videos with the updated system.');
    
    mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    mongoose.disconnect();
    process.exit(1);
  }
});