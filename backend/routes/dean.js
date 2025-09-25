const express = require('express');
const router = express.Router();
const { auth, authorizeRoles } = require('../middleware/auth');
const deanController = require('../controllers/deanController');

// Protect all routes for dean role
router.use(auth, authorizeRoles('dean'));

router.get('/overview', deanController.getOverview);
router.get('/departments', deanController.getDepartments);
router.get('/analytics', deanController.getAnalytics);

// School management routes
router.get('/school-management/options', deanController.getSchoolManagementOptions);
router.put('/department/:deptId/hod', deanController.setDepartmentHod);
router.get('/department/:deptId/courses', deanController.getDepartmentCourses);
router.get('/course/:courseId/relations', deanController.getCourseRelations);
router.get('/course/:courseId/sections', deanController.getCourseSections);
router.get('/course/:courseId/sections/export', deanController.exportCourseSectionsCsv);
router.get('/section/:sectionId/analytics/export', deanController.exportSectionAnalyticsCsv);
router.get('/teacher/:teacherId/details', deanController.getTeacherDetails);
router.get('/student/:studentId/details', deanController.getStudentDetails);
router.get('/student/search', deanController.getStudentByRegNo);
// Section analytics (detailed) for dean
router.get('/section/:sectionId/analytics', deanController.getSectionAnalyticsDetailed);
router.get('/sections', deanController.getSections);

// Get dean's assigned sections and teaching assignments
// router.get('/assignments', deanController.getDeanAssignments); // TODO: Implement getDeanAssignments

module.exports = router;
