const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');

async function checkStudentCredentials() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Find the student
        const student = await User.findOne({ email: 'munmun2912@gmail.com' });
        if (!student) {
            console.log('❌ Student not found');
            return;
        }
        
        console.log('✅ Student found:', student.name);
        console.log('Email:', student.email);
        console.log('RegNo:', student.regNo);
        console.log('Role:', student.role);
        console.log('Active:', student.isActive !== false);
        
        // For security, we won't print the password, but let's check if it's set
        console.log('Password hash exists:', !!student.password);
        console.log('Password hash length:', student.password ? student.password.length : 0);
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        mongoose.disconnect();
    }
}

checkStudentCredentials();