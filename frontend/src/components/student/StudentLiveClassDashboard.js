import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  Alert,
  Snackbar,
  Tooltip,
  Badge,
  CircularProgress,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  Paper,
  Tab,
  Tabs
} from '@mui/material';
import {
  PlayArrow as JoinIcon,
  Schedule as ScheduleIcon,
  LiveTv as LiveIcon,
  VideoCall as VideoCallIcon,
  School as SchoolIcon,
  Assignment as AssignmentIcon,
  Person as PersonIcon,
  AccessTime as TimeIcon,
  Event as EventIcon,
  Notifications as NotificationIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import SgtLmsLiveClass from '../liveclass/CodeTantraLiveClass';
import LiveClassJoinPage from './LiveClassJoinPage';
import liveClassAPI from '../../api/liveClassApi';

// Styled Components
const DashboardContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  maxWidth: '1400px',
  margin: '0 auto'
}));

const StatsCard = styled(Card)(({ theme }) => ({
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: 'white',
  height: '120px'
}));

const ClassCard = styled(Card)(({ theme }) => ({
  transition: 'all 0.3s ease',
  cursor: 'pointer',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[8],
  },
  '&.live': {
    border: '2px solid #ef4444',
    boxShadow: '0 0 20px rgba(239, 68, 68, 0.3)',
  },
  '&.upcoming': {
    border: '2px solid #3b82f6',
  },
  '&.missed': {
    border: '2px solid #f59e0b',
  },
  '&.attended': {
    border: '2px solid #10b981',
  }
}));

const LiveIndicator = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(0.5, 1),
  borderRadius: theme.spacing(3),
  backgroundColor: '#ef4444',
  color: 'white',
  fontSize: '0.75rem',
  fontWeight: 'bold',
  animation: 'pulse 2s infinite',
  '@keyframes pulse': {
    '0%': { opacity: 1 },
    '50%': { opacity: 0.7 },
    '100%': { opacity: 1 },
  }
}));

const StudentLiveClassDashboard = ({ token, user }) => {
  // State management
  const [activeTab, setActiveTab] = useState(0);
  const [classes, setClasses] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    live: 0,
    upcoming: 0,
    attended: 0,
    missed: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedClass, setSelectedClass] = useState(null);
  const [showLiveClass, setShowLiveClass] = useState(false);
  const [showJoinPage, setShowJoinPage] = useState(false);
  const [notification, setNotification] = useState(null);

  // Load classes data
  const loadClasses = useCallback(async () => {
    try {
      setLoading(true);
      const response = await liveClassAPI.getStudentClasses({}, token);
      
      if (response.success) {
        setClasses(response.classes || []);
        
        // Calculate stats
        const stats = response.classes.reduce((acc, cls) => {
          acc.total++;
          switch (cls.status) {
            case 'live':
              acc.live++;
              break;
            case 'scheduled':
              // Check if class time has passed
              const classTime = new Date(cls.scheduledAt);
              const now = new Date();
              if (classTime < now) {
                acc.missed++;
              } else {
                acc.upcoming++;
              }
              break;
            case 'completed':
              // Check if student attended
              if (cls.attended) {
                acc.attended++;
              } else {
                acc.missed++;
              }
              break;
          }
          return acc;
        }, { total: 0, live: 0, upcoming: 0, attended: 0, missed: 0 });
        
        setStats(stats);
      }
    } catch (err) {
      setError('Failed to load classes');
      console.error('Error loading classes:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      loadClasses();
    }
  }, [token, loadClasses]);

  // Auto-refresh for live updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (!showLiveClass) {
        loadClasses();
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [loadClasses, showLiveClass]);

  // Class management functions
  const handleJoinClass = async (classItem) => {
    try {
      const response = await liveClassAPI.joinClass(classItem._id, token);
      if (response.success) {
        setSelectedClass(classItem);
        setShowJoinPage(true);
        showNotification('Preparing to join live class...', 'success');
      }
    } catch (err) {
      showNotification('Failed to join class', 'error');
    }
  };

  const handleActualJoin = (mediaData) => {
    setShowJoinPage(false);
    setShowLiveClass(true);
    showNotification('Joining live class...', 'success');
  };

  const handleCancelJoin = () => {
    setShowJoinPage(false);
    setSelectedClass(null);
  };

  const showNotification = (message, severity = 'info') => {
    setNotification({ message, severity });
  };

  const getStatusColor = (classItem) => {
    const now = new Date();
    const classTime = new Date(classItem.scheduledAt);
    
    switch (classItem.status) {
      case 'live': return 'error';
      case 'scheduled': 
        return classTime < now ? 'warning' : 'primary';
      case 'completed': 
        return classItem.attended ? 'success' : 'default';
      default: return 'default';
    }
  };

  const getStatusLabel = (classItem) => {
    const now = new Date();
    const classTime = new Date(classItem.scheduledAt);
    
    switch (classItem.status) {
      case 'live': return 'LIVE NOW';
      case 'scheduled': 
        return classTime < now ? 'MISSED' : 'UPCOMING';
      case 'completed': 
        return classItem.attended ? 'ATTENDED' : 'MISSED';
      default: return classItem.status.toUpperCase();
    }
  };

  const getStatusIcon = (classItem) => {
    const now = new Date();
    const classTime = new Date(classItem.scheduledAt);
    
    switch (classItem.status) {
      case 'live': return <LiveIcon />;
      case 'scheduled': 
        return classTime < now ? <NotificationIcon /> : <ScheduleIcon />;
      case 'completed': 
        return classItem.attended ? <AssignmentIcon /> : <NotificationIcon />;
      default: return <SchoolIcon />;
    }
  };

  const filterClassesByTab = (tabIndex) => {
    const now = new Date();
    switch (tabIndex) {
      case 0: return classes; // All
      case 1: return classes.filter(cls => cls.status === 'live'); // Live Now
      case 2: return classes.filter(cls => {
        if (cls.status === 'scheduled') {
          const classTime = new Date(cls.scheduledAt);
          return classTime >= now;
        }
        return false;
      }); // Upcoming
      case 3: return classes.filter(cls => cls.status === 'completed' && cls.attended); // Attended
      case 4: return classes.filter(cls => {
        if (cls.status === 'completed') return !cls.attended;
        if (cls.status === 'scheduled') {
          const classTime = new Date(cls.scheduledAt);
          return classTime < now;
        }
        return false;
      }); // Missed
      default: return classes;
    }
  };

  const getTimeUntilClass = (scheduledAt) => {
    const now = new Date();
    const classTime = new Date(scheduledAt);
    const diff = classTime - now;
    
    if (diff <= 0) return 'Class time passed';
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  };

  // If showing join page, show the join interface
  if (showJoinPage && selectedClass) {
    return (
      <LiveClassJoinPage
        classData={selectedClass}
        user={user}
        onJoin={handleActualJoin}
        onCancel={handleCancelJoin}
      />
    );
  }

  // If in live class mode, show the live classroom
  if (showLiveClass && selectedClass) {
    return (
      <SgtLmsLiveClass 
        token={token} 
        user={user} 
        classId={selectedClass._id}
        onExit={() => {
          setShowLiveClass(false);
          setSelectedClass(null);
          loadClasses(); // Refresh data when returning
        }}
      />
    );
  }

  return (
    <DashboardContainer>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom color="primary" fontWeight="bold">
          My Live Classes
        </Typography>
        <Typography variant="subtitle1" color="textSecondary">
          Join live classes, view recordings, and track your attendance
        </Typography>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatsCard>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {stats.total}
                  </Typography>
                  <Typography variant="body2">Total Classes</Typography>
                </Box>
                <SchoolIcon sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </StatsCard>
        </Grid>
        
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white', height: '120px' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {stats.live}
                  </Typography>
                  <Typography variant="body2">Live Now</Typography>
                </Box>
                <LiveIcon sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white', height: '120px' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {stats.upcoming}
                  </Typography>
                  <Typography variant="body2">Upcoming</Typography>
                </Box>
                <ScheduleIcon sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', color: 'white', height: '120px' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {stats.attended}
                  </Typography>
                  <Typography variant="body2">Attended</Typography>
                </Box>
                <AssignmentIcon sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', color: 'white', height: '120px' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {stats.missed}
                  </Typography>
                  <Typography variant="body2">Missed</Typography>
                </Box>
                <NotificationIcon sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tab Navigation */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} variant="scrollable">
          <Tab 
            label={
              <Badge badgeContent={stats.total} color="primary">
                All Classes
              </Badge>
            } 
          />
          <Tab 
            label={
              <Badge badgeContent={stats.live} color="error">
                Live Now
              </Badge>
            } 
          />
          <Tab 
            label={
              <Badge badgeContent={stats.upcoming} color="info">
                Upcoming
              </Badge>
            } 
          />
          <Tab 
            label={
              <Badge badgeContent={stats.attended} color="success">
                Attended
              </Badge>
            } 
          />
          <Tab 
            label={
              <Badge badgeContent={stats.missed} color="warning">
                Missed
              </Badge>
            } 
          />
        </Tabs>
      </Paper>

      {/* Classes Grid */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={60} />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filterClassesByTab(activeTab).map((classItem) => (
            <Grid item xs={12} md={6} lg={4} key={classItem._id}>
              <ClassCard className={classItem.status}>
                <CardContent>
                  {/* Live Indicator */}
                  {classItem.status === 'live' && (
                    <Box sx={{ mb: 2 }}>
                      <LiveIndicator>
                        <LiveIcon fontSize="small" />
                        LIVE
                      </LiveIndicator>
                    </Box>
                  )}

                  {/* Class Info */}
                  <Typography variant="h6" gutterBottom noWrap>
                    {classItem.title}
                  </Typography>
                  
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                    {classItem.description}
                  </Typography>

                  {/* Teacher Info */}
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ width: 32, height: 32, mr: 1 }}>
                      {classItem.teacher?.name?.charAt(0) || 'T'}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {classItem.teacher?.name || 'Teacher'}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {classItem.teacher?.department || 'Department'}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Status and Details */}
                  <Box sx={{ mb: 2 }}>
                    <Chip 
                      icon={getStatusIcon(classItem)}
                      label={getStatusLabel(classItem)}
                      color={getStatusColor(classItem)}
                      size="small"
                      sx={{ mb: 1, mr: 1 }}
                    />
                    
                    {classItem.status === 'scheduled' && (
                      <Chip 
                        icon={<TimeIcon />}
                        label={getTimeUntilClass(classItem.scheduledAt)}
                        variant="outlined"
                        size="small"
                      />
                    )}
                  </Box>

                  {/* Timing Info */}
                  <Typography variant="caption" display="block" gutterBottom>
                    <strong>Scheduled:</strong> {new Date(classItem.scheduledAt).toLocaleString()}
                  </Typography>
                  
                  <Typography variant="caption" display="block" gutterBottom>
                    <strong>Duration:</strong> {classItem.duration} minutes
                  </Typography>

                  {/* Section Info */}
                  {classItem.section && (
                    <Typography variant="caption" display="block" gutterBottom>
                      <strong>Section:</strong> {classItem.section.name}
                    </Typography>
                  )}

                  {/* Course Info */}
                  {classItem.course && (
                    <Typography variant="caption" display="block" gutterBottom>
                      <strong>Course:</strong> {classItem.course.title}
                    </Typography>
                  )}

                  {/* Action Buttons */}
                  <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {classItem.status === 'live' && (
                      <Button
                        size="small"
                        variant="contained"
                        color="error"
                        startIcon={<JoinIcon />}
                        onClick={() => handleJoinClass(classItem)}
                        fullWidth
                      >
                        Join Live Class
                      </Button>
                    )}
                    
                    {classItem.status === 'scheduled' && new Date(classItem.scheduledAt) > new Date() && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="primary"
                        startIcon={<ScheduleIcon />}
                        disabled
                        fullWidth
                      >
                        Starts in {getTimeUntilClass(classItem.scheduledAt)}
                      </Button>
                    )}
                    
                    {classItem.status === 'completed' && classItem.recordingUrl && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="success"
                        startIcon={<VideoCallIcon />}
                        href={classItem.recordingUrl}
                        target="_blank"
                        fullWidth
                      >
                        Watch Recording
                      </Button>
                    )}
                    
                    {classItem.status === 'scheduled' && new Date(classItem.scheduledAt) <= new Date() && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="warning"
                        startIcon={<NotificationIcon />}
                        disabled
                        fullWidth
                      >
                        Class Missed
                      </Button>
                    )}
                  </Box>
                </CardContent>
              </ClassCard>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Empty State */}
      {!loading && filterClassesByTab(activeTab).length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <SchoolIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="textSecondary" gutterBottom>
            {activeTab === 0 ? 'No classes available' :
             activeTab === 1 ? 'No live classes right now' :
             activeTab === 2 ? 'No upcoming classes' :
             activeTab === 3 ? 'No attended classes yet' :
             'No missed classes'}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {activeTab === 0 && "Check back later for scheduled classes"}
            {activeTab === 1 && "Check the upcoming tab for scheduled classes"}
            {activeTab === 2 && "No classes scheduled in the near future"}
            {activeTab === 3 && "Attend live classes to see them here"}
            {activeTab === 4 && "Great! You haven't missed any classes"}
          </Typography>
        </Box>
      )}

      {/* Notifications */}
      <Snackbar
        open={!!notification}
        autoHideDuration={6000}
        onClose={() => setNotification(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setNotification(null)} 
          severity={notification?.severity || 'info'}
          variant="filled"
        >
          {notification?.message}
        </Alert>
      </Snackbar>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </DashboardContainer>
  );
};

export default StudentLiveClassDashboard;