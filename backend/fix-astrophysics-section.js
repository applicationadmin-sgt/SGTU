const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sgt-learning');

const Section = require('./models/Section');
const User = require('./models/User');

async function fixAstrophysicsSection() {
  console.log('=== Fixing Astrophysics Section ===');
  
  // Find the Astrophysics section with no teacher
  const astrophysicsSection = await Section.findOne({ 
    name: 'Astrophysics'
  });
  
  if (!astrophysicsSection) {
    console.log('Section not found or already has teacher assigned');
    mongoose.disconnect();
    return;
  }
  
  console.log(`Found section: ${astrophysicsSection.name}`);
  console.log(`Current teacher: ${astrophysicsSection.teacher || 'None'}`);
  
  // Find Vishnu Sharma or Megha to assign as teacher
  const teacher = await User.findOne({ 
    email: 'vishnusharma@gmail.com',
    role: 'teacher'
  });
  
  if (!teacher) {
    console.log('Teacher not found');
    mongoose.disconnect();
    return;
  }
  
  console.log(`Assigning teacher: ${teacher.name} (${teacher.email})`);
  
  // Assign teacher to section
  astrophysicsSection.teacher = teacher._id;
  await astrophysicsSection.save();
  
  console.log('✅ Teacher assigned successfully!');
  
  // Verify the update
  const updatedSection = await Section.findById(astrophysicsSection._id)
    .populate('teacher', 'name email')
    .populate('students', 'name regNo');
  
  console.log('\n=== Updated Section Info ===');
  console.log(`Section: ${updatedSection.name}`);
  console.log(`Teacher: ${updatedSection.teacher.name} (${updatedSection.teacher.email})`);
  console.log(`Students: ${updatedSection.students.length}`);
  updatedSection.students.forEach(student => {
    console.log(`  - ${student.name} (${student.regNo})`);
  });
  
  mongoose.disconnect();
}

fixAstrophysicsSection().catch(console.error);