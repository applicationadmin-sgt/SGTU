/**
 * Scalable Socket Service using Redis clustering
 * Integrated with existing SGT backend Socket.IO implementation
 */

const { Server } = require('socket.io');
const Redis = require('ioredis');
const jwt = require('jsonwebtoken');

class ScalableSocketService {
  constructor(server, existingIo = null) {
    // Use existing Socket.IO instance or create new one
    this.io = existingIo || new Server(server, {
      cors: {
        origin: [
          "http://localhost:3000",
          "https://localhost:3000",
          "http://192.168.7.20:3000",
          "https://192.168.7.20:3000"
        ],
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      allowEIO3: true,
    });

    this.redis = null;
    this.mediasoupService = null;
    this.connectedUsers = new Map();
    this.classRooms = new Map();
    this.rateLimiter = new Map();
    
    this.isInitialized = false;
  }

  /**
   * Initialize the scalable socket service
   */
  async initialize(mediasoupService) {
    try {
      console.log('🔌 Initializing Scalable Socket Service...');

      this.mediasoupService = mediasoupService;

      // Setup Redis adapter for clustering
      await this.setupRedisAdapter();

      // Setup authentication middleware
      this.setupAuthentication();

      // Setup event handlers
      this.setupEventHandlers();

      // Setup scalable live class socket handlers
      const setupScalableLiveClassSocket = require('./scalableLiveClassSocket');
      setupScalableLiveClassSocket(this.io, this.mediasoupService);

      // Setup rate limiting
      this.setupRateLimiting();

      this.isInitialized = true;
      console.log('✅ Scalable Socket Service initialized');

    } catch (error) {
      console.error('❌ Failed to initialize Socket service:', error);
      throw error;
    }
  }

  /**
   * Setup Redis adapter for Socket.IO clustering
   */
  async setupRedisAdapter() {
    try {
      // Check if Redis adapter is available
      let createAdapter;
      try {
        createAdapter = require('@socket.io/redis-adapter').createAdapter;
      } catch (adapterError) {
        console.warn('⚠️ @socket.io/redis-adapter not installed, running in single-instance mode');
        return; // Skip Redis setup but continue
      }
      
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      // Only try Redis if explicitly enabled
      if (process.env.USE_REDIS !== 'true') {
        console.log('📡 Redis clustering disabled - running in single-instance mode');
        return;
      }

      // Create Redis clients for Socket.IO adapter
      const pubClient = new Redis(redisUrl, {
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        connectTimeout: 5000,
        lazyConnect: true
      });
      
      const subClient = pubClient.duplicate();

      // Test connection before setting up adapter
      await pubClient.ping();
      
      // Setup Redis adapter
      this.io.adapter(createAdapter(pubClient, subClient));
      
      console.log('📡 Socket.IO Redis adapter configured for clustering');
      
    } catch (error) {
      console.warn('⚠️ Redis adapter setup failed, running in single-instance mode:', error.message);
      // Don't throw error, continue without clustering
    }
  }

  /**
   * Setup authentication middleware
   */
  setupAuthentication() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.query.token;
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Get user data (you can integrate with your existing User model)
        const User = require('../models/User');
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user) {
          return next(new Error('User not found'));
        }

        socket.userId = user._id.toString();
        socket.userData = user;
        
        console.log(`🔐 User ${user.name} authenticated via Socket.IO`);
        next();
        
      } catch (error) {
        console.error('❌ Socket authentication error:', error.message);
        next(new Error('Authentication failed'));
      }
    });
  }

  /**
   * Setup rate limiting
   */
  setupRateLimiting() {
    this.io.use((socket, next) => {
      const userId = socket.userId;
      if (!userId) return next();

      const now = Date.now();
      const userRateData = this.rateLimiter.get(userId) || { count: 0, resetTime: now + 60000 };

      if (now > userRateData.resetTime) {
        userRateData.count = 0;
        userRateData.resetTime = now + 60000;
      }

      userRateData.count++;
      
      if (userRateData.count > 100) { // 100 requests per minute
        return next(new Error('Rate limit exceeded'));
      }

      this.rateLimiter.set(userId, userRateData);
      next();
    });
  }

  /**
   * Setup main event handlers
   */
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`🔗 Socket connected: ${socket.id} (User: ${socket.userData?.name})`);
      
      this.connectedUsers.set(socket.userId, {
        socketId: socket.id,
        user: socket.userData,
        connectedAt: Date.now(),
      });

      // Live class events
      this.setupLiveClassEvents(socket);

      // Mediasoup WebRTC events
      this.setupMediasoupEvents(socket);

      // Disconnect handler
      socket.on('disconnect', () => {
        console.log(`🔌 Socket disconnected: ${socket.id} (User: ${socket.userData?.name})`);
        this.handleDisconnection(socket);
      });
    });
  }

  /**
   * Setup live class events
   */
  setupLiveClassEvents(socket) {
    // Join class
    socket.on('joinClass', async (data, callback) => {
      try {
        const { classId, userRole } = data;
        
        console.log(`👤 User ${socket.userData.name} joining class ${classId} as ${userRole}`);

        // Validate class access (integrate with your existing logic)
        const LiveClass = require('../models/LiveClass');
        const liveClass = await LiveClass.findById(classId);
        
        if (!liveClass || liveClass.status !== 'live') {
          return callback({ error: 'Class not found or not live' });
        }

        // Join Socket.IO room
        await socket.join(`class_${classId}`);
        
        // Add to Mediasoup if not already added
        if (this.mediasoupService) {
          try {
            this.mediasoupService.addParticipant(classId, socket.userId, {
              name: socket.userData.name,
              role: userRole,
              socketId: socket.id,
            });
          } catch (error) {
            // Participant might already exist
            console.log('Participant already exists in Mediasoup');
          }
        }

        // Get router RTP capabilities
        const router = await this.mediasoupService.getOrCreateRouter(classId);
        const rtpCapabilities = router.rtpCapabilities;

        // Get existing producers
        const existingProducers = this.mediasoupService.getExistingProducers(classId);

        // Update class room data
        if (!this.classRooms.has(classId)) {
          this.classRooms.set(classId, { 
            participants: new Set(), 
            messages: [], 
            permissions: new Map() 
          });
        }
        this.classRooms.get(classId).participants.add(socket.userId);

        // Notify other participants
        socket.to(`class_${classId}`).emit('userJoined', {
          id: socket.userId,
          name: socket.userData.name,
          role: userRole,
        });

        if (callback && typeof callback === 'function') {
          callback({
            success: true,
            rtpCapabilities,
            existingProducers,
            participants: Array.from(this.classRooms.get(classId).participants).length,
          });
        }

      } catch (error) {
        console.error('❌ Error joining class:', error);
        if (callback && typeof callback === 'function') {
          callback({ error: error.message });
        }
      }
    });

    // Leave class
    socket.on('leaveClass', async (data) => {
      const { classId } = data;
      await this.leaveClass(socket, classId);
    });

    // Chat message
    socket.on('chatMessage', async (data) => {
      try {
        const { classId, text, recipient } = data;
        
        const message = {
          id: Date.now(),
          senderId: socket.userId,
          senderName: socket.userData.name,
          senderRole: socket.userData.role,
          text,
          timestamp: Date.now(),
          recipient,
        };

        // Store message
        if (this.classRooms.has(classId)) {
          this.classRooms.get(classId).messages.push(message);
        }

        // Broadcast or send privately
        if (recipient === 'all') {
          console.log(`✅ Broadcasting chat message to class_${classId}:`, message);
          this.io.to(`class_${classId}`).emit('chat-message', message);
        } else {
          // Private message
          const recipientSocket = this.getSocketByUserId(recipient);
          if (recipientSocket) {
            recipientSocket.emit('chat-message', { ...message, isPrivate: true });
            socket.emit('chat-message', { ...message, isPrivate: true, isSent: true });
          }
        }

      } catch (error) {
        console.error('❌ Error sending chat message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Hand raise (students)
    socket.on('raiseHand', (data) => {
      const { classId } = data;
      socket.to(`class_${classId}`).emit('handRaised', {
        userId: socket.userId,
        userName: socket.userData.name,
      });
    });

    socket.on('lowerHand', (data) => {
      const { classId } = data;
      socket.to(`class_${classId}`).emit('handLowered', {
        userId: socket.userId,
        userName: socket.userData.name,
      });
    });
  }

  /**
   * Setup Mediasoup WebRTC events
   */
  setupMediasoupEvents(socket) {
    // Create transport
    socket.on('createTransport', async (data, callback) => {
      try {
        const { classId, direction } = data;
        
        if (!this.mediasoupService) {
          return callback({ error: 'Mediasoup service not available' });
        }

        const transport = await this.mediasoupService.createWebRtcTransport(classId, direction);
        
        callback({
          success: true,
          transport,
        });

      } catch (error) {
        console.error('❌ Error creating transport:', error);
        callback({ error: error.message });
      }
    });

    // Connect transport
    socket.on('connectTransport', async (data, callback) => {
      try {
        const { transportId, dtlsParameters } = data;
        
        await this.mediasoupService.connectWebRtcTransport(transportId, dtlsParameters);
        
        callback({ success: true });

      } catch (error) {
        console.error('❌ Error connecting transport:', error);
        callback({ error: error.message });
      }
    });

    // Produce media
    socket.on('produce', async (data, callback) => {
      try {
        const { transportId, kind, rtpParameters, classId } = data;
        
        const producerId = await this.mediasoupService.createProducer(
          transportId,
          rtpParameters,
          kind,
          socket.userId,
          classId
        );
        
        callback({
          success: true,
          producerId,
        });

        // Notify other participants about new producer
        socket.to(`class_${classId}`).emit('newProducer', {
          producerId,
          peerId: socket.userId,
          kind,
        });

      } catch (error) {
        console.error('❌ Error producing media:', error);
        callback({ error: error.message });
      }
    });

    // Consume media
    socket.on('consume', async (data, callback) => {
      try {
        const { transportId, producerId, rtpCapabilities, classId } = data;
        
        const consumer = await this.mediasoupService.createConsumer(
          transportId,
          producerId,
          rtpCapabilities,
          socket.userId
        );
        
        callback({
          success: true,
          consumer,
        });

      } catch (error) {
        console.error('❌ Error consuming media:', error);
        callback({ error: error.message });
      }
    });

    // Resume consumer
    socket.on('resumeConsumer', async (data, callback) => {
      try {
        const { consumerId } = data;
        
        await this.mediasoupService.resumeConsumer(consumerId);
        
        callback({ success: true });

      } catch (error) {
        console.error('❌ Error resuming consumer:', error);
        callback({ error: error.message });
      }
    });

    // Pause consumer
    socket.on('pauseConsumer', async (data, callback) => {
      try {
        const { consumerId } = data;
        
        await this.mediasoupService.pauseConsumer(consumerId);
        
        callback({ success: true });

      } catch (error) {
        console.error('❌ Error pausing consumer:', error);
        callback({ error: error.message });
      }
    });

    // Student Permission Management
    socket.on('grant-student-permission', async (data) => {
      try {
        const { studentId, permissionType, classId, grantedBy } = data;
        
        console.log(`🎯 Backend: Processing grant permission request:`, { 
          studentId, 
          permissionType, 
          classId, 
          grantedBy,
          socketRole: socket.userData?.role 
        });
        
        // Verify the user has permission to grant (teacher/admin)
        if (!socket.userData.role || !['teacher', 'admin', 'hod', 'dean'].includes(socket.userData.role)) {
          console.log(`❌ Insufficient role for permission grant:`, socket.userData?.role);
          socket.emit('error', { message: 'Insufficient permissions to grant student permissions' });
          return;
        }

        // Store permission in classRoom data
        if (!this.classRooms.has(classId)) {
          this.classRooms.set(classId, { participants: new Map(), permissions: new Map() });
        }

        const classRoom = this.classRooms.get(classId);
        if (!classRoom.permissions.has(studentId)) {
          classRoom.permissions.set(studentId, {});
        }

        classRoom.permissions.get(studentId)[permissionType] = true;

        console.log(`💾 Stored permission in backend:`, {
          studentId,
          permissionType,
          storedPermissions: Object.fromEntries(classRoom.permissions)
        });

        // Emit to all participants in the class (including the granting teacher)
        this.io.to(`class_${classId}`).emit('permission-granted', {
          studentId: studentId.toString(), // Ensure consistent string format
          permissionType,
          grantedBy: grantedBy.toString(),
          timestamp: new Date(),
          allPermissions: Object.fromEntries(classRoom.permissions) // Send full permissions for sync
        });

        console.log(`✅ Permission granted: ${permissionType} to ${studentId} by ${grantedBy} in class ${classId}`);
        console.log(`📡 Emitted to all participants in class_${classId} with studentId: ${studentId.toString()}`);

      } catch (error) {
        console.error('❌ Error granting student permission:', error);
        socket.emit('error', { message: 'Failed to grant permission' });
      }
    });

    socket.on('revoke-student-permission', async (data) => {
      try {
        const { studentId, permissionType, classId, revokedBy } = data;
        
        // Verify the user has permission to revoke (teacher/admin)
        if (!socket.userData.role || !['teacher', 'admin', 'hod', 'dean'].includes(socket.userData.role)) {
          socket.emit('error', { message: 'Insufficient permissions to revoke student permissions' });
          return;
        }

        // Remove permission from classRoom data
        if (this.classRooms.has(classId)) {
          const classRoom = this.classRooms.get(classId);
          if (classRoom.permissions.has(studentId)) {
            classRoom.permissions.get(studentId)[permissionType] = false;
          }
        }

        // Emit to all participants in the class
        this.io.to(`class_${classId}`).emit('permission-revoked', {
          studentId: studentId.toString(), // Ensure consistent string format
          permissionType,
          revokedBy: revokedBy.toString(),
          timestamp: new Date()
        });

        console.log(`🚫 Permission revoked: ${permissionType} from ${studentId} by ${revokedBy} in class ${classId}`);

      } catch (error) {
        console.error('❌ Error revoking student permission:', error);
        socket.emit('error', { message: 'Failed to revoke permission' });
      }
    });

    // Video Pin/Unpin Events
    socket.on('video-pinned', (data) => {
      try {
        const { classId, pinnedUserId, pinnedUserName, pinnedBy, pinnedByName, pinnedByRole } = data;
        
        // Broadcast to other participants in the class
        socket.to(`class_${classId}`).emit('video-pinned', {
          pinnedUserId,
          pinnedUserName,
          pinnedBy,
          pinnedByName,
          pinnedByRole,
          timestamp: new Date()
        });

        console.log(`📌 Video pinned: ${pinnedUserName} by ${pinnedByName} (${pinnedByRole}) in class ${classId}`);

      } catch (error) {
        console.error('❌ Error handling video pin:', error);
      }
    });

    socket.on('video-unpinned', (data) => {
      try {
        const { classId, unpinnedBy, unpinnedByName, unpinnedByRole } = data;
        
        // Broadcast to other participants in the class
        socket.to(`class_${classId}`).emit('video-unpinned', {
          unpinnedBy,
          unpinnedByName,
          unpinnedByRole,
          timestamp: new Date()
        });

        console.log(`📌 Video unpinned by ${unpinnedByName} (${unpinnedByRole}) in class ${classId}`);

      } catch (error) {
        console.error('❌ Error handling video unpin:', error);
      }
    });

    // Permission Request Handler
    socket.on('request-permission', (data) => {
      try {
        const { studentId, studentName, permissionType, classId, timestamp } = data;
        
        // Emit to all teachers/moderators in the class
        this.io.to(`class_${classId}`).emit('permission-requested', {
          studentId,
          studentName,
          permissionType,
          timestamp
        });

        console.log(`🙋 Permission requested: ${studentName} wants ${permissionType} in class ${classId}`);

      } catch (error) {
        console.error('❌ Error handling permission request:', error);
      }
    });
  }

  /**
   * Handle user disconnection
   */
  async handleDisconnection(socket) {
    try {
      // Remove from connected users
      this.connectedUsers.delete(socket.userId);

      // Leave all class rooms
      const rooms = Array.from(socket.rooms).filter(room => room.startsWith('class_'));
      for (const room of rooms) {
        const classId = room.replace('class_', '');
        await this.leaveClass(socket, classId, false);
      }

      // Clean up Mediasoup resources
      if (this.mediasoupService) {
        await this.mediasoupService.cleanupUserMedia(socket.userId);
      }

    } catch (error) {
      console.error('❌ Error handling disconnection:', error);
    }
  }

  /**
   * Leave class helper
   */
  async leaveClass(socket, classId, notifyOthers = true) {
    try {
      // Leave Socket.IO room
      await socket.leave(`class_${classId}`);

      // Remove from class room data
      if (this.classRooms.has(classId)) {
        this.classRooms.get(classId).participants.delete(socket.userId);
      }

      // Remove from Mediasoup
      if (this.mediasoupService) {
        await this.mediasoupService.removeParticipant(classId, socket.userId);
      }

      // Notify other participants
      if (notifyOthers) {
        socket.to(`class_${classId}`).emit('userLeft', {
          id: socket.userId,
          name: socket.userData.name,
        });
      }

      console.log(`👋 User ${socket.userData.name} left class ${classId}`);

    } catch (error) {
      console.error('❌ Error leaving class:', error);
    }
  }

  /**
   * Get socket by user ID
   */
  getSocketByUserId(userId) {
    const userConnection = this.connectedUsers.get(userId);
    if (userConnection) {
      return this.io.sockets.sockets.get(userConnection.socketId);
    }
    return null;
  }

  /**
   * Broadcast to class
   */
  broadcastToClass(classId, event, data) {
    this.io.to(`class_${classId}`).emit(event, data);
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      connectedUsers: this.connectedUsers.size,
      activeClasses: this.classRooms.size,
      totalSockets: this.io.engine.clientsCount,
      isInitialized: this.isInitialized,
    };
  }

  /**
   * Health check
   */
  async healthCheck() {
    const stats = this.getStats();
    return {
      status: this.isInitialized ? 'healthy' : 'unhealthy',
      ...stats,
      timestamp: Date.now(),
    };
  }

  /**
   * Shutdown service
   */
  async shutdown() {
    try {
      console.log('🔄 Shutting down Socket service...');
      
      // Close all connections
      this.io.close();
      
      console.log('✅ Socket service shutdown complete');
      
    } catch (error) {
      console.error('❌ Error during Socket shutdown:', error);
    }
  }
}

module.exports = ScalableSocketService;