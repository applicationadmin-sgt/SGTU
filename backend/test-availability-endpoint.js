const mongoose = require('mongoose');
const User = require('./models/User');
const Unit = require('./models/Unit');
const QuizLock = require('./models/QuizLock');
const axios = require('axios');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sgtlms', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function testQuizAvailability() {
  try {
    console.log('🔍 Testing Quiz Availability Endpoint...\n');

    // Find Trisha's data
    const student = await User.findOne({ name: 'Trisha' });
    if (!student) {
      console.log('❌ Student not found');
      return;
    }

    // Find the unit (unit 1 - which contains the quiz Trisha was working on)
    const unit = await Unit.findOne({ title: 'unit 1' });
    if (!unit) {
      console.log('❌ Unit not found');
      return;
    }

    // Check QuizLock directly
    const quizLock = await QuizLock.findOne({ 
      studentId: student._id,
      quizId: { $in: unit.quizzes }
    });

    console.log('📋 Direct QuizLock Check:');
    console.log(`Student: ${student.name} (${student.regno || student.email})`);
    console.log(`Unit: ${unit.title}`);
    if (quizLock) {
      console.log(`QuizLock exists: ${quizLock.isLocked}`);
      console.log(`Authorization Level: ${quizLock.unlockAuthorizationLevel}`);
      console.log(`HOD Unlock Count: ${quizLock.hodUnlockCount}`);
    } else {
      console.log('No QuizLock found');
    }

    // Test the availability endpoint by making HTTP request
    console.log('\n🌐 Testing Availability Endpoint...');
    
    // First login to get token
    try {
      const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
        email: student.email,
        password: 'Student@123' // Assuming default password
      });
      
      const token = loginResponse.data.token;
      
      // Now test availability
      const availResponse = await axios.get(
        `http://localhost:5000/api/student/unit/${unit._id}/quiz/availability`, 
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      console.log('✅ Availability Endpoint Response:');
      console.log(`Available: ${availResponse.data.available}`);
      console.log(`Is Locked: ${availResponse.data.isLocked}`);
      console.log(`Lock Info:`, availResponse.data.lockInfo);
      console.log(`Teacher Unlocks: ${availResponse.data.teacherUnlocks}`);
      console.log(`Attempts Taken: ${availResponse.data.attemptsTaken}`);
      console.log(`Remaining Attempts: ${availResponse.data.remainingAttempts}`);
      console.log(`Attempt Limit: ${availResponse.data.attemptLimit}`);
      
    } catch (httpError) {
      console.error('❌ HTTP Request Error:', httpError.response?.data || httpError.message);
      
      // Try with UID login
      console.log('\n🔄 Trying UID login...');
      try {
        const uidLoginResponse = await axios.post('http://localhost:5000/api/auth/login', {
          uid: student.regno || student.email,
          password: 'Student@123'
        });
        
        const token = uidLoginResponse.data.token;
        
        const availResponse = await axios.get(
          `http://localhost:5000/api/student/unit/${unit._id}/quiz/availability`, 
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        
        console.log('✅ Availability Endpoint Response (UID login):');
        console.log(`Available: ${availResponse.data.available}`);
        console.log(`Is Locked: ${availResponse.data.isLocked}`);
        console.log(`Lock Info:`, availResponse.data.lockInfo);
        console.log(`Teacher Unlocks: ${availResponse.data.teacherUnlocks}`);
        
      } catch (uidError) {
        console.error('❌ UID Login Error:', uidError.response?.data || uidError.message);
      }
    }

  } catch (error) {
    console.error('❌ Error in quiz availability test:', error);
  } finally {
    mongoose.connection.close();
  }
}

testQuizAvailability();