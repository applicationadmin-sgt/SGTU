const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function checkStudentLogin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const email = 'dipanwitaku7ndu02@gmail.com';
    const password = '123456';
    
    // Find the student
    const student = await User.findOne({ email: email });
    
    if (!student) {
      console.log('❌ Student not found with email:', email);
      return;
    }
    
    console.log('✅ Student found:');
    console.log('  ID:', student._id);
    console.log('  Email:', student.email);
    console.log('  Name:', student.name);
    console.log('  Role:', student.role);
    console.log('  Hashed Password:', student.password);
    
    // Check password
    const isPasswordValid = await bcrypt.compare(password, student.password);
    console.log('  Password check:', isPasswordValid ? '✅ Valid' : '❌ Invalid');
    
    if (!isPasswordValid) {
      console.log('❌ Password does not match');
    } else {
      console.log('✅ Login credentials are valid');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkStudentLogin();