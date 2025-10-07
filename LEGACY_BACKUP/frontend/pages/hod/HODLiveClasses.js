import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Badge,
  Tooltip,
  CircularProgress,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Paper,
  Tabs,
  Tab,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  VideoCall as VideoCallIcon,
  People as PeopleIcon,
  Schedule as ScheduleIcon,
  Analytics as AnalyticsIcon,
  SupervisorAccount as SupervisorIcon,
  Dashboard as DashboardIcon,
  AccessTime as TimeIcon,
  CheckCircle as LiveIcon,
  EventAvailable as ScheduledIcon,
  School as SchoolIcon,
  Group as GroupIcon,
  ExitToApp as JoinIcon,
  MonitorHeart as MonitorIcon,
  Report as ReportIcon,
  Settings as SettingsIcon,
  Visibility as ViewIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '../../contexts/UserRoleContext';
import enhancedLiveClassAPI from '../../api/enhancedLiveClassApi';

const HODLiveClasses = () => {
  const navigate = useNavigate();
  const { user, token } = useUserRole();
  const [classes, setClasses] = useState([]);
  const [departmentStats, setDepartmentStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [monitorMode, setMonitorMode] = useState(false);

  useEffect(() => {
    loadData();
  }, [token, selectedDepartment]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [classesResponse, statsResponse] = await Promise.all([
        enhancedLiveClassAPI.getHODLiveClasses(token, selectedDepartment),
        enhancedLiveClassAPI.getDepartmentStats(token, selectedDepartment)
      ]);

      if (classesResponse.success) {
        setClasses(classesResponse.classes || []);
      }
      
      if (statsResponse.success) {
        setDepartmentStats(statsResponse.stats || {});
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load live classes data');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClass = async (liveClass) => {
    try {
      // HODs can join any live class directly
      const response = await enhancedLiveClassAPI.joinClassAsRole(liveClass._id, 'hod', token);
      if (response.success) {
        navigate(`/live-class/room/${liveClass._id}?role=hod`);
      }
    } catch (error) {
      console.error('Error joining class:', error);
      setError('Failed to join class');
    }
  };

  const handleMonitorClass = (liveClass) => {
    // Open class in monitor mode (view-only with analytics)
    navigate(`/live-class/monitor/${liveClass._id}?role=hod`);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'live': return 'success';
      case 'scheduled': return 'info';
      case 'completed': return 'default';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'live': return <LiveIcon />;
      case 'scheduled': return <ScheduledIcon />;
      default: return <ScheduleIcon />;
    }
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPriorityLevel = (liveClass) => {
    if (liveClass.currentParticipants > 100) return 'high';
    if (liveClass.sections?.length > 1) return 'medium';
    return 'normal';
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      default: return 'default';
    }
  };

  const renderStatsCards = () => (
    <Grid container spacing={3} sx={{ mb: 4 }}>
      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ bgcolor: 'success.main', color: 'white' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h4" component="div">
                  {departmentStats.liveClasses || 0}
                </Typography>
                <Typography variant="body2">
                  Live Classes
                </Typography>
              </Box>
              <LiveIcon sx={{ fontSize: 40, opacity: 0.8 }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ bgcolor: 'info.main', color: 'white' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h4" component="div">
                  {departmentStats.totalStudents || 0}
                </Typography>
                <Typography variant="body2">
                  Active Students
                </Typography>
              </Box>
              <PeopleIcon sx={{ fontSize: 40, opacity: 0.8 }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ bgcolor: 'warning.main', color: 'white' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h4" component="div">
                  {departmentStats.activeTeachers || 0}
                </Typography>
                <Typography variant="body2">
                  Teaching Now
                </Typography>
              </Box>
              <SupervisorIcon sx={{ fontSize: 40, opacity: 0.8 }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h4" component="div">
                  {departmentStats.scheduledToday || 0}
                </Typography>
                <Typography variant="body2">
                  Scheduled Today
                </Typography>
              </Box>
              <ScheduleIcon sx={{ fontSize: 40, opacity: 0.8 }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderClassCard = (liveClass) => {
    const priority = getPriorityLevel(liveClass);
    const isLive = liveClass.status === 'live';
    const needsAttention = liveClass.currentParticipants > liveClass.maxParticipants * 0.9;

    return (
      <Card 
        key={liveClass._id} 
        sx={{ 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          border: priority === 'high' ? 2 : 1,
          borderColor: priority === 'high' ? 'error.main' : 'divider',
          position: 'relative'
        }}
      >
        {needsAttention && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="caption">
              High capacity - Monitor recommended
            </Typography>
          </Alert>
        )}

        <CardContent sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Typography variant="h6" component="h3" noWrap sx={{ flex: 1, mr: 1 }}>
              {liveClass.title}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexDirection: 'column', alignItems: 'flex-end' }}>
              <Chip
                icon={getStatusIcon(liveClass.status)}
                label={liveClass.status?.toUpperCase()}
                color={getStatusColor(liveClass.status)}
                size="small"
              />
              {priority !== 'normal' && (
                <Chip
                  label={priority.toUpperCase()}
                  color={getPriorityColor(priority)}
                  size="small"
                  variant="outlined"
                />
              )}
            </Box>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40 }}>
            {liveClass.description || 'No description provided'}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <SchoolIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
            <Typography variant="body2" noWrap>
              {liveClass.course?.title} ({liveClass.course?.courseCode})
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <GroupIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
            <Typography variant="body2" noWrap>
              {liveClass.sections?.length > 1 
                ? `${liveClass.sections.length} Sections (Merged)` 
                : liveClass.sections?.[0]?.name || liveClass.section?.name || 'No section'
              }
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <TimeIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
            <Typography variant="body2">
              {formatDateTime(liveClass.scheduledAt)}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <PeopleIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
            <Typography 
              variant="body2" 
              color={needsAttention ? 'warning.main' : 'text.secondary'}
              sx={{ fontWeight: needsAttention ? 'bold' : 'normal' }}
            >
              {liveClass.currentParticipants || 0}/{liveClass.maxParticipants} participants
            </Typography>
          </Box>

          {liveClass.teacher && (
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Avatar
                sx={{ width: 20, height: 20, mr: 1, fontSize: 12 }}
                src={liveClass.teacher.profilePicture}
              >
                {liveClass.teacher.name?.[0]?.toUpperCase()}
              </Avatar>
              <Typography variant="body2" color="text.secondary">
                {liveClass.teacher.name} ({liveClass.teacher.department})
              </Typography>
            </Box>
          )}

          {liveClass.sections?.length > 1 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Merged Sections:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                {liveClass.sections.slice(0, 3).map((section) => (
                  <Chip key={section._id} label={section.name} size="small" variant="outlined" />
                ))}
                {liveClass.sections.length > 3 && (
                  <Chip label={`+${liveClass.sections.length - 3} more`} size="small" variant="outlined" />
                )}
              </Box>
            </Box>
          )}
        </CardContent>

        <Divider />

        <CardActions sx={{ justifyContent: 'space-between', p: 2 }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {isLive ? (
              <>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<VideoCallIcon />}
                  onClick={() => handleJoinClass(liveClass)}
                  size="small"
                >
                  Join Class
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<MonitorIcon />}
                  onClick={() => handleMonitorClass(liveClass)}
                  size="small"
                >
                  Monitor
                </Button>
              </>
            ) : (
              <Button
                variant="outlined"
                startIcon={<ViewIcon />}
                onClick={() => navigate(`/hod/live-classes/${liveClass._id}/details`)}
                size="small"
              >
                View Details
              </Button>
            )}
          </Box>

          <Box>
            <Tooltip title="Class analytics">
              <IconButton
                onClick={() => navigate(`/hod/live-classes/${liveClass._id}/analytics`)}
                size="small"
              >
                <AnalyticsIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </CardActions>
      </Card>
    );
  };

  const TabPanel = ({ children, value, index, ...other }) => (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Separate classes by status
  const liveClasses = classes.filter(c => c.status === 'live');
  const scheduledClasses = classes.filter(c => c.status === 'scheduled');
  const completedClasses = classes.filter(c => c.status === 'completed');
  const highPriorityClasses = classes.filter(c => getPriorityLevel(c) === 'high');

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Department Live Classes
            {liveClasses.length > 0 && (
              <Badge badgeContent={liveClasses.length} color="success" sx={{ ml: 2 }}>
                <LiveIcon color="success" />
              </Badge>
            )}
            {highPriorityClasses.length > 0 && (
              <Badge badgeContent={highPriorityClasses.length} color="error" sx={{ ml: 1 }}>
                <WarningIcon color="error" />
              </Badge>
            )}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Monitor and oversee live classes across your department
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <FormControlLabel
            control={
              <Switch
                checked={monitorMode}
                onChange={(e) => setMonitorMode(e.target.checked)}
                color="primary"
              />
            }
            label="Monitor Mode"
          />
          
          <Button
            variant="outlined"
            startIcon={<ReportIcon />}
            onClick={() => navigate('/hod/reports/live-classes')}
          >
            View Reports
          </Button>
          
          <Button
            variant="contained"
            startIcon={<DashboardIcon />}
            onClick={() => navigate('/hod/dashboard/live-classes')}
          >
            Analytics Dashboard
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          onClose={() => setError('')}
        >
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      {renderStatsCards()}

      {/* Tabs */}
      <Paper sx={{ width: '100%', mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab 
            label={`Live Classes (${liveClasses.length})`} 
            icon={<LiveIcon />}
            iconPosition="start"
          />
          <Tab 
            label={`High Priority (${highPriorityClasses.length})`} 
            icon={<WarningIcon />}
            iconPosition="start"
          />
          <Tab 
            label={`Scheduled (${scheduledClasses.length})`} 
            icon={<ScheduledIcon />}
            iconPosition="start"
          />
          <Tab 
            label={`Completed (${completedClasses.length})`} 
            icon={<ScheduleIcon />}
            iconPosition="start"
          />
        </Tabs>
      </Paper>

      {/* Tab Panels */}
      <TabPanel value={activeTab} index={0}>
        {liveClasses.length === 0 ? (
          <Card sx={{ p: 4, textAlign: 'center' }}>
            <LiveIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No Live Classes Currently
            </Typography>
            <Typography variant="body2" color="text.secondary">
              All classes in your department are currently offline.
            </Typography>
          </Card>
        ) : (
          <Grid container spacing={3}>
            {liveClasses.map((liveClass) => (
              <Grid item xs={12} sm={6} lg={4} key={liveClass._id}>
                {renderClassCard(liveClass)}
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        {highPriorityClasses.length === 0 ? (
          <Card sx={{ p: 4, textAlign: 'center' }}>
            <WarningIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No High Priority Classes
            </Typography>
            <Typography variant="body2" color="text.secondary">
              All classes are operating within normal parameters.
            </Typography>
          </Card>
        ) : (
          <Grid container spacing={3}>
            {highPriorityClasses.map((liveClass) => (
              <Grid item xs={12} sm={6} lg={4} key={liveClass._id}>
                {renderClassCard(liveClass)}
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        {scheduledClasses.length === 0 ? (
          <Card sx={{ p: 4, textAlign: 'center' }}>
            <ScheduledIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No Scheduled Classes
            </Typography>
            <Typography variant="body2" color="text.secondary">
              No upcoming classes scheduled in your department.
            </Typography>
          </Card>
        ) : (
          <Grid container spacing={3}>
            {scheduledClasses.map((liveClass) => (
              <Grid item xs={12} sm={6} lg={4} key={liveClass._id}>
                {renderClassCard(liveClass)}
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>

      <TabPanel value={activeTab} index={3}>
        {completedClasses.length === 0 ? (
          <Card sx={{ p: 4, textAlign: 'center' }}>
            <ScheduleIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No Completed Classes
            </Typography>
            <Typography variant="body2" color="text.secondary">
              No completed classes to display yet.
            </Typography>
          </Card>
        ) : (
          <Grid container spacing={3}>
            {completedClasses.slice(0, 12).map((liveClass) => (
              <Grid item xs={12} sm={6} lg={4} key={liveClass._id}>
                {renderClassCard(liveClass)}
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>
    </Box>
  );
};

export default HODLiveClasses;