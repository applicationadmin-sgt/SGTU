const mongoose = require('mongoose');
const Course = require('./models/Course');

async function findAstroChemistry() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sgt_db');
    console.log('Connected to database');
    
    // Find AstroChemistry course by different criteria
    const courses = await Course.find({
      $or: [
        { title: /astrochemistry/i },
        { courseCode: 'C000012' },
        { _id: '68cba8b0af91a41ca931936b' }
      ]
    });
    
    console.log(`Found ${courses.length} matching courses:`);
    courses.forEach((course, index) => {
      console.log(`${index + 1}. ${course.title} (${course.courseCode})`);
      console.log(`   ID: ${course._id}`);
      console.log(`   Description: ${course.description}`);
      console.log('');
    });
    
    mongoose.disconnect();
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

findAstroChemistry();