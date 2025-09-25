const mongoose = require('mongoose');
const express = require('express');
const app = express();

// Mock a simple test endpoint
const testStudentVideoApi = async () => {
    console.log('Testing if the backend server is responding...');
    
    try {
        const response = await fetch('http://localhost:5000/api/student/courses', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
                // We'll test without token first to see server status
            }
        });
        
        console.log('Server response status:', response.status);
        
        if (response.status === 401) {
            console.log('✅ Server is running (got 401 as expected without token)');
        } else {
            const data = await response.text();
            console.log('Unexpected response:', data);
        }
        
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.log('❌ Backend server is not running on localhost:5000');
            console.log('   Please start the backend server first:');
            console.log('   cd backend && npm start');
        } else {
            console.log('❌ Network error:', error.message);
        }
    }
};

testStudentVideoApi();