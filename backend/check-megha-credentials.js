const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function checkMeghaCredentials() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    // Find Megha by email
    const megha = await User.findOne({ email: 'megha@gmail.com' });
    console.log('\n👩‍🏫 Megha found:', megha ? 'YES' : 'NO');
    
    if (megha) {
      console.log('   Name:', megha.name);
      console.log('   Email:', megha.email);
      console.log('   Role:', megha.role);
      console.log('   Has password:', !!megha.password);
      console.log('   Account created:', megha.createdAt);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

checkMeghaCredentials();