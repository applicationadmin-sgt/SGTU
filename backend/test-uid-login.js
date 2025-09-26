const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'http://localhost:5000';

async function testUIDLogin() {
  console.log('🧪 Testing UID Login Functionality...\n');
  
  try {
    // Test 1: Login with email (should still work)
    console.log('🔐 Test 1: Login with Email');
    try {
      const emailLoginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: 'sourav11092002@gmail.com', // Admin email from .env
        password: 'Admin@1234' // Admin password from .env
      });
      
      console.log('✅ Email login successful!');
      console.log(`   User: ${emailLoginResponse.data.user.name} (${emailLoginResponse.data.user.role})`);
      console.log(`   Token length: ${emailLoginResponse.data.token.length}\n`);
    } catch (error) {
      console.log('❌ Email login failed:', error.response?.data?.message || error.message, '\n');
    }
    
    // Test 2: Login with student regNo (UID)
    console.log('🔐 Test 2: Login with Student UID (regNo)');
    
    // First, let's find a student with regNo to test with
    console.log('   Finding students with regNo...');
    const mongoose = require('mongoose');
    const User = require('./models/User');
    
    await mongoose.connect(process.env.MONGO_URI);
    console.log('   Connected to MongoDB');
    
    // Find a student with regNo and known password
    const studentWithRegNo = await User.findOne({ 
      regNo: { $exists: true, $ne: null },
      $or: [
        { role: 'student' },
        { roles: { $in: ['student'] } }
      ]
    });
    
    if (studentWithRegNo) {
      console.log(`   Found student: ${studentWithRegNo.name} (regNo: ${studentWithRegNo.regNo})`);
      
      // Try common passwords for students
      const commonPasswords = ['123456', 'student123', 'password', studentWithRegNo.name.toLowerCase() + '123'];
      
      for (const password of commonPasswords) {
        try {
          const regNoLoginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: studentWithRegNo.regNo, // Using regNo as the login identifier
            password: password
          });
          
          console.log('✅ Student UID login successful!');
          console.log(`   User: ${regNoLoginResponse.data.user.name} (${regNoLoginResponse.data.user.role})`);
          console.log(`   Logged in with regNo: ${studentWithRegNo.regNo}`);
          console.log(`   Password used: ${password}\n`);
          break;
        } catch (error) {
          console.log(`   ❌ Password "${password}" failed for regNo ${studentWithRegNo.regNo}`);
        }
      }
    } else {
      console.log('   ⚠️ No student with regNo found in database\n');
    }
    
    // Test 3: Login with teacher teacherId (UID)
    console.log('🔐 Test 3: Login with Teacher UID (teacherId)');
    
    // Find a teacher with teacherId
    const teacherWithId = await User.findOne({ 
      teacherId: { $exists: true, $ne: null },
      $or: [
        { role: 'teacher' },
        { roles: { $in: ['teacher'] } }
      ]
    });
    
    if (teacherWithId) {
      console.log(`   Found teacher: ${teacherWithId.name} (teacherId: ${teacherWithId.teacherId})`);
      
      // Try common passwords for teachers
      const commonPasswords = ['123456', 'teacher123', 'password', teacherWithId.name.toLowerCase() + '123'];
      
      for (const password of commonPasswords) {
        try {
          const teacherIdLoginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: teacherWithId.teacherId, // Using teacherId as the login identifier
            password: password
          });
          
          console.log('✅ Teacher UID login successful!');
          console.log(`   User: ${teacherIdLoginResponse.data.user.name} (${teacherIdLoginResponse.data.user.role})`);
          console.log(`   Logged in with teacherId: ${teacherWithId.teacherId}`);
          console.log(`   Password used: ${password}\n`);
          break;
        } catch (error) {
          console.log(`   ❌ Password "${password}" failed for teacherId ${teacherWithId.teacherId}`);
        }
      }
    } else {
      console.log('   ⚠️ No teacher with teacherId found in database\n');
    }
    
    // Test 4: Test invalid UID
    console.log('🔐 Test 4: Login with Invalid UID');
    try {
      await axios.post(`${BASE_URL}/api/auth/login`, {
        email: 'INVALID_UID_12345',
        password: 'anypassword'
      });
      console.log('❌ Should have failed but didn\'t');
    } catch (error) {
      console.log('✅ Invalid UID correctly rejected:', error.response?.data?.message);
    }
    
    console.log('\n🎉 UID Login testing completed!');
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  } finally {
    process.exit(0);
  }
}

// Run the test
testUIDLogin();