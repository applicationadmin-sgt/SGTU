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
  TextField,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Tooltip
} from '@mui/material';
import {
  Videocam as VideocamIcon,
  VideocamOff as VideocamOffIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  Chat as ChatIcon,
  People as PeopleIcon,
  ExitToApp as ExitIcon,
  FiberManualRecord as RecordIcon,
  VideoCall as VideoCallIcon
} from '@mui/icons-material';
import { io } from 'socket.io-client';
import { useParams, useNavigate } from 'react-router-dom';
import WebRTCManager from '../../utils/webrtc';
import liveClassAPI from '../../api/liveClassApi';

const StudentLiveClassRoom = ({ token, user }) => {
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
  const [hasJoined, setHasJoined] = useState(false);
  
  // UI State
  const [showChat, setShowChat] = useState(true);
  
  // Media State
  const [isVideoOn, setIsVideoOn] = useState(false); // Students start with video off
  const [isAudioOn, setIsAudioOn] = useState(false); // Students start with audio off
  const [isRecording, setIsRecording] = useState(false);
  
  // Refs
  const localVideoRef = useRef(null);
  const teacherVideoRef = useRef(null);
  const remoteVideosRef = useRef(new Map());
  const webrtcManager = useRef(null);
  const socket = useRef(null);
  
  // Initialize everything
  useEffect(() => {
    initializeClass();
    
    return () => {
      cleanup();
    };
  }, [classId, token]);
  
  // Debug effect to track video stream changes
  useEffect(() => {
    const checkVideoStream = () => {
      if (localVideoRef.current) {
        console.log('🎬 Student video ref state:', {
          hasRef: !!localVideoRef.current,
          hasSrcObject: !!localVideoRef.current.srcObject,
          videoTracks: localVideoRef.current.srcObject?.getVideoTracks()?.length || 0,
          audioTracks: localVideoRef.current.srcObject?.getAudioTracks()?.length || 0,
          isVideoOn: isVideoOn,
          isAudioOn: isAudioOn,
          videoReadyState: localVideoRef.current.readyState,
          videoCurrentTime: localVideoRef.current.currentTime
        });
      }
    };
    
    checkVideoStream();
    const interval = setInterval(checkVideoStream, 2000); // Check every 2 seconds
    
    return () => clearInterval(interval);
  }, [isVideoOn, isAudioOn, localVideoRef.current?.srcObject]);
  
  const initializeClass = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Get class details
      const classResponse = await liveClassAPI.getClassDetails(classId, token);
      setClassData(classResponse.liveClass);
      
      // Check if class is live
      if (classResponse.liveClass.status !== 'live') {
        setError('This class is not currently live.');
        return;
      }
      
      // Initialize socket connection
  socket.current = io(process.env.REACT_APP_API_URL || 'http://localhost:5000', {
        auth: { token }
      });
      
      // Initialize WebRTC
      webrtcManager.current = new WebRTCManager();
      
      await webrtcManager.current.initialize({
        roomId: classResponse.liveClass.roomId,
        userId: user.id || user._id, // JWT token uses 'id' not '_id'
        isTeacher: false,
        socket: socket.current
      });
      
      // Set up WebRTC event handlers
      setupWebRTCHandlers();
      
      // Set up socket event handlers
      setupSocketHandlers();
      
      // For students, we don't need to get user media initially
      // They can enable it later if the teacher allows it
      setConnectionStatus('connected');
      
    } catch (err) {
      console.error('Error initializing class:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const joinClass = async () => {
    try {
      console.log('🚪 Student attempting to join class:', classId);
      
      // Join the class via API
      await liveClassAPI.joinClass(classId, token);
      console.log('✅ Student joined class API successfully');
      
      // Join the WebRTC room
      console.log('🔗 Student joining WebRTC room...');
      await webrtcManager.current.joinRoom();
      console.log('✅ Student joined WebRTC room successfully');
      
      setHasJoined(true);
      
    } catch (err) {
      console.error('❌ Error joining class:', err);
      setError(err.message);
    }
  };
  
  const setupWebRTCHandlers = () => {
    if (!webrtcManager.current) return;
    
    webrtcManager.current.onRemoteStream = (userId, stream) => {
      console.log('Received remote stream from:', userId);
      
      // Check if this is the teacher's stream (use safe string comparison)
      const isTeacherStream = classData && String(classData.teacher._id) === String(userId);
      if (isTeacherStream || (!teacherVideoRef.current?.srcObject)) {
        if (teacherVideoRef.current) {
          teacherVideoRef.current.srcObject = stream;
          // Ensure autoplay kicks in
          try { teacherVideoRef.current.play().catch(() => {}); } catch (e) {}
          teacherVideoRef.current.onloadedmetadata = () => {
            try { teacherVideoRef.current.play().catch(() => {}); } catch (e) {}
          };
        }
      } else {
        // Handle other student streams
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
      }
      
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
  };
  
  const setupSocketHandlers = () => {
    if (!socket.current) return;
    
    socket.current.on('joined-room', (data) => {
      console.log('✅ Student joined room successfully:', data);
      setHasJoined(true);
    });
    
    socket.current.on('participants-list', (participants) => {
      console.log('👥 Student received participants list:', participants);
      // Update local participants state
      participants.forEach(participant => {
        if (participant.userId !== user._id) {
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
      console.log('👤 Student saw user joined:', data);
    });
    
    socket.current.on('user-left', (data) => {
      console.log('👤 Student saw user left:', data);
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
  };
  
  const cleanup = async () => {
    try {
      if (hasJoined) {
        await liveClassAPI.leaveClass(classId, token);
      }
    } catch (err) {
      console.error('Error leaving class:', err);
    }
    
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
    if (webrtcManager.current && classData?.allowStudentCamera) {
      const newState = webrtcManager.current.toggleVideo();
      setIsVideoOn(newState);
    }
  };
  
  const toggleAudio = () => {
    if (webrtcManager.current && classData?.allowStudentMic) {
      const newState = webrtcManager.current.toggleAudio();
      setIsAudioOn(newState);
    }
  };
  
  const sendChatMessage = () => {
    if (newMessage.trim() && socket.current && classData?.allowChat) {
      socket.current.emit('chat-message', {
        roomId: classData.roomId,
        message: newMessage.trim()
      });
      setNewMessage('');
    }
  };
  
  const leaveClass = () => {
    cleanup();
    navigate('/student/live-classes');
  };

  // Toggle camera
  const toggleCamera = async () => {
    if (!webrtcManager.current) return;
    
    // Ensure student has joined the room first
    if (!hasJoined) {
      setError('Please join the class first before enabling your camera.');
      return;
    }
    
    try {
      if (!isVideoOn) {
        // Turn on camera
        if (!webrtcManager.current.localStream) {
          console.log('🎥 Getting user media for first time (camera)');
          
          let stream;
          try {
            // Try to get video + audio first
            stream = await webrtcManager.current.getUserMedia({
              video: true,
              audio: isAudioOn
            });
            console.log('✅ Got video + audio stream successfully');
          } catch (error) {
            console.warn('⚠️ Failed to get video + audio, trying video only:', error.message);
            try {
              // If that fails, try video only
              stream = await webrtcManager.current.getUserMedia({
                video: true,
                audio: false
              });
              console.log('✅ Got video-only stream successfully');
            } catch (videoError) {
              console.error('❌ Failed to get video at all:', videoError.message);
              setError(`Camera access failed: ${videoError.message}. Please allow camera access in your browser settings.`);
              return;
            }
          }
          
          // ALWAYS set the stream to local video ref when we get it
          if (localVideoRef.current) {
            console.log('📺 Setting stream to student local video ref');
            localVideoRef.current.srcObject = stream;
            try { 
              await localVideoRef.current.play();
              console.log('✅ Student local video playing');
            } catch (e) {
              console.warn('⚠️ Student video autoplay failed:', e);
            }
            localVideoRef.current.onloadedmetadata = () => {
              try { 
                localVideoRef.current.play();
                console.log('✅ Student local video playing after metadata loaded');
              } catch (e) {
                console.warn('⚠️ Student video play failed after metadata:', e);
              }
            };
          }
        } else {
          // FORCE a new getUserMedia call when enabling video to ensure we get video tracks
          console.log('🎥 Getting NEW user media stream with video enabled');
          
          // Stop existing stream first
          if (webrtcManager.current.localStream) {
            webrtcManager.current.localStream.getTracks().forEach(track => track.stop());
          }
          
          // Get new stream with video
          const stream = await webrtcManager.current.getUserMedia({
            video: true,
            audio: isAudioOn
          });
          
          // Ensure the video element has the NEW stream
          if (localVideoRef.current) {
            console.log('📺 Setting NEW video stream to student local video ref');
            localVideoRef.current.srcObject = stream;
            try { 
              await localVideoRef.current.play();
              console.log('✅ Student local video playing (new stream)');
            } catch (e) {
              console.warn('⚠️ Student video play failed:', e);
            }
          }
        }
        // ALWAYS update peer connections after any media change
        console.log('🔄 Updating peer connections after camera enable');
        console.log('📊 Before updateLocalStreamTracks - Peer connection status:', {
          peerConnectionCount: webrtcManager.current.peerConnections.size,
          localStreamId: webrtcManager.current.localStream?.id,
          videoTrackCount: webrtcManager.current.localStream?.getVideoTracks().length || 0,
          audioTrackCount: webrtcManager.current.localStream?.getAudioTracks().length || 0
        });
        
        webrtcManager.current.updateLocalStreamTracks();
        
        console.log('📊 After updateLocalStreamTracks - Updated peer connections with new tracks');
        setIsVideoOn(true);
      } else {
        // Turn off camera
        if (webrtcManager.current.localStream) {
          const videoTracks = webrtcManager.current.localStream.getVideoTracks();
          videoTracks.forEach(track => track.enabled = false);
          // Update peer connections to reflect disabled track
          console.log('🔄 Updating peer connections after camera disable');
          webrtcManager.current.updateLocalStreamTracks();
        }
        setIsVideoOn(false);
      }
    } catch (err) {
      console.error('Error toggling camera:', err);
      setError('Failed to toggle camera: ' + err.message);
    }
  };

  // Toggle microphone
  const toggleMicrophone = async () => {
    if (!webrtcManager.current) return;
    
    // Ensure student has joined the room first
    if (!hasJoined) {
      setError('Please join the class first before enabling your microphone.');
      return;
    }
    
    try {
      if (!isAudioOn) {
        // Turn on microphone
        if (!webrtcManager.current.localStream) {
          console.log('🎤 Getting user media for first time (microphone)');
          const stream = await webrtcManager.current.getUserMedia({
            video: isVideoOn,
            audio: true
          });
          // ALWAYS set the stream to local video ref when we get it (even if only audio)
          if (localVideoRef.current) {
            console.log('📺 Setting stream to student local video ref (microphone first)');
            localVideoRef.current.srcObject = stream;
            try { 
              await localVideoRef.current.play();
              console.log('✅ Student local video/audio playing');
            } catch (e) {
              console.warn('⚠️ Student media autoplay failed:', e);
            }
            localVideoRef.current.onloadedmetadata = () => {
              try { 
                localVideoRef.current.play();
                console.log('✅ Student local media playing after metadata loaded');
              } catch (e) {
                console.warn('⚠️ Student media play failed after metadata:', e);
              }
            };
          }
        } else {
          // Enable audio track
          const audioTracks = webrtcManager.current.localStream.getAudioTracks();
          audioTracks.forEach(track => track.enabled = true);
        }
        // ALWAYS update peer connections after any media change
        console.log('🔄 Updating peer connections after microphone enable');
        webrtcManager.current.updateLocalStreamTracks();
        setIsAudioOn(true);
      } else {
        // Turn off microphone
        if (webrtcManager.current.localStream) {
          const audioTracks = webrtcManager.current.localStream.getAudioTracks();
          audioTracks.forEach(track => track.enabled = false);
          // Update peer connections to reflect disabled track
          console.log('🔄 Updating peer connections after microphone disable');
          webrtcManager.current.updateLocalStreamTracks();
        }
        setIsAudioOn(false);
      }
    } catch (err) {
      console.error('Error toggling microphone:', err);
      setError('Failed to toggle microphone: ' + err.message);
    }
  };
  
  // Manual camera enable function for students
  const enableCamera = async () => {
    try {
      setError('');
      console.log('🎥 Student manually requesting camera access...');
      
      if (!webrtcManager.current) {
        console.error('❌ WebRTC manager not initialized');
        setError('WebRTC manager not ready. Please refresh the page.');
        return;
      }
      
      // Stop existing stream if any
      if (webrtcManager.current.localStream) {
        webrtcManager.current.localStream.getTracks().forEach(track => track.stop());
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
      
      // Set stream to video element
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        try {
          await localVideoRef.current.play();
          console.log('✅ Manual camera enabled successfully');
        } catch (playError) {
          console.warn('⚠️ Autoplay failed:', playError);
        }
      }
      
      // Update peer connections
      webrtcManager.current.updateLocalStreamTracks();
      
      setIsVideoOn(true);
      setIsAudioOn(true);
      
    } catch (error) {
      console.error('❌ Failed to enable camera manually:', error);
      setError(`Failed to enable camera: ${error.message}. Please check your camera permissions in browser settings.`);
    }
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Connecting to live class...
        </Typography>
      </Box>
    );
  }
  
  if (error && !classData) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
        <Button onClick={() => navigate('/student/live-classes')} sx={{ mt: 2 }}>
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
            Teacher: {classData?.teacher?.name} | {classData?.course?.courseCode}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Class ID: {classId} | Room: {classData?.roomId}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {isRecording && (
            <Chip 
              icon={<RecordIcon />}
              label="Recording"
              color="error"
              variant="filled"
            />
          )}
          
          <Chip 
            label={`${participants.size + 1} participants`}
            color="default"
            variant="outlined"
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
      
      {/* Join Class Prompt */}
      {!hasJoined && (
        <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
          <Paper sx={{ p: 4, textAlign: 'center', maxWidth: 400 }}>
            <Typography variant="h6" gutterBottom>
              Ready to join the live class?
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              You'll be able to see and hear your teacher. Your camera and microphone will be off by default.
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={joinClass}
              startIcon={<VideoCallIcon />}
            >
              Join Class
            </Button>
          </Paper>
        </Box>
      )}
      
      {/* Main Content */}
      {hasJoined && (
        <Box sx={{ flex: 1, display: 'flex' }}>
          {/* Video Area */}
          <Box sx={{ flex: 1, p: 2 }}>
            <Grid container spacing={2} sx={{ height: '100%' }}>
              {/* Teacher Video - Main */}
              <Grid item xs={12} md={showChat ? 8 : 12}>
                <Paper sx={{ 
                  height: '100%', 
                  minHeight: 400,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'black',
                  position: 'relative'
                }}>
                  <video
                    ref={teacherVideoRef}
                    autoPlay
                    playsInline
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                  {/* Overlay if teacher video not yet available */}
                  {(!teacherVideoRef.current || !teacherVideoRef.current.srcObject) && (
                    <Box sx={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      color: 'white',
                      textAlign: 'center',
                      opacity: 0.85
                    }}>
                      <Typography variant="body1">Waiting for teacher’s video…</Typography>
                      <Typography variant="caption">
                        If this stays blank, ensure you joined the same class as the teacher.
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
                    {classData?.teacher?.name} (Teacher)
                  </Box>
                </Paper>
              </Grid>
              
              {/* Student's Own Video - Small */}
              {(isVideoOn || isAudioOn) && (
                <Grid item xs={12} md={4}>
                  <Paper sx={{ 
                    height: 200,
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
                        display: isVideoOn ? 'block' : 'none'
                      }}
                    />
                    
                    {/* Debug info overlay */}
                    <Box sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      bgcolor: 'rgba(255,0,0,0.8)',
                      color: 'white',
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      fontSize: '10px'
                    }}>
                      V:{isVideoOn ? 'ON' : 'OFF'} | A:{isAudioOn ? 'ON' : 'OFF'} | 
                      Stream:{localVideoRef.current?.srcObject ? 'YES' : 'NO'}
                    </Box>
                    
                    {/* Fallback content when video is not working */}
                    {isVideoOn && (!localVideoRef.current?.srcObject) && (
                      <Box sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        textAlign: 'center',
                        color: 'white'
                      }}>
                        <VideocamOffIcon sx={{ fontSize: 32, mb: 1 }} />
                        <Typography variant="caption">
                          Camera loading...
                        </Typography>
                      </Box>
                    )}
                    
                    {/* Audio-only indicator */}
                    {isAudioOn && !isVideoOn && (
                      <Box sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        textAlign: 'center',
                        color: 'white'
                      }}>
                        <Typography variant="h6">🎤</Typography>
                        <Typography variant="caption">Audio On</Typography>
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
                      You
                    </Box>
                  </Paper>
                </Grid>
              )}
            </Grid>
            
            {/* Media Controls */}
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              gap: 2, 
              mt: 2,
              p: 2,
              bgcolor: 'background.paper',
              borderRadius: 1
            }}>
              {/* Camera Control - Single Button */}
              {!localVideoRef.current?.srcObject ? (
                // Show manual enable button when no stream
                <Tooltip title="Enable camera access">
                  <IconButton 
                    onClick={enableCamera}
                    disabled={!classData?.allowStudentCamera}
                    sx={{ 
                      bgcolor: 'orange', 
                      color: 'white', 
                      '&:hover': { bgcolor: 'darkorange' },
                      '&:disabled': { bgcolor: 'grey.300', color: 'grey.500' }
                    }}
                  >
                    <VideocamIcon />
                  </IconButton>
                </Tooltip>
              ) : (
                // Show toggle button when stream exists
                <Tooltip title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}>
                  <IconButton
                    onClick={toggleCamera}
                    disabled={!classData?.allowStudentCamera}
                    sx={{
                      bgcolor: isVideoOn ? 'primary.main' : 'grey.500',
                      color: 'white',
                      '&:hover': {
                        bgcolor: isVideoOn ? 'primary.dark' : 'grey.600'
                      },
                      '&:disabled': {
                        bgcolor: 'grey.300',
                        color: 'grey.500'
                      }
                    }}
                  >
                    {isVideoOn ? <VideocamIcon /> : <VideocamOffIcon />}
                  </IconButton>
                </Tooltip>
              )}
              
              {/* Microphone Toggle */}
              <Tooltip title={isAudioOn ? 'Turn off microphone' : 'Turn on microphone'}>
                <IconButton
                  onClick={toggleMicrophone}
                  disabled={!classData?.allowStudentMic}
                  sx={{
                    bgcolor: isAudioOn ? 'primary.main' : 'grey.500',
                    color: 'white',
                    '&:hover': {
                      bgcolor: isAudioOn ? 'primary.dark' : 'grey.600'
                    },
                    '&:disabled': {
                      bgcolor: 'grey.300',
                      color: 'grey.500'
                    }
                  }}
                >
                  {isAudioOn ? <MicIcon /> : <MicOffIcon />}
                </IconButton>
              </Tooltip>
              
              {/* Chat Toggle */}
              <Tooltip title={showChat ? 'Hide chat' : 'Show chat'}>
                <IconButton
                  onClick={() => setShowChat(!showChat)}
                  sx={{
                    bgcolor: showChat ? 'primary.main' : 'grey.500',
                    color: 'white',
                    '&:hover': {
                      bgcolor: showChat ? 'primary.dark' : 'grey.600'
                    }
                  }}
                >
                  <ChatIcon />
                </IconButton>
              </Tooltip>
              
              {/* Leave Class */}
              <Tooltip title="Leave class">
                <IconButton
                  onClick={leaveClass}
                  sx={{
                    bgcolor: 'error.main',
                    color: 'white',
                    '&:hover': {
                      bgcolor: 'error.dark'
                    }
                  }}
                >
                  <ExitIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
          
          {/* Chat Panel */}
          {showChat && (
            <Paper sx={{ width: 350, display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="h6">Live Chat</Typography>
              </Box>
              
              <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
                <List dense>
                  {chatMessages.map((msg) => (
                    <ListItem key={msg.id} sx={{ 
                      alignItems: 'flex-start',
                      bgcolor: msg.isFromTeacher ? 'primary.light' : 'transparent',
                      mb: 1,
                      borderRadius: 1
                    }}>
                      <ListItemText
                        primary={
                          <Typography 
                            variant="body2" 
                            fontWeight={msg.isFromTeacher ? 'bold' : 'normal'}
                            color={msg.isFromTeacher ? 'primary.dark' : 'text.primary'}
                          >
                            {msg.userName} {msg.isFromTeacher && '(Teacher)'}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="body2">
                            {msg.message}
                          </Typography>
                        }
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
              
              {!classData?.allowChat && (
                <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                  <Typography variant="body2" color="text.secondary" align="center">
                    Chat is disabled for this class
                  </Typography>
                </Box>
              )}
            </Paper>
          )}
        </Box>
      )}
      
      {/* Controls */}
      {hasJoined && (
        <Box sx={{ 
          bgcolor: 'background.paper', 
          p: 2, 
          display: 'flex', 
          justifyContent: 'center',
          gap: 1,
          borderTop: 1,
          borderColor: 'divider'
        }}>
          {/* Video Toggle */}
          <Tooltip title={
            !classData?.allowStudentCamera ? 'Camera disabled by teacher' :
            isVideoOn ? 'Turn off camera' : 'Turn on camera'
          }>
            <span>
              <IconButton 
                onClick={toggleVideo}
                disabled={!classData?.allowStudentCamera}
                color={isVideoOn ? 'primary' : 'default'}
                sx={{ bgcolor: isVideoOn ? 'primary.light' : 'grey.300' }}
              >
                {isVideoOn ? <VideocamIcon /> : <VideocamOffIcon />}
              </IconButton>
            </span>
          </Tooltip>
          
          {/* Audio Toggle */}
          <Tooltip title={
            !classData?.allowStudentMic ? 'Microphone disabled by teacher' :
            isAudioOn ? 'Mute microphone' : 'Unmute microphone'
          }>
            <span>
              <IconButton 
                onClick={toggleAudio}
                disabled={!classData?.allowStudentMic}
                color={isAudioOn ? 'primary' : 'default'}
                sx={{ bgcolor: isAudioOn ? 'primary.light' : 'grey.300' }}
              >
                {isAudioOn ? <MicIcon /> : <MicOffIcon />}
              </IconButton>
            </span>
          </Tooltip>
          
          {/* Chat Toggle */}
          <Tooltip title="Toggle chat">
            <IconButton 
              onClick={() => setShowChat(!showChat)}
              color={showChat ? 'primary' : 'default'}
            >
              <ChatIcon />
            </IconButton>
          </Tooltip>
          
          {/* Leave */}
          <Tooltip title="Leave class">
            <IconButton onClick={leaveClass} color="error">
              <ExitIcon />
            </IconButton>
          </Tooltip>
        </Box>
      )}
    </Box>
  );
};

export default StudentLiveClassRoom;