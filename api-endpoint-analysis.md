# API Endpoint Analysis & Issues

## Major Issues Found

### 1. Course API Endpoint Mismatches

**Frontend Calls:**
- `/api/admin/courses` (courseApi.js)
- `/api/admin/course/{id}/details`
- `/api/admin/course/{id}/videos`
- `/api/admin/course/{id}/students`
- `/api/admin/course` (POST for creation)

**Backend Available:**
- `/api/admin/courses` ✅ (adminController.getAllCourses)
- `/api/admin/course` ✅ (adminController.createCourse) 
- `/api/admin/course/{id}/details` ✅ (adminController.getCourseDetails)
- `/api/admin/course/{id}/videos` ✅ (adminController.getCourseVideos) 
- `/api/admin/course/{id}/students` ✅ (adminController.getCourseStudents)

**Alternative Routes Available:**
- `/api/courses/*` (courseController.js) - separate implementation!

### 2. Teacher API Issues

**Frontend Calls:**
- `/api/admin/teacher` (POST - addTeacher)
- `/api/admin/teachers` (GET - getTeachers)
- `/api/admin/teacher/bulk` (POST - bulkUploadTeachers)

**Backend Available:**
- `/api/admin/teacher` ✅ (adminController.addTeacher)
- `/api/admin/teachers` ✅ (adminController.getAllTeachers)
- `/api/admin/teacher/bulk` ✅ (adminController.bulkUploadTeachers)

### 3. Student API Issues

**Frontend Calls:**
- `/api/admin/student` (POST - createStudent)
- `/api/admin/students` (GET - getStudents)
- `/api/admin/student/bulk` (POST - bulkUploadStudents)

**Backend Available:**
- `/api/admin/student` ✅ (adminController.createStudent)
- `/api/admin/students` ✅ (adminController.getAllStudents)
- `/api/admin/student/bulk` ✅ (adminController.bulkUploadStudents)

### 4. Hierarchy API Issues

**Frontend Calls (hierarchyApi.js):**
- `/api/hierarchy/courses-by-department/{departmentId}` 
- `/api/hierarchy/available-hods/{departmentId}`
- `/api/hierarchy/available-deans/{schoolId}`
- `/api/hierarchy/students-by-school/{schoolId}`
- `/api/hierarchy/teachers-by-department/{departmentId}`

**Backend Status:**
- These were recently added to hierarchyController.js and should be working

### 5. Dropdown Data API Issues

**Critical Missing:**
- Course filtering by department in teacher forms
- Section population based on department/course selection
- Proper error handling for empty dropdowns

## Root Causes Identified

1. **Dual Course Implementation**: Two different course systems exist
   - Direct `/api/courses/*` (courseController)
   - Admin `/api/admin/courses` (adminController)

2. **Frontend-Backend Route Mismatches**: Some frontend calls don't match backend routes

3. **Authentication Issues**: All admin routes require proper JWT authentication

4. **Data Population Issues**: 
   - Courses not filtering correctly by department
   - Dropdowns showing IDs instead of names
   - Empty course/section lists in forms

## Next Steps for Fixes

1. Standardize course API endpoints
2. Fix dropdown data population
3. Resolve authentication token issues
4. Test all CRUD operations
5. Implement proper error handling