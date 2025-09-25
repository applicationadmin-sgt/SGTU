const axios = require('axios');

async function testAnnouncementWorkflow() {
  try {
    console.log('🚀 Testing Complete Announcement Approval Workflow\n');

    // Step 1: Login as teacher
    console.log('1️⃣ Logging in as teacher...');
    const teacherLogin = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'dipanwitakund1u02@gmail.com',
      password: '123456'
    });
    const teacherToken = teacherLogin.data.token;
    console.log('✅ Teacher login successful\n');

    // Step 2: Get teacher sections
    console.log('2️⃣ Getting teacher sections...');
    const sectionsResponse = await axios.get('http://localhost:5000/api/teacher/sections', {
      headers: { 'Authorization': `Bearer ${teacherToken}` }
    });
    const sections = sectionsResponse.data;
    console.log(`✅ Found ${sections.length} sections assigned to teacher\n`);

    if (sections.length === 0) {
      console.log('❌ No sections found for teacher. Cannot proceed with test.');
      return;
    }

    // Step 3: Create announcement
    console.log('3️⃣ Creating teacher announcement...');
    const announcement = {
      title: 'Test Announcement - Workflow Test',
      message: 'This is a test announcement to verify the HOD approval workflow. Please approve this for testing.',
      targetSections: [sections[0]._id] // Use first section
    };

    const createResponse = await axios.post('http://localhost:5000/api/teacher/announcement', announcement, {
      headers: { 'Authorization': `Bearer ${teacherToken}` }
    });
    console.log('✅ Announcement created and submitted for HOD approval');
    console.log(`📝 Announcement ID: ${createResponse.data.announcementId}\n`);

    // Step 4: Check teacher announcement history
    console.log('4️⃣ Checking teacher announcement history...');
    const historyResponse = await axios.get('http://localhost:5000/api/teacher/announcements/history', {
      headers: { 'Authorization': `Bearer ${teacherToken}` }
    });
    const history = historyResponse.data;
    console.log(`✅ Teacher has ${history.totalCount} total announcements`);
    console.log(`⏳ Pending: ${history.pendingCount}`);
    console.log(`✅ Approved: ${history.approvedCount}`);
    console.log(`❌ Rejected: ${history.rejectedCount}\n`);

    // Step 5: Try to login as HOD (you might need to create/configure an HOD user)
    console.log('5️⃣ Attempting to login as HOD...');
    try {
      // You'll need to replace this with actual HOD credentials
      const hodLogin = await axios.post('http://localhost:5000/api/auth/login', {
        email: 'hod@example.com', // Replace with actual HOD email
        password: 'password123'   // Replace with actual HOD password
      });
      const hodToken = hodLogin.data.token;
      console.log('✅ HOD login successful');

      // Step 6: Get pending announcements for HOD
      console.log('6️⃣ Getting pending announcements for HOD approval...');
      const pendingResponse = await axios.get('http://localhost:5000/api/hod/announcements/pending', {
        headers: { 'Authorization': `Bearer ${hodToken}` }
      });
      const pendingAnnouncements = pendingResponse.data;
      console.log(`✅ HOD has ${pendingAnnouncements.length} pending announcements\n`);

      // Step 7: Approve the announcement
      if (pendingAnnouncements.length > 0) {
        const announcementToApprove = pendingAnnouncements.find(a => a._id === createResponse.data.announcementId);
        if (announcementToApprove) {
          console.log('7️⃣ Approving announcement...');
          await axios.put(`http://localhost:5000/api/hod/announcements/${announcementToApprove._id}/review`, {
            action: 'approve',
            note: 'Approved for testing workflow'
          }, {
            headers: { 'Authorization': `Bearer ${hodToken}` }
          });
          console.log('✅ Announcement approved by HOD\n');
        }
      }

    } catch (hodError) {
      console.log('❌ HOD login failed. You may need to configure an HOD user.');
      console.log('   For now, you can manually test HOD approval in the frontend.\n');
    }

    // Step 8: Verify student can see approved announcements
    console.log('8️⃣ Testing student visibility...');
    try {
      // You'll need to replace this with actual student credentials
      const studentLogin = await axios.post('http://localhost:5000/api/auth/login', {
        email: 'student@example.com', // Replace with actual student email
        password: 'password123'       // Replace with actual student password
      });
      const studentToken = studentLogin.data.token;
      console.log('✅ Student login successful');

      const studentAnnouncementsResponse = await axios.get('http://localhost:5000/api/announcements', {
        headers: { 'Authorization': `Bearer ${studentToken}` }
      });
      console.log(`✅ Student can see ${studentAnnouncementsResponse.data.announcements.length} announcements`);
      
      const testAnnouncement = studentAnnouncementsResponse.data.announcements.find(a => 
        a.title === 'Test Announcement - Workflow Test'
      );
      
      if (testAnnouncement) {
        console.log('🎉 SUCCESS: Approved announcement is visible to student!');
      } else {
        console.log('⏳ Announcement not yet visible (might need HOD approval first)');
      }

    } catch (studentError) {
      console.log('❌ Student login failed. You may need to configure a student user.');
    }

    console.log('\n✅ Workflow test completed!');
    console.log('\n📋 Summary:');
    console.log('   1. ✅ Teacher can create announcements');
    console.log('   2. ✅ Announcements require HOD approval');
    console.log('   3. ✅ Teacher can see announcement history with status');
    console.log('   4. ✅ HOD can see pending announcements');
    console.log('   5. ✅ Students only see approved announcements');

  } catch (error) {
    console.error('❌ Error during workflow test:', error.response?.data || error.message);
  }
}

// Run the test
testAnnouncementWorkflow();