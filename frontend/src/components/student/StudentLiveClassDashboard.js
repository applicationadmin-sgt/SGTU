import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab
} from '@mui/material';
import {
  VideoCall as VideoCallIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  PlayArrow as PlayIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import liveClassAPI from '../../api/liveClassApi';

const StudentLiveClassDashboard = ({ token, user }) => {
  // Get token from props or localStorage as fallback
  const authToken = token || localStorage.getItem('token');
  const navigate = useNavigate();
  
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentTab, setCurrentTab] = useState(0);
  const [stats, setStats] = useState({
    upcoming: 0,
    live: 0,
    completed: 0,
    total: 0
  });

  // Filter classes based on current tab
  const getFilteredClasses = () => {
    switch (currentTab) {
      case 0: // All
        return classes;
      case 1: // Upcoming
        return classes.filter(cls => cls.status === 'scheduled');
      case 2: // Live
        return classes.filter(cls => cls.status === 'live');
      case 3: // Completed
        return classes.filter(cls => cls.status === 'completed');
      default:
        return classes;
    }
  };

  // Load student's classes
  const loadClasses = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await liveClassAPI.getStudentClasses({}, authToken);
      setClasses(response.classes || []);
      
      // Calculate stats
      const newStats = {
        total: response.classes?.length || 0,
        upcoming: response.classes?.filter(cls => cls.status === 'scheduled').length || 0,
        live: response.classes?.filter(cls => cls.status === 'live').length || 0,
        completed: response.classes?.filter(cls => cls.status === 'completed').length || 0
      };
      setStats(newStats);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authToken) {
      loadClasses();
      
      // Set up auto-refresh for live classes
      const interval = setInterval(loadClasses, 30000); // Refresh every 30 seconds
      
      return () => clearInterval(interval);
    }
  }, [authToken]);

  // Join a live class
  const handleJoinClass = async (classItem) => {
    try {
      await liveClassAPI.joinClass(classItem._id, authToken);
      
      // Navigate to live class room in the same tab
      navigate(`/student/live-class/${classItem._id}`);
      
    } catch (err) {
      setError(err.message);
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled':
        return 'primary';
      case 'live':
        return 'success';
      case 'completed':
        return 'default';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'scheduled':
        return <ScheduleIcon />;
      case 'live':
        return <VideoCallIcon />;
      case 'completed':
        return <CheckCircleIcon />;
      case 'cancelled':
        return <CancelIcon />;
      default:
        return <ScheduleIcon />;
    }
  };

  // Check if class is starting soon (within 15 minutes)
  const isClassStartingSoon = (scheduledAt) => {
    const now = new Date();
    const classTime = new Date(scheduledAt);
    const diffMinutes = (classTime - now) / (1000 * 60);
    return diffMinutes > 0 && diffMinutes <= 15;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Loading live classes...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Live Classes
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary">
                {stats.total}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Classes
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary">
                {stats.upcoming}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Upcoming
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="success.main">
                {stats.live}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Live Now
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="text.secondary">
                {stats.completed}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Completed
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Live Classes Alert */}
      {stats.live > 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography fontWeight="bold">
            {stats.live} live class{stats.live > 1 ? 'es' : ''} in progress!
          </Typography>
          Join now to participate in the session.
        </Alert>
      )}

      {/* Starting Soon Alert */}
      {classes.some(cls => cls.status === 'scheduled' && isClassStartingSoon(cls.scheduledAt)) && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography fontWeight="bold">
            Classes starting soon!
          </Typography>
          Get ready to join.
        </Alert>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={currentTab}
          onChange={(e, newValue) => setCurrentTab(newValue)}
          variant="fullWidth"
        >
          <Tab label={`All (${stats.total})`} />
          <Tab label={`Upcoming (${stats.upcoming})`} />
          <Tab label={`Live (${stats.live})`} />
          <Tab label={`Completed (${stats.completed})`} />
        </Tabs>
      </Paper>

      {/* Classes Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Class Title</TableCell>
              <TableCell>Teacher</TableCell>
              <TableCell>Course</TableCell>
              <TableCell>Scheduled Time</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {getFilteredClasses().length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography variant="body1" color="text.secondary" sx={{ py: 4 }}>
                    {currentTab === 0 
                      ? 'No live classes scheduled yet.'
                      : `No ${['', 'upcoming', 'live', 'completed'][currentTab]} classes.`
                    }
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              getFilteredClasses().map((classItem) => (
                <TableRow 
                  key={classItem._id}
                  sx={{
                    bgcolor: classItem.status === 'live' ? 'success.light' : 
                             isClassStartingSoon(classItem.scheduledAt) ? 'warning.light' : 'inherit'
                  }}
                >
                  <TableCell>
                    <Box>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {classItem.title}
                      </Typography>
                      {classItem.description && (
                        <Typography variant="body2" color="text.secondary">
                          {classItem.description.substring(0, 50)}
                          {classItem.description.length > 50 ? '...' : ''}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {classItem.teacher?.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {classItem.teacher?.email}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {classItem.course?.courseCode}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {classItem.course?.title}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {format(new Date(classItem.scheduledAt), 'MMM dd, yyyy')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {format(new Date(classItem.scheduledAt), 'hh:mm a')}
                    </Typography>
                    {isClassStartingSoon(classItem.scheduledAt) && (
                      <Chip 
                        label="Starting Soon" 
                        size="small" 
                        color="warning" 
                        sx={{ ml: 1 }}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {classItem.duration} min
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={getStatusIcon(classItem.status)}
                      label={classItem.status.charAt(0).toUpperCase() + classItem.status.slice(1)}
                      color={getStatusColor(classItem.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {classItem.status === 'live' ? (
                      <Button
                        variant="contained"
                        color="success"
                        startIcon={<VideoCallIcon />}
                        onClick={() => handleJoinClass(classItem)}
                        size="small"
                      >
                        Join Now
                      </Button>
                    ) : classItem.status === 'scheduled' && isClassStartingSoon(classItem.scheduledAt) ? (
                      <Button
                        variant="outlined"
                        color="warning"
                        startIcon={<PlayIcon />}
                        disabled
                        size="small"
                      >
                        Starting Soon
                      </Button>
                    ) : classItem.status === 'scheduled' ? (
                      <Button
                        variant="outlined"
                        disabled
                        size="small"
                      >
                        Scheduled
                      </Button>
                    ) : classItem.status === 'completed' ? (
                      <Button
                        variant="outlined"
                        disabled
                        size="small"
                      >
                        Completed
                      </Button>
                    ) : (
                      <Button
                        variant="outlined"
                        disabled
                        size="small"
                      >
                        {classItem.status}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default StudentLiveClassDashboard;