const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');

async function checkAllUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/sgt_db');
    console.log('Connected to MongoDB');

    const users = await User.find({}).select('name email role isActive teacherId regNo department school');
    console.log('\n=== All Users in Database ===');
    
    const roleGroups = {};
    users.forEach(user => {
      if (!roleGroups[user.role]) roleGroups[user.role] = [];
      roleGroups[user.role].push(user);
    });

    Object.keys(roleGroups).forEach(role => {
      console.log(`\n--- ${role.toUpperCase()} (${roleGroups[role].length}) ---`);
      roleGroups[role].forEach(user => {
        console.log(`  ${user.name} | ${user.email} | Active: ${user.isActive !== false} | ID: ${user.teacherId || user.regNo || 'N/A'}`);
      });
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkAllUsers();