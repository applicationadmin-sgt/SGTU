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
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress
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
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
  BusinessCenter as DepartmentIcon,
  AccountTree as OrganizationIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '../../contexts/UserRoleContext';
import enhancedLiveClassAPI from '../../api/enhancedLiveClassApi';

const DeanLiveClasses = () => {
  const navigate = useNavigate();
  const { user, token } = useUserRole();
  const [classes, setClasses] = useState([]);
  const [institutionStats, setInstitutionStats] = useState({});
  const [departmentStats, setDepartmentStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [monitorMode, setMonitorMode] = useState(false);
  const [realTimeUpdates, setRealTimeUpdates] = useState(true);

  useEffect(() => {
    loadData();
    
    if (realTimeUpdates) {
      const interval = setInterval(loadData, 30000); // Update every 30 seconds
      return () => clearInterval(interval);
    }
  }, [token, selectedDepartment, realTimeUpdates]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [classesResponse, statsResponse, deptStatsResponse] = await Promise.all([
        enhancedLiveClassAPI.getDeanLiveClasses(token, selectedDepartment),
        enhancedLiveClassAPI.getInstitutionStats(token),
        enhancedLiveClassAPI.getDepartmentWiseStats(token)
      ]);

      if (classesResponse.success) {
        setClasses(classesResponse.classes || []);
      }
      
      if (statsResponse.success) {
        setInstitutionStats(statsResponse.stats || {});
      }
      
      if (deptStatsResponse.success) {
        setDepartmentStats(deptStatsResponse.departments || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load institution data');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClass = async (liveClass) => {
    try {
      // Deans can join any live class directly with highest privileges
      const response = await enhancedLiveClassAPI.joinClassAsRole(liveClass._id, 'dean', token);
      if (response.success) {
        navigate(`/live-class/room/${liveClass._id}?role=dean`);
      }
    } catch (error) {
      console.error('Error joining class:', error);
      setError('Failed to join class');
    }
  };

  const handleMonitorClass = (liveClass) => {
    // Open class in dean monitor mode with full analytics
    navigate(`/live-class/monitor/${liveClass._id}?role=dean`);
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
    if (liveClass.currentParticipants > 200) return 'critical';
    if (liveClass.currentParticipants > 100) return 'high';
    if (liveClass.sections?.length > 2) return 'medium';
    return 'normal';
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      default: return 'default';
    }
  };

  const renderInstitutionStats = () => (
    <Grid container spacing={3} sx={{ mb: 4 }}>
      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ bgcolor: 'success.main', color: 'white' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h4" component="div">
                  {institutionStats.totalLiveClasses || 0}
                </Typography>
                <Typography variant="body2">
                  Total Live Classes
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
                  {institutionStats.totalActiveStudents || 0}
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
                  {institutionStats.activeDepartments || 0}
                </Typography>
                <Typography variant="body2">
                  Active Departments
                </Typography>
              </Box>
              <DepartmentIcon sx={{ fontSize: 40, opacity: 0.8 }} />
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
                  {Math.round(institutionStats.averageCapacityUtilization || 0)}%
                </Typography>
                <Typography variant="body2">
                  Capacity Utilization
                </Typography>
              </Box>
              <TrendingUpIcon sx={{ fontSize: 40, opacity: 0.8 }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderDepartmentStatsTable = () => (
    <Card sx={{ mb: 4 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Department-wise Live Class Overview
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Department</TableCell>
                <TableCell align="center">Live Classes</TableCell>
                <TableCell align="center">Active Students</TableCell>
                <TableCell align="center">Capacity Usage</TableCell>
                <TableCell align="center">Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {departmentStats.map((dept) => (
                <TableRow key={dept.departmentId}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <DepartmentIcon sx={{ mr: 1, fontSize: 20 }} />
                      {dept.departmentName}
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Badge badgeContent={dept.liveClasses} color="success">
                      <LiveIcon color="success" />
                    </Badge>
                  </TableCell>
                  <TableCell align="center">{dept.activeStudents}</TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={dept.capacityUsage}
                        sx={{ flex: 1, height: 8, borderRadius: 4 }}
                        color={dept.capacityUsage > 80 ? 'error' : dept.capacityUsage > 60 ? 'warning' : 'success'}
                      />
                      <Typography variant="body2">
                        {Math.round(dept.capacityUsage)}%
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={dept.status}
                      color={dept.status === 'optimal' ? 'success' : dept.status === 'high' ? 'warning' : 'error'}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );

  const renderClassCard = (liveClass) => {
    const priority = getPriorityLevel(liveClass);
    const isLive = liveClass.status === 'live';
    const needsAttention = liveClass.currentParticipants > liveClass.maxParticipants * 0.8;
    const isCritical = priority === 'critical';

    return (
      <Card 
        key={liveClass._id} 
        sx={{ 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          border: isCritical ? 3 : priority === 'high' ? 2 : 1,
          borderColor: isCritical ? 'error.main' : priority === 'high' ? 'warning.main' : 'divider',
          position: 'relative',
          boxShadow: isCritical ? 4 : 1
        }}
      >
        {isCritical && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="caption">
              CRITICAL: Over 200 students - Immediate attention required
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
                  variant={isCritical ? 'filled' : 'outlined'}
                />
              )}
            </Box>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40 }}>
            {liveClass.description || 'No description provided'}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <DepartmentIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
            <Typography variant="body2" noWrap>
              {liveClass.department || 'Unknown Department'}
            </Typography>
          </Box>

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
              color={isCritical ? 'error.main' : needsAttention ? 'warning.main' : 'text.secondary'}
              sx={{ fontWeight: isCritical ? 'bold' : needsAttention ? 'medium' : 'normal' }}
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

          {/* Capacity Usage Bar */}
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                Capacity Usage
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {Math.round((liveClass.currentParticipants / liveClass.maxParticipants) * 100)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={(liveClass.currentParticipants / liveClass.maxParticipants) * 100}
              color={isCritical ? 'error' : needsAttention ? 'warning' : 'success'}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>

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
                  color={isCritical ? 'error' : 'success'}
                  startIcon={<VideoCallIcon />}
                  onClick={() => handleJoinClass(liveClass)}
                  size="small"
                >
                  Join as Dean
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
                onClick={() => navigate(`/dean/live-classes/${liveClass._id}/details`)}
                size="small"
              >
                View Details
              </Button>
            )}
          </Box>

          <Box>
            <Tooltip title="Class analytics">
              <IconButton
                onClick={() => navigate(`/dean/live-classes/${liveClass._id}/analytics`)}
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
      id={`dean-tabpanel-${index}`}
      aria-labelledby={`dean-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  // Separate classes by status and priority
  const liveClasses = classes.filter(c => c.status === 'live');
  const scheduledClasses = classes.filter(c => c.status === 'scheduled');
  const completedClasses = classes.filter(c => c.status === 'completed');
  const criticalClasses = classes.filter(c => getPriorityLevel(c) === 'critical');
  const highPriorityClasses = classes.filter(c => ['critical', 'high'].includes(getPriorityLevel(c)));

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Institution Live Classes
            {liveClasses.length > 0 && (
              <Badge badgeContent={liveClasses.length} color="success" sx={{ ml: 2 }}>
                <LiveIcon color="success" />
              </Badge>
            )}
            {criticalClasses.length > 0 && (
              <Badge badgeContent={criticalClasses.length} color="error" sx={{ ml: 1 }}>
                <WarningIcon color="error" />
              </Badge>
            )}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Monitor and oversee all live classes across the institution
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Department</InputLabel>
            <Select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              label="Department"
            >
              <MenuItem value="all">All Departments</MenuItem>
              {departmentStats.map((dept) => (
                <MenuItem key={dept.departmentId} value={dept.departmentId}>
                  {dept.departmentName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControlLabel
            control={
              <Switch
                checked={realTimeUpdates}
                onChange={(e) => setRealTimeUpdates(e.target.checked)}
                color="primary"
              />
            }
            label="Real-time"
          />
          
          <Button
            variant="outlined"
            startIcon={<AssessmentIcon />}
            onClick={() => navigate('/dean/reports/institution')}
          >
            Institution Report
          </Button>
          
          <Button
            variant="contained"
            startIcon={<OrganizationIcon />}
            onClick={() => navigate('/dean/dashboard/overview')}
          >
            Executive Dashboard
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

      {/* Institution Stats */}
      {renderInstitutionStats()}

      {/* Department Stats Table */}
      {renderDepartmentStatsTable()}

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
            label={`All Live (${liveClasses.length})`} 
            icon={<LiveIcon />}
            iconPosition="start"
          />
          <Tab 
            label={`Critical (${criticalClasses.length})`} 
            icon={<WarningIcon />}
            iconPosition="start"
          />
          <Tab 
            label={`High Priority (${highPriorityClasses.length})`} 
            icon={<TrendingUpIcon />}
            iconPosition="start"
          />
          <Tab 
            label={`Scheduled (${scheduledClasses.length})`} 
            icon={<ScheduledIcon />}
            iconPosition="start"
          />
          <Tab 
            label={`Recent (${completedClasses.length})`} 
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
              No Live Classes Institution-wide
            </Typography>
            <Typography variant="body2" color="text.secondary">
              All classes across the institution are currently offline.
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
        {criticalClasses.length === 0 ? (
          <Card sx={{ p: 4, textAlign: 'center' }}>
            <WarningIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No Critical Classes
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Excellent! No classes require immediate attention.
            </Typography>
          </Card>
        ) : (
          <Grid container spacing={3}>
            {criticalClasses.map((liveClass) => (
              <Grid item xs={12} sm={6} lg={4} key={liveClass._id}>
                {renderClassCard(liveClass)}
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        {highPriorityClasses.length === 0 ? (
          <Card sx={{ p: 4, textAlign: 'center' }}>
            <TrendingUpIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No High Priority Classes
            </Typography>
            <Typography variant="body2" color="text.secondary">
              All classes are operating within optimal parameters.
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

      <TabPanel value={activeTab} index={3}>
        {scheduledClasses.length === 0 ? (
          <Card sx={{ p: 4, textAlign: 'center' }}>
            <ScheduledIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No Scheduled Classes
            </Typography>
            <Typography variant="body2" color="text.secondary">
              No upcoming classes scheduled institution-wide.
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

      <TabPanel value={activeTab} index={4}>
        {completedClasses.length === 0 ? (
          <Card sx={{ p: 4, textAlign: 'center' }}>
            <ScheduleIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No Recent Classes
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

export default DeanLiveClasses;