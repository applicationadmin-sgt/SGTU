# Multi-Role System Migration Guide

## Overview
This document outlines the necessary changes to migrate from single-role (`user.role`) to multi-role (`user.roles`) system throughout the application.

## Utility Functions Created

### Frontend: `/src/utils/roleUtils.js`
- `hasRole(user, targetRole)` - Check if user has specific role
- `hasAnyRole(user, targetRoles)` - Check if user has any of the roles
- `hasAllRoles(user, targetRoles)` - Check if user has all of the roles
- `getUserRoles(user)` - Get all user roles as array
- `getPrimaryRole(user)` - Get primary role for display
- `isAdmin(user)`, `isTeacher(user)`, `isStudent(user)`, etc. - Role-specific helpers

### Backend: `/utils/roleUtils.js`
- Same functions as frontend plus:
- `createRoleQuery(roles)` - Create MongoDB query for role filtering

## Migration Pattern

### Before (Single Role):
```javascript
// Frontend
if (user.role === 'teacher') { ... }
user.role !== 'admin'

// Backend
await User.find({ role: 'student' })
req.user.role === 'teacher'
```

### After (Multi-Role Compatible):
```javascript
// Frontend
import { hasRole, isTeacher } from '../utils/roleUtils';

if (hasRole(user, 'teacher')) { ... }
if (isTeacher(user)) { ... }
!hasRole(user, 'admin')

// Backend
const { hasRole, createRoleQuery } = require('../utils/roleUtils');

await User.find(createRoleQuery('student'))
hasRole(req.user, 'teacher')
```

## Files Already Updated

### Frontend Files:
1. ✅ `/src/utils/permissions.js` - Updated to use role utilities
2. ✅ `/src/components/teacher/LiveClassRoom.js` - Updated role checks in permissions and UI
3. ✅ `/src/routes/StudentRoutes.js` - Updated route protection
4. ✅ `/src/routes/TeacherRoutes.js` - Updated complex multi-role route protection
5. ✅ `/src/pages/LoginPage.js` - Updated navigation logic
6. ✅ `/src/pages/AnnouncementManagementPage.js` - Updated permissions and role display

### Backend Files:
1. ✅ `backend/controllers/discussionController.js` - Added import (partial)
2. ✅ `adminController.js` - Added import and updated some queries

## Files Still Needing Updates

### High Priority Frontend Files:
- `/src/pages/AdminDashboard.js` - Lines 683-684 role checks
- `/src/pages/DeanDashboard.js` - Line 236 role check  
- `/src/pages/HODDashboard.js` - Line 239 role check
- `/src/pages/hod/HODCCManagement.js` - Line 139 role check
- `/src/pages/admin/TeacherManagement.js` - Line 19 role check
- `/src/pages/admin/HODManagement.js` - Line 251 role filter
- `/src/pages/admin/DeanManagement.js` - Line 177 role filter
- `/src/pages/admin/UserRoleManagement.js` - Line 331 role check
- `/src/pages/admin/ForumModeration.js` - Lines 952, 963 role checks
- `/src/pages/teacher/TeacherRequestPage.js` - Line 9 role check
- `/src/pages/teacher/TeacherForumDetail.js` - Lines 233, 244 role checks
- `/src/components/AnnouncementBoard.js` - Lines 639-640 role display
- `/src/contexts/UserRoleContext.js` - Lines 77, 111, 214 role assignments

### High Priority Backend Files:
- `backend/controllers/discussionController.js` - Multiple role checks (lines 150, 248, 308, 354, 467, etc.)
- `backend/controllers/deanController.js` - Line 17 role array creation
- `backend/check-all-users.js` - Lines 21, 24 role checks
- `adminController.js` - Lines 136, 147, 2124, 2166, 2192, 2281, 2327 role checks

## Recommended Update Strategy

1. **Immediate**: Update all route protection files (highest security impact)
2. **High Priority**: Update dashboard and management pages (user experience)
3. **Medium Priority**: Update backend controllers (API functionality)
4. **Low Priority**: Update display/UI components (cosmetic)

## Testing Checklist

After updates, test:
- [ ] Multi-role user login and navigation
- [ ] Single-role user backward compatibility
- [ ] Route protection for different roles
- [ ] Permission checks in dashboards
- [ ] API endpoint access controls
- [ ] Role-based UI element visibility

## Common Issues to Watch For

1. **Ternary Operations**: `user.roles ? user.roles.includes('role') : user.role === 'role'`
2. **Array Operations**: Convert single roles to arrays when needed
3. **Display Logic**: Use `getPrimaryRole()` for UI display
4. **Database Queries**: Use `createRoleQuery()` for MongoDB searches
5. **Route Protection**: Use `hasAnyRole()` for multiple allowed roles

## Example Conversion

### Complex Role Check (Before):
```javascript
if (user.role === 'admin' || user.role === 'superadmin' || user.role === 'dean') {
  // Allow access
}
```

### Complex Role Check (After):
```javascript
import { hasAnyRole } from '../utils/roleUtils';

if (hasAnyRole(user, ['admin', 'superadmin', 'dean'])) {
  // Allow access
}
```

## Next Steps

1. Import role utilities in each file that needs updates
2. Replace role checks using the patterns above
3. Test functionality with both single-role and multi-role users
4. Update any remaining hardcoded role references
5. Consider deprecating direct `user.role` access in favor of utility functions