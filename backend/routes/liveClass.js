const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { auth, authorizeRoles } = require('../middleware/auth');
const liveClassController = require('../controllers/liveClassController');

// Configure multer for recording uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads/recordings');
    // Create directory if it doesn't exist
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `recording-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Accept video files
  if (file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Only video files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB limit
  }
});

// Configure multer for class materials
const materialsStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads/live-classes');
    // Create directory if it doesn't exist
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `material-${uniqueSuffix}${ext}`);
  }
});

const materialsFileFilter = (req, file, cb) => {
  // Accept documents, images, audio, and video files
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif',
    'audio/mpeg',
    'audio/mp3',
    'video/mp4',
    'video/webm'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed'), false);
  }
};

const materialsUpload = multer({
  storage: materialsStorage,
  fileFilter: materialsFileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

// Public access token join (before auth middleware)
router.post(
  '/public/join-by-token',
  liveClassController.publicJoinByToken
);

// Apply authentication to all routes
router.use(auth);

// Teacher routes
router.post(
  '/schedule',
  authorizeRoles('teacher'),
  liveClassController.scheduleClass
);

// Enhanced: Schedule merged class for multiple sections
router.post(
  '/schedule-merged',
  authorizeRoles('teacher'),
  liveClassController.scheduleMergedClass
);

// Enhanced: Get teacher's enhanced live classes (new endpoint for frontend)
router.get(
  '/teacher',
  authorizeRoles('teacher'),
  liveClassController.getTeacherClasses
);

router.get(
  '/teacher/classes',
  (req, res, next) => {
    console.log('🎯 DEBUG: /teacher/classes route hit by user:', req.user?.email, req.user?.role);
    next();
  },
  authorizeRoles('teacher'),
  liveClassController.getTeacherClasses
);

router.get(
  '/teacher/sections-courses',
  (req, res, next) => {
    console.log('🎯 DEBUG: /teacher/sections-courses route hit by user:', req.user?.email, req.user?.role);
    next();
  },
  authorizeRoles('teacher'),
  liveClassController.getTeacherSectionsAndCourses
);

router.patch(
  '/:classId/start',
  authorizeRoles('teacher'),
  liveClassController.startClass
);

router.patch(
  '/:classId/end',
  authorizeRoles('teacher'),
  liveClassController.endClass
);

router.patch(
  '/:classId/settings',
  authorizeRoles('teacher'),
  liveClassController.updateClassSettings
);

// Waiting room routes removed - using direct enrollment verification instead

router.delete(
  '/:classId',
  authorizeRoles('teacher'),
  liveClassController.deleteClass
);

// Upload recording route
router.post(
  '/:classId/upload-recording',
  authorizeRoles('teacher'),
  upload.single('recording'),
  liveClassController.uploadRecording
);

// Student routes
// Enhanced: Get student's enhanced live classes (new endpoint for frontend)
router.get(
  '/student',
  auth,
  authorizeRoles('student'),
  liveClassController.getStudentClasses
);

router.get(
  '/student/classes',
  auth,
  authorizeRoles('student'),
  liveClassController.getStudentClasses
);

router.post(
  '/:classId/join',
  auth,
  authorizeRoles('student'),
  liveClassController.joinClass
);

router.post(
  '/:classId/leave',
  auth,
  authorizeRoles('student'),
  liveClassController.leaveClass
);

// Enhanced: Multi-role access token route
router.post(
  '/join-by-token',
  auth,
  liveClassController.joinByToken
);

// Legacy support
router.post(
  '/join/:accessToken',
  auth,
  liveClassController.joinClassByToken
);

// Enhanced: Whiteboard notes management
router.post(
  '/:classId/whiteboard-notes',
  auth,
  authorizeRoles('teacher', 'student', 'admin', 'hod', 'dean'),
  liveClassController.saveWhiteboardNote
);

router.get(
  '/:classId/whiteboard-notes',
  auth,
  authorizeRoles('teacher', 'student', 'admin', 'hod', 'dean'),
  liveClassController.getWhiteboardNotes
);

// Enhanced: Class analytics for monitoring large classes
router.get(
  '/:classId/analytics',
  auth,
  authorizeRoles('teacher', 'admin', 'hod', 'dean'),
  liveClassController.getClassAnalytics
);

// Multi-role access: HOD and Dean can join any class
router.get(
  '/department/:deptId/classes',
  auth,
  authorizeRoles('hod', 'dean', 'admin'),
  async (req, res) => {
    try {
      const { deptId } = req.params;
      const user = req.user;
      
      // HODs can see classes in their department
      // Deans can see all classes in their school's departments
      const query = user.role === 'hod' ? 
        { department: deptId } : 
        { school: user.school };
        
      const classes = await LiveClass.find({
        ...query,
        status: { $in: ['scheduled', 'live'] },
        isActive: true
      })
      .populate('teacher', 'name email')
      .populate('sections', 'name')
      .populate('course', 'title courseCode')
      .sort({ scheduledAt: 1 });
      
      res.json({ success: true, classes });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// Get class participants
router.get(
  '/:classId/participants',
  auth,
  authorizeRoles('teacher', 'student', 'admin', 'hod', 'dean'),
  liveClassController.getClassParticipants
);

// Get class messages/chat
router.get(
  '/:classId/messages',
  auth,
  authorizeRoles('teacher', 'student', 'admin', 'hod', 'dean'),
  liveClassController.getClassMessages
);

// File upload for teachers
router.post(
  '/:classId/upload-file',
  auth,
  authorizeRoles('teacher', 'admin', 'hod', 'dean'),
  materialsUpload.single('file'),
  liveClassController.uploadClassFile
);

// Get class files
router.get(
  '/:classId/files',
  auth,
  authorizeRoles('teacher', 'student', 'admin', 'hod', 'dean'),
  liveClassController.getClassFiles
);

// Create poll
router.post(
  '/:classId/polls',
  auth,
  authorizeRoles('teacher', 'admin', 'hod', 'dean'),
  liveClassController.createPoll
);

// Get polls
router.get(
  '/:classId/polls',
  auth,
  authorizeRoles('teacher', 'student', 'admin', 'hod', 'dean'),
  liveClassController.getClassPolls
);

// Submit poll response
router.post(
  '/:classId/polls/:pollId/respond',
  auth,
  authorizeRoles('student', 'teacher', 'admin', 'hod', 'dean'),
  liveClassController.respondToPoll
);

// Delete file
router.delete(
  '/:classId/files/:fileId',
  auth,
  authorizeRoles('teacher', 'admin', 'hod', 'dean'),
  liveClassController.deleteFile
);

// Shared routes (teacher and student)
router.get(
  '/:classId',
  auth,
  authorizeRoles('teacher', 'student', 'admin', 'hod', 'dean'),
  liveClassController.getClassDetails
);

module.exports = router;