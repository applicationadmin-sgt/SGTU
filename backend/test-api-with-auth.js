const mongoose = require('mongoose');
const User = require('./models/User');
const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config();

async function testAPIWithAuth() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    // Find an admin user to generate a token
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      console.log('❌ Admin user not found');
      return;
    }
    
    // Generate a JWT token for this admin
    const token = jwt.sign(
      { 
        userId: adminUser._id, 
        email: adminUser.email, 
        role: adminUser.role,
        roles: adminUser.roles || [adminUser.role]
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1h' }
    );
    
    console.log(`\n🔑 Generated token for: ${adminUser.email}`);
    
    // Test the API endpoint
    const departmentId = '68d10da16ba964074dd63cfd'; // CYBER SECURITY department
    console.log(`\n🔄 Testing API: /api/hierarchy/teachers-by-department/${departmentId}`);
    
    try {
      const response = await axios.get(
        `http://localhost:5000/api/hierarchy/teachers-by-department/${departmentId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('✅ API Response Status:', response.status);
      console.log('📊 Teachers Found:', JSON.stringify(response.data, null, 2));
      
    } catch (apiError) {
      console.error('❌ API Error:', apiError.response?.status, apiError.response?.data || apiError.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

testAPIWithAuth();