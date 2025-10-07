import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  ListItemAvatar,
  Avatar,
  CircularProgress,
  Tooltip,
  Fab,
  Badge,
  Drawer,
  Divider,
  FormControlLabel,
  Switch,
  Card,
  CardContent,
  Menu,
  MenuItem,
  Snackbar,
  Select,
  ListItemSecondaryAction
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
  Stop as StopIcon,
  PanTool as HandRaiseIcon,
  Dashboard as WhiteboardIcon,
  Link as LinkIcon,
  MoreVert as MoreIcon,
  PersonAdd as PersonAddIcon,
  Block as BlockIcon,
  Send as SendIcon,
  EmojiEmotions as EmojiIcon,
  AttachFile as AttachFileIcon
} from '@mui/icons-material';
import { io } from 'socket.io-client';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useUserRole } from '../../contexts/UserRoleContext';
import EnhancedWebRTCManager from '../../utils/enhancedWebrtc';
import EnhancedClassSettings from './EnhancedClassSettings';
import EnhancedWhiteboard from './EnhancedWhiteboard';
import enhancedLiveClassAPI from '../../api/enhancedLiveClassApi';

// Multi-role configuration
const MULTI_ROLE_CONFIG = {
  autoAllowRoles: ['admin', 'hod', 'dean'],
  privilegedRoles: ['teacher', 'admin', 'hod', 'dean'],
  canJoinAnytime: ['admin', 'hod', 'dean'],
  canMuteAll: ['teacher', 'admin', 'hod', 'dean'],
  canEndClass: ['teacher', 'admin', 'hod', 'dean'],
  canRecord: ['teacher', 'admin', 'hod', 'dean']
};

const EnhancedLiveClassRoom = () => {
  const { accessToken, classId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token } = useUserRole();
  
  // Debug authentication
  console.log('🔐 Auth Debug - User from useUserRole:', user);
  console.log('🔐 Auth Debug - Token from useUserRole:', !!token);
  console.log('🔐 Auth Debug - Token length:', token?.length);
  
  // Core State
  const [classData, setClassData] = useState(null);
  const [participants, setParticipants] = useState(new Map());

  const [chatMessages, setChatMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [userRole, setUserRole] = useState('student');
  const [userPermissions, setUserPermissions] = useState({});
  const [scalabilityMode, setScalabilityMode] = useState(false);
  const [whiteboardNotes, setWhiteboardNotes] = useState([]);
  const [showWhiteboardNotes, setShowWhiteboardNotes] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [whiteboardData, setWhiteboardData] = useState(null);
  
  // Local user state for access token joins
  const [localUser, setLocalUser] = useState(null);
  const [localToken, setLocalToken] = useState(null);
  
  // Guest user state
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  
  // Helper functions to get current user and token
  const getCurrentUser = () => user || localUser;
  const getCurrentToken = () => token || localToken;
  
  // UI State
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  
  // Media State
  const [localStream, setLocalStream] = useState(null);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  
  // Chat State
  const [newMessage, setNewMessage] = useState('');
  const [privateChatTarget, setPrivateChatTarget] = useState(null);
  
  // Class Controls (Teacher only)
  const [classSettings, setClassSettings] = useState({
    allowStudentMic: true,  // Enable by default for testing
    allowStudentCamera: true,  // Enable by default for testing
    allowChat: true,
    enableHandRaise: true,
    enableWhiteboard: true  // Enable whiteboard by default
  });
  
  // Refs and Managers
  const localVideoRef = useRef(null);
  const remoteVideosRef = useRef(new Map());
  const webrtcManager = useRef(null);
  const socket = useRef(null);
  const chatEndRef = useRef(null);
  
  // Effects
  useEffect(() => {
    if (accessToken) {
      initializeClassByToken();
    } else if (classId) {
      initializeClassById();
    }
    
    return () => {
      cleanup();
    };
  }, [accessToken, classId, token]);
  

  
  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  // Update current user's stream in participants when localStream changes
  useEffect(() => {
    const currentUser = getCurrentUser();
    if (localStream && currentUser) {
      const currentUserId = currentUser.id || currentUser._id;
      setParticipants(prev => {
        const newParticipants = new Map(prev);
        const participant = newParticipants.get(currentUserId);
        if (participant) {
          participant.stream = localStream;
          newParticipants.set(currentUserId, participant);
        }
        return newParticipants;
      });
    }
  }, [localStream, user, localUser]);
  
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const initializeClassByToken = async (guestData = null) => {
    try {
      setLoading(true);
      setError('');
      
      // Prepare request data
      const requestData = { accessToken };
      if (guestData) {
        requestData.userName = guestData.name;
        requestData.userEmail = guestData.email;
      }
      
      // Enhanced join with multi-role support
      const response = await enhancedLiveClassAPI.joinByToken(requestData, getCurrentToken());
      
      if (response.requiresPassword) {
        setShowPasswordDialog(true);
        setLoading(false);
        return;
      }
      
      // Handle case where guest user info is required
      if (!response.success && !getCurrentToken() && !guestData) {
        setShowGuestForm(true);
        setLoading(false);
        return;
      }
      
      setClassData(response.liveClass);
      setUserRole(response.userRole);
      setUserPermissions(response.permissions);
      setClassSettings(response.liveClass.settings || {});
      setScalabilityMode(response.scalabilityMode);
      
      // Set local user data for access token joins
      if (response.user) {
        setLocalUser(response.user);
      }
      if (response.token) {
        setLocalToken(response.token);
      }
      
      // Load whiteboard notes for privileged users
      if (MULTI_ROLE_CONFIG.privilegedRoles.includes(response.userRole)) {
        loadWhiteboardNotes(response.liveClass._id);
      }
      
      // Initialize connection
      await initializeConnection(response.liveClass);
      
    } catch (err) {
      console.error('Error joining class by token:', err);
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const initializeClassById = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Get class details by ID (legacy support)
      const response = await enhancedLiveClassAPI.getClassDetails(classId, getCurrentToken());
      setClassData(response.liveClass);
      setClassSettings(response.liveClass.settings || {});
      
      // Determine user role and permissions
      const currentUser = getCurrentUser();
      const userId = currentUser?.id || currentUser?._id;
      const isTeacher = response.liveClass.teacher._id === userId;
      console.log('👤 User ID check:', { userId, teacherId: response.liveClass.teacher._id, isTeacher });
      const detectedRole = isTeacher ? 'teacher' : 'student';
      console.log('👤 Setting user role to:', detectedRole);
      setUserRole(detectedRole);
      setUserPermissions({
        canSpeak: isTeacher || response.liveClass.allowStudentMic,
        canVideo: isTeacher || response.liveClass.allowStudentCamera,
        canChat: response.liveClass.allowChat,
        canScreenShare: isTeacher,
        canControlClass: isTeacher,
        canRecord: isTeacher
      });
      
      // Direct join - enrollment is verified on backend
      
      await initializeConnection(response.liveClass, detectedRole);
      
    } catch (err) {
      console.error('Error initializing class by ID:', err);
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const initializeConnection = async (classData, passedUserRole = null) => {
    try {
      // Get current user and token once at the top
      const currentUser = getCurrentUser();
      const currentToken = getCurrentToken();
      
      // Cleanup existing socket connection to prevent duplicates
      if (socket.current) {
        console.log('🔌 Cleaning up existing socket connection');
        socket.current.removeAllListeners();
        socket.current.disconnect();
        socket.current = null;
      }
      
      // Initialize socket connection
      const jwtToken = localStorage.getItem('token') || sessionStorage.getItem('token') || currentToken;
      console.log('🔐 Socket Debug - Token from context/local:', !!currentToken, currentToken?.substring(0, 20) + '...');
      console.log('🔐 Socket Debug - Token from localStorage:', !!jwtToken, jwtToken?.substring(0, 20) + '...');
      console.log('🔐 Socket Debug - Socket URL:', process.env.REACT_APP_API_URL || window.location.origin);
      
      if (!jwtToken) {
        console.error('🚫 No authentication token available for Socket.IO');
        setError('Authentication failed. Please login again.');
        return;
      }
      
      // Use passed role or fall back to state role
      const effectiveUserRole = passedUserRole || userRole;
      console.log('🔐 Socket Auth - Using role:', effectiveUserRole, 'passed:', passedUserRole, 'state:', userRole);
      
      socket.current = io(process.env.REACT_APP_API_URL || window.location.origin, {
        auth: { 
          token: jwtToken,
          userId: currentUser?.id || currentUser?._id,
          userName: currentUser?.name,
          userEmail: currentUser?.email,
          userRole: effectiveUserRole
        },
        transports: ['websocket', 'polling']
      });
      
      setupSocketHandlers();
      
      // Initialize WebRTC
      webrtcManager.current = new EnhancedWebRTCManager();
      setupWebRTCHandlers();
      
      // Get user media (optional)
      try {
        const stream = await webrtcManager.current.getUserMedia({
          video: isVideoOn,
          audio: isAudioOn
        });
        
        if (stream) {
          console.log('🎥 Local stream obtained:', stream);
          console.log('🎥 Stream tracks:', stream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled })));
          setLocalStream(stream);
          
          // Assign stream to local video with retry mechanism
          const assignLocalVideo = () => {
            if (localVideoRef.current) {
              console.log('🎥 Assigning stream to local video element');
              localVideoRef.current.srcObject = stream;
              
              // Force play if paused
              localVideoRef.current.play().catch(e => {
                console.warn('🎥 Local video play failed:', e);
              });
              
              console.log('🎥 Local video element configured');
            } else {
              console.warn('🎥 Local video ref not ready, retrying...');
              setTimeout(assignLocalVideo, 100);
            }
          };
          
          assignLocalVideo();
        } else {
          console.log('⚠️ No media stream available - joining in data-only mode');
          setIsVideoOn(false);
          setIsAudioOn(false);
        }
        
      } catch (mediaError) {
        console.error('🚫 Failed to get user media:', mediaError);
        console.error('🚫 Error name:', mediaError.name);
        console.error('🚫 Error message:', mediaError.message);
        
        // Don't show error for device not found - just continue without media
        if (mediaError.name === 'NotFoundError') {
          console.log('⚠️ No media devices found - joining in data-only mode');
          setIsVideoOn(false);
          setIsAudioOn(false);
        } else if (mediaError.name === 'NotAllowedError') {
          console.warn('⚠️ Media access denied - joining in data-only mode');
          setIsVideoOn(false);
          setIsAudioOn(false);
        } else {
          console.warn('⚠️ Media error - joining in data-only mode:', mediaError.message);
          setIsVideoOn(false);
          setIsAudioOn(false);
        }
      }
      
      // Initialize WebRTC with class info
      const userId = currentUser?.id || currentUser?._id;
      const isTeacher = classData.teacher._id === userId;
      console.log('🔧 WebRTC Debug - User object:', currentUser);
      console.log('🔧 WebRTC Debug - Using userId:', userId);
      console.log('🔧 WebRTC Debug - Teacher ID:', classData.teacher._id);
      console.log('🔧 WebRTC Debug - Is Teacher (calculated):', isTeacher);
      console.log('🔧 WebRTC Debug - UserRole state:', userRole);
      console.log('🔧 WebRTC Debug - Passed UserRole:', passedUserRole);
      console.log('🔧 WebRTC Debug - Effective UserRole:', effectiveUserRole);
      console.log('🔧 WebRTC Debug - RoomId:', classData.roomId);
      
      await webrtcManager.current.initialize({
        roomId: classData.roomId,
        userId: userId,
        isTeacher: isTeacher,
        socket: socket.current
      });

      // Join room
      console.log('🚪 Joining room:', classData.roomId);
      const joinUserId = currentUser?.id || currentUser?._id;
      const joinIsTeacher = classData.teacher._id === joinUserId;
      console.log('🚪 User info:', { 
        userId: joinUserId, 
        userName: currentUser?.name, 
        userRole: effectiveUserRole,
        isTeacher: joinIsTeacher,
        teacherId: classData.teacher._id
      });
      
      // Always join room directly (no waiting room)
      console.log('🚪 Joining room:', classData.roomId);
      socket.current.emit('join-room', {
        roomId: classData.roomId,
        userId: joinUserId,
        userName: currentUser?.name,
        isTeacher: joinIsTeacher
      });
      
      setConnectionStatus('connected');
      setLoading(false); // End loading state after successful initialization
      
    } catch (error) {
      console.error('Error initializing connection:', error);
      setError('Failed to connect to class');
      setLoading(false); // End loading state even on error
    }
  };
  
  const setupSocketHandlers = () => {
    if (!socket.current) {
      console.log('🚫 Cannot setup socket handlers - socket not available');
      return;
    }
    
    console.log('🔧 Setting up socket event handlers...');
    console.log('🔧 Socket connected:', socket.current.connected);
    console.log('🔧 Socket ID:', socket.current.id);
    
    // Clear any existing listeners to prevent duplicates
    socket.current.removeAllListeners();
    console.log('🧹 Cleared existing socket listeners');
    
    // Connection events
    socket.current.on('connect', () => {
      console.log('🔗 Socket connected successfully');
      console.log('🔗 Socket ID:', socket.current.id);
      setConnectionStatus('connected');
    });

    socket.current.on('connect_error', (error) => {
      console.error('🚫 Socket connection error:', error);
      console.error('🚫 Error message:', error.message);
      if (error.message.includes('Authentication') || error.message.includes('token')) {
        setError('Authentication failed. Please refresh the page and try again.');
      } else {
        setError('Failed to connect to live class server: ' + error.message);
      }
    });

    socket.current.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      setConnectionStatus('disconnected');
    });

    socket.current.on('joined-room', (data) => {
      console.log('✅ Successfully joined room:', data);
      console.log('✅ Room ID:', data.roomId);
      console.log('✅ Is Teacher:', data.isTeacher);
      console.log('✅ Participant count:', data.participantCount);
      setConnectionStatus('connected');
    });
    
    socket.current.on('error', (data) => {
      setError(data.message);
    });
    

    

    

    

    
    // Participant events
    socket.current.on('participants-list', (participants) => {
      console.log('👥 Received participants list:', participants);
      const currentUser = getCurrentUser();
      const currentUserId = currentUser?.id || currentUser?._id;
      console.log('👤 Current user ID for comparison:', currentUserId);
      const participantMap = new Map();
      
      // Filter out current user from participants list to avoid duplicates
      const otherParticipants = participants.filter(p => p.userId !== currentUserId);
      
      otherParticipants.forEach(p => {
        console.log('👤 Adding participant:', p.userId, p.userName, 'isTeacher:', p.isTeacher);
        participantMap.set(p.userId, {
          userId: p.userId,
          userName: p.userName,
          isTeacher: p.isTeacher,
          isConnected: false,
          status: 'joined',
          stream: null, // Stream will be set when WebRTC connects
          role: p.role || (p.isTeacher ? 'teacher' : 'student')
        });
      });
      console.log('👥 Final participants map size (excluding self):', participantMap.size);
      setParticipants(participantMap);
    });
    
    socket.current.on('user-joined', (data) => {
      console.log('👤 User joined event:', data.userId, data.userName);
      const currentUserId = user.id || user._id;
      
      // Prevent adding current user or duplicates
      if (data.userId === currentUserId) {
        console.log('👤 Ignoring self-join event for:', data.userId);
        return;
      }
      
      setParticipants(prev => {
        // Check if participant already exists to avoid duplicates
        if (prev.has(data.userId)) {
          console.log('👤 Participant already exists, updating:', data.userId);
          const existing = prev.get(data.userId);
          return new Map(prev.set(data.userId, {
            ...existing,
            isConnected: true,
            status: 'joined'
          }));
        }
        
        console.log('👤 Adding new participant:', data.userId, data.userName);
        return new Map(prev.set(data.userId, {
          userId: data.userId,
          userName: data.userName,
          isTeacher: data.isTeacher,
          isConnected: false,
          stream: null,
          status: 'joined',
          role: data.role || (data.isTeacher ? 'teacher' : 'student')
        }));
      });
    });

    socket.current.on('user-left', (data) => {
      console.log('👤 User left:', data.userId);
      setParticipants(prev => {
        const newParticipants = new Map(prev);
        newParticipants.delete(data.userId);
        return newParticipants;
      });
    });
    
    // Chat events
    socket.current.on('chat-message', (data) => {
      setChatMessages(prev => [...prev, {
        id: Date.now() + Math.random(),
        ...data
      }]);
    });
    
    // Hand raise events
    socket.current.on('hand-raised', (data) => {
      setParticipants(prev => {
        const newParticipants = new Map(prev);
        const participant = newParticipants.get(data.userId);
        if (participant) {
          participant.status = 'hand-raised';
          participant.handRaisedAt = data.timestamp;
        }
        return newParticipants;
      });
    });
    
    socket.current.on('hand-lowered', (data) => {
      setParticipants(prev => {
        const newParticipants = new Map(prev);
        const participant = newParticipants.get(data.userId);
        if (participant) {
          participant.status = 'joined';
          participant.handRaisedAt = null;
        }
        return newParticipants;
      });
    });
    
    // Settings events
    socket.current.on('class-settings-updated', (data) => {
      setClassSettings(data.settings);
      setUserPermissions(prev => ({
        ...prev,
        canSpeak: userRole === 'teacher' || data.settings.allowStudentMic,
        canVideo: userRole === 'teacher' || data.settings.allowStudentCamera,
        canChat: data.settings.allowChat
      }));
    });
    
    // Whiteboard events
    socket.current.on('whiteboard-update', (data) => {
      console.log('📝 Whiteboard update received:', data);
      setWhiteboardData(data);
      // Note: The whiteboard component will handle the actual drawing update
    });
    
    socket.current.on('permissions-updated', (data) => {
      setUserPermissions(prev => ({
        ...prev,
        ...data.permissions
      }));
    });
    
    // Recording events
    socket.current.on('recording-status-changed', (data) => {
      setIsRecording(data.isRecording);
    });
    
    // Screen share events
    socket.current.on('screen-share-started', (data) => {
      // Handle screen share started by another user
    });
    
    socket.current.on('screen-share-stopped', (data) => {
      // Handle screen share stopped by another user
    });
  };
  
  const setupWebRTCHandlers = () => {
    if (!webrtcManager.current) return;
    
    webrtcManager.current.onRemoteStream = (userId, stream) => {
      console.log('🎥 Received remote stream from:', userId);
      console.log('🎥 Stream tracks:', stream.getTracks().length);
      
      remoteVideosRef.current.set(userId, stream);
      
      setParticipants(prev => {
        const newParticipants = new Map(prev);
        const participant = newParticipants.get(userId);
        console.log('🎥 Updating participant:', userId, 'exists:', !!participant);
        if (participant) {
          participant.stream = stream;
          participant.isConnected = true;
          console.log('🎥 Participant updated with stream');
        } else {
          console.log('🎥 Participant not found in map for stream');
        }
        return newParticipants;
      });
    };
    
    webrtcManager.current.onUserLeft = (userId) => {
      remoteVideosRef.current.delete(userId);
      setParticipants(prev => {
        const newParticipants = new Map(prev);
        newParticipants.delete(userId);
        return newParticipants;
      });
    };
    
    webrtcManager.current.onConnectionStateChange = (userId, state) => {
      setParticipants(prev => {
        const newParticipants = new Map(prev);
        const participant = newParticipants.get(userId);
        if (participant) {
          participant.connectionState = state;
        }
        return newParticipants;
      });
    };
  };
  
  const cleanup = () => {
    // Stop local stream tracks
    if (localStream) {
      localStream.getTracks().forEach(track => {
        track.stop();
      });
      setLocalStream(null);
    }
    
    if (webrtcManager.current) {
      webrtcManager.current.cleanup();
    }
    
    if (socket.current) {
      console.log('🔌 Disconnecting socket and removing listeners');
      socket.current.removeAllListeners();
      socket.current.disconnect();
      socket.current = null;
    }
    
    // Clear participants to prevent stale data
    setParticipants(new Map());
    
    remoteVideosRef.current.clear();
  };
  
  // Media Controls
  const toggleVideo = () => {
    if (webrtcManager.current) {
      const newState = webrtcManager.current.toggleVideo();
      setIsVideoOn(newState);
      
      // Update local stream video tracks if available
      if (localStream) {
        const videoTracks = localStream.getVideoTracks();
        videoTracks.forEach(track => {
          track.enabled = newState;
        });
      }
    }
  };
  
  const toggleAudio = () => {
    if (webrtcManager.current) {
      const newState = webrtcManager.current.toggleAudio();
      setIsAudioOn(newState);
      
      // Update local stream audio tracks if available
      if (localStream) {
        const audioTracks = localStream.getAudioTracks();
        audioTracks.forEach(track => {
          track.enabled = newState;
        });
      }
    }
  };
  
  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        await webrtcManager.current.startScreenShare();
        setIsScreenSharing(true);
        socket.current.emit('screen-share-started');
      } else {
        await webrtcManager.current.stopScreenShare();
        setIsScreenSharing(false);
        socket.current.emit('screen-share-stopped');
      }
    } catch (err) {
      setError('Failed to toggle screen sharing: ' + err.message);
    }
  };
  
  const toggleRecording = () => {
    if (userRole !== 'teacher') return;
    
    if (isRecording) {
      socket.current.emit('recording-stopped');
    } else {
      socket.current.emit('recording-started');
    }
  };
  
  const toggleHandRaise = () => {
    if (userRole === 'teacher') return;
    
    if (isHandRaised) {
      socket.current.emit('lower-hand');
      setIsHandRaised(false);
    } else {
      socket.current.emit('raise-hand');
      setIsHandRaised(true);
    }
  };
  
  // Chat Functions
  const sendChatMessage = () => {
    if (newMessage.trim() && socket.current && userPermissions.canChat) {
      const currentUser = getCurrentUser();
      const messageData = {
        message: newMessage.trim(),
        messageType: 'text',
        isPrivate: !!privateChatTarget,
        recipient: privateChatTarget,
        userName: currentUser?.name || 'Unknown User',
        senderId: currentUser?.id || currentUser?._id,
        role: userRole,
        isFromTeacher: userRole === 'teacher' || MULTI_ROLE_CONFIG.privilegedRoles.includes(userRole),
        timestamp: new Date().toISOString()
      };
      
      socket.current.emit('chat-message', messageData);
      
      // Add to local messages for immediate feedback
      setChatMessages(prev => [...prev, {
        id: Date.now() + Math.random(),
        ...messageData
      }]);
      
      setNewMessage('');
    }
  };
  
  // Teacher Controls
  const updateClassSettings = async (newSettings) => {
    if (userRole !== 'teacher') return;
    
    try {
      // Update backend
      await enhancedLiveClassAPI.updateClassSettings(classData._id, { settings: newSettings }, getCurrentToken());
      
      // Update local state
      setClassSettings(newSettings);
      
      // Update user permissions based on new settings
      if (userRole === 'student') {
        setUserPermissions(prev => ({
          ...prev,
          canSpeak: newSettings.allowStudentMic,
          canVideo: newSettings.allowStudentCamera,
          canChat: newSettings.allowChat
        }));
      }
      
      // Broadcast settings change to all participants via socket
      if (socket.current) {
        socket.current.emit('class-settings-updated', {
          roomId: classData.roomId,
          settings: newSettings
        });
      }
      
      console.log('✅ Class settings updated successfully:', newSettings);
      setError('Settings updated successfully!');
      setTimeout(() => setError(''), 3000);
      
    } catch (error) {
      console.error('❌ Error updating class settings:', error);
      setError('Failed to update class settings: ' + (error.response?.data?.message || error.message));
    }
  };
  
  const toggleStudentPermission = (studentUserId, permissionType) => {
    if (userRole !== 'teacher' || !socket.current) return;
    
    const participant = participants.get(studentUserId);
    if (!participant) return;
    
    const currentValue = participant.permissions?.[permissionType] || false;
    
    socket.current.emit('toggle-student-permissions', {
      studentUserId,
      permissionType,
      enabled: !currentValue
    });
  };
  
  const handleParticipantAction = (participantUserId, action) => {
    if (userRole !== 'teacher' || !socket.current) return;
    
    switch (action) {
      case 'remove':
        socket.current.emit('remove-participant', { userId: participantUserId });
        break;
      case 'mute':
        socket.current.emit('force-mute', { userId: participantUserId });
        break;
      case 'disable-camera':
        socket.current.emit('force-disable-camera', { userId: participantUserId });
        break;
    }
  };
  
  // Load whiteboard notes
  const loadWhiteboardNotes = async (classId) => {
    try {
      const response = await enhancedLiveClassAPI.getWhiteboardNotes(classId, getCurrentToken());
      if (response.success) {
        setWhiteboardNotes(response.notes);
      }
    } catch (error) {
      console.error('Error loading whiteboard notes:', error);
    }
  };
  
  // Save whiteboard as note
  const saveWhiteboardNote = async (title, content, description = '', tags = []) => {
    try {
      const response = await enhancedLiveClassAPI.saveWhiteboardNote(
        classData._id, 
        { title, content, description, tags },
        getCurrentToken()
      );
      if (response.success) {
        setWhiteboardNotes(prev => [...prev, response.note]);
        setError('Whiteboard note saved successfully!');
      }
    } catch (error) {
      console.error('Error saving whiteboard note:', error);
      setError('Failed to save whiteboard note');
    }
  };

  // Handle whiteboard updates
  const handleWhiteboardUpdate = (drawingData) => {
    if (socket.current) {
      socket.current.emit('whiteboard-update', {
        drawingData,
        roomId: classData?.roomId,
        allowStudentDraw: classSettings.enableWhiteboard
      });
    }
  };
  
  // Check if user has specific permission
  const hasPermission = (permission) => {
    if (MULTI_ROLE_CONFIG.autoAllowRoles.includes(userRole)) {
      return true;
    }
    return userPermissions[permission] || false;
  };
  
  const copyJoinLink = () => {
    const joinUrl = `${window.location.origin}/live-class/join/${classData?.accessToken || accessToken}`;
    navigator.clipboard.writeText(joinUrl);
    setError('Join link copied to clipboard!');
  };
  
  const handleGuestJoin = async () => {
    if (!guestName.trim()) {
      setError('Please enter your name');
      return;
    }
    
    setShowGuestForm(false);
    await initializeClassByToken({
      name: guestName.trim(),
      email: guestEmail.trim() || `guest_${Date.now()}@temp.com`
    });
  };
  

  
  const leaveClass = () => {
    cleanup();
    navigate(userRole === 'teacher' ? '/teacher/live-classes' : '/student/live-classes');
  };
  
  // Render Components
  const renderVideoGrid = () => {
    const allParticipants = Array.from(participants.values());
    const totalParticipants = allParticipants.length + 1; // +1 for local user
    
    console.log('🎬 Rendering video grid:');
    console.log('🎬 Participants count:', allParticipants.length);
    console.log('🎬 Participants:', allParticipants);
    console.log('🎬 Total participants including self:', totalParticipants);
    
    // Calculate grid layout
    const columns = Math.ceil(Math.sqrt(totalParticipants));
    const rows = Math.ceil(totalParticipants / columns);
    
    return (
      <Grid container spacing={1} sx={{ height: '100%', p: 1 }}>
        {/* Local Video */}
        <Grid item xs={12/columns} sx={{ height: `${100/rows}%` }}>
          <Paper sx={{ 
            height: '100%', 
            minHeight: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'black',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              onLoadedMetadata={() => {
                console.log('🎥 Local video metadata loaded');
              }}
              onPlay={() => {
                console.log('🎥 Local video started playing');
              }}
              onError={(e) => {
                console.error('🎥 Local video error:', e);
              }}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
            
            <Box sx={{
              position: 'absolute',
              bottom: 8,
              left: 8,
              bgcolor: 'rgba(0,0,0,0.7)',
              color: 'white',
              px: 1,
              py: 0.5,
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 0.5
            }}>
              <Typography variant="caption">
                You ({userRole})
              </Typography>
              {!isAudioOn && <MicOffIcon sx={{ fontSize: 14 }} />}
              {!isVideoOn && <VideocamOffIcon sx={{ fontSize: 14 }} />}
            </Box>
          </Paper>
        </Grid>
        
        {/* Remote Videos */}
        {allParticipants.map((participant, index) => (
          <Grid item xs={12/columns} key={participant.userId} sx={{ height: `${100/rows}%` }}>
            <Paper sx={{ 
              height: '100%', 
              minHeight: 200,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'black',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {participant.stream ? (
                <video
                  autoPlay
                  playsInline
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                  ref={(el) => {
                    if (el && participant.stream) {
                      el.srcObject = participant.stream;
                    }
                  }}
                />
              ) : (
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  color: 'white'
                }}>
                  <Avatar sx={{ width: 64, height: 64, mb: 1 }}>
                    {participant.userName?.charAt(0)?.toUpperCase()}
                  </Avatar>
                  <Typography variant="body2">
                    {participant.isConnected ? 'Camera Off' : 'Connecting...'}
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
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5
              }}>
                <Typography variant="caption">
                  {participant.userName}
                  {participant.isTeacher && ' (Teacher)'}
                </Typography>
                
                {participant.status === 'hand-raised' && (
                  <Badge
                    color="warning"
                    variant="dot"
                    sx={{
                      '& .MuiBadge-badge': {
                        backgroundColor: '#ff9800',
                        animation: 'pulse 2s infinite'
                      }
                    }}
                  >
                    <HandRaiseIcon sx={{ fontSize: 14, color: '#ff9800' }} />
                  </Badge>
                )}
                
                {userRole === 'teacher' && !participant.isTeacher && (
                  <Tooltip title="Student Controls">
                    <MoreIcon 
                      sx={{ fontSize: 14, cursor: 'pointer' }}
                      onClick={(e) => {
                        // Show participant control menu
                      }}
                    />
                  </Tooltip>
                )}
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>
    );
  };
  
  const renderChatPanel = () => (
    <Drawer
      anchor="right"
      open={showChat}
      onClose={() => setShowChat(false)}
      PaperProps={{
        sx: { width: 400 }
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Chat Header */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6">Class Chat</Typography>
          {privateChatTarget && (
            <Chip
              label={`Private chat with ${participants.get(privateChatTarget)?.userName}`}
              onDelete={() => setPrivateChatTarget(null)}
              size="small"
              sx={{ mt: 1 }}
            />
          )}
          
          {/* Chat Type Selector for Teachers/Privileged Users */}
          {(userRole === 'teacher' || MULTI_ROLE_CONFIG.privilegedRoles.includes(userRole)) && (
            <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
              <Button
                size="small"
                variant={!privateChatTarget ? 'contained' : 'outlined'}
                onClick={() => setPrivateChatTarget(null)}
              >
                Public Chat
              </Button>
              <Select
                size="small"
                value={privateChatTarget || ''}
                onChange={(e) => setPrivateChatTarget(e.target.value)}
                displayEmpty
                sx={{ minWidth: 120 }}
              >
                <MenuItem value="">
                  <em>Select Student</em>
                </MenuItem>
                {Array.from(participants.values())
                  .filter(p => p.role === 'student' || (!p.isTeacher && !MULTI_ROLE_CONFIG.privilegedRoles.includes(p.role)))
                  .map((participant) => (
                    <MenuItem key={participant.userId} value={participant.userId}>
                      {participant.userName}
                    </MenuItem>
                  ))}
              </Select>
            </Box>
          )}
        </Box>
        
        {/* Chat Messages */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
          <List dense>
            {chatMessages
              .filter(msg => {
                // Show all public messages
                if (!msg.isPrivate) return true;
                
                // For private messages, show if user is sender, recipient, or teacher
                if (msg.isPrivate) {
                  const currentUser = getCurrentUser();
                  const currentUserId = currentUser?.id || currentUser?._id;
                  const isInvolved = msg.senderId === currentUserId || 
                                   msg.recipient === currentUserId ||
                                   MULTI_ROLE_CONFIG.privilegedRoles.includes(userRole);
                  return isInvolved;
                }
                
                return false;
              })
              .map((msg) => (
              <ListItem 
                key={msg.id} 
                sx={{ 
                  flexDirection: 'column', 
                  alignItems: 'flex-start',
                  bgcolor: msg.isPrivate ? 'action.hover' : 'transparent',
                  borderRadius: 1,
                  mb: 0.5,
                  border: msg.isPrivate ? '1px solid' : 'none',
                  borderColor: msg.isPrivate ? 'warning.light' : 'transparent'
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', mb: 0.5 }}>
                  <Avatar sx={{ width: 24, height: 24, mr: 1, fontSize: '0.75rem' }}>
                    {msg.userName?.charAt(0)?.toUpperCase()}
                  </Avatar>
                  <Typography 
                    variant="caption" 
                    fontWeight={msg.isFromTeacher ? 'bold' : 'normal'}
                    color={msg.isFromTeacher ? 'primary.main' : 'text.primary'}
                  >
                    {msg.userName}
                    {msg.isFromTeacher && ' (Teacher)'}
                    {msg.isPrivate && ' (Private)'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ ml: 4, wordBreak: 'break-word' }}>
                  {msg.message}
                </Typography>
                {msg.isPrivate && (
                  <Typography variant="caption" color="warning.main" sx={{ ml: 4, fontStyle: 'italic' }}>
                    {(() => {
                      const currentUser = getCurrentUser();
                      const currentUserId = currentUser?.id || currentUser?._id;
                      return msg.senderId === currentUserId ? 
                        `To: ${participants.get(msg.recipient)?.userName || 'Teacher'}` :
                        `From: ${msg.userName}`;
                    })()}
                  </Typography>
                )}
              </ListItem>
            ))}
            <div ref={chatEndRef} />
          </List>
        </Box>
        
        {/* Chat Input */}
        {userPermissions.canChat && (
          <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
            {privateChatTarget && (
              <Alert severity="info" sx={{ mb: 1 }}>
                Sending private message to {participants.get(privateChatTarget)?.userName}
              </Alert>
            )}
            
            {/* Message Type Info for Students */}
            {userRole === 'student' && !privateChatTarget && (
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                {userRole === 'student' ? 
                  'Students can chat publicly or privately with teacher' : 
                  'You can chat with everyone'
                }
              </Typography>
            )}
            
            {/* Private Chat Option for Students */}
            {userRole === 'student' && (
              <Box sx={{ mb: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={!!privateChatTarget}
                      onChange={(e) => {
                        if (e.target.checked) {
                          // Find teacher user ID
                          const teacher = Array.from(participants.values()).find(p => p.isTeacher) || 
                                        { userId: classData?.teacher?._id };
                          setPrivateChatTarget(teacher.userId);
                        } else {
                          setPrivateChatTarget(null);
                        }
                      }}
                    />
                  }
                  label="Private message to teacher"
                />
              </Box>
            )}
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                placeholder={
                  privateChatTarget ? 
                    `Private message to ${participants.get(privateChatTarget)?.userName || 'Teacher'}...` :
                    "Type a message..."
                }
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendChatMessage()}
                multiline
                maxRows={3}
              />
              <IconButton 
                onClick={sendChatMessage}
                disabled={!newMessage.trim()}
                color="primary"
              >
                <SendIcon />
              </IconButton>
            </Box>
          </Box>
        )}
      </Box>
    </Drawer>
  );
  
  const renderParticipantsPanel = () => {
    console.log('Rendering participants panel, showParticipants:', showParticipants);
    console.log('Participants data:', participants);
    return (
    <Drawer
      anchor="left"
      open={showParticipants}
      onClose={() => setShowParticipants(false)}
      PaperProps={{
        sx: { width: 350 }
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Participants Header */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6">
            Participants ({participants.size + 1})
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {classData?.title}
          </Typography>
        </Box>
        
        {/* Participants List */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          <List>
            {/* Current User */}
            <ListItem sx={{ bgcolor: 'action.selected' }}>
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  {getCurrentUser()?.name?.charAt(0)?.toUpperCase() || 'Y'}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body1" fontWeight="bold">
                      You ({userRole})
                    </Typography>
                    {userRole === 'teacher' && (
                      <Chip label="Host" size="small" color="primary" />
                    )}
                    {MULTI_ROLE_CONFIG.privilegedRoles.includes(userRole) && userRole !== 'teacher' && (
                      <Chip label={userRole.toUpperCase()} size="small" color="secondary" />
                    )}
                  </Box>
                }
                secondary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                    {!isAudioOn && (
                      <Chip 
                        icon={<MicOffIcon />} 
                        label="Muted" 
                        size="small" 
                        variant="outlined" 
                        sx={{ height: 20 }}
                      />
                    )}
                    {!isVideoOn && (
                      <Chip 
                        icon={<VideocamOffIcon />} 
                        label="Camera Off" 
                        size="small" 
                        variant="outlined" 
                        sx={{ height: 20 }}
                      />
                    )}
                    {isScreenSharing && (
                      <Chip 
                        icon={<ScreenShareIcon />} 
                        label="Sharing" 
                        size="small" 
                        color="info" 
                        sx={{ height: 20 }}
                      />
                    )}
                    {isHandRaised && (
                      <Chip 
                        icon={<HandRaiseIcon />} 
                        label="Hand Raised" 
                        size="small" 
                        color="warning" 
                        sx={{ height: 20 }}
                      />
                    )}
                  </Box>
                }
              />
            </ListItem>
            
            <Divider sx={{ my: 1 }} />
            
            {/* Other Participants */}
            {Array.from(participants.values())
              .sort((a, b) => {
                // Sort by: teachers first, then by connection status, then by name
                if (a.isTeacher && !b.isTeacher) return -1;
                if (!a.isTeacher && b.isTeacher) return 1;
                if (a.isConnected && !b.isConnected) return -1;
                if (!a.isConnected && b.isConnected) return 1;
                return (a.userName || '').localeCompare(b.userName || '');
              })
              .map((participant) => (
                <ListItem 
                  key={participant.userId}
                  sx={{
                    '&:hover': { bgcolor: 'action.hover' },
                    opacity: participant.isConnected ? 1 : 0.7
                  }}
                >
                  <ListItemAvatar>
                    <Avatar 
                      sx={{ 
                        bgcolor: participant.isTeacher ? 'primary.main' : 
                                MULTI_ROLE_CONFIG.privilegedRoles.includes(participant.role) ? 'secondary.main' :
                                'success.main',
                        border: participant.status === 'hand-raised' ? '2px solid orange' : 'none'
                      }}
                    >
                      {participant.userName?.charAt(0)?.toUpperCase() || 'U'}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography 
                          variant="body2" 
                          fontWeight={participant.isTeacher ? 'bold' : 'normal'}
                        >
                          {participant.userName}
                        </Typography>
                        {participant.isTeacher && (
                          <Chip label="Teacher" size="small" color="primary" />
                        )}
                        {MULTI_ROLE_CONFIG.privilegedRoles.includes(participant.role) && !participant.isTeacher && (
                          <Chip 
                            label={participant.role?.toUpperCase()} 
                            size="small" 
                            color="secondary" 
                          />
                        )}
                        {!participant.isConnected && (
                          <Chip 
                            label="Connecting..." 
                            size="small" 
                            color="warning" 
                            variant="outlined" 
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                        {participant.status === 'hand-raised' && (
                          <Chip 
                            icon={<HandRaiseIcon />} 
                            label="Hand Raised" 
                            size="small" 
                            color="warning" 
                            sx={{ height: 20 }}
                          />
                        )}
                        {!participant.permissions?.canSpeak && (
                          <Chip 
                            icon={<MicOffIcon />} 
                            label="Muted" 
                            size="small" 
                            variant="outlined" 
                            sx={{ height: 20 }}
                          />
                        )}
                        {!participant.permissions?.canVideo && (
                          <Chip 
                            icon={<VideocamOffIcon />} 
                            label="Camera Off" 
                            size="small" 
                            variant="outlined" 
                            sx={{ height: 20 }}
                          />
                        )}
                        {participant.connectionState && (
                          <Typography 
                            variant="caption" 
                            color={participant.connectionState === 'connected' ? 'success.main' : 'warning.main'}
                          >
                            {participant.connectionState}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  
                  {/* Participant Controls (Teacher Only) */}
                  {(userRole === 'teacher' || MULTI_ROLE_CONFIG.canMuteAll.includes(userRole)) && 
                   !participant.isTeacher && 
                   !MULTI_ROLE_CONFIG.privilegedRoles.includes(participant.role) && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Menu
                        anchorEl={null}
                        open={false}
                        onClose={() => {}}
                      >
                        <MenuItem onClick={() => handleParticipantAction(participant.userId, 'mute')}>
                          <MicOffIcon sx={{ mr: 1 }} />
                          Mute
                        </MenuItem>
                        <MenuItem onClick={() => handleParticipantAction(participant.userId, 'disable-camera')}>
                          <VideocamOffIcon sx={{ mr: 1 }} />
                          Disable Camera
                        </MenuItem>
                        <MenuItem onClick={() => toggleStudentPermission(participant.userId, 'canSpeak')}>
                          <MicIcon sx={{ mr: 1 }} />
                          Toggle Mic Permission
                        </MenuItem>
                        <MenuItem onClick={() => toggleStudentPermission(participant.userId, 'canVideo')}>
                          <VideocamIcon sx={{ mr: 1 }} />
                          Toggle Camera Permission
                        </MenuItem>
                        <Divider />
                        <MenuItem 
                          onClick={() => setPrivateChatTarget(participant.userId)}
                          sx={{ color: 'primary.main' }}
                        >
                          <ChatIcon sx={{ mr: 1 }} />
                          Private Chat
                        </MenuItem>
                        <MenuItem 
                          onClick={() => handleParticipantAction(participant.userId, 'remove')}
                          sx={{ color: 'error.main' }}
                        >
                          <BlockIcon sx={{ mr: 1 }} />
                          Remove
                        </MenuItem>
                      </Menu>
                      
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          // Open participant menu
                          e.stopPropagation();
                        }}
                      >
                        <MoreIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  )}
                  
                  {/* Quick Chat Button for Teachers */}
                  {(userRole === 'teacher' || MULTI_ROLE_CONFIG.privilegedRoles.includes(userRole)) &&
                   participant.role === 'student' && (
                    <IconButton
                      size="small"
                      onClick={() => {
                        setPrivateChatTarget(participant.userId);
                        setShowChat(true);
                        setShowParticipants(false);
                      }}
                      sx={{ ml: 1 }}
                    >
                      <ChatIcon fontSize="small" />
                    </IconButton>
                  )}
                </ListItem>
              ))}
            
            {participants.size === 0 && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="text.secondary">
                  No other participants yet
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Share the join link to invite others
                </Typography>
              </Box>
            )}
          </List>
        </Box>
        
        {/* Participants Footer */}
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<LinkIcon />}
            onClick={copyJoinLink}
            size="small"
          >
            Copy Join Link
          </Button>
          
          {userRole === 'teacher' && (
            <Button
              fullWidth
              variant="outlined"
              startIcon={<PersonAddIcon />}
              onClick={() => {
                // Open invite dialog or show join link
                setError('Share join link: ' + window.location.origin + '/live-class/join/' + (classData?.accessToken || accessToken));
              }}
              size="small"
              sx={{ mt: 1 }}
            >
              Invite Participants
            </Button>
          )}
        </Box>
      </Box>
    </Drawer>
    );
  };
  

  
  const renderControls = () => (
    <Box sx={{ 
      bgcolor: 'background.paper', 
      p: 2, 
      display: 'flex', 
      justifyContent: 'center',
      alignItems: 'center',
      gap: 1,
      borderTop: 1,
      borderColor: 'divider',
      flexWrap: 'wrap'
    }}>
      {/* Media Controls */}
      <Tooltip title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}>
        <IconButton 
          onClick={toggleVideo}
          disabled={!userPermissions.canVideo}
          sx={{ 
            bgcolor: isVideoOn ? 'primary.light' : 'grey.300',
            color: isVideoOn ? 'primary.contrastText' : 'text.secondary'
          }}
        >
          {isVideoOn ? <VideocamIcon /> : <VideocamOffIcon />}
        </IconButton>
      </Tooltip>
      
      <Tooltip title={isAudioOn ? 'Mute microphone' : 'Unmute microphone'}>
        <IconButton 
          onClick={toggleAudio}
          disabled={!userPermissions.canSpeak}
          sx={{ 
            bgcolor: isAudioOn ? 'primary.light' : 'grey.300',
            color: isAudioOn ? 'primary.contrastText' : 'text.secondary'
          }}
        >
          {isAudioOn ? <MicIcon /> : <MicOffIcon />}
        </IconButton>
      </Tooltip>
      
      {/* Screen Share */}
      {userPermissions.canScreenShare && (
        <Tooltip title={isScreenSharing ? 'Stop sharing' : 'Share screen'}>
          <IconButton 
            onClick={toggleScreenShare}
            sx={{ 
              bgcolor: isScreenSharing ? 'secondary.light' : 'grey.300',
              color: isScreenSharing ? 'secondary.contrastText' : 'text.secondary'
            }}
          >
            {isScreenSharing ? <StopScreenShareIcon /> : <ScreenShareIcon />}
          </IconButton>
        </Tooltip>
      )}
      
      {/* Hand Raise (Students only) */}
      {userRole === 'student' && classSettings.enableHandRaise && (
        <Tooltip title={isHandRaised ? 'Lower hand' : 'Raise hand'}>
          <IconButton 
            onClick={toggleHandRaise}
            sx={{ 
              bgcolor: isHandRaised ? 'warning.light' : 'grey.300',
              color: isHandRaised ? 'warning.contrastText' : 'text.secondary'
            }}
          >
            <HandRaiseIcon />
          </IconButton>
        </Tooltip>
      )}
      
      {/* Recording (Teacher only) */}
      {userPermissions.canRecord && (
        <Tooltip title={isRecording ? 'Stop recording' : 'Start recording'}>
          <IconButton 
            onClick={toggleRecording}
            sx={{ 
              bgcolor: isRecording ? 'error.light' : 'grey.300',
              color: isRecording ? 'error.contrastText' : 'text.secondary'
            }}
          >
            {isRecording ? <StopIcon /> : <RecordIcon />}
          </IconButton>
        </Tooltip>
      )}
      
      {/* Chat */}
      <Tooltip title="Toggle chat">
        <IconButton 
          onClick={() => setShowChat(!showChat)}
          sx={{ 
            bgcolor: showChat ? 'primary.light' : 'grey.300',
            color: showChat ? 'primary.contrastText' : 'text.secondary'
          }}
        >
          <Badge badgeContent={chatMessages.length} color="error" max={99}>
            <ChatIcon />
          </Badge>
        </IconButton>
      </Tooltip>
      
      {/* Participants */}
      <Tooltip title="Participants">
        <IconButton 
          onClick={() => {
            console.log('Participants button clicked, current state:', showParticipants);
            console.log('Participants data:', participants);
            setShowParticipants(!showParticipants);
          }}
          sx={{ 
            bgcolor: showParticipants ? 'primary.light' : 'grey.300',
            color: showParticipants ? 'primary.contrastText' : 'text.secondary'
          }}
        >
          <Badge badgeContent={participants.size + 1} color="primary" max={99}>
            <PeopleIcon />
          </Badge>
        </IconButton>
      </Tooltip>
      
      
      {/* Whiteboard (Teacher and enabled students) */}
      {(userPermissions.canControlClass || classSettings.enableWhiteboard) && (
        <Tooltip title="Whiteboard">
          <IconButton 
            onClick={() => setShowWhiteboard(true)}
            sx={{
              bgcolor: showWhiteboard ? 'primary.main' : 'grey.300',
              color: showWhiteboard ? 'primary.contrastText' : 'text.secondary'
            }}
          >
            <WhiteboardIcon />
          </IconButton>
        </Tooltip>
      )}
      
      {/* Settings (Teacher only) */}
      {userPermissions.canControlClass && (
        <Tooltip title="Settings">
          <IconButton onClick={() => {
            console.log('Settings button clicked, current state:', showSettings);
            console.log('User permissions:', userPermissions);
            setShowSettings(true);
          }}>
            <SettingsIcon />
          </IconButton>
        </Tooltip>
      )}
      
      {/* Copy Join Link */}
      <Tooltip title="Copy join link">
        <IconButton onClick={copyJoinLink}>
          <LinkIcon />
        </IconButton>
      </Tooltip>
      
      {/* Leave */}
      <Tooltip title="Leave class">
        <IconButton onClick={leaveClass} color="error">
          <ExitIcon />
        </IconButton>
      </Tooltip>
    </Box>
  );
  
  // Authentication Check
  // Allow access if user has valid authentication OR if joining via access token
  const currentUser = getCurrentUser();
  const currentToken = getCurrentToken();
  const hasAuthentication = (currentUser && currentToken) || accessToken;
  
  // Show guest form if no authentication and access token provided
  if (!hasAuthentication && !showGuestForm) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Loading authentication...
        </Typography>
      </Box>
    );
  }

  // Main Render
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
        <Button onClick={() => navigate('/')} sx={{ mt: 2 }}>
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
        borderColor: 'divider',
        zIndex: 1100
      }}>
        <Box>
          <Typography variant="h6" noWrap>
            {classData?.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {classData?.sections?.map(s => s.name).join(', ') || classData?.section?.name} - {classData?.course?.courseCode}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Chip 
            icon={isRecording ? <RecordIcon /> : null}
            label={isRecording ? 'Recording' : `${participants.size + 1} participants`}
            color={isRecording ? 'error' : 'default'}
            variant={isRecording ? 'filled' : 'outlined'}
            size="small"
          />
          
          <Chip 
            label={connectionStatus}
            color={connectionStatus === 'connected' ? 'success' : 'warning'}
            size="small"
          />
          

        </Box>
      </Box>
      
      {/* Error Display */}
      {error && (
        <Alert 
          severity={error.includes('copied') ? 'success' : 'error'} 
          sx={{ m: 1 }}
          onClose={() => setError('')}
        >
          {error}
        </Alert>
      )}
      
      {/* Main Content */}
      <Box sx={{ flex: 1, display: 'flex', position: 'relative' }}>
        {/* Video Grid */}
        <Box sx={{ flex: 1 }}>
          {renderVideoGrid()}
        </Box>
        
        {/* Chat Panel */}
        {renderChatPanel()}
        
        {/* Participants Panel */}
        {renderParticipantsPanel()}
      </Box>
      
      {/* Controls */}
      {renderControls()}
      

      
      {/* Settings Dialog */}
      <EnhancedClassSettings
        open={showSettings}
        onClose={() => setShowSettings(false)}
        classData={classData}
        classSettings={classSettings}
        onSettingsUpdate={updateClassSettings}
        participants={participants}
        userRole={userRole}
        onParticipantAction={handleParticipantAction}
        webrtcManager={webrtcManager}
      />
      
      {/* Whiteboard Dialog */}
      <EnhancedWhiteboard
        open={showWhiteboard}
        onClose={() => setShowWhiteboard(false)}
        onSave={saveWhiteboardNote}
        onUpdate={handleWhiteboardUpdate}
        userRole={userRole}
        whiteboardNotes={whiteboardNotes}
        initialData={whiteboardData}
      />
      
      {/* Password Dialog */}
      <Dialog open={showPasswordDialog} onClose={() => {}}>
        <DialogTitle>Class Password Required</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Password"
            type="password"
            fullWidth
            variant="outlined"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                // Handle password submission
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => navigate('/')}>Cancel</Button>
          <Button onClick={() => {
            // Handle password submission
          }}>
            Join
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Guest User Form Dialog */}
      <Dialog open={showGuestForm} onClose={() => {}}>
        <DialogTitle>Join as Guest</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Please provide your information to join the live class
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Your Name *"
            type="text"
            fullWidth
            variant="outlined"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Email (optional)"
            type="email"
            fullWidth
            variant="outlined"
            value={guestEmail}
            onChange={(e) => setGuestEmail(e.target.value)}
            helperText="Optional - for receiving class updates"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => navigate('/')}>Cancel</Button>
          <Button 
            onClick={handleGuestJoin}
            disabled={!guestName.trim()}
            variant="contained"
          >
            Join Class
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EnhancedLiveClassRoom;