/**
 * Mediasoup SFU Service for Scalable Live Classes
 * Integrated with existing SGT backend system
 * Handles 10,000+ concurrent students per class
 */

const mediasoup = require('mediasoup');
const Redis = require('ioredis');
const EventEmitter = require('events');

class MediasoupService extends EventEmitter {
  constructor() {
    super();
    
    // Core properties
    this.workers = [];
    this.routers = new Map(); // classId -> router
    this.transports = new Map(); // transportId -> transport
    this.producers = new Map(); // producerId -> producer
    this.consumers = new Map(); // consumerId -> consumer
    
    // Class management
    this.classes = new Map(); // classId -> class info
    this.participants = new Map(); // userId -> participant info
    
    // Redis for scaling (disabled for single-instance mode)
    this.redis = null;
    this.useRedis = process.env.USE_REDIS === 'true';
    
    // Configuration
    this.config = {
      worker: {
        rtcMinPort: parseInt(process.env.MEDIASOUP_MIN_PORT) || 10000,
        rtcMaxPort: parseInt(process.env.MEDIASOUP_MAX_PORT) || 11000, // Expanded from 10100 to 11000
        logLevel: 'warn',
        logTags: [
          'info',
          'ice',
          'dtls',
          'rtp',
          'srtp',
          'rtcp',
          'rtx',
          'bwe',
          'score',
          'simulcast',
          'svc'
        ],
      },
      router: {
        mediaCodecs: [
          {
            kind: 'audio',
            mimeType: 'audio/opus',
            clockRate: 48000,
            channels: 2,
          },
          {
            kind: 'video',
            mimeType: 'video/VP8',
            clockRate: 90000,
            parameters: {
              'x-google-start-bitrate': 1000,
            },
          },
          {
            kind: 'video',
            mimeType: 'video/VP9',
            clockRate: 90000,
            parameters: {
              'profile-id': 2,
              'x-google-start-bitrate': 1000,
            },
          },
          {
            kind: 'video',
            mimeType: 'video/h264',
            clockRate: 90000,
            parameters: {
              'packetization-mode': 1,
              'profile-level-id': '4d0032',
              'level-asymmetry-allowed': 1,
              'x-google-start-bitrate': 1000,
            },
          },
          {
            kind: 'video',
            mimeType: 'video/h264',
            clockRate: 90000,
            parameters: {
              'packetization-mode': 1,
              'profile-level-id': '42e01f',
              'level-asymmetry-allowed': 1,
              'x-google-start-bitrate': 1000,
            },
          },
        ],
      },
      webRtcTransport: {
        listenIps: [
          {
            ip: '0.0.0.0',
            announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP || process.env.EXTERNAL_IP || '127.0.0.1',
          },
        ],
        maxIncomingBitrate: 1500000,
        initialAvailableOutgoingBitrate: 1000000,
        minimumAvailableOutgoingBitrate: 600000,
        maxSctpMessageSize: 262144,
      },
    };

    this.workerIndex = 0;
    this.isInitialized = false;
  }

  /**
   * Initialize the Mediasoup service
   */
  async initialize() {
    try {
      console.log('🚀 Initializing Mediasoup SFU Service...');

      // Initialize Redis connection
      await this.initializeRedis();

      // Create worker processes
      const numWorkers = parseInt(process.env.MEDIASOUP_WORKERS) || require('os').cpus().length;
      
      for (let i = 0; i < numWorkers; i++) {
        await this.createWorker();
      }

      this.isInitialized = true;
      console.log(`✅ Mediasoup SFU Service initialized with ${this.workers.length} workers`);
      
      // Setup periodic cleanup
      this.setupCleanup();
      
    } catch (error) {
      console.error('❌ Failed to initialize Mediasoup service:', error);
      throw error;
    }
  }

  /**
   * Initialize Redis connection for scaling (optional)
   */
  async initializeRedis() {
    if (!this.useRedis) {
      console.log('📡 Running in single-instance mode (Redis disabled)');
      return;
    }
    
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      this.redis = new Redis(redisUrl, {
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });

      await this.redis.connect();
      console.log('📡 Connected to Redis for SFU scaling');
      
    } catch (error) {
      console.warn('⚠️ Redis connection failed, running without clustering:', error.message);
      this.redis = null;
    }
  }

  /**
   * Create a mediasoup worker
   */
  async createWorker() {
    try {
      const worker = await mediasoup.createWorker({
        logLevel: this.config.worker.logLevel,
        logTags: this.config.worker.logTags,
        rtcMinPort: this.config.worker.rtcMinPort,
        rtcMaxPort: this.config.worker.rtcMaxPort,
      });

      worker.on('died', () => {
        console.error('❌ Mediasoup worker died, creating new one...');
        this.workers = this.workers.filter(w => w !== worker);
        this.createWorker();
      });

      this.workers.push(worker);
      console.log(`👷 Created Mediasoup worker ${this.workers.length}`);
      
      return worker;
    } catch (error) {
      console.error('❌ Failed to create worker:', error);
      throw error;
    }
  }

  /**
   * Get the next available worker (load balancing)
   */
  getNextWorker() {
    if (this.workers.length === 0) {
      throw new Error('No workers available');
    }

    const worker = this.workers[this.workerIndex % this.workers.length];
    this.workerIndex++;
    return worker;
  }

  /**
   * Create a router for a live class
   */
  async createClassRouter(classId) {
    try {
      if (this.routers.has(classId)) {
        return this.routers.get(classId);
      }

      const worker = this.getNextWorker();
      const router = await worker.createRouter({
        mediaCodecs: this.config.router.mediaCodecs,
      });

      this.routers.set(classId, router);
      
      // Store class info
      this.classes.set(classId, {
        classId,
        router,
        participants: new Set(),
        createdAt: Date.now(),
        lastActivity: Date.now(),
      });

      console.log(`📺 Created router for class ${classId}`);
      
      // Notify via Redis for clustering
      if (this.redis) {
        await this.redis.publish('mediasoup:router:created', JSON.stringify({
          classId,
          workerId: worker.pid,
          timestamp: Date.now(),
        }));
      }

      return router;
    } catch (error) {
      console.error(`❌ Failed to create router for class ${classId}:`, error);
      throw error;
    }
  }

  /**
   * Create WebRTC transport
   */
  async createWebRtcTransport(classId, direction = 'both') {
    try {
      const router = await this.getOrCreateRouter(classId);
      
      const transport = await router.createWebRtcTransport({
        ...this.config.webRtcTransport,
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
      });

      this.transports.set(transport.id, { transport, classId, direction });

      console.log(`🚛 Created ${direction} transport ${transport.id} for class ${classId}`);

      return {
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
        sctpParameters: transport.sctpParameters,
      };
    } catch (error) {
      console.error(`❌ Failed to create transport for class ${classId}:`, error);
      throw error;
    }
  }

  /**
   * Connect WebRTC transport
   */
  async connectWebRtcTransport(transportId, dtlsParameters) {
    try {
      console.log(`🔗 Connecting transport ${transportId}`);
      
      const transportData = this.transports.get(transportId);
      if (!transportData) {
        throw new Error(`Transport ${transportId} not found`);
      }

      // Check if transport is already connected or connecting
      if (transportData.connected || transportData.connecting) {
        console.log(`⚠️ Transport ${transportId} already connected/connecting, skipping`);
        return;
      }
      
      // Mark as connecting to prevent duplicate calls
      transportData.connecting = true;
      
      try {
        await transportData.transport.connect({ dtlsParameters });
        transportData.connected = true;
        transportData.connecting = false;
        console.log(`🔗 Connected transport ${transportId}`);
        
      } catch (connectError) {
        transportData.connecting = false;
        throw connectError;
      }
      
    } catch (error) {
      console.error(`❌ Failed to connect transport ${transportId}:`, error);
      throw error;
    }
  }

  /**
   * Create producer (teacher sending media)
   */
  async createProducer(transportId, rtpParameters, kind, userId, classId) {
    try {
      const transportData = this.transports.get(transportId);
      if (!transportData) {
        throw new Error(`Transport ${transportId} not found`);
      }

      // Check if user already has a producer for this kind
      const existingProducer = Array.from(this.producers.values())
        .find(p => p.userId === userId && p.kind === kind && p.classId === classId);
      
      if (existingProducer) {
        console.log(`⚠️ User ${userId} already has ${kind} producer ${existingProducer.producer.id}, closing old one`);
        existingProducer.producer.close();
        this.producers.delete(existingProducer.producer.id);
      }

      const producer = await transportData.transport.produce({
        kind,
        rtpParameters,
      });

      this.producers.set(producer.id, {
        producer,
        userId,
        classId,
        kind,
        createdAt: Date.now(),
      });

      console.log(`📡 Created ${kind} producer ${producer.id} for user ${userId} in class ${classId}`);

      // Notify other participants
      this.emit('newProducer', {
        classId,
        producerId: producer.id,
        userId,
        kind,
      });

      return producer.id;
    } catch (error) {
      console.error(`❌ Failed to create producer:`, error);
      throw error;
    }
  }

  /**
   * Create consumer (student receiving media)
   */
  async createConsumer(transportId, producerId, rtpCapabilities, userId) {
    try {
      console.log(`🔍 Creating consumer - Transport: ${transportId}, Producer: ${producerId}, User: ${userId}`);
      
      const transportData = this.transports.get(transportId);
      const producerData = this.producers.get(producerId);
      
      console.log(`🔍 Transport found: ${!!transportData}, Producer found: ${!!producerData}`);
      
      if (!transportData) {
        throw new Error(`Transport ${transportId} not found`);
      }
      
      if (!producerData) {
        throw new Error(`Producer ${producerId} not found`);
      }

      const router = transportData.transport.router;
      
      if (!router) {
        console.error('🔍 Router is undefined! Transport:', {
          id: transportData.transport.id,
          closed: transportData.transport.closed,
          hasRouter: !!transportData.transport.router,
          transportType: typeof transportData.transport
        });
        throw new Error('Router not available on transport - transport may be closed or invalid');
      }
      
      // Validate router has the canConsume method
      if (typeof router.canConsume !== 'function') {
        throw new Error('Router canConsume method not available - invalid router object');
      }
      
      console.log(`🔍 Checking if router can consume producer ${producerId}...`);
      
      let canConsume;
      try {
        canConsume = router.canConsume({
          producerId,
          rtpCapabilities,
        });
      } catch (canConsumeError) {
        console.error(`❌ Error checking canConsume:`, canConsumeError);
        throw new Error(`Failed to check router canConsume: ${canConsumeError.message}`);
      }
      
      console.log(`🔍 Router canConsume result: ${canConsume}`);
      
      if (!canConsume) {
        throw new Error(`Router cannot consume producer ${producerId} - RTP capabilities mismatch`);
      }

      console.log(`🔄 Creating consumer on transport...`);
      
      const consumer = await transportData.transport.consume({
        producerId,
        rtpCapabilities,
        paused: true, // Start paused
      });

      console.log(`✅ Consumer created successfully:`, {
        id: consumer.id,
        kind: consumer.kind,
        producerId: consumer.producerId,
        paused: consumer.paused
      });

      this.consumers.set(consumer.id, {
        consumer,
        userId,
        producerId,
        classId: producerData.classId,
        createdAt: Date.now(),
      });

      console.log(`📺 Consumer ${consumer.id} stored for user ${userId}`);

      const result = {
        id: consumer.id,
        producerId: consumer.producerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
      };
      
      console.log(`📤 Returning consumer result:`, result);
      
      return result;
    } catch (error) {
      console.error(`❌ Failed to create consumer:`, error);
      throw error;
    }
  }

  /**
   * Resume consumer
   */
  async resumeConsumer(consumerId) {
    try {
      const consumerData = this.consumers.get(consumerId);
      if (!consumerData) {
        throw new Error(`Consumer ${consumerId} not found`);
      }

      await consumerData.consumer.resume();
      console.log(`▶️ Resumed consumer ${consumerId}`);
      
    } catch (error) {
      console.error(`❌ Failed to resume consumer ${consumerId}:`, error);
      throw error;
    }
  }

  /**
   * Pause consumer
   */
  async pauseConsumer(consumerId) {
    try {
      const consumerData = this.consumers.get(consumerId);
      if (!consumerData) {
        throw new Error(`Consumer ${consumerId} not found`);
      }

      await consumerData.consumer.pause();
      console.log(`⏸️ Paused consumer ${consumerId}`);
      
    } catch (error) {
      console.error(`❌ Failed to pause consumer ${consumerId}:`, error);
      throw error;
    }
  }

  /**
   * Close producer (for camera/mic toggle)
   */
  async closeProducer(producerId) {
    try {
      const producerData = this.producers.get(producerId);
      if (!producerData) {
        console.warn(`⚠️ Producer ${producerId} not found (might already be closed)`);
        return;
      }

      // Close the producer
      if (!producerData.producer.closed) {
        producerData.producer.close();
      }

      // Remove from map
      this.producers.delete(producerId);
      
      console.log(`🗑️ Closed producer ${producerId} for user ${producerData.userId}`);
      
    } catch (error) {
      console.error(`❌ Failed to close producer ${producerId}:`, error);
      throw error;
    }
  }

  /**
   * Get or create router for class
   */
  async getOrCreateRouter(classId) {
    if (this.routers.has(classId)) {
      return this.routers.get(classId);
    }
    return this.createClassRouter(classId);
  }

  /**
   * Get existing producers for a class
   */
  getExistingProducers(classId) {
    const producers = [];
    for (const [producerId, data] of this.producers) {
      if (data.classId === classId) {
        producers.push({
          id: producerId,
          producerId,
          peerId: String(data.userId), // Convert to string for consistent comparison
          userId: String(data.userId),
          kind: data.kind,
        });
      }
    }
    console.log(`📋 Returning ${producers.length} existing producers for class ${classId}`);
    return producers;
  }

  /**
   * Add participant to class
   */
  addParticipant(classId, userId, userData = {}) {
    if (!this.classes.has(classId)) {
      throw new Error(`Class ${classId} not found`);
    }

    const classData = this.classes.get(classId);
    
    // Check if participant already exists
    if (classData.participants.has(userId)) {
      console.log(`⚠️ Participant ${userId} already exists in class ${classId}, updating`);
      const existingData = this.participants.get(userId);
      this.participants.set(userId, {
        ...existingData,
        ...userData,
        lastUpdated: Date.now(),
      });
    } else {
      classData.participants.add(userId);
      this.participants.set(userId, {
        userId,
        classId,
        ...userData,
        joinedAt: Date.now(),
      });
      console.log(`👤 Added participant ${userId} to class ${classId}`);
    }
    
    classData.lastActivity = Date.now();
  }

  /**
   * Remove participant from class
   */
  async removeParticipant(classId, userId) {
    try {
      if (this.classes.has(classId)) {
        const classData = this.classes.get(classId);
        classData.participants.delete(userId);
      }

      this.participants.delete(userId);

      // Clean up user's producers and consumers
      await this.cleanupUserMedia(userId);

      console.log(`👋 Removed participant ${userId} from class ${classId}`);
      
    } catch (error) {
      console.error(`❌ Failed to remove participant ${userId}:`, error);
    }
  }

  /**
   * Clean up user's media (producers and consumers)
   */
  async cleanupUserMedia(userId) {
    try {
      // Close producers
      for (const [producerId, data] of this.producers) {
        if (data.userId === userId) {
          data.producer.close();
          this.producers.delete(producerId);
          console.log(`🗑️ Closed producer ${producerId} for user ${userId}`);
        }
      }

      // Close consumers
      for (const [consumerId, data] of this.consumers) {
        if (data.userId === userId) {
          data.consumer.close();
          this.consumers.delete(consumerId);
          console.log(`🗑️ Closed consumer ${consumerId} for user ${userId}`);
        }
      }
    } catch (error) {
      console.error(`❌ Failed to cleanup media for user ${userId}:`, error);
    }
  }

  /**
   * Close class and cleanup resources
   */
  async closeClass(classId) {
    try {
      if (!this.classes.has(classId)) {
        return;
      }

      const classData = this.classes.get(classId);
      
      // Close all transports for this class
      for (const [transportId, data] of this.transports) {
        if (data.classId === classId) {
          data.transport.close();
          this.transports.delete(transportId);
        }
      }

      // Close router
      classData.router.close();
      this.routers.delete(classId);
      this.classes.delete(classId);

      console.log(`🔐 Closed class ${classId} and cleaned up resources`);
      
    } catch (error) {
      console.error(`❌ Failed to close class ${classId}:`, error);
    }
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      workers: this.workers.length,
      classes: this.classes.size,
      participants: this.participants.size,
      routers: this.routers.size,
      transports: this.transports.size,
      producers: this.producers.size,
      consumers: this.consumers.size,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }

  /**
   * Setup periodic cleanup
   */
  setupCleanup() {
    setInterval(() => {
      this.performCleanup();
    }, 300000); // Every 5 minutes
  }

  /**
   * Perform periodic cleanup
   */
  performCleanup() {
    const now = Date.now();
    const timeout = 30 * 60 * 1000; // 30 minutes

    // Clean up inactive classes
    for (const [classId, classData] of this.classes) {
      if (now - classData.lastActivity > timeout) {
        console.log(`🧹 Cleaning up inactive class ${classId}`);
        this.closeClass(classId);
      }
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    const stats = this.getStats();
    const isHealthy = this.isInitialized && this.workers.length > 0;
    
    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      ...stats,
      timestamp: Date.now(),
    };
  }

  /**
   * Shutdown service gracefully
   */
  async shutdown() {
    try {
      console.log('🔄 Shutting down Mediasoup service...');

      // Close all classes
      for (const classId of this.classes.keys()) {
        await this.closeClass(classId);
      }

      // Close workers
      for (const worker of this.workers) {
        worker.close();
      }

      // Close Redis connection
      if (this.redis) {
        await this.redis.disconnect();
      }

      console.log('✅ Mediasoup service shutdown complete');
      
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
    }
  }
}

module.exports = MediasoupService;