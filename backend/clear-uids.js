/**
 * Clear all UIDs from database to prepare for new numeric-only migration
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function clearUIDs() {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('🗑️  Clearing all UIDs from database...');
    
    const result = await User.updateMany(
      { uid: { $exists: true } },
      { $unset: { uid: "" } }
    );

    console.log(`✅ Cleared ${result.modifiedCount} UIDs from database`);
    console.log('\n📝 Users can now be migrated to the new numeric UID system');
    console.log('   Run: node scripts/migrate-uid-system.js');

  } catch (error) {
    console.error('❌ Failed to clear UIDs:', error.message);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

clearUIDs()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
