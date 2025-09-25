const mongoose = require('mongoose');
require('dotenv').config();

const StudentProgress = require('./models/StudentProgress');

async function checkStudentProgress() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/student-dashboard');
    console.log('Connected to MongoDB');

    const studentId = '68ca4f502ff2c9bed48af370';
    const courseId = '68c8e5486a8d60601e77f327';

    const progress = await StudentProgress.findOne({ 
      student: studentId, 
      course: courseId 
    });

    if (progress) {
      console.log('✅ Current unlocked videos:', progress.unlockedVideos.map(id => id.toString()));
      console.log('✅ Units in progress:');
      progress.units.forEach(unit => {
        console.log(`  - Unit ${unit.unitId}: unlocked=${unit.unlocked}, status=${unit.status}`);
      });
    } else {
      console.log('❌ No progress found');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkStudentProgress();