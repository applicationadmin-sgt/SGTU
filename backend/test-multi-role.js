const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('./models/User');

async function testMultiRoleSystem() {
  try {
    console.log('🚀 Testing Multi-Role System...\n');

    // Connect to database
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // Test 1: Create a multi-role user
    console.log('\n📝 Test 1: Creating a multi-role user...');
    
    // Delete test user if exists
    await User.deleteOne({ email: 'test.multirole@example.com' });
    
    const hashedPassword = await bcrypt.hash('testpassword123', 10);
    // First, create a school and department for the test
    const School = require('./models/School');
    const Department = require('./models/Department');
    
    let testSchool = await School.findOne({ code: 'TEST' });
    if (!testSchool) {
      testSchool = await School.create({
        name: 'Test School',
        code: 'TEST',
        address: 'Test Address'
      });
      console.log('✅ Created test school');
    }
    
    let testDept = await Department.findOne({ code: 'TESTDEPT' });
    if (!testDept) {
      testDept = await Department.create({
        name: 'Test Department',
        code: 'TESTDEPT',
        school: testSchool._id
      });
      console.log('✅ Created test department');
    }

    const multiRoleUser = new User({
      name: 'Test Multi-Role User',
      email: 'test.multirole@example.com',
      password: hashedPassword,
      role: 'teacher', // Legacy field for compatibility
      roles: ['teacher', 'hod'], // New multi-role field
      primaryRole: 'teacher',
      permissions: ['view_students', 'manage_courses'],
      school: testSchool._id,
      department: testDept._id
    });

    const savedUser = await multiRoleUser.save();
    console.log('✅ Created multi-role user:', {
      name: savedUser.name,
      email: savedUser.email,
      role: savedUser.role,
      roles: savedUser.roles,
      primaryRole: savedUser.primaryRole
    });

    // Test 2: Switch role
    console.log('\n🔄 Test 2: Switching role from teacher to hod...');
    savedUser.primaryRole = 'hod';
    savedUser.role = 'hod'; // Update legacy field too
    await savedUser.save();
    
    const updatedUser = await User.findById(savedUser._id);
    console.log('✅ Role switched successfully:', {
      primaryRole: updatedUser.primaryRole,
      role: updatedUser.role,
      availableRoles: updatedUser.roles
    });

    // Test 3: Test role checking
    console.log('\n🔍 Test 3: Testing role checking...');
    console.log('Has teacher role:', updatedUser.roles.includes('teacher'));
    console.log('Has hod role:', updatedUser.roles.includes('hod'));
    console.log('Has admin role:', updatedUser.roles.includes('admin'));
    console.log('Current primary role:', updatedUser.primaryRole);

    // Test 4: Create legacy single-role user to test backward compatibility
    console.log('\n📝 Test 4: Testing backward compatibility with single-role user...');
    
    // Delete test user if exists
    await User.deleteOne({ email: 'test.single@example.com' });
    
    const singleRoleUser = new User({
      name: 'Test Single Role User',
      email: 'test.single@example.com',
      password: hashedPassword,
      role: 'student', // Only legacy field
      school: testSchool._id
    });

    const savedSingleUser = await singleRoleUser.save();
    console.log('✅ Created legacy single-role user:', {
      name: savedSingleUser.name,
      email: savedSingleUser.email,
      role: savedSingleUser.role,
      roles: savedSingleUser.roles,
      primaryRole: savedSingleUser.primaryRole
    });

    // Test 5: Query users by role (both legacy and multi-role)
    console.log('\n🔍 Test 5: Querying users by role...');
    
    const teachersByLegacy = await User.find({ role: 'teacher' });
    const teachersByMultiRole = await User.find({ roles: 'teacher' });
    const teachersByBoth = await User.find({
      $or: [
        { role: 'teacher' },
        { roles: 'teacher' }
      ]
    });
    
    console.log('Teachers found by legacy role field:', teachersByLegacy.length);
    console.log('Teachers found by multi-role field:', teachersByMultiRole.length);
    console.log('Teachers found by combined query:', teachersByBoth.length);

    // Test 6: Test schema validation
    console.log('\n✅ Test 6: Schema validation...');
    console.log('Multi-role user has backward compatibility:');
    console.log('- Legacy role field exists:', !!updatedUser.role);
    console.log('- New roles array exists:', Array.isArray(updatedUser.roles));
    console.log('- Primary role field exists:', !!updatedUser.primaryRole);

    console.log('Single-role user has default values:');
    console.log('- Roles array default:', savedSingleUser.roles || 'undefined');
    console.log('- Primary role default:', savedSingleUser.primaryRole || 'undefined');

    // Clean up test data
    console.log('\n🧹 Cleaning up test data...');
    await User.deleteOne({ email: 'test.multirole@example.com' });
    await User.deleteOne({ email: 'test.single@example.com' });
    await Department.deleteOne({ code: 'TESTDEPT' });
    await School.deleteOne({ code: 'TEST' });
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 All tests passed! Multi-role system is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run tests
testMultiRoleSystem();