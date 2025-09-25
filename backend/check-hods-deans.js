const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Department = require('./models/Department');
const School = require('./models/School');

async function checkHODsAndDeans() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🔍 Checking HODs and Deans in the system...\n');

    // Get all HODs and Deans
    const hodsAndDeans = await User.find({
      role: { $in: ['hod', 'dean'] },
      isActive: true
    }).populate('department', 'name code').populate('school', 'name');

    console.log(`Found ${hodsAndDeans.length} HODs and Deans:\n`);

    if (hodsAndDeans.length === 0) {
      console.log('❌ No HODs or Deans found in the system!');
      console.log('You need to create some HODs and Deans to test this feature.\n');
    } else {
      hodsAndDeans.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name} (${user.email})`);
        console.log(`   Role: ${user.role.toUpperCase()}`);
        console.log(`   School: ${user.school?.name || 'No school assigned'}`);
        console.log(`   Department: ${user.department?.name || 'No department assigned'}`);
        console.log('');
      });
    }

    // Check all departments and their teacher counts
    console.log('\n📊 Department-wise instructor counts:');
    const departments = await Department.find({}).populate('school', 'name');
    
    for (const dept of departments) {
      const teachers = await User.countDocuments({
        department: dept._id,
        role: 'teacher',
        isActive: true
      });
      
      const hods = await User.countDocuments({
        department: dept._id,
        role: 'hod',
        isActive: true
      });
      
      const deans = await User.countDocuments({
        department: dept._id,
        role: 'dean',
        isActive: true
      });
      
      const total = teachers + hods + deans;
      
      console.log(`\n🏢 ${dept.name} (${dept.code})`);
      console.log(`   School: ${dept.school?.name || 'No school'}`);
      console.log(`   👨‍🏫 Teachers: ${teachers}`);
      console.log(`   👨‍💼 HODs: ${hods}`);
      console.log(`   👨‍💻 Deans: ${deans}`);
      console.log(`   📊 Total Instructors: ${total}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkHODsAndDeans();