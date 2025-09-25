require('dotenv').config();
const mongoose = require('mongoose');

// Import models  
require('./models/User');
require('./models/Department');  
require('./models/Course');
require('./models/Section');
require('./models/Announcement');

// Import the actual controller
const { getHODDashboard } = require('./controllers/hodController');

async function testHODController() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    // Find the HOD user
    const User = mongoose.model('User');
    const hodUser = await User.findOne({ email: 'sourav1192002@gmail.com' });
    
    if (!hodUser) {
      console.log('❌ HOD user not found');
      return;
    }
    
    console.log('✅ HOD user found:', hodUser.name);
    
    // Mock request and response objects
    const req = {
      user: {
        id: hodUser._id
      }
    };
    
    const res = {
      json: (data) => {
        console.log('✅ Controller Response:');
        console.log(JSON.stringify(data, null, 2));
      },
      status: (code) => ({
        json: (data) => {
          console.log(`❌ Error Response (${code}):`, data);
        }
      })
    };
    
    console.log('\n🎯 Calling getHODDashboard controller...');
    await getHODDashboard(req, res);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    console.log('\n🔌 Disconnecting from MongoDB');
    await mongoose.disconnect();
  }
}

testHODController();