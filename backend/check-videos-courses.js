const mongoose = require('mongoose');
const Video = require('./models/Video');
const Course = require('./models/Course');
require('dotenv').config();

async function checkVideosCourses() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const watchedVideoIds = [
      '68c4e05a3c6f751dd6a876a6',
      '68c504681226bb6f70fe7072', 
      '68c504c31226bb6f70fe7156'
    ];
    
    console.log('🔍 Checking which courses the watched videos belong to:');
    
    for (const videoId of watchedVideoIds) {
      const video = await Video.findById(videoId).populate('course', 'title courseCode');
      
      if (video) {
        console.log(`\n📹 Video: ${video.title}`);
        console.log(`   ID: ${video._id}`);
        console.log(`   Course: ${video.course?.title || 'Unknown'}`);
        console.log(`   Course Code: ${video.course?.courseCode || 'Unknown'}`);
        console.log(`   Course ID: ${video.course?._id || 'Unknown'}`);
      } else {
        console.log(`\n❌ Video ${videoId} not found`);
      }
    }
    
    // Also check the current course videos
    console.log('\n🎯 Current course videos (Basics of Nurology):');
    const courseVideos = await Video.find({ course: '68c8e5486a8d60601e77f327' }).populate('course', 'title courseCode');
    
    courseVideos.forEach(video => {
      console.log(`\n📹 Video: ${video.title}`);
      console.log(`   ID: ${video._id}`);
      console.log(`   Course: ${video.course?.title || 'Unknown'}`);
      console.log(`   Course Code: ${video.course?.courseCode || 'Unknown'}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.disconnect();
  }
}

checkVideosCourses();