const mongoose = require('mongoose');
const User = require('./models/User');
const Department = require('./models/Department');
require('dotenv').config();

async function checkHODUser() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    // Find the HOD user (Sourav)
    const hod = await User.findOne({ email: 'sourav1192002@gmail.com' })
      .populate('department', 'name code _id')
      .populate('departments', 'name code _id');
      
    if (!hod) {
      console.log('❌ HOD user not found');
      return;
    }
    
    console.log(`\n👤 HOD User: ${hod.name} (${hod.email})`);
    console.log(`🔵 Role: ${hod.role}`);
    console.log(`🔵 Roles: ${JSON.stringify(hod.roles)}`);
    console.log(`🔵 Primary Role: ${hod.primaryRole}`);
    console.log(`🏢 Single Department: ${hod.department?.name || 'None'} (${hod.department?._id})`);
    console.log(`🏢 Multiple Departments: ${hod.departments?.length || 0}`);
    
    if (hod.departments && hod.departments.length > 0) {
      console.log('📂 Department Details:');
      hod.departments.forEach((dept, index) => {
        console.log(`  ${index + 1}. ${dept.name} (${dept.code}) - ID: ${dept._id}`);
      });
    }
    
    // Check if the HOD dashboard API would work with current data
    const departmentId = hod.department?._id;
    console.log(`\n🔍 Dashboard would query department: ${departmentId || 'NONE - This is the problem!'}`);
    
    if (!departmentId) {
      console.log('❌ This explains why all dashboard stats are 0!');
      console.log('💡 The HOD has no single department assigned, need to use departments array');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

checkHODUser();