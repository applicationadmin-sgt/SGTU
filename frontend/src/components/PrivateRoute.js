import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isAuthenticated, getCurrentUser } from '../utils/authService';
import { useUserRole } from '../contexts/UserRoleContext';
import { CircularProgress, Box } from '@mui/material';

/**
 * Enhanced PrivateRoute component with multi-role support
 * @param {Object} props - Component props
 * @param {JSX.Element} props.children - Child components to render if authenticated
 * @param {string[]} [props.allowedRoles] - Optional array of roles allowed to access this route
 * @returns {JSX.Element} - The protected route component or redirect
 */
const PrivateRoute = ({ children, allowedRoles }) => {
  const location = useLocation();
  const authenticated = isAuthenticated();
  const currentUser = getCurrentUser();
  const { 
    user: contextUser, 
    activeRole, 
    availableRoles, 
    hasRole,
    canAccessRole,
    getDashboardRoute
  } = useUserRole();

  // Check if user is authenticated
  if (!authenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // Use multi-role context if available, fallback to legacy auth
  const userToCheck = contextUser || currentUser;
  const roleToCheck = activeRole || (userToCheck && userToCheck.role);
  const rolesToCheck = availableRoles.length > 0 ? availableRoles : (userToCheck && userToCheck.roles) || [roleToCheck];
  
  console.log('🛡️ PrivateRoute Access Check:', {
    path: location.pathname,
    allowedRoles,
    activeRole,
    availableRoles: rolesToCheck,
    userAuthenticated: !!userToCheck
  });
  
  // If specific roles are required, check access
  if (allowedRoles && allowedRoles.length > 0) {
    // Check if user has any of the allowed roles
    let hasAccess = false;
    
    if (contextUser) {
      // Use new role context
      hasAccess = allowedRoles.some(role => canAccessRole(role));
    } else {
      // Fallback to legacy check
      hasAccess = allowedRoles.some(role => rolesToCheck.includes(role));
    }
    
    if (!hasAccess) {
      console.log('❌ Access denied, redirecting to user dashboard');
      // User doesn't have required role, redirect to their primary dashboard
      const targetDashboard = getDashboardRoute(roleToCheck);
      if (targetDashboard && location.pathname !== targetDashboard) {
        return <Navigate to={targetDashboard} replace />;
      } else {
        return <Navigate to="/unauthorized" replace />;
      }
    }
  }
  
  console.log('✅ Access granted');
  // User is authenticated and has the required role
  return children;
};

export default PrivateRoute;
