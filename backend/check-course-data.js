const mongoose = require('mongoose');
const Course = require('./models/Course');

async function checkCourseData() {
  try {
    await mongoose.connect('mongodb://localhost:27017/sgt3');
    console.log('Connected to MongoDB (sgt3)');
    
    const courses = await Course.find({});
    console.log('All course documents:', courses.length);
    courses.forEach((c, i) => {
      console.log(`Course ${i+1}:`);
      console.log('  ID:', c._id);
      console.log('  Name:', c.name);
      console.log('  Title:', c.title);
      console.log('  Code:', c.code);
      console.log('  CourseCode:', c.courseCode);
      console.log('  Department:', c.department);
      console.log('  All fields:', Object.keys(c.toObject()));
      console.log('---');
    });
    
    mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    mongoose.connection.close();
  }
}

checkCourseData();