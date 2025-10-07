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
  Checkbox,
  FormControlLabel,
  Divider,
  Alert,
  Fab,
  Badge,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  IconButton,
  Switch
} from '@mui/material';
import {
  Add as AddIcon,
  VideoCall as VideoCallIcon,
  People as PeopleIcon,
  Schedule as ScheduleIcon,
  Settings as SettingsIcon,
  Analytics as AnalyticsIcon,
  OndemandVideo as RecordIcon,
  Link as LinkIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as StartIcon,
  Stop as StopIcon,
  School as SchoolIcon,
  Group as GroupIcon,
  AccessTime as TimeIcon,
  CheckCircle as LiveIcon,
  EventAvailable as ScheduledIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '../../contexts/UserRoleContext';
import enhancedLiveClassAPI from '../../api/enhancedLiveClassApi';

const TeacherLiveClasses = () => {
  const navigate = useNavigate();
  const { user, token } = useUserRole();
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showMergedClassDialog, setShowMergedClassDialog] = useState(false);
  
  // Form states
  const [newClass, setNewClass] = useState({
    title: '',
    description: '',
    courseId: '',
    sectionId: '',
    scheduledAt: '',
    duration: 60,
    maxParticipants: 350,
    isPasswordProtected: false,
    password: '',
    allowStudentMic: false,
    allowStudentCamera: false,
    allowChat: true,
    enableHandRaise: true,
    enableWhiteboard: false,
    waitingRoomEnabled: true
  });
  
  const [mergedClass, setMergedClass] = useState({
    title: '',
    description: '',
    courseId: '',
    sectionIds: [],
    scheduledAt: '',
    duration: 60,
    maxParticipants: 350,
    allowStudentMic: false,
    allowStudentCamera: false,
    allowChat: true,
    enableHandRaise: true,
    enableWhiteboard: false
  });

  useEffect(() => {
    loadData();
  }, [token]);

  const loadData = async () => {
    try {
      console.log('🔍 TeacherLiveClasses loadData called with token:', token ? 'EXISTS' : 'MISSING');
      setLoading(true);
      
      console.log('📡 Making API calls to enhanced live class endpoints...');
      const [classesResponse, sectionsResponse] = await Promise.all([
        enhancedLiveClassAPI.getTeacherLiveClasses(token),
        enhancedLiveClassAPI.getAvailableSections(token)
      ]);

      if (classesResponse.success) {
        setClasses(classesResponse.classes || []);
      }
      
      if (sectionsResponse.success) {
        setSections(sectionsResponse.sections || []);
        // Extract unique courses from sections
        const uniqueCourses = [];
        const courseIds = new Set();
        sectionsResponse.sections?.forEach(section => {
          if (section.courses) {
            section.courses.forEach(course => {
              if (!courseIds.has(course._id)) {
                courseIds.add(course._id);
                uniqueCourses.push(course);
              }
            });
          }
        });
        setCourses(uniqueCourses);
      }
    } catch (error) {
      console.error('❌ Error loading enhanced live class data:', error);
      console.error('❌ Error details:', error.response?.data || error.message);
      setError('Failed to load live classes data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClass = async () => {
    try {
      const response = await enhancedLiveClassAPI.createLiveClass(newClass, token);
      if (response.success) {
        setShowCreateDialog(false);
        setNewClass({
          title: '',
          description: '',
          courseId: '',
          sectionId: '',
          scheduledAt: '',
          duration: 60,
          maxParticipants: 350,
          isPasswordProtected: false,
          password: '',
          allowStudentMic: false,
          allowStudentCamera: false,
          allowChat: true,
          enableHandRaise: true,
          enableWhiteboard: false,
          waitingRoomEnabled: true
        });
        loadData();
      }
    } catch (error) {
      console.error('Error creating class:', error);
      setError('Failed to create live class');
    }
  };

  const handleCreateMergedClass = async () => {
    try {
      const response = await enhancedLiveClassAPI.scheduleMergedClass(mergedClass, token);
      if (response.success) {
        setShowMergedClassDialog(false);
        setMergedClass({
          title: '',
          description: '',
          courseId: '',
          sectionIds: [],
          scheduledAt: '',
          duration: 60,
          maxParticipants: 350,
          allowStudentMic: false,
          allowStudentCamera: false,
          allowChat: true,
          enableHandRaise: true,
          enableWhiteboard: false
        });
        loadData();
      }
    } catch (error) {
      console.error('Error creating merged class:', error);
      setError('Failed to create merged class');
    }
  };

  const startClass = async (classId) => {
    try {
      const response = await enhancedLiveClassAPI.startClass(classId, token);
      if (response.success) {
        navigate(`/live-class/room/${classId}`);
      }
    } catch (error) {
      console.error('Error starting class:', error);
      setError('Failed to start class');
    }
  };

  const joinClass = (liveClass) => {
    if (liveClass.accessToken) {
      navigate(`/live-class/join/${liveClass.accessToken}`);
    } else {
      navigate(`/live-class/room/${liveClass._id}`);
    }
  };

  const copyJoinLink = (accessToken) => {
    const joinUrl = `${window.location.origin}/live-class/join/${accessToken}`;
    navigator.clipboard.writeText(joinUrl);
    setError('Join link copied to clipboard!');
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

  const renderClassCard = (liveClass) => (
    <Card key={liveClass._id} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flex: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Typography variant="h6" component="h3" noWrap sx={{ flex: 1, mr: 1 }}>
            {liveClass.title}
          </Typography>
          <Chip
            icon={getStatusIcon(liveClass.status)}
            label={liveClass.status?.toUpperCase()}
            color={getStatusColor(liveClass.status)}
            size="small"
          />
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
          <Typography variant="body2">
            {liveClass.currentParticipants || 0}/{liveClass.maxParticipants} participants
          </Typography>
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
        <Box>
          {liveClass.status === 'live' ? (
            <Button
              variant="contained"
              color="success"
              startIcon={<VideoCallIcon />}
              onClick={() => joinClass(liveClass)}
              size="small"
            >
              Join Live
            </Button>
          ) : liveClass.status === 'scheduled' ? (
            <Button
              variant="contained"
              startIcon={<StartIcon />}
              onClick={() => startClass(liveClass._id)}
              size="small"
            >
              Start Class
            </Button>
          ) : (
            <Button
              variant="outlined"
              startIcon={<AnalyticsIcon />}
              onClick={() => navigate(`/teacher/live-classes/${liveClass._id}/analytics`)}
              size="small"
            >
              View Report
            </Button>
          )}
        </Box>

        <Box>
          {liveClass.accessToken && (
            <Tooltip title="Copy join link">
              <IconButton
                onClick={() => copyJoinLink(liveClass.accessToken)}
                size="small"
              >
                <LinkIcon />
              </IconButton>
            </Tooltip>
          )}
          
          <Tooltip title="Class settings">
            <IconButton
              onClick={() => navigate(`/teacher/live-classes/${liveClass._id}/settings`)}
              size="small"
            >
              <SettingsIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </CardActions>
    </Card>
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Live Classes
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage and conduct your live classes with enhanced features
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<GroupIcon />}
            onClick={() => setShowMergedClassDialog(true)}
          >
            Create Merged Class
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setShowCreateDialog(true)}
          >
            Schedule Class
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert 
          severity={error.includes('copied') ? 'success' : 'error'} 
          sx={{ mb: 3 }}
          onClose={() => setError('')}
        >
          {error}
        </Alert>
      )}

      {/* Classes Grid */}
      <Grid container spacing={3}>
        {classes.length === 0 ? (
          <Grid item xs={12}>
            <Card sx={{ p: 4, textAlign: 'center' }}>
              <VideoCallIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                No Live Classes Yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Start by scheduling your first live class session
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setShowCreateDialog(true)}
              >
                Schedule First Class
              </Button>
            </Card>
          </Grid>
        ) : (
          classes.map((liveClass) => (
            <Grid item xs={12} sm={6} lg={4} key={liveClass._id}>
              {renderClassCard(liveClass)}
            </Grid>
          ))
        )}
      </Grid>

      {/* Create Class Dialog */}
      <Dialog open={showCreateDialog} onClose={() => setShowCreateDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Schedule New Live Class</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Class Title"
                value={newClass.title}
                onChange={(e) => setNewClass({ ...newClass, title: e.target.value })}
                required
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={newClass.description}
                onChange={(e) => setNewClass({ ...newClass, description: e.target.value })}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Course</InputLabel>
                <Select
                  value={newClass.courseId}
                  onChange={(e) => setNewClass({ ...newClass, courseId: e.target.value })}
                  label="Course"
                >
                  {courses.map((course) => (
                    <MenuItem key={course._id} value={course._id}>
                      {course.title} ({course.courseCode})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Section</InputLabel>
                <Select
                  value={newClass.sectionId}
                  onChange={(e) => setNewClass({ ...newClass, sectionId: e.target.value })}
                  label="Section"
                >
                  {sections.map((section) => (
                    <MenuItem key={section._id} value={section._id}>
                      {section.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Scheduled Date & Time"
                type="datetime-local"
                value={newClass.scheduledAt}
                onChange={(e) => setNewClass({ ...newClass, scheduledAt: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Duration (minutes)"
                type="number"
                value={newClass.duration}
                onChange={(e) => setNewClass({ ...newClass, duration: parseInt(e.target.value) })}
                inputProps={{ min: 15, max: 180 }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Max Participants"
                type="number"
                value={newClass.maxParticipants}
                onChange={(e) => setNewClass({ ...newClass, maxParticipants: parseInt(e.target.value) })}
                inputProps={{ min: 10, max: 350 }}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Class Settings
              </Typography>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={newClass.allowStudentMic}
                    onChange={(e) => setNewClass({ ...newClass, allowStudentMic: e.target.checked })}
                  />
                }
                label="Allow Student Microphones"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={newClass.allowStudentCamera}
                    onChange={(e) => setNewClass({ ...newClass, allowStudentCamera: e.target.checked })}
                  />
                }
                label="Allow Student Cameras"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={newClass.allowChat}
                    onChange={(e) => setNewClass({ ...newClass, allowChat: e.target.checked })}
                  />
                }
                label="Enable Chat"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={newClass.enableHandRaise}
                    onChange={(e) => setNewClass({ ...newClass, enableHandRaise: e.target.checked })}
                  />
                }
                label="Enable Hand Raising"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={newClass.enableWhiteboard}
                    onChange={(e) => setNewClass({ ...newClass, enableWhiteboard: e.target.checked })}
                  />
                }
                label="Enable Whiteboard"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={newClass.waitingRoomEnabled}
                    onChange={(e) => setNewClass({ ...newClass, waitingRoomEnabled: e.target.checked })}
                  />
                }
                label="Enable Waiting Room"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateClass} 
            variant="contained"
            disabled={!newClass.title || !newClass.courseId || !newClass.sectionId || !newClass.scheduledAt}
          >
            Schedule Class
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Merged Class Dialog */}
      <Dialog open={showMergedClassDialog} onClose={() => setShowMergedClassDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Schedule Merged Class (Multiple Sections)
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Merged classes allow you to teach multiple sections together. Perfect for large lectures or combined sessions.
          </Alert>
          
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Class Title"
                value={mergedClass.title}
                onChange={(e) => setMergedClass({ ...mergedClass, title: e.target.value })}
                required
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={mergedClass.description}
                onChange={(e) => setMergedClass({ ...mergedClass, description: e.target.value })}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Course</InputLabel>
                <Select
                  value={mergedClass.courseId}
                  onChange={(e) => setMergedClass({ ...mergedClass, courseId: e.target.value })}
                  label="Course"
                >
                  {courses.map((course) => (
                    <MenuItem key={course._id} value={course._id}>
                      {course.title} ({course.courseCode})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Select Sections</InputLabel>
                <Select
                  multiple
                  value={mergedClass.sectionIds}
                  onChange={(e) => setMergedClass({ ...mergedClass, sectionIds: e.target.value })}
                  label="Select Sections"
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => {
                        const section = sections.find(s => s._id === value);
                        return (
                          <Chip key={value} label={section?.name || value} size="small" />
                        );
                      })}
                    </Box>
                  )}
                >
                  {sections.map((section) => (
                    <MenuItem key={section._id} value={section._id}>
                      <Checkbox checked={mergedClass.sectionIds.indexOf(section._id) > -1} />
                      <ListItemText primary={section.name} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Scheduled Date & Time"
                type="datetime-local"
                value={mergedClass.scheduledAt}
                onChange={(e) => setMergedClass({ ...mergedClass, scheduledAt: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Duration (minutes)"
                type="number"
                value={mergedClass.duration}
                onChange={(e) => setMergedClass({ ...mergedClass, duration: parseInt(e.target.value) })}
                inputProps={{ min: 15, max: 180 }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowMergedClassDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateMergedClass} 
            variant="contained"
            disabled={!mergedClass.title || !mergedClass.courseId || mergedClass.sectionIds.length === 0 || !mergedClass.scheduledAt}
          >
            Schedule Merged Class
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeacherLiveClasses;