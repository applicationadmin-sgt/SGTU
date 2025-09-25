const mongoose = require('mongoose');
const Section = require('./models/Section');
const SectionCourseTeacher = require('./models/SectionCourseTeacher');
const School = require('./models/School');
const Department = require('./models/Department');
const Course = require('./models/Course');
require('dotenv').config();

async function debugUnassignedCoursesAPI() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    // Find section CS00000006 (from the screenshot)
    const section = await Section.findOne({ name: 'CS00000006' });
    if (!section) {
      console.log('❌ Section CS00000006 not found');
      return;
    }
    
    console.log(`\n📚 Testing unassigned courses API for section: ${section.name} (${section._id})\n`);
    
    // Test the exact same logic as the API
    const unassignedCourses = await SectionCourseTeacher.getUnassignedCourses(section._id);
    
    console.log(`📋 Unassigned courses (${unassignedCourses.length}):`);
    unassignedCourses.forEach((course, index) => {
      console.log(`${index + 1}. ${course.title} (${course.courseCode})`);
      console.log(`   Department: ${course.department?.name || 'N/A'} (${course.department?._id})`);
      console.log('');
    });
    
    // Test specifically for ethical hacking
    const ethicalHacking = unassignedCourses.find(c => c.courseCode === 'C000003');
    if (ethicalHacking) {
      console.log(`🎯 Found Ethical Hacking course:`);
      console.log(`   Title: ${ethicalHacking.title}`);
      console.log(`   Code: ${ethicalHacking.courseCode}`);
      console.log(`   Department Name: ${ethicalHacking.department?.name}`);
      console.log(`   Department ID: ${ethicalHacking.department?._id}`);
      
      // Now test fetching teachers for this department
      if (ethicalHacking.department?._id) {
        console.log(`\n🔍 Testing teacher fetch for department: ${ethicalHacking.department._id}`);
        
        const User = require('./models/User');
        const teachers = await User.find({
          $and: [
            {
              $or: [
                { role: { $in: ['teacher', 'hod', 'dean'] } },
                { roles: { $in: ['teacher', 'hod', 'dean'] } }
              ]
            },
            { department: ethicalHacking.department._id },
            { isActive: true }
          ]
        }).select('name email teacherId role roles primaryRole _id');
        
        console.log(`👥 Found ${teachers.length} teachers:`);
        teachers.forEach((teacher, index) => {
          console.log(`${index + 1}. ${teacher.name} (${teacher.email})`);
          console.log(`   Role: ${teacher.role}, Roles: ${JSON.stringify(teacher.roles)}`);
        });
      } else {
        console.log('❌ No department ID found for ethical hacking course');
      }
    } else {
      console.log('❌ Ethical hacking course not found in unassigned courses');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

debugUnassignedCoursesAPI();