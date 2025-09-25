require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/videocallapp')
  .then(async () => {
    console.log('Connected to database');
    
    // Check admin user specifically
    const adminUser = await User.findOne({ role: 'admin' });
    console.log('Admin user found:', adminUser ? 'Yes' : 'No');
    if (adminUser) {
      console.log(`Email: ${adminUser.email}`);
      console.log(`Role: ${adminUser.role}`);
      console.log(`Roles array: ${JSON.stringify(adminUser.roles)}`);
      console.log(`Primary role: ${adminUser.primaryRole}`);
      console.log(`Roles array length: ${adminUser.roles ? adminUser.roles.length : 'undefined'}`);
    }
    
    // Check users that match our criteria
    const usersToMigrate = await User.find({
      role: { $exists: true },
      $or: [
        { roles: { $exists: false } },
        { roles: { $size: 0 } }
      ]
    });
    
    console.log(`\nFound ${usersToMigrate.length} users to migrate:`);
    usersToMigrate.forEach(user => {
      console.log(`- ${user.email}: role=${user.role}, roles=${JSON.stringify(user.roles)}`);
    });
    
    mongoose.disconnect();
  })
  .catch(err => {
    console.error('Error:', err);
    mongoose.disconnect();
  });