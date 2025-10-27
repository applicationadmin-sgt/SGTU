/**
 * Script to fix broken file messages in the database
 * These messages have filenames in the message field but no fileUrl/messageType
 */

const mongoose = require('mongoose');
const GroupChat = require('./models/GroupChat');
require('dotenv').config();

async function fixFileMessages() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/lms';
    await mongoose.connect(mongoUri);
    
    console.log('✅ Connected to MongoDB');
    
    // Find messages that look like file messages but don't have fileUrl
    // These are text messages with filenames in them that were created before the file upload feature
    const brokenFileMessages = await GroupChat.find({
      $and: [
        {
          message: {
            $regex: /\.(pdf|jpg|jpeg|png|gif|webp|doc|docx|xls|xlsx|ppt|pptx|txt|csv)$/i
          }
        },
        {
          $or: [
            { messageType: { $exists: false } },
            { messageType: null },
            { messageType: 'text' },
            { messageType: '' }
          ]
        },
        {
          $or: [
            { fileUrl: { $exists: false } },
            { fileUrl: null },
            { fileUrl: '' }
          ]
        }
      ]
    });
    
    console.log(`\n🔍 Found ${brokenFileMessages.length} broken file messages`);
    
    if (brokenFileMessages.length > 0) {
      console.log('\nSample broken messages:');
      brokenFileMessages.slice(0, 5).forEach((msg, index) => {
        console.log(`${index + 1}. ${msg.message} (ID: ${msg._id})`);
      });
      
      // Ask for confirmation
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      readline.question('\n⚠️  Do you want to DELETE these broken file messages? (yes/no): ', async (answer) => {
        if (answer.toLowerCase() === 'yes') {
          const result = await GroupChat.deleteMany({
            _id: { $in: brokenFileMessages.map(m => m._id) }
          });
          
          console.log(`\n✅ Deleted ${result.deletedCount} broken file messages`);
          console.log('\n📝 You can now upload new files and they will work correctly!');
        } else {
          console.log('\n❌ Operation cancelled. No messages were deleted.');
        }
        
        readline.close();
        await mongoose.connection.close();
        console.log('\n👋 Database connection closed');
        process.exit(0);
      });
    } else {
      console.log('\n✅ No broken file messages found!');
      await mongoose.connection.close();
      console.log('\n👋 Database connection closed');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

fixFileMessages();
