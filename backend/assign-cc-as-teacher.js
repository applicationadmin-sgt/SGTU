const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('./models/User');
const Section = require('./models/Section');
const Course = require('./models/Course');

async function assignCCAsTeacher() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🔗 Connected to MongoDB');
    
    // Find Mukherjee Sourav (CC)
    const ccTeacher = await User.findOne({ email: '1109sourav@gmail.com' });
    console.log('CC Teacher:', ccTeacher.name);
    
    // Find the section M.NURO01
    const section = await Section.findOne({ name: 'M.NURO01' });
    console.log('Section:', section.name);
    console.log('Current teacher:', section.teacher);
    
    // Update the section to assign Mukherjee Sourav as the teacher
    console.log('\n🔄 Assigning CC as the main teacher of the section...');
    
    section.teacher = ccTeacher._id;
    await section.save();
    
    console.log('✅ Successfully assigned Mukherjee Sourav as teacher of M.NURO01');
    
    // Verify the change
    const updatedSection = await Section.findOne({ name: 'M.NURO01' })
      .populate('teacher', 'name email')
      .populate('students', 'name')
      .populate('courses', 'title courseCode');
    
    console.log('\n📋 Updated Section Details:');
    console.log('Section:', updatedSection.name);
    console.log('Teacher:', updatedSection.teacher.name, '(' + updatedSection.teacher.email + ')');
    console.log('Students:', updatedSection.students?.length || 0);
    console.log('Courses:', updatedSection.courses?.map(c => `${c.title} (${c.courseCode})`).join(', '));
    
    console.log('\n🎯 Now Mukherjee Sourav is both:');
    console.log('1. Teacher of section M.NURO01 (10 students)');
    console.log('2. Course Coordinator (CC) for Basics of Nurology');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

assignCCAsTeacher();