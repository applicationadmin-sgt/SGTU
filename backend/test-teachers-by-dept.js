const mongoose = require('mongoose');
const User = require('./models/User');
const Department = require('./models/Department');
require('dotenv').config();

async function testGetTeachersByDepartment() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    // Get the CYBER SECURITY department ID (where Ethical Hacking course belongs)
    const cyberSecDept = await Department.findOne({ name: 'CYBER SECURITY' });
    if (!cyberSecDept) {
      console.log('❌ CYBER SECURITY department not found');
      return;
    }
    
    console.log(`\n🏫 Testing teachers for department: ${cyberSecDept.name} (${cyberSecDept._id})\n`);
    
    // Test the new query logic
    const teachers = await User.find({
      $and: [
        {
          $or: [
            { role: { $in: ['teacher', 'hod', 'dean'] } },
            { roles: { $in: ['teacher', 'hod', 'dean'] } }
          ]
        },
        { department: cyberSecDept._id },
        { isActive: true }
      ]
    }).select('name email teacherId role roles primaryRole _id');
    
    console.log(`👥 Found ${teachers.length} available teachers:\n`);
    
    teachers.forEach((teacher, index) => {
      console.log(`${index + 1}. ${teacher.name} (${teacher.email})`);
      console.log(`   Role: ${teacher.role}`);
      console.log(`   Roles: ${JSON.stringify(teacher.roles)}`);
      console.log(`   Primary Role: ${teacher.primaryRole}`);
      console.log(`   Can teach: ${teacher.roles?.includes('teacher') || teacher.role === 'teacher' ? 'Yes' : 'No'}`);
      console.log('');
    });
    
    if (teachers.length === 0) {
      console.log('❌ No teachers found in CYBER SECURITY department');
      
      // Check if there are any users in this department at all
      const allUsersInDept = await User.find({ department: cyberSecDept._id }).select('name email role roles');
      console.log(`\n🔍 All users in department (${allUsersInDept.length}):`);
      allUsersInDept.forEach(user => {
        console.log(`- ${user.name}: role=${user.role}, roles=${JSON.stringify(user.roles)}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

testGetTeachersByDepartment();