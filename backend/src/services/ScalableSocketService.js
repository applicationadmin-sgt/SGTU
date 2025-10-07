/**
 * Enhanced Socket.IO Service with Redis Clustering
 * Handles real-time signaling for 10,000+ concurrent users
 */

const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const Redis = require('ioredis');
const jwt = require('jsonwebtoken');
const config = require('../config/mediasoup.config');
const MediasoupService = require('./MediasoupService');
const { RateLimiterRedis } = require('rate-limiter-flexible');

class ScalableSocketService {
  constructor() {
    this.io = null;
    this.redisClient = null;
    this.pubClient = null;
    this.subClient = null;
    this.rateLimiter = null;
    
    // Room management
    this.rooms = new Map();
    this.userSessions = new Map(); // userId -> sessionInfo
    
    // Statistics
    this.stats = {
      totalConnections: 0,
      totalRooms: 0,
      messagesPerSecond: 0,
      lastStatsUpdate: Date.now(),
    };

    this.setupRedis();
    this.setupRateLimiting();
    this.setupMediasoupEventHandlers();
  }

  /**
   * Setup Redis for scaling Socket.IO across multiple servers
   */
  setupRedis() {
    try {
      // Redis clients for Socket.IO adapter
      this.pubClient = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        db: config.redis.db,
        keyPrefix: config.redis.keyPrefix + 'socketio:',
        retryDelayOnFailover: config.redis.retryDelayOnFailover,
        maxRetriesPerRequest: config.redis.maxRetriesPerRequest,
      });

      this.subClient = this.pubClient.duplicate();

      // General Redis client for data storage
      this.redisClient = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        db: config.redis.db,
        keyPrefix: config.redis.keyPrefix,
      });

      console.log('✅ Redis clients initialized for Socket.IO scaling');
    } catch (error) {
      console.error('❌ Redis setup failed:', error);
      throw error;
    }
  }

  /**
   * Setup rate limiting to prevent spam and abuse
   */
  setupRateLimiting() {
    this.rateLimiter = new RateLimiterRedis({
      storeClient: this.redisClient,
      keyPrefix: 'rl_socket',
      points: 100, // Number of requests
      duration: 60, // Per 60 seconds
      execEvenly: true, // Spread requests evenly across duration
    });
  }

  /**
   * Setup Mediasoup event handlers
   */
  setupMediasoupEventHandlers() {
    MediasoupService.on('newProducer', ({ producerId, peerId, classId, kind }) => {
      this.broadcastToRoom(classId, 'newProducer', {
        producerId,
        peerId,
        kind,
      }, [peerId]); // Exclude the producer itself
    });

    MediasoupService.on('producerClosed', ({ producerId, peerId, classId }) => {
      this.broadcastToRoom(classId, 'producerClosed', {
        producerId,
        peerId,
      });
    });

    MediasoupService.on('consumerClosed', ({ consumerId, peerId, classId }) => {
      this.broadcastToRoom(classId, 'consumerClosed', {
        consumerId,
        peerId,
      });
    });
  }

  /**
   * Initialize Socket.IO server with clustering support
   */
  initialize(httpServer) {
    this.io = new Server(httpServer, {
      cors: config.server.cors,
      transports: ['websocket', 'polling'],
      allowEIO3: true,
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    // Setup Redis adapter for clustering
    this.io.adapter(createAdapter(this.pubClient, this.subClient));

    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        await this.authenticateSocket(socket);
        next();
      } catch (error) {
        console.error('🔐 Socket authentication failed:', error.message);
        next(new Error('Authentication failed'));
      }
    });

    // Rate limiting middleware
    this.io.use(async (socket, next) => {
      try {
        await this.rateLimiter.consume(socket.handshake.address);
        next();
      } catch (rejRes) {
        console.warn(`🚫 Rate limit exceeded for ${socket.handshake.address}`);
        next(new Error('Rate limit exceeded'));
      }
    });

    this.setupSocketHandlers();
    
    console.log('🚀 Scalable Socket.IO service initialized');
  }

  /**
   * Authenticate socket connection using JWT
   */
  async authenticateSocket(socket) {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    
    if (!token) {
      throw new Error('No authentication token provided');
    }

    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      
      // Store user info in socket
      socket.userId = decoded.id || decoded._id;
      socket.userName = decoded.name;
      socket.userEmail = decoded.email;
      socket.userRole = decoded.role || 'student';
      socket.authenticated = true;
      
      console.log(`🔐 Socket authenticated: ${socket.userId} (${socket.userRole})`);
    } catch (error) {
      throw new Error('Invalid authentication token');
    }
  }

  /**
   * Setup all socket event handlers
   */
  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`🔌 User connected: ${socket.userId} (${socket.userRole})`);
      this.stats.totalConnections++;
      
      // Store user session
      this.userSessions.set(socket.userId, {
        socketId: socket.id,
        userId: socket.userId,
        userName: socket.userName,
        userRole: socket.userRole,
        connectedAt: new Date(),
        currentRoom: null,
      });

      // ==== ROOM MANAGEMENT ====
      socket.on('joinClass', async (data) => {
        await this.handleJoinClass(socket, data);
      });

      socket.on('leaveClass', async (data) => {
        await this.handleLeaveClass(socket, data);
      });

      // ==== WEBRTC SIGNALING ====
      socket.on('getRouterRtpCapabilities', async (data, callback) => {
        await this.handleGetRouterCapabilities(socket, data, callback);
      });

      socket.on('createTransport', async (data, callback) => {
        await this.handleCreateTransport(socket, data, callback);
      });

      socket.on('connectTransport', async (data, callback) => {
        await this.handleConnectTransport(socket, data, callback);
      });

      socket.on('produce', async (data, callback) => {
        await this.handleProduce(socket, data, callback);
      });

      socket.on('consume', async (data, callback) => {
        await this.handleConsume(socket, data, callback);
      });

      socket.on('resumeConsumer', async (data, callback) => {
        await this.handleResumeConsumer(socket, data, callback);
      });

      socket.on('pauseConsumer', async (data, callback) => {
        await this.handlePauseConsumer(socket, data, callback);
      });

      // ==== CHAT & MESSAGING ====
      socket.on('sendMessage', async (data) => {
        await this.handleSendMessage(socket, data);
      });

      socket.on('sendPrivateMessage', async (data) => {
        await this.handleSendPrivateMessage(socket, data);
      });

      // ==== CLASSROOM INTERACTIONS ====
      socket.on('raiseHand', async (data) => {
        await this.handleRaiseHand(socket, data);
      });

      socket.on('lowerHand', async (data) => {
        await this.handleLowerHand(socket, data);
      });

      socket.on('requestPermission', async (data) => {
        await this.handleRequestPermission(socket, data);
      });

      socket.on('grantPermission', async (data) => {
        await this.handleGrantPermission(socket, data);
      });

      // ==== WHITEBOARD ====
      socket.on('whiteboardUpdate', async (data) => {
        await this.handleWhiteboardUpdate(socket, data);
      });

      socket.on('whiteboardClear', async (data) => {
        await this.handleWhiteboardClear(socket, data);
      });

      // ==== POLLS & QUIZZES ====
      socket.on('createPoll', async (data) => {
        await this.handleCreatePoll(socket, data);
      });

      socket.on('votePoll', async (data) => {
        await this.handleVotePoll(socket, data);
      });

      socket.on('endPoll', async (data) => {
        await this.handleEndPoll(socket, data);
      });

      // ==== SCREEN SHARING ====
      socket.on('startScreenShare', async (data) => {
        await this.handleStartScreenShare(socket, data);
      });

      socket.on('stopScreenShare', async (data) => {
        await this.handleStopScreenShare(socket, data);
      });

      // ==== RECORDING ====
      socket.on('startRecording', async (data) => {
        await this.handleStartRecording(socket, data);
      });

      socket.on('stopRecording', async (data) => {
        await this.handleStopRecording(socket, data);
      });

      // ==== ATTENDANCE ====
      socket.on('markAttendance', async (data) => {
        await this.handleMarkAttendance(socket, data);
      });

      // ==== CLASS CONTROLS (Teacher Only) ====
      socket.on('muteAll', async (data) => {
        await this.handleMuteAll(socket, data);
      });

      socket.on('muteStudent', async (data) => {
        await this.handleMuteStudent(socket, data);
      });

      socket.on('removeStudent', async (data) => {
        await this.handleRemoveStudent(socket, data);
      });

      socket.on('updateClassSettings', async (data) => {
        await this.handleUpdateClassSettings(socket, data);
      });

      // ==== DISCONNECT ====
      socket.on('disconnect', async (reason) => {
        await this.handleDisconnect(socket, reason);
      });
    });
  }

  // ==== ROOM MANAGEMENT HANDLERS ====
  
  async handleJoinClass(socket, { classId, userRole }) {
    try {
      console.log(`👤 ${socket.userId} joining class ${classId} as ${userRole}`);
      
      // Join Socket.IO room
      await socket.join(classId);
      
      // Join Mediasoup room
      const joinResult = await MediasoupService.joinClass(classId, socket.userId, userRole);
      
      // Update room info
      if (!this.rooms.has(classId)) {
        this.rooms.set(classId, {
          participants: new Map(),
          teachers: new Set(),
          students: new Set(),
          settings: {
            allowStudentMic: false,
            allowStudentCamera: false,
            allowChat: true,
            enableHandRaise: true,
            enablePolls: true,
            enableWhiteboard: true,
          },
          polls: new Map(),
          handRaisedStudents: new Set(),
          whiteboard: { strokes: [] },
          recording: { active: false, startTime: null },
          createdAt: new Date(),
        });
      }

      const room = this.rooms.get(classId);
      
      // Add participant
      room.participants.set(socket.userId, {
        userId: socket.userId,
        userName: socket.userName,
        userRole: userRole,
        socketId: socket.id,
        joinedAt: new Date(),
        permissions: {
          canSpeak: userRole === 'teacher',
          canVideo: userRole === 'teacher',
          canScreenShare: userRole === 'teacher',
          canControlRoom: userRole === 'teacher',
        },
        mediaState: {
          audio: false,
          video: false,
          screenShare: false,
        },
        handRaised: false,
      });

      if (userRole === 'teacher') {
        room.teachers.add(socket.userId);
      } else {
        room.students.add(socket.userId);
      }

      // Update user session
      const session = this.userSessions.get(socket.userId);
      if (session) {
        session.currentRoom = classId;
      }

      // Notify others about new participant
      socket.to(classId).emit('userJoined', {
        userId: socket.userId,
        userName: socket.userName,
        userRole: userRole,
        joinedAt: new Date(),
      });

      // Send current room state to new participant
      socket.emit('joinedClass', {
        success: true,
        classId,
        rtpCapabilities: joinResult.rtpCapabilities,
        existingProducers: joinResult.existingProducers,
        roomInfo: joinResult.roomInfo,
        participants: Array.from(room.participants.values()),
        settings: room.settings,
        polls: Array.from(room.polls.values()),
        whiteboard: room.whiteboard,
      });

      // Update statistics
      this.updateRoomStats(classId);
      
      console.log(`✅ ${socket.userId} joined class ${classId} successfully`);
    } catch (error) {
      console.error('❌ Error joining class:', error);
      socket.emit('error', { message: 'Failed to join class', error: error.message });
    }
  }

  async handleLeaveClass(socket, { classId }) {
    try {
      console.log(`👋 ${socket.userId} leaving class ${classId}`);
      
      // Leave Socket.IO room
      await socket.leave(classId);
      
      // Leave Mediasoup room
      await MediasoupService.leaveClass(classId, socket.userId);
      
      // Update room info
      const room = this.rooms.get(classId);
      if (room) {
        room.participants.delete(socket.userId);
        room.teachers.delete(socket.userId);
        room.students.delete(socket.userId);
        room.handRaisedStudents.delete(socket.userId);
        
        // Notify others
        socket.to(classId).emit('userLeft', {
          userId: socket.userId,
          userName: socket.userName,
          leftAt: new Date(),
        });

        // Clean up empty room
        if (room.participants.size === 0) {
          this.rooms.delete(classId);
          console.log(`🗑️ Cleaned up empty room: ${classId}`);
        }
      }

      // Update user session
      const session = this.userSessions.get(socket.userId);
      if (session) {
        session.currentRoom = null;
      }

      socket.emit('leftClass', { success: true, classId });
      
      console.log(`✅ ${socket.userId} left class ${classId} successfully`);
    } catch (error) {
      console.error('❌ Error leaving class:', error);
      socket.emit('error', { message: 'Failed to leave class', error: error.message });
    }
  }

  // ==== WEBRTC SIGNALING HANDLERS ====
  
  async handleGetRouterCapabilities(socket, { classId }, callback) {
    try {
      const capabilities = await MediasoupService.getRouterCapabilities(classId);
      callback({ success: true, rtpCapabilities: capabilities });
    } catch (error) {
      console.error('❌ Error getting router capabilities:', error);
      callback({ success: false, error: error.message });
    }
  }

  async handleCreateTransport(socket, { classId, direction }, callback) {
    try {
      const transport = await MediasoupService.createTransport(classId, socket.userId, direction);
      callback({ success: true, transport });
    } catch (error) {
      console.error('❌ Error creating transport:', error);
      callback({ success: false, error: error.message });
    }
  }

  async handleConnectTransport(socket, { transportId, dtlsParameters }, callback) {
    try {
      await MediasoupService.connectTransport(transportId, dtlsParameters);
      callback({ success: true });
    } catch (error) {
      console.error('❌ Error connecting transport:', error);
      callback({ success: false, error: error.message });
    }
  }

  async handleProduce(socket, { transportId, kind, rtpParameters, classId }, callback) {
    try {
      const result = await MediasoupService.createProducer(
        transportId, 
        rtpParameters, 
        kind, 
        socket.userId, 
        classId
      );
      
      // Update participant media state
      const room = this.rooms.get(classId);
      if (room) {
        const participant = room.participants.get(socket.userId);
        if (participant) {
          participant.mediaState[kind === 'audio' ? 'audio' : 'video'] = true;
        }
      }
      
      callback({ success: true, producerId: result.id });
    } catch (error) {
      console.error('❌ Error creating producer:', error);
      callback({ success: false, error: error.message });
    }
  }

  async handleConsume(socket, { transportId, producerId, rtpCapabilities, classId }, callback) {
    try {
      const result = await MediasoupService.createConsumer(
        transportId, 
        producerId, 
        rtpCapabilities, 
        socket.userId, 
        classId
      );
      callback({ success: true, consumer: result });
    } catch (error) {
      console.error('❌ Error creating consumer:', error);
      callback({ success: false, error: error.message });
    }
  }

  async handleResumeConsumer(socket, { consumerId }, callback) {
    try {
      await MediasoupService.resumeConsumer(consumerId);
      callback({ success: true });
    } catch (error) {
      console.error('❌ Error resuming consumer:', error);
      callback({ success: false, error: error.message });
    }
  }

  async handlePauseConsumer(socket, { consumerId }, callback) {
    try {
      await MediasoupService.pauseConsumer(consumerId);
      callback({ success: true });
    } catch (error) {
      console.error('❌ Error pausing consumer:', error);
      callback({ success: false, error: error.message });
    }
  }

  // ==== CHAT HANDLERS ====
  
  async handleSendMessage(socket, { classId, message, messageType = 'text' }) {
    try {
      const room = this.rooms.get(classId);
      if (!room || !room.settings.allowChat) {
        return socket.emit('error', { message: 'Chat is disabled' });
      }

      const chatMessage = {
        id: `${Date.now()}-${Math.random()}`,
        userId: socket.userId,
        userName: socket.userName,
        userRole: socket.userRole,
        message,
        messageType,
        timestamp: new Date(),
        classId,
      };

      // Broadcast to all participants in the class
      this.io.to(classId).emit('newMessage', chatMessage);

      // Store in Redis for message history
      await this.redisClient.lpush(
        `chat:${classId}`, 
        JSON.stringify(chatMessage)
      );
      await this.redisClient.ltrim(`chat:${classId}`, 0, 1000); // Keep last 1000 messages

      console.log(`💬 Message sent in class ${classId} by ${socket.userName}`);
    } catch (error) {
      console.error('❌ Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  async handleSendPrivateMessage(socket, { classId, recipientId, message }) {
    try {
      const privateMessage = {
        id: `${Date.now()}-${Math.random()}`,
        senderId: socket.userId,
        senderName: socket.userName,
        recipientId,
        message,
        timestamp: new Date(),
        isPrivate: true,
      };

      // Send to recipient
      const recipientSession = this.userSessions.get(recipientId);
      if (recipientSession) {
        this.io.to(recipientSession.socketId).emit('privateMessage', privateMessage);
      }

      // Send back to sender for confirmation
      socket.emit('privateMessage', privateMessage);

      console.log(`🔒 Private message sent from ${socket.userName} to ${recipientId}`);
    } catch (error) {
      console.error('❌ Error sending private message:', error);
      socket.emit('error', { message: 'Failed to send private message' });
    }
  }

  // ==== CLASSROOM INTERACTION HANDLERS ====
  
  async handleRaiseHand(socket, { classId }) {
    try {
      const room = this.rooms.get(classId);
      if (!room || !room.settings.enableHandRaise) {
        return socket.emit('error', { message: 'Hand raise is disabled' });
      }

      room.handRaisedStudents.add(socket.userId);
      
      const participant = room.participants.get(socket.userId);
      if (participant) {
        participant.handRaised = true;
        participant.handRaisedAt = new Date();
      }

      // Notify teachers
      this.broadcastToTeachers(classId, 'handRaised', {
        userId: socket.userId,
        userName: socket.userName,
        raisedAt: new Date(),
      });

      socket.emit('handRaised', { success: true });
      
      console.log(`✋ ${socket.userName} raised hand in class ${classId}`);
    } catch (error) {
      console.error('❌ Error raising hand:', error);
      socket.emit('error', { message: 'Failed to raise hand' });
    }
  }

  async handleLowerHand(socket, { classId, userId }) {
    try {
      const targetUserId = userId || socket.userId;
      const room = this.rooms.get(classId);
      
      if (!room) return;

      room.handRaisedStudents.delete(targetUserId);
      
      const participant = room.participants.get(targetUserId);
      if (participant) {
        participant.handRaised = false;
        participant.handRaisedAt = null;
      }

      // Notify all participants
      this.io.to(classId).emit('handLowered', {
        userId: targetUserId,
        loweredBy: socket.userId,
        loweredAt: new Date(),
      });

      console.log(`👋 Hand lowered for ${targetUserId} in class ${classId}`);
    } catch (error) {
      console.error('❌ Error lowering hand:', error);
      socket.emit('error', { message: 'Failed to lower hand' });
    }
  }

  // ==== UTILITY METHODS ====
  
  /**
   * Broadcast message to all participants in a room
   */
  broadcastToRoom(classId, event, data, excludeUsers = []) {
    const room = this.rooms.get(classId);
    if (!room) return;

    for (const [userId, participant] of room.participants) {
      if (!excludeUsers.includes(userId)) {
        this.io.to(participant.socketId).emit(event, data);
      }
    }
  }

  /**
   * Broadcast message to teachers only
   */
  broadcastToTeachers(classId, event, data) {
    const room = this.rooms.get(classId);
    if (!room) return;

    for (const teacherId of room.teachers) {
      const teacher = room.participants.get(teacherId);
      if (teacher) {
        this.io.to(teacher.socketId).emit(event, data);
      }
    }
  }

  /**
   * Update room statistics
   */
  updateRoomStats(classId) {
    const room = this.rooms.get(classId);
    if (room) {
      this.stats.totalRooms = this.rooms.size;
      
      // Store room stats in Redis
      this.redisClient.hset(`room:${classId}:stats`, {
        participants: room.participants.size,
        teachers: room.teachers.size,
        students: room.students.size,
        lastUpdate: Date.now(),
      });
    }
  }

  /**
   * Handle socket disconnection
   */
  async handleDisconnect(socket, reason) {
    console.log(`🔌 User disconnected: ${socket.userId} - Reason: ${reason}`);
    
    const session = this.userSessions.get(socket.userId);
    if (session && session.currentRoom) {
      await this.handleLeaveClass(socket, { classId: session.currentRoom });
    }

    this.userSessions.delete(socket.userId);
    this.stats.totalConnections--;
  }

  /**
   * Get system statistics
   */
  getStats() {
    return {
      ...this.stats,
      activeRooms: this.rooms.size,
      activeSessions: this.userSessions.size,
      mediasoupStats: MediasoupService.getSystemStats(),
    };
  }
}

module.exports = new ScalableSocketService();