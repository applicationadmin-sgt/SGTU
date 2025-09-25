const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('./models/User');
const Section = require('./models/Section');
const Course = require('./models/Course');
const Department = require('./models/Department');
const School = require('./models/School');

async function createSectionForTeacher() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🔗 Connected to MongoDB');
    
    // Find Mukherjee Sourav
    const teacher = await User.findOne({ email: '1109sourav@gmail.com' })
      .populate('department');
    console.log('👨‍🏫 Teacher:', teacher.name, teacher._id);
    console.log('Department:', teacher.department?.name);
    
    // Find the course he coordinates (Basics of Nurology)
    const coordinatedCourse = await Course.findOne({ coordinators: teacher._id })
      .populate('department')
      .populate('school');
    
    console.log('\n📚 Coordinated Course:', coordinatedCourse?.title, coordinatedCourse?.courseCode);
    
    // Create a new section for this teacher
    console.log('\n🆕 Creating new section for teacher...');
    
    const newSection = new Section({
      name: 'M.NURO02', // Second section for Neurology
      department: coordinatedCourse.department._id,
      school: coordinatedCourse.school._id,
      teacher: teacher._id,
      courses: [coordinatedCourse._id],
      students: [], // Start with empty students - can be added later
      isActive: true
    });
    
    await newSection.save();
    console.log('✅ New section created:', newSection.name);
    
    // Verify the creation
    const createdSection = await Section.findById(newSection._id)
      .populate('teacher', 'name email')
      .populate('courses', 'title courseCode')
      .populate('department', 'name')
      .populate('school', 'name');
    
    console.log('\n🔍 Verification:');
    console.log(`Section: ${createdSection.name}`);
    console.log(`Teacher: ${createdSection.teacher?.name}`);
    console.log(`Department: ${createdSection.department?.name}`);
    console.log(`School: ${createdSection.school?.name}`);
    console.log(`Courses: ${createdSection.courses?.map(c => `${c.title} (${c.courseCode})`).join(', ')}`);
    console.log(`Students: ${createdSection.students?.length || 0}`);
    
    console.log('\n✅ Section created successfully! The teacher should now see proper statistics.');
    
    // Optional: Add some sample students to the section
    console.log('\n💡 To add students to this section, you can:');
    console.log('1. Use the admin interface to assign students');
    console.log('2. Or run a separate script to add student IDs to this section');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

createSectionForTeacher();