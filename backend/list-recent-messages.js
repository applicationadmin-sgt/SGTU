/**
 * Script to list recent chat messages to see what's in the database
 */

const mongoose = require('mongoose');
const GroupChat = require('./models/GroupChat');
require('dotenv').config();

async function listMessages() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/lms';
    await mongoose.connect(mongoUri);
    
    console.log('✅ Connected to MongoDB\n');
    
    // Get the 20 most recent messages
    const messages = await GroupChat.find()
      .sort({ timestamp: -1 })
      .limit(20)
      .select('message messageType fileUrl fileName fileSize timestamp');
    
    console.log(`📨 Found ${messages.length} recent messages:\n`);
    
    messages.forEach((msg, index) => {
      console.log(`${index + 1}. [${msg.messageType || 'NO TYPE'}] "${msg.message}"`);
      if (msg.fileUrl) console.log(`   📎 fileUrl: ${msg.fileUrl}`);
      if (msg.fileName) console.log(`   📄 fileName: ${msg.fileName}`);
      if (msg.fileSize) console.log(`   📏 fileSize: ${msg.fileSize} bytes`);
      console.log(`   🕐 timestamp: ${msg.timestamp}`);
      console.log(`   🆔 _id: ${msg._id}\n`);
    });
    
    // Count messages by type
    const typeCounts = await GroupChat.aggregate([
      {
        $group: {
          _id: { $ifNull: ['$messageType', 'NO_TYPE'] },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    console.log('\n📊 Message counts by type:');
    typeCounts.forEach(type => {
      console.log(`   ${type._id}: ${type.count} messages`);
    });
    
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

listMessages();
