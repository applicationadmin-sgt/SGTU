const mongoose = require('mongoose');
const Announcement = require('./models/Announcement');
const User = require('./models/User');

// Connect to MongoDB Atlas
mongoose.connect('mongodb+srv://sourav092002_db_user:aq5UgwNDh2tgyZcB@cluster0.nvkrxcx.mongodb.net/');

async function testAnnouncementFiltering() {
  try {
    console.log('🧪 Testing announcement filtering logic...\n');
    
    // Find a test user (student)
    const testUser = await User.findOne({ role: 'student' }).limit(1);
    if (!testUser) {
      console.log('❌ No student user found for testing');
      return;
    }
    
    console.log(`🧑‍🎓 Testing with student user: ${testUser.email} (${testUser.name})`);
    console.log(`User ID: ${testUser._id}`);
    console.log(`User Role: ${testUser.role}\n`);
    
    // Test the current query logic
    const userId = testUser._id;
    const userRole = testUser.role;
    
    console.log('📋 Testing current filtering logic:');
    
    // Current query logic (simplified)
    let query = {
      approvalStatus: 'approved',
      $or: [
        { 'targetAudience.allUsers': true },
        { 'targetAudience.targetRoles': userRole },
        { 'targetAudience.specificUsers': userId },
        { sender: userId }
      ]
    };
    
    console.log('Query:', JSON.stringify(query, null, 2));
    
    const matchingAnnouncements = await Announcement.find(query);
    console.log(`\n✅ Matching announcements: ${matchingAnnouncements.length}`);
    
    if (matchingAnnouncements.length > 0) {
      matchingAnnouncements.forEach((ann, index) => {
        console.log(`${index + 1}. "${ann.title}"`);
        console.log(`   Target Roles: ${JSON.stringify(ann.targetAudience.targetRoles)}`);
        console.log(`   All Users: ${ann.targetAudience.allUsers}`);
        console.log(`   Target Sections: ${JSON.stringify(ann.targetAudience.targetSections)}`);
      });
    }
    
    // Now test a more inclusive query for announcements with empty target roles
    console.log('\n📋 Testing more inclusive logic (empty targetRoles should match all):');
    
    let inclusiveQuery = {
      approvalStatus: 'approved',
      $or: [
        { 'targetAudience.allUsers': true },
        { 'targetAudience.targetRoles': userRole },
        { 'targetAudience.targetRoles': { $exists: false } },
        { 'targetAudience.targetRoles': { $size: 0 } },
        { 'targetAudience.specificUsers': userId },
        { sender: userId }
      ]
    };
    
    const inclusiveMatches = await Announcement.find(inclusiveQuery);
    console.log(`\n✅ Inclusive matching announcements: ${inclusiveMatches.length}`);
    
    if (inclusiveMatches.length > 0) {
      inclusiveMatches.forEach((ann, index) => {
        console.log(`${index + 1}. "${ann.title}"`);
        console.log(`   Target Roles: ${JSON.stringify(ann.targetAudience.targetRoles)}`);
        console.log(`   All Users: ${ann.targetAudience.allUsers}`);
      });
    }
    
    // Show all announcements for comparison
    console.log('\n📋 All approved announcements for reference:');
    const allApproved = await Announcement.find({ approvalStatus: 'approved' });
    console.log(`Total approved announcements: ${allApproved.length}`);
    
    allApproved.forEach((ann, index) => {
      console.log(`${index + 1}. "${ann.title}"`);
      console.log(`   Target Roles: ${JSON.stringify(ann.targetAudience.targetRoles)}`);
      console.log(`   All Users: ${ann.targetAudience.allUsers}`);
      console.log(`   Has empty targetRoles: ${!ann.targetAudience.targetRoles || ann.targetAudience.targetRoles.length === 0}`);
      console.log('---');
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    mongoose.connection.close();
  }
}

testAnnouncementFiltering();