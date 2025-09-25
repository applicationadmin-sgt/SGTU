const express = require('express');
const router = express.Router();
const { auth, authorizeRoles } = require('../middleware/auth');
const hodController = require('../controllers/hodController');

// All routes protected by HOD role
router.use(auth, authorizeRoles('hod'));

// Get HOD dashboard overview
router.get('/dashboard', hodController.getHODDashboard);

// Get pending teacher announcements for approval
router.get('/announcements/pending', hodController.getPendingAnnouncements);

// Approve or reject teacher announcement
router.put('/announcements/:announcementId/review', hodController.reviewAnnouncement);

// Get department teachers
router.get('/teachers', hodController.getDepartmentTeachers);

// Get department sections
router.get('/sections', hodController.getDepartmentSections);

// Get department courses
router.get('/courses', hodController.getDepartmentCourses);

// HOD direct management: teacher-course and section operations
router.post('/teachers/:teacherId/courses/:courseId', hodController.assignCourseToTeacher);
router.delete('/teachers/:teacherId/courses/:courseId', hodController.removeCourseFromTeacher);
router.patch('/teachers/:teacherId/section', hodController.changeTeacherSection);

// Get available sections for teacher-course assignment (smart selection)
router.get('/teachers/:teacherId/courses/:courseId/available-sections', hodController.getAvailableSectionsForTeacherCourse);

// Request teacher assignment to section (requires dean approval)
router.post('/assign/teacher', hodController.requestTeacherAssignment);

// Request course assignment to section (requires dean approval)
router.post('/assign/course', hodController.requestCourseAssignment);

// Get HOD's assignment requests
router.get('/assignment-requests', hodController.getAssignmentRequests);

// Analytics endpoints
// Get comprehensive department analytics
router.get('/analytics/department', hodController.getDepartmentAnalytics);

// Get course-wise analytics for department
router.get('/analytics/courses', hodController.getCourseAnalytics);
// Get relations (teachers, students with sections) for a specific course
router.get('/courses/:courseId/relations', hodController.getCourseRelations);
// Get sections assigned to a course
router.get('/courses/:courseId/sections', hodController.getCourseSections);

// Get student-wise analytics for department
router.get('/analytics/students', hodController.getStudentAnalytics);

// Get section-wise analytics for department
router.get('/analytics/sections', hodController.getSectionAnalytics);

// Get detailed analytics for a specific section
router.get('/sections/:sectionId/analytics', hodController.getSpecificSectionAnalytics);

// Get detailed analytics for a specific student
router.get('/analytics/student/:studentId', hodController.getStudentDetailedAnalytics);

// Course Coordinator (CC) management and reviews
router.post('/courses/cc/assign', hodController.assignCourseCoordinator);
router.post('/courses/cc/remove', hodController.removeCourseCoordinator);
router.get('/courses/:courseId/coordinators', hodController.getCourseCoordinators);
router.get('/reviews/flagged', hodController.getFlaggedReviews);
router.post('/reviews/:reviewId/resolve', hodController.hodResolveFlaggedReview);

// Approved questions listing and management
router.get('/questions/approved', hodController.getApprovedQuestions);
router.put('/questions/:quizId/:questionId', hodController.updateQuizQuestion);
router.delete('/questions/:quizId/:questionId', hodController.deleteQuizQuestion);
router.post('/questions', hodController.createQuizQuestion);

module.exports = router;