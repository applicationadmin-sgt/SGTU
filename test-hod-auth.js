/**
 * QUICK TEST: Check HOD Authentication
 * 
 * Purpose: Test the HOD endpoint with proper error logging
 */

const axios = require('axios');
const mongoose = require('mongoose');

// Test the HOD endpoint directly
async function testHodEndpoint() {
  try {
    const baseURL = 'http://localhost:3000';
    const hodToken = 'YOUR_HOD_JWT_TOKEN'; // Replace with actual token
    
    const response = await axios.get(`${baseURL}/api/quiz-unlock/hod-locked-students?courseId=68da652ec35425a4aff02532&sectionId=68da659ec35425a4aff0259e`, {
      headers: {
        'Authorization': `Bearer ${hodToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ HOD endpoint successful:', response.data);
    
  } catch (error) {
    console.error('❌ HOD endpoint failed:');
    console.error('Status:', error.response?.status);
    console.error('Message:', error.response?.data?.message);
    console.error('Debug info:', error.response?.data?.debug);
    console.error('Full error:', error.response?.data);
  }
}

// Alternative: Check database directly
async function checkHodInDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/sgtlms');
    console.log('✅ Connected to MongoDB');

    const User = require('./backend/models/User');
    
    // Find HOD users
    const hodUsers = await User.find({
      $or: [
        { role: 'hod' },
        { roles: { $in: ['hod'] } }
      ]
    }).populate('department').populate('departments');

    console.log(`📊 Found ${hodUsers.length} HOD users:`);
    
    hodUsers.forEach(hod => {
      console.log(`\n👤 HOD: ${hod.name} (${hod.email})`);
      console.log(`   ID: ${hod._id}`);
      console.log(`   Single department: ${hod.department ? hod.department.name : 'NOT SET'}`);
      console.log(`   Departments array: ${hod.departments ? hod.departments.map(d => d.name).join(', ') : 'EMPTY'}`);
      
      // Check what would work for this HOD
      let hodDepartments = [];
      if (hod.department) hodDepartments.push(hod.department._id);
      if (hod.departments && hod.departments.length > 0) {
        hodDepartments.push(...hod.departments.map(d => d._id));
      }
      
      console.log(`   ✅ Total departments: ${hodDepartments.length}`);
      console.log(`   Would pass auth: ${hodDepartments.length > 0 ? 'YES' : 'NO'}`);
    });

  } catch (error) {
    console.error('❌ Database check failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run database check only
if (require.main === module) {
  checkHodInDatabase();
}

module.exports = { testHodEndpoint, checkHodInDatabase };