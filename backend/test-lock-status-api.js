const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

async function testLockStatusAPI() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const User = require('./models/User');
        const Quiz = require('./models/Quiz');
        
        // Find student and quiz IDs
        const student = await User.findOne({ regNo: 'S999989' });
        const quiz = await Quiz.findOne({ title: { $regex: 'As001', $options: 'i' } });
        
        if (!student || !quiz) {
            console.log('Student or quiz not found');
            return;
        }

        console.log(`Student ID: ${student._id}`);
        console.log(`Quiz ID: ${quiz._id}`);

        // Test the lock status API (we'll need to get a valid JWT token first)
        const jwt = require('jsonwebtoken');
        const token = jwt.sign(
            { id: student._id, role: 'student' },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        console.log('\nTesting lock status API...');
        
        try {
            const response = await axios.get(
                `http://localhost:5000/api/quiz-unlock/lock-status/${student._id}/${quiz._id}`,
                {
                    headers: {
                        'x-auth-token': token
                    }
                }
            );

            console.log('API Response:', JSON.stringify(response.data, null, 2));
        } catch (apiError) {
            if (apiError.response) {
                console.log('API Error Response:', apiError.response.data);
            } else {
                console.log('API Error:', apiError.message);
            }
        }

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        mongoose.connection.close();
    }
}

testLockStatusAPI();