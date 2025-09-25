const mongoose = require('mongoose');
const QuizLock = require('./models/QuizLock');
const User = require('./models/User');
const Quiz = require('./models/Quiz');
const Course = require('./models/Course');

// Connect to MongoDB Atlas
mongoose.connect('mongodb+srv://sourav092002_db_user:aq5UgwNDh2tgyZcB@cluster0.nvkrxcx.mongodb.net/');

async function testDeanEndpoint() {
  try {
    console.log('Testing dean locked students endpoint logic...');
    
    // Call the method directly
    const lockedStudents = await QuizLock.getLockedStudentsForDean();
    console.log('Raw locked students:', lockedStudents.length);
    
    if (lockedStudents.length === 0) {
      console.log('No dean-level locked students found');
      mongoose.connection.close();
      return;
    }
    
    console.log('Processing enriched data...');
    const enrichedData = await Promise.all(lockedStudents.map(async (lock) => {
      console.log('Processing lock:', lock._id);
      console.log('Student ID:', lock.studentId);
      console.log('Quiz ID:', lock.quizId);
      console.log('Course ID:', lock.courseId);
      
      // Fetch related data separately to avoid populate issues
      const student = await User.findById(lock.studentId).select('name email regno').lean();
      const quiz = await Quiz.findById(lock.quizId).select('title').lean();
      const course = await Course.findById(lock.courseId).select('name code title').lean();
      
      console.log('Found student:', student ? student.name : 'null');
      console.log('Found quiz:', quiz ? quiz.title : 'null');
      console.log('Found course:', course ? (course.name || course.title) : 'null');
      
      return {
        lockId: lock._id,
        student: student ? {
          id: student._id,
          name: student.name,
          email: student.email,
          regno: student.regno
        } : null,
        quiz: quiz ? {
          id: quiz._id,
          title: quiz.title
        } : null,
        course: course ? {
          id: course._id,
          name: course.name || course.title,
          code: course.code
        } : null,
        lockInfo: {
          reason: lock.failureReason,
          lockTimestamp: lock.lockTimestamp,
          lastFailureScore: lock.lastFailureScore,
          passingScore: lock.passingScore,
          teacherUnlockCount: lock.teacherUnlockCount,
          deanUnlockCount: lock.deanUnlockCount,
          totalAttempts: lock.totalAttempts,
          requiresDeanUnlock: lock.requiresDeanUnlock
        },
        teacherUnlockHistory: lock.teacherUnlockHistory
      };
    }));
    
    console.log('Success! Enriched data count:', enrichedData.length);
    console.log('Sample data:', JSON.stringify(enrichedData[0], null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    mongoose.connection.close();
  }
}

testDeanEndpoint();