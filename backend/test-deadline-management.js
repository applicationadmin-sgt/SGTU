const axios = require('axios');

async function testDeadlineManagement() {
  try {
    console.log('🧪 Testing Deadline Management APIs');
    console.log('===================================');

    // Step 1: Login as admin
    console.log('🔐 Step 1: Login as admin...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'sourav11092002@gmail.com',
      password: 'Admin@1234'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful');

    // Step 2: Get units to work with
    console.log('\n📋 Step 2: Get units...');
    const coursesResponse = await axios.get('http://localhost:5000/api/admin/courses', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    // Step 2: Test with CSE123 course that has units
    console.log('\n📋 Step 2: Test with CSE123 course...');
    const cse123Course = coursesResponse.data.find(c => c.title === 'CSE123');
    if (!cse123Course) {
      console.log('❌ CSE123 course not found');
      return;
    }

    console.log('📚 Using course:', cse123Course.title, 'ID:', cse123Course._id);

    const unitsResponse = await axios.get(`http://localhost:5000/api/admin/course/${cse123Course._id}/units`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log(`✅ Found ${unitsResponse.data.length} units in CSE123`);
    
    if (unitsResponse.data.length === 0) {
      console.log('❌ No units returned from API, but database shows units exist');
      console.log('This suggests an issue with the getCourseUnits endpoint');
      return;
    }

    const testUnit = unitsResponse.data[0];
    console.log(`📝 Using unit: ${testUnit.title} (ID: ${testUnit._id})`);

    // Step 3: Test getting unit deadline info
    console.log('\n🔍 Step 3: Get unit deadline info...');
    try {
      const deadlineInfoResponse = await axios.get(`http://localhost:5000/api/admin/unit/${testUnit._id}/deadline`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('✅ Unit deadline info:', JSON.stringify(deadlineInfoResponse.data, null, 2));
    } catch (err) {
      console.log('❌ Error getting deadline info:', err.response?.data?.message || err.message);
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
      console.log('📊 Updated unit info:', JSON.stringify(addDeadlineResponse.data.unit, null, 2));
    } catch (err) {
      console.log('❌ Error adding deadline:', err.response?.data?.message || err.message);
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
      console.log('📊 Extended unit info:', JSON.stringify(extendResponse.data.unit, null, 2));
    } catch (err) {
      console.log('❌ Error extending deadline:', err.response?.data?.message || err.message);
    }

    // Step 6: Test modifying deadline
    console.log('\n✏️ Step 6: Modify deadline...');
    const modifyData = {
      hasDeadline: true,
      deadline: '2025-12-30T18:00:00', // Change time
      deadlineDescription: 'Modified deadline time for testing',
      strictDeadline: false, // Make it non-strict
      warningDays: 3,
      action: 'modify'
    };

    try {
      const modifyResponse = await axios.patch(`http://localhost:5000/api/admin/unit/${testUnit._id}/deadline`, modifyData, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Deadline modified successfully:', modifyResponse.data.message);
      console.log('📊 Modified unit info:', JSON.stringify(modifyResponse.data.unit, null, 2));
    } catch (err) {
      console.log('❌ Error modifying deadline:', err.response?.data?.message || err.message);
    }

    // Step 7: Test removing deadline
    console.log('\n🗑️ Step 7: Remove deadline...');
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
      console.log('📊 Final unit info:', JSON.stringify(removeResponse.data.unit, null, 2));
    } catch (err) {
      console.log('❌ Error removing deadline:', err.response?.data?.message || err.message);
    }

    console.log('\n🎉 Deadline management testing completed!');

  } catch (error) {
    console.log('❌ Test failed:', error.message);
    if (error.response) {
      console.log('Response data:', error.response.data);
    }
  }
}

testDeadlineManagement();