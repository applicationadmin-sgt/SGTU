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
  Alert,
  Badge,
  Tooltip,
  CircularProgress,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider
} from '@mui/material';
import {
  VideoCall as VideoCallIcon,
  People as PeopleIcon,
  Schedule as ScheduleIcon,
  AccessTime as TimeIcon,
  CheckCircle as LiveIcon,
  EventAvailable as ScheduledIcon,
  School as SchoolIcon,
  Group as GroupIcon,
  ExitToApp as JoinIcon,
  Link as LinkIcon,
  Info as InfoIcon,
  Lock as LockIcon,
  LockOpen as UnlockIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '../../contexts/UserRoleContext';
import enhancedLiveClassAPI from '../../api/enhancedLiveClassApi';

const StudentLiveClasses = () => {
  const navigate = useNavigate();
  const { user, token } = useUserRole();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [joinToken, setJoinToken] = useState('');
  const [joinPassword, setJoinPassword] = useState('');

  useEffect(() => {
    loadLiveClasses();
  }, [token]);

  const loadLiveClasses = async () => {
    try {
      setLoading(true);
      const response = await enhancedLiveClassAPI.getStudentLiveClasses(token);
      if (response.success) {
        setClasses(response.classes || []);
      }
    } catch (error) {
      console.error('Error loading live classes:', error);
      setError('Failed to load live classes');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClass = async (liveClass) => {
    if (liveClass.status !== 'live') {
      setError('This class is not currently live');
      return;
    }

    try {
      if (liveClass.isPasswordProtected) {
        setSelectedClass(liveClass);
        setShowJoinDialog(true);
      } else {
        // Direct join for non-password protected classes
        const response = await enhancedLiveClassAPI.joinClass(liveClass._id, token);
        if (response.success) {
          navigate(`/live-class/room/${liveClass._id}`);
        }
      }
    } catch (error) {
      console.error('Error joining class:', error);
      setError('Failed to join class');
    }
  };

  const handleJoinWithCredentials = async () => {
    try {
      const response = await enhancedLiveClassAPI.joinClass(
        selectedClass._id, 
        token, 
        joinPassword
      );
      
      if (response.success) {
        setShowJoinDialog(false);
        setJoinPassword('');
        navigate(`/live-class/room/${selectedClass._id}`);
      }
    } catch (error) {
      console.error('Error joining class with credentials:', error);
      setError('Invalid password or access denied');
    }
  };

  const handleJoinByToken = async () => {
    if (!joinToken.trim()) {
      setError('Please enter a valid join token');
      return;
    }

    try {
      const response = await enhancedLiveClassAPI.joinByToken(joinToken.trim(), token);
      if (response.success) {
        navigate(`/live-class/join/${joinToken.trim()}`);
      }
    } catch (error) {
      console.error('Error joining by token:', error);
      setError('Invalid join token or class not available');
    }
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

  const isClassStartingSoon = (scheduledAt) => {
    const now = new Date();
    const classTime = new Date(scheduledAt);
    const timeDiff = classTime.getTime() - now.getTime();
    const minutesDiff = timeDiff / (1000 * 60);
    return minutesDiff > 0 && minutesDiff <= 15;
  };

  const renderClassCard = (liveClass) => {
    const isLive = liveClass.status === 'live';
    const isScheduled = liveClass.status === 'scheduled';
    const startingSoon = isScheduled && isClassStartingSoon(liveClass.scheduledAt);

    return (
      <Card 
        key={liveClass._id} 
        sx={{ 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          border: isLive ? 2 : 1,
          borderColor: isLive ? 'success.main' : 'divider',
          position: 'relative'
        }}
      >
        {isLive && (
          <Box
            sx={{
              position: 'absolute',
              top: -1,
              left: -1,
              right: -1,
              height: 4,
              background: 'linear-gradient(90deg, #f44336, #ff9800, #4caf50, #2196f3, #9c27b0)',
              backgroundSize: '200% 100%',
              animation: 'gradientShift 2s ease-in-out infinite alternate'
            }}
          />
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
              {liveClass.isPasswordProtected && (
                <Tooltip title="Password Protected">
                  <LockIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                </Tooltip>
              )}
            </Box>
          </Box>

          {startingSoon && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="caption">
                Starting soon! Be ready to join.
              </Typography>
            </Alert>
          )}

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

          {liveClass.teacher && (
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Avatar
                sx={{ width: 20, height: 20, mr: 1, fontSize: 12 }}
                src={liveClass.teacher.profilePicture}
              >
                {liveClass.teacher.name?.[0]?.toUpperCase()}
              </Avatar>
              <Typography variant="body2" color="text.secondary">
                {liveClass.teacher.name}
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
          {isLive ? (
            <Button
              variant="contained"
              color="success"
              startIcon={<VideoCallIcon />}
              onClick={() => handleJoinClass(liveClass)}
              sx={{ 
                minWidth: 120,
                background: isLive ? 'linear-gradient(45deg, #4caf50, #66bb6a)' : undefined
              }}
            >
              Join Live
            </Button>
          ) : isScheduled ? (
            <Button
              variant="outlined"
              startIcon={<ScheduleIcon />}
              disabled
              sx={{ minWidth: 120 }}
            >
              Scheduled
            </Button>
          ) : (
            <Button
              variant="outlined"
              startIcon={<InfoIcon />}
              disabled
              sx={{ minWidth: 120 }}
            >
              {liveClass.status === 'completed' ? 'Completed' : 'Not Available'}
            </Button>
          )}

          <Box>
            <Tooltip title="Class information">
              <IconButton
                onClick={() => navigate(`/student/live-classes/${liveClass._id}/info`)}
                size="small"
              >
                <InfoIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </CardActions>
      </Card>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Separate live and scheduled classes
  const liveClasses = classes.filter(c => c.status === 'live');
  const scheduledClasses = classes.filter(c => c.status === 'scheduled');
  const completedClasses = classes.filter(c => c.status === 'completed');

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Live Classes
            {liveClasses.length > 0 && (
              <Badge badgeContent={liveClasses.length} color="success" sx={{ ml: 2 }}>
                <LiveIcon color="success" />
              </Badge>
            )}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Join your live classes and access recorded sessions
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            size="small"
            placeholder="Enter join token"
            value={joinToken}
            onChange={(e) => setJoinToken(e.target.value)}
            sx={{ width: 200 }}
          />
          <Button
            variant="outlined"
            startIcon={<JoinIcon />}
            onClick={handleJoinByToken}
            disabled={!joinToken.trim()}
          >
            Quick Join
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

      {/* Live Classes Section */}
      {liveClasses.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', color: 'success.main' }}>
            <LiveIcon sx={{ mr: 1 }} />
            Live Now ({liveClasses.length})
          </Typography>
          <Grid container spacing={3}>
            {liveClasses.map((liveClass) => (
              <Grid item xs={12} sm={6} lg={4} key={liveClass._id}>
                {renderClassCard(liveClass)}
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Scheduled Classes Section */}
      {scheduledClasses.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', color: 'info.main' }}>
            <ScheduledIcon sx={{ mr: 1 }} />
            Upcoming Classes ({scheduledClasses.length})
          </Typography>
          <Grid container spacing={3}>
            {scheduledClasses.map((liveClass) => (
              <Grid item xs={12} sm={6} lg={4} key={liveClass._id}>
                {renderClassCard(liveClass)}
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Recent Completed Classes */}
      {completedClasses.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <ScheduleIcon sx={{ mr: 1 }} />
            Recent Classes ({completedClasses.slice(0, 6).length})
          </Typography>
          <Grid container spacing={3}>
            {completedClasses.slice(0, 6).map((liveClass) => (
              <Grid item xs={12} sm={6} lg={4} key={liveClass._id}>
                {renderClassCard(liveClass)}
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* No Classes State */}
      {classes.length === 0 && (
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <VideoCallIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No Live Classes Available
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Your teachers haven't scheduled any live classes yet. Check back later or use a join token if provided.
          </Typography>
        </Card>
      )}

      {/* Join Class Dialog */}
      <Dialog open={showJoinDialog} onClose={() => setShowJoinDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Join Protected Class
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            This class requires a password to join. Please enter the password provided by your teacher.
          </Typography>
          
          {selectedClass && (
            <Box sx={{ mb: 3, p: 2, bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                {selectedClass.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedClass.course?.title} - {selectedClass.section?.name}
              </Typography>
            </Box>
          )}

          <TextField
            fullWidth
            type="password"
            label="Class Password"
            value={joinPassword}
            onChange={(e) => setJoinPassword(e.target.value)}
            placeholder="Enter password"
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowJoinDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleJoinWithCredentials} 
            variant="contained"
            disabled={!joinPassword.trim()}
          >
            Join Class
          </Button>
        </DialogActions>
      </Dialog>

      {/* Styles for live class animation */}
      <style>{`
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }
      `}</style>
    </Box>
  );
};

export default StudentLiveClasses;