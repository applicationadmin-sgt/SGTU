require('dotenv').config();
const mongoose = require('mongoose');

// Import models with proper initialization
require('./models/User');
require('./models/Department');
require('./models/Course');
require('./models/Section');

const User = mongoose.model('User');
const Department = mongoose.model('Department');

async function testHODCounting() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const departmentId = '68d10da16ba964074dd63cfd'; // CYBER SECURITY
    
    console.log('\n📊 Testing HOD Dashboard Counting Logic');
    console.log('🎯 Department ID:', departmentId);

    // Test old single-role counting
    console.log('\n📈 OLD Single-Role Counting:');
    const oldTeacherCount = await User.countDocuments({ 
      department: departmentId, 
      role: 'teacher' 
    });
    console.log('Teachers (old):', oldTeacherCount);

    const oldStudentCount = await User.countDocuments({ 
      department: departmentId, 
      role: 'student' 
    });
    console.log('Students (old):', oldStudentCount);

    // Test new multi-role counting
    console.log('\n📈 NEW Multi-Role Counting:');
    const newTeacherCount = await User.countDocuments({
      department: departmentId,
      $or: [
        { role: 'teacher' },
        { roles: { $in: ['teacher'] } }
      ]
    });
    console.log('Teachers (new):', newTeacherCount);

    const newStudentCount = await User.countDocuments({
      department: departmentId,
      $or: [
        { role: 'student' },
        { roles: { $in: ['student'] } }
      ]
    });
    console.log('Students (new):', newStudentCount);

    // List all users in this department
    console.log('\n👥 All Users in CYBER SECURITY Department:');
    const allUsers = await User.find({ department: departmentId }).select('name email role roles');
    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email})`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Roles: [${user.roles ? user.roles.join(', ') : 'none'}]`);
    });

    // Check department details
    console.log('\n🏢 Department Details:');
    const department = await Department.findById(departmentId);
    console.log('Department:', department ? department.name : 'Not found');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    console.log('\n🔌 Disconnected from MongoDB');
    await mongoose.disconnect();
  }
}

testHODCounting();