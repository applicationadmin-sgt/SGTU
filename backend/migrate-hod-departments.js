const mongoose = require('mongoose');
const User = require('./models/User');
const School = require('./models/School');
const Department = require('./models/Department');

// Connect to local MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/sgt3');
    console.log('✅ MongoDB connected to: mongodb://localhost:27017/sgt3');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const migrateHODToMultiDepartment = async () => {
  await connectDB();
  
  try {
    console.log('🔄 Migrating HOD users to multi-department system...');
    
    // Find all HOD users
    const hodUsers = await User.find({
      $or: [
        { roles: 'hod' },
        { role: 'hod' }
      ]
    }).populate('department', 'name code');
    
    console.log(`Found ${hodUsers.length} HOD users to migrate`);
    
    for (const hod of hodUsers) {
      console.log(`\n🔄 Migrating ${hod.name} (${hod.email}):`);
      
      let needsUpdate = false;
      const updates = {};
      
      // Ensure roles array is set up
      if (!hod.roles || hod.roles.length === 0) {
        updates.roles = [hod.role];
        updates.primaryRole = hod.role;
        needsUpdate = true;
        console.log('  ✓ Set up roles array and primary role');
      }
      
      // Migrate department to departments array
      if (hod.department && (!hod.departments || hod.departments.length === 0)) {
        updates.departments = [hod.department._id];
        needsUpdate = true;
        console.log(`  ✓ Added department "${hod.department.name}" to departments array`);
      }
      
      if (needsUpdate) {
        await User.findByIdAndUpdate(hod._id, updates);
        console.log('  ✅ Migration completed for this user');
      } else {
        console.log('  ℹ️  No migration needed for this user');
      }
    }
    
    // Verify the migration
    console.log('\n📋 Verification - checking updated HOD users:');
    const updatedHODs = await User.find({
      $or: [
        { roles: 'hod' },
        { role: 'hod' }
      ]
    })
    .populate('school', 'name code')
    .populate('department', 'name code')  
    .populate('departments', 'name code');
    
    updatedHODs.forEach(hod => {
      console.log(`\n👤 ${hod.name} (${hod.email}):`);
      console.log(`  Roles: ${JSON.stringify(hod.roles)}`);
      console.log(`  Primary Role: ${hod.primaryRole}`);
      console.log(`  Legacy Department: ${hod.department?.name || 'None'}`);
      console.log(`  Departments Array: ${hod.departments?.length || 0} departments`);
      if (hod.departments?.length > 0) {
        hod.departments.forEach((dept, index) => {
          console.log(`    ${index + 1}. ${dept.name} (${dept.code})`);
        });
      }
    });
    
    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
  } finally {
    mongoose.connection.close();
  }
};

migrateHODToMultiDepartment();