const mongoose = require('mongoose');
const SectionCourseTeacher = require('./models/SectionCourseTeacher');
const User = require('./models/User');
const Course = require('./models/Course');
const Section = require('./models/Section');
require('dotenv').config();

async function fixAssignment() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    const sectionId = '68cc16755ba20b247c9d5909'; // As001
    const courseId = '68cbcc904eb37fd405cae0c2';   // AstroChemistry
    const teacherId = '68cba9bcaf91a41ca93194bf';  // Megha
    const assignedBy = '68cba9bcaf91a41ca93194bf';  // Megha as assignedBy
    
    console.log('\n🎯 Fixing assignment for:');
    console.log(`   Section: ${sectionId}`);
    console.log(`   Course: ${courseId}`);
    console.log(`   Teacher: ${teacherId}`);
    
    // Get section info
    const section = await Section.findById(sectionId);
    console.log(`   Section name: ${section?.name}`);
    
    // Check existing assignment
    const existingAssignment = await SectionCourseTeacher.findOne({
      section: sectionId,
      course: courseId
    });
    
    if (existingAssignment) {
      console.log('\n📋 Found existing assignment:');
      console.log(`   ID: ${existingAssignment._id}`);
      console.log(`   Current teacher: ${existingAssignment.teacher}`);
      console.log(`   Active: ${existingAssignment.isActive}`);
      
      // Update the existing assignment
      existingAssignment.teacher = teacherId;
      existingAssignment.assignedBy = assignedBy;
      existingAssignment.isActive = true;
      existingAssignment.assignedAt = new Date();
      existingAssignment.academicYear = section?.academicYear;
      existingAssignment.semester = section?.semester;
      
      await existingAssignment.save();
      console.log('\n✅ Assignment updated successfully!');
      
      // Show the updated assignment
      const updated = await SectionCourseTeacher.findById(existingAssignment._id)
        .populate('teacher', 'name email')
        .populate('course', 'title courseCode');
      
      console.log('\n📊 Updated assignment details:');
      console.log(`   Teacher: ${updated.teacher.name}`);
      console.log(`   Course: ${updated.course.title}`);
      console.log(`   Active: ${updated.isActive}`);
      
    } else {
      console.log('\n📋 No existing assignment found. Creating new one...');
      
      const newAssignment = new SectionCourseTeacher({
        section: sectionId,
        course: courseId,
        teacher: teacherId,
        assignedBy: assignedBy,
        academicYear: section?.academicYear,
        semester: section?.semester
      });
      
      await newAssignment.save();
      console.log('✅ New assignment created successfully!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

fixAssignment();