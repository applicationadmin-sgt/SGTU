import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Chip,
  LinearProgress,
  IconButton,
  Paper
} from '@mui/material';
import {
  People as PeopleIcon,
  VideoCall as VideoIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  Videocam as VideocamIcon,
  VideocamOff as VideocamOffIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useUserRole } from '../contexts/UserRoleContext';
import enhancedLiveClassAPI from '../api/enhancedLiveClassApi';

const LiveClassMonitor = () => {
  const { classId } = useParams();
  const { token } = useUserRole();
  
  const [classData, setClassData] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadClassData();
    
    // Auto refresh every 30 seconds
    const interval = setInterval(loadClassData, 30000);
    return () => clearInterval(interval);
  }, [classId, token]);

  const loadClassData = async () => {
    try {
      const response = await enhancedLiveClassAPI.getClassAnalytics(classId, token);
      if (response.success) {
        setClassData(response.classData);
        setParticipants(response.participants || []);
      }
    } catch (error) {
      console.error('Error loading class data:', error);
      setError('Failed to load class data');
    } finally {
      setLoading(false);
    }
  };

  const getParticipantStatusColor = (status) => {
    switch (status) {
      case 'connected': return 'success';
      case 'connecting': return 'warning';
      case 'disconnected': return 'error';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Loading class monitor...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Live Class Monitor
          </Typography>
          <Typography variant="h6" color="text.secondary">
            {classData?.title || 'Unknown Class'}
          </Typography>
        </Box>
        <IconButton onClick={loadClassData} color="primary">
          <RefreshIcon />
        </IconButton>
      </Box>

      {/* Class Statistics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <PeopleIcon sx={{ mr: 2, fontSize: 40, color: 'primary.main' }} />
                <Box>
                  <Typography variant="h4">
                    {participants.length}
                  </Typography>
                  <Typography color="text.secondary">
                    Active Participants
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <VideoIcon sx={{ mr: 2, fontSize: 40, color: 'success.main' }} />
                <Box>
                  <Typography variant="h4">
                    {participants.filter(p => p.video).length}
                  </Typography>
                  <Typography color="text.secondary">
                    Video Enabled
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <MicIcon sx={{ mr: 2, fontSize: 40, color: 'warning.main' }} />
                <Box>
                  <Typography variant="h4">
                    {participants.filter(p => p.audio).length}
                  </Typography>
                  <Typography color="text.secondary">
                    Audio Enabled
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Capacity Usage
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={(participants.length / (classData?.maxParticipants || 100)) * 100}
                  sx={{ mb: 1, height: 8, borderRadius: 4 }}
                />
                <Typography variant="body2">
                  {participants.length}/{classData?.maxParticipants || 100}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Participants List */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Current Participants
        </Typography>
        
        {participants.length === 0 ? (
          <Typography color="text.secondary">
            No participants currently in the class
          </Typography>
        ) : (
          <List>
            {participants.map((participant) => (
              <ListItem key={participant.id} divider>
                <ListItemAvatar>
                  <Avatar>
                    {participant.name?.[0]?.toUpperCase() || 'U'}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={participant.name || 'Unknown User'}
                  secondary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      <Chip
                        label={participant.role || 'student'}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                      <Chip
                        label={participant.status || 'connected'}
                        size="small"
                        color={getParticipantStatusColor(participant.status)}
                      />
                    </Box>
                  }
                />
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {participant.audio ? (
                    <MicIcon color="success" />
                  ) : (
                    <MicOffIcon color="disabled" />
                  )}
                  {participant.video ? (
                    <VideocamIcon color="success" />
                  ) : (
                    <VideocamOffIcon color="disabled" />
                  )}
                </Box>
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  );
};

export default LiveClassMonitor;