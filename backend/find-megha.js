const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');

async function findMegha() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const megha = await User.findOne({ 
      $or: [
        { name: { $regex: /megha/i } },
        { email: { $regex: /megha/i } }
      ]
    });
    
    if (megha) {
      console.log('Megha found:');
      console.log(`Name: ${megha.name}`);
      console.log(`Email: ${megha.email}`);
      console.log(`ID: ${megha._id}`);
      console.log(`Role: ${megha.role}`);
    } else {
      console.log('Megha not found. Available teachers:');
      const teachers = await User.find({ role: 'teacher' });
      teachers.forEach(teacher => {
        console.log(`- ${teacher.name} (${teacher.email}) - ${teacher._id}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

findMegha();