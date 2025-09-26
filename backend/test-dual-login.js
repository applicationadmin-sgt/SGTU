const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'http://localhost:5000';

async function testDualLoginMethods() {
  console.log('🧪 Testing Dual Login Methods (Email + UID)...\n');
  
  const tests = [
    {
      name: 'Admin Login via Email',
      credentials: { email: 'sourav11092002@gmail.com', password: 'Admin@1234' },
      expectedRole: 'admin'
    },
    {
      name: 'Student Login via Email',
      credentials: { email: 'rahul@gmail.com', password: '123456' },
      expectedRole: 'student'
    },
    {
      name: 'Student Login via UID (regNo)',
      credentials: { email: 'S999991', password: '123456' },
      expectedRole: 'student'
    },
    {
      name: 'Teacher Login via UID (teacherId)',
      credentials: { email: 'T0001', password: '123456' },
      expectedRole: 'teacher'
    },
    {
      name: 'Invalid Email Login',
      credentials: { email: 'invalid@example.com', password: 'wrong' },
      expectedRole: null // Should fail
    },
    {
      name: 'Invalid UID Login',
      credentials: { email: 'INVALID123', password: 'wrong' },
      expectedRole: null // Should fail
    }
  ];
  
  for (const test of tests) {
    console.log(`🔐 ${test.name}`);
    try {
      const response = await axios.post(`${BASE_URL}/api/auth/login`, test.credentials);
      
      if (test.expectedRole) {
        console.log(`✅ SUCCESS: ${response.data.user.name} (${response.data.user.role})`);
        console.log(`   Login identifier: ${test.credentials.email}`);
        console.log(`   Expected role: ${test.expectedRole}, Actual: ${response.data.user.role}`);
        
        if (response.data.user.role === test.expectedRole) {
          console.log('   ✅ Role matches expected\n');
        } else {
          console.log('   ⚠️ Role mismatch\n');
        }
      } else {
        console.log(`❌ Should have failed but succeeded: ${response.data.user.name}\n`);
      }
      
    } catch (error) {
      if (test.expectedRole) {
        console.log(`❌ FAILED: ${error.response?.data?.message || error.message}\n`);
      } else {
        console.log(`✅ Correctly rejected: ${error.response?.data?.message || error.message}\n`);
      }
    }
  }
  
  console.log('🎉 Dual Login Methods testing completed!');
}

// Run the test
testDualLoginMethods();