const axios = require('axios');

async function testHODEndpoints() {
  try {
    // First login to get HOD token
    console.log('🔐 Logging in as HOD...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'sourav1192002@gmail.com',
      password: '123456'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    
    const headers = { Authorization: `Bearer ${token}` };
    
    // Test HOD dashboard endpoint
    console.log('\n📊 Testing HOD Dashboard...');
    const dashboardResponse = await axios.get('http://localhost:5000/api/hod/dashboard', { headers });
    console.log('Dashboard data:', JSON.stringify(dashboardResponse.data, null, 2));
    
    // Test HOD sections endpoint
    console.log('\n📋 Testing HOD Sections...');
    const sectionsResponse = await axios.get('http://localhost:5000/api/hod/sections', { headers });
    console.log('Sections data:', JSON.stringify(sectionsResponse.data, null, 2));
    
    // Test specific section analytics
    if (sectionsResponse.data.sections && sectionsResponse.data.sections.length > 0) {
      const sectionId = sectionsResponse.data.sections[0]._id;
      console.log(`\n🔍 Testing Section Analytics for ${sectionId}...`);
      const analyticsResponse = await axios.get(`http://localhost:5000/api/hod/sections/${sectionId}/analytics`, { headers });
      console.log('Analytics data:', JSON.stringify(analyticsResponse.data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testHODEndpoints();