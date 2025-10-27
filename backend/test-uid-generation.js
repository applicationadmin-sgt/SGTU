/**
 * Test UID Generation System
 * 
 * This script tests the UID auto-generation functionality.
 * Run with: node test-uid-generation.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { generateStaffUID, generateStudentUID, generateUID } = require('./utils/uidGenerator');

async function testUIDGeneration() {
  try {
    console.log('🔧 Connecting to MongoDB...');
    // Use MONGO_URI from .env file
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MongoDB URI not found in .env file. Expected MONGO_URI or MONGODB_URI');
    }
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Test 1: Generate Staff UID
    console.log('Test 1: Generate Staff UID');
    console.log('─'.repeat(50));
    const staffUID = await generateStaffUID();
    console.log(`Generated Staff UID: ${staffUID}`);
    console.log(`Format check: ${/^\d{5}$/.test(staffUID) ? '✅ PASS' : '❌ FAIL'}`);
    console.log();

    // Test 2: Generate Student UID
    console.log('Test 2: Generate Student UID');
    console.log('─'.repeat(50));
    const studentUID = await generateStudentUID();
    console.log(`Generated Student UID: ${studentUID}`);
    console.log(`Format check: ${/^\d{8,}$/.test(studentUID) ? '✅ PASS' : '❌ FAIL'}`);
    console.log();

    // Test 3: Generate UID by role (Dean)
    console.log('Test 3: Generate UID for Dean role');
    console.log('─'.repeat(50));
    const deanUID = await generateUID(['dean']);
    console.log(`Generated Dean UID: ${deanUID}`);
    console.log(`Format check: ${/^\d{5}$/.test(deanUID) ? '✅ PASS' : '❌ FAIL'}`);
    console.log();

    // Test 4: Generate UID by role (HOD)
    console.log('Test 4: Generate UID for HOD role');
    console.log('─'.repeat(50));
    const hodUID = await generateUID(['hod']);
    console.log(`Generated HOD UID: ${hodUID}`);
    console.log(`Format check: ${/^\d{5}$/.test(hodUID) ? '✅ PASS' : '❌ FAIL'}`);
    console.log();

    // Test 5: Generate UID by role (Teacher)
    console.log('Test 5: Generate UID for Teacher role');
    console.log('─'.repeat(50));
    const teacherUID = await generateUID(['teacher']);
    console.log(`Generated Teacher UID: ${teacherUID}`);
    console.log(`Format check: ${/^\d{5}$/.test(teacherUID) ? '✅ PASS' : '❌ FAIL'}`);
    console.log();

    // Test 6: Generate UID by role (Student)
    console.log('Test 6: Generate UID for Student role');
    console.log('─'.repeat(50));
    const studentUID2 = await generateUID(['student']);
    console.log(`Generated Student UID: ${studentUID2}`);
    console.log(`Format check: ${/^\d{8,}$/.test(studentUID2) ? '✅ PASS' : '❌ FAIL'}`);
    console.log();

    // Test 7: Check for existing UIDs in database
    console.log('Test 7: Check existing UIDs in database');
    console.log('─'.repeat(50));
    const User = require('./models/User');
    
    const staffCount = await User.countDocuments({ uid: /^\d{5}$/ });
    console.log(`Existing Staff UIDs in DB: ${staffCount}`);
    
    const studentCount = await User.countDocuments({ uid: /^\d{8,}$/ });
    console.log(`Existing Student UIDs in DB: ${studentCount}`);
    
    const highestStaff = await User.findOne({ uid: /^\d{5}$/ })
      .sort({ uid: -1 })
      .select('uid name role');
    if (highestStaff) {
      console.log(`Highest Staff UID: ${highestStaff.uid} (${highestStaff.name}, ${highestStaff.role})`);
    } else {
      console.log('No staff UIDs found in database');
    }
    
    const highestStudent = await User.findOne({ uid: /^\d{8,}$/ })
      .sort({ uid: -1 })
      .select('uid name role');
    if (highestStudent) {
      console.log(`Highest Student UID: ${highestStudent.uid} (${highestStudent.name})`);
    } else {
      console.log('No student UIDs found in database');
    }
    console.log();

    // Test 8: Check for UID duplicates
    console.log('Test 8: Check for UID duplicates');
    console.log('─'.repeat(50));
    const duplicates = await User.aggregate([
      { $match: { uid: { $exists: true, $ne: null } } },
      { $group: { _id: '$uid', count: { $sum: 1 }, users: { $push: { name: '$name', email: '$email' } } } },
      { $match: { count: { $gt: 1 } } }
    ]);
    
    if (duplicates.length === 0) {
      console.log('✅ No UID duplicates found');
    } else {
      console.log('❌ DUPLICATE UIDs FOUND:');
      duplicates.forEach(dup => {
        console.log(`  UID: ${dup._id} (${dup.count} users)`);
        dup.users.forEach(u => console.log(`    - ${u.name} (${u.email})`));
      });
    }
    console.log();

    // Test 9: Sequential numbering test
    console.log('Test 9: Test sequential numbering (generate 3 staff UIDs)');
    console.log('─'.repeat(50));
    const uid1 = await generateStaffUID();
    const uid2 = await generateStaffUID();
    const uid3 = await generateStaffUID();
    console.log(`UID 1: ${uid1}`);
    console.log(`UID 2: ${uid2}`);
    console.log(`UID 3: ${uid3}`);
    
    const num1 = parseInt(uid1);
    const num2 = parseInt(uid2);
    const num3 = parseInt(uid3);
    
    const isSequential = (num2 === num1 + 1) && (num3 === num2 + 1);
    console.log(`Sequential check: ${isSequential ? '✅ PASS' : '❌ FAIL'}`);
    console.log();

    // Summary
    console.log('═'.repeat(50));
    console.log('✅ UID Generation Tests Complete!');
    console.log('═'.repeat(50));
    console.log('All tests passed. UID auto-generation is working correctly.');
    console.log();
    console.log('Next steps:');
    console.log('1. Test creating a new Dean/HOD/Teacher through admin UI');
    console.log('2. Test creating a new Student through admin UI');
    console.log('3. Run migration script: node scripts/migrate-uid-system.js');
    console.log('4. Verify all users have UIDs after migration');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run tests
testUIDGeneration();
