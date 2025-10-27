/**
 * Verify UID Migration Results
 * 
 * This script verifies all users have UIDs and shows the current state
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function verifyUIDs() {
  try {
    console.log('🔧 Connecting to MongoDB...');
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Get all users
    const users = await User.find({}).sort({ uid: 1 });
    
    console.log('═'.repeat(80));
    console.log('📊 ALL USERS WITH UIDs');
    console.log('═'.repeat(80));
    console.log();

    let staffCount = 0;
    let studentCount = 0;
    let noUIDCount = 0;

    // Group by role type
    console.log('👨‍🏫 STAFF MEMBERS:');
    console.log('─'.repeat(80));
    users.forEach(user => {
      const roles = user.roles || [user.role];
      const isStaff = roles.some(r => ['teacher', 'hod', 'dean', 'admin'].includes(r));
      
      if (isStaff) {
        staffCount++;
        const roleStr = roles.join(', ').toUpperCase();
        console.log(`${user.uid || 'NO UID'} | ${user.name.padEnd(25)} | ${roleStr.padEnd(15)} | ${user.email}`);
        if (!user.uid) noUIDCount++;
      }
    });

    console.log();
    console.log('👨‍🎓 STUDENTS:');
    console.log('─'.repeat(80));
    users.forEach(user => {
      const roles = user.roles || [user.role];
      const isStudent = roles.includes('student');
      
      if (isStudent) {
        studentCount++;
        const regNoStr = user.regNo ? ` (RegNo: ${user.regNo})` : '';
        console.log(`${user.uid || 'NO UID'} | ${user.name.padEnd(25)} | ${user.email}${regNoStr}`);
        if (!user.uid) noUIDCount++;
      }
    });

    console.log();
    console.log('═'.repeat(80));
    console.log('📈 SUMMARY:');
    console.log('─'.repeat(80));
    console.log(`Total Users:        ${users.length}`);
    console.log(`Staff Members:      ${staffCount}`);
    console.log(`Students:           ${studentCount}`);
    console.log(`Users without UID:  ${noUIDCount}`);
    console.log();

    // Check for duplicates
    const uidCounts = {};
    users.forEach(user => {
      if (user.uid) {
        uidCounts[user.uid] = (uidCounts[user.uid] || 0) + 1;
      }
    });

    const duplicates = Object.entries(uidCounts).filter(([uid, count]) => count > 1);
    if (duplicates.length === 0) {
      console.log('✅ No duplicate UIDs found');
    } else {
      console.log('❌ DUPLICATE UIDs FOUND:');
      duplicates.forEach(([uid, count]) => {
        console.log(`   ${uid}: ${count} users`);
      });
    }

    // Verify formats
    let invalidFormat = 0;
    users.forEach(user => {
      if (user.uid) {
        const roles = user.roles || [user.role];
        const isStaff = roles.some(r => ['teacher', 'hod', 'dean', 'admin'].includes(r));
        const isStudent = roles.includes('student');

        if (isStaff && !/^T\d{5}$/.test(user.uid)) {
          console.log(`❌ Invalid staff UID format: ${user.uid} for ${user.name}`);
          invalidFormat++;
        }
        if (isStudent && !/^S\d{8,}$/.test(user.uid)) {
          console.log(`❌ Invalid student UID format: ${user.uid} for ${user.name}`);
          invalidFormat++;
        }
      }
    });

    if (invalidFormat === 0) {
      console.log('✅ All UIDs have correct format');
    }

    console.log();
    console.log('═'.repeat(80));
    
    if (noUIDCount === 0 && duplicates.length === 0 && invalidFormat === 0) {
      console.log('✅ UID MIGRATION SUCCESSFUL!');
      console.log('All users have valid, unique UIDs in the correct format.');
    } else {
      console.log('⚠️  MIGRATION INCOMPLETE');
      console.log('Some issues were found. Please review the output above.');
    }
    console.log('═'.repeat(80));

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    console.error(error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

verifyUIDs();
