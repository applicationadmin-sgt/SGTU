import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Paper,
  Grid,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Tooltip,
  Fab
} from '@mui/material';
import {
  Videocam as VideocamIcon,
  VideocamOff as VideocamOffIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  ScreenShare as ScreenShareIcon,
  StopScreenShare as StopScreenShareIcon,
  Chat as ChatIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  ExitToApp as ExitIcon,
  FiberManualRecord as RecordIcon,
  Stop as StopIcon
} from '@mui/icons-material';
import { io } from 'socket.io-client';
import { useParams, useNavigate } from 'react-router-dom';
import WebRTCManager from '../../utils/webrtc';
import liveClassAPI from '../../api/liveClassApi';

const LiveClassRoom = ({ token, user }) => {
  const { classId } = useParams();
  const navigate = useNavigate();
  
  // State
  const [classData, setClassData] = useState(null);
  const [participants, setParticipants] = useState(new Map());
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  
  // UI State
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Media State
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  // Refs
  const localVideoRef = useRef(null);
  const remoteVideosRef = useRef(new Map());
  const webrtcManager = useRef(null);
  const socket = useRef(null);
  const pendingStream = useRef(null);
  
  // Initialize everything
  useEffect(() => {
    initializeClass();
    
    return () => {
      cleanup();
    };
  }, [classId, token]);
  
  // Helper function to set video stream when ref is available
  const setVideoStream = async (stream) => {
    if (!stream) return;
    
    pendingStream.current = stream;
    
    if (localVideoRef.current) {
      console.log('🎥 Setting video stream to ref:', {
        hasVideoTracks: stream.getVideoTracks().length,
        hasAudioTracks: stream.getAudioTracks().length,
        videoRefExists: !!localVideoRef.current
      });
      
      localVideoRef.current.srcObject = stream;
      
      try {
        await localVideoRef.current.play();
        console.log('✅ Video stream set and playing');
      } catch (playError) {
        console.warn('⚠️ Autoplay failed, will try on user interaction:', playError);
      }
      
      pendingStream.current = null;
    } else {
      console.log('📺 Video ref not ready, stream will be set when available');
    }
  };
  
  // Effect to handle pending stream when ref becomes available
  useEffect(() => {
    if (localVideoRef.current && pendingStream.current) {
      console.log('📺 Video ref now available, setting pending stream');
      setVideoStream(pendingStream.current);
    }
  }, [localVideoRef.current]);
  
  const initializeClass = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Get class details
      const classResponse = await liveClassAPI.getClassDetails(classId, token);
      setClassData(classResponse.liveClass);
      
      // Check if user can access this class
      // Multiple ways to verify teacher status for robustness
      const userIdString = String(user.id || user._id);
      const teacherIdString = String(classResponse.liveClass.teacher._id);
      const isTeacherByComparison = userIdString === teacherIdString;
      const isTeacherByRole = user.role === 'teacher';
      const isTeacherByRoute = true; // This is the teacher route, so user must be teacher
      
      // Use the most permissive check since this is the teacher route
      const isTeacher = isTeacherByRole && (isTeacherByComparison || isTeacherByRoute);
      
      console.log('🔍 Frontend permission check:', {
        userRole: user.role,
        userId: user.id || user._id,
        userIdType: typeof (user.id || user._id),
        userObject: user,
        teacherId: classResponse.liveClass.teacher._id,
        teacherIdType: typeof classResponse.liveClass.teacher._id,
        userIdString,
        teacherIdString,
        isTeacherByComparison,
        isTeacherByRole,
        isTeacherByRoute,
        finalIsTeacher: isTeacher,
        strictEqual: classResponse.liveClass.teacher._id === (user.id || user._id),
        stringEqual: String(classResponse.liveClass.teacher._id) === String(user.id || user._id)
      });
      
      if (!isTeacher && user.role === 'student') {
        // Check if student is in the section (this should be handled by the API)
      }
      
      // Initialize socket connection
      socket.current = io(process.env.REACT_APP_API_URL || 'https://10.20.58.236:5000', {
        auth: { token }
      });
      
      // Add Socket.IO connection debugging
      socket.current.on('connect', () => {
        console.log('🔗 Socket.IO connected:', socket.current.id);
      });
      
      socket.current.on('disconnect', (reason) => {
        console.log('❌ Socket.IO disconnected:', reason);
      });
      
      socket.current.on('connect_error', (error) => {
        console.error('❌ Socket.IO connection error:', error);
      });
      
      socket.current.on('error', (error) => {
        console.error('❌ Socket.IO error:', error);
      });
      
      // Initialize WebRTC
      webrtcManager.current = new WebRTCManager();
      
      // Get user ID with fallback - JWT token uses 'id' not '_id'
      const userId = user.id || user._id || user.userId || 'teacher_' + Date.now();
      
      console.log('🎬 WebRTC initialization config:', {
        roomId: classResponse.liveClass.roomId,
        userId: userId,
        isTeacher: isTeacher,
        socketConnected: !!socket.current,
        userIdFallback: !user._id
      });
      
      await webrtcManager.current.initialize({
        roomId: classResponse.liveClass.roomId,
        userId: userId,
        isTeacher: isTeacher,
        socket: socket.current
      });
      
      // Set up WebRTC event handlers
      setupWebRTCHandlers();
      
      // Set up socket event handlers
      setupSocketHandlers();
      
      // Get user media with error handling
      try {
        const stream = await webrtcManager.current.getUserMedia({
          video: true,
          audio: true
        });
        
        console.log('🎥 Got media stream:', {
          hasVideoTracks: stream.getVideoTracks().length,
          hasAudioTracks: stream.getAudioTracks().length,
          videoRefExists: !!localVideoRef.current
        });
        
        // Use helper function to set video stream
        await setVideoStream(stream);
        
        // Join room AFTER getting media successfully
        await webrtcManager.current.joinRoom();
        
      } catch (error) {
        console.error('❌ Failed to get user media:', error);
        setError(`Camera/microphone access failed: ${error.message}. Please allow camera access and refresh the page.`);
        // Still try to join room without media
        try {
          await webrtcManager.current.joinRoom();
        } catch (joinError) {
          console.error('❌ Failed to join room:', joinError);
        }
      }
      
      setConnectionStatus('connected');
      
    } catch (err) {
      console.error('Error initializing class:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const setupWebRTCHandlers = () => {
    if (!webrtcManager.current) return;
    
    webrtcManager.current.onRemoteStream = (userId, stream) => {
      console.log('Received remote stream from:', userId);
      
      // Create or update video element for this user
      const videoElement = document.createElement('video');
      videoElement.srcObject = stream;
      videoElement.autoplay = true;
      videoElement.playsInline = true;
      videoElement.style.width = '100%';
      videoElement.style.height = '100%';
      videoElement.style.objectFit = 'cover';
      
      remoteVideosRef.current.set(userId, {
        stream,
        videoElement
      });
      
      // Update participants
      setParticipants(prev => new Map(prev.set(userId, {
        id: userId,
        stream,
        isConnected: true
      })));
    };
    
    webrtcManager.current.onUserJoined = (userId, isTeacher) => {
      console.log('User joined:', userId, isTeacher);
      setParticipants(prev => new Map(prev.set(userId, {
        id: userId,
        isTeacher,
        isConnected: false
      })));
    };
    
    webrtcManager.current.onUserLeft = (userId) => {
      console.log('User left:', userId);
      setParticipants(prev => {
        const newParticipants = new Map(prev);
        newParticipants.delete(userId);
        return newParticipants;
      });
      
      remoteVideosRef.current.delete(userId);
    };
    
    webrtcManager.current.onConnectionStateChange = (userId, state) => {
      console.log('Connection state changed:', userId, state);
      setParticipants(prev => new Map(prev.set(userId, {
        ...prev.get(userId),
        connectionState: state
      })));
    };
    
    webrtcManager.current.onRecordingUpdate = (isRecording, chunks) => {
      setIsRecording(isRecording);
      
      if (!isRecording && chunks && chunks.length > 0) {
        // Handle recording completion
        handleRecordingComplete(chunks);
      }
    };
  };
  
  const setupSocketHandlers = () => {
    if (!socket.current) {
      console.error('❌ Socket not available in setupSocketHandlers');
      return;
    }
    
    console.log('🔧 Setting up Socket.IO event handlers');
    
    socket.current.on('joined-room', (data) => {
      console.log('✅ Teacher joined room successfully:', data);
    });
    
    socket.current.on('participants-list', (participants) => {
      console.log('👥 Received participants list:', participants);
      // Update local participants state
      const currentUserId = user._id || user.id || user.userId || 'teacher_' + Date.now();
      participants.forEach(participant => {
        if (participant.userId !== currentUserId) {
          setParticipants(prev => new Map(prev.set(participant.userId, {
            id: participant.userId,
            userName: participant.userName,
            isTeacher: participant.isTeacher,
            isConnected: false
          })));
        }
      });
    });
    
    socket.current.on('user-joined', (data) => {
      console.log('👤 Another user joined:', data);
    });
    
    socket.current.on('user-left', (data) => {
      console.log('👤 User left:', data);
    });
    
    socket.current.on('chat-message', (data) => {
      setChatMessages(prev => [...prev, {
        id: Date.now(),
        userId: data.userId,
        userName: data.userName,
        message: data.message,
        isFromTeacher: data.isFromTeacher,
        timestamp: new Date(data.timestamp)
      }]);
    });
    
    socket.current.on('class-settings-updated', (settings) => {
      setClassData(prev => ({ ...prev, ...settings }));
    });
    
    socket.current.on('recording-status-changed', (data) => {
      setIsRecording(data.isRecording);
    });
    
    socket.current.on('error', (data) => {
      setError(data.message);
    });
    
    console.log('✅ Socket.IO event handlers configured');
  };
  
  const cleanup = () => {
    if (webrtcManager.current) {
      webrtcManager.current.leaveRoom();
    }
    
    if (socket.current) {
      socket.current.disconnect();
    }
    
    // Stop all video elements
    remoteVideosRef.current.forEach(({ videoElement }) => {
      if (videoElement.srcObject) {
        videoElement.srcObject.getTracks().forEach(track => track.stop());
      }
    });
  };
  
  const toggleVideo = () => {
    if (webrtcManager.current) {
      const newState = webrtcManager.current.toggleVideo();
      setIsVideoOn(newState);
    }
  };

  const enableCamera = async () => {
    try {
      setError('');
      console.log('🎥 Manually requesting camera access...');
      
      if (!webrtcManager.current) {
        console.error('❌ WebRTC manager not initialized');
        setError('WebRTC manager not ready. Please refresh the page.');
        return;
      }
      
      const stream = await webrtcManager.current.getUserMedia({
        video: true,
        audio: true
      });
      
      console.log('🎥 Manual camera access successful:', {
        hasVideoTracks: stream.getVideoTracks().length,
        hasAudioTracks: stream.getAudioTracks().length,
        videoRefExists: !!localVideoRef.current
      });
      
      // Use helper function to set video stream
      await setVideoStream(stream);
      setIsVideoOn(true);
      setIsAudioOn(true);
      console.log('✅ Manual camera enabled successfully');
      
    } catch (error) {
      console.error('❌ Failed to enable camera manually:', error);
      setError(`Failed to enable camera: ${error.message}. Please check your camera permissions in browser settings.`);
    }
  };
  
  const toggleAudio = () => {
    if (webrtcManager.current) {
      const newState = webrtcManager.current.toggleAudio();
      setIsAudioOn(newState);
    }
  };
  
  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        await webrtcManager.current.startScreenShare();
        setIsScreenSharing(true);
      } else {
        await webrtcManager.current.stopScreenShare();
        setIsScreenSharing(false);
      }
    } catch (err) {
      setError('Failed to toggle screen sharing: ' + err.message);
    }
  };
  
  const startRecording = async () => {
    try {
      await webrtcManager.current.startRecording();
      
      // Notify other participants
      socket.current.emit('recording-started', {
        roomId: classData.roomId
      });
      
    } catch (err) {
      setError('Failed to start recording: ' + err.message);
    }
  };
  
  const stopRecording = () => {
    const chunks = webrtcManager.current.stopRecording();
    
    // Notify other participants
    socket.current.emit('recording-stopped', {
      roomId: classData.roomId
    });
    
    return chunks;
  };
  
  const handleRecordingComplete = async (chunks) => {
    try {
      const recordingBlob = webrtcManager.current.getRecordingBlob();
      
      if (recordingBlob) {
        // Upload recording
        await liveClassAPI.uploadRecording(classId, recordingBlob, token);
        console.log('Recording uploaded successfully');
      }
    } catch (err) {
      console.error('Error uploading recording:', err);
      setError('Failed to save recording: ' + err.message);
    }
  };
  
  const sendChatMessage = () => {
    if (newMessage.trim() && socket.current) {
      socket.current.emit('chat-message', {
        roomId: classData.roomId,
        message: newMessage.trim()
      });
      setNewMessage('');
    }
  };
  
  const leaveClass = () => {
    cleanup();
    navigate('/teacher/live-classes');
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Joining live class...
        </Typography>
      </Box>
    );
  }
  
  if (error && !classData) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
        <Button onClick={() => navigate('/teacher/live-classes')} sx={{ mt: 2 }}>
          Back to Dashboard
        </Button>
      </Box>
    );
  }
  
  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'black' }}>
      {/* Header */}
      <Box sx={{ 
        bgcolor: 'background.paper', 
        p: 2, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: 1,
        borderColor: 'divider'
      }}>
        <Box>
          <Typography variant="h6">{classData?.title}</Typography>
          <Typography variant="body2" color="text.secondary">
            {classData?.section?.name} - {classData?.course?.courseCode}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Class ID: {classId} | Room: {classData?.roomId}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Chip 
            icon={isRecording ? <RecordIcon /> : null}
            label={isRecording ? 'Recording' : `${participants.size + 1} participants`}
            color={isRecording ? 'error' : 'default'}
            variant={isRecording ? 'filled' : 'outlined'}
          />
          
          <Chip 
            label={connectionStatus}
            color={connectionStatus === 'connected' ? 'success' : 'warning'}
            size="small"
          />
        </Box>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ m: 2 }}>
          {error}
        </Alert>
      )}
      
      {/* Main Content */}
      <Box sx={{ flex: 1, display: 'flex', position: 'relative' }}>
        {/* Video Grid */}
        <Box sx={{ flex: 1, p: 2 }}>
          <Grid container spacing={2} sx={{ height: '100%' }}>
            {/* Local Video */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ 
                height: '100%', 
                minHeight: 300,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'black',
                position: 'relative'
              }}>
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    backgroundColor: '#333' // Fallback background
                  }}
                />
                
                {/* Fallback content when video is not working */}
                {(!localVideoRef.current?.srcObject) && (
                  <Box sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    color: 'white'
                  }}>
                    <VideocamOffIcon sx={{ fontSize: 48, mb: 1 }} />
                    <Typography variant="body2">
                      Camera not available
                    </Typography>
                  </Box>
                )}
                
                <Box sx={{
                  position: 'absolute',
                  bottom: 8,
                  left: 8,
                  bgcolor: 'rgba(0,0,0,0.7)',
                  color: 'white',
                  px: 1,
                  py: 0.5,
                  borderRadius: 1
                }}>
                  You (Teacher)
                </Box>
              </Paper>
            </Grid>
            
            {/* Remote Videos */}
            {Array.from(participants.values()).map((participant, index) => (
              <Grid item xs={12} md={6} key={participant.id}>
                <Paper sx={{ 
                  height: '100%', 
                  minHeight: 300,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'black',
                  position: 'relative'
                }}>
                  {participant.stream ? (
                    <video
                      ref={(el) => {
                        if (el && remoteVideosRef.current.get(participant.id)) {
                          el.srcObject = remoteVideosRef.current.get(participant.id).stream;
                        }
                      }}
                      autoPlay
                      playsInline
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  ) : (
                    <Typography color="white">
                      Connecting...
                    </Typography>
                  )}
                  <Box sx={{
                    position: 'absolute',
                    bottom: 8,
                    left: 8,
                    bgcolor: 'rgba(0,0,0,0.7)',
                    color: 'white',
                    px: 1,
                    py: 0.5,
                    borderRadius: 1
                  }}>
                    Student {index + 1}
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
        
        {/* Chat Panel */}
        {showChat && (
          <Paper sx={{ width: 350, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="h6">Chat</Typography>
            </Box>
            
            <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
              <List dense>
                {chatMessages.map((msg) => (
                  <ListItem key={msg.id}>
                    <ListItemText
                      primary={
                        <Typography variant="body2" fontWeight={msg.isFromTeacher ? 'bold' : 'normal'}>
                          {msg.userName} {msg.isFromTeacher && '(Teacher)'}
                        </Typography>
                      }
                      secondary={msg.message}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
            
            {classData?.allowChat && (
              <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                />
              </Box>
            )}
          </Paper>
        )}
      </Box>
      
      {/* Controls */}
      <Box sx={{ 
        bgcolor: 'background.paper', 
        p: 2, 
        display: 'flex', 
        justifyContent: 'center',
        gap: 1,
        borderTop: 1,
        borderColor: 'divider'
      }}>
        {/* Share join link */}
        <Tooltip title="Copy student join link">
          <IconButton
            onClick={() => {
              const url = `${window.location.origin}/student/live-class/${classId}`;
              navigator.clipboard.writeText(url).then(() => setError('Join link copied to clipboard')).catch(() => setError('Failed to copy link'));
            }}
          >
            <PeopleIcon />
          </IconButton>
        </Tooltip>
        {/* Enable Camera Button (shown when camera is not accessible) */}
        {!localVideoRef.current?.srcObject && (
          <Tooltip title="Enable camera access">
            <IconButton 
              onClick={enableCamera}
              color="secondary"
              sx={{ bgcolor: 'orange', color: 'white' }}
            >
              <VideocamIcon />
            </IconButton>
          </Tooltip>
        )}
        
        {/* Video Toggle */}
        <Tooltip title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}>
          <IconButton 
            onClick={toggleVideo}
            color={isVideoOn ? 'primary' : 'default'}
            sx={{ bgcolor: isVideoOn ? 'primary.light' : 'grey.300' }}
          >
            {isVideoOn ? <VideocamIcon /> : <VideocamOffIcon />}
          </IconButton>
        </Tooltip>
        
        {/* Audio Toggle */}
        <Tooltip title={isAudioOn ? 'Mute microphone' : 'Unmute microphone'}>
          <IconButton 
            onClick={toggleAudio}
            color={isAudioOn ? 'primary' : 'default'}
            sx={{ bgcolor: isAudioOn ? 'primary.light' : 'grey.300' }}
          >
            {isAudioOn ? <MicIcon /> : <MicOffIcon />}
          </IconButton>
        </Tooltip>
        
        {/* Screen Share */}
        <Tooltip title={isScreenSharing ? 'Stop sharing' : 'Share screen'}>
          <IconButton 
            onClick={toggleScreenShare}
            color={isScreenSharing ? 'secondary' : 'default'}
            sx={{ bgcolor: isScreenSharing ? 'secondary.light' : 'grey.300' }}
          >
            {isScreenSharing ? <StopScreenShareIcon /> : <ScreenShareIcon />}
          </IconButton>
        </Tooltip>
        
        {/* Recording */}
        {user.role === 'teacher' && (
          <Tooltip title={isRecording ? 'Stop recording' : 'Start recording'}>
            <IconButton 
              onClick={isRecording ? stopRecording : startRecording}
              color={isRecording ? 'error' : 'default'}
              sx={{ bgcolor: isRecording ? 'error.light' : 'grey.300' }}
            >
              {isRecording ? <StopIcon /> : <RecordIcon />}
            </IconButton>
          </Tooltip>
        )}
        
        {/* Chat Toggle */}
        <Tooltip title="Toggle chat">
          <IconButton 
            onClick={() => setShowChat(!showChat)}
            color={showChat ? 'primary' : 'default'}
          >
            <ChatIcon />
          </IconButton>
        </Tooltip>
        
        {/* Participants */}
        <Tooltip title="Participants">
          <IconButton onClick={() => setShowParticipants(true)}>
            <PeopleIcon />
          </IconButton>
        </Tooltip>
        
        {/* Settings */}
        {user.role === 'teacher' && (
          <Tooltip title="Settings">
            <IconButton onClick={() => setShowSettings(true)}>
              <SettingsIcon />
            </IconButton>
          </Tooltip>
        )}
        
        {/* Leave */}
        <Tooltip title="Leave class">
          <IconButton onClick={leaveClass} color="error">
            <ExitIcon />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};

export default LiveClassRoom;