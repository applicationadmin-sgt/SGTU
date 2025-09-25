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

// Apply authentication to all routes
router.use(auth);

// Teacher routes
router.post(
  '/schedule',
  authorizeRoles('teacher'),
  liveClassController.scheduleClass
);

router.get(
  '/teacher/classes',
  authorizeRoles('teacher'),
  liveClassController.getTeacherClasses
);

router.get(
  '/teacher/sections-courses',
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
router.get(
  '/student/classes',
  authorizeRoles('student'),
  liveClassController.getStudentClasses
);

router.post(
  '/:classId/join',
  authorizeRoles('student'),
  liveClassController.joinClass
);

router.post(
  '/:classId/leave',
  authorizeRoles('student'),
  liveClassController.leaveClass
);

// Shared routes (teacher and student)
router.get(
  '/:classId',
  authorizeRoles('teacher', 'student', 'admin'),
  liveClassController.getClassDetails
);

module.exports = router;