const mongoose = require('mongoose');
const Course = require('./models/Course');
const Department = require('./models/Department');
const User = require('./models/User');
require('dotenv').config();

async function debugEthicalHackingCourse() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    // Find ethical hacking course
    const course = await Course.findOne({ courseCode: 'C000003' }).populate('department', 'name code _id');
    if (!course) {
      console.log('❌ Ethical Hacking course not found');
      return;
    }
    
    console.log(`\n📚 Course: ${course.title} (${course.courseCode})`);
    console.log(`🏫 Department: ${course.department?.name || 'N/A'} (ID: ${course.department?._id})`);
    
    // Now check for teachers in this department using the same query as the API
    const departmentId = course.department._id;
    console.log(`\n🔍 Searching for teachers in department ${departmentId}...\n`);
    
    const teachers = await User.find({
      $and: [
        {
          $or: [
            { role: { $in: ['teacher', 'hod', 'dean'] } },
            { roles: { $in: ['teacher', 'hod', 'dean'] } }
          ]
        },
        { department: departmentId },
        { isActive: true }
      ]
    }).select('name email teacherId role roles primaryRole _id department');
    
    console.log(`👥 Found ${teachers.length} teachers for this department:\n`);
    
    teachers.forEach((teacher, index) => {
      console.log(`${index + 1}. ${teacher.name} (${teacher.email})`);
      console.log(`   Role: ${teacher.role}`);
      console.log(`   Roles: ${JSON.stringify(teacher.roles)}`);
      console.log(`   Primary Role: ${teacher.primaryRole}`);
      console.log(`   Department: ${teacher.department}`);
      console.log(`   Active: ${teacher.isActive}`);
      console.log('');
    });
    
    if (teachers.length === 0) {
      console.log('❌ No teachers found. Let me check all users in this department...\n');
      
      const allUsersInDept = await User.find({ department: departmentId });
      console.log(`All users in department ${departmentId}:`);
      allUsersInDept.forEach(user => {
        console.log(`- ${user.name}: role=${user.role}, roles=${JSON.stringify(user.roles)}, active=${user.isActive}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

debugEthicalHackingCourse();