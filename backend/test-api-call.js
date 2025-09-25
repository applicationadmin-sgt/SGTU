const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const User = require('./models/User');
const Course = require('./models/Course');

async function testGetCourseVideosAPI() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/student-dashboard');
    console.log('Connected to MongoDB');

    // Find Munmun student
    const student = await User.findOne({ email: 'munmun2912@gmail.com' });
    console.log('✅ Found student:', student.name);

    // Find C000008 course
    const course = await Course.findOne({ courseCode: 'C000008' });
    console.log('✅ Found course:', course.title, course._id);

    // Create JWT token for the student
    const token = jwt.sign(
      { _id: student._id, role: student.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    console.log('✅ Generated JWT token');

    // Simulate the API call by directly calling the controller logic
    const studentController = require('./controllers/studentController');
    
    // Mock request and response objects
    const mockReq = {
      user: { _id: student._id },
      params: { courseId: course._id.toString() },
      protocol: 'http',
      get: () => 'localhost:5000'
    };

    const mockRes = {
      json: (data) => {
        console.log('\n🎯 API Response:');
        console.log('Course:', data.course?.title);
        if (data.units) {
          console.log('Units count:', data.units.length);
          data.units.forEach((unit, index) => {
            console.log(`  Unit ${index + 1}: ${unit.title}`);
            console.log(`    Unlocked: ${unit.unlocked}`);
            console.log(`    Videos count: ${unit.videos.length}`);
            if (unit.videos.length > 0) {
              unit.videos.forEach(video => {
                console.log(`      - ${video.title} (${video._id})`);
              });
            } else {
              console.log('      ❌ NO VIDEOS FOUND');
            }
          });
        } else if (data.videos) {
          console.log('Videos count:', data.videos.length);
          data.videos.forEach(video => {
            console.log(`  - ${video.title} (${video._id})`);
          });
        }
      },
      status: (code) => ({
        json: (data) => {
          console.log(`❌ Error ${code}:`, data.message);
        }
      })
    };

    console.log('\n🚀 Calling getCourseVideos...\n');
    await studentController.getCourseVideos(mockReq, mockRes);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

testGetCourseVideosAPI();