const User = require('./models/User');
const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const students = await User.find({roles: 'student'}).select('name email studentId assignedSections');
  console.log('Students:', students.length);
  students.forEach((s,i) => console.log(`${i+1}. ${s.name} (${s.studentId}) - Sections: ${s.assignedSections?.length || 0}`));
  
  if (students.length > 0 && students[0].assignedSections?.length === 0) {
    // Assign the first student to the section
    const sectionId = '68d4ea7697c9f2c4a2e45bff';
    await User.findByIdAndUpdate(students[0]._id, {
      assignedSections: [sectionId]
    });
    console.log(`✅ Assigned ${students[0].name} to section K22AE`);
  }
  
  process.exit();
});