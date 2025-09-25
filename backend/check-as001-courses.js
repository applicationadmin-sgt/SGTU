const mongoose = require('mongoose');
require('dotenv').config();

const Section = require('./models/Section');
const Course = require('./models/Course');

async function checkAs001Courses() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const as001 = await Section.findOne({ name: 'As001' }).populate('courses');
    
    if (!as001) {
      console.log('As001 section not found');
      return;
    }
    
    console.log(`As001 courses: ${as001.courses.length}`);
    
    as001.courses.forEach((course, index) => {
      console.log(`${index + 1}. ${course.name} (${course.courseCode}) - ID: ${course._id}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkAs001Courses();