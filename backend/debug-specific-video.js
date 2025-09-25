const mongoose = require('mongoose');
require('dotenv').config();
const Video = require('./models/Video');
const Course = require('./models/Course');
const Unit = require('./models/Unit');

async function debugSpecificVideo() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Look for the "unit 1 of nurology" video specifically
    const video = await Video.findOne({ 
      title: { $regex: /unit.*1.*nurology/i } 
    }).populate('course').populate('unit');
    
    if (!video) {
      console.log('Video "unit 1 of nurology" not found!');
      
      // Let's find all videos with "nurology" in the title
      const neurologyVideos = await Video.find({ 
        title: { $regex: /nurology/i } 
      }).populate('course').populate('unit');
      
      console.log('\nFound videos with "nurology":');
      neurologyVideos.forEach((v, index) => {
        console.log(`${index + 1}. ${v.title} - Duration: ${v.duration}s`);
      });
      
      return;
    }
    
    console.log('\n=== VIDEO DETAILS ===');
    console.log(`Title: ${video.title}`);
    console.log(`ID: ${video._id}`);
    console.log(`Duration: ${video.duration} seconds`);
    console.log(`Duration in minutes: ${video.duration ? (video.duration / 60).toFixed(2) : 'N/A'} minutes`);
    console.log(`Video URL: ${video.videoUrl}`);
    console.log(`Course: ${video.course ? video.course.title : 'N/A'}`);
    console.log(`Unit: ${video.unit ? video.unit.title : 'N/A'}`);
    console.log(`Created: ${video.createdAt}`);
    console.log(`Updated: ${video.updatedAt}`);
    
    // Check if there's a file size or other metadata
    console.log('\n=== ADDITIONAL INFO ===');
    console.log(`File: ${video.file || 'N/A'}`);
    console.log(`Sequence: ${video.sequence || 'N/A'}`);
    console.log(`Description: ${video.description || 'N/A'}`);
    
    // If this video has 600 seconds (10 minutes) duration, check when it was set
    if (video.duration === 600) {
      console.log('\n⚠️  WARNING: This video has exactly 600 seconds (10 minutes) duration.');
      console.log('This might be from the fix-video-durations.js script default value.');
      console.log('The actual video file might be shorter!');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

debugSpecificVideo();