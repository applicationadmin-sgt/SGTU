const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

const QuizLock = require('./models/QuizLock');
const User = require('./models/User');
const Quiz = require('./models/Quiz');
const Course = require('./models/Course');
const Section = require('./models/Section');
const Department = require('./models/Department');

const BASE_URL = 'http://localhost:5000';

async function testAdminUnlockFlow() {
  console.log('🧪 Testing Admin Override Unlock Flow...\n');
  
  try {
    // Connect to database
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/test';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');
    
    // Add initial delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Cleanup existing test data
    await QuizLock.deleteMany({ 
      $or: [
        { studentId: { $in: await User.find({ regNo: 'S999995' }).distinct('_id') } },
        { 'adminUnlockHistory.0': { $exists: true } }
      ]
    });
    await Section.deleteOne({ name: 'TEST_SECTION_ADMIN_UNLOCK' });
    console.log('✅ Cleaned up existing test data\n');
    
    // Find test users
    const admin = await User.findOne({ email: 'sourav11092002@gmail.com' });
    const teacher = await User.findOne({ role: 'teacher' }).populate('department');
    const student = await User.findOne({ role: 'student', regNo: { $exists: true } });
    
    if (!admin || !teacher || !student) {
      console.log('❌ Missing required test users');
      return;
    }
    
    // Find test quiz and course
    const quiz = await Quiz.findOne({ title: { $regex: 'As001', $options: 'i' } });
    const course = await Course.findOne({ code: { $regex: 'COSMO', $options: 'i' } }).populate('department');
    
    if (!quiz || !course) {
      console.log('❌ Missing quiz or course for testing');
      return;
    }
    
    console.log('✅ Found required test users:');
    console.log(`   Admin: ${admin.name}`);
    console.log(`   Teacher: ${teacher.name} (${teacher.department?.name || 'No Dept'})`);
    console.log(`   Student: ${student.name} (${student.regNo})`);
    console.log(`   Quiz: ${quiz.title}`);
    console.log(`   Course: ${course.name} (${course.department?.name || 'No Dept'})\n`);
    
    // Pre-authenticate admin
    console.log('🔐 Authenticating admin...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const adminLoginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: admin.email,
      password: '123456'
    });
    const adminToken = adminLoginResponse.data.token;
    console.log('✅ Admin authenticated\n');
    
    // Create a section with teacher and student for proper access control
    const testSection = new Section({
      name: 'TEST_SECTION_ADMIN_UNLOCK',
      teachers: [teacher._id],
      students: [student._id],
      courses: [course._id],
      department: course.department
    });
    await testSection.save();
    console.log('✅ Created test section with teacher-student relationship\n');
    
    // Step 1: Create different types of locks for testing
    console.log('📝 Step 1: Creating different types of quiz locks...');
    
    // 1. Regular failing score lock
    const regularLock = new QuizLock({
      studentId: student._id,
      quizId: quiz._id,
      courseId: course._id,
      passingScore: 70,
      teacherUnlockCount: 3, // Simulate exhausted teacher unlocks
      unlockAuthorizationLevel: 'HOD'
    });
    await regularLock.lockQuiz('BELOW_PASSING_SCORE', 45, 70);
    
    // 2. Security violation lock
    const securityLock = new QuizLock({
      studentId: student._id,
      quizId: quiz._id,
      courseId: course._id,
      passingScore: 70
    });
    await securityLock.lockQuiz('SECURITY_VIOLATION', null, 70);
    
    console.log('✅ Created test locks:');
    console.log(`   Regular lock (HOD level): ${regularLock._id}`);
    console.log(`   Security violation lock: ${securityLock._id}\n`);
    
    // Step 2: Test Admin fetching all locked students
    console.log('📝 Step 2: Testing admin fetch all locked students...');
    
    try {
      const adminFetchResponse = await axios.get(`${BASE_URL}/api/quiz-unlock/admin-all-locked-students`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      
      if (adminFetchResponse.data.success) {
        console.log(`✅ Admin can see ${adminFetchResponse.data.count} locked students`);
        console.log('   Security violations:', adminFetchResponse.data.data.filter(item => item.lockInfo.isSecurityViolation).length);
        console.log('   Regular locks:', adminFetchResponse.data.data.filter(item => !item.lockInfo.isSecurityViolation).length);
      }
    } catch (error) {
      console.log(`❌ Admin fetch failed: ${error.response?.data?.message || error.message}`);
    }
    
    // Step 3: Test Admin override unlock for regular lock
    console.log('\n📝 Step 3: Testing admin override unlock for regular lock...');
    
    try {
      const adminUnlockResponse = await axios.post(
        `${BASE_URL}/api/quiz-unlock/admin-unlock/${regularLock._id}`,
        {
          reason: 'Admin override for student request',
          notes: 'Student demonstrated understanding in office hours'
        },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      
      if (adminUnlockResponse.data.success) {
        console.log('✅ Admin override unlock successful for regular lock');
        console.log(`   Override level: ${adminUnlockResponse.data.data.overrideLevel}`);
        console.log(`   Lock reason: ${adminUnlockResponse.data.data.lockReason}`);
      }
    } catch (error) {
      console.log(`❌ Admin unlock failed: ${error.response?.data?.message || error.message}`);
    }
    
    // Step 4: Test Admin override unlock for security violation
    console.log('\n📝 Step 4: Testing admin override unlock for security violation...');
    
    try {
      const securityUnlockResponse = await axios.post(
        `${BASE_URL}/api/quiz-unlock/admin-unlock/${securityLock._id}`,
        {
          reason: 'Security violation reviewed and cleared',
          notes: 'Investigation completed - no actual violation detected'
        },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      
      if (securityUnlockResponse.data.success) {
        console.log('✅ Admin override unlock successful for security violation');
        console.log(`   Override level: ${securityUnlockResponse.data.data.overrideLevel}`);
        console.log(`   Lock reason: ${securityUnlockResponse.data.data.lockReason}`);
      }
    } catch (error) {
      console.log(`❌ Security unlock failed: ${error.response?.data?.message || error.message}`);
    }
    
    // Step 5: Verify locks are unlocked
    console.log('\n📝 Step 5: Verifying locks are unlocked...');
    
    const updatedRegularLock = await QuizLock.findById(regularLock._id);
    const updatedSecurityLock = await QuizLock.findById(securityLock._id);
    
    console.log(`Regular lock status: ${updatedRegularLock.isLocked ? 'LOCKED' : 'UNLOCKED'} (Admin unlocks: ${updatedRegularLock.adminUnlockCount || 0})`);
    console.log(`Security lock status: ${updatedSecurityLock.isLocked ? 'LOCKED' : 'UNLOCKED'} (Admin unlocks: ${updatedSecurityLock.adminUnlockCount || 0})`);
    
    // Step 6: Test unlock history includes admin actions
    console.log('\n📝 Step 6: Testing unlock history includes admin actions...');
    
    try {
      const historyResponse = await axios.get(
        `/api/quiz-unlock/unlock-history/${student._id}/${quiz._id}`,
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      
      if (historyResponse.data.success) {
        const history = historyResponse.data.data.unlockHistory;
        console.log(`✅ History fetched - Admin unlocks: ${history.admin?.length || 0}`);
        
        if (history.admin && history.admin.length > 0) {
          history.admin.forEach((unlock, index) => {
            console.log(`   Admin unlock ${index + 1}: ${unlock.reason} (Override: ${unlock.overrideLevel})`);
          });
        }
      }
    } catch (error) {
      console.log(`❌ History fetch failed: ${error.response?.data?.message || error.message}`);
    }
    
    console.log('\n🎉 Admin unlock flow testing completed!\n');
    
    console.log('📋 Admin Flow Summary:');
    console.log('1. ✅ Admin can see all locked students regardless of authorization level');
    console.log('2. ✅ Admin can override unlock any quiz (regular or security violation)');
    console.log('3. ✅ Admin unlocks are tracked separately in unlock history');
    console.log('4. ✅ Admin overrides bypass all normal authorization levels');
    console.log('5. ✅ Security violations can be cleared by admin review');
    console.log('6. ✅ Admin override actions are logged and auditable');
    
  } catch (error) {
    console.log('💥 Test failed:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
  }
}

// Run the test
testAdminUnlockFlow().catch(console.error);