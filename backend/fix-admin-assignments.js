const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Section = require('./models/Section');
const Course = require('./models/Course');
const SectionCourseTeacher = require('./models/SectionCourseTeacher');

async function fixAdminTeacherAssignments() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sgt-learning');
    console.log('✅ Connected to MongoDB');

    // Get the admin user
    const admin = await User.findOne({ email: 'sourav11092002@gmail.com' });
    if (!admin) {
      console.log('❌ Admin user not found');
      return;
    }
    console.log(`👨‍💼 Found admin: ${admin.name} (${admin.email})`);

    // Check existing assignments
    const existingAssignments = await SectionCourseTeacher.find().populate('teacher section course');
    console.log(`\n📋 Existing teacher assignments: ${existingAssignments.length}`);
    
    existingAssignments.forEach(assignment => {
      console.log(`   - ${assignment.teacher?.name || 'Unknown'} → ${assignment.section?.name || 'Unknown'} → ${assignment.course?.name || 'Unknown'}`);
    });

    // Get all sections and courses
    const sections = await Section.find();
    const courses = await Course.find();
    
    console.log(`\n🏫 Available sections: ${sections.length}`);
    console.log(`📚 Available courses: ${courses.length}`);

    if (sections.length > 0 && courses.length > 0) {
      // Create some assignments for the admin
      const assignmentsToCreate = [];
      
      // Assign admin to the first section with the first few courses
      const firstSection = sections[0];
      console.log(`\n🎯 Assigning admin to section: ${firstSection.name}`);
      
      for (let i = 0; i < Math.min(3, courses.length); i++) {
        const course = courses[i];
        
        // Check if assignment already exists
        const existingAssignment = await SectionCourseTeacher.findOne({
          teacher: admin._id,
          section: firstSection._id,
          course: course._id
        });
        
        if (!existingAssignment) {
          assignmentsToCreate.push({
            teacher: admin._id,
            section: firstSection._id,
            course: course._id,
            assignedBy: admin._id,
            assignedAt: new Date()
          });
          console.log(`   ➕ Will assign course: ${course.name || course._id}`);
        } else {
          console.log(`   ✅ Already assigned to course: ${course.name || course._id}`);
        }
      }
      
      if (assignmentsToCreate.length > 0) {
        const result = await SectionCourseTeacher.insertMany(assignmentsToCreate);
        console.log(`\n✅ Created ${result.length} new teacher assignments`);
        
        // Verify the assignments
        const adminAssignments = await SectionCourseTeacher.find({ teacher: admin._id })
          .populate('section course');
        
        console.log(`\n🎉 Admin now has ${adminAssignments.length} assignments:`);
        adminAssignments.forEach(assignment => {
          console.log(`   - Section: ${assignment.section?.name || 'Unknown'} → Course: ${assignment.course?.name || 'Unknown'}`);
        });
      } else {
        console.log(`\n✅ Admin already has sufficient assignments`);
      }
    } else {
      console.log(`\n❌ No sections or courses available to assign`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

fixAdminTeacherAssignments();