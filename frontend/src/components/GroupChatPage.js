import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  List,
  ListItem,
  Avatar,
  Chip,
  Alert,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Send as SendIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { io } from 'socket.io-client';
import axios from 'axios';

const GroupChatPage = () => {
  const { courseId, sectionId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [courseInfo, setCourseInfo] = useState(null);
  const [sectionInfo, setSectionInfo] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, messageId: null });
  const [currentUser, setCurrentUser] = useState(null);
  
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Color scheme
  const colors = {
    primary: '#395a7f', // YInMn Blue
    secondary: '#6e9fc1', // Air superiority blue
    tertiary: '#a3cae9', // Uranian Blue
    background: '#e9ecee', // Anti-flash white
    text: '#acacac' // Silver
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    // Load current user info
    loadCurrentUser();

    // Initialize socket connection
    const newSocket = io('https://10.20.50.12:3000/group-chat', {
      auth: { token }
    });

    newSocket.on('connect', () => {
      console.log('🔗 Connected to group chat');
      console.log('🔗 Socket ID:', newSocket.id);
      console.log('🔗 Emitting join-chat with:', { courseId, sectionId });
      setConnected(true);
      // Join the specific chat room
      newSocket.emit('join-chat', { courseId, sectionId });
    });

    newSocket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from group chat. Reason:', reason);
      setConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('🚫 Connection error:', error);
      setError('Failed to connect to chat server');
    });

    newSocket.on('joined-chat', (data) => {
      console.log('✅ Joined chat room:', data);
      loadMessages();
    });

    newSocket.on('new-message', (message) => {
      console.log('📨 New message received:', message);
      setMessages(prev => [...prev, message]);
    });

    newSocket.on('message-deleted', (data) => {
      console.log('🗑️ Message deleted:', data);
      setMessages(prev => prev.filter(msg => msg._id !== data.messageId));
    });

    newSocket.on('user-typing', (data) => {
      setTypingUsers(prev => {
        if (!prev.find(u => u.userId === data.userId)) {
          return [...prev, data];
        }
        return prev;
      });
    });

    newSocket.on('user-stopped-typing', (data) => {
      setTypingUsers(prev => prev.filter(u => u.userId !== data.userId));
    });

    newSocket.on('chat-error', (data) => {
      console.error('🚨 Chat error:', data);
      setError(data.message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [courseId, sectionId, navigate]);

  const loadMessages = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `/api/group-chat/messages/${courseId}/${sectionId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessages(response.data.messages);
    } catch (error) {
      console.error('Error loading messages:', error);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const loadCourseAndSectionInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      // Only load course info - we don't need section details for the chat UI
      const courseResponse = await axios.get(`/api/courses/${courseId}`, { headers: { Authorization: `Bearer ${token}` } });
      setCourseInfo(courseResponse.data);
      // Set basic section info with just the ID
      setSectionInfo({ _id: sectionId, name: 'Loading...' });
    } catch (error) {
      console.error('Error loading course info:', error);
      // Set fallback info
      setCourseInfo({ title: 'Unknown Course', courseCode: 'N/A' });
      setSectionInfo({ _id: sectionId, name: 'Unknown Section' });
    }
  };

  useEffect(() => {
    loadCourseAndSectionInfo();
  }, [courseId, sectionId]);

  const loadCurrentUser = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCurrentUser(response.data);
    } catch (error) {
      console.error('Error loading user info:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending || !connected) return;

    if (newMessage.length > 1000) {
      setError('Message too long (max 200 words)');
      return;
    }

    setSending(true);
    setError('');

    try {
      socket.emit('send-message', {
        courseId,
        sectionId,
        message: newMessage.trim()
      });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      socket.emit('delete-message', {
        messageId,
        courseId,
        sectionId
      });
      setDeleteDialog({ open: false, messageId: null });
    } catch (error) {
      console.error('Error deleting message:', error);
      setError('Failed to delete message');
    }
  };

  const handleTyping = () => {
    if (socket && connected) {
      socket.emit('typing-start', { courseId, sectionId });
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set new timeout to stop typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing-stop', { courseId, sectionId });
      }, 1000);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAvatarColor = (roles) => {
    if (roles?.includes('admin')) return '#f44336';
    if (roles?.includes('teacher')) return '#2196f3';
    if (roles?.includes('hod')) return '#ff9800';
    if (roles?.includes('dean')) return '#9c27b0';
    return '#4caf50'; // student
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 2, mb: 2, height: 'calc(100vh - 100px)' }}>
      <Paper 
        elevation={3} 
        sx={{ 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          bgcolor: colors.background 
        }}
      >
        {/* Header */}
        <Box 
          sx={{ 
            p: 2, 
            bgcolor: colors.primary, 
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          <IconButton onClick={() => navigate(-1)} sx={{ color: 'white' }}>
            <ArrowBackIcon />
          </IconButton>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6">
              {courseInfo ? `${courseInfo.courseCode} - ${courseInfo.title}` : 'Loading...'}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Section: {sectionInfo?.name || 'Loading...'}
            </Typography>
          </Box>
          <Chip 
            label={connected ? 'Connected' : 'Connecting...'} 
            color={connected ? 'success' : 'warning'}
            size="small"
            sx={{ bgcolor: connected ? '#4caf50' : '#ff9800', color: 'white' }}
          />
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" onClose={() => setError('')} sx={{ m: 1 }}>
            {error}
          </Alert>
        )}

        {/* Messages */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
          <List sx={{ pb: 0 }}>
            {messages.map((message) => (
              <ListItem
                key={message._id}
                sx={{
                  alignItems: 'flex-start',
                  bgcolor: 'white',
                  mb: 1,
                  borderRadius: 2,
                  border: `1px solid ${colors.tertiary}`,
                  position: 'relative'
                }}
              >
                <Avatar 
                  sx={{ 
                    bgcolor: getAvatarColor(message.sender.roles),
                    mr: 2,
                    mt: 1
                  }}
                >
                  <PersonIcon />
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: colors.primary }}>
                      {message.sender.name}
                    </Typography>
                    {message.sender.id && (
                      <Typography variant="caption" sx={{ ml: 1, color: colors.text }}>
                        ({message.sender.id})
                      </Typography>
                    )}
                    <Typography variant="caption" sx={{ ml: 'auto', color: colors.text }}>
                      {formatTime(message.timestamp)}
                    </Typography>
                  </Box>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: message.flagged ? '#ff9800' : '#333', 
                      wordBreak: 'break-word',
                      fontStyle: message.flagged ? 'italic' : 'normal'
                    }}
                  >
                    {message.message}
                    {message.flagged && (
                      <Chip 
                        label="Filtered" 
                        size="small" 
                        color="warning" 
                        sx={{ ml: 1, fontSize: '0.7rem', height: '20px' }}
                      />
                    )}
                  </Typography>
                </Box>
                {(message.canDelete || message.canShowDelete) && (
                  <IconButton
                    size="small"
                    onClick={() => setDeleteDialog({ open: true, messageId: message._id })}
                    sx={{ 
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      color: message.canDelete ? '#f44336' : colors.text,
                      opacity: message.canDelete ? 1 : 0.6,
                      '&:hover': { color: '#f44336', opacity: 1 }
                    }}
                    disabled={!message.canDelete}
                    title={message.canDelete ? 'Delete message' : 'Cannot delete this message'}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
              </ListItem>
            ))}
          </List>

          {/* Typing indicator */}
          {typingUsers.length > 0 && (
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="caption" sx={{ color: colors.text, fontStyle: 'italic' }}>
                {typingUsers.map(u => u.userName).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
              </Typography>
            </Box>
          )}
          
          <div ref={messagesEndRef} />
        </Box>

        {/* Message Input */}
        <Box 
          sx={{ 
            p: 2, 
            bgcolor: 'white',
            borderTop: `1px solid ${colors.tertiary}`,
            display: 'flex',
            gap: 1
          }}
        >
          <TextField
            fullWidth
            multiline
            maxRows={3}
            placeholder="Type your message... (max 200 words)"
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            disabled={!connected}
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: colors.secondary },
                '&:hover fieldset': { borderColor: colors.primary },
                '&.Mui-focused fieldset': { borderColor: colors.primary }
              }
            }}
          />
          <Button
            variant="contained"
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sending || !connected}
            startIcon={sending ? <CircularProgress size={20} /> : <SendIcon />}
            sx={{ 
              bgcolor: colors.primary,
              '&:hover': { bgcolor: colors.secondary },
              minWidth: 120
            }}
          >
            {sending ? 'Sending...' : 'Send'}
          </Button>
        </Box>
      </Paper>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, messageId: null })}
      >
        <DialogTitle>Delete Message</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this message? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, messageId: null })}>
            Cancel
          </Button>
          <Button 
            onClick={() => handleDeleteMessage(deleteDialog.messageId)}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default GroupChatPage;