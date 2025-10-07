import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Grid,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  Badge,
  Tabs,
  Tab,
  Divider,
  Collapse,
  Drawer,
  AppBar,
  Toolbar,
  ToggleButton,
  ToggleButtonGroup,
  Slider,
  Fab,
  Tooltip,
  Alert,
  Snackbar,
  ButtonGroup,
  Stack
} from '@mui/material';

// Icons
import {
  Videocam,
  VideocamOff,
  Mic,
  MicOff,
  ScreenShare,
  StopScreenShare,
  ExitToApp,
  Settings,
  People,
  Chat,
  Poll,
  School,
  Create,
  Brush,
  Clear,
  LinearScale,
  RadioButtonUnchecked,
  Crop169,
  Undo,
  Redo,
  Save,
  VolumeOff,
  FiberManualRecord,
  Stop,
  PictureInPicture,
  Fullscreen,
  FullscreenExit,
  ChevronLeft,
  ChevronRight,
  ExpandLess,
  ExpandMore,
  Send,
  EmojiEmotions,
  AttachFile,
  MenuBook,
  Assignment,
  Quiz,
  BarChart,
  PanTool as RaiseHandIcon,
  Close,
  Menu as MenuIcon
} from '@mui/icons-material';

import { styled } from '@mui/material/styles';
import ScalableWebRTCManager from '../../utils/ScalableWebRTCManager';

// Styled Components
const MainContainer = styled(Box)(({ theme }) => ({
  height: '100vh',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: '#f5f5f5'
}));

const ContentArea = styled(Box)(({ theme }) => ({
  flex: 1,
  display: 'flex',
  overflow: 'hidden'
}));

const LeftPanel = styled(Paper)(({ theme, collapsed }) => ({
  width: collapsed ? 0 : 320,
  transition: 'width 0.3s ease',
  overflow: 'hidden',
  borderRadius: 0,
  borderRight: '1px solid ${theme.palette.divider}',
  display: 'flex',
  flexDirection: 'column'
}));

const CenterArea = styled(Box)(({ theme }) => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0
}));

const RightPanel = styled(Paper)(({ theme, collapsed }) => ({
  width: collapsed ? 0 : 380,
  transition: 'width 0.3s ease',
  overflow: 'hidden',
  borderRadius: 0,
  borderLeft: '1px solid ${theme.palette.divider}',
  display: 'flex',
  flexDirection: 'column'
}));

const ControlBar = styled(Paper)(({ theme }) => ({
  height: 80,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(0, 3),
  borderRadius: 0,
  borderTop: '1px solid ${theme.palette.divider}',
  backgroundColor: '#fff'
}));

const WhiteboardCanvas = styled('canvas')(({ theme }) => ({
  width: '100%',
  height: '100%',
  cursor: 'crosshair',
  backgroundColor: '#fff'
}));

const VideoContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  width: '100%',
  height: '100%',
  backgroundColor: '#000',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: theme.spacing(1),
  overflow: 'hidden'
}));

const ModernLiveClassRoom = ({ token, user, classId: propClassId }) => {
  const navigate = useNavigate();
  const { classId: paramClassId } = useParams();
  const classId = propClassId || paramClassId;

  // Panel States
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState(0);

  // Role & User States
  const [isTeacher, setIsTeacher] = useState(user?.role === 'teacher');
  const [participants, setParticipants] = useState([
    { id: 1, name: 'John Doe', role: 'teacher', handRaised: false, micEnabled: true, cameraEnabled: true },
    { id: 2, name: 'Alice Smith', role: 'student', handRaised: true, micEnabled: false, cameraEnabled: false },
    { id: 3, name: 'Bob Johnson', role: 'student', handRaised: false, micEnabled: false, cameraEnabled: true },
  ]);

  // Media States
  const [micEnabled, setMicEnabled] = useState(isTeacher);
  const [cameraEnabled, setCameraEnabled] = useState(isTeacher);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [handRaised, setHandRaised] = useState(false);

  // Content States
  const [contentType, setContentType] = useState('video'); // video, whiteboard, screen
  const [isPipMode, setIsPipMode] = useState(false);

  // Whiteboard States
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingTool, setDrawingTool] = useState('pen');
  const [drawingColor, setDrawingColor] = useState('#000000');
  const [drawingWidth, setDrawingWidth] = useState(2);

  // Chat States
  const [chatMessages, setChatMessages] = useState([
    { id: 1, sender: 'Teacher', message: 'Welcome to the class!', timestamp: new Date(), isTeacher: true },
    { id: 2, sender: 'Alice', message: 'Thank you!', timestamp: new Date(), isTeacher: false }
  ]);
  const [newMessage, setNewMessage] = useState('');

  // Q&A States
  const [questions, setQuestions] = useState([
    { id: 1, student: 'Bob', question: 'Can you explain this concept again?', answered: false, timestamp: new Date() }
  ]);
  const [newQuestion, setNewQuestion] = useState('');

  // Polls States
  const [polls, setPolls] = useState([]);
  const [currentPoll, setCurrentPoll] = useState(null);

  // WebRTC States
  const webrtcManager = useRef(null);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map());

  // Notifications
  const [notifications, setNotifications] = useState([]);

  // Utility Functions
  const addNotification = useCallback((message, type = 'info') => {
    const notification = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date()
    };
    setNotifications(prev => [...prev, notification]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  }, []);

  // WebRTC Initialization
  useEffect(() => {
    const initWebRTC = async () => {
      try {
        webrtcManager.current = new ScalableWebRTCManager();
        await webrtcManager.current.connect({
          serverUrl: process.env.REACT_APP_SOCKET_URL || 'https://192.168.7.20:5000',
          classId,
          userId: user._id || user.id,
          userRole: isTeacher ? 'teacher' : 'student',
          token
        });

        setConnectionState('connecting');
        addNotification('Connecting to live class...', 'info');

        // Set up event handlers
        webrtcManager.current.onConnectionStateChange = (userId, state) => {
          setConnectionState(state);
          if (state === 'connected') {
            addNotification('Successfully joined live class!', 'success');
          }
        };

        webrtcManager.current.onUserJoined = (participant) => {
          setParticipants(prev => [...prev, participant]);
          addNotification('${participant.name} joined the class', 'info');
        };

        webrtcManager.current.onUserLeft = (userData) => {
          setParticipants(prev => prev.filter(p => p.id !== userData.id));
          addNotification('${userData.name} left the class', 'info');
        };

        webrtcManager.current.onRemoteStream = (producerId, stream, kind) => {
          if (kind === 'video' && stream) {
            setRemoteStreams(prev => new Map(prev.set(producerId, stream)));
          }
        };

        webrtcManager.current.onError = (message, error) => {
          addNotification(message, 'error');
          console.error('WebRTC Error:', error);
        };

        // Setup drawing and chat handlers
        webrtcManager.current.setupDrawingHandlers(
          (drawingData) => {
            // Handle received drawing data
            console.log('Received drawing:', drawingData);
          },
          () => {
            // Handle whiteboard clear
            const canvas = canvasRef.current;
            if (canvas) {
              const ctx = canvas.getContext('2d');
              ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
          }
        );

        webrtcManager.current.setupChatHandlers((messageData) => {
          setChatMessages(prev => [...prev, {
            id: messageData.timestamp,
            sender: messageData.userId,
            message: messageData.content,
            timestamp: new Date(messageData.timestamp),
            isTeacher: false
          }]);
        });

        // Initialize media for teacher
        if (isTeacher) {
          const stream = await webrtcManager.current.startLocalMedia({
            video: true,
            audio: true
          });
          setLocalStream(stream);
        }

      } catch (error) {
        console.error('Failed to initialize WebRTC:', error);
        addNotification('Failed to connect to live class', 'error');
      }
    };

    if (classId && user) {
      initWebRTC();
    }

    return () => {
      if (webrtcManager.current) {
        webrtcManager.current.disconnect();
      }
    };
  }, [classId, user, isTeacher, token, addNotification]);

  // Media Control Functions
  const toggleMicrophone = async () => {
    if (webrtcManager.current) {
      const enabled = await webrtcManager.current.toggleAudio();
      setMicEnabled(enabled);
    }
  };

  const toggleCamera = async () => {
    if (webrtcManager.current) {
      const enabled = await webrtcManager.current.toggleVideo();
      setCameraEnabled(enabled);
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        await webrtcManager.current.stopScreenShare();
        setIsScreenSharing(false);
        setContentType('video');
      } else {
        await webrtcManager.current.startScreenShare();
        setIsScreenSharing(true);
        setContentType('screen');
      }
    } catch (error) {
      addNotification('Failed to toggle screen share', 'error');
    }
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    addNotification(isRecording ? 'Recording stopped' : 'Recording started', 'info');
  };

  const toggleHandRaise = () => {
    setHandRaised(!handRaised);
    if (webrtcManager.current) {
      webrtcManager.current.toggleHand(!handRaised);
    }
    addNotification(handRaised ? 'Hand lowered' : 'Hand raised', 'info');
  };

  // Whiteboard Functions
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  useEffect(() => {
    if (contentType === 'whiteboard') {
      initCanvas();
    }
  }, [contentType, initCanvas]);

  const startDrawing = useCallback((event) => {
    if (!isTeacher) return;
    setIsDrawing(true);

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
  }, [isTeacher]);

  const draw = useCallback((event) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const ctx = canvas.getContext('2d');

    if (drawingTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = drawingWidth * 3;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = drawingColor;
      ctx.lineWidth = drawingWidth;
    }

    ctx.lineTo(x, y);
    ctx.stroke();

    // Broadcast drawing to other participants
    if (webrtcManager.current) {
      webrtcManager.current.broadcastDrawing({
        type: 'draw',
        x, y,
        tool: drawingTool,
        color: drawingColor,
        width: drawingWidth
      });
    }
  }, [isDrawing, drawingTool, drawingColor, drawingWidth]);

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
  }, []);

  // Chat Functions
  const sendMessage = () => {
    if (!newMessage.trim()) return;

    const message = {
      id: Date.now(),
      sender: user.name || user.username,
      message: newMessage,
      timestamp: new Date(),
      isTeacher
    };

    setChatMessages(prev => [...prev, message]);
    
    if (webrtcManager.current) {
      webrtcManager.current.sendMessage(newMessage);
    }
    
    setNewMessage('');
  };

  // Q&A Functions
  const sendQuestion = () => {
    if (!newQuestion.trim()) return;

    const question = {
      id: Date.now(),
      student: user.name || user.username,
      question: newQuestion,
      answered: false,
      timestamp: new Date()
    };

    setQuestions(prev => [...prev, question]);
    setNewQuestion('');
  };

  // Exit Function
  const handleExit = () => {
    const confirmExit = window.confirm('Are you sure you want to leave the live class?');
    if (confirmExit) {
      if (webrtcManager.current) {
        webrtcManager.current.disconnect();
      }
      navigate('/teacher/live-classes');
    }
  };

  // Render Functions
  const renderVideoContent = () => {
    if (contentType === 'whiteboard') {
      return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {isTeacher && (
            <Paper sx={{ p: 1, mb: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
              <ToggleButtonGroup
                value={drawingTool}
                exclusive
                onChange={(e, value) => value && setDrawingTool(value)}
                size='small'
              >
                <ToggleButton value='pen'>
                  <Create fontSize='small' />
                </ToggleButton>
                <ToggleButton value='marker'>
                  <Brush fontSize='small' />
                </ToggleButton>
                <ToggleButton value='eraser'>
                  <Clear fontSize='small' />
                </ToggleButton>
                <ToggleButton value='line'>
                  <LinearScale fontSize='small' />
                </ToggleButton>
                <ToggleButton value='circle'>
                  <RadioButtonUnchecked fontSize='small' />
                </ToggleButton>
                <ToggleButton value='rectangle'>
                  <Crop169 fontSize='small' />
                </ToggleButton>
              </ToggleButtonGroup>
              
              <Divider orientation='vertical' sx={{ mx: 1 }} />
              
              <input
                type='color'
                value={drawingColor}
                onChange={(e) => setDrawingColor(e.target.value)}
                style={{ width: 32, height: 32, border: 'none', borderRadius: 4 }}
              />
              
              <Slider
                value={drawingWidth}
                onChange={(e, value) => setDrawingWidth(value)}
                min={1}
                max={10}
                step={1}
                sx={{ width: 100, mx: 2 }}
              />
              
              <ButtonGroup size='small'>
                <IconButton onClick={() => {}}>
                  <Undo fontSize='small' />
                </IconButton>
                <IconButton onClick={() => {}}>
                  <Redo fontSize='small' />
                </IconButton>
                <IconButton onClick={() => initCanvas()}>
                  <Clear fontSize='small' />
                </IconButton>
              </ButtonGroup>
            </Paper>
          )}
          
          <Box sx={{ flex: 1, border: '2px solid #e0e0e0', borderRadius: 1 }}>
            <WhiteboardCanvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
            />
          </Box>
        </Box>
      );
    }

    return (
      <VideoContainer>
        {localStream || isTeacher ? (
          <video
            ref={(video) => {
              if (video && localStream) {
                video.srcObject = localStream;
              }
            }}
            autoPlay
            muted
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <Box textAlign='center' color='white'>
            <VideocamOff sx={{ fontSize: 64, mb: 2 }} />
            <Typography>Waiting for teacher...</Typography>
          </Box>
        )}
        
        {isTeacher && (
          <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
            <Chip
              label='LIVE'
              color='error'
              size='small'
              sx={{ backgroundColor: '#ff4444', color: 'white' }}
            />
          </Box>
        )}
      </VideoContainer>
    );
  };

  const renderParticipantsPanel = () => (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant='h6'>Participants ({participants.length})</Typography>
        <IconButton size='small' onClick={() => setLeftPanelCollapsed(true)}>
          <ChevronLeft />
        </IconButton>
      </Box>
      
      <List sx={{ flex: 1, overflow: 'auto', p: 0 }}>
        {participants.map((participant) => (
          <ListItem key={participant.id} sx={{ px: 2 }}>
            <ListItemIcon>
              <Avatar sx={{ width: 32, height: 32, bgcolor: participant.role === 'teacher' ? 'primary.main' : 'grey.500' }}>
                {participant.name[0]}
              </Avatar>
            </ListItemIcon>
            <ListItemText 
              primary={participant.name}
              secondary={participant.role}
            />
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {participant.handRaised && (
                <Tooltip title='Hand raised'>
                  <RaiseHandIcon color='warning' fontSize='small' />
                </Tooltip>
              )}
              <IconButton size='small' disabled>
                {participant.micEnabled ? <Mic fontSize='small' /> : <MicOff fontSize='small' />}
              </IconButton>
              <IconButton size='small' disabled>
                {participant.cameraEnabled ? <Videocam fontSize='small' /> : <VideocamOff fontSize='small' />}
              </IconButton>
            </Box>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  const renderChatPanel = () => (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 0 }}>
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {chatMessages.map((msg) => (
          <Box key={msg.id} sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                {msg.sender[0]}
              </Avatar>
              <Typography variant='caption' fontWeight='bold'>
                {msg.sender}
              </Typography>
              {msg.isTeacher && (
                <Chip label='Teacher' size='small' color='primary' sx={{ height: 16, fontSize: '0.6rem' }} />
              )}
              <Typography variant='caption' color='text.secondary'>
                {msg.timestamp.toLocaleTimeString()}
              </Typography>
            </Box>
            <Typography variant='body2' sx={{ ml: 4 }}>
              {msg.message}
            </Typography>
          </Box>
        ))}
      </Box>
      
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            size='small'
            fullWidth
            placeholder='Type a message...'
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          />
          <IconButton color='primary' onClick={sendMessage}>
            <Send />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );

  const renderQAPanel = () => (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 0 }}>
      {!isTeacher && (
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              size='small'
              fullWidth
              placeholder='Ask a question...'
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendQuestion()}
            />
            <IconButton color='primary' onClick={sendQuestion}>
              <Send />
            </IconButton>
          </Box>
        </Box>
      )}
      
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {questions.map((q) => (
          <Card key={q.id} sx={{ mb: 2, p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant='subtitle2'>{q.student}</Typography>
              <Chip
                label={q.answered ? 'Answered' : 'Pending'}
                size='small'
                color={q.answered ? 'success' : 'default'}
              />
            </Box>
            <Typography variant='body2'>{q.question}</Typography>
          </Card>
        ))}
      </Box>
    </Box>
  );

  const renderPollsPanel = () => (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2 }}>
      {isTeacher && (
        <Button variant='contained' sx={{ mb: 2 }} startIcon={<Poll />}>
          Create Poll
        </Button>
      )}
      
      <Typography variant='body2' color='text.secondary' textAlign='center'>
        No active polls
      </Typography>
    </Box>
  );

  const renderMaterialsPanel = () => (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2 }}>
      {isTeacher && (
        <Button variant='contained' sx={{ mb: 2 }} startIcon={<AttachFile />}>
          Share File
        </Button>
      )}
      
      <List>
        <ListItem>
          <ListItemIcon>
            <MenuBook />
          </ListItemIcon>
          <ListItemText primary='Lesson Notes.pdf' secondary='Shared 10 mins ago' />
        </ListItem>
      </List>
    </Box>
  );

  return (
    <MainContainer>
      {/* Header */}
      <AppBar position='static' color='default' elevation={1}>
        <Toolbar>
          <Typography variant='h6' sx={{ flexGrow: 1 }}>
            Live Class - {classId}
          </Typography>
          
          <Chip 
            label={connectionState.toUpperCase()} 
            color={connectionState === 'connected' ? 'success' : 'warning'}
            size='small'
            sx={{ mr: 2 }}
          />
          
          {isRecording && (
            <Chip
              label='RECORDING'
              color='error'
              size='small'
              sx={{ mr: 2, animation: 'pulse 2s infinite' }}
              icon={<FiberManualRecord />}
            />
          )}
          
          <Button
            variant='outlined'
            startIcon={<ExitToApp />}
            onClick={handleExit}
          >
            Exit
          </Button>
        </Toolbar>
      </AppBar>

      {/* Main Content Area */}
      <ContentArea>
        {/* Left Panel - Participants */}
        <LeftPanel collapsed={leftPanelCollapsed}>
          {!leftPanelCollapsed && renderParticipantsPanel()}
        </LeftPanel>

        {/* Center Area - Video/Whiteboard */}
        <CenterArea>
          <Box sx={{ flex: 1, p: 2 }}>
            {renderVideoContent()}
          </Box>
          
          {/* Content Type Selector */}
          <Box sx={{ p: 1, display: 'flex', justifyContent: 'center', borderTop: 1, borderColor: 'divider' }}>
            <ToggleButtonGroup
              value={contentType}
              exclusive
              onChange={(e, value) => value && setContentType(value)}
              size='small'
            >
              <ToggleButton value='video'>
                <Videocam />
              </ToggleButton>
              <ToggleButton value='whiteboard'>
                <School />
              </ToggleButton>
              <ToggleButton value='screen'>
                <ScreenShare />
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </CenterArea>

        {/* Right Panel - Chat/Q&A/Polls */}
        <RightPanel collapsed={rightPanelCollapsed}>
          {!rightPanelCollapsed && (
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs
                  value={rightPanelTab}
                  onChange={(e, value) => setRightPanelTab(value)}
                  variant='fullWidth'
                >
                  <Tab icon={<Chat />} />
                  <Tab icon={<Assignment />} />
                  <Tab icon={<Poll />} />
                  <Tab icon={<MenuBook />} />
                </Tabs>
              </Box>
              
              <Box sx={{ flex: 1, overflow: 'hidden' }}>
                {rightPanelTab === 0 && renderChatPanel()}
                {rightPanelTab === 1 && renderQAPanel()}
                {rightPanelTab === 2 && renderPollsPanel()}
                {rightPanelTab === 3 && renderMaterialsPanel()}
              </Box>
              
              <Box sx={{ p: 1, borderTop: 1, borderColor: 'divider', display: 'flex', justifyContent: 'flex-end' }}>
                <IconButton size='small' onClick={() => setRightPanelCollapsed(true)}>
                  <ChevronRight />
                </IconButton>
              </Box>
            </Box>
          )}
        </RightPanel>
      </ContentArea>

      {/* Control Bar */}
      <ControlBar>
        {/* Panel Toggle Buttons */}
        {leftPanelCollapsed && (
          <Tooltip title='Show Participants'>
            <IconButton onClick={() => setLeftPanelCollapsed(false)}>
              <People />
            </IconButton>
          </Tooltip>
        )}

        {/* Main Controls */}
        <Box sx={{ display: 'flex', gap: 1, mx: 'auto' }}>
          <Tooltip title={micEnabled ? 'Mute' : 'Unmute'}>
            <IconButton
              color={micEnabled ? 'primary' : 'default'}
              onClick={toggleMicrophone}
              sx={{
                bgcolor: micEnabled ? 'primary.light' : 'grey.200',
                '&:hover': { bgcolor: micEnabled ? 'primary.main' : 'grey.300' }
              }}
            >
              {micEnabled ? <Mic /> : <MicOff />}
            </IconButton>
          </Tooltip>

          <Tooltip title={cameraEnabled ? 'Turn off camera' : 'Turn on camera'}>
            <IconButton
              color={cameraEnabled ? 'primary' : 'default'}
              onClick={toggleCamera}
              sx={{
                bgcolor: cameraEnabled ? 'primary.light' : 'grey.200',
                '&:hover': { bgcolor: cameraEnabled ? 'primary.main' : 'grey.300' }
              }}
            >
              {cameraEnabled ? <Videocam /> : <VideocamOff />}
            </IconButton>
          </Tooltip>

          {isTeacher && (
            <Tooltip title={isScreenSharing ? 'Stop sharing' : 'Share screen'}>
              <IconButton
                color={isScreenSharing ? 'primary' : 'default'}
                onClick={toggleScreenShare}
                sx={{
                  bgcolor: isScreenSharing ? 'primary.light' : 'grey.200',
                  '&:hover': { bgcolor: isScreenSharing ? 'primary.main' : 'grey.300' }
                }}
              >
                {isScreenSharing ? <StopScreenShare /> : <ScreenShare />}
              </IconButton>
            </Tooltip>
          )}

          {!isTeacher && (
            <Tooltip title={handRaised ? 'Lower hand' : 'Raise hand'}>
              <IconButton
                color={handRaised ? 'warning' : 'default'}
                onClick={toggleHandRaise}
                sx={{
                  bgcolor: handRaised ? 'warning.light' : 'grey.200',
                  '&:hover': { bgcolor: handRaised ? 'warning.main' : 'grey.300' }
                }}
              >
                <RaiseHandIcon />
              </IconButton>
            </Tooltip>
          )}

          {isTeacher && (
            <Tooltip title={isRecording ? 'Stop recording' : 'Start recording'}>
              <IconButton
                color={isRecording ? 'error' : 'default'}
                onClick={toggleRecording}
                sx={{
                  bgcolor: isRecording ? 'error.light' : 'grey.200',
                  '&:hover': { bgcolor: isRecording ? 'error.main' : 'grey.300' }
                }}
              >
                {isRecording ? <Stop /> : <FiberManualRecord />}
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* Right Panel Toggle */}
        {rightPanelCollapsed && (
          <Tooltip title='Show Chat & Tools'>
            <IconButton onClick={() => setRightPanelCollapsed(false)}>
              <Chat />
            </IconButton>
          </Tooltip>
        )}
      </ControlBar>

      {/* Notifications */}
      {notifications.map((notification) => (
        <Snackbar
          key={notification.id}
          open={true}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          sx={{ mt: 8 }}
        >
          <Alert severity={notification.type} onClose={() => {
            setNotifications(prev => prev.filter(n => n.id !== notification.id));
          }}>
            {notification.message}
          </Alert>
        </Snackbar>
      ))}
    </MainContainer>
  );
};

export default ModernLiveClassRoom;
