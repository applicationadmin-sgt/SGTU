const mongoose = require('mongoose');
const Announcement = require('./models/Announcement');
const User = require('./models/User');

// Connect to MongoDB Atlas
mongoose.connect('mongodb+srv://sourav092002_db_user:aq5UgwNDh2tgyZcB@cluster0.nvkrxcx.mongodb.net/');

async function debugQueryExecution() {
  try {
    console.log('🔍 Debugging actual query execution...\n');
    
    // Find a dean/admin user
    const adminUser = await User.findOne({ email: 'vishumam@gmail.com' });
    if (!adminUser) {
      console.log('❌ Admin user not found');
      return;
    }
    
    console.log(`👤 Testing with admin user: ${adminUser.email}`);
    console.log(`Role: ${adminUser.role}`);
    console.log(`User ID: ${adminUser._id}\n`);
    
    const userId = adminUser._id;
    const userRole = adminUser.role;
    
    // Test the exact query that should be executed for admin
    console.log('📋 Testing admin query (should see all announcements):');
    let adminQuery = { approvalStatus: 'approved' };
    
    console.log('Admin query:', JSON.stringify(adminQuery, null, 2));
    
    const adminResults = await Announcement.find(adminQuery).sort({ isPinned: -1, createdAt: -1 });
    console.log(`✅ Admin results: ${adminResults.length} announcements`);
    
    if (adminResults.length > 0) {
      console.log('\nFirst 3 admin announcements:');
      adminResults.slice(0, 3).forEach((ann, index) => {
        console.log(`${index + 1}. "${ann.title}"`);
        console.log(`   Approval Status: ${ann.approvalStatus}`);
        console.log(`   Target Roles: ${JSON.stringify(ann.targetAudience?.targetRoles)}`);
        console.log(`   Created: ${ann.createdAt}`);
        console.log('---');
      });
    }
    
    // Test what the controller actually does - let me check if there are any other issues
    console.log('\n🔍 Checking all announcements approval status:');
    const allAnnouncements = await Announcement.find({});
    console.log(`Total announcements in DB: ${allAnnouncements.length}`);
    
    const statusCounts = {};
    allAnnouncements.forEach(ann => {
      const status = ann.approvalStatus || 'undefined';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    console.log('Approval status breakdown:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });
    
    // Now test the exact logic from the controller for a student
    console.log('\n👤 Testing student query logic:');
    const studentUser = await User.findOne({ role: 'student' });
    if (studentUser) {
      console.log(`Student: ${studentUser.email} (${studentUser.role})`);
      
      const studentQuery = {
        approvalStatus: 'approved',
        $or: [
          { 'targetAudience.allUsers': true },
          { 'targetAudience.targetRoles': 'student' },
          { 'targetAudience.targetRoles': { $exists: false } },
          { 'targetAudience.targetRoles': { $size: 0 } },
          { 'targetAudience.specificUsers': studentUser._id },
          { sender: studentUser._id }
        ]
      };
      
      console.log('Student query:', JSON.stringify(studentQuery, null, 2));
      
      const studentResults = await Announcement.find(studentQuery).sort({ isPinned: -1, createdAt: -1 });
      console.log(`✅ Student results: ${studentResults.length} announcements`);
      
      if (studentResults.length > 0) {
        console.log('\nFirst 3 student announcements:');
        studentResults.slice(0, 3).forEach((ann, index) => {
          console.log(`${index + 1}. "${ann.title}"`);
          console.log(`   Target Roles: ${JSON.stringify(ann.targetAudience?.targetRoles)}`);
          console.log(`   All Users: ${ann.targetAudience?.allUsers}`);
        });
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    mongoose.connection.close();
  }
}

debugQueryExecution();