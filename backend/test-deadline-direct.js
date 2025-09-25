const axios = require('axios');

async function testDeadlineManagementDirect() {
  try {
    console.log('🧪 Testing Deadline Management APIs (Direct Unit)');
    console.log('================================================');

    // Step 1: Login as admin
    console.log('🔐 Step 1: Login as admin...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'sourav11092002@gmail.com',
      password: 'Admin@1234'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful');

    // Step 2: Use a known unit ID from our debug output
    // From the debug output, we know "cns" unit exists with ID that we can get
    // Let's use any unit that we know exists
    const knownUnitIds = [
      '68bec45cc1a9d9ac3fa6a3a5', // This might be one of the CSE123 units
      // We'll test with any available unit ID
    ];

    // Actually, let's just test a completely new unit we create
    console.log('\n➕ Step 2: Create a test unit...');
    
    // First get courses
    const coursesResponse = await axios.get('http://localhost:5000/api/admin/courses', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const cse123Course = coursesResponse.data.find(c => c.title === 'CSE123');
    if (!cse123Course) {
      console.log('❌ CSE123 course not found');
      return;
    }

    // Create a test unit
    const newUnitData = {
      title: 'DEADLINE TEST UNIT',
      description: 'Unit created specifically for testing deadline management',
      unitNumber: 9999,
      hasDeadline: false // Start without deadline
    };

    const createUnitResponse = await axios.post(`http://localhost:5000/api/admin/course/${cse123Course._id}/unit`, newUnitData, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const testUnit = createUnitResponse.data.unit || createUnitResponse.data;
    console.log('✅ Test unit created:', testUnit.title, 'ID:', testUnit._id);

    // Step 3: Test getting unit deadline info
    console.log('\n🔍 Step 3: Get unit deadline info...');
    try {
      const deadlineInfoResponse = await axios.get(`http://localhost:5000/api/admin/unit/${testUnit._id}/deadline`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('✅ Unit deadline info:', JSON.stringify(deadlineInfoResponse.data, null, 2));
    } catch (err) {
      console.log('❌ Error getting deadline info:', err.response?.status, err.response?.data?.message || err.message);
    }

    // Step 4: Test adding a deadline to the unit
    console.log('\n➕ Step 4: Add deadline to unit...');
    const deadlineData = {
      hasDeadline: true,
      deadline: '2025-12-25T23:59:00',
      deadlineDescription: 'Christmas deadline for testing',
      strictDeadline: true,
      warningDays: 5,
      action: 'add'
    };

    try {
      const addDeadlineResponse = await axios.patch(`http://localhost:5000/api/admin/unit/${testUnit._id}/deadline`, deadlineData, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Deadline added successfully:', addDeadlineResponse.data.message);
      console.log('📊 Updated unit info:');
      console.log('  - hasDeadline:', addDeadlineResponse.data.unit.hasDeadline);
      console.log('  - deadline:', addDeadlineResponse.data.unit.deadline);
      console.log('  - description:', addDeadlineResponse.data.unit.deadlineDescription);
      console.log('  - isExpired:', addDeadlineResponse.data.unit.isExpired);
      console.log('  - daysRemaining:', addDeadlineResponse.data.unit.daysRemaining);
    } catch (err) {
      console.log('❌ Error adding deadline:', err.response?.status, err.response?.data?.message || err.message);
    }

    // Step 5: Test extending the deadline
    console.log('\n🔄 Step 5: Extend deadline...');
    const extendData = {
      hasDeadline: true,
      deadline: '2025-12-31T23:59:00', // Extend to New Year
      deadlineDescription: 'Extended to New Year for testing',
      strictDeadline: true,
      warningDays: 7,
      action: 'extend'
    };

    try {
      const extendResponse = await axios.patch(`http://localhost:5000/api/admin/unit/${testUnit._id}/deadline`, extendData, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Deadline extended successfully:', extendResponse.data.message);
      console.log('📊 Extended unit - days remaining:', extendResponse.data.unit.daysRemaining);
    } catch (err) {
      console.log('❌ Error extending deadline:', err.response?.status, err.response?.data?.message || err.message);
    }

    // Step 6: Test removing deadline
    console.log('\n🗑️ Step 6: Remove deadline...');
    const removeData = {
      hasDeadline: false,
      action: 'remove'
    };

    try {
      const removeResponse = await axios.patch(`http://localhost:5000/api/admin/unit/${testUnit._id}/deadline`, removeData, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Deadline removed successfully:', removeResponse.data.message);
      console.log('📊 Final unit hasDeadline:', removeResponse.data.unit.hasDeadline);
    } catch (err) {
      console.log('❌ Error removing deadline:', err.response?.status, err.response?.data?.message || err.message);
    }

    // Clean up: Delete the test unit
    console.log('\n🗑️ Cleanup: Delete test unit...');
    try {
      await axios.delete(`http://localhost:5000/api/admin/unit/${testUnit._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('✅ Test unit deleted');
    } catch (err) {
      console.log('⚠️ Could not delete test unit (not critical)');
    }

    console.log('\n🎉 Deadline management testing completed successfully!');

  } catch (error) {
    console.log('❌ Test failed:', error.message);
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', error.response.data);
    }
  }
}

testDeadlineManagementDirect();