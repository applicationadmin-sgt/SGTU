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

// @route   GET /api/quiz-unlock/hod-locked-students
// @desc    Get locked students requiring HOD authorization
// @access  Private (HOD/Admin)
router.get('/hod-locked-students', auth, authorizeRoles('admin', 'hod'), async (req, res) => {
  try {
    const hodId = req.user.id;
    const lockedStudents = await QuizLock.getLockedStudentsForHOD(hodId);
    
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
          title: 'Unknown Quiz'
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
          hodUnlockCount: lock.hodUnlockCount,
          totalAttempts: lock.totalAttempts,
          requiresHodUnlock: lock.requiresHodUnlock
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
    console.error('Error fetching HOD locked students:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching locked students for HOD',
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
        message: 'Teacher unlock limit exceeded. HOD authorization required.',
        requiresHodUnlock: true,
        nextAuthorizationLevel: 'HOD'
      });
    }
    
    // Perform the unlock
    await lock.unlockByTeacher(teacherId, reason, notes);
    
    // IMPORTANT: Also clear any security locks for this student-unit combination
    // Security violations should be clearable by teacher unlock as well
    try {
      const StudentProgress = require('../models/StudentProgress');
      const Unit = require('../models/Unit');
      
      // Find the unit that contains this quiz
      const unit = await Unit.findOne({
        $or: [
          { quizPool: lock.quizId },
          { quizzes: lock.quizId }
        ]
      });
      
      if (unit) {
        // Find and update the student's progress to clear security lock
        const progress = await StudentProgress.findOne({ student: lock.studentId });
        if (progress) {
          const unitProgress = progress.units.find(u => u.unitId.toString() === unit._id.toString());
          if (unitProgress && unitProgress.securityLock && unitProgress.securityLock.locked) {
            console.log(`🔓 Also clearing security lock for student ${student?.name} in unit ${unit.title}`);
            unitProgress.securityLock.locked = false;
            unitProgress.securityLock.reason = `Cleared by teacher unlock: ${reason}`;
            unitProgress.securityLock.violationCount = 0;
            unitProgress.securityLock.lockedAt = null;
            await progress.save();
          }
        }
      }
    } catch (securityError) {
      console.warn('Could not clear security lock during teacher unlock:', securityError.message);
      // Don't fail the unlock if security clearing fails
    }
    
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

// @route   POST /api/quiz-unlock/hod-unlock/:lockId
// @desc    Unlock a student quiz by HOD
// @access  Private (HOD/Admin)
router.post('/hod-unlock/:lockId', auth, authorizeRoles('admin', 'hod'), async (req, res) => {
  try {
    const { lockId } = req.params;
    const { reason, notes } = req.body;
    const hodId = req.user.id;
    
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
    const course = await Course.findById(lock.courseId).populate('department').select('name code title department');
    
    // Verify HOD has access to this student through department
    const hod = await User.findById(hodId).populate('department');
    if (!hod || !hod.department) {
      return res.status(403).json({
        success: false,
        message: 'HOD department not found'
      });
    }
    
    // Check if the course belongs to HOD's department
    if (!course || !course.department || course.department._id.toString() !== hod.department._id.toString()) {
      return res.status(403).json({
        success: false,
        message: `You do not have access to unlock this student - course not in your department. Course dept: ${course?.department?.name || 'Unknown'}, Your dept: ${hod.department.name}`
      });
    }
    
    if (!lock.isLocked) {
      return res.status(400).json({
        success: false,
        message: 'Quiz is not currently locked'
      });
    }
    
    // Check if HOD authorization is required
    if (lock.unlockAuthorizationLevel !== 'HOD') {
      return res.status(400).json({
        success: false,
        message: `This quiz requires ${lock.unlockAuthorizationLevel.toLowerCase()} authorization`,
        authorizationLevel: lock.unlockAuthorizationLevel
      });
    }
    
    // Check if HOD has exceeded unlock limit
    if (lock.hodUnlockCount >= 3) {
      return res.status(400).json({
        success: false,
        message: 'HOD unlock limit exceeded (3/3). Dean authorization required.',
        requiresDeanUnlock: true,
        nextAuthorizationLevel: 'DEAN',
        hodUnlockCount: lock.hodUnlockCount,
        remainingHodUnlocks: 0
      });
    }
    
    // Perform the unlock
    await lock.unlockByHOD(hodId, reason, notes);
    
    // **NEW: Also clear any security locks for this student/unit combination**
    try {
      const StudentProgress = require('../models/StudentProgress');
      const Unit = require('../models/Unit');
      
      // Find the unit that contains this quiz
      const unit = await Unit.findOne({
        $or: [
          { quizPool: quiz._id },
          { quizzes: quiz._id }
        ]
      });
      
      if (unit) {
        // Clear security lock in StudentProgress
        await StudentProgress.updateOne(
          { 
            student: student._id,
            course: course._id,
            'units.unitId': unit._id
          },
          {
            $set: {
              'units.$.securityLock.locked': false,
              'units.$.securityLock.clearedBy': 'HOD',
              'units.$.securityLock.clearedAt': new Date(),
              'units.$.securityLock.clearedReason': `Security lock cleared by HOD unlock - ${reason}`
            }
          }
        );
        
        console.log(`🔓 Security lock also cleared by HOD for unit: ${unit.title}`);
      }
    } catch (securityError) {
      console.warn('Warning: Could not clear security lock:', securityError.message);
      // Don't fail the entire unlock operation if security lock clearing fails
    }
    
    // Log the unlock action
    console.log(`🔓 Quiz unlocked by HOD - Student: ${student?.name}, Quiz: ${quiz?.title}, HOD: ${req.user.name}`);
    
    res.json({
      success: true,
      message: 'Student quiz unlocked successfully by HOD',
      data: {
        student: student?.name,
        quiz: quiz?.title,
        course: course?.name || course?.title,
        hodUnlockCount: lock.hodUnlockCount,
        remainingHodUnlocks: Math.max(0, 3 - lock.hodUnlockCount),
        teacherUnlockCount: lock.teacherUnlockCount,
        nextAuthorizationLevel: lock.hodUnlockCount >= 3 ? 'DEAN' : 'HOD'
      }
    });
  } catch (error) {
    console.error('Error unlocking quiz by HOD:', error);
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
    
    // **NEW: Also clear any security locks for this student/unit combination**
    try {
      const StudentProgress = require('../models/StudentProgress');
      const Unit = require('../models/Unit');
      
      // Find the unit that contains this quiz
      const unit = await Unit.findOne({
        $or: [
          { quizPool: quiz._id },
          { quizzes: quiz._id }
        ]
      });
      
      if (unit) {
        // Clear security lock in StudentProgress
        await StudentProgress.updateOne(
          { 
            student: student._id,
            course: course._id,
            'units.unitId': unit._id
          },
          {
            $set: {
              'units.$.securityLock.locked': false,
              'units.$.securityLock.clearedBy': 'DEAN',
              'units.$.securityLock.clearedAt': new Date(),
              'units.$.securityLock.clearedReason': `Security lock cleared by Dean unlock - ${reason}`
            }
          }
        );
        
        console.log(`🔓 Security lock also cleared by Dean for unit: ${unit.title}`);
      }
    } catch (securityError) {
      console.warn('Warning: Could not clear security lock:', securityError.message);
      // Don't fail the entire unlock operation if security lock clearing fails
    }
    
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
        hodUnlockCount: lock.hodUnlockCount,
        deanUnlockCount: lock.deanUnlockCount,
        canTeacherUnlock: lock.canTeacherUnlock,
        requiresHodUnlock: lock.requiresHodUnlock,
        requiresDeanUnlock: lock.requiresDeanUnlock
      }
    };
    
    // Add additional details for teachers and admins
    if (['teacher', 'coordinator', 'admin', 'dean', 'hod'].includes(userRole)) {
      response.data.student = {
        id: lock.studentId._id,
        name: lock.studentId.name,
        email: lock.studentId.email,
        regno: lock.studentId.regno
      };
      response.data.unlockHistory = {
        teacher: lock.teacherUnlockHistory,
        hod: lock.hodUnlockHistory,
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
          hod: lock.hodUnlockHistory,
          dean: lock.deanUnlockHistory,
          admin: lock.adminUnlockHistory
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

// @route   GET /api/quiz-unlock/admin-all-locked-students
// @desc    Get all locked students for admin dashboard (any type of lock)
// @access  Private (Admin only)
router.get('/admin-all-locked-students', auth, authorizeRoles('admin'), async (req, res) => {
  try {
    // Get all locked students regardless of authorization level
    const lockedStudents = await QuizLock.find({ isLocked: true })
      .select('studentId quizId courseId failureReason lockTimestamp lastFailureScore passingScore teacherUnlockCount hodUnlockCount deanUnlockCount adminUnlockCount unlockAuthorizationLevel totalAttempts')
      .sort({ lockTimestamp: -1 });

    // Enrich data with related information
    const enrichedData = await Promise.all(lockedStudents.map(async (lock) => {
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
          hodUnlockCount: lock.hodUnlockCount,
          deanUnlockCount: lock.deanUnlockCount,
          adminUnlockCount: lock.adminUnlockCount,
          unlockAuthorizationLevel: lock.unlockAuthorizationLevel,
          totalAttempts: lock.totalAttempts,
          isSecurityViolation: lock.failureReason === 'SECURITY_VIOLATION'
        }
      };
    }));

    res.json({
      success: true,
      data: enrichedData,
      count: enrichedData.length
    });
  } catch (error) {
    console.error('Error fetching all locked students for admin:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching locked students for admin',
      error: error.message
    });
  }
});

// @route   POST /api/quiz-unlock/admin-unlock/:lockId
// @desc    Admin override unlock (can unlock any quiz regardless of authorization level or violation type)
// @access  Private (Admin only)
router.post('/admin-unlock/:lockId', auth, authorizeRoles('admin'), async (req, res) => {
  try {
    const { lockId } = req.params;
    const { reason, notes } = req.body;
    const adminId = req.user.id;

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

    if (!lock.isLocked) {
      return res.status(400).json({
        success: false,
        message: 'Quiz is not currently locked'
      });
    }

    // Get related data for logging
    const student = await User.findById(lock.studentId).select('name email regno');
    const quiz = await Quiz.findById(lock.quizId).select('title');
    const course = await Course.findById(lock.courseId).select('name code title');

    // Admin can unlock anything - no authorization level restrictions
    await lock.unlockByAdmin(adminId, reason, notes);

    // **NEW: Also clear any security locks for this student/unit combination**
    try {
      const StudentProgress = require('../models/StudentProgress');
      const Unit = require('../models/Unit');
      
      // Find the unit that contains this quiz
      const unit = await Unit.findOne({
        $or: [
          { quizPool: quiz._id },
          { quizzes: quiz._id }
        ]
      });
      
      if (unit) {
        // Clear security lock in StudentProgress
        await StudentProgress.updateOne(
          { 
            student: student._id,
            course: course._id,
            'units.unitId': unit._id
          },
          {
            $set: {
              'units.$.securityLock.locked': false,
              'units.$.securityLock.clearedBy': 'ADMIN',
              'units.$.securityLock.clearedAt': new Date(),
              'units.$.securityLock.clearedReason': `Security lock cleared by Admin unlock - ${reason}`
            }
          }
        );
        
        console.log(`🔓 Security lock also cleared by Admin for unit: ${unit.title}`);
      }
    } catch (securityError) {
      console.warn('Warning: Could not clear security lock:', securityError.message);
      // Don't fail the entire unlock operation if security lock clearing fails
    }

    // Log the admin override unlock action
    console.log(`🔓 ADMIN OVERRIDE UNLOCK - Student: ${student?.name}, Quiz: ${quiz?.title}, Course: ${course?.name}, Admin: ${req.user.name}, Reason: ${reason}`);

    res.json({
      success: true,
      message: 'Quiz unlocked successfully by admin override',
      data: {
        student: {
          name: student?.name,
          regno: student?.regno
        },
        quiz: { title: quiz?.title },
        course: { name: course?.name },
        overrideLevel: lock.unlockAuthorizationLevel,
        lockReason: lock.failureReason,
        adminUnlockCount: lock.adminUnlockCount || 1
      }
    });
  } catch (error) {
    console.error('Error with admin unlock:', error);
    res.status(500).json({
      success: false,
      message: 'Error unlocking quiz',
      error: error.message
    });
  }
});

module.exports = router;