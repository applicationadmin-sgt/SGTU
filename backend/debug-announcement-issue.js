const mongoose = require('mongoose');
const Announcement = require('./models/Announcement');
const Notification = require('./models/Notification');

// Connect to MongoDB Atlas
mongoose.connect('mongodb+srv://sourav092002_db_user:aq5UgwNDh2tgyZcB@cluster0.nvkrxcx.mongodb.net/');

async function debugAnnouncementIssue() {
  try {
    console.log('🔍 Debugging announcement vs notification issue...\n');
    
    // Check all announcements in database
    console.log('📢 All Announcements in Database:');
    const allAnnouncements = await Announcement.find({}).limit(10);
    console.log(`Total announcements: ${allAnnouncements.length}`);
    
    if (allAnnouncements.length > 0) {
      allAnnouncements.forEach((ann, index) => {
        console.log(`${index + 1}. ID: ${ann._id}`);
        console.log(`   Title: ${ann.title}`);
        console.log(`   Message: ${ann.message?.substring(0, 50)}...`);
        console.log(`   Approval Status: ${ann.approvalStatus}`);
        console.log(`   Target Audience: ${JSON.stringify(ann.targetAudience)}`);
        console.log(`   Created: ${ann.createdAt}`);
        console.log('---');
      });
    }
    
    // Check notifications that are announcements
    console.log('\n🔔 Announcement-type Notifications:');
    const announcementNotifications = await Notification.find({ type: 'announcement' }).limit(10);
    console.log(`Total announcement notifications: ${announcementNotifications.length}`);
    
    if (announcementNotifications.length > 0) {
      announcementNotifications.forEach((notif, index) => {
        console.log(`${index + 1}. ID: ${notif._id}`);
        console.log(`   Recipient: ${notif.recipient}`);
        console.log(`   Message: ${notif.message?.substring(0, 50)}...`);
        console.log(`   Read: ${notif.read}`);
        console.log(`   Announcement ID: ${notif.announcement}`);
        console.log(`   Created: ${notif.createdAt}`);
        console.log('---');
      });
    }
    
    // Check if there are any older announcement structures
    console.log('\n🗂️ Checking for other announcement collections...');
    const collections = await mongoose.connection.db.listCollections().toArray();
    const announcementCollections = collections.filter(col => 
      col.name.toLowerCase().includes('announcement')
    );
    
    console.log('Collections with "announcement" in name:');
    announcementCollections.forEach(col => {
      console.log(`- ${col.name}`);
    });
    
    // Let's also check what notifications exist for a specific user (if we can find one)
    console.log('\n👤 Sample User Notifications:');
    const sampleNotifications = await Notification.find({}).limit(5);
    if (sampleNotifications.length > 0) {
      console.log('Sample notifications:');
      sampleNotifications.forEach((notif, index) => {
        console.log(`${index + 1}. Type: ${notif.type}, Recipient: ${notif.recipient}, Message: ${notif.message?.substring(0, 30)}...`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    mongoose.connection.close();
  }
}

debugAnnouncementIssue();