const mongoose = require('mongoose');
const teacherController = require('./controllers/teacherController');
const User = require('./models/User');
require('dotenv').config();

async function testTeacherCoursesDirectly() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    // Find Megha
    const megha = await User.findOne({ email: 'megha@gmail.com' });
    console.log('\n👩‍🏫 Testing teacher courses for:', megha.name, megha._id);
    
    // Mock request object with Megha's ID
    const mockReq = {
      user: { _id: megha._id }
    };
    
    // Mock response object
    const mockRes = {
      json: (data) => {
        console.log('\n📚 Teacher courses result:');
        console.log(`📊 Total courses: ${data.length}`);
        
        if (data.length === 0) {
          console.log('❌ No courses found for teacher');
          return;
        }
        
        data.forEach((course, index) => {
          console.log(`\n   Course ${index + 1}:`);
          console.log(`   - Title: ${course.title || course.name}`);
          console.log(`   - Code: ${course.courseCode}`);
          console.log(`   - Sections: ${course.sectionsCount}`);
          console.log(`   - Students: ${course.studentsCount}`);
          
          if (course.sections && course.sections.length > 0) {
            console.log(`   - Section Details:`);
            course.sections.forEach((section, idx) => {
              console.log(`     ${idx + 1}. ${section.name} (${section.studentsCount} students)`);
            });
          }
        });
        
        // Calculate total sections
        const totalSections = data.reduce((total, course) => total + course.sectionsCount, 0);
        console.log(`\n🎯 Summary:`);
        console.log(`   Total unique courses: ${data.length}`);
        console.log(`   Total sections: ${totalSections}`);
      },
      status: (code) => ({
        json: (data) => {
          console.log(`❌ Error response (${code}):`, data);
        }
      })
    };
    
    // Call the teacher courses function directly
    await teacherController.getTeacherCourses(mockReq, mockRes);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

testTeacherCoursesDirectly();