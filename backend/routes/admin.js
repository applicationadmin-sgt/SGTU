
const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

const { auth, authorizeRoles, switchRole } = require('../middleware/auth');
const adminController = require('../controllers/adminController');
const videoController = require('../controllers/videoController');
const analyticsController = require('../controllers/analyticsController');
const settingController = require('../controllers/settingController');
const unitController = require('../controllers/unitController');
const { authorizePermissions } = require('../middleware/auth');

// Debug route (no auth for testing)
router.get('/debug/videos', adminController.debugVideos);

// All routes protected by admin role
router.use(auth, authorizeRoles('admin'));

// Bulk messaging (email or notification)
router.post('/bulk-message', authorizeRoles('admin'), adminController.bulkMessage);

// Dashboard activity feed
router.get('/audit-logs/recent', adminController.getRecentAuditLogs);
// Student & Teacher analytics
router.get('/analytics/student/:studentId/heatmap', analyticsController.studentHeatmap);
router.get('/analytics/teacher/:teacherId/performance', analyticsController.teacherPerformance);
router.get('/analytics/export', analyticsController.exportAnalyticsCSV);
// Super Admin: Add admin
router.post('/add-admin', authorizeRoles('admin'), adminController.addAdmin);
// Global settings
router.get('/settings', settingController.getSettings);
router.post('/settings', settingController.updateSetting);
// Change own password
router.post('/change-password', adminController.changeOwnPassword);
// Bulk assign courses via CSV
router.post('/course/bulk-assign', upload.single('file'), adminController.bulkAssignCourses);
// Bulk upload courses via CSV
router.post('/course/bulk', upload.single('file'), adminController.bulkUploadCourses);
// Get all courses
router.get('/courses', adminController.getAllCourses);
// Get courses by department
router.get('/courses/department/:departmentId', adminController.getCoursesByDepartment);
// Get all students
router.get('/students', adminController.getAllStudents);
// Get all teachers
router.get('/teachers', adminController.getAllTeachers);
// Get all users
router.get('/users', adminController.getAllUsers);
// Get all schools
router.get('/schools', async (req, res) => {
  try {
    const School = require('../models/School');
    const schools = await School.find({}).sort({ name: 1 });
    res.json(schools);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
// Get all departments  
router.get('/departments', async (req, res) => {
  try {
    const Department = require('../models/Department');
    const departments = await Department.find({}).populate('school', 'name code').sort({ name: 1 });
    res.json(departments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
// Get teachers by department (for HOD)
router.get('/teachers/department', adminController.getTeachersByDepartment);
// Super admin: Create announcement for teachers and/or students
router.post('/announcement', adminController.createAnnouncement);
// Edit announcement
router.put('/announcement/:id', adminController.updateAnnouncement);
// Delete announcement
router.delete('/announcement/:id', adminController.deleteAnnouncement);

// Admin: Toggle teacher announcement permission
router.patch('/teacher/:teacherId/announce-permission', adminController.toggleTeacherAnnounce);

// Get all announcements
router.get('/announcement', require('../controllers/announcementController').getAnnouncements);

// Search teachers (for dropdown)
router.get('/teachers/search', adminController.searchTeachers);

// Teacher management
router.post('/teacher', authorizePermissions('manage_teachers'), adminController.addTeacher);
router.post('/teacher/bulk', authorizePermissions('manage_teachers'), upload.single('file'), adminController.bulkUploadTeachers);
router.post('/teacher/reset-password', authorizePermissions('manage_teachers'), adminController.resetTeacherPassword);
router.patch('/teacher/:id/deactivate', authorizePermissions('manage_teachers'), adminController.deactivateTeacher);
router.get('/teachers', authorizePermissions('manage_teachers'), adminController.getAllTeachers);

// Student management
router.post('/student', adminController.createStudent);
router.post('/student/bulk', upload.single('file'), adminController.bulkUploadStudents);
router.post('/student/assign-courses', adminController.assignCourses); // batch assign
router.get('/student/:studentId/assignment-history', adminController.getAssignmentHistory);
router.patch('/student/:id', adminController.editStudent);
router.delete('/student/:id', adminController.removeStudent);

// Course management
router.post('/course', adminController.createCourse);
router.patch('/course/:id', adminController.editCourse);
router.delete('/course/:id', adminController.deleteCourse);

// Unit management
router.post('/course/:id/unit', require('../controllers/unitController').createUnit);
router.get('/course/:id/units', require('../controllers/unitController').getCourseUnits);

// Unit deadline management
router.patch('/unit/:unitId', require('../controllers/unitController').updateUnit);
router.patch('/unit/:unitId/deadline', require('../controllers/unitController').updateUnitDeadline);
router.get('/unit/:unitId/deadline', require('../controllers/unitController').getUnitDeadline);

// Course details, videos, and students - new endpoints
router.get('/course/:id/details', adminController.getCourseDetails);
router.get('/course/:id/videos', adminController.getCourseVideos);
router.get('/course/:id/students', adminController.getCourseStudents);
router.get('/video/:id/analytics', videoController.getVideoAnalytics);

// Assign course to teacher
router.post('/course/:id/assign-teacher', async (req, res) => {
	try {
		const { teacherId } = req.body;
		// Find the teacher's User ID from teacherId
		const teacher = await require('../models/User').findOne({ teacherId, role: 'teacher' });
		if (!teacher) {
			return res.status(400).json({ message: `Teacher with ID ${teacherId} not found` });
		}
		
		// Add the teacher to the course's teachers array
		await require('../models/Course').findByIdAndUpdate(req.params.id, { 
			$addToSet: { teachers: teacher._id } 
		});
		
		// Also add the course to the teacher's coursesAssigned array for two-way relationship
		await require('../models/User').findByIdAndUpdate(teacher._id, {
			$addToSet: { coursesAssigned: req.params.id }
		});
		
		// Log the action
		await require('../models/AuditLog').create({
			action: 'assign_teacher_to_course',
			performedBy: req.user._id,
			targetUser: teacher._id,
			details: { courseId: req.params.id, teacherId }
		});
		
		res.json({ message: 'Teacher assigned to course' });
	} catch (err) {
		res.status(400).json({ message: err.message });
	}
});

// Video management
router.post('/video/upload', upload.single('file'), videoController.uploadVideo);
router.delete('/video/:id', videoController.removeVideo);
router.patch('/video/:id/warn', videoController.warnVideo);

// Analytics
router.get('/analytics/overview', analyticsController.getOverview);
router.get('/analytics/trends', analyticsController.getEnrollmentTrends);
router.get('/analytics/heatmap', analyticsController.getActivityHeatmap);
router.get('/analytics/top-courses', analyticsController.getTopCourses);

// Enhanced/detailed analytics endpoints
router.get('/analytics/detailed/overview', analyticsController.getDetailedOverview);
router.get('/analytics/detailed/trends', analyticsController.getDetailedEnrollmentTrends);
router.get('/analytics/detailed/heatmap', analyticsController.getDetailedActivityHeatmap);
router.get('/analytics/course/:courseId', analyticsController.getCourseAnalytics);
router.get('/analytics/student/:studentId', analyticsController.studentAnalytics); // Legacy endpoint
router.get('/analytics/student/:studentId/detailed', analyticsController.getStudentDetailedAnalytics); // New detailed endpoint
router.get('/analytics/student', analyticsController.searchStudent); // ?regNo=...
router.get('/analytics/teacher/:teacherId', analyticsController.getTeacherAnalytics);

// Dean Management Routes
router.post('/deans', adminController.createDean);
router.get('/deans', adminController.getAllDeans);
router.put('/deans/:id', adminController.updateDean);
router.delete('/deans/:id', adminController.deleteDean);
// Reset dean password
router.post('/deans/reset-password', adminController.resetDeanPassword);

// HOD Management Routes
router.post('/hods', adminController.createHOD);
router.get('/hods', adminController.getAllHODs);
router.put('/hods/:id', adminController.updateHOD);
router.delete('/hods/:id', adminController.deleteHOD);

// Security lock management for unit quizzes
const StudentProgress = require('../models/StudentProgress');

router.get('/course/:courseId/unit/:unitId/locks', async (req, res) => {
	try {
		const { courseId, unitId } = req.params;
		const locks = await StudentProgress.find({ course: courseId, 'units.unitId': unitId })
			.populate('student', 'name email regNo')
			.select('student units.unitId units.securityLock');
		const result = locks.map(doc => {
			const unit = doc.units.find(u => u.unitId.toString() === unitId);
			return {
				student: doc.student,
				locked: unit?.securityLock?.locked || false,
				reason: unit?.securityLock?.reason || '',
				lockedAt: unit?.securityLock?.lockedAt || null,
				violationCount: unit?.securityLock?.violationCount || 0,
				autoSubmittedAttempt: unit?.securityLock?.autoSubmittedAttempt || null,
				unlockHistory: unit?.securityLock?.unlockHistory || []
			};
		});
		res.json(result);
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

router.post('/course/:courseId/unit/:unitId/unlock', async (req, res) => {
	try {
		const { courseId, unitId } = req.params;
		const { studentId } = req.body;
		if (!studentId) return res.status(400).json({ message: 'studentId is required' });
		const progress = await StudentProgress.findOne({ course: courseId, student: studentId });
		if (!progress) return res.status(404).json({ message: 'Progress not found' });
		const unit = progress.units.find(u => u.unitId.toString() === unitId);
		if (!unit) return res.status(404).json({ message: 'Unit progress not found' });
		unit.securityLock = unit.securityLock || {};
		// Append unlock history entry
		unit.securityLock.unlockHistory = unit.securityLock.unlockHistory || [];
		unit.securityLock.unlockHistory.push({
			unlockedBy: req.user?._id,
			unlockedAt: new Date(),
			note: req.body?.note || ''
		});
		// Unlock
		unit.securityLock.locked = false;
		unit.securityLock.reason = '';
		unit.securityLock.lockedAt = null;
	await progress.save();
	const last = unit.securityLock.unlockHistory[unit.securityLock.unlockHistory.length - 1];
	res.json({ message: 'Unit quiz unlocked for student', lastUnlock: last });
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// Global: List all unlock requests across all courses/units
// Includes: (1) Security-locked units, (2) Attempts exhausted (>= effective limit) and not passed
router.get('/locks', async (req, res) => {
	try {
		const items = [];

		// 1) Security-locked units from StudentProgress
		const lockedDocs = await StudentProgress
			.find({ 'units.securityLock.locked': true })
			.populate('student', 'name email regNo')
			.populate('course', 'name code')
			.populate('units.unitId', 'title name')
			.populate('units.securityLock.autoSubmittedAttempt', '_id percentage passed completedAt')
			.populate('units.securityLock.unlockHistory.unlockedBy', 'name email');

		for (const doc of lockedDocs) {
			for (const unit of doc.units || []) {
				if (unit?.securityLock?.locked) {
					items.push({
						type: 'securityLock',
						student: doc.student,
						course: doc.course,
						unit: unit.unitId ? { _id: unit.unitId._id || unit.unitId, title: unit.unitId.title || unit.unitId.name || 'Unit' } : null,
						lockedAt: unit.securityLock.lockedAt || null,
						reason: unit.securityLock.reason || 'Locked due to security violations',
						violationCount: unit.securityLock.violationCount || 0,
						autoSubmittedAttempt: unit.securityLock.autoSubmittedAttempt || null,
						unlockHistory: unit.securityLock.unlockHistory || [],
						attemptsTaken: undefined,
						attemptLimit: undefined,
						extraAttempts: unit.extraAttempts || 0
					});
				}
			}
		}

		// 2) Attempts exhausted: aggregate attempts per student-course-unit
		const QuizAttempt = require('../models/QuizAttempt');
		const Unit = require('../models/Unit');
		const agg = await QuizAttempt.aggregate([
			{ $match: { $or: [ { completedAt: { $ne: null } }, { isComplete: true } ] } },
			{ $group: { _id: { student: '$student', course: '$course', unit: '$unit' }, attemptsTaken: { $sum: 1 }, lastCompletedAt: { $max: '$completedAt' } } },
			{ $match: { attemptsTaken: { $gte: 3 } } }
		]);

		// Map to add details and filter out those who already passed
		for (const rec of agg) {
			const { student, course, unit } = rec._id;
			const progress = await StudentProgress
				.findOne({ student, course })
				.populate('student', 'name email regNo')
				.populate('course', 'name code');
			if (!progress) continue;
			const unitProg = progress.units.find(u => u.unitId.toString() === String(unit));
			if (!unitProg) continue;
			if (unitProg.unitQuizPassed) continue; // skip passed
			const extraAttempts = unitProg.extraAttempts || 0;
			const effectiveLimit = 3 + extraAttempts;
			if (rec.attemptsTaken >= effectiveLimit) {
				// Fetch unit title
				const unitDoc = await Unit.findById(unit).select('title name');
				items.push({
					type: 'attemptsExhausted',
					student: progress.student,
					course: progress.course,
					unit: unitDoc ? { _id: unitDoc._id, title: unitDoc.title || unitDoc.name || 'Unit' } : { _id: unit },
					lockedAt: rec.lastCompletedAt || null,
					reason: 'Attempt limit reached',
					violationCount: 0,
					autoSubmittedAttempt: null,
					attemptsTaken: rec.attemptsTaken,
					attemptLimit: effectiveLimit,
					extraAttempts
				});
			}
		}

		// Sort: security locks by lockedAt, then attempts exhausted by lockedAt
		items.sort((a, b) => new Date(b.lockedAt || 0) - new Date(a.lockedAt || 0));
		res.json(items);
	} catch (err) {
		console.error('Error building locks list:', err);
		res.status(500).json({ message: err.message });
	}
});

// Grant extra attempts for a specific student and unit
router.post('/course/:courseId/unit/:unitId/grant-attempts', async (req, res) => {
	try {
		const { courseId, unitId } = req.params;
		const { studentId, extraAttempts = 1 } = req.body;
		if (!studentId) return res.status(400).json({ message: 'studentId is required' });
		const add = Math.max(1, parseInt(extraAttempts, 10) || 1);
		const progress = await StudentProgress.findOne({ course: courseId, student: studentId });
		if (!progress) return res.status(404).json({ message: 'Progress not found' });
		const unit = progress.units.find(u => u.unitId.toString() === unitId);
		if (!unit) return res.status(404).json({ message: 'Unit progress not found' });
		if (!unit.unitQuizPassed) {
			unit.extraAttempts = (unit.extraAttempts || 0) + add;
			await progress.save();
			return res.json({ message: `Granted ${add} extra attempt(s).`, extraAttempts: unit.extraAttempts });
		} else {
			return res.status(400).json({ message: 'Quiz already passed for this unit' });
		}
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// Get user assignments (sections and courses)
router.get('/user-assignments/:userId', adminController.getUserAssignments);

// Multi-role management routes
router.post('/users/multi-role', adminController.createMultiRoleUser);
router.get('/users/:userId/roles', adminController.getUserRoles);
router.post('/users/:userId/switch-role', adminController.switchUserRole);
router.patch('/users/:userId/roles', adminController.updateUserRoles);

module.exports = router;

