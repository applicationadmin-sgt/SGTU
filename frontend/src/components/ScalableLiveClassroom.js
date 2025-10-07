/**
 * SGT LMS-Style Scalable Live Classroom Component
 * Optimized for 10,000+ concurrent students with enterprise features
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  IconButton,
  TextField,
  Badge,
  Avatar,
  Card,
  CardContent,
  Chip,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  VideocamOutlined,
  VideocamOffOutlined,
  MicOutlined,
  MicOffOutlined,
  ScreenShare,
  StopScreenShare,
  Chat,
  People,
  Poll,
  Quiz,
  Assignment,
  RecordVoiceOver,
  Settings,
  FullscreenExit,
  Fullscreen,
  VolumeUp,
  VolumeOff,
  CloudRecord,
  StopCircle,
  PlayArrow,
  Pause,
  FastForward,
  FastRewind,
  ExpandMore,
  Notifications,
  Help,
  Analytics,
  Group,
  School,
  LiveTv,
  Timeline,
  CheckCircle,
  Error as ErrorIcon,
  Warning,
  Info,
  Close,
  Send,
  AttachFile,
  EmojiEmotions,
  ThumbUp,
  ThumbDown,
  Star,
} from '@mui/icons-material';

import ScalableWebRTCManager from '../utils/ScalableWebRTCManager';

// Enhanced Chat Component for SGT LMS-like messaging
const EnhancedChat = ({ 
  messages, 
  onSendMessage, 
  currentUser, 
  isTeacher,
  participants 
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState('all');
  const [showEmoji, setShowEmoji] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      onSendMessage({
        text: newMessage,
        recipient: selectedRecipient,
        timestamp: Date.now(),
      });
      setNewMessage('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Chat Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chat /> Live Chat
          <Chip label={messages.length} size="small" color="primary" />
        </Typography>
        
        {isTeacher && (
          <TextField
            select
            size="small"
            value={selectedRecipient}
            onChange={(e) => setSelectedRecipient(e.target.value)}
            sx={{ mt: 1, minWidth: 120 }}
          >
            <MenuItem value="all">All Students</MenuItem>
            <MenuItem value="private">Private Message</MenuItem>
            {participants.map(p => (
              <MenuItem key={p.id} value={p.id}>
                {p.name} ({p.role})
              </MenuItem>
            ))}
          </TextField>
        )}
      </Box>

      {/* Messages List */}
      <Box sx={{ 
        flexGrow: 1, 
        overflow: 'auto', 
        p: 1,
        maxHeight: 'calc(100% - 140px)'
      }}>
        {messages.map((message, index) => (
          <Box
            key={index}
            sx={{
              mb: 1,
              p: 1,
              borderRadius: 1,
              backgroundColor: message.senderId === currentUser.id 
                ? 'primary.light' 
                : 'grey.100',
              alignSelf: message.senderId === currentUser.id ? 'flex-end' : 'flex-start',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" fontWeight="bold">
                {message.senderName}
                {message.senderRole === 'teacher' && (
                  <Chip label="Teacher" size="small" color="primary" sx={{ ml: 1 }} />
                )}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatTime(message.timestamp)}
              </Typography>
            </Box>
            <Typography variant="body2">{message.text}</Typography>
            
            {message.reactions && (
              <Box sx={{ mt: 0.5, display: 'flex', gap: 1 }}>
                {Object.entries(message.reactions).map(([reaction, count]) => (
                  <Chip
                    key={reaction}
                    label={`${reaction} ${count}`}
                    size="small"
                    variant="outlined"
                    clickable
                  />
                ))}
              </Box>
            )}
          </Box>
        ))}
        <div ref={messagesEndRef} />
      </Box>

      {/* Message Input */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
          <TextField
            fullWidth
            multiline
            maxRows={3}
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            size="small"
          />
          <IconButton onClick={() => setShowEmoji(!showEmoji)} color="primary">
            <EmojiEmotions />
          </IconButton>
          <IconButton color="primary">
            <AttachFile />
          </IconButton>
          <Button
            variant="contained"
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            endIcon={<Send />}
          >
            Send
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

// Participants Panel with SGT LMS-style features
const ParticipantsPanel = ({ 
  participants, 
  currentUser, 
  isTeacher, 
  onMuteUser, 
  onRemoveUser,
  onPromoteUser,
  attendanceData 
}) => {
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');

  const filteredParticipants = useMemo(() => {
    let filtered = participants;
    
    if (filter !== 'all') {
      filtered = participants.filter(p => p.role === filter);
    }

    return filtered.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'role') return a.role.localeCompare(b.role);
      if (sortBy === 'joinTime') return a.joinTime - b.joinTime;
      return 0;
    });
  }, [participants, filter, sortBy]);

  const getParticipantStatus = (participant) => {
    if (!participant.isConnected) return { color: 'error', text: 'Disconnected' };
    if (participant.isRaiseHand) return { color: 'warning', text: 'Hand Raised' };
    if (participant.isSpeaking) return { color: 'success', text: 'Speaking' };
    return { color: 'primary', text: 'Connected' };
  };

  return (
    <Box sx={{ height: '100%' }}>
      {/* Panel Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <People /> Participants
          <Chip label={participants.length} size="small" color="primary" />
        </Typography>
        
        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          <TextField
            select
            size="small"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            sx={{ minWidth: 100 }}
          >
            <MenuItem value="all">All ({participants.length})</MenuItem>
            <MenuItem value="teacher">Teachers</MenuItem>
            <MenuItem value="student">Students</MenuItem>
          </TextField>
          
          <TextField
            select
            size="small"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            sx={{ minWidth: 100 }}
          >
            <MenuItem value="name">Name</MenuItem>
            <MenuItem value="role">Role</MenuItem>
            <MenuItem value="joinTime">Join Time</MenuItem>
          </TextField>
        </Box>
      </Box>

      {/* Participants List */}
      <Box sx={{ overflow: 'auto', height: 'calc(100% - 120px)' }}>
        <List>
          {filteredParticipants.map((participant) => {
            const status = getParticipantStatus(participant);
            
            return (
              <ListItem
                key={participant.id}
                sx={{
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  '&:hover': { backgroundColor: 'action.hover' }
                }}
              >
                <ListItemIcon>
                  <Badge
                    overlap="circular"
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    badgeContent={
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          backgroundColor: `${status.color}.main`,
                          border: '2px solid white',
                        }}
                      />
                    }
                  >
                    <Avatar sx={{ width: 40, height: 40 }}>
                      {participant.name.charAt(0)}
                    </Avatar>
                  </Badge>
                </ListItemIcon>
                
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" fontWeight="medium">
                        {participant.name}
                      </Typography>
                      {participant.role === 'teacher' && (
                        <Chip label="Teacher" size="small" color="primary" />
                      )}
                      {participant.isRaiseHand && (
                        <Chip label="✋" size="small" color="warning" />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="caption" color={`${status.color}.main`}>
                        {status.text}
                      </Typography>
                      <Typography variant="caption" display="block">
                        Joined: {new Date(participant.joinTime).toLocaleTimeString()}
                      </Typography>
                    </Box>
                  }
                />

                {isTeacher && participant.id !== currentUser.id && (
                  <Box>
                    <IconButton
                      size="small"
                      onClick={() => onMuteUser(participant.id)}
                      color={participant.isMuted ? 'error' : 'default'}
                    >
                      {participant.isMuted ? <MicOffOutlined /> : <MicOutlined />}
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => onRemoveUser(participant.id)}
                      color="error"
                    >
                      <Close />
                    </IconButton>
                  </Box>
                )}
              </ListItem>
            );
          })}
        </List>
      </Box>
    </Box>
  );
};

// Live Poll Component
const LivePoll = ({ poll, onVote, onCreatePoll, isTeacher, currentUser }) => {
  const [newPollQuestion, setNewPollQuestion] = useState('');
  const [newPollOptions, setNewPollOptions] = useState(['', '']);
  const [showCreatePoll, setShowCreatePoll] = useState(false);

  const handleCreatePoll = () => {
    if (newPollQuestion.trim() && newPollOptions.every(opt => opt.trim())) {
      onCreatePoll({
        question: newPollQuestion,
        options: newPollOptions.filter(opt => opt.trim()),
        timestamp: Date.now(),
      });
      setNewPollQuestion('');
      setNewPollOptions(['', '']);
      setShowCreatePoll(false);
    }
  };

  const addOption = () => {
    setNewPollOptions([...newPollOptions, '']);
  };

  const removeOption = (index) => {
    setNewPollOptions(newPollOptions.filter((_, i) => i !== index));
  };

  const updateOption = (index, value) => {
    const updated = [...newPollOptions];
    updated[index] = value;
    setNewPollOptions(updated);
  };

  if (!poll && !isTeacher) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Poll sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
        <Typography variant="body2" color="text.secondary">
          No active poll
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Poll /> Live Poll
      </Typography>

      {poll && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {poll.question}
            </Typography>
            
            {poll.options.map((option, index) => {
              const votes = poll.votes?.[index] || 0;
              const totalVotes = Object.values(poll.votes || {}).reduce((a, b) => a + b, 0);
              const percentage = totalVotes > 0 ? (votes / totalVotes * 100) : 0;
              const hasVoted = poll.userVotes?.[currentUser.id] === index;

              return (
                <Box key={index} sx={{ mb: 1 }}>
                  <Button
                    fullWidth
                    variant={hasVoted ? 'contained' : 'outlined'}
                    onClick={() => onVote(index)}
                    disabled={poll.userVotes?.[currentUser.id] !== undefined}
                    sx={{ justifyContent: 'flex-start', mb: 1 }}
                  >
                    {option} {hasVoted && '✓'}
                  </Button>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={percentage}
                      sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                    />
                    <Typography variant="caption">
                      {votes} ({percentage.toFixed(1)}%)
                    </Typography>
                  </Box>
                </Box>
              );
            })}
            
            <Typography variant="caption" color="text.secondary">
              Total votes: {Object.values(poll.votes || {}).reduce((a, b) => a + b, 0)}
            </Typography>
          </CardContent>
        </Card>
      )}

      {isTeacher && (
        <>
          <Button
            fullWidth
            variant="outlined"
            onClick={() => setShowCreatePoll(!showCreatePoll)}
            startIcon={<Poll />}
          >
            Create New Poll
          </Button>

          {showCreatePoll && (
            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="Poll Question"
                value={newPollQuestion}
                onChange={(e) => setNewPollQuestion(e.target.value)}
                sx={{ mb: 2 }}
              />
              
              {newPollOptions.map((option, index) => (
                <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <TextField
                    fullWidth
                    label={`Option ${index + 1}`}
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                  />
                  {newPollOptions.length > 2 && (
                    <IconButton onClick={() => removeOption(index)} color="error">
                      <Close />
                    </IconButton>
                  )}
                </Box>
              ))}
              
              <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                <Button onClick={addOption} variant="outlined" size="small">
                  Add Option
                </Button>
                <Button
                  onClick={handleCreatePoll}
                  variant="contained"
                  disabled={!newPollQuestion.trim() || !newPollOptions.every(opt => opt.trim())}
                >
                  Create Poll
                </Button>
                <Button onClick={() => setShowCreatePoll(false)} size="small">
                  Cancel
                </Button>
              </Box>
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

// Main Scalable Live Classroom Component
const ScalableLiveClassroom = ({ 
  classId, 
  userId, 
  userRole, 
  token,
  onLeaveClass 
}) => {
  // Core state
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [error, setError] = useState(null);
  
  // Media state
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  // UI state
  const [rightPanelTab, setRightPanelTab] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [notification, setNotification] = useState(null);
  
  // Classroom data
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [currentPoll, setCurrentPoll] = useState(null);
  const [classStats, setClassStats] = useState({});
  const [attendanceData, setAttendanceData] = useState({});

  // Refs
  const webrtcManager = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRefs = useRef(new Map());

  // Initialize WebRTC Manager
  useEffect(() => {
    const initializeConnection = async () => {
      try {
        webrtcManager.current = new ScalableWebRTCManager();
        
        // Setup callbacks
        webrtcManager.current.onRemoteStream = handleRemoteStream;
        webrtcManager.current.onLocalStream = (stream) => {
          setLocalStream(stream);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        };
        webrtcManager.current.onUserJoined = handleUserJoined;
        webrtcManager.current.onUserLeft = handleUserLeft;
        webrtcManager.current.onConnectionStateChange = handleConnectionStateChange;
        webrtcManager.current.onError = handleError;

        await webrtcManager.current.connect({
          serverUrl: process.env.REACT_APP_SOCKET_URL || 'https://localhost:3001',
          classId,
          userId,
          userRole,
          token,
        });

        setIsConnected(true);
        setConnectionState('connected');

        showNotification('Connected to class successfully', 'success');
      } catch (error) {
        console.error('Failed to initialize connection:', error);
        handleError('Failed to connect to class', error);
      }
    };

    initializeConnection();

    return () => {
      if (webrtcManager.current) {
        webrtcManager.current.disconnect();
      }
    };
  }, [classId, userId, userRole, token]);

  // Handle remote stream
  const handleRemoteStream = useCallback((peerId, stream, kind) => {
    if (stream) {
      setRemoteStreams(prev => new Map(prev).set(peerId, stream));
      
      // Update video element
      const videoElement = remoteVideoRefs.current.get(peerId);
      if (videoElement && kind === 'video') {
        videoElement.srcObject = stream;
      }
    } else {
      setRemoteStreams(prev => {
        const updated = new Map(prev);
        updated.delete(peerId);
        return updated;
      });
    }
  }, []);

  // Handle user joined
  const handleUserJoined = useCallback((userData) => {
    setParticipants(prev => [...prev.filter(p => p.id !== userData.id), userData]);
    showNotification(`${userData.name} joined the class`, 'info');
  }, []);

  // Handle user left
  const handleUserLeft = useCallback((userData) => {
    setParticipants(prev => prev.filter(p => p.id !== userData.id));
    setRemoteStreams(prev => {
      const updated = new Map(prev);
      updated.delete(userData.id);
      return updated;
    });
    showNotification(`${userData.name} left the class`, 'info');
  }, []);

  // Handle connection state change
  const handleConnectionStateChange = useCallback((peerId, state) => {
    setConnectionState(state);
    
    if (state === 'failed' || state === 'disconnected') {
      setIsConnected(false);
      showNotification('Connection lost. Attempting to reconnect...', 'warning');
    }
  }, []);

  // Handle errors
  const handleError = useCallback((message, error) => {
    setError({ message, error });
    showNotification(message, 'error');
  }, []);

  // Show notification
  const showNotification = useCallback((message, severity = 'info') => {
    setNotification({ message, severity });
  }, []);

  // Toggle video
  const handleToggleVideo = async () => {
    try {
      const enabled = await webrtcManager.current?.toggleVideo();
      setIsVideoEnabled(enabled);
      showNotification(enabled ? 'Camera turned on' : 'Camera turned off', 'info');
    } catch (error) {
      handleError('Failed to toggle video', error);
    }
  };

  // Toggle audio
  const handleToggleAudio = async () => {
    try {
      const enabled = await webrtcManager.current?.toggleAudio();
      setIsAudioEnabled(enabled);
      showNotification(enabled ? 'Microphone turned on' : 'Microphone turned off', 'info');
    } catch (error) {
      handleError('Failed to toggle audio', error);
    }
  };

  // Toggle screen share
  const handleToggleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        await webrtcManager.current?.stopScreenShare();
        setIsScreenSharing(false);
        showNotification('Screen sharing stopped', 'info');
      } else {
        await webrtcManager.current?.startScreenShare();
        setIsScreenSharing(true);
        showNotification('Screen sharing started', 'info');
      }
    } catch (error) {
      handleError('Failed to toggle screen share', error);
    }
  };

  // Send chat message
  const handleSendMessage = useCallback((messageData) => {
    // Implementation for sending messages
    const message = {
      id: Date.now(),
      senderId: userId,
      senderName: 'Current User', // Get from user data
      senderRole: userRole,
      text: messageData.text,
      timestamp: messageData.timestamp,
      recipient: messageData.recipient,
    };
    
    setMessages(prev => [...prev, message]);
    
    // Send via socket
    // webrtcManager.current?.socket?.emit('chatMessage', message);
  }, [userId, userRole]);

  // Vote on poll
  const handleVote = useCallback((optionIndex) => {
    if (!currentPoll || currentPoll.userVotes?.[userId] !== undefined) return;
    
    // Implementation for voting
    const updatedPoll = {
      ...currentPoll,
      votes: {
        ...currentPoll.votes,
        [optionIndex]: (currentPoll.votes?.[optionIndex] || 0) + 1,
      },
      userVotes: {
        ...currentPoll.userVotes,
        [userId]: optionIndex,
      },
    };
    
    setCurrentPoll(updatedPoll);
    showNotification('Vote submitted successfully', 'success');
  }, [currentPoll, userId]);

  // Create poll (teacher only)
  const handleCreatePoll = useCallback((pollData) => {
    const poll = {
      ...pollData,
      id: Date.now(),
      createdBy: userId,
      votes: {},
      userVotes: {},
    };
    
    setCurrentPoll(poll);
    showNotification('Poll created successfully', 'success');
  }, [userId]);

  // Mute user (teacher only)
  const handleMuteUser = useCallback((participantId) => {
    // Implementation for muting users
    setParticipants(prev => 
      prev.map(p => 
        p.id === participantId 
          ? { ...p, isMuted: !p.isMuted }
          : p
      )
    );
  }, []);

  // Remove user (teacher only)
  const handleRemoveUser = useCallback((participantId) => {
    // Implementation for removing users
    setParticipants(prev => prev.filter(p => p.id !== participantId));
    showNotification('User removed from class', 'info');
  }, []);

  // Toggle fullscreen
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Get connection stats
  const connectionStats = webrtcManager.current?.getStats() || {};

  // Main render
  return (
    <Box sx={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: 'grey.50'
    }}>
      {/* Header */}
      <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <LiveTv color="primary" />
          <Typography variant="h6">Live Classroom</Typography>
          <Chip 
            label={connectionState} 
            color={isConnected ? 'success' : 'error'} 
            size="small" 
          />
          <Chip 
            label={`${participants.length} participants`}
            variant="outlined"
            size="small"
          />
          {isRecording && (
            <Chip 
              label="Recording" 
              color="error" 
              size="small"
              icon={<CloudRecord />}
            />
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Connection quality indicator */}
          <Tooltip title={`Quality: ${connectionStats.currentQuality || 'Unknown'}`}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'success.main' }} />
              <Typography variant="caption">
                {Math.round(connectionStats.roundTripTime || 0)}ms
              </Typography>
            </Box>
          </Tooltip>

          <IconButton onClick={() => setShowSettings(true)}>
            <Settings />
          </IconButton>
          
          <IconButton onClick={handleToggleFullscreen}>
            {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
          </IconButton>
          
          <Button 
            variant="outlined" 
            color="error" 
            onClick={onLeaveClass}
            startIcon={<Close />}
          >
            Leave Class
          </Button>
        </Box>
      </Paper>

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Video Area */}
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: 1 }}>
          {/* Main Video (Teacher or Screen Share) */}
          <Paper sx={{ 
            flexGrow: 1, 
            mb: 1, 
            position: 'relative',
            minHeight: '400px',
            backgroundColor: 'black',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {remoteStreams.size > 0 ? (
              Array.from(remoteStreams.entries()).map(([peerId, stream]) => (
                <video
                  key={peerId}
                  ref={el => {
                    if (el) {
                      remoteVideoRefs.current.set(peerId, el);
                      el.srcObject = stream;
                    }
                  }}
                  autoPlay
                  playsInline
                  muted={false}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain'
                  }}
                />
              ))
            ) : (
              <Box sx={{ textAlign: 'center', color: 'white' }}>
                <School sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
                <Typography variant="h6" sx={{ opacity: 0.7 }}>
                  Waiting for teacher to start...
                </Typography>
              </Box>
            )}

            {/* Local video overlay */}
            {(userRole === 'teacher' || localStream) && (
              <Box sx={{
                position: 'absolute',
                bottom: 16,
                right: 16,
                width: 200,
                height: 150,
                border: '2px solid white',
                borderRadius: 1,
                overflow: 'hidden',
                backgroundColor: 'black'
              }}>
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
              </Box>
            )}

            {/* Controls overlay */}
            <Box sx={{
              position: 'absolute',
              bottom: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: 1,
              backgroundColor: 'rgba(0,0,0,0.7)',
              borderRadius: 2,
              p: 1
            }}>
              {userRole === 'teacher' && (
                <>
                  <IconButton
                    onClick={handleToggleVideo}
                    color={isVideoEnabled ? 'primary' : 'error'}
                    sx={{ color: 'white' }}
                  >
                    {isVideoEnabled ? <VideocamOutlined /> : <VideocamOffOutlined />}
                  </IconButton>

                  <IconButton
                    onClick={handleToggleAudio}
                    color={isAudioEnabled ? 'primary' : 'error'}
                    sx={{ color: 'white' }}
                  >
                    {isAudioEnabled ? <MicOutlined /> : <MicOffOutlined />}
                  </IconButton>

                  <IconButton
                    onClick={handleToggleScreenShare}
                    color={isScreenSharing ? 'primary' : 'default'}
                    sx={{ color: 'white' }}
                  >
                    {isScreenSharing ? <StopScreenShare /> : <ScreenShare />}
                  </IconButton>

                  <IconButton
                    onClick={() => setIsRecording(!isRecording)}
                    color={isRecording ? 'error' : 'default'}
                    sx={{ color: 'white' }}
                  >
                    {isRecording ? <StopCircle /> : <CloudRecord />}
                  </IconButton>
                </>
              )}

              <IconButton sx={{ color: 'white' }}>
                <VolumeUp />
              </IconButton>
            </Box>
          </Paper>

          {/* Student Grid (if multiple students visible) */}
          {participants.length > 1 && (
            <Paper sx={{ height: 120, p: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Participants ({participants.length})
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, overflow: 'auto' }}>
                {participants.slice(0, 10).map((participant) => (
                  <Box
                    key={participant.id}
                    sx={{
                      minWidth: 80,
                      height: 60,
                      borderRadius: 1,
                      backgroundColor: 'grey.200',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative'
                    }}
                  >
                    <Avatar sx={{ width: 32, height: 32 }}>
                      {participant.name?.charAt(0)}
                    </Avatar>
                    <Typography
                      variant="caption"
                      sx={{
                        position: 'absolute',
                        bottom: 2,
                        left: 4,
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        color: 'white',
                        px: 0.5,
                        borderRadius: 0.5,
                        fontSize: '0.7rem'
                      }}
                    >
                      {participant.name?.split(' ')[0]}
                    </Typography>
                  </Box>
                ))}
                {participants.length > 10 && (
                  <Box sx={{
                    minWidth: 80,
                    height: 60,
                    borderRadius: 1,
                    backgroundColor: 'grey.300',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Typography variant="caption">
                      +{participants.length - 10}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Paper>
          )}
        </Box>

        {/* Right Panel */}
        <Paper sx={{ width: 350, display: 'flex', flexDirection: 'column' }}>
          <Tabs
            value={rightPanelTab}
            onChange={(e, newValue) => setRightPanelTab(newValue)}
            variant="fullWidth"
          >
            <Tab icon={<Chat />} label="Chat" />
            <Tab icon={<People />} label="People" />
            <Tab icon={<Poll />} label="Poll" />
            <Tab icon={<Analytics />} label="Stats" />
          </Tabs>

          <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
            {rightPanelTab === 0 && (
              <EnhancedChat
                messages={messages}
                onSendMessage={handleSendMessage}
                currentUser={{ id: userId, role: userRole }}
                isTeacher={userRole === 'teacher'}
                participants={participants}
              />
            )}

            {rightPanelTab === 1 && (
              <ParticipantsPanel
                participants={participants}
                currentUser={{ id: userId, role: userRole }}
                isTeacher={userRole === 'teacher'}
                onMuteUser={handleMuteUser}
                onRemoveUser={handleRemoveUser}
                attendanceData={attendanceData}
              />
            )}

            {rightPanelTab === 2 && (
              <LivePoll
                poll={currentPoll}
                onVote={handleVote}
                onCreatePoll={handleCreatePoll}
                isTeacher={userRole === 'teacher'}
                currentUser={{ id: userId, role: userRole }}
              />
            )}

            {rightPanelTab === 3 && (
              <Box sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Class Statistics
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="Connection Quality"
                      secondary={connectionStats.currentQuality || 'Unknown'}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Round Trip Time"
                      secondary={`${Math.round(connectionStats.roundTripTime || 0)}ms`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Bytes Received"
                      secondary={`${Math.round((connectionStats.bytesReceived || 0) / 1024)}KB`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Active Streams"
                      secondary={`${connectionStats.consumers || 0} consumers`}
                    />
                  </ListItem>
                </List>
              </Box>
            )}
          </Box>
        </Paper>
      </Box>

      {/* Error Display */}
      {error && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => setError(null)}>
              Dismiss
            </Button>
          }
          sx={{ m: 2 }}
        >
          {error.message}
        </Alert>
      )}

      {/* Notification Snackbar */}
      <Snackbar
        open={!!notification}
        autoHideDuration={4000}
        onClose={() => setNotification(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {notification && (
          <Alert
            onClose={() => setNotification(null)}
            severity={notification.severity}
          >
            {notification.message}
          </Alert>
        )}
      </Snackbar>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onClose={() => setShowSettings(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Settings</DialogTitle>
        <DialogContent>
          <List>
            <ListItem>
              <ListItemText primary="Adaptive Quality" />
              <Switch defaultChecked />
            </ListItem>
            <ListItem>
              <ListItemText primary="Auto-join Audio" />
              <Switch defaultChecked />
            </ListItem>
            <ListItem>
              <ListItemText primary="Show Participant Names" />
              <Switch defaultChecked />
            </ListItem>
            <ListItem>
              <ListItemText primary="Enable Notifications" />
              <Switch defaultChecked />
            </ListItem>
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSettings(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ScalableLiveClassroom;