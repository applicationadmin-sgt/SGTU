const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function fixUserActiveStatus() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    // Find the Sourav user
    const user = await User.findOne({ email: 'sourav1192002@gmail.com' });
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log(`\n👤 User: ${user.name}`);
    console.log(`📧 Email: ${user.email}`);
    console.log(`🔵 Current isActive: ${user.isActive}`);
    console.log(`🔵 Current role: ${user.role}`);
    console.log(`🔵 Current roles: ${JSON.stringify(user.roles)}`);
    
    // Set isActive to true if it's undefined or false
    if (user.isActive === undefined || user.isActive === false) {
      user.isActive = true;
      await user.save();
      console.log(`✅ Updated user isActive to: ${user.isActive}`);
    } else {
      console.log(`✅ User isActive is already: ${user.isActive}`);
    }
    
    // Also check all other users with undefined isActive
    const usersWithUndefinedActive = await User.find({ 
      isActive: { $exists: false }
    }).select('name email role roles isActive');
    
    if (usersWithUndefinedActive.length > 0) {
      console.log(`\n🔧 Found ${usersWithUndefinedActive.length} users with undefined isActive:`);
      
      for (const user of usersWithUndefinedActive) {
        console.log(`- ${user.name} (${user.email}) - Setting to active`);
        user.isActive = true;
        await user.save();
      }
      console.log('✅ All users updated with isActive: true');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

fixUserActiveStatus();