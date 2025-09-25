const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/videocallapp', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const User = require('./models/User');

async function migrateUsersToMultiRole() {
  console.log('🚀 Starting migration from single role to multi-role system...');
  
  try {
    // Find all users that have the old 'role' field but no 'roles' field or empty roles array
    const usersToMigrate = await User.find({
      role: { $exists: true },
      $or: [
        { roles: { $exists: false } },
        { roles: { $size: 0 } }
      ]
    });

    console.log(`📊 Found ${usersToMigrate.length} users to migrate`);

    if (usersToMigrate.length === 0) {
      console.log('✅ No users need migration. All users already have roles array.');
      return;
    }

    let migratedCount = 0;
    let errorCount = 0;

    for (const user of usersToMigrate) {
      try {
        // Convert single role to roles array
        user.roles = [user.role];
        user.primaryRole = user.role;
        
        // Save the updated user
        await user.save();
        
        console.log(`✅ Migrated user: ${user.email} (${user.role} → [${user.roles.join(', ')}])`);
        migratedCount++;
      } catch (error) {
        console.error(`❌ Failed to migrate user ${user.email}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📈 Migration Summary:');
    console.log(`✅ Successfully migrated: ${migratedCount} users`);
    console.log(`❌ Failed migrations: ${errorCount} users`);
    console.log(`📊 Total processed: ${usersToMigrate.length} users`);

    if (migratedCount > 0) {
      console.log('\n🔄 Creating indexes for new fields...');
      await User.collection.createIndex({ roles: 1 });
      await User.collection.createIndex({ primaryRole: 1 });
      console.log('✅ Indexes created successfully');
    }

    console.log('\n🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    throw error;
  }
}

// Add reverse migration function for rollback if needed
async function rollbackMultiRoleToSingle() {
  console.log('🔄 Rolling back multi-role system to single role...');
  
  try {
    const usersToRollback = await User.find({
      roles: { $exists: true },
      primaryRole: { $exists: true }
    });

    console.log(`📊 Found ${usersToRollback.length} users to rollback`);

    let rolledBackCount = 0;

    for (const user of usersToRollback) {
      try {
        // Use primaryRole as the single role
        user.role = user.primaryRole;
        
        // Remove multi-role fields
        user.roles = undefined;
        user.primaryRole = undefined;
        
        await user.save();
        
        console.log(`✅ Rolled back user: ${user.email} ([${user.roles?.join(', ')}] → ${user.role})`);
        rolledBackCount++;
      } catch (error) {
        console.error(`❌ Failed to rollback user ${user.email}:`, error.message);
      }
    }

    console.log(`\n✅ Successfully rolled back: ${rolledBackCount} users`);
    
  } catch (error) {
    console.error('💥 Rollback failed:', error);
    throw error;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    if (command === 'rollback') {
      await rollbackMultiRoleToSingle();
    } else {
      await migrateUsersToMultiRole();
    }
  } catch (error) {
    console.error('💥 Script execution failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
}

// Handle script termination
process.on('SIGINT', async () => {
  console.log('\n⏹️ Migration interrupted by user');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('unhandledRejection', async (error) => {
  console.error('💥 Unhandled rejection:', error);
  await mongoose.connection.close();
  process.exit(1);
});

if (require.main === module) {
  main();
}

module.exports = {
  migrateUsersToMultiRole,
  rollbackMultiRoleToSingle
};