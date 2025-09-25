const mongoose = require('mongoose');
const Section = require('./models/Section');
const Course = require('./models/Course');
const User = require('./models/User');
const SectionCourseTeacher = require('./models/SectionCourseTeacher');
require('dotenv').config();

async function debugAssignment() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    const sectionId = '68cc16755ba20b247c9d5909'; // As001
    const courseId = '68cbcc904eb37fd405cae0c2';   // AstroChemistry
    const teacherId = '68cba9bcaf91a41ca93194bf';  // Megha
    
    console.log('\n🔍 Checking data validity...');
    
    // Check if section exists
    const section = await Section.findById(sectionId);
    console.log('📚 Section found:', section ? `${section.name} (${section._id})` : 'NOT FOUND');
    
    if (section) {
      console.log('   Courses in section:', section.courses.length);
      console.log('   Course IDs:', section.courses);
    }
    
    // Check if course exists
    const course = await Course.findById(courseId);
    console.log('📖 Course found:', course ? `${course.title} (${course._id})` : 'NOT FOUND');
    
    // Check if teacher exists
    const teacher = await User.findById(teacherId);
    console.log('👨‍🏫 Teacher found:', teacher ? `${teacher.name} (${teacher.role})` : 'NOT FOUND');
    
    // Check if course is in section
    if (section && course) {
      const courseInSection = section.courses.includes(courseId);
      console.log('🔗 Course in section:', courseInSection);
      
      if (!courseInSection) {
        console.log('❌ Course is not assigned to this section!');
        return;
      }
    }
    
    // Check existing assignments
    const existingAssignment = await SectionCourseTeacher.findOne({
      section: sectionId,
      course: courseId,
      isActive: true
    });
    console.log('📋 Existing assignment:', existingAssignment ? 'EXISTS' : 'NONE');
    
    if (existingAssignment) {
      console.log('   Assigned to teacher:', existingAssignment.teacher);
      return;
    }
    
    // Try to create the assignment
    console.log('\n🎯 Attempting to create assignment...');
    const assignment = new SectionCourseTeacher({
      section: sectionId,
      course: courseId,
      teacher: teacherId,
      assignedBy: teacherId, // Using teacher as assignedBy for test
      academicYear: section?.academicYear,
      semester: section?.semester
    });
    
    await assignment.save();
    console.log('✅ Assignment created successfully!');
    console.log('   Assignment ID:', assignment._id);
    
  } catch (error) {
    console.error('❌ Error during debug:', error);
    console.error('   Error name:', error.name);
    console.error('   Error message:', error.message);
    if (error.code) console.error('   Error code:', error.code);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

debugAssignment();