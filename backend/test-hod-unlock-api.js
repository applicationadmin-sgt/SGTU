const axios = require('axios');

async function testHODUnlockAPI() {
  try {
    console.log('🔍 Testing HOD Unlock API...\n');

    // Step 1: Login as HOD
    console.log('1️⃣ Logging in as HOD...');
    const hodLoginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'pushkarsing@gmail.com',
      password: '123456'
    });
    
    const hodToken = hodLoginResponse.data.token;
    console.log('✅ HOD logged in successfully');

    // Step 2: Get locked students to find the lockId
    console.log('\n2️⃣ Getting HOD locked students...');
    const lockedStudentsResponse = await axios.get(
      'http://localhost:5000/api/quiz-unlock/hod-locked-students',
      {
        headers: { Authorization: `Bearer ${hodToken}` }
      }
    );
    
    console.log(`Found ${lockedStudentsResponse.data.lockedStudents.length} locked students`);
    
    const trishaLock = lockedStudentsResponse.data.lockedStudents.find(
      student => student.student.name === 'Trisha'
    );
    
    if (!trishaLock) {
      console.log('❌ No locked record found for Trisha');
      return;
    }
    
    console.log(`Found Trisha's lock: ${trishaLock._id}`);
    console.log(`Current status: isLocked = ${trishaLock.isLocked}`);

    // Step 3: Perform HOD unlock
    console.log('\n3️⃣ Performing HOD unlock...');
    const unlockResponse = await axios.post(
      `http://localhost:5000/api/quiz-unlock/hod-unlock/${trishaLock._id}`,
      {
        reason: 'Testing security lock clearing',
        notes: 'API test unlock'
      },
      {
        headers: { Authorization: `Bearer ${hodToken}` }
      }
    );
    
    console.log('✅ HOD unlock successful:', unlockResponse.data.message);

    // Step 4: Login as student to test availability
    console.log('\n4️⃣ Testing student quiz availability...');
    const studentLoginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'trisha@gmail.com',
      password: 'Student@123'
    });
    
    const studentToken = studentLoginResponse.data.token;

    // Step 5: Check quiz availability
    const unitId = '68d4fcad7e9ff2d35c0876d4'; // unit 1 ID from our previous test
    const availabilityResponse = await axios.get(
      `http://localhost:5000/api/student/unit/${unitId}/quiz/availability`,
      {
        headers: { Authorization: `Bearer ${studentToken}` }
      }
    );

    console.log('📋 Quiz Availability After HOD Unlock:');
    console.log(`Available: ${availabilityResponse.data.available}`);
    console.log(`Is Locked: ${availabilityResponse.data.isLocked}`);
    console.log(`Can Take Quiz: ${availabilityResponse.data.canTakeQuiz}`);
    console.log(`Lock Info:`, availabilityResponse.data.lockInfo);
    console.log(`Attempts Taken: ${availabilityResponse.data.attemptsTaken}`);
    console.log(`Remaining Attempts: ${availabilityResponse.data.remainingAttempts}`);
    console.log(`Attempt Limit: ${availabilityResponse.data.attemptLimit}`);

    if (!availabilityResponse.data.isLocked) {
      console.log('\n🎉 SUCCESS! Quiz is now unlocked for the student!');
    } else {
      console.log('\n❌ Quiz is still locked. Lock reason:', availabilityResponse.data.lockInfo?.reason);
    }

  } catch (error) {
    console.error('❌ Error in HOD unlock test:', error.response?.data || error.message);
  }
}

testHODUnlockAPI();