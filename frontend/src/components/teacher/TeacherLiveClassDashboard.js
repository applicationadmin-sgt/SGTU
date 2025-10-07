import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import {
  Add as AddIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  VideoCall as VideoCallIcon,
  People as PeopleIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  PlayCircleOutline as PlayRecordingIcon,
  Download as DownloadIcon,
  Videocam as RecordingIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import ScheduleLiveClassDialog from './ScheduleLiveClassDialog';
import liveClassAPI from '../../api/liveClassApi';

const TeacherLiveClassDashboard = ({ token, user }) => {
  console.log('🚨 TEACHER LIVE CLASS DASHBOARD COMPONENT LOADED!!! 🚨');
  console.log('🎓 Props received:', { token: !!token, user: user?.name, role: user?.role });
  
  // Get token from props or localStorage as fallback
  const authToken = token || localStorage.getItem('token');
  const navigate = useNavigate();
  
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [currentTab, setCurrentTab] = useState(0);
  const [recordingDialogOpen, setRecordingDialogOpen] = useState(false);
  const [selectedRecording, setSelectedRecording] = useState(null);
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

  // Load teacher's classes
  const loadClasses = async () => {
    try {
      console.log('📚 Loading classes with token:', !!authToken);
      setLoading(true);
      setError('');
      
      const response = await liveClassAPI.getTeacherClasses({}, authToken);
      console.log('📚 Classes API response:', response);
      setClasses(response.classes || []);
      
      // Calculate stats
      const newStats = {
        total: response.classes?.length || 0,
        upcoming: response.classes?.filter(cls => cls.status === 'scheduled').length || 0,
        live: response.classes?.filter(cls => cls.status === 'live').length || 0,
        completed: response.classes?.filter(cls => cls.status === 'completed').length || 0
      };
      console.log('📊 Stats calculated:', newStats);
      setStats(newStats);
      
    } catch (err) {
      console.error('❌ Error loading classes:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authToken) {
      loadClasses();
    }
  }, [authToken]);

  // Handle class scheduling
  const handleClassScheduled = (newClass) => {
    setClasses(prev => [newClass, ...prev]);
    setStats(prev => ({
      ...prev,
      total: prev.total + 1,
      upcoming: prev.upcoming + 1
    }));
  };

  // Start a class - Navigate to ScalableLiveClassRoom
  const handleStartClass = async (classItem) => {
    try {
      await liveClassAPI.startClass(classItem._id, authToken);
      
      // Update class status
      setClasses(prev => prev.map(cls => 
        cls._id === classItem._id 
          ? { ...cls, status: 'live' }
          : cls
      ));
      
      setStats(prev => ({
        ...prev,
        upcoming: prev.upcoming - 1,
        live: prev.live + 1
      }));
      
      // Navigate to scalable live class room
      navigate(`/teacher/live-class/${classItem._id}`);
      
    } catch (err) {
      setError(err.message);
    }
  };

  // Join live class - Navigate to ScalableLiveClassRoom
  const handleJoinClass = (classItem) => {
    navigate(`/teacher/live-class/${classItem._id}`);
  };

  // End a class
  const handleEndClass = async (classItem) => {
    try {
      await liveClassAPI.endClass(classItem._id, authToken);
      
      // Update class status
      setClasses(prev => prev.map(cls => 
        cls._id === classItem._id 
          ? { ...cls, status: 'completed' }
          : cls
      ));
      
      setStats(prev => ({
        ...prev,
        live: prev.live - 1,
        completed: prev.completed + 1
      }));
      
    } catch (err) {
      setError(err.message);
    }
  };

  // Delete a class
  const handleDeleteClass = async () => {
    try {
      await liveClassAPI.deleteClass(selectedClass._id, authToken);
      
      // Remove class from list
      setClasses(prev => prev.filter(cls => cls._id !== selectedClass._id));
      
      setStats(prev => ({
        ...prev,
        total: prev.total - 1,
        [selectedClass.status === 'scheduled' ? 'upcoming' : 
         selectedClass.status === 'live' ? 'live' : 'completed']: 
         prev[selectedClass.status === 'scheduled' ? 'upcoming' : 
         selectedClass.status === 'live' ? 'live' : 'completed'] - 1
      }));
      
      setDeleteDialogOpen(false);
      setSelectedClass(null);
      
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

  // Handle recording play
  const handlePlayRecording = (classItem) => {
    setSelectedRecording(classItem);
    setRecordingDialogOpen(true);
  };

  // Handle recording download
  const handleDownloadRecording = (classItem) => {
    if (classItem.recordingUrl) {
      const link = document.createElement('a');
      link.href = `${process.env.REACT_APP_API_URL || 'https://192.168.7.20:5000'}${classItem.recordingUrl}`;
      link.download = `${classItem.title}-recording.webm`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Format recording duration
  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Live Classes Dashboard
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Manage your live classes with 10,000+ student capacity using enhanced WebRTC technology
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setScheduleDialogOpen(true)}
          size="large"
        >
          Schedule Class
        </Button>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Total Classes
                  </Typography>
                  <Typography variant="h4">
                    {stats.total}
                  </Typography>
                </Box>
                <ScheduleIcon sx={{ fontSize: 40, color: 'primary.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Upcoming
                  </Typography>
                  <Typography variant="h4" color="primary">
                    {stats.upcoming}
                  </Typography>
                </Box>
                <ScheduleIcon sx={{ fontSize: 40, color: 'primary.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Live Now
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {stats.live}
                  </Typography>
                </Box>
                <VideoCallIcon sx={{ fontSize: 40, color: 'success.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Completed
                  </Typography>
                  <Typography variant="h4">
                    {stats.completed}
                  </Typography>
                </Box>
                <CheckCircleIcon sx={{ fontSize: 40, color: 'text.secondary' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={currentTab}
          onChange={(event, newValue) => setCurrentTab(newValue)}
          indicatorColor="primary"
          textColor="primary"
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
              <TableCell>Class Details</TableCell>
              <TableCell>Section/Course</TableCell>
              <TableCell>Date & Time</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Participants</TableCell>
              <TableCell>Recording</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : getFilteredClasses().length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography variant="body2" color="text.secondary">
                    {currentTab === 0 ? 'No classes scheduled yet' :
                     currentTab === 1 ? 'No upcoming classes' :
                     currentTab === 2 ? 'No live classes' :
                     'No completed classes'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              getFilteredClasses().map((classItem) => (
                <TableRow key={classItem._id}>
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
                    <Box>
                      <Typography variant="body2">
                        {classItem.section?.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {classItem.course?.courseCode} - {classItem.course?.title}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {format(new Date(classItem.scheduledAt), 'MMM dd, yyyy')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {format(new Date(classItem.scheduledAt), 'hh:mm a')}
                    </Typography>
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
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <PeopleIcon fontSize="small" sx={{ mr: 1 }} />
                      <Typography variant="body2">
                        {classItem.currentParticipants || 0}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {classItem.recordingUrl ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <RecordingIcon fontSize="small" color="primary" />
                        <Box>
                          <Typography variant="body2" color="primary">
                            Available
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {formatDuration(classItem.recordingDuration)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {formatFileSize(classItem.recordingSize)}
                          </Typography>
                        </Box>
                      </Box>
                    ) : classItem.status === 'completed' ? (
                      <Typography variant="body2" color="text.secondary">
                        No recording
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.disabled">
                        -
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {classItem.status === 'scheduled' && (
                        <Tooltip title="Start Class (Enhanced Interface)">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleStartClass(classItem)}
                          >
                            <PlayIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      
                      {classItem.status === 'live' && (
                        <>
                          <Tooltip title="Join Class (Enhanced Interface)">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleJoinClass(classItem)}
                            >
                              <VideoCallIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="End Class">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleEndClass(classItem)}
                            >
                              <StopIcon />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                      
                      {classItem.recordingUrl && classItem.status === 'completed' && (
                        <>
                          <Tooltip title="Play Recording">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handlePlayRecording(classItem)}
                            >
                              <PlayRecordingIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Download Recording">
                            <IconButton
                              size="small"
                              color="secondary"
                              onClick={() => handleDownloadRecording(classItem)}
                            >
                              <DownloadIcon />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                      
                      {classItem.status !== 'live' && (
                        <Tooltip title="Delete Class">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              setSelectedClass(classItem);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Schedule Class Dialog */}
      <ScheduleLiveClassDialog
        open={scheduleDialogOpen}
        onClose={() => setScheduleDialogOpen(false)}
        onClassScheduled={handleClassScheduled}
        token={authToken}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Live Class</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedClass?.title}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteClass} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Recording Player Dialog */}
      <Dialog 
        open={recordingDialogOpen} 
        onClose={() => setRecordingDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <RecordingIcon color="primary" />
          {selectedRecording?.title} - Recording
        </DialogTitle>
        <DialogContent>
          {selectedRecording?.recordingUrl && (
            <Box sx={{ mb: 2 }}>
              <video
                controls
                width="100%"
                height="400px"
                src={`${process.env.REACT_APP_API_URL || 'https://192.168.7.20:5000'}${selectedRecording.recordingUrl}`}
              />
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Duration: {formatDuration(selectedRecording.recordingDuration)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Size: {formatFileSize(selectedRecording.recordingSize)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Recorded: {selectedRecording.recordingEndTime ? 
                      format(new Date(selectedRecording.recordingEndTime), 'MMM dd, yyyy hh:mm a') : 
                      'Unknown'
                    }
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={() => handleDownloadRecording(selectedRecording)}
                >
                  Download
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRecordingDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeacherLiveClassDashboard;