const axios = require('axios');

async function enableTeacherAnnouncementDirect() {
  try {
    // Login as admin
    console.log('Logging in as admin...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'sourav11092002@gmail.com',
      password: 'Admin@1234'
    });
    
    const token = loginResponse.data.token;
    console.log('Login successful');
    
    // Get teachers list to find the target teacher
    console.log('Getting teachers list...');
    const teachersResponse = await axios.get('http://localhost:5000/api/admin/teachers', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const teacher = teachersResponse.data.find(t => t.email === 'dipanwitakund1u02@gmail.com');
    if (!teacher) {
      console.log('Teacher with email dipanwitakund1u02@gmail.com not found');
      console.log('Available teachers:');
      teachersResponse.data.forEach(t => console.log(`- ${t.name} (${t.email})`));
      return;
    }
    
    console.log(`Found teacher: ${teacher.name} (${teacher.email}) - Current canAnnounce: ${teacher.canAnnounce}`);
    
    if (teacher.canAnnounce) {
      console.log('Teacher already has announcement permission enabled!');
      console.log('You can now test at http://localhost:3000/teacher/announcements');
      console.log('Login credentials:');
      console.log('Email: dipanwitakund1u02@gmail.com');
      console.log('Password: 123456');
      return;
    }
    
    console.log('Attempting to enable announcement permission...');
    
    // Try the API endpoint
    try {
      const updateResponse = await axios.patch(
        `http://localhost:5000/api/admin/teacher/${teacher._id}/announce-permission`,
        { canAnnounce: true },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      console.log('Success via API:', updateResponse.data.message);
      
    } catch (apiError) {
      console.log('API failed, trying direct database update...');
      console.log('API Error:', apiError.response?.data?.message);
      
      // Create a direct database update script
      const dbUpdateScript = `
const mongoose = require('mongoose');
const User = require('./models/User');

async function updateTeacherPermission() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lms');
    console.log('Connected to database');
    
    const result = await User.updateOne(
      { email: 'dipanwitakund1u02@gmail.com', role: 'teacher' },
      { $set: { canAnnounce: true } }
    );
    
    console.log('Update result:', result);
    
    const updatedTeacher = await User.findOne({ email: 'dipanwitakund1u02@gmail.com' });
    console.log('Updated teacher canAnnounce:', updatedTeacher?.canAnnounce);
    
    mongoose.disconnect();
    console.log('Teacher announcement permission enabled successfully!');
  } catch (error) {
    console.error('Database update failed:', error.message);
  }
}

updateTeacherPermission();
`;
      
      const fs = require('fs');
      fs.writeFileSync('./update-teacher-permission.js', dbUpdateScript);
      console.log('Created update-teacher-permission.js script');
      console.log('Run: node update-teacher-permission.js');
    }
    
  } catch (error) {
    console.error('Error:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
  }
}

enableTeacherAnnouncementDirect();