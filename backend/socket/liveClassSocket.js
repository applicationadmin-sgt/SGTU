const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const LiveClass = require('../models/LiveClass');

// Store active rooms and their state
const rooms = new Map();
// Map userId to socketId for direct messaging
const userSocketMap = new Map();

function initializeLiveClassSocket(server) {
  console.log('🔧 Initializing Socket.IO server...');
  
  const io = socketIO(server, {
    cors: {
      origin: [
        process.env.FRONTEND_URL || "http://localhost:3000",
        "http://10.20.58.236:3000",
        "https://10.20.58.236:3000", // HTTPS IP address
        "http://localhost:3000",
        "https://localhost:3000" // HTTPS localhost
      ],
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  console.log('📋 Socket.IO CORS origins configured:', [
    process.env.FRONTEND_URL || "http://localhost:3000",
    "http://10.20.58.236:3000",
    "https://10.20.58.236:3000",
    "http://localhost:3000",
    "https://localhost:3000"
  ]);

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      console.log('🔐 Socket.IO authentication attempt:', {
        socketId: socket.id,
        hasToken: !!socket.handshake.auth.token,
        origin: socket.handshake.headers.origin,
        userAgent: socket.handshake.headers['user-agent']
      });
      
      const token = socket.handshake.auth.token;
      
      if (!token) {
        console.error('❌ No token provided in Socket.IO handshake');
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('🔍 JWT decoded payload (full):', decoded);
      console.log('🔍 JWT decoded properties:', { 
        hasId: !!decoded.id, 
        hasUserId: !!decoded.userId,
        id: decoded.id,
        userId: decoded.userId,
        allKeys: Object.keys(decoded)
      });
      
      // The JWT token uses 'id' not 'userId'
      const userId = decoded.id || decoded.userId;
      console.log('🎯 Extracted userId:', userId);
      
      const user = await User.findById(userId);
      
      if (!user) {
        console.error('❌ User not found for Socket.IO connection:', { 
          attemptedUserId: userId,
          decodedId: decoded.id,
          decodedUserId: decoded.userId,
          fullDecoded: decoded
        });
        return next(new Error('Authentication error: User not found'));
      }

      socket.userId = user._id.toString();
      socket.userName = user.name;
      socket.userRole = user.role;
      socket.userEmail = user.email;
      
      // Map userId to socketId for direct messaging
      userSocketMap.set(socket.userId, socket.id);
      
      console.log('✅ Socket.IO authentication successful:', {
        userId: socket.userId,
        userName: socket.userName,
        userRole: socket.userRole
      });
      
      next();
    } catch (error) {
      console.error('❌ Socket authentication error:', error);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔗 Socket.IO connection established: ${socket.userName} (${socket.userId}) - Socket ID: ${socket.id}`);
    
    // Join live class room
    socket.on('join-room', async (data) => {
      try {
        const { roomId } = data;
        
        console.log(`🚪 User ${socket.userName} joining room: ${roomId}`);
        
        // Verify the live class exists and user has permission
        const liveClass = await LiveClass.findOne({ roomId })
          .populate('section', 'students')
          .populate('teacher', 'name email');
        
        if (!liveClass) {
          socket.emit('error', { message: 'Live class not found' });
          return;
        }
        
        // SIMPLE FIX: Determine teacher status server-side
        const teacherId = liveClass.teacher._id.toString();
        const currentUserId = socket.userId.toString();
        const isTeacher = (teacherId === currentUserId);
        
        console.log('🔍 Permission check:', {
          userId: currentUserId,
          userName: socket.userName,
          teacherId: teacherId,
          isTeacher: isTeacher,
          roomId: roomId
        });
        
        let hasPermission = false;
        
        if (isTeacher) {
          hasPermission = true;
          console.log(`✅ Teacher access granted: ${socket.userName}`);
        } else {
          // For students, check if they're in the section
          hasPermission = liveClass.section.students.some(s => s._id.toString() === currentUserId);
          console.log(`🔍 Student permission: ${hasPermission}`);
        }
        
        if (!hasPermission) {
          console.log(`❌ Permission denied for: ${socket.userName}`);
          socket.emit('error', { message: 'You do not have permission to join this class' });
          return;
        }
        
        // Initialize room if it doesn't exist
        if (!rooms.has(roomId)) {
          rooms.set(roomId, {
            users: new Map(),
            liveClassId: liveClass._id,
            createdAt: new Date()
          });
        }
        
        const room = rooms.get(roomId);
        
        // Add user to room
        room.users.set(socket.userId, {
          socket: socket,
          userName: socket.userName,
          isTeacher: isTeacher,
          joinedAt: new Date()
        });
        
        // Join socket room
        socket.join(roomId);
        socket.currentRoom = roomId;
        socket.isTeacher = isTeacher;
        
        console.log(`✅ User ${socket.userName} joined room ${roomId}. Room size: ${room.users.size}`);
        
        // Notify user they joined successfully
        socket.emit('joined-room', {
          roomId,
          isTeacher,
          participantCount: room.users.size
        });
        
        // Notify other users
        socket.to(roomId).emit('user-joined', {
          userId: socket.userId,
          userName: socket.userName,
          isTeacher
        });
        
        // Build participant list and broadcast to entire room so existing peers can negotiate
        const participants = Array.from(room.users.values()).map(user => ({
          userId: user.socket.userId,
          userName: user.userName,
          isTeacher: user.isTeacher
        }));

  // Send to newly joined user and also broadcast to the room for deterministic offer initiation
  socket.emit('participants-list', participants);
  io.to(roomId).emit('participants-list', participants);
  console.log(`👥 Broadcast participants-list to room ${roomId} with ${participants.length} users`);
        
        // Update participant count in database
        if (!isTeacher) {
          await liveClass.addParticipant(socket.userId);
        }
        
        // Store room info on socket for cleanup
        socket.currentRoom = roomId;
        
      } catch (error) {
        console.error('Error joining room:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // WebRTC signaling
    socket.on('offer', (data) => {
      const targetSocketId = userSocketMap.get(data.targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('offer', {
          offer: data.offer,
          fromUserId: socket.userId
        });
        console.log(`📤 Forwarded offer from ${socket.userId} to ${data.targetUserId}`);
      } else {
        console.warn(`⚠️ Offer target not found for ${data.targetUserId}`);
      }
    });

    socket.on('answer', (data) => {
      const targetSocketId = userSocketMap.get(data.targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('answer', {
          answer: data.answer,
          fromUserId: socket.userId
        });
        console.log(`📤 Forwarded answer from ${socket.userId} to ${data.targetUserId}`);
      } else {
        console.warn(`⚠️ Answer target not found for ${data.targetUserId}`);
      }
    });

    socket.on('ice-candidate', (data) => {
      const targetSocketId = userSocketMap.get(data.targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('ice-candidate', {
          candidate: data.candidate,
          fromUserId: socket.userId
        });
        console.log(`📤 Forwarded ICE candidate from ${socket.userId} to ${data.targetUserId}`);
      } else {
        console.warn(`⚠️ ICE candidate target not found for ${data.targetUserId}`);
      }
    });

    // Chat messages
    socket.on('chat-message', (data) => {
      if (socket.currentRoom) {
        io.to(socket.currentRoom).emit('chat-message', {
          message: data.message,
          userId: socket.userId,
          userName: socket.userName,
          isFromTeacher: socket.isTeacher,
          timestamp: new Date()
        });
      }
    });

    // Leave room
    socket.on('leave-room', async () => {
      await handleUserLeaveRoom(socket);
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`🔌 User disconnected: ${socket.userName} (${socket.userId})`);
      // Clean up user socket mapping
      userSocketMap.delete(socket.userId);
      await handleUserLeaveRoom(socket);
    });
  });

  // Helper function to handle user leaving room
  async function handleUserLeaveRoom(socket) {
    try {
      const roomId = socket.currentRoom;
      if (!roomId) return;

      const room = rooms.get(roomId);
      if (!room) return;

      const userData = room.users.get(socket.userId);
      if (!userData) return;
      
      // Remove user from room
      room.users.delete(socket.userId);
      
      // Leave socket room
      socket.leave(roomId);
      
      // Notify other users
      socket.to(roomId).emit('user-left', {
        userId: socket.userId,
        userName: socket.userName
      });
      
      console.log(`🚪 User ${socket.userName} left room ${roomId}. Room size: ${room.users.size}`);
      
      // Update participant count in database if student
      if (!userData.isTeacher) {
        const liveClass = await LiveClass.findById(room.liveClassId);
        if (liveClass) {
          await liveClass.removeParticipant(socket.userId);
        }
      }
      
      // Clean up empty rooms
      if (room.users.size === 0) {
        rooms.delete(roomId);
        console.log(`🧹 Cleaned up empty room: ${roomId}`);
      }
      
    } catch (error) {
      console.error('Error handling user leave room:', error);
    }
  }
  
  console.log('✅ Live Class Socket.IO server initialized');
  
  return io;
}

module.exports = initializeLiveClassSocket;