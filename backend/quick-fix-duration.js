const mongoose = require('mongoose');
require('dotenv').config();
const Video = require('./models/Video');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const video = await Video.findOne({ title: { $regex: /unit.*1.*nurology/i } });
  if (video) {
    video.duration = 45;
    await video.save();
    console.log('Updated duration to 45 seconds');
  } else {
    console.log('Video not found');
  }
  process.exit(0);
});