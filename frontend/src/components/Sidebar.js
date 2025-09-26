import React, { useState, useEffect } from 'react';
import { 
  Drawer, 
  List, 
  ListItemIcon, 
  ListItemText, 
  Toolbar, 
  ListItemButton,
  Box,
  Typography,
  Avatar,
  useTheme,
  alpha,
  Badge
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import SchoolIcon from '@mui/icons-material/School';
import { MdClass } from 'react-icons/md';
import BarChartIcon from '@mui/icons-material/BarChart';
import InsightsIcon from '@mui/icons-material/Insights';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import QuizIcon from '@mui/icons-material/Quiz';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import HistoryIcon from '@mui/icons-material/History';
import BusinessIcon from '@mui/icons-material/Business';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import GroupsIcon from '@mui/icons-material/Groups';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import { useNavigate, useLocation } from 'react-router-dom';
import { hasPermission } from '../utils/permissions';
import { useUserRole } from '../contexts/UserRoleContext';

const Sidebar = ({ currentUser, mobileOpen = false, handleDrawerToggle = () => {} }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const { activeRole } = useUserRole();
  
  // CC status state for dynamic menu filtering
  const [ccStatus, setCCStatus] = useState({ isCC: false, coursesCount: 0 });
  
  // Check CC status when user role changes or component mounts
  useEffect(() => {
    const checkCCStatus = async () => {
      // Only check CC status if user has teacher role
      if (currentUser && (currentUser.role === 'teacher' || currentUser.roles?.includes('teacher'))) {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch('/api/cc/status', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const status = await response.json();
            setCCStatus(status);
            console.log('🎯 CC Status Check:', status);
          } else {
            // Reset CC status on error
            setCCStatus({ isCC: false, coursesCount: 0 });
          }
        } catch (error) {
          console.error('Error checking CC status:', error);
          setCCStatus({ isCC: false, coursesCount: 0 });
        }
      } else {
        // Reset CC status for non-teachers
        setCCStatus({ isCC: false, coursesCount: 0 });
      }
    };

    checkCCStatus();
  }, [currentUser, activeRole]);
  
  // Different menus based on user role
  const adminMenu = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: 'dashboard', color: theme.palette.primary.main },
    { text: 'Announcements', icon: <NotificationsActiveIcon />, path: 'announcements', color: theme.palette.primary.dark },
    { text: 'Teachers', icon: <PeopleIcon />, path: 'teachers', color: theme.palette.secondary.main },
    { text: 'Students', icon: <SchoolIcon />, path: 'students', color: theme.palette.primary.light },
    { text: 'Courses', icon: <MdClass />, path: 'courses', color: theme.palette.secondary.light },
    { text: 'Schools', icon: <AccountBalanceIcon />, path: 'schools', color: theme.palette.primary.main },
    { text: 'Departments', icon: <BusinessIcon />, path: 'departments', color: theme.palette.secondary.main },
    { text: 'Sections', icon: <GroupsIcon />, path: 'sections', color: theme.palette.primary.light },
    { text: 'Deans', icon: <AccountBalanceIcon />, path: 'deans', color: theme.palette.primary.dark },
    { text: 'HODs', icon: <SupervisorAccountIcon />, path: 'hods', color: theme.palette.secondary.main },
    { text: 'Quiz Unlock Dashboard', icon: <LockOpenIcon />, path: 'quiz-unlock-dashboard', color: theme.palette.status?.error},
    { text: 'Analytics', icon: <InsightsIcon />, path: 'enhanced-analytics', color: theme.palette.primary.main },
    { text: 'User Roles', icon: <SupervisorAccountIcon />, path: 'user-roles', color: theme.palette.status?.success},
    { text: 'Roles', icon: <AdminPanelSettingsIcon />, path: 'roles', color: theme.palette.primary.dark },
  ];
  
  const teacherMenu = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: 'dashboard', permission: null, color: theme.palette.primary.main },
    { text: 'My Profile', icon: <PersonSearchIcon />, path: 'profile', permission: null, color: theme.palette.secondary.main },
    { text: 'Announcements', icon: <NotificationsActiveIcon />, path: 'announcements', permission: null, color: theme.palette.primary.dark },
    { text: 'Announcement History', icon: <HistoryIcon />, path: 'announcements/history', permission: null, color: theme.palette.status?.warning},
    { text: 'My Courses', icon: <MdClass />, path: 'courses', permission: null, color: theme.palette.secondary.light },
    { text: 'My Sections', icon: <GroupsIcon />, path: 'sections', permission: null, color: theme.palette.primary.light },
    { text: 'Live Classes', icon: <VideoCallIcon />, path: 'live-classes', permission: null, color: theme.palette.status?.success},
    { text: 'Section Analytics', icon: <InsightsIcon />, path: 'section-analytics', permission: null, color: theme.palette.primary.main },
    { text: 'Quizzes', icon: <QuizIcon />, path: 'quizzes', permission: null, color: theme.palette.secondary.main },
    { text: 'Quiz Unlock Requests', icon: <LockOpenIcon />, path: 'unlock-requests', permission: null, color: theme.palette.status?.error},
    { text: 'Video Unlock Requests', icon: <VideoLibraryIcon />, path: 'video-unlock-requests', permission: null, color: theme.palette.status?.error},
    { text: 'Videos', icon: <VideoLibraryIcon />, path: 'videos', permission: 'manage_videos', color: theme.palette.primary.light },
    { 
      text: 'Students', 
      icon: <SchoolIcon />, 
      path: 'students', 
      permission: 'manage_students', 
      color: theme.palette.secondary.main,
      highlight: true 
    },
    { text: 'CC Management', icon: <SupervisorAccountIcon />, path: 'cc-management', permission: null, color: theme.palette.secondary.main, isNew: true },
    { 
      text: 'Analytics Dashboard', 
      icon: <AssessmentIcon />, 
      path: 'analytics', 
      permission: 'view_analytics', 
      color: theme.palette.primary.dark 
    }
  ];
  
  const studentMenu = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: 'dashboard', color: theme.palette.primary.main },
    { text: 'Announcements', icon: <NotificationsActiveIcon />, path: 'announcements', color: theme.palette.primary.dark },
    { text: 'My Courses', icon: <MdClass />, path: 'courses', color: theme.palette.secondary.light },
    { text: 'My Section', icon: <GroupsIcon />, path: 'section', color: theme.palette.primary.light },
    { text: 'Live Classes', icon: <VideoCallIcon />, path: 'live-classes', color: theme.palette.status?.success},
    { text: 'Videos', icon: <VideoLibraryIcon />, path: 'videos', color: theme.palette.primary.light },
  ];
  
  // Dean menu
  const deanMenu = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: 'dashboard', color: theme.palette.primary.main },
    { text: 'Announcements', icon: <NotificationsActiveIcon />, path: 'announcements', color: theme.palette.primary.dark },
    { text: 'Announcement History', icon: <HistoryIcon />, path: 'announcements/history', color: theme.palette.status?.warning },
    { text: 'Unlock Requests', icon: <LockOpenIcon />, path: 'unlock-requests', color: theme.palette.status?.error},
    { text: 'School Management', icon: <SupervisorAccountIcon />, path: 'school-management', color: theme.palette.secondary.main },
    { text: 'Departments', icon: <BusinessIcon />, path: 'departments', color: theme.palette.secondary.main },
    { text: 'Sections', icon: <GroupsIcon />, path: 'sections', color: theme.palette.primary.light },
    { text: 'My Teaching Sections', icon: <SchoolIcon />, path: 'teaching-sections', color: theme.palette.status?.succes},
    { text: 'Teachers', icon: <PeopleIcon />, path: 'teachers', color: theme.palette.secondary.main },
    { text: 'Analytics', icon: <BarChartIcon />, path: 'analytics', color: theme.palette.primary.main },
  ];

  // HOD menu
  const hodMenu = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: 'dashboard', color: theme.palette.primary.main },
    { text: 'Announcements', icon: <NotificationsActiveIcon />, path: 'announcements', color: theme.palette.primary.dark },
    { text: 'Announcement Approvals', icon: <AssignmentIcon />, path: 'announcement-approvals', color: theme.palette.status?.warning},
    { text: 'Announcement History', icon: <HistoryIcon />, path: 'announcements/history', color: theme.palette.status?.warning },
    { text: 'Video Unlock Requests', icon: <VideoLibraryIcon />, path: 'video-unlock-requests', color: theme.palette.status?.error},
    { text: 'Quiz Unlock Requests', icon: <LockOpenIcon />, path: 'quiz-unlock-requests', color: theme.palette.status?.error},
    { text: 'Quiz Management', icon: <QuizIcon />, path: 'quiz-management', color: theme.palette.secondary.main },
    { text: 'CC Management', icon: <SupervisorAccountIcon />, path: 'cc-management', color: theme.palette.secondary.main, isNew: true },
    { text: 'Sections', icon: <GroupsIcon />, path: 'sections', color: theme.palette.primary.light },
    { text: 'My Teaching Sections', icon: <SchoolIcon />, path: 'teaching-sections', color: theme.palette.status?.success},
    { text: 'Teachers', icon: <PeopleIcon />, path: 'teachers', color: theme.palette.secondary.main },
    { text: 'Courses', icon: <MdClass />, path: 'courses', color: theme.palette.secondary.light },
    { text: 'Analytics', icon: <BarChartIcon />, path: 'analytics', color: theme.palette.primary.main },
  ];

  // Select menu based on active role (from context) or fallback to user role
  const currentRole = activeRole || currentUser?.role || currentUser?.primaryRole;
  let menu = [];
  let basePath = '';
  let roleName = '';
  let roleColor = '';
  
  console.log('🎯 Sidebar Role Selection:', {
    activeRole,
    userRole: currentUser?.role,
    primaryRole: currentUser?.primaryRole,
    selectedRole: currentRole
  });
  
  // Use strict role matching based on activeRole to prevent menu conflicts
  if (currentRole === 'admin') {
    menu = adminMenu;
    basePath = '/admin';
    roleName = 'Administrator';
    roleColor = theme.palette.roles?.admin || theme.palette.primary.dark;
  } else if (currentRole === 'dean') {
    menu = deanMenu;
    basePath = '/dean';
    roleName = 'Dean';
    roleColor = theme.palette.roles?.dean || theme.palette.secondary.main;
  } else if (currentRole === 'hod') {
    menu = hodMenu;
    basePath = '/hod';
    roleName = 'HOD';
    roleColor = theme.palette.roles?.hod || theme.palette.primary.main;
  } else if (currentRole === 'teacher') {
    // Filter teacher menu based on permissions and CC status
    menu = teacherMenu.filter(item => {
      // Special case: Hide CC Management if user is not currently a CC
      if (item.path === 'cc-management' && !ccStatus.isCC) {
        return false;
      }
      
      // Include if permission is null (always show) or user has the permission
      return item.permission === null || 
        (currentUser.permissions && hasPermission(currentUser, item.permission));
    });
    basePath = '/teacher';
    // Update role name based on actual CC status, not just activeRole
    roleName = ccStatus.isCC ? `Course Coordinator (${ccStatus.coursesCount} course${ccStatus.coursesCount !== 1 ? 's' : ''})` : 'Teacher';
    roleColor = ccStatus.isCC ? theme.palette.status?.info || theme.palette.primary.main : theme.palette.roles?.teacher || theme.palette.primary.light;
  } else if (currentRole === 'student') {
    menu = studentMenu;
    basePath = '/student';
    roleName = 'Student';
    roleColor = theme.palette.roles?.student || theme.palette.secondary.light;
  }

  // Get initials for the avatar
  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length > 1) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };
  
  return (
    <Box component="nav" sx={{ width: { md: 280 }, flexShrink: { md: 0 } }}>
      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: 280,
            borderRight: 0,
            background: 'linear-gradient(180deg, #011f4b 0%, #03396c 100%)',
            color: '#ffffff !important',
            boxShadow: '4px 0px 24px rgba(1, 31, 75, 0.25)',
            '& .MuiListItemText-primary': {
              color: '#ffffff !important',
            },
            '& .MuiListItemText-secondary': {
              color: 'rgba(255, 255, 255, 0.8) !important',
            },
            '& .MuiTypography-root': {
              color: 'inherit',
            },
            // Custom scrollbar styling
            '&::-webkit-scrollbar': {
              width: '6px',
            },
            '&::-webkit-scrollbar-track': {
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '10px',
            },
            '&::-webkit-scrollbar-thumb': {
              background: 'rgba(255, 255, 255, 0.3)',
              borderRadius: '10px',
              '&:hover': {
                background: 'rgba(255, 255, 255, 0.5)',
              },
            },
            '&::-webkit-scrollbar-thumb:active': {
              background: 'rgba(255, 255, 255, 0.7)',
            },
            // For Firefox
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(255, 255, 255, 0.3) rgba(255, 255, 255, 0.05)',
          },
        }}
      >
        <SidebarContent />
      </Drawer>
      
      {/* Desktop drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: 280,
            borderRight: 0,
            background: 'linear-gradient(180deg, #011f4b 0%, #03396c 100%)',
            color: '#ffffff !important',
            boxShadow: '4px 0px 24px rgba(1, 31, 75, 0.25)',
            '& .MuiListItemText-primary': {
              color: '#ffffff !important',
            },
            '& .MuiListItemText-secondary': {
              color: 'rgba(255, 255, 255, 0.8) !important',
            },
            '& .MuiTypography-root': {
              color: 'inherit',
            },
            // Custom scrollbar styling
            '&::-webkit-scrollbar': {
              width: '6px',
            },
            '&::-webkit-scrollbar-track': {
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '10px',
            },
            '&::-webkit-scrollbar-thumb': {
              background: 'rgba(255, 255, 255, 0.3)',
              borderRadius: '10px',
              '&:hover': {
                background: 'rgba(255, 255, 255, 0.5)',
              },
            },
            '&::-webkit-scrollbar-thumb:active': {
              background: 'rgba(255, 255, 255, 0.7)',
            },
            // For Firefox
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(255, 255, 255, 0.3) rgba(255, 255, 255, 0.05)',
          },
        }}
        open
      >
        <SidebarContent />
      </Drawer>
    </Box>
  );

  function SidebarContent() {
    return (
      <>
        <Toolbar sx={{ 
          background: 'linear-gradient(135deg, #011f4b 0%, #03396c 100%)',
          height: 80,
          display: 'flex',
          justifyContent: 'center',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          position: 'relative',
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '60%',
            height: '2px',
            background: 'linear-gradient(90deg, transparent, #6497b1, transparent)',
          }
        }}>
          <Typography variant="h5" sx={{ 
            color: 'white', 
            fontWeight: 700, 
            letterSpacing: '0.5px',
            textShadow: '0 2px 4px rgba(0,0,0,0.3)' 
          }}>
            SGT Learning
          </Typography>
        </Toolbar>
        
        {/* User profile section */}
        <Box sx={{ 
          p: 3, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          mb: 2,
          background: 'rgba(255, 255, 255, 0.02)'
        }}>
          <Avatar 
            sx={{ 
              width: 72, 
              height: 72, 
              bgcolor: roleColor,
              mb: 2,
              border: '3px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
              fontSize: '1.5rem',
              fontWeight: 600,
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'scale(1.05)',
                boxShadow: '0 6px 20px rgba(0, 0, 0, 0.4)',
              }
            }}
          >
            {getInitials(currentUser?.name || currentUser?.email)}
          </Avatar>
          <Typography variant="h6" sx={{ 
            color: 'white', 
            fontWeight: 600, 
            mb: 0.5,
            textAlign: 'center',
            fontSize: '1.1rem'
          }}>
            {currentUser?.name || currentUser?.email}
          </Typography>
          <Typography 
            variant="caption" 
            sx={{ 
              color: roleColor,
              bgcolor: 'rgba(255, 255, 255, 0.1)',
              px: 2,
              py: 0.5,
              borderRadius: 2,
              fontWeight: 600,
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              border: `1px solid ${roleColor}40`,
            }}
          >
            {roleName}
          </Typography>
        </Box>
        
        <List sx={{ px: 2, flex: 1 }}>
          {menu.map((item, index) => {
            const isSelected = item.path === '' 
              ? location.pathname === basePath 
              : location.pathname === `${basePath}/${item.path}`;
            
            return (
              <ListItemButton 
                key={item.text} 
                onClick={() => navigate(`${basePath}/${item.path}`)}
                sx={{ 
                  my: 1,
                  borderRadius: '0 12px 12px 0',
                  py: 1.5,
                  px: 2,
                  color: 'rgba(255, 255, 255, 0.9)',
                  position: 'relative',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  ...(isSelected && {
                    bgcolor: 'rgba(255, 255, 255, 0.15)',
                    color: '#ffffff',
                    borderLeft: '4px solid #1976d2',
                    borderRadius: '0 12px 12px 0',
                    boxShadow: '0 4px 20px rgba(25, 118, 210, 0.4)',
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.20)',
                    },
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      right: 0,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '4px',
                      height: '60%',
                      backgroundColor: '#1976d2',
                      borderRadius: '2px 0 0 2px',
                    }
                  }),
                  ...(item.highlight && !isSelected && {
                    borderLeft: `2px solid ${item.color}40`,
                  }),
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.08)',
                    transform: 'translateX(8px)',
                    boxShadow: '0 4px 20px rgba(255, 255, 255, 0.1)',
                    color: '#ffffff'
                  },
                }}
              >
                <ListItemIcon sx={{ 
                  color: isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.7)',
                  minWidth: 60,
                  marginRight: 1,
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  filter: isSelected ? 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.3))' : 'none',
                  ...(isSelected && {
                    bgcolor: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    width: '40px',
                    height: '40px',
                    boxShadow: '0 4px 12px rgba(255, 255, 255, 0.2)',
                  })
                }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={
                    <Box display="flex" alignItems="center">
                      <Typography
                        variant="body1"
                        sx={{ 
                          fontWeight: isSelected ? 700 : 500,
                          color: isSelected ? '#ffffff' : 'inherit',
                          transition: 'all 0.3s ease',
                          textShadow: isSelected ? `0 0 10px ${item.color}80` : 'none',
                          fontSize: isSelected ? '1rem' : '0.95rem'
                        }}
                      >
                        {item.text}
                      </Typography>
                      {item.isNew && (
                        <Badge 
                          sx={{ 
                            ml: 1.5,
                            "& .MuiBadge-badge": {
                              fontSize: '0.6rem',
                              height: 18,
                              padding: '0 6px',
                              backgroundColor: '#ff0066',
                              color: 'white',
                              fontWeight: 'bold',
                              borderRadius: 10,
                              boxShadow: '0 2px 6px rgba(255, 0, 102, 0.4)',
                              animation: 'pulse 2s infinite'
                            },
                            '@keyframes pulse': {
                              '0%': { boxShadow: '0 0 0 0 rgba(255, 0, 102, 0.7)' },
                              '70%': { boxShadow: '0 0 0 6px rgba(255, 0, 102, 0)' },
                              '100%': { boxShadow: '0 0 0 0 rgba(255, 0, 102, 0)' }
                            }
                          }}
                          badgeContent="NEW"
                        />
                      )}
                      {item.badge && (
                        <Badge 
                          sx={{ 
                            ml: 1.5,
                            "& .MuiBadge-badge": {
                              fontSize: '0.6rem',
                              height: 18,
                              padding: '0 6px',
                              backgroundColor: item.color || theme.palette.status?.success || '#059669',
                              color: 'white',
                              fontWeight: 'bold',
                              borderRadius: 10,
                              boxShadow: `0 2px 6px ${alpha(item.color || theme.palette.status?.success || '#059669', 0.4)}`,
                            }
                          }}
                          badgeContent={item.badge}
                        />
                      )}
                    </Box>
                  }
                />
              </ListItemButton>
            );
          })}
        </List>
        
        <Box sx={{ flexGrow: 1 }} />
        
        <Box 
          sx={{ 
            p: 2.5, 
            textAlign: 'center', 
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'linear-gradient(0deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 100%)',
            mt: 2
          }}
        >
          <Typography 
            variant="caption" 
            sx={{
              color: 'rgba(255, 255, 255, 0.6)',
              fontWeight: 500,
              letterSpacing: '0.5px',
              fontSize: '0.7rem'
            }}
          >
            © {new Date().getFullYear()} SGT Learning Platform
            <Box component="span" sx={{ 
              display: 'block', 
              mt: 0.5, 
              color: '#6497b1', 
              fontWeight: 600 
            }}>
              Version 2.0
            </Box>
          </Typography>
        </Box>
      </>
    );
  }
};

export default Sidebar;
