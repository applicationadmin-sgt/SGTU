const mongoose = require('mongoose');
const User = require('./models/User');

async function enableMeghaAnnouncement() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sgt_db');
    console.log('Connected to database');
    
    // Find Megha
    const teacher = await User.findOne({ email: 'megha@gmail.com', role: 'teacher' });
    if (!teacher) {
      console.log('Teacher with email megha@gmail.com not found');
      process.exit(1);
    }
    
    console.log(`Found teacher: ${teacher.name} (${teacher.email})`);
    console.log(`Current canAnnounce: ${teacher.canAnnounce}`);
    
    if (teacher.canAnnounce) {
      console.log('Teacher already has announcement permission enabled!');
    } else {
      // Enable announcement permission
      const result = await User.updateOne(
        { email: 'megha@gmail.com', role: 'teacher' },
        { $set: { canAnnounce: true } }
      );
      
      console.log('Update result:', result);
      
      const updatedTeacher = await User.findOne({ email: 'megha@gmail.com' });
      console.log('Updated teacher canAnnounce:', updatedTeacher?.canAnnounce);
      
      console.log('Teacher announcement permission enabled successfully!');
    }
    
    mongoose.disconnect();
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

enableMeghaAnnouncement();