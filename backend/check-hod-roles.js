const mongoose = require('mongoose');
const User = require('./models/User');
const School = require('./models/School');
const Department = require('./models/Department');

console.log('🔍 Checking hod@gmail.com user roles...');

mongoose.connect('mongodb://localhost:27017/sgt3', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  try {
    const user = await User.findOne({ email: 'hod@gmail.com' })
      .populate('school', 'name')
      .populate('department', 'name')
      .populate('departments', 'name');
    
    if (!user) {
      console.log('❌ User hod@gmail.com not found');
      return;
    }
    
    console.log('👤 User Details:');
    console.log('Email:', user.email);
    console.log('Name:', user.name);
    console.log('Legacy Role:', user.role);
    console.log('Primary Role:', user.primaryRole);
    console.log('Roles Array:', user.roles);
    console.log('School:', user.school?.name || 'None');
    console.log('Legacy Department:', user.department?.name || 'None');
    console.log('Departments Array:', user.departments?.map(d => d.name) || []);
    
  } catch (error) {
    console.error('Error checking user:', error);
  } finally {
    mongoose.disconnect();
  }
});