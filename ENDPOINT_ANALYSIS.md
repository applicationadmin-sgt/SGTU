# API Endpoint Analysis Report

## Critical Issues Found

### 1. Course API Endpoint Mismatches

**Problem**: Frontend calling `/api/admin/*` but backend has dual implementations

#### Frontend Course API Calls (courseApi.js):
- `GET /api/admin/courses` - ❌ Should be `GET /api/courses` or backend needs `/api/admin/courses`
- `GET /api/admin/course/{id}/details` - ❌ Should be `GET /api/courses/{id}` 
- `GET /api/admin/course/{id}/videos` - ❌ No matching backend endpoint
- `GET /api/admin/course/{id}/students` - ❌ No matching backend endpoint
- `POST /api/admin/course` - ✅ Exists in adminController
- `PATCH /api/admin/course/{id}` - ❌ Should be `PUT /api/admin/course/{id}`
- `DELETE /api/admin/course/{id}` - ✅ Exists in adminController

#### Backend Course Routes:
- **Direct routes** (`/api/courses/*`): Complete CRUD in courseController.js
- **Admin routes** (`/api/admin/*`): Partial implementation in adminController.js

### 2. Teacher Creation Issues

#### Frontend Teacher API Calls (teacherApi.js):
- `GET /api/admin/teachers` - ✅ Works (adminController)
- `POST /api/admin/teacher` - ✅ Works (adminController)
- `POST /api/admin/teacher/bulk` - ✅ Works (adminController)
- `POST /api/admin/teacher/reset-password` - ✅ Works (adminController)
- `PATCH /api/admin/teacher/{id}/deactivate` - ✅ Works (adminController)

#### Teacher Form Dropdown Issues:
- Schools API: ✅ `/api/schools` works
- Departments API: ✅ `/api/departments/school/{schoolId}` works  
- Courses API: ❌ `/api/hierarchy/courses-by-department/{departmentId}` - no backend route
- Sections API: ❌ Missing section endpoints for teacher assignment

### 3. Student Creation Issues

#### Frontend Student API Calls (studentApi.js):
- `GET /api/admin/students` - ✅ Works (adminController)
- `POST /api/admin/student` - ✅ Works (adminController)
- `POST /api/admin/student/bulk` - ✅ Works (adminController)
- `POST /api/admin/student/assign-courses` - ✅ Works (adminController)
- `PATCH /api/admin/student/{id}` - ✅ Works (adminController)
- `DELETE /api/admin/student/{id}` - ✅ Works (adminController)

### 4. Hierarchy API Missing Endpoints

#### Frontend hierarchyApi.js calls missing backend:
- `GET /api/hierarchy/courses-by-department/{departmentId}` - ❌ Missing
- `GET /api/hierarchy/teachers-by-department/{departmentId}` - ❌ Missing  
- `GET /api/hierarchy/students-by-school/{schoolId}` - ❌ Missing
- `GET /api/hierarchy/available-deans/{schoolId}` - ❌ Missing
- `GET /api/hierarchy/available-hods/{departmentId}` - ❌ Missing

### 5. Section Management Issues

#### Missing section endpoints:
- No section creation endpoint matching frontend needs
- No section-teacher assignment endpoint
- No section-student assignment endpoint

## Recommended Fixes

### Priority 1: Course API Unification
1. Create missing admin course endpoints OR redirect frontend to use `/api/courses/*`
2. Add missing `/api/admin/course/{id}/videos` and `/api/admin/course/{id}/students` endpoints

### Priority 2: Complete Hierarchy API
1. Implement all missing `/api/hierarchy/*` endpoints in hierarchyController
2. Add routes in hierarchy.js for missing endpoints

### Priority 3: Fix Teacher Form Dependencies
1. Ensure courses load properly by department
2. Add section management endpoints
3. Fix dropdown data loading issues

### Priority 4: Section Management
1. Create complete section CRUD API
2. Add teacher-section assignment
3. Add student-section assignment