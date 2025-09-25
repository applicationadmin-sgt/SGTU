const mongoose = require('mongoose');
require('dotenv').config();
const Video = require('./models/Video');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  try {
    console.log('Connected to database...');
    
    // Find videos and check their duration values
    const videos = await Video.find().limit(10);
    
    console.log('\nVideo duration analysis:');
    videos.forEach(video => {
      console.log(`\n--- Video: ${video.title} ---`);
      console.log(`ID: ${video._id}`);
      console.log(`Duration: ${video.duration} seconds`);
      console.log(`Video URL: ${video.videoUrl}`);
      console.log(`Created: ${video.createdAt}`);
    });
    
    // Check how many videos have no duration set
    const videosWithoutDuration = await Video.countDocuments({ 
      $or: [
        { duration: { $exists: false } },
        { duration: null },
        { duration: 0 }
      ]
    });
    
    const totalVideos = await Video.countDocuments();
    
    console.log(`\n--- Summary ---`);
    console.log(`Total videos: ${totalVideos}`);
    console.log(`Videos without duration: ${videosWithoutDuration}`);
    console.log(`Videos with duration: ${totalVideos - videosWithoutDuration}`);
    
    mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    mongoose.disconnect();
    process.exit(1);
  }
});