const mongoose = require('mongoose');
const Video = require('./models/Video');
const Course = require('./models/Course');
require('dotenv').config();

async function checkVideoDurations() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const courseId = '68c4a82816393144de08b900';
    console.log('Checking course:', courseId);
    
    const course = await Course.findById(courseId).populate('videos');
    
    if (!course) {
      console.log('Course not found!');
      return;
    }
    
    console.log('Course found:', course.title);
    console.log('Number of videos:', course.videos.length);
    console.log('');
    
    let totalCalculatedDuration = 0;
    
    course.videos.forEach((video, index) => {
      console.log(`Video ${index + 1}:`);
      console.log(`  ID: ${video._id}`);
      console.log(`  Title: ${video.title}`);
      console.log(`  Duration: ${video.duration || 'Not set'} seconds`);
      console.log(`  File: ${video.file}`);
      console.log(`  Created: ${video.createdAt}`);
      
      if (video.duration && video.duration > 0) {
        totalCalculatedDuration += video.duration;
      }
      console.log('');
    });
    
    console.log('Total calculated duration:', totalCalculatedDuration, 'seconds');
    console.log('Total duration in minutes:', Math.floor(totalCalculatedDuration / 60), 'minutes');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkVideoDurations();