const mongoose = require('mongoose');
const User = require('./models/User');
const School = require('./models/School');
const Department = require('./models/Department');

console.log('🔧 Updating hod@gmail.com primary role to dean...');

mongoose.connect('mongodb://localhost:27017/sgt3', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  try {
    const user = await User.findOne({ email: 'hod@gmail.com' });
    
    if (!user) {
      console.log('❌ User hod@gmail.com not found');
      return;
    }
    
    console.log('📋 Before update:');
    console.log('Legacy Role:', user.role);
    console.log('Primary Role:', user.primaryRole);
    console.log('Roles Array:', user.roles);
    
    // Update primary role to dean (highest in hierarchy)
    if (user.roles && user.roles.includes('dean')) {
      user.primaryRole = 'dean';
      user.role = 'dean'; // Backward compatibility
      await user.save();
      
      console.log('✅ Updated successfully:');
      console.log('New Legacy Role:', user.role);
      console.log('New Primary Role:', user.primaryRole);
      console.log('Roles Array:', user.roles);
    } else {
      console.log('⚠️ User does not have dean role in roles array');
    }
    
  } catch (error) {
    console.error('Error updating user:', error);
  } finally {
    mongoose.disconnect();
  }
});