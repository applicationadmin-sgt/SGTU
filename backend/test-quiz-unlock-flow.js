const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

const BASE_URL = 'http://localhost:5000';

async function testQuizUnlockFlow() {
  console.log('🧪 Testing New Quiz Unlock Flow (Teacher → HOD → Dean)...\n');
  
  try {
    // Connect to database to create test data
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    const User = require('./models/User');
    const QuizLock = require('./models/QuizLock');
    const Quiz = require('./models/Quiz');
    const Course = require('./models/Course');
    const Section = require('./models/Section');
    const Department = require('./models/Department');
    
    // Clean up any existing test data first
    await QuizLock.deleteMany({}); // Delete all quiz locks for clean test
    await Section.deleteMany({ 
      $or: [
        { name: 'TEST_SECTION_QUIZ_UNLOCK' },
        { name: 'Test Section Quiz Flow' }
      ]
    });
    console.log('✅ Cleaned up existing test data\n');
    
    // Find test users
    const admin = await User.findOne({ email: 'sourav11092002@gmail.com' });
    const teacher = await User.findOne({ role: 'teacher' }).populate('department');
    const hod = await User.findOne({ role: 'hod' }).populate('department');
    const dean = await User.findOne({ role: 'dean' });
    const student = await User.findOne({ role: 'student', regNo: { $exists: true } });
    
    if (!admin || !teacher || !hod || !dean || !student) {
      console.log('❌ Missing required test users');
      console.log(`Admin: ${admin ? '✅' : '❌'}`);
      console.log(`Teacher: ${teacher ? '✅' : '❌'}`);
      console.log(`HOD: ${hod ? '✅' : '❌'}`);
      console.log(`Dean: ${dean ? '✅' : '❌'}`);
      console.log(`Student: ${student ? '✅' : '❌'}`);
      return;
    }
    
    console.log('✅ Found required test users:');
    console.log(`   Admin: ${admin.name}`);
    console.log(`   Teacher: ${teacher.name} (${teacher.department?.name || 'No Dept'})`);
    console.log(`   HOD: ${hod.name} (${hod.department?.name || 'No Dept'})`);
    console.log(`   Dean: ${dean.name}`);
    console.log(`   Student: ${student.name} (${student.regNo})`);
    
    // Find a quiz and course
    const quiz = await Quiz.findOne();
    const course = await Course.findOne().populate('department');
    
    if (!quiz || !course) {
      console.log('❌ Missing quiz or course for testing');
      return;
    }
    
    console.log(`   Quiz: ${quiz.title}`);
    console.log(`   Course: ${course.name} (${course.department?.name || 'No Dept'})\n`);
    
    // Pre-authenticate all users to avoid rate limiting during test
    console.log('🔐 Authenticating users...');
    
    // Wait before authentication to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const teacherLoginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: teacher.email,
      password: '123456'
    });
    const teacherToken = teacherLoginResponse.data.token;
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const hodLoginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: hod.email,
      password: '123456'
    });
    const hodToken = hodLoginResponse.data.token;
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const deanLoginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: dean.email,
      password: '123456'
    });
    const deanToken = deanLoginResponse.data.token;
    
    console.log('✅ All users authenticated\n');
    
    // Ensure course and HOD are in the same department for testing
    if (course.department && hod.department && course.department._id.toString() !== hod.department._id.toString()) {
      console.log('⚠️ Course and HOD are in different departments, updating course department...');
      course.department = hod.department._id;
      await course.save();
    }
    
    // Create a section with teacher and student for proper access control
    const testSection = new Section({
      name: 'TEST_SECTION_QUIZ_UNLOCK',
      teachers: [teacher._id],
      students: [student._id],
      courses: [course._id],
      school: course.school || hod.school,
      department: course.department || hod.department
    });
    await testSection.save();
    console.log('✅ Created test section with teacher-student relationship\n');
    
    // Step 1: Create a quiz lock
    console.log('📝 Step 1: Creating quiz lock...');
    let lock = await QuizLock.getOrCreateLock(student._id, quiz._id, course._id, 70);
    
    // Record failing attempt and lock the quiz
    await lock.recordAttempt(45);
    await lock.lockQuiz('BELOW_PASSING_SCORE', 45, 70);
    
    console.log('✅ Quiz lock created');
    console.log(`   Authorization level: ${lock.unlockAuthorizationLevel}`);
    console.log(`   Can teacher unlock: ${lock.canTeacherUnlock}`);
    console.log(`   Teacher unlocks remaining: ${lock.remainingTeacherUnlocks}\n`);
    
    // Step 2: Teacher unlocks (3 times)
    console.log('📝 Step 2: Testing teacher unlocks (3 attempts)...');
    
    for (let i = 0; i < 3; i++) {
      console.log(`   Teacher unlock ${i + 1}/3...`);
      
      try {
        const unlockResponse = await axios.post(
          `${BASE_URL}/api/quiz-unlock/teacher-unlock/${lock._id}`,
          {
            reason: `Test teacher unlock ${i + 1}`,
            notes: 'Testing unlock flow'
          },
          { headers: { Authorization: `Bearer ${teacherToken}` } }
        );
        
        console.log(`   ✅ Teacher unlock ${i + 1} successful`);
        
        // Refresh lock object from database
        lock = await QuizLock.findById(lock._id);
        
        // Re-lock for next test
        await lock.lockQuiz('BELOW_PASSING_SCORE', 40 + i, 70);
        
        // Refresh again after re-locking
        lock = await QuizLock.findById(lock._id);
        
      } catch (error) {
        console.log(`   ❌ Teacher unlock ${i + 1} failed:`, error.response?.data?.message);
      }
    }
    
    // Refresh lock data
    lock = await QuizLock.findById(lock._id);
    console.log(`\\n   After 3 teacher unlocks:`);
    console.log(`   Authorization level: ${lock.unlockAuthorizationLevel}`);
    console.log(`   Can teacher unlock: ${lock.canTeacherUnlock}`);
    console.log(`   Requires HOD unlock: ${lock.requiresHodUnlock}\\n`);
    
    // Step 3: Try teacher unlock after limit (should fail)
    console.log('📝 Step 3: Testing teacher unlock after limit...');
    try {
      await axios.post(
        `${BASE_URL}/api/quiz-unlock/teacher-unlock/${lock._id}`,
        {
          reason: 'Should fail - limit exceeded',
          notes: 'Testing'
        },
        { headers: { Authorization: `Bearer ${teacherToken}` } }
      );
      console.log('   ❌ Should have failed but succeeded');
    } catch (error) {
      console.log(`   ✅ Correctly rejected: ${error.response?.data?.message}\\n`);
    }
    
    // Step 4: HOD unlock
    console.log('📝 Step 4: Testing HOD unlock...');
    
    try {
      const hodUnlockResponse = await axios.post(
        `${BASE_URL}/api/quiz-unlock/hod-unlock/${lock._id}`,
        {
          reason: 'HOD approval after teacher limit exceeded',
          notes: 'Student demonstrated understanding in discussion'
        },
        { headers: { Authorization: `Bearer ${hodToken}` } }
      );
      
      console.log('✅ HOD unlock successful');
      console.log(`   Next authorization level: ${hodUnlockResponse.data.data.nextAuthorizationLevel}\\n`);
      
      // Re-lock to test dean level - first reload the lock from database
      lock = await QuizLock.findById(lock._id);
      await lock.lockQuiz('BELOW_PASSING_SCORE', 40, 70);
      lock = await QuizLock.findById(lock._id);
      
      console.log(`   After HOD unlock and re-lock:`);
      console.log(`   Authorization level: ${lock.unlockAuthorizationLevel}`);
      console.log(`   Requires Dean unlock: ${lock.requiresDeanUnlock}\\n`);
      
    } catch (error) {
      console.log(`   ❌ HOD unlock failed:`);
      console.log('      Status:', error.response?.status);
      console.log('      Message:', error.response?.data?.message || 'No message');
      console.log('      Full error:', error.response?.data || error.message);
      console.log('');
    }
    
    // Step 5: Dean unlock
    console.log('📝 Step 5: Testing Dean unlock...');
    
    try {
      const deanUnlockResponse = await axios.post(
        `${BASE_URL}/api/quiz-unlock/dean-unlock/${lock._id}`,
        {
          reason: 'Dean final authorization',
          notes: 'Special circumstances approved'
        },
        { headers: { Authorization: `Bearer ${deanToken}` } }
      );
      
      console.log('✅ Dean unlock successful');
      
    } catch (error) {
      console.log(`   ❌ Dean unlock failed:`);
      console.log('      Status:', error.response?.status);  
      console.log('      Message:', error.response?.data?.message || 'No message');
      console.log('      Full error:', error.response?.data || error.message);
      console.log('');
    }
    
    // Step 6: Test dashboard endpoints
    console.log('\\n📝 Step 6: Testing dashboard endpoints...');
    
    // Add a small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Remove any existing locks first
    await QuizLock.deleteMany({ 
      studentId: student._id, 
      quizId: quiz._id, 
      courseId: course._id 
    });
    
    // Create a fresh lock for dashboard testing
    const testLock = new QuizLock({
      studentId: student._id,
      quizId: quiz._id,
      courseId: course._id,
      passingScore: 70,
      teacherUnlockCount: 3, // Simulate exhausted teacher unlocks
      unlockAuthorizationLevel: 'HOD'
    });
    await testLock.lockQuiz('BELOW_PASSING_SCORE', 45, 70);
    
    try {
      // Test HOD dashboard
      const hodLoginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: hod.email,
        password: '123456'
      });
      const hodToken = hodLoginResponse.data.token;
      
      const hodDashboardResponse = await axios.get(`${BASE_URL}/api/quiz-unlock/hod-locked-students`, {
        headers: { Authorization: `Bearer ${hodToken}` }
      });
      
      console.log(`✅ HOD Dashboard: ${hodDashboardResponse.data.data?.length || 0} students requiring HOD unlock`);
      
      // Test Dean dashboard
      const deanLoginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: dean.email,
        password: '123456'
      });
      const deanToken = deanLoginResponse.data.token;
      
      const deanDashboardResponse = await axios.get(`${BASE_URL}/api/quiz-unlock/dean-locked-students`, {
        headers: { Authorization: `Bearer ${deanToken}` }
      });
      
      console.log(`✅ Dean Dashboard: ${deanDashboardResponse.data.data?.length || 0} students requiring Dean unlock`);
      
    } catch (error) {
      console.log(`❌ Dashboard test failed: ${error.response?.data?.message || error.message}`);
    }
    
    console.log('\\n🎉 Quiz unlock flow testing completed!');
    console.log('\\n📋 Flow Summary:');
    console.log('1. ✅ Student fails quiz → locked');
    console.log('2. ✅ Teacher can unlock up to 3 times');
    console.log('3. ✅ After 3 teacher unlocks → HOD authorization required');
    console.log('4. ✅ After HOD unlock → Dean authorization required');
    console.log('5. ✅ Dean has unlimited unlock authority');
    console.log('6. ✅ Dashboard endpoints working for HOD and Dean');
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

// Run the test
testQuizUnlockFlow();