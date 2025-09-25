const mongoose = require('mongoose');
const User = require('./models/User');
const School = require('./models/School');
const Department = require('./models/Department');

// Connect to local MongoDB
const connectDB = async () => {
  try {
    // Connect to the same database as the backend application
    await mongoose.connect('mongodb://localhost:27017/sgt3');
    console.log('✅ MongoDB connected to: mongodb://localhost:27017/sgt3');
    console.log('📚 Database name: sgt3');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const checkHODUser = async () => {
  await connectDB();
  
  try {
    console.log('🔍 Looking for hod@gmail.com user...');
    
    const hodUser = await User.findOne({ email: 'hod@gmail.com' })
      .populate('school', 'name code')
      .populate('department', 'name code')
      .populate('departments', 'name code');
    
    if (hodUser) {
      console.log('👤 Found HOD user:');
      console.log('  ID:', hodUser._id);
      console.log('  Name:', hodUser.name);
      console.log('  Email:', hodUser.email);
      console.log('  Roles:', hodUser.roles);
      console.log('  Primary Role:', hodUser.primaryRole);
      console.log('  Legacy Role:', hodUser.role);
      console.log('  School:', hodUser.school);
      console.log('  Department (legacy):', hodUser.department);
      console.log('  Departments (new):', hodUser.departments);
      console.log('  Raw departments field:', hodUser.toObject().departments);
    } else {
      console.log('❌ HOD user not found');
    }
    
    // Also check all HOD users
    console.log('\n📋 All HOD users:');
    const allHODs = await User.find({ 
      $or: [
        { roles: 'hod' },
        { role: 'hod' }
      ]
    })
    .populate('school', 'name code')
    .populate('department', 'name code')  
    .populate('departments', 'name code');
    
    allHODs.forEach(hod => {
      console.log(`  - ${hod.name} (${hod.email})`);
      console.log(`    ID: ${hod._id}`);
      console.log(`    Departments: ${hod.departments?.length || 0} departments`);
      console.log(`    Legacy Dept: ${hod.department?.name || 'None'}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking HOD user:', error);
  } finally {
    mongoose.connection.close();
  }
};

checkHODUser();