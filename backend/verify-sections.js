const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sgt-learning');

const Section = require('./models/Section');
const User = require('./models/User');
const Course = require('./models/Course');

(async () => {
  const teacher = await User.findOne({ email: 'vishnusharma@gmail.com' });
  console.log('\n=== Vishnu Sharma Sections ===');
  
  const sections = await Section.find({ teacher: teacher._id })
    .populate('students', 'name regNo');
  
  sections.forEach(section => {
    console.log(`Section: ${section.name}`);
    console.log(`  Students: ${section.students?.length || 0}`);
    section.students?.forEach(s => {
      console.log(`    - ${s.name} (${s.regNo})`);
    });
  });
  
  mongoose.disconnect();
})();