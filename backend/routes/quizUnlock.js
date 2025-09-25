const express = require('express');
const router = express.Router();
const QuizLock = require('../models/QuizLock');
const Quiz = require('../models/Quiz');
const User = require('../models/User');
const Course = require('../models/Course');
const QuizAttempt = require('../models/QuizAttempt');
const { auth, authorizeRoles } = require('../middleware/auth');

// @route   GET /api/quiz-unlock/locked-students
// @desc    Get locked students for teacher dashboard
// @access  Private (Teacher)
router.get('/locked-students', auth, authorizeRoles('teacher', 'coordinator'), async (req, res) => {
  try {
    const teacherId = req.user.id;
    
    const lockedStudents = await QuizLock.getLockedStudentsByTeacher(teacherId);
    
    // Add additional context for each locked student
    const enrichedData = await Promise.all(lockedStudents.map(async (lock) => {
      // Fetch related information separately to avoid populate issues
      const student = await User.findById(lock.studentId).select('name email regno');
      const quiz = await Quiz.findById(lock.quizId).select('title');
      const course = await Course.findById(lock.courseId).select('name code title');
      
      return {
        lockId: lock._id,
        student: {
          id: lock.studentId,
          name: student?.name || 'Unknown Student',
          email: student?.email || 'N/A',
          regno: student?.regno || 'N/A'
        },
        quiz: {
          id: lock.quizId,
          title: quiz?.title || 'Unknown Quiz'
        },
        course: {
          id: lock.courseId,
          name: course?.name || course?.title || 'Unknown Course',
          code: course?.code || 'N/A'
        },
        lockInfo: {
          reason: lock.failureReason,
          lockTimestamp: lock.lockTimestamp,
          lastFailureScore: lock.lastFailureScore,
          passingScore: lock.passingScore,
          teacherUnlockCount: lock.teacherUnlockCount,
          remainingTeacherUnlocks: lock.remainingTeacherUnlocks,
          totalAttempts: lock.totalAttempts,
          canTeacherUnlock: lock.canTeacherUnlock
        }
      };
    }));
    
    res.json({
      success: true,
      data: enrichedData,
      count: enrichedData.length
    });
  } catch (error) {
    console.error('Error fetching locked students:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching locked students',
      error: error.message
    });
  }
});

// @route   GET /api/quiz-unlock/dean-locked-students
// @desc    Get locked students requiring dean authorization
// @access  Private (Dean/Admin)
router.get('/dean-locked-students', auth, authorizeRoles('admin', 'dean'), async (req, res) => {
  try {
    const lockedStudents = await QuizLock.getLockedStudentsForDean();
    
    const enrichedData = await Promise.all(lockedStudents.map(async (lock) => {
      // Fetch related information separately to avoid populate issues
      const student = await User.findById(lock.studentId).select('name email regno').lean();
      const quiz = await Quiz.findById(lock.quizId).select('title').lean();
      const course = await Course.findById(lock.courseId).select('name code title').lean();
      
      return {
        lockId: lock._id,
        student: student ? {
          id: student._id,
          name: student.name,
          email: student.email,
          regno: student.regno
        } : {
          id: lock.studentId,
          name: 'Unknown Student',
          email: 'N/A',
          regno: 'N/A'
        },
        quiz: quiz ? {
          id: quiz._id,
          title: quiz.title
        } : {
          id: lock.quizId,
          title: 'Unknown Quiz (Deleted)'
        },
        course: course ? {
          id: course._id,
          name: course.name || course.title,
          code: course.code
        } : {
          id: lock.courseId,
          name: 'Unknown Course',
          code: 'N/A'
        },
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
    
    res.json({
      success: true,
      data: enrichedData,
      count: enrichedData.length
    });
  } catch (error) {
    console.error('Error fetching dean locked students:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching locked students for dean',
      error: error.message
    });
  }
});

// @route   POST /api/quiz-unlock/teacher-unlock/:lockId
// @desc    Unlock a student quiz by teacher
// @access  Private (Teacher)
router.post('/teacher-unlock/:lockId', auth, authorizeRoles('teacher', 'coordinator'), async (req, res) => {
  try {
    const { lockId } = req.params;
    const { reason, notes } = req.body;
    const teacherId = req.user.id;
    
    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Unlock reason is required'
      });
    }
    
    const lock = await QuizLock.findById(lockId);
    
    if (!lock) {
      return res.status(404).json({
        success: false,
        message: 'Quiz lock not found'
      });
    }
    
    // Get the related data separately to avoid populate issues
    const student = await User.findById(lock.studentId).select('name email regno');
    const quiz = await Quiz.findById(lock.quizId).select('title');
    const course = await Course.findById(lock.courseId).select('name code title');
    
    // Verify teacher has access to this student through sections
    const Section = require('../models/Section');
    const sections = await Section.find({
      $or: [
        { teacher: teacherId },
        { teachers: teacherId }
      ],
      students: lock.studentId._id
    });
    
    if (sections.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to unlock this student'
      });
    }
    
    // Check if teacher can still unlock
    if (!lock.canTeacherUnlock) {
      return res.status(400).json({
        success: false,
        message: 'Teacher unlock limit exceeded. Dean authorization required.',
        requiresDeanUnlock: true
      });
    }
    
    // Perform the unlock
    await lock.unlockByTeacher(teacherId, reason, notes);
    
    // Log the unlock action
    console.log(`🔓 Quiz unlocked by teacher - Student: ${student?.name}, Quiz: ${quiz?.title}, Teacher: ${req.user.name}`);
    
    res.json({
      success: true,
      message: 'Student quiz unlocked successfully',
      data: {
        student: lock.studentId.name,
        quiz: lock.quizId.title,
        course: lock.courseId.name,
        unlockCount: lock.teacherUnlockCount + 1,
        remainingUnlocks: Math.max(0, 2 - lock.teacherUnlockCount)
      }
    });
  } catch (error) {
    console.error('Error unlocking quiz by teacher:', error);
    res.status(500).json({
      success: false,
      message: 'Error unlocking quiz',
      error: error.message
    });
  }
});

// @route   POST /api/quiz-unlock/dean-unlock/:lockId
// @desc    Unlock a student quiz by dean
// @access  Private (Dean/Admin)
router.post('/dean-unlock/:lockId', auth, authorizeRoles('admin', 'dean'), async (req, res) => {
  try {
    const { lockId } = req.params;
    const { reason, notes } = req.body;
    const deanId = req.user.id;
    
    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Unlock reason is required'
      });
    }
    
    const lock = await QuizLock.findById(lockId);
    
    if (!lock) {
      return res.status(404).json({
        success: false,
        message: 'Quiz lock not found'
      });
    }
    
    // Get the related data separately to avoid populate issues
    const student = await User.findById(lock.studentId).select('name email regno');
    const quiz = await Quiz.findById(lock.quizId).select('title');
    const course = await Course.findById(lock.courseId).select('name code title');
    
    if (!lock.isLocked) {
      return res.status(400).json({
        success: false,
        message: 'Quiz is not currently locked'
      });
    }
    
    // Perform the unlock
    await lock.unlockByDean(deanId, reason, notes);
    
    // Log the unlock action
    console.log(`🔓 Quiz unlocked by dean - Student: ${student?.name}, Quiz: ${quiz?.title}, Dean: ${req.user.name}`);
    
    res.json({
      success: true,
      message: 'Student quiz unlocked successfully by dean',
      data: {
        student: student?.name,
        quiz: quiz?.title,
        course: course?.name || course?.title,
        deanUnlockCount: lock.deanUnlockCount + 1,
        teacherUnlockCount: lock.teacherUnlockCount
      }
    });
  } catch (error) {
    console.error('Error unlocking quiz by dean:', error);
    res.status(500).json({
      success: false,
      message: 'Error unlocking quiz',
      error: error.message
    });
  }
});

// @route   GET /api/quiz-unlock/lock-status/:studentId/:quizId
// @desc    Check quiz lock status for a student
// @access  Private
router.get('/lock-status/:studentId/:quizId', auth, async (req, res) => {
  try {
    const { studentId, quizId } = req.params;
    const currentUserId = req.user.id;
    const userRole = req.user.role;
    
    // Students can only check their own status
    if (userRole === 'student' && studentId !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const lock = await QuizLock.findOne({ studentId, quizId })
      .populate('studentId', 'name email regno')
      .populate('quizId', 'title passingScore')
      .populate('courseId', 'name code');
    
    if (!lock) {
      return res.json({
        success: true,
        isLocked: false,
        data: null
      });
    }
    
    const response = {
      success: true,
      isLocked: lock.isLocked,
      data: {
        lockId: lock._id,
        reason: lock.failureReason,
        lockTimestamp: lock.lockTimestamp,
        lastFailureScore: lock.lastFailureScore,
        passingScore: lock.passingScore,
        totalAttempts: lock.totalAttempts,
        unlockAuthorizationLevel: lock.unlockAuthorizationLevel,
        teacherUnlockCount: lock.teacherUnlockCount,
        remainingTeacherUnlocks: lock.remainingTeacherUnlocks,
        deanUnlockCount: lock.deanUnlockCount,
        canTeacherUnlock: lock.canTeacherUnlock,
        requiresDeanUnlock: lock.requiresDeanUnlock
      }
    };
    
    // Add additional details for teachers and admins
    if (['teacher', 'coordinator', 'admin', 'dean'].includes(userRole)) {
      response.data.student = {
        id: lock.studentId._id,
        name: lock.studentId.name,
        email: lock.studentId.email,
        regno: lock.studentId.regno
      };
      response.data.unlockHistory = {
        teacher: lock.teacherUnlockHistory,
        dean: lock.deanUnlockHistory
      };
    }
    
    res.json(response);
  } catch (error) {
    console.error('Error checking lock status:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking lock status',
      error: error.message
    });
  }
});

// @route   POST /api/quiz-unlock/check-and-lock
// @desc    Check quiz score and lock if failed (called after quiz submission)
// @access  Private
router.post('/check-and-lock', auth, async (req, res) => {
  try {
    const { studentId, quizId, courseId, score, passingScore } = req.body;
    
    if (!studentId || !quizId || !courseId || score === undefined || passingScore === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    // Get or create lock record
    const lock = await QuizLock.getOrCreateLock(studentId, quizId, courseId, passingScore);
    
    // Record the attempt
    await lock.recordAttempt(score);
    
    // Check if student failed
    const failed = score < passingScore;
    
    if (failed) {
      // Lock the quiz
      await lock.lockQuiz('BELOW_PASSING_SCORE', score, passingScore);
      
      console.log(`🔒 Quiz locked for failing score - Student: ${studentId}, Quiz: ${quizId}, Score: ${score}/${passingScore}`);
      
      res.json({
        success: true,
        locked: true,
        message: 'Quiz locked due to failing score',
        data: {
          score,
          passingScore,
          unlockAuthorizationLevel: lock.unlockAuthorizationLevel,
          teacherUnlockCount: lock.teacherUnlockCount,
          remainingTeacherUnlocks: lock.remainingTeacherUnlocks
        }
      });
    } else {
      // Student passed, ensure quiz is unlocked
      if (lock.isLocked) {
        lock.isLocked = false;
        await lock.save();
      }
      
      res.json({
        success: true,
        locked: false,
        message: 'Quiz completed successfully',
        data: {
          score,
          passingScore
        }
      });
    }
  } catch (error) {
    console.error('Error checking and locking quiz:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing quiz result',
      error: error.message
    });
  }
});

// @route   GET /api/quiz-unlock/unlock-history/:studentId/:quizId
// @desc    Get unlock history for a specific student-quiz combination
// @access  Private (Teacher/Admin)
router.get('/unlock-history/:studentId/:quizId', auth, authorizeRoles('teacher', 'coordinator', 'admin', 'dean'), async (req, res) => {
  try {
    const { studentId, quizId } = req.params;
    
    const lock = await QuizLock.findOne({ studentId, quizId })
      .populate('teacherUnlockHistory.teacherId', 'name email')
      .populate('deanUnlockHistory.deanId', 'name email')
      .populate('studentId', 'name email regno')
      .populate('quizId', 'title');
    
    if (!lock) {
      return res.status(404).json({
        success: false,
        message: 'No lock record found'
      });
    }
    
    res.json({
      success: true,
      data: {
        student: lock.studentId,
        quiz: lock.quizId,
        lockInfo: {
          isLocked: lock.isLocked,
          reason: lock.failureReason,
          totalAttempts: lock.totalAttempts,
          teacherUnlockCount: lock.teacherUnlockCount,
          deanUnlockCount: lock.deanUnlockCount
        },
        unlockHistory: {
          teacher: lock.teacherUnlockHistory,
          dean: lock.deanUnlockHistory
        }
      }
    });
  } catch (error) {
    console.error('Error fetching unlock history:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching unlock history',
      error: error.message
    });
  }
});

module.exports = router;