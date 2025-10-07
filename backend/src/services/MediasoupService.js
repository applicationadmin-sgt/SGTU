/**
 * Mediasoup SFU Service for Scalable Video Conferencing
 * Handles 10,000+ concurrent students with efficient media distribution
 */

const mediasoup = require('mediasoup');
const { EventEmitter } = require('events');
const config = require('../config/mediasoup.config');

class MediasoupService extends EventEmitter {
  constructor() {
    super();
    this.workers = [];
    this.routers = new Map(); // classId -> router
    this.transports = new Map(); // transportId -> transport
    this.producers = new Map(); // producerId -> producer
    this.consumers = new Map(); // consumerId -> consumer
    this.peers = new Map(); // peerId -> peer info
    this.rooms = new Map(); // classId -> room info
    
    this.initializeWorkers();
  }

  /**
   * Initialize Mediasoup workers based on CPU cores
   * Each worker can handle ~500 peers efficiently
   */
  async initializeWorkers() {
    const numWorkers = config.mediasoup.numWorkers;
    
    console.log(`🚀 Initializing ${numWorkers} Mediasoup workers...`);
    
    for (let i = 0; i < numWorkers; i++) {
      const worker = await mediasoup.createWorker({
        logLevel: config.mediasoup.worker.logLevel,
        logTags: config.mediasoup.worker.logTags,
        rtcMinPort: config.mediasoup.worker.rtcMinPort,
        rtcMaxPort: config.mediasoup.worker.rtcMaxPort,
      });

      worker.on('died', () => {
        console.error('❌ Mediasoup worker died, restarting...');
        this.restartWorker(i);
      });

      this.workers.push(worker);
      console.log(`✅ Worker ${i + 1} initialized`);
    }
  }

  /**
   * Get least loaded worker for load balancing
   */
  getLeastLoadedWorker() {
    return this.workers.reduce((prev, curr) => {
      return (prev.appData.load || 0) < (curr.appData.load || 0) ? prev : curr;
    });
  }

  /**
   * Create router for a live class
   * Each class gets its own router for isolation
   */
  async createClassRouter(classId) {
    try {
      if (this.routers.has(classId)) {
        return this.routers.get(classId);
      }

      const worker = this.getLeastLoadedWorker();
      const router = await worker.createRouter({
        mediaCodecs: config.mediasoup.router.mediaCodecs,
      });

      // Increase worker load counter
      worker.appData.load = (worker.appData.load || 0) + 1;

      this.routers.set(classId, router);
      
      // Initialize room info
      this.rooms.set(classId, {
        router,
        peers: new Map(),
        teachers: new Set(),
        students: new Set(),
        createdAt: new Date(),
      });

      console.log(`🏫 Created router for class: ${classId}`);
      return router;
    } catch (error) {
      console.error('❌ Error creating router:', error);
      throw error;
    }
  }

  /**
   * Create WebRTC transport for peer connection
   */
  async createTransport(classId, peerId, direction) {
    try {
      const router = await this.createClassRouter(classId);
      
      const transportOptions = {
        listenIps: config.mediasoup.webRtcTransport.listenIps,
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
        ...config.mediasoup.webRtcTransport.initialAvailableOutgoingBitrate && {
          initialAvailableOutgoingBitrate: config.mediasoup.webRtcTransport.initialAvailableOutgoingBitrate,
        },
      };

      const transport = await router.createWebRtcTransport(transportOptions);
      
      const transportInfo = {
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
        sctpParameters: transport.sctpParameters,
      };

      this.transports.set(transport.id, {
        transport,
        classId,
        peerId,
        direction, // 'send' or 'recv'
      });

      // Handle transport events
      transport.on('dtlsstatechange', (dtlsState) => {
        if (dtlsState === 'failed' || dtlsState === 'closed') {
          console.log(`🔌 Transport ${transport.id} DTLS state: ${dtlsState}`);
        }
      });

      transport.on('@close', () => {
        this.transports.delete(transport.id);
      });

      console.log(`🚛 Created ${direction} transport for peer ${peerId} in class ${classId}`);
      return transportInfo;
    } catch (error) {
      console.error('❌ Error creating transport:', error);
      throw error;
    }
  }

  /**
   * Connect transport with DTLS parameters
   */
  async connectTransport(transportId, dtlsParameters) {
    try {
      const transportData = this.transports.get(transportId);
      if (!transportData) {
        throw new Error('Transport not found');
      }

      await transportData.transport.connect({ dtlsParameters });
      console.log(`🔗 Connected transport: ${transportId}`);
    } catch (error) {
      console.error('❌ Error connecting transport:', error);
      throw error;
    }
  }

  /**
   * Create producer for media stream (teacher video/audio)
   */
  async createProducer(transportId, rtpParameters, kind, peerId, classId) {
    try {
      const transportData = this.transports.get(transportId);
      if (!transportData) {
        throw new Error('Transport not found');
      }

      const producer = await transportData.transport.produce({
        kind,
        rtpParameters,
      });

      this.producers.set(producer.id, {
        producer,
        peerId,
        classId,
        kind,
      });

      // Add to room info
      const room = this.rooms.get(classId);
      if (room) {
        const peer = room.peers.get(peerId) || { producers: new Map() };
        peer.producers.set(kind, producer);
        room.peers.set(peerId, peer);
      }

      producer.on('transportclose', () => {
        this.producers.delete(producer.id);
        this.emit('producerClosed', { producerId: producer.id, peerId, classId });
      });

      console.log(`🎥 Created ${kind} producer for peer ${peerId} in class ${classId}`);
      
      // Notify other peers about new producer
      this.emit('newProducer', { 
        producerId: producer.id, 
        peerId, 
        classId, 
        kind 
      });

      return { id: producer.id };
    } catch (error) {
      console.error('❌ Error creating producer:', error);
      throw error;
    }
  }

  /**
   * Create consumer for receiving media (students receive teacher stream)
   */
  async createConsumer(transportId, producerId, rtpCapabilities, peerId, classId) {
    try {
      const router = this.routers.get(classId);
      const transportData = this.transports.get(transportId);
      
      if (!router || !transportData) {
        throw new Error('Router or transport not found');
      }

      if (!router.canConsume({ producerId, rtpCapabilities })) {
        throw new Error('Cannot consume this producer');
      }

      const consumer = await transportData.transport.consume({
        producerId,
        rtpCapabilities,
        paused: true, // Start paused for bandwidth optimization
      });

      this.consumers.set(consumer.id, {
        consumer,
        peerId,
        classId,
        producerId,
      });

      consumer.on('transportclose', () => {
        this.consumers.delete(consumer.id);
      });

      consumer.on('producerclose', () => {
        this.consumers.delete(consumer.id);
        this.emit('consumerClosed', { consumerId: consumer.id, peerId, classId });
      });

      console.log(`📺 Created consumer for peer ${peerId} in class ${classId}`);

      return {
        id: consumer.id,
        producerId: producerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
      };
    } catch (error) {
      console.error('❌ Error creating consumer:', error);
      throw error;
    }
  }

  /**
   * Resume consumer (start receiving media)
   */
  async resumeConsumer(consumerId) {
    try {
      const consumerData = this.consumers.get(consumerId);
      if (!consumerData) {
        throw new Error('Consumer not found');
      }

      await consumerData.consumer.resume();
      console.log(`▶️ Resumed consumer: ${consumerId}`);
    } catch (error) {
      console.error('❌ Error resuming consumer:', error);
      throw error;
    }
  }

  /**
   * Pause consumer (stop receiving media for bandwidth optimization)
   */
  async pauseConsumer(consumerId) {
    try {
      const consumerData = this.consumers.get(consumerId);
      if (!consumerData) {
        throw new Error('Consumer not found');
      }

      await consumerData.consumer.pause();
      console.log(`⏸️ Paused consumer: ${consumerId}`);
    } catch (error) {
      console.error('❌ Error pausing consumer:', error);
      throw error;
    }
  }

  /**
   * Get router RTP capabilities for a class
   */
  async getRouterCapabilities(classId) {
    const router = await this.createClassRouter(classId);
    return router.rtpCapabilities;
  }

  /**
   * Join peer to class room
   */
  async joinClass(classId, peerId, userRole) {
    try {
      const room = this.rooms.get(classId) || 
                   (await this.createClassRouter(classId), this.rooms.get(classId));

      const peerInfo = {
        id: peerId,
        role: userRole,
        producers: new Map(),
        consumers: new Map(),
        transports: new Map(),
        joinedAt: new Date(),
      };

      room.peers.set(peerId, peerInfo);
      
      if (userRole === 'teacher') {
        room.teachers.add(peerId);
      } else {
        room.students.add(peerId);
      }

      console.log(`👤 Peer ${peerId} (${userRole}) joined class ${classId}`);
      
      // Return existing producers for this peer to consume
      const existingProducers = [];
      for (const [otherPeerId, peer] of room.peers) {
        if (otherPeerId !== peerId) {
          for (const [kind, producer] of peer.producers) {
            existingProducers.push({
              producerId: producer.id,
              peerId: otherPeerId,
              kind,
            });
          }
        }
      }

      return {
        rtpCapabilities: room.router.rtpCapabilities,
        existingProducers,
        roomInfo: {
          totalPeers: room.peers.size,
          teachers: room.teachers.size,
          students: room.students.size,
        },
      };
    } catch (error) {
      console.error('❌ Error joining class:', error);
      throw error;
    }
  }

  /**
   * Leave class and cleanup resources
   */
  async leaveClass(classId, peerId) {
    try {
      const room = this.rooms.get(classId);
      if (!room) return;

      const peer = room.peers.get(peerId);
      if (!peer) return;

      // Close all transports for this peer
      for (const [transportId, transport] of peer.transports) {
        transport.close();
        this.transports.delete(transportId);
      }

      // Close all producers for this peer
      for (const [kind, producer] of peer.producers) {
        producer.close();
        this.producers.delete(producer.id);
      }

      // Close all consumers for this peer
      for (const [consumerId, consumer] of peer.consumers) {
        consumer.close();
        this.consumers.delete(consumerId);
      }

      // Remove from room
      room.peers.delete(peerId);
      room.teachers.delete(peerId);
      room.students.delete(peerId);

      console.log(`👋 Peer ${peerId} left class ${classId}`);

      // If room is empty, clean up router
      if (room.peers.size === 0) {
        room.router.close();
        this.routers.delete(classId);
        this.rooms.delete(classId);
        console.log(`🗑️ Cleaned up empty class: ${classId}`);
      }

      this.emit('peerLeft', { classId, peerId });
    } catch (error) {
      console.error('❌ Error leaving class:', error);
    }
  }

  /**
   * Get class statistics for monitoring
   */
  getClassStats(classId) {
    const room = this.rooms.get(classId);
    if (!room) return null;

    return {
      classId,
      totalPeers: room.peers.size,
      teachers: room.teachers.size,
      students: room.students.size,
      producers: Array.from(room.peers.values()).reduce((acc, peer) => acc + peer.producers.size, 0),
      consumers: Array.from(room.peers.values()).reduce((acc, peer) => acc + peer.consumers.size, 0),
      createdAt: room.createdAt,
      uptime: Date.now() - room.createdAt.getTime(),
    };
  }

  /**
   * Get system-wide statistics
   */
  getSystemStats() {
    return {
      workers: this.workers.length,
      totalRooms: this.rooms.size,
      totalTransports: this.transports.size,
      totalProducers: this.producers.size,
      totalConsumers: this.consumers.size,
      totalPeers: Array.from(this.rooms.values()).reduce((acc, room) => acc + room.peers.size, 0),
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
    };
  }
}

module.exports = new MediasoupService();