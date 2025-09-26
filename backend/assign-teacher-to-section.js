const mongoose = require('mongoose');
require('dotenv').config();
const Section = require('./models/Section');
const User = require('./models/User');
const Course = require('./models/Course');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  try {
    console.log('Assigning teacher to section...');
    
    // Find the section and teacher
    const section = await Section.findById('68d4ea7697c9f2c4a2e45bff');
    const teacher = await User.findOne({ email: 'teacherpawan@gmail.com' });
    
    console.log('Section:', section.name);
    console.log('Teacher:', teacher.name, teacher.email);
    
    // Add teacher to section if not already there
    if (!section.teachers.includes(teacher._id)) {
      section.teachers.push(teacher._id);
      await section.save();
      console.log('✅ Teacher assigned to section successfully');
    } else {
      console.log('ℹ️ Teacher already assigned to section');
    }
    
    // Verify the assignment
    const updatedSection = await Section.findById('68d4ea7697c9f2c4a2e45bff').populate('teachers');
    console.log('\n=== UPDATED SECTION ===');
    console.log('Teachers in section:', updatedSection.teachers.length);
    updatedSection.teachers.forEach(t => {
      console.log(`  - ${t.name} (${t.email})`);
    });
    
    process.exit();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
});