const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const User = require('./models/User');

// Test what's in the JWT token for this student
async function testJWTToken() {
  try {
    console.log('Testing JWT token for student...');
    
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI);
    
    // Find the student
    const student = await User.findOne({ email: 'dipanwitaku7ndu02@gmail.com' });
    console.log('✅ Student from DB:', {
      name: student.name,
      id: student._id.toString(),
      email: student.email,
      role: student.role
    });
    
    // Generate a JWT token for this student (like the login process would do)
    const token = jwt.sign(
      { 
        _id: student._id,
        id: student._id,  // Include both _id and id
        email: student.email,
        role: student.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    console.log('\n🔐 Generated JWT token (copy this for testing):');
    console.log(token);
    
    // Decode the token to see what's in it
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('\n📋 Decoded token contents:');
    console.log(JSON.stringify(decoded, null, 2));
    
    console.log('\n📝 To test with this token:');
    console.log('1. Update test-student-api.js with this token');
    console.log('2. Run: node test-student-api.js');
    
    process.exit();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testJWTToken();