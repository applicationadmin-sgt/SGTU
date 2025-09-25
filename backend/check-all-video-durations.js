require('dotenv').config();
const mongoose = require('mongoose');
const Video = require('./models/Video');

async function checkAllVideoDurations() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all videos with potentially incorrect durations
    const videos = await Video.find({});
    
    console.log('\n📊 All video durations:');
    videos.forEach(video => {
      const durationInMinutes = (video.duration / 60).toFixed(2);
      console.log(`${video.title}: ${video.duration}s (${durationInMinutes}m)`);
    });

    // Look for videos with suspiciously long durations (over 5 minutes)
    const suspiciousVideos = videos.filter(video => video.duration > 300);
    
    if (suspiciousVideos.length > 0) {
      console.log('\n⚠️ Videos with potentially incorrect durations (>5 minutes):');
      suspiciousVideos.forEach(video => {
        const durationInMinutes = (video.duration / 60).toFixed(2);
        console.log(`  - ${video.title}: ${video.duration}s (${durationInMinutes}m) - ID: ${video._id}`);
      });
    } else {
      console.log('\n✅ All video durations look reasonable');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkAllVideoDurations();