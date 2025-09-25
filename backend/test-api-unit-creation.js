const axios = require('axios');

async function testUnitCreationAPI() {
  try {
    console.log('🧪 Testing Unit Creation API');
    console.log('============================');

    // Step 1: Login as admin to get a valid token
    console.log('🔐 Step 1: Login as admin...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'sourav11092002@gmail.com',
      password: 'Admin@1234'
    });
    
    console.log('✅ Login successful');
    const token = loginResponse.data.token;

    // Step 2: Get courses to find a valid course ID
    console.log('📋 Step 2: Get courses...');
    const coursesResponse = await axios.get('http://localhost:5000/api/admin/courses', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Courses fetched:', coursesResponse.data.length, 'courses found');
    
    if (coursesResponse.data.length === 0) {
      console.log('❌ No courses found to test with');
      return;
    }

    // Show all available courses
    console.log('📚 Available courses:');
    coursesResponse.data.forEach((course, index) => {
      console.log(`  ${index + 1}. ${course.title} (ID: ${course._id})`);
    });

    const courseId = coursesResponse.data[0]._id;
    console.log('📚 Using course:', coursesResponse.data[0].title, 'ID:', courseId);

    // Step 3: Create a unit with deadline data
    console.log('📝 Step 3: Creating unit with deadline...');
    const unitData = {
      title: 'TEST UNIT WITH DEADLINE - API TEST',
      description: 'Testing deadline creation through API',
      unitNumber: 9999,
      hasDeadline: true,
      deadline: '2025-12-31T23:59:00',
      deadlineDescription: 'Year end test deadline',
      strictDeadline: true,
      warningDays: 5
    };

    console.log('📤 Sending unit data:', JSON.stringify(unitData, null, 2));

    const createResponse = await axios.post(`http://localhost:5000/api/admin/course/${courseId}/unit`, unitData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Unit creation response status:', createResponse.status);
    console.log('📥 Created unit:', JSON.stringify(createResponse.data, null, 2));

    // Step 4: Verify the unit was created with deadline fields
    const createdUnitId = createResponse.data.unit?._id || createResponse.data._id;
    if (createdUnitId) {
      console.log('🔍 Step 4: Verifying unit in database...');
      
      // We can use our database script to check
      const mongoose = require('mongoose');
      require('dotenv').config();
      const Unit = require('./models/Unit');
      
      await mongoose.connect(process.env.MONGODB_URI);
      const unit = await Unit.findById(createdUnitId).lean();
      
      console.log('💾 Database verification:');
      console.log('hasDeadline:', unit.hasDeadline);
      console.log('deadline:', unit.deadline);
      console.log('deadlineDescription:', unit.deadlineDescription);
      console.log('strictDeadline:', unit.strictDeadline);
      console.log('warningDays:', unit.warningDays);

      // Clean up test unit
      await Unit.findByIdAndDelete(createdUnitId);
      console.log('🗑️ Test unit cleaned up');
      
      await mongoose.disconnect();
    }
    
  } catch (error) {
    if (error.response) {
      console.log('❌ API Error:', error.response.status, error.response.data);
    } else {
      console.log('❌ Network Error:', error.message);
    }
  }
}

testUnitCreationAPI();