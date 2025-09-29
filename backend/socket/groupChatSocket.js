const jwt = require('jsonwebtoken');
const User = require('../models/User');
const GroupChat = require('../models/GroupChat');
const Section = require('../models/Section');
const Course = require('../models/Course');

let chatUsers = new Map(); // Store socket connections

const initializeGroupChatSocket = (io) => {
  // Create a namespace for group chat
  const chatNamespace = io.of('/group-chat');

  chatNamespace.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  chatNamespace.on('connection', (socket) => {
    console.log(`User ${socket.user.name} connected to group chat`);
    
    // Store user connection
    chatUsers.set(socket.user._id.toString(), {
      socketId: socket.id,
      user: socket.user
    });

    // Join chat room
    socket.on('join-chat', async (data) => {
      try {
        const { courseId, sectionId } = data;
        const roomId = `chat_${courseId}_${sectionId}`;
        
        console.log(`🔧 [JOIN-CHAT] User ${socket.user.name} attempting to join room ${roomId}`);
        console.log(`🔧 [JOIN-CHAT] courseId: ${courseId}, sectionId: ${sectionId}`);

        // Verify user has access to this chat room
        const hasAccess = await verifyUserChatAccess(socket.user, courseId, sectionId);
        console.log(`🔧 [JOIN-CHAT] Access verification result: ${hasAccess}`);
        if (!hasAccess) {
          socket.emit('chat-error', { message: 'Access denied to this chat roomm' });
          return;
        }

        // Leave any previous rooms
        socket.rooms.forEach(room => {
          if (room.startsWith('chat_')) {
            socket.leave(room);
          }
        });

        // Join the new room
        socket.join(roomId);
        socket.currentRoom = roomId;
        
        console.log(`User ${socket.user.name} joined room ${roomId}`);
        socket.emit('joined-chat', { roomId, courseId, sectionId });
        
        // Notify room about user joining (optional)
        socket.to(roomId).emit('user-joined', {
          userId: socket.user._id,
          userName: socket.user.name
        });
      } catch (error) {
        console.error('Join chat error:', error);
        socket.emit('chat-error', { message: 'Failed to join chat room' });
      }
    });

    // Handle new message
    socket.on('send-message', async (data) => {
      try {
        const { courseId, sectionId, message } = data;
        const roomId = `chat_${courseId}_${sectionId}`;

        if (socket.currentRoom !== roomId) {
          socket.emit('chat-error', { message: 'Not in the correct chat room' });
          return;
        }

        if (!message || message.trim().length === 0) {
          socket.emit('chat-error', { message: 'Message cannot be empty' });
          return;
        }

        if (message.length > 1000) {
          socket.emit('chat-error', { message: 'Message too long (max 200 words)' });
          return;
        }

        // Filter content for vulgar words
        const contentFilter = GroupChat.filterContent(message.trim());
        
        // If message is heavily flagged, reject it
        if (contentFilter.flagged && contentFilter.flaggedWords.length > 2) {
          socket.emit('chat-error', { 
            message: 'Message contains inappropriate content and cannot be sent',
            flaggedWords: contentFilter.flaggedWords 
          });
          return;
        }

        // Save message to database (with filtered content if flagged)
        const newMessage = new GroupChat({
          courseId,
          sectionId,
          senderId: socket.user._id,
          message: contentFilter.flagged ? contentFilter.filtered : contentFilter.original,
          flagged: contentFilter.flagged,
          flaggedReason: contentFilter.flagged ? `Contains: ${contentFilter.flaggedWords.join(', ')}` : undefined
        });

        await newMessage.save();
        await newMessage.populate('senderId', 'name regNo teacherId roles primaryRole');

        // Format message for broadcast
        const sender = newMessage.senderId;
        let displayName = sender.name;
        let displayId = '';

        if (sender.roles && sender.roles.includes('admin')) {
          displayName = 'Admin';
          displayId = '';
        } else {
          if (sender.roles && sender.roles.includes('student') && sender.regNo) {
            displayId = sender.regNo;
          } else if (sender.roles && sender.roles.includes('teacher') && sender.teacherId) {
            displayId = sender.teacherId;
          }
        }

        const formattedMessage = {
          _id: newMessage._id,
          message: newMessage.message,
          timestamp: newMessage.timestamp,
          flagged: newMessage.flagged,
          sender: {
            _id: sender._id,
            name: displayName,
            id: displayId,
            roles: sender.roles
          },
          canDelete: newMessage.canDelete(socket.user),
          canShowDelete: newMessage.canShowDeleteButton(socket.user),
          isOwner: newMessage.senderId._id.toString() === socket.user._id.toString()
        };

        // Broadcast message to all users in the room
        chatNamespace.to(roomId).emit('new-message', formattedMessage);
        
        console.log(`Message sent in room ${roomId} by ${socket.user.name}`);
      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('chat-error', { message: 'Failed to send message' });
      }
    });

    // Handle message deletion
    socket.on('delete-message', async (data) => {
      try {
        const { messageId, courseId, sectionId } = data;
        const roomId = `chat_${courseId}_${sectionId}`;

        if (socket.currentRoom !== roomId) {
          socket.emit('chat-error', { message: 'Not in the correct chat room' });
          return;
        }

        const message = await GroupChat.findById(messageId);
        if (!message) {
          socket.emit('chat-error', { message: 'Message not found' });
          return;
        }

        if (!message.canDelete(socket.user)) {
          socket.emit('chat-error', { message: 'Not authorized to delete this message' });
          return;
        }

        message.isDeleted = true;
        message.deletedBy = socket.user._id;
        message.deletedAt = new Date();
        await message.save();

        // Broadcast message deletion to all users in the room
        chatNamespace.to(roomId).emit('message-deleted', { messageId });
        
        console.log(`Message ${messageId} deleted in room ${roomId} by ${socket.user.name}`);
      } catch (error) {
        console.error('Delete message error:', error);
        socket.emit('chat-error', { message: 'Failed to delete message' });
      }
    });

    // Handle typing indicators
    socket.on('typing-start', (data) => {
      const { courseId, sectionId } = data;
      const roomId = `chat_${courseId}_${sectionId}`;
      
      if (socket.currentRoom === roomId) {
        socket.to(roomId).emit('user-typing', {
          userId: socket.user._id,
          userName: socket.user.name
        });
      }
    });

    socket.on('typing-stop', (data) => {
      const { courseId, sectionId } = data;
      const roomId = `chat_${courseId}_${sectionId}`;
      
      if (socket.currentRoom === roomId) {
        socket.to(roomId).emit('user-stopped-typing', {
          userId: socket.user._id
        });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User ${socket.user.name} disconnected from group chat`);
      chatUsers.delete(socket.user._id.toString());

      // Notify current room about user leaving
      if (socket.currentRoom) {
        socket.to(socket.currentRoom).emit('user-left', {
          userId: socket.user._id,
          userName: socket.user.name
        });
      }
    });
  });

  console.log('✅ Group Chat Socket.IO initialized');
};

// Helper function to verify user access to chat room
const verifyUserChatAccess = async (user, courseId, sectionId) => {
  try {
    console.log(`🔍 [ACCESS-CHECK] Verifying access for user ${user.name} (roles: ${user.roles}) to course ${courseId} in section ${sectionId}`);
    
    // Admin, Dean, HOD have access to all chats
    if (['admin', 'dean', 'hod', 'superadmin'].some(role => user.roles && user.roles.includes(role))) {
      console.log(`✅ [ACCESS-CHECK] User has admin/dean/hod access`);
      return true;
    }

    // Check if section exists
    const section = await Section.findById(sectionId).populate('courses students teachers');
    if (!section) {
      return false;
    }

    // Check if course exists and is in the section
    const course = await Course.findById(courseId).populate('coordinators');
    if (!course || !section.courses.some(c => c._id.toString() === courseId)) {
      return false;
    }

    // Check if user is student in this section
    if (user.roles && user.roles.includes('student') && section.students.some(s => s._id.toString() === user._id.toString())) {
      return true;
    }

    // Check if user is teacher in this section or teaching this course
    if (user.roles && user.roles.includes('teacher')) {
      console.log(`🔍 [ACCESS-CHECK] User is teacher, checking section teachers: ${section.teachers ? section.teachers.map(t => t._id ? t._id.toString() : t.toString()) : 'none'}`);
      
      // Check if teacher is directly assigned to the section
      if (section.teachers && section.teachers.some(t => {
        const teacherId = t._id ? t._id.toString() : t.toString();
        return teacherId === user._id.toString();
      })) {
        console.log(`✅ [ACCESS-CHECK] Teacher found in section`);
        return true;
      }
      
      // Check if teacher is a course coordinator
      if (course.coordinators && course.coordinators.some(cc => cc._id.toString() === user._id.toString())) {
        console.log(`✅ [ACCESS-CHECK] Teacher is course coordinator`);
        return true;
      }
      
      // Allow any teacher to access chat for now (can be restricted later)
      console.log(`✅ [ACCESS-CHECK] Allowing teacher access (permissive mode)`);
      return true;
    }

    // Check if user is course coordinator
    if (user.roles && user.roles.includes('cc') && course.coordinators.some(cc => cc._id.toString() === user._id.toString())) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Chat access verification error:', error);
    return false;
  }
};

module.exports = initializeGroupChatSocket;