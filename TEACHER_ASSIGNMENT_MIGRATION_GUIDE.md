# Teacher Assignment System Migration Guide

## Overview
The old teacher assignment system in the section controller has been deprecated and replaced with an enhanced teacher assignment system. This guide helps you migrate from the old endpoints to the new ones.

## ⚠️ Deprecated Endpoints (Section-based)

### Old System Endpoints (Now Deprecated)
All these endpoints now return HTTP 410 (Gone) with migration information:

```bash
# OLD - DEPRECATED
POST /api/sections/assign-teacher
POST /api/sections/assign-teacher-to-section
POST /api/sections/:sectionId/assign-course-teacher
GET  /api/sections/:sectionId/unassigned-courses
GET  /api/sections/:sectionId/course-teachers
GET  /api/sections/teacher/:teacherId/course-assignments
DELETE /api/sections/:sectionId/course/:courseId/teacher
```

## ✅ New Enhanced System Endpoints

### Primary Teacher Assignment Endpoints
```bash
# NEW - USE THESE INSTEAD
POST /api/teacher-assignments/assign              # Assign teacher to courses
GET  /api/teacher-assignments/teachers            # Get available teachers
GET  /api/teacher-assignments/teacher/:teacherId  # Get teacher's assignments
POST /api/teacher-assignments/remove              # Remove assignments
```

## Migration Examples

### 1. Assigning a Teacher to a Course

#### Old Way (DEPRECATED):
```javascript
// OLD - Don't use this anymore
POST /api/sections/123/assign-course-teacher
{
  "courseId": "course456",
  "teacherId": "teacher789"
}
```

#### New Way (USE THIS):
```javascript
// NEW - Use this instead
POST /api/teacher-assignments/assign
{
  "teacherId": "teacher789",
  "assignments": [
    {
      "sectionId": "123",
      "courseId": "course456"
    }
  ]
}
```

### 2. Getting Teacher Assignments

#### Old Way (DEPRECATED):
```javascript
// OLD
GET /api/sections/teacher/teacher789/course-assignments
```

#### New Way (USE THIS):
```javascript
// NEW
GET /api/teacher-assignments/teacher/teacher789
```

### 3. Getting Available Teachers

#### Old Way (DEPRECATED):
```javascript
// OLD
GET /api/sections/123/unassigned-courses
```

#### New Way (USE THIS):
```javascript
// NEW - Get all available teachers
GET /api/teacher-assignments/teachers

// Or get teachers for specific course/department
GET /api/teacher-assignments/teachers/course/course456
```

## Key Improvements in New System

### 1. **Enhanced Role Validation**
- Only users with 'teacher' role can be assigned
- HODs and Deans must have 'teacher' role added to their roles array
- Better error messages for role validation

### 2. **Department Validation**
- Teachers can only be assigned to courses from their own department
- Automatic department matching validation
- Clear error messages for department mismatches

### 3. **Multi-Assignment Support**
- Assign one teacher to multiple courses in a single request
- Batch assignment operations
- Better transaction handling

### 4. **Improved Error Handling**
- Detailed validation messages
- Better HTTP status codes
- Comprehensive error responses

## Frontend Migration

### Old Frontend Code:
```javascript
// OLD - Update this
const response = await axios.post(`/api/sections/${sectionId}/assign-course-teacher`, {
  courseId,
  teacherId
});
```

### New Frontend Code:
```javascript
// NEW - Use this instead
import { teacherAssignmentApi } from '../api/teacherAssignmentApi';

const response = await teacherAssignmentApi.assignTeacherToCourses(teacherId, [{
  sectionId,
  courseId
}]);
```

## Response Format Changes

### Old Response Format:
```javascript
{
  "success": true,
  "message": "Teacher assigned successfully",
  "assignment": { /* single assignment */ }
}
```

### New Response Format:
```javascript
{
  "success": true,
  "message": "Teacher assigned successfully",
  "results": [
    {
      "sectionId": "123",
      "courseId": "course456",
      "assignment": { /* assignment details */ },
      "success": true
    }
  ],
  "summary": {
    "total": 1,
    "successful": 1,
    "failed": 0
  }
}
```

## Database Changes

The new system uses the existing `SectionCourseTeacher` model but with enhanced validation:

### New Validation Rules:
1. **Role Validation**: Only 'teacher' role allowed
2. **Department Validation**: Teacher department must match course department
3. **Soft Deletes**: Uses `isActive` flag instead of hard deletes
4. **Assignment Tracking**: Better tracking of who assigned what and when

## Testing the Migration

### 1. Test Deprecated Endpoints:
```bash
# Should return 410 Gone with migration info
curl -X POST http://localhost:5000/api/sections/assign-teacher \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sectionId": "123", "teacherId": "456"}'
```

### 2. Test New Endpoints:
```bash
# Should work with enhanced validation
curl -X POST http://localhost:5000/api/teacher-assignments/assign \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "teacherId": "456",
    "assignments": [{"sectionId": "123", "courseId": "789"}]
  }'
```

## Rollback Plan

If you need to temporarily rollback:

1. The old section controller functions are preserved but deprecated
2. You can modify the route handlers to call the old logic temporarily
3. The database schema remains compatible
4. All existing assignments continue to work

## Support and Documentation

- **New API Documentation**: Check `/api/teacher-assignments` endpoints
- **Test Suite**: Run `node backend/tests/teacherAssignmentTest.js`
- **Frontend Component**: Use `TeacherAssignmentManager.js` component
- **Migration Issues**: Check server logs for detailed error messages

## Timeline

- **Immediate**: Old endpoints return 410 Gone with migration info
- **Next Phase**: Remove deprecated code after confirming all clients migrated
- **Future**: Enhanced features like bulk operations and advanced validation

## Migration Checklist

- [ ] Update frontend API calls to use new endpoints
- [ ] Test teacher assignments with new validation rules
- [ ] Verify department-based assignment restrictions work
- [ ] Update any automation/scripts that use old endpoints
- [ ] Train administrators on new role requirements (teacher role for teaching)
- [ ] Test multi-role scenarios (HOD/Dean with teacher role)

This migration ensures better data integrity, enhanced security through proper role validation, and improved user experience with clearer error messages.