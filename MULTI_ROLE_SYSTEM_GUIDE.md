# Multi-Role User System Implementation Guide

## Current vs Proposed System

### Current System (Single Role)
```javascript
// User can only have ONE role
{
  email: "john@university.edu",
  role: "dean"  // Single string value
}
```

### Proposed System (Multi-Role)
```javascript
// User can have MULTIPLE roles simultaneously
{
  email: "john@university.edu",
  roles: ["dean", "hod", "cc"],  // Array of roles
  primaryRole: "dean",           // Main role for UI display
  roleContexts: {               // Context for each role
    dean: { school: "school1" },
    hod: { school: "school1", department: "dept1" },
    cc: { courses: ["course1", "course2"] }
  }
}
```

## Implementation Steps

### 1. Update User Model Schema
```javascript
// Replace single role with roles array
roles: [{ 
  type: String, 
  enum: ['admin', 'teacher', 'student', 'dean', 'hod', 'cc'],
  required: true 
}],
primaryRole: { 
  type: String, 
  enum: ['admin', 'teacher', 'student', 'dean', 'hod', 'cc'],
  required: true 
},

// Add role-specific contexts
roleContexts: {
  dean: {
    schools: [{ type: mongoose.Schema.Types.ObjectId, ref: 'School' }]
  },
  hod: {
    departments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Department' }]
  },
  cc: {
    courses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }]
  },
  teacher: {
    sections: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Section' }],
    courses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }]
  }
}
```

### 2. Update Authentication & Authorization
```javascript
// Helper functions for role checking
function hasRole(user, role) {
  return user.roles.includes(role);
}

function hasAnyRole(user, rolesArray) {
  return rolesArray.some(role => user.roles.includes(role));
}

function canAccessResource(user, resource, context) {
  // Check if user has required role for the resource
  // and proper context (school/department access)
}
```

### 3. Frontend Role Switcher UI
```javascript
// Add role switcher in header/sidebar
const RoleSwitcher = ({ user, onRoleChange }) => {
  return (
    <Select value={currentRole} onChange={onRoleChange}>
      {user.roles.map(role => (
        <MenuItem key={role} value={role}>
          {role.toUpperCase()}
        </MenuItem>
      ))}
    </Select>
  );
};
```

### 4. Dynamic Menu/Dashboard Based on Active Role
```javascript
// Show different menus based on active role
const getDashboardForRole = (activeRole) => {
  switch(activeRole) {
    case 'dean': return <DeanDashboard />;
    case 'hod': return <HODDashboard />;
    case 'cc': return <CCDashboard />;
    case 'teacher': return <TeacherDashboard />;
    default: return <DefaultDashboard />;
  }
};
```

## Benefits of Multi-Role System

1. **Real-world Accuracy**: Matches actual university hierarchy
2. **Reduced User Accounts**: One person = one account with multiple roles
3. **Flexible Permissions**: Different permissions per role
4. **Easy Role Switching**: Switch between roles without re-login
5. **Audit Trail**: Track actions per role context

## Example Use Cases

### Scenario 1: Professor John Smith
- **Dean** of School of Engineering
- **HOD** of Computer Science Department
- **Teacher** for Advanced Algorithms course
- **CC** for reviewing student assignments

**Single Account with Multiple Dashboards:**
```
Login as: john.smith@university.edu
Active Roles: [dean, hod, teacher, cc]
Current Role: dean (can switch to any other)

Dean Dashboard: Manage entire School of Engineering
HOD Dashboard: Manage Computer Science Department  
Teacher Dashboard: Teach Advanced Algorithms
CC Dashboard: Review assignments across courses
```

### Scenario 2: Dr. Sarah Wilson
- **HOD** of Mathematics Department
- **Teacher** for Calculus I & II
- **CC** for Mathematics courses

**Role Switching in UI:**
```
[Dean Mode] [HOD Mode ✓] [Teacher Mode] [CC Mode]
Currently viewing: Mathematics Department Overview
Switch to: Teacher Mode → See Calculus course materials
Switch to: CC Mode → Review student submissions
```

## Implementation Priority

### Phase 1: Backend Changes
1. Update User model schema
2. Create migration script for existing users
3. Update authentication middleware
4. Update role-checking functions

### Phase 2: Frontend Changes  
1. Add role switcher component
2. Update routing based on active role
3. Create role-specific dashboards
4. Update permission checking

### Phase 3: Advanced Features
1. Role-specific notifications
2. Audit logs per role context
3. Delegation features (HOD can act as Dean temporarily)
4. Role hierarchy and inheritance

## Database Migration Script
```javascript
// Convert existing single-role users to multi-role
db.users.updateMany(
  {},
  [
    {
      $set: {
        roles: ["$role"],           // Convert role to array
        primaryRole: "$role",       // Set primary role
        roleContexts: {             // Initialize contexts
          [$role]: {
            // Role-specific data based on current role
          }
        }
      }
    },
    {
      $unset: ["role"]             // Remove old single role field
    }
  ]
);
```

Would you like me to implement this multi-role system for your application?