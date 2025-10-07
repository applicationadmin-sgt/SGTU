import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography,
  Avatar,
  List,
  ListItem,
  ListItemText,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Divider,
  IconButton,
  Menu,
  MenuItem
} from '@mui/material';
import axios from 'axios';
import DashboardIcon from '@mui/icons-material/Dashboard';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import EventNoteIcon from '@mui/icons-material/EventNote';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import SwitchAccountIcon from '@mui/icons-material/SwitchAccount';
import { parseJwt } from '../utils/jwt';
import { useUserRole } from '../contexts/UserRoleContext';
import Sidebar from '../components/Sidebar';
import NotificationBell from '../components/admin/NotificationBell';
import DashboardRoleGuard from '../components/DashboardRoleGuard';
import sgtLogoWhite from '../assets/new-header-logo.png';

// Import HOD Dashboard components
import HODDashboardHome from './hod/HODDashboardHome';
import HODTeachers from './hod/HODTeachers';
import HODCourses from './hod/HODCourses';
import HODSections from './hod/HODSections';
import HODAnalytics from './hod/HODAnalytics';
import HODAnnouncements from './hod/HODAnnouncements';
import HODAnnouncementHistory from './hod/HODAnnouncementHistory';
import MyTeachingSections from '../components/common/MyTeachingSections';

import HODAnnouncementApproval from '../components/hod/HODAnnouncementApproval';
import HODQuizManagement from './hod/HODQuizManagement';
import HODCCManagement from './hod/HODCCManagement';
import HODVideoUnlockApproval from './hod/HODVideoUnlockApproval';
import HODQuizUnlockDashboard from '../components/hod/HODQuizUnlockDashboard';
import HODProfile from '../components/HODProfile';
// import HODLiveClasses from './hod/HODLiveClasses'; // Moved to LEGACY_BACKUP
import SgtLmsLiveClass from '../components/liveclass/CodeTantraLiveClass';

const HODDashboard = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const currentUser = parseJwt(token);
  const { hasRole, user: contextUser, switchRole, availableRoles, activeRole } = useUserRole();
  const location = useLocation();
  
  // Use context user if available, fallback to parsed JWT
  const user = contextUser || currentUser;
  
  // Check if we're on a live class route
  const isOnLiveClass = location.pathname.includes('/live-class');

  // Profile menu state
  const [profileAnchorEl, setProfileAnchorEl] = useState(null);

  // Notifications section state
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  
  // Activity feed state
  const [activity, setActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);

  // HOD stats state
  const [hodStats, setHodStats] = useState({
    department: null,
    teachers: 0,
    courses: 0,
    sections: 0,
    students: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // Check if we're on a sub-page
  const isOnMainDashboard = location.pathname === '/hod/dashboard';

  useEffect(() => {
    if (!token) return;
    
    // Fetch notifications
    (async () => {
      try {
        setNotificationsLoading(true);
        const res = await axios.get('/api/notifications', { headers: { Authorization: `Bearer ${token}` } });
        setNotifications(res.data.notifications || res.data || []);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setNotificationsLoading(false);
      }
    })();
    
    // Fetch activity feed
    (async () => {
      try {
        setActivityLoading(true);
        const res = await axios.get('/api/admin/audit-logs/recent', { headers: { Authorization: `Bearer ${token}` } });
        setActivity(res.data || []);
      } catch (error) {
        console.error('Error fetching activity logs:', error);
      } finally {
        setActivityLoading(false);
      }
    })();

    // Fetch HOD statistics
    (async () => {
      try {
        setStatsLoading(true);
        
        // Get HOD's department info
        const userRes = await axios.get(`/api/admin/users/${currentUser._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const departmentId = userRes.data.department;
        
        if (departmentId) {
          // Get department details
          const deptRes = await axios.get(`/api/departments/${departmentId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          // Get teachers in this department
          const teacherRes = await axios.get(`/api/admin/teachers?department=${departmentId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          // Get courses in this department
          const courseRes = await axios.get(`/api/admin/courses?department=${departmentId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });

          // Get sections in this department
          const sectionRes = await axios.get(`/api/sections?department=${departmentId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          setHodStats({
            department: deptRes.data,
            teachers: teacherRes.data.length,
            courses: courseRes.data.length,
            sections: sectionRes.data.length,
            students: 0 // TODO: Implement student count
          });
        }
      } catch (error) {
        console.error('Error fetching HOD stats:', error);
      } finally {
        setStatsLoading(false);
      }
    })();
  }, [token, currentUser._id]);

  // Helper function to render loading or empty state
  const renderLoadingOrEmpty = (loading, items, emptyMessage) => {
    if (loading) {
      return (
        <ListItem>
          <ListItemText primary="Loading..." />
        </ListItem>
      );
    }
    
    if (items.length === 0) {
      return (
        <ListItem>
          <ListItemText primary={emptyMessage} />
        </ListItem>
      );
    }
    
    return null;
  };

  // Event handlers for profile menu
  const handleProfileClick = (event) => {
    setProfileAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setProfileAnchorEl(null);
  };

  const handleProfileDialogOpen = () => {
    handleProfileMenuClose();
    navigate('/hod/profile');
  };

  const handleSwitchRole = (targetRole) => {
    console.log('🔄 Attempting to switch to role:', targetRole);
    
    // Try using the context switchRole first
    if (switchRole && typeof switchRole === 'function') {
      const result = switchRole(targetRole);
      if (result) {
        return; // Successfully switched using context
      }
    }
    
    // Fallback: Manual role switching
    console.log('🔄 Using manual role switching fallback');
    localStorage.setItem('activeRole', targetRole);
    
    // Get the correct dashboard route for the target role
    const routes = {
      admin: '/admin/dashboard',
      dean: '/dean/dashboard',
      hod: '/hod/dashboard',
      teacher: '/teacher/dashboard',
      student: '/student/dashboard'
    };
    
    const targetRoute = routes[targetRole] || '/dashboard';
    console.log('🎯 Navigating to:', targetRoute);
    
    // Force navigation
    window.location.href = targetRoute;
    
    handleProfileMenuClose();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  // Allow only hod users to access the HOD dashboard
  const hasHODRole = currentUser && (
    currentUser.role === 'hod' || 
    (currentUser.roles && currentUser.roles.includes('hod')) ||
    currentUser.primaryRole === 'hod' ||
    hasRole('hod')
  );
  
  if (!hasHODRole) {
    return <Navigate to="/login" />;
  }

  // Auto-redirect to dashboard if at the root hod path
  if (location.pathname === '/hod') {
    return <Navigate to="/hod/dashboard" replace />;
  }

  return (
    <DashboardRoleGuard requiredRole="hod">
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        {/* Professional Header - Full Width Fixed - Hidden on live class */}
        {!isOnLiveClass && (
          <Box 
            sx={{ 
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              height: '64px',
              background: 'linear-gradient(135deg, #005b96 0%, #03396c 100%)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 3,
            boxShadow: '0 2px 8px rgba(0, 91, 150, 0.15)',
            zIndex: 1300
          }}
        >
          {/* Left side - SGT Logo */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <img 
              src={sgtLogoWhite} 
              alt="Header Logo" 
              style={{ 
                height: '50px',
                filter: 'brightness(1)',
                objectFit: 'contain'
              }} 
            />
          </Box>

          {/* Right side - Actions */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Notification Bell with light color for dark header */}
            <Box 
              sx={{ 
                '& .MuiIconButton-root': {
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                  }
                },
                '& .MuiSvgIcon-root': {
                  color: 'white'
                }
              }}
            >
              <NotificationBell token={token} />
            </Box>

            {/* Profile Menu */}
            <IconButton
              onClick={handleProfileClick}
              sx={{
                ml: 2,
                p: 1,
                border: '1px solid rgba(255, 255, 255, 0.2)',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  borderColor: 'rgba(255, 255, 255, 0.3)'
                }
              }}
            >
              <Avatar 
                sx={{ 
                  width: 32, 
                  height: 32, 
                  bgcolor: 'rgba(255, 255, 255, 0.9)',
                  color: '#005b96',
                  fontSize: '0.9rem',
                  fontWeight: 600
                }}
              >
                {user?.name?.charAt(0)?.toUpperCase() || 'H'}
              </Avatar>
            </IconButton>

            {/* Profile Dropdown Menu */}
            <Menu
              anchorEl={profileAnchorEl}
              open={Boolean(profileAnchorEl)}
              onClose={handleProfileMenuClose}
              PaperProps={{
                sx: {
                  mt: 1,
                  minWidth: 220,
                  boxShadow: '0 8px 32px rgba(0, 91, 150, 0.15)',
                  border: '1px solid rgba(0, 91, 150, 0.1)'
                }
              }}
            >
              <MenuItem 
                onClick={handleProfileDialogOpen}
                sx={{ 
                  py: 1.5,
                  '&:hover': { 
                    backgroundColor: 'rgba(0, 91, 150, 0.08)' 
                  } 
                }}
              >
                <PersonIcon sx={{ mr: 2, color: '#005b96' }} />
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  My Profile
                </Typography>
              </MenuItem>
              
              <Divider sx={{ my: 1 }} />
              
              {/* Dynamic Role switching options - show all user roles except current */}
              {(() => {
                console.log('Debug HODDashboard - availableRoles:', availableRoles, 'activeRole:', activeRole);
                
                // Get all possible user roles from different sources
                const userRoles = [];
                
                // From context (preferred)
                if (availableRoles && availableRoles.length > 0) {
                  userRoles.push(...availableRoles);
                }
                
                // From JWT roles array (fallback)
                if (currentUser?.roles && Array.isArray(currentUser.roles)) {
                  userRoles.push(...currentUser.roles);
                }
                
                // From JWT single role (fallback)
                if (currentUser?.role) {
                  userRoles.push(currentUser.role);
                }
                
                // From JWT primaryRole (fallback)
                if (currentUser?.primaryRole) {
                  userRoles.push(currentUser.primaryRole);
                }
                
                // Remove duplicates and current role
                const currentRole = activeRole || currentUser?.role || 'hod';
                const availableRoleOptions = [...new Set(userRoles)].filter(role => role !== currentRole);
                
                console.log('🔍 HOD Role Detection:', {
                  userRoles,
                  currentRole,
                  availableRoleOptions,
                  contextAvailable: availableRoles?.length > 0
                });
                
                // Role labels and icons
                const roleLabels = {
                  admin: 'Administrator',
                  dean: 'Dean',
                  hod: 'HOD',
                  teacher: 'Teacher',
                  student: 'Student'
                };
                
                const roleIcons = {
                  admin: '👑',
                  dean: '🏛️',
                  hod: '🏢',
                  teacher: '👨‍🏫',
                  student: '🎓'
                };
                
                // Return the menu items
                return availableRoleOptions.map((role) => (
                  <MenuItem 
                    key={role}
                    onClick={() => handleSwitchRole(role)}
                    sx={{ 
                      py: 1.5,
                      '&:hover': { 
                        backgroundColor: 'rgba(0, 91, 150, 0.08)' 
                      } 
                    }}
                  >
                    <SwitchAccountIcon sx={{ mr: 2, color: '#005b96' }} />
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      Switch to {roleLabels[role] || role} {roleIcons[role] || ''}
                    </Typography>
                  </MenuItem>
                ));
              })()}
              
              {/* Show divider if there are roles to switch to */}
              {(() => {
                const userRoles = [
                  ...(availableRoles || []),
                  ...(currentUser?.roles || []),
                  currentUser?.role,
                  currentUser?.primaryRole
                ].filter(Boolean);
                const currentRole = activeRole || currentUser?.role || 'hod';
                const hasMultipleRoles = [...new Set(userRoles)].filter(role => role !== currentRole).length > 0;
                return hasMultipleRoles ? <Divider sx={{ my: 1 }} /> : null;
              })()}
              
              <MenuItem 
                onClick={handleLogout}
                sx={{ 
                  py: 1.5,
                  '&:hover': { 
                    backgroundColor: 'rgba(211, 47, 47, 0.08)' 
                  } 
                }}
              >
                <LogoutIcon sx={{ mr: 2, color: '#d32f2f' }} />
                <Typography variant="body2" sx={{ fontWeight: 500, color: '#d32f2f' }}>
                  Logout
                </Typography>
              </MenuItem>
            </Menu>
          </Box>
        </Box>
        )}

        {/* Sidebar with top margin for fixed header - Hidden on live class */}
        {!isOnLiveClass && (
          <Box sx={{ mt: '64px', width: '280px', flexShrink: 0 }}>
            <Sidebar currentUser={currentUser} />
          </Box>
        )}
        
        {/* Main Content Area with margin for sidebar and header */}
        <Box sx={{ 
          flexGrow: 1, 
          mt: isOnLiveClass ? 0 : '64px', 
          ml: 0,
          width: isOnLiveClass ? '100vw' : 'auto',
          position: isOnLiveClass ? 'fixed' : 'relative',
          top: isOnLiveClass ? 0 : 'auto',
          left: isOnLiveClass ? 0 : 'auto',
          height: isOnLiveClass ? '100vh' : 'auto',
          zIndex: isOnLiveClass ? 1400 : 'auto'
        }}>
          <Box 
            component="main" 
            sx={{ 
              minHeight: isOnLiveClass ? '100vh' : 'calc(100vh - 64px)',
              // Lighter blue gradient background to match reference image
              background: isOnLiveClass ? '#000' : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 30%, #cbd5e1 70%, #94a3b8 100%)',
            }}
          >
            <Box sx={{ 
              flex: 1, 
              p: isOnLiveClass ? 0 : { xs: 2, md: 3 },
              backgroundColor: 'transparent',
              height: isOnLiveClass ? '100vh' : 'auto'
            }}>
              {isOnMainDashboard && (
                <>
                {/* Enhanced Header Section */}
                <Box sx={{ 
                  mb: 4,
                  p: 3,
                  background: 'transparent',
                  borderRadius: 3,
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar 
                      sx={{ 
                        bgcolor: 'primary.main',
                        width: 56,
                        height: 56,
                        mr: 2,
                        background: 'linear-gradient(135deg, #005b96 0%, #03396c 100%)'
                      }}
                    >
                      <DashboardIcon sx={{ fontSize: 32 }} />
                    </Avatar>
                    <Box>
                      <Typography 
                        variant="h3" 
                        component="h1" 
                        sx={{ 
                          fontWeight: 700,
                          background: 'linear-gradient(135deg, #011f4b 0%, #005b96 100%)',
                          backgroundClip: 'text',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          mb: 0.5
                        }}
                      >
                        HOD Dashboard
                      </Typography>
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          color: 'text.secondary',
                          fontWeight: 500
                        }}
                      >
                        Welcome back! Manage your department faculty and courses from here.
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                
                <Grid 
                  container 
                  spacing={3}
                  sx={{ 
                    backgroundColor: 'transparent',
                    background: 'none' 
                  }}
                >
                  {/* Enhanced Notifications Section */}
                  <Grid item xs={12} md={6} lg={4}>
                    <Card 
                      sx={{ 
                        height: '100%',
                        background: '#ffffff',
                        border: '1px solid #6497b1',
                        boxShadow: '0 6px 20px rgba(0, 91, 150, 0.2)',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:hover': {
                          transform: 'translateY(-8px)',
                          boxShadow: '0 8px 25px rgba(0, 91, 150, 0.3)'
                        }
                      }}
                    >
                      <CardHeader
                        avatar={
                          <Avatar 
                            sx={{ 
                              bgcolor: 'primary.main',
                              background: 'linear-gradient(135deg, #005b96 0%, #03396c 100%)'
                            }}
                          >
                            <NotificationsActiveIcon />
                          </Avatar>
                        }
                        action={
                          <IconButton aria-label="view all notifications">
                            <MoreVertIcon sx={{ color: 'text.secondary' }} />
                          </IconButton>
                        }
                        title={
                          <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                            Notifications
                          </Typography>
                        }
                        subheader={
                          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                            Latest updates and alerts
                          </Typography>
                        }
                      />
                      <Divider sx={{ borderColor: 'rgba(0, 91, 150, 0.08)' }} />
                      <CardContent sx={{ height: 300, overflow: 'auto', p: 0 }}>
                        <List dense>
                          {renderLoadingOrEmpty(notificationsLoading, notifications, "No notifications")}
                          
                          {!notificationsLoading && notifications.map(n => (
                            <ListItem 
                              key={n._id} 
                              selected={!n.read} 
                              sx={{
                                borderLeft: !n.read ? '4px solid #005b96' : 'none',
                                bgcolor: !n.read ? 'rgba(0, 91, 150, 0.04)' : 'transparent',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                  bgcolor: 'rgba(0, 91, 150, 0.08)',
                                  transform: 'translateX(4px)'
                                },
                                '&.Mui-selected': {
                                  bgcolor: 'rgba(0, 91, 150, 0.06)',
                                }
                              }}
                            >
                              <ListItemText
                                primary={
                                  <Typography 
                                    variant="body2"
                                    sx={{ 
                                      fontWeight: n.read ? 500 : 600,
                                      color: 'text.primary',
                                      lineHeight: 1.4
                                    }}
                                  >
                                    {n.message}
                                  </Typography>
                                }
                                secondary={
                                  <Typography 
                                    variant="caption" 
                                    sx={{ 
                                      color: 'text.secondary',
                                      mt: 0.5,
                                    }}
                                  >
                                    {new Date(n.createdAt).toLocaleDateString()}
                                  </Typography>
                                }
                              />
                            </ListItem>
                          ))}
                        </List>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Enhanced Activity Feed */}
                  <Grid item xs={12} md={6} lg={4}>
                    <Card 
                      sx={{ 
                        height: '100%',
                        background: '#ffffff',
                        border: '1px solid #6497b1',
                        boxShadow: '0 6px 20px rgba(0, 91, 150, 0.2)',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:hover': {
                          transform: 'translateY(-8px)',
                          boxShadow: '0 8px 25px rgba(0, 91, 150, 0.3)'
                        }
                      }}
                    >
                      <CardHeader
                        avatar={
                          <Avatar 
                            sx={{ 
                              bgcolor: 'primary.main',
                              background: 'linear-gradient(135deg, #005b96 0%, #03396c 100%)'
                            }}
                          >
                            <EventNoteIcon />
                          </Avatar>
                        }
                        action={
                          <IconButton aria-label="view all activities">
                            <MoreVertIcon sx={{ color: 'text.secondary' }} />
                          </IconButton>
                        }
                        title={
                          <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                            Recent Activity
                          </Typography>
                        }
                        subheader={
                          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                            Department activity and changes
                          </Typography>
                        }
                      />
                      <Divider sx={{ borderColor: 'rgba(0, 91, 150, 0.08)' }} />
                      <CardContent sx={{ height: 300, overflow: 'auto', p: 0 }}>
                        <List dense>
                          {renderLoadingOrEmpty(activityLoading, activity, "No recent activity")}
                          
                          {!activityLoading && activity.slice(0, 5).map(a => (
                            <ListItem 
                              key={a._id}
                              sx={{
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                  bgcolor: 'rgba(0, 91, 150, 0.08)',
                                  transform: 'translateX(4px)'
                                }
                              }}
                            >
                              <ListItemText
                                primary={
                                  <Typography 
                                    variant="body2"
                                    sx={{ 
                                      color: 'text.primary',
                                      lineHeight: 1.4,
                                      fontWeight: 500
                                    }}
                                  >
                                    {a.action}
                                  </Typography>
                                }
                                secondary={
                                  <Typography 
                                    variant="caption" 
                                    sx={{ 
                                      color: 'text.secondary',
                                      mt: 0.5,
                                    }}
                                  >
                                    {new Date(a.timestamp).toLocaleDateString()}
                                  </Typography>
                                }
                              />
                            </ListItem>
                          ))}
                        </List>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Department Overview Card */}
                  <Grid item xs={12} md={6} lg={4}>
                    <Card 
                      sx={{ 
                        height: '100%',
                        background: '#ffffff',
                        border: '1px solid #6497b1',
                        boxShadow: '0 6px 20px rgba(0, 91, 150, 0.2)',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:hover': {
                          transform: 'translateY(-8px)',
                          boxShadow: '0 8px 25px rgba(0, 91, 150, 0.3)'
                        }
                      }}
                    >
                      <CardHeader
                        avatar={
                          <Avatar 
                            sx={{ 
                              bgcolor: 'primary.main',
                              background: 'linear-gradient(135deg, #005b96 0%, #03396c 100%)'
                            }}
                          >
                            <TrendingUpIcon />
                          </Avatar>
                        }
                        action={
                          <IconButton aria-label="view analytics">
                            <MoreVertIcon sx={{ color: 'text.secondary' }} />
                          </IconButton>
                        }
                        title={
                          <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                            Department Overview
                          </Typography>
                        }
                        subheader={
                          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                            {hodStats.department ? hodStats.department.name : 'Loading department info...'}
                          </Typography>
                        }
                      />
                      <Divider sx={{ borderColor: 'rgba(0, 91, 150, 0.08)' }} />
                      <CardContent sx={{ height: 300, overflow: 'auto' }}>
                        {statsLoading ? (
                          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                            <Typography variant="body2" color="text.secondary">Loading statistics...</Typography>
                          </Box>
                        ) : (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, bgcolor: 'rgba(0, 91, 150, 0.05)', borderRadius: 1 }}>
                              <Typography variant="body2" color="text.secondary">Teachers</Typography>
                              <Typography variant="h6" sx={{ fontWeight: 600, color: '#005b96' }}>{hodStats.teachers}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, bgcolor: 'rgba(0, 91, 150, 0.05)', borderRadius: 1 }}>
                              <Typography variant="body2" color="text.secondary">Courses</Typography>
                              <Typography variant="h6" sx={{ fontWeight: 600, color: '#005b96' }}>{hodStats.courses}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, bgcolor: 'rgba(0, 91, 150, 0.05)', borderRadius: 1 }}>
                              <Typography variant="body2" color="text.secondary">Sections</Typography>
                              <Typography variant="h6" sx={{ fontWeight: 600, color: '#005b96' }}>{hodStats.sections}</Typography>
                            </Box>
                            {hodStats.department && (
                              <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(0, 91, 150, 0.08)', borderRadius: 1 }}>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Department Code</Typography>
                                <Typography variant="body1" sx={{ fontWeight: 500, color: '#005b96' }}>{hodStats.department.code}</Typography>
                              </Box>
                            )}
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </>
            )}
            
            {/* Routes */}
            <Routes>
              <Route path="/dashboard" element={<HODDashboardHome />} />
              <Route path="/profile" element={<HODProfile />} />
              <Route path="/teachers" element={<HODTeachers />} />
              <Route path="/courses" element={<HODCourses />} />
              <Route path="/sections" element={<HODSections />} />
              <Route path="/analytics" element={<HODAnalytics />} />
              <Route path="/announcements" element={<HODAnnouncements user={currentUser} />} />
              <Route path="/announcements/history" element={<HODAnnouncementHistory />} />
              <Route path="/announcement-approvals" element={<HODAnnouncementApproval token={token} />} />
              <Route path="/quiz-management" element={<HODQuizManagement />} />
              <Route path="/cc-management" element={<HODCCManagement />} />
              <Route path="/teaching-sections" element={<MyTeachingSections />} />
              <Route path="/video-unlock-requests" element={<HODVideoUnlockApproval token={token} user={currentUser} />} />
              <Route path="/quiz-unlock-requests" element={<HODQuizUnlockDashboard />} />
              <Route path="/live-classes" element={<SgtLmsLiveClass token={token} user={currentUser} />} />
              <Route path="*" element={<Navigate to="/hod/dashboard" replace />} />
            </Routes>
            </Box>
          </Box>
        </Box>
      </Box>
    </DashboardRoleGuard>
  );
};

export default HODDashboard;
