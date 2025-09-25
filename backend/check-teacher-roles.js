const mongoose = require('mongoose');
const User = require('./models/User');
const Department = require('./models/Department');
require('dotenv').config();

async function checkTeacherRoles() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    // Find users who might be both HOD and teachers
    const users = await User.find({
      $or: [
        { role: { $in: ['teacher', 'hod', 'dean'] } },
        { roles: { $in: ['teacher', 'hod', 'dean'] } },
        { primaryRole: { $in: ['teacher', 'hod', 'dean'] } }
      ]
    }).populate('department', 'name code');
    
    console.log(`\n👥 Found ${users.length} users with teaching/HOD/Dean roles:\n`);
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email})`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Roles: ${JSON.stringify(user.roles)}`);
      console.log(`   Primary Role: ${user.primaryRole}`);
      console.log(`   Department: ${user.department?.name || 'N/A'} (${user.department?._id})`);
      console.log(`   Active: ${user.isActive}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

checkTeacherRoles();