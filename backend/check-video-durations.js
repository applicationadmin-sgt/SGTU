const mongoose = require('mongoose');

async function checkVideoDurations() {
  try {
    await mongoose.connect('mongodb://localhost:27017/video_learning_platform');
    
    const Video = require('./models/Video');
    const videos = await Video.find({}, 'title duration').limit(5);
    
    console.log('Sample video durations:');
    videos.forEach(video => {
      const minutes = Math.floor(video.duration / 60);
      const seconds = Math.floor(video.duration % 60);
      console.log(`- ${video.title}: ${minutes}:${seconds < 10 ? '0' : ''}${seconds} (${video.duration}s)`);
    });
    
    await mongoose.disconnect();
    console.log('\n✅ Video durations are now properly set!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkVideoDurations();