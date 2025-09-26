const axios = require('axios');

async function testTeacherUnlockWithSecurityClear() {
  try {
    console.log('🔍 Testing Teacher Unlock with Security Lock Clearing...\n');

    // Step 1: Login as Teacher
    console.log('1️⃣ Logging in as Teacher...');
    const teacherLoginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'sourav11092002@gmail.com', // Admin who might also be a teacher
      password: 'Admin@1234'
    });
    
    const teacherToken = teacherLoginResponse.data.token;
    console.log('✅ Teacher logged in successfully');

    // Step 2: Get locked students for teacher
    console.log('\n2️⃣ Getting locked students for teacher...');
    const lockedStudentsResponse = await axios.get(
      'http://localhost:5000/api/quiz-unlock/locked-students',
      {
        headers: { Authorization: `Bearer ${teacherToken}` }
      }
    );
    
    console.log(`Found ${lockedStudentsResponse.data.lockedStudents.length} locked students`);
    
    const souravLock = lockedStudentsResponse.data.lockedStudents.find(
      student => student.student.name === 'Sourav'
    );
    
    if (!souravLock) {
      console.log('❌ No locked record found for Sourav');
      console.log('Available students:', lockedStudentsResponse.data.lockedStudents.map(s => s.student.name));
      return;
    }
    
    console.log(`Found Sourav's lock: ${souravLock._id}`);
    console.log(`Current status: isLocked = ${souravLock.isLocked}`);

    // Step 3: Perform Teacher unlock
    console.log('\n3️⃣ Performing Teacher unlock...');
    const unlockResponse = await axios.post(
      `http://localhost:5000/api/quiz-unlock/teacher-unlock/${souravLock._id}`,
      {
        reason: 'Testing security lock clearing with teacher unlock',
        notes: 'API test - should clear both quiz lock and security lock'
      },
      {
        headers: { Authorization: `Bearer ${teacherToken}` }
      }
    );
    
    console.log('✅ Teacher unlock successful:', unlockResponse.data.message);

    // Step 4: Login as student to test availability
    console.log('\n4️⃣ Testing student quiz availability after teacher unlock...');
    const studentLoginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'sourav11092002@gmail.com', // Same email, but will be student role
      password: 'Admin@1234'
    });
    
    const studentToken = studentLoginResponse.data.token;

    // Step 5: Check quiz availability
    const unitId = '68d4fcad7e9ff2d35c0876d4'; // unit 1 ID
    const availabilityResponse = await axios.get(
      `http://localhost:5000/api/student/unit/${unitId}/quiz/availability`,
      {
        headers: { Authorization: `Bearer ${studentToken}` }
      }
    );

    console.log('📋 Quiz Availability After Teacher Unlock:');
    console.log(`Available: ${availabilityResponse.data.available}`);
    console.log(`Is Locked: ${availabilityResponse.data.isLocked}`);
    console.log(`Can Take Quiz: ${availabilityResponse.data.canTakeQuiz}`);
    console.log(`Lock Info:`, availabilityResponse.data.lockInfo);
    console.log(`Attempts Taken: ${availabilityResponse.data.attemptsTaken}`);
    console.log(`Remaining Attempts: ${availabilityResponse.data.remainingAttempts}`);
    console.log(`Teacher Unlocks: ${availabilityResponse.data.teacherUnlocks}`);

    if (!availabilityResponse.data.isLocked) {
      console.log('\n🎉 SUCCESS! Quiz is now unlocked after teacher unlock (both quiz and security locks cleared)!');
    } else {
      console.log('\n❌ Quiz is still locked. Lock reason:', availabilityResponse.data.lockInfo?.reason);
      console.log('This means either QuizLock or SecurityLock is still active');
    }

  } catch (error) {
    console.error('❌ Error in teacher unlock test:', error.response?.data || error.message);
    if (error.response?.status === 403) {
      console.log('\n💡 Note: You may need to use proper teacher credentials or ensure the teacher has access to this student.');
    }
  }
}

testTeacherUnlockWithSecurityClear();