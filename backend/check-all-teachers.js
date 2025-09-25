const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('./models/User');
const Section = require('./models/Section');
const Course = require('./models/Course');

async function checkTeachers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🔗 Connected to MongoDB');
    
    console.log('\n👥 All teachers in the system:');
    const teachers = await User.find({ role: 'teacher' }).select('name email _id');
    
    teachers.forEach((teacher, index) => {
      console.log(`${index + 1}. ${teacher.name} (${teacher.email}) - ID: ${teacher._id}`);
    });
    
    console.log('\n🔍 Checking sections for each teacher:');
    for (const teacher of teachers) {
      const sections = await Section.find({ 
        $or: [
          { teacher: teacher._id }, 
          { teachers: teacher._id }
        ] 
      })
      .populate('students', '_id name')
      .populate('courses', '_id title');
      
      console.log(`\n📚 ${teacher.name} (${teacher.email}):`);
      console.log(`   Sections: ${sections.length}`);
      
      if (sections.length > 0) {
        sections.forEach((section, i) => {
          console.log(`   ${i + 1}. ${section.name} - ${section.students?.length || 0} students, ${section.courses?.length || 0} courses`);
        });
      }
    }
    
    console.log('\n🎯 Recommendation: Use the teacher with actual section assignments for testing');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkTeachers();