/**
 * Scalable WebRTC Manager for handling 10,000+ concurrent students
 * Optimized for one-to-many streaming with SFU integration
 */

// Fix mediasoup-client import for proper Device constructor access
import * as mediasoupClient from 'mediasoup-client';
import io from 'socket.io-client';

class ScalableWebRTCManager {
  constructor() {
    this.socket = null;
    this.device = null;
    this.sendTransport = null;
    this.recvTransport = null;
    
    // Media producers (teacher)
    this.producers = new Map(); // kind -> producer
    
    // Media consumers (students receiving)
    this.consumers = new Map(); // producerId -> consumer
    
    // Producer to peer mapping
    this.producerToPeer = new Map(); // producerId -> peerId
    
    // Producer debouncing
    this.pendingConsumptions = new Map(); // producerId -> timeout
    this.recentlyClosedProducers = new Set(); // Track recently closed producers
    
  // Local streams
  this.localStream = null;
  this.screenStream = null;
  
  // Room info
  this.classId = null;
  this.userId = null;
  this.userName = null;
  this.userRole = null;
  this.isConnected = false;
  this._joinedClass = false; // Flag to prevent duplicate joins
  
  // Media state
  this.micEnabled = true;
  this.cameraEnabled = true;
  this.isScreenSharing = false;    // Callbacks
    this.onRemoteStream = null;
  this.onLocalStream = null; // callback(localStream)
    this.onUserJoined = null;
    this.onUserLeft = null;
    this.onConnectionStateChange = null;
    this.onError = null;
    
    // Quality optimization
    this.adaptiveQuality = true;
    this.targetBitrate = 1000000; // 1 Mbps
    this.currentQuality = 'high'; // high, medium, low
    
    // Statistics
    this.stats = {
      bytesReceived: 0,
      bytesSent: 0,
      packetsLost: 0,
      jitter: 0,
      roundTripTime: 0,
    };

    this.setupDevice();
  }

  /**
   * Initialize Mediasoup device
   */
  async setupDevice() {
    try {
      // Direct Device usage from namespace import
      this.device = new mediasoupClient.Device();
      console.log('📱 ✅ Mediasoup Device created successfully');
      console.log('📱 Device capabilities check:', {
        canProduce: this.device.canProduce ? 'Yes' : 'No',
        loaded: this.device.loaded
      });
    } catch (error) {
      console.error('❌ Failed to create Mediasoup device:', error);
      console.error('❌ mediasoupClient structure:', mediasoupClient);
      console.error('❌ typeof mediasoupClient:', typeof mediasoupClient);
      throw error;
    }
  }

  /**
   * Load device with RTP capabilities from server
   */
  async loadDevice(rtpCapabilities) {
    try {
      if (!this.device) {
        await this.setupDevice();
      }
      
      if (!this.device.loaded) {
        await this.device.load({ routerRtpCapabilities: rtpCapabilities });
        console.log('✅ Device loaded with RTP capabilities');
      } else {
        console.log('ℹ️ Device already loaded');
      }
      
      return true;
    } catch (error) {
      console.error('❌ Failed to load device:', error);
      throw error;
    }
  }

  /**
   * Produce a single media track to the SFU server
   * @param {string} kind - 'video' or 'audio'
   * @param {MediaStreamTrack} track - The track to produce
   */
  async produceTrack(kind, track) {
    try {
      if (!this.sendTransport) {
        throw new Error('Send transport not initialized');
      }

      if (!track) {
        throw new Error(`No ${kind} track provided`);
      }

      // Close existing producer of same kind
      const existingProducer = this.producers.get(kind);
      if (existingProducer && !existingProducer.closed) {
        console.log(`⚠️ Closing existing ${kind} producer`);
        existingProducer.close();
        this.producers.delete(kind);
      }

      // Produce the track
      console.log(`📡 Producing ${kind} track to mediasoup server...`);
      const producer = await this.sendTransport.produce({ track });
      this.producers.set(kind, producer);
      
      console.log(`✅ ${kind} track produced successfully, id: ${producer.id}`);
      
      // Monitor producer for quality adaptation
      if (this.adaptiveQuality) {
        this.monitorProducerStats(producer);
      }

      return producer;
    } catch (error) {
      console.error(`❌ Error producing ${kind} track:`, error);
      throw error;
    }
  }

  // Initialize local media streams
  async initializeLocalMedia(isTeacher = true) {
    try {
      console.log('🎥 Initializing local media for role:', this.userRole || (isTeacher ? 'teacher' : 'student'));
      
      // Get media access based on permissions - all users should try to get media
      // The actual usage will be controlled by class settings in the UI layer
      const constraints = {
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          facingMode: 'user',
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000
        }
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      console.log('✅ Local media initialized:', {
        video: this.localStream.getVideoTracks().length,
        audio: this.localStream.getAudioTracks().length,
        role: this.userRole
      });
      
      return this.localStream;
    } catch (error) {
      console.error('❌ Failed to initialize local media:', error);
      
      // Fallback: audio-only for students or if camera fails
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('📢 Fallback: Audio-only media initialized');
        return this.localStream;
      } catch (audioError) {
        console.error('❌ Audio fallback also failed:', audioError);
        throw audioError;
      }
    }
  }

  /**
   * Connect to scalable live class - SIMPLIFIED VERSION
   */
  async connect({ serverUrl, classId, userId, userName, userRole, token }) {
    try {
      console.log('CONNECTING to:', { serverUrl, classId, userId, userRole });
      
      this.classId = classId;
      this.userId = userId;
      this.userName = userName;
      this.userRole = userRole;

      // Simple socket connection
      this.socket = io(serverUrl, { auth: { token } });

      // Wait for connection
      await new Promise((resolve, reject) => {
        this.socket.on('connect', () => {
          console.log('SOCKET CONNECTED');
          resolve();
        });
        this.socket.on('connect_error', reject);
        setTimeout(() => reject(new Error('Connection timeout')), 10000);
      });

      // Enhanced event handlers with detailed logging
      this.socket.on('newProducer', async ({ producerId, peerId, kind }) => {
        console.log('🆕 NEW PRODUCER DETECTED:', {
          producerId,
          peerId,
          kind,
          myUserId: this.userId,
          myRole: this.userRole,
          isOwnProducer: String(peerId) === String(this.userId),
          timestamp: new Date().toISOString()
        });
        
        console.log(`📡 STREAMING FLOW: Received notification that peer ${peerId} (${kind}) has started streaming`);
        
        if (String(peerId) === String(this.userId)) {
          console.log('⏭️ Skipping consume of own producer');
          return;
        }
        
        // Check if this producer was recently closed to avoid immediate retry
        const producerKey = `${peerId}-${kind}`;
        if (this.recentlyClosedProducers.has(producerKey)) {
          console.log(`⚠️ Producer ${producerKey} was recently closed, waiting before consuming...`);
          // Remove from recently closed after a delay
          setTimeout(() => {
            this.recentlyClosedProducers.delete(producerKey);
          }, 2000);
        }
        
        // Store mapping for later UI association
        if (peerId) {
          this.producerToPeer.set(producerId, peerId);
          console.log('🗺️ Stored producer->peer mapping:', producerId, '->', peerId);
        }
        
        console.log('🍽️ Attempting to consume producer from peer:', peerId);
        
        // Cancel any pending consumption for this producer
        if (this.pendingConsumptions.has(producerId)) {
          clearTimeout(this.pendingConsumptions.get(producerId));
          this.pendingConsumptions.delete(producerId);
        }
        
        // Use exponential backoff retry mechanism for producer consumption
        this.retryProducerConsumption(producerId, peerId, kind);
      });

      // Add producerClosed handler before joining
      this.socket.on('producerClosed', ({ producerId, peerId, kind }) => {
        console.log('🔌 Producer closed notification:', { producerId, peerId, kind });
        
        // Track recently closed producers to avoid immediate retry
        const producerKey = `${peerId}-${kind}`;
        this.recentlyClosedProducers.add(producerKey);
        
        // Cancel any pending consumption for this producer
        if (this.pendingConsumptions.has(producerId)) {
          clearTimeout(this.pendingConsumptions.get(producerId));
          this.pendingConsumptions.delete(producerId);
          console.log('⏹️ Cancelled pending consumption for closed producer:', producerId);
        }
        
        // Clean up consumer if we have one for this producer
        const consumer = this.consumers.get(producerId);
        if (consumer && !consumer.closed) {
          console.log('🗑️ Closing consumer for closed producer:', producerId);
          consumer.close();
          this.consumers.delete(producerId);
          
          // Notify UI that stream is no longer available
          if (this.onRemoteStream && peerId) {
            this.onRemoteStream(peerId, null, 'closed');
          }
        }
        
        // Clean up producer mapping
        this.producerToPeer.delete(producerId);
        console.log('✅ Cleaned up closed producer:', producerId);
      });

      // Join class
      const response = await new Promise((resolve, reject) => {
        this.socket.emit('joinClass', {
          classId, userId, userRole, name: userName
        }, resolve);
        setTimeout(() => reject(new Error('Join timeout')), 5000);
      });

      if (!response.success) {
        throw new Error(response.error);
      }

      // Load device
      await this.device.load({ routerRtpCapabilities: response.rtpCapabilities });
      console.log('DEVICE LOADED');

      // Create transports
      await this.createTransports();
      console.log('TRANSPORTS CREATED');

      // Get media and produce
      await this.startLocalMedia();
      console.log('MEDIA STARTED');

      // Consume any existing producers already in the room (other participants who joined earlier)
      if (response.existingProducers && response.existingProducers.length) {
        console.log(`FOUND ${response.existingProducers.length} EXISTING PRODUCERS. CONSUMING WITH EXTENDED DELAY...`);
        
        // Add longer delay to ensure transports are fully ready
        setTimeout(async () => {
          try {
            console.log('🔄 Starting consumption of existing producers after delay...');
            await this.consumeExistingProducers(response.existingProducers);
            console.log('✅ Successfully consumed all existing producers');
          } catch (error) {
            console.error('❌ Failed to consume existing producers with delay:', error);
            // Retry once more after additional delay
            setTimeout(async () => {
              try {
                console.log('🔄 Final retry: consuming existing producers...');
                await this.consumeExistingProducers(response.existingProducers);
                console.log('✅ Final retry successful: consumed existing producers');
              } catch (retryError) {
                console.error('❌ All retries failed for existing producers:', retryError);
              }
            }, 5000);
          }
        }, 5000);
      } else {
        console.log('NO EXISTING PRODUCERS IN ROOM AT JOIN TIME');
      }

      this.isConnected = true;
      
      // CRITICAL: Verify callback setup for receiving remote streams
      console.log('🔍 CALLBACK VERIFICATION:', {
        onRemoteStream: !!this.onRemoteStream,
        onLocalStream: !!this.onLocalStream,
        userRole: this.userRole,
        userId: this.userId
      });
      
      if (!this.onRemoteStream) {
        console.error('❌ CRITICAL ERROR: onRemoteStream callback not set! Remote streams will not be visible in UI!');
        console.error('⚠️ Make sure to set webrtcManager.onRemoteStream = (peerId, stream, kind) => { /* display stream */ }');
      } else {
        console.log('✅ onRemoteStream callback is properly set - remote streams should be visible');
      }
      
      return { success: true };
    } catch (error) {
      console.error('CONNECTION FAILED:', error);
      throw error;
    }
  }

  /**
   * Setup Socket.IO event handlers
   */
  async setupSocketHandlers() {
    return new Promise((resolve, reject) => {
      this.socket.on('connect', () => {
        console.log('🔌 Socket connected');
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error);
        reject(error);
      });

      this.socket.on('newProducer', async ({ producerId, peerId, kind }) => {
        console.log(`� New ${kind} producer available:`, { producerId, peerId });
        
        // Store producer info
        this.producerToPeer.set(producerId, peerId);
        
        console.log('NEW PRODUCER RECEIVED:', { producerId, peerId, kind });
        
        // Don't consume our own producers
        if (String(peerId) === String(this.userId)) {
          console.log('Skipping own producer');
          return;
        }
        
        // Auto-consume immediately
        if (this.recvTransport && this.device.loaded) {
          try {
            console.log(`Consuming ${kind} from peer ${peerId}...`);
            await this.consumeProducer(producerId);
            console.log(`Successfully consumed ${kind}`);
          } catch (error) {
            console.error('Consume error:', error);
          }
        } else {
          console.warn('Cannot consume - transport/device not ready');
        }
      });

      this.socket.on('producerClosed', ({ producerId, peerId }) => {
        console.log(`🔌 Producer closed: ${producerId} from ${peerId}`);
        
        const consumer = this.consumers.get(producerId);
        if (consumer) {
          consumer.close();
          this.consumers.delete(producerId);
        }
        
        // Clean up mapping
        this.producerToPeer.delete(producerId);
        
        if (this.onRemoteStream) {
          this.onRemoteStream(peerId, null, 'closed');
        }
      });

      this.socket.on('userJoined', (userData) => {
        console.log('👤 User joined:', userData);
        if (this.onUserJoined) {
          this.onUserJoined(userData);
        }
      });

      this.socket.on('userLeft', (userData) => {
        console.log('👋 User left:', userData);
        if (this.onUserLeft) {
          this.onUserLeft(userData);
        }
      });

      this.socket.on('error', (error) => {
        console.error('🚫 Socket error:', error);
        this.handleError('Socket error', error);
      });

      // Set connection timeout
      setTimeout(() => {
        if (!this.socket.connected) {
          reject(new Error('Socket connection timeout'));
        }
      }, 10000);
    });
  }

  /**
   * Join the class room
   */
  async joinClass() {
    try {
      // Only join once
      if (this._joinedClass) {
        console.log('⚠️ Already joined class, skipping duplicate join');
        return { alreadyJoined: true };
      }

      console.log('📤 Joining class:', {
        classId: this.classId,
        userId: this.userId,
        userRole: this.userRole,
        userName: this.userName
      });

      // Send joinClass request and wait for response
      const response = await new Promise((resolve, reject) => {
        this.socket.emit('joinClass', {
          classId: this.classId,
          userId: this.userId,
          userRole: this.userRole,
          name: this.userName || 'User'
        }, (response) => {
          if (response.success) {
            resolve(response);
          } else {
            reject(new Error(response.error || 'Join class failed'));
          }
        });

        setTimeout(() => reject(new Error('Join class timeout')), 10000);
      });

      console.log('✅ Successfully joined class:', response);
      this._joinedClass = true;

      // Load device with router capabilities
      if (!this.device.loaded) {
        await this.device.load({ routerRtpCapabilities: response.rtpCapabilities });
        console.log('📱 Device loaded with capabilities');
      }

      // Create transports FIRST
      await this.createTransports();
      console.log('✅ Transports ready');

      // THEN start local media (this will auto-produce when transport connects)
      console.log(`🎥 Starting media for ${this.userRole}...`);
      await this.startLocalMedia();
      console.log('✅ Media started successfully');

      // TEST: Send a test message to see if socket is working
      console.log('🧪 TESTING socket connection...');
      this.socket.emit('test-message', { userId: this.userId, classId: this.classId });

      // Consume existing producers (for all users to receive existing streams)
      if (response.existingProducers && response.existingProducers.length > 0) {
        console.log(`🔍 Consuming ${response.existingProducers.length} existing producers`);
        await this.consumeExistingProducers(response.existingProducers);
      } else {
        console.log('ℹ️ No existing producers to consume');
      }

      return response;
    } catch (error) {
      console.error('❌ Failed to join class:', error);
      throw error;
    }
  }

  /**
   * Create WebRTC transports
   */
  async createTransports() {
    try {
      console.log('🚚 Creating WebRTC transports...');
      
      if (!this.device.loaded) {
        throw new Error('Device not loaded');
      }

      // Create send transport
      await this.createSendTransport();
      
      // Create receive transport
      await this.createRecvTransport();
      
      console.log('✅ Both transports created successfully');
    } catch (error) {
      console.error('❌ Failed to create transports:', error);
      throw error;
    }
  }

  /**
   * Create send transport
   */
  async createSendTransport() {
    try {
      console.log('📤 Creating send transport...');
      
      // Request transport from server
      const transportData = await new Promise((resolve, reject) => {
        this.socket.emit('createTransport', {
          classId: this.classId,
          direction: 'send'
        }, (response) => {
          if (response.success) {
            resolve(response.transport);
          } else {
            reject(new Error(response.error || 'Failed to create send transport'));
          }
        });
      });

      console.log('📤 Send transport data received:', transportData.id);

      // Create device transport
      this.sendTransport = this.device.createSendTransport({
        id: transportData.id,
        iceParameters: transportData.iceParameters,
        iceCandidates: transportData.iceCandidates,
        dtlsParameters: transportData.dtlsParameters
      });

      this.sendTransport.on('connectionstatechange', (state) => {
        console.log('📡 [SendTransport] connectionstatechange ->', state);
      });

      // Simple transport connection
      this.sendTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
        try {
          console.log('📤 Connecting send transport...');
          
          this.socket.emit('connectTransport', {
            transportId: transportData.id,
            dtlsParameters
          }, (response) => {
            if (response.success) {
              console.log('✅ Send transport connected');
              callback();
            } else {
              console.error('❌ Transport connect failed:', response.error);
              errback(new Error(response.error));
            }
          });
        } catch (error) {
          console.error('❌ Send transport connection error:', error);
          errback(error);
        }
      });

      // Handle producer creation
      this.sendTransport.on('produce', async ({ kind, rtpParameters }, callback, errback) => {
        try {
          console.log(`📤 Producing ${kind} track...`);
          
          const producerId = await new Promise((resolve, reject) => {
            this.socket.emit('produce', {
              transportId: transportData.id,
              kind,
              rtpParameters,
              classId: this.classId
            }, (response) => {
              if (response.success) {
                resolve(response.producerId);
              } else {
                reject(new Error(response.error || 'Failed to produce'));
              }
            });
          });
          
          console.log(`✅ Producer created: ${producerId}`);
          callback({ id: producerId });
          console.log(`📤 Produce callback executed for ${kind} producer ${producerId}`);
          
          // Log that this producer should be broadcasted to other peers
          console.log(`📢 PRODUCER BROADCAST: ${kind} producer ${producerId} from user ${this.userId} should be visible to other participants`);
        } catch (error) {
          console.error('❌ Producer creation failed:', error);
          errback(error);
        }
      });

      console.log('✅ Send transport created successfully');
      this.sendTransport.on('connectionstatechange', (state) => {
        console.log('📡 [SendTransport] state change:', state);
      });
    } catch (error) {
      console.error('❌ Failed to create send transport:', error);
      throw error;
    }
  }

  /**
   * Create receive transport
   */
  async createRecvTransport() {
    try {
      console.log('📥 Creating receive transport...');
      
      // Request transport from server
      const transportData = await new Promise((resolve, reject) => {
        this.socket.emit('createTransport', {
          classId: this.classId,
          direction: 'recv'
        }, (response) => {
          if (response.success) {
            resolve(response.transport);
          } else {
            reject(new Error(response.error || 'Failed to create receive transport'));
          }
        });
      });

      console.log('📥 Receive transport data received:', transportData.id);

      // Create device transport
      this.recvTransport = this.device.createRecvTransport({
        id: transportData.id,
        iceParameters: transportData.iceParameters,
        iceCandidates: transportData.iceCandidates,
        dtlsParameters: transportData.dtlsParameters
      });

      this.recvTransport.on('connectionstatechange', (state) => {
        console.log('📡 [RecvTransport] connectionstatechange ->', state);
      });

      // Simplified receive transport connection - no timeout issues
      this.recvTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
        try {
          console.log('📥 Connecting receive transport...', {
            transportId: transportData.id,
            socketConnected: this.socket?.connected
          });
          
          this.socket.emit('connectTransport', {
            transportId: transportData.id,
            dtlsParameters
          }, (response) => {
            if (response && response.success) {
              console.log('✅ Receive transport connected successfully');
              callback();
            } else {
              const errorMsg = response?.error || 'Unknown transport connection error';
              console.error('❌ Receive transport connect failed:', errorMsg);
              errback(new Error(errorMsg));
            }
          });
        } catch (error) {
          console.error('❌ Receive transport connection error:', error);
          errback(error);
        }
      });

      console.log('✅ Receive transport created successfully');
    } catch (error) {
      console.error('❌ Failed to create receive transport:', error);
      throw error;
    }
  }

  /**
   * Create transport via signaling
   */
  async createTransport(direction) {
    return new Promise((resolve, reject) => {
      this.socket.emit('createTransport', {
        classId: this.classId,
        direction,
      }, (response) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.error));
        }
      });

      setTimeout(() => reject(new Error('Create transport timeout')), 5000);
    });
  }

  /**
   * Setup send transport event handlers
   */
  setupSendTransport() {
    this.sendTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
      try {
        await this.connectTransport(this.sendTransport.id, dtlsParameters);
        callback();
      } catch (error) {
        errback(error);
      }
    });

    this.sendTransport.on('produce', async (parameters, callback, errback) => {
      try {
        const result = await this.produce(
          this.sendTransport.id,
          parameters.kind,
          parameters.rtpParameters
        );
        callback({ id: result.producerId });
      } catch (error) {
        errback(error);
      }
    });

    this.sendTransport.on('connectionstatechange', (state) => {
      console.log(`📡 Send transport state: ${state}`);
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(this.userId, state);
      }
    });
  }

  /**
   * Setup receive transport event handlers
   */
  setupRecvTransport() {
    this.recvTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
      try {
        await this.connectTransport(this.recvTransport.id, dtlsParameters);
        callback();
      } catch (error) {
        errback(error);
      }
    });

    this.recvTransport.on('connectionstatechange', (state) => {
      console.log(`📡 Receive transport state: ${state}`);
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange('recv', state);
      }
    });
  }

  /**
   * Connect transport
   */
  async connectTransport(transportId, dtlsParameters) {
    return new Promise((resolve, reject) => {
      this.socket.emit('connectTransport', {
        transportId,
        dtlsParameters,
      }, (response) => {
        if (response.success) {
          resolve();
        } else {
          reject(new Error(response.error));
        }
      });

      setTimeout(() => reject(new Error('Connect transport timeout')), 5000);
    });
  }

  /**
   * Produce media (teacher sending)
   */
  async produce(transportId, kind, rtpParameters) {
    return new Promise((resolve, reject) => {
      this.socket.emit('produce', {
        transportId,
        kind,
        rtpParameters,
        classId: this.classId,
      }, (response) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.error));
        }
      });

      setTimeout(() => reject(new Error('Produce timeout')), 5000);
    });
  }

  /**
   * Consume producer (alias for consume method)
   */
  async consumeProducer(producerId) {
    return this.consume(producerId);
  }

  /**
   * Consume media (students receiving)
   */
  async consume(producerId) {
    try {
      console.log(`🍽️ Starting to consume producer ${producerId}`);
      
      if (!this.recvTransport) {
        throw new Error('Receive transport not initialized');
      }
      
      if (!this.device.rtpCapabilities) {
        throw new Error('Device RTP capabilities not available');
      }

      console.log(`🔍 Transport state check: ${this.recvTransport.connectionState}`);

      // Create consumer on server first
      console.log(`📡 Creating consumer for producer ${producerId}`);
      const result = await this.createConsumer(producerId);
      console.log(`📡 Consumer created on server:`, {
        id: result.consumer.id,
        producerId: result.consumer.producerId,
        kind: result.consumer.kind,
        hasRtpParameters: !!result.consumer.rtpParameters
      });
      
      // Now consume on client device - this will trigger transport connection if needed
      console.log(`📡 Consuming on client device (transport will connect automatically)...`);
      const consumer = await this.recvTransport.consume({
        id: result.consumer.id,
        producerId: result.consumer.producerId,
        kind: result.consumer.kind,
        rtpParameters: result.consumer.rtpParameters,
      });

      this.consumers.set(producerId, consumer);
      console.log(`✅ Consumer created on client: ${consumer.id}`);

      // Resume consumer to start receiving
      console.log(`▶️ Resuming consumer ${consumer.id}`);
      await this.resumeConsumer(consumer.id);
      console.log(`✅ Consumer resumed`);

      // Create media stream from consumer
      const stream = new MediaStream();
      stream.addTrack(consumer.track);
      console.log(`🎬 Created media stream with ${consumer.kind} track`);

      // Get the peer ID for this producer
      const peerId = this.producerToPeer.get(producerId);
      console.log(`🗺️ Producer ${producerId} belongs to peer ${peerId}`);
      
      // Notify about new remote stream with comprehensive logging
      console.log(`🎥 REMOTE STREAM READY:`, {
        peerId,
        kind: result.consumer.kind,
        streamId: stream.id,
        trackCount: stream.getTracks().length,
        hasCallback: !!this.onRemoteStream,
        consumerActive: !consumer.paused && !consumer.closed
      });
      
      if (this.onRemoteStream && peerId) {
        console.log(`📞 Calling onRemoteStream callback for peer ${peerId}`);
        console.log(`🎬 FINAL STEP: About to display ${result.consumer.kind} stream from ${peerId} to UI`);
        try {
          this.onRemoteStream(peerId, stream, result.consumer.kind);
          console.log(`✅ ✅ ✅ SUCCESS: onRemoteStream callback executed - ${result.consumer.kind} from ${peerId} should now be visible in UI!`);
          
          // Verify stream is active
          console.log(`🔍 Stream verification:`, {
            streamActive: stream.active,
            trackCount: stream.getTracks().length,
            videoTracks: stream.getVideoTracks().length,
            audioTracks: stream.getAudioTracks().length,
            firstTrack: stream.getTracks()[0] ? {
              kind: stream.getTracks()[0].kind,
              enabled: stream.getTracks()[0].enabled,
              readyState: stream.getTracks()[0].readyState
            } : null
          });
        } catch (cbErr) {
          console.error('❌ onRemoteStream callback error:', cbErr);
        }
      } else {
        console.error(`❌ ❌ ❌ CRITICAL: CANNOT NOTIFY UI - ${result.consumer.kind} stream from ${peerId} will NOT be visible!`, {
          reason: !this.onRemoteStream ? 'No callback set' : 'No peerId',
          peerId,
          hasCallback: !!this.onRemoteStream,
          consumerKind: result.consumer.kind,
          producerId
        });
      }

      console.log(`✅ Successfully started consuming ${result.consumer.kind} from producer ${producerId}`);
      
      // Monitor consumer stats for quality adaptation
      if (this.adaptiveQuality) {
        this.monitorConsumerStats(consumer);
      }

      return consumer;
    } catch (error) {
      console.error(`❌ Error consuming producer ${producerId}:`, error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        hasRecvTransport: !!this.recvTransport,
        recvTransportState: this.recvTransport?.connectionState,
        hasRtpCapabilities: !!this.device?.rtpCapabilities
      });
      this.handleError('Failed to receive media', error);
      throw error;
    }
  }

  /**
   * Create consumer via signaling
   */
  async createConsumer(producerId) {
    return new Promise((resolve, reject) => {
      // Validate prerequisites before sending request
      if (!this.device || !this.device.rtpCapabilities) {
        reject(new Error('Device RTP capabilities not available'));
        return;
      }
      
      if (!this.recvTransport || !this.recvTransport.id) {
        reject(new Error('Receive transport not available'));
        return;
      }
      
      console.log('📡 Sending consume request:', {
        transportId: this.recvTransport.id,
        producerId,
        hasRtpCapabilities: !!this.device.rtpCapabilities,
        classId: this.classId
      });
      
      this.socket.emit('consume', {
        transportId: this.recvTransport.id,
        producerId,
        rtpCapabilities: this.device.rtpCapabilities,
        classId: this.classId,
      }, (response) => {
        console.log('📡 Consume response received:', {
          success: response?.success,
          hasConsumer: !!response?.consumer,
          consumerCanConsume: response?.consumer?.canConsume,
          error: response?.error
        });
        
        if (response && response.success && response.consumer) {
          // Validate the consumer object has required properties
          const consumer = response.consumer;
          if (!consumer.id || !consumer.producerId || !consumer.kind || !consumer.rtpParameters) {
            reject(new Error(`Invalid consumer response: missing required properties. Got: ${JSON.stringify(Object.keys(consumer))}`));
            return;
          }
          resolve(response);
        } else {
          const errorMsg = response?.error || 'Unknown consume error - invalid response structure';
          
          // Special handling for "Producer not found" - this is expected during producer cleanup
          if (errorMsg.includes('not found')) {
            console.log('ℹ️ Producer not found - likely closed during cleanup:', producerId);
          }
          
          reject(new Error(errorMsg));
        }
      });

      setTimeout(() => reject(new Error('Create consumer timeout')), 5000);
    });
  }

  /**
   * Resume consumer
   */
  async resumeConsumer(consumerId) {
    return new Promise((resolve, reject) => {
      this.socket.emit('resumeConsumer', {
        consumerId,
      }, (response) => {
        if (response.success) {
          resolve();
        } else {
          reject(new Error(response.error));
        }
      });

      setTimeout(() => reject(new Error('Resume consumer timeout')), 5000);
    });
  }

  /**
   * Pause consumer (for bandwidth optimization)
   */
  async pauseConsumer(consumerId) {
    return new Promise((resolve, reject) => {
      this.socket.emit('pauseConsumer', {
        consumerId,
      }, (response) => {
        if (response.success) {
          resolve();
        } else {
          reject(new Error(response.error));
        }
      });

      setTimeout(() => reject(new Error('Pause consumer timeout')), 5000);
    });
  }

  /**
   * Consume existing producers when joining
   */
  async consumeExistingProducers(existingProducers) {
    console.log(`📺 Consuming ${existingProducers.length} existing producers`);
    
    const consumptionPromises = existingProducers.map(async (producer, index) => {
      try {
        console.log(`📋 [${index + 1}/${existingProducers.length}] Processing producer ${producer.producerId} from peer ${producer.peerId}`);
        
        // Store producer-to-peer mapping
        if (producer.peerId) {
          this.producerToPeer.set(producer.producerId, producer.peerId);
          console.log(`🗺️ Mapped producer ${producer.producerId} to peer ${producer.peerId}`);
        }
        
        // Add small delay between consumptions to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, index * 500));
        
        await this.consume(producer.producerId);
        console.log(`✅ [${index + 1}/${existingProducers.length}] Successfully consumed producer ${producer.producerId} from peer ${producer.peerId}`);
        return { success: true, producerId: producer.producerId, peerId: producer.peerId };
      } catch (error) {
        // Handle "Producer not found" as a warning, not an error
        if (error.message && error.message.includes('not found')) {
          console.warn(`⚠️ [${index + 1}/${existingProducers.length}] Producer ${producer.producerId} no longer available (may have been closed)`);
          // Clean up mapping for non-existent producer
          this.producerToPeer.delete(producer.producerId);
          return { success: false, producerId: producer.producerId, peerId: producer.peerId, error: 'Producer not found (expected)' };
        } else {
          console.error(`❌ [${index + 1}/${existingProducers.length}] Failed to consume producer ${producer.producerId} from peer ${producer.peerId}:`, error);
          return { success: false, producerId: producer.producerId, peerId: producer.peerId, error: error.message };
        }
      }
    });
    
    const results = await Promise.allSettled(consumptionPromises);
    
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - successful;
    
    console.log(`📊 Consumption summary: ${successful} successful, ${failed} failed out of ${existingProducers.length} total`);
    
    if (failed > 0) {
      console.warn(`⚠️ Some producers failed to consume, but continuing with successful ones`);
    }
  }

  /**
   * Manually request and consume all existing producers
   */
  async requestExistingProducers() {
    return new Promise((resolve, reject) => {
      this.socket.emit('requestExistingProducers', {
        classId: this.classId,
      }, async (response) => {
        try {
          console.log('📋 Received existing producers:', response);
          if (response.success && response.existingProducers) {
            await this.consumeExistingProducers(response.existingProducers);
            resolve(response.existingProducers);
          } else {
            console.log('ℹ️ No existing producers found');
            resolve([]);
          }
        } catch (error) {
          console.error('❌ Error processing existing producers:', error);
          reject(error);
        }
      });

      setTimeout(() => reject(new Error('Request existing producers timeout')), 5000);
    });
  }

  /**
   * Start local media (camera/microphone)
   */
  async startLocalMedia(constraints = { video: true, audio: true }) {
    try {
      console.log('🎥 Starting local media for role:', this.userRole);
      
      // Get user media
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      console.log('✅ Local media obtained:', {
        video: this.localStream.getVideoTracks().length,
        audio: this.localStream.getAudioTracks().length
      });

      // Notify UI so it can attach local preview immediately
      if (this.onLocalStream) {
        try {
          console.log('📞 Calling onLocalStream callback');
          this.onLocalStream(this.localStream);
          console.log('✅ onLocalStream callback executed successfully');
        } catch (cbErr) {
          console.error('❌ onLocalStream callback error:', cbErr);
        }
      } else {
        console.warn('⚠️ onLocalStream callback not set - local stream will not be displayed in UI');
      }

      // Ensure send transport is connected before producing
      if (this.sendTransport) {
        try {
          if (this.sendTransport.connectionState !== 'connected') {
            console.log('⏳ Waiting for send transport to connect before producing...');
            await this.waitForSendTransport();
            console.log('✅ Send transport connected, proceeding to produce tracks');
          }
        } catch (waitErr) {
          console.warn('⚠️ Proceeding to produce even though wait failed:', waitErr.message);
        }

        console.log('📡 Producing media tracks after transport ready...');
        console.log('📡 Local stream tracks:', {
          video: this.localStream.getVideoTracks().length,
          audio: this.localStream.getAudioTracks().length,
          total: this.localStream.getTracks().length
        });
        
        for (const track of this.localStream.getTracks()) {
          try {
            console.log(`📡 Producing ${track.kind} track:`, {
              id: track.id,
              label: track.label,
              enabled: track.enabled,
              readyState: track.readyState
            });
            
            const producer = await this.sendTransport.produce({ track });
            this.producers.set(track.kind, producer);
            
            console.log(`✅ ${track.kind} PRODUCER CREATED:`, {
              id: producer.id,
              kind: producer.kind,
              paused: producer.paused,
              closed: producer.closed
            });
            
            // Verify producer is active
            console.log(`📊 Producer stats for ${track.kind}:`, {
              track: {
                enabled: track.enabled,
                readyState: track.readyState,
                muted: track.muted
              },
              producer: {
                paused: producer.paused,
                closed: producer.closed
              }
            });
            
          } catch (error) {
            console.error(`❌ Failed to produce ${track.kind}:`, {
              error: error.message,
              stack: error.stack,
              trackState: {
                enabled: track.enabled,
                readyState: track.readyState
              }
            });
          }
        }
      } else {
        console.warn('⚠️ No sendTransport available yet; will attempt production later');
      }

      return this.localStream;
    } catch (error) {
      console.error('❌ Error starting local media:', error);
      throw error;
    }
  }

  // Wait for send transport to reach connected state
  async waitForSendTransport(timeoutMs = 7000) {
    if (!this.sendTransport) throw new Error('Send transport not created');
    if (this.sendTransport.connectionState === 'connected') return;
    return new Promise((resolve, reject) => {
      const to = setTimeout(() => {
        reject(new Error('Send transport connection timeout'));
      }, timeoutMs);
      const handler = (state) => {
        if (state === 'connected') {
          clearTimeout(to);
          this.sendTransport.off('connectionstatechange', handler);
          resolve();
        } else if (state === 'failed' || state === 'closed') {
          clearTimeout(to);
          this.sendTransport.off('connectionstatechange', handler);
          reject(new Error(`Send transport state ${state}`));
        }
      };
      this.sendTransport.on('connectionstatechange', handler);
    });
  }

  /**
   * Stop local media
   */
  stopLocalMedia() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
      });
      this.localStream = null;
    }

    // Close producers
    for (const [kind, producer] of this.producers) {
      producer.close();
    }
    this.producers.clear();

    console.log('🛑 Local media stopped');
  }

  /**
   * Toggle video track
   */
  async toggleVideo() {
    try {
      if (this.localStream) {
        const videoTrack = this.localStream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.enabled = !videoTrack.enabled;
          console.log(`📹 Video ${videoTrack.enabled ? 'enabled' : 'disabled'}`);
          return videoTrack.enabled;
        }
      }

      // If no video track, start camera
      if (this.userRole === 'teacher') {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const videoTrack = stream.getVideoTracks()[0];
        
        if (this.localStream) {
          this.localStream.addTrack(videoTrack);
        } else {
          this.localStream = stream;
        }

        if (this.sendTransport) {
          const producer = await this.sendTransport.produce({ track: videoTrack });
          this.producers.set('video', producer);
        }

        console.log('📹 Video started');
        return true;
      }
    } catch (error) {
      console.error('❌ Error toggling video:', error);
      this.handleError('Failed to toggle video', error);
      return false;
    }
  }

  /**
   * Toggle audio track
   */
  async toggleAudio() {
    try {
      if (this.localStream) {
        const audioTrack = this.localStream.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = !audioTrack.enabled;
          console.log(`🎤 Audio ${audioTrack.enabled ? 'enabled' : 'disabled'}`);
          return audioTrack.enabled;
        }
      }

      // If no audio track, start microphone
      if (this.userRole === 'teacher') {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioTrack = stream.getAudioTracks()[0];
        
        if (this.localStream) {
          this.localStream.addTrack(audioTrack);
        } else {
          this.localStream = stream;
        }

        if (this.sendTransport) {
          const producer = await this.sendTransport.produce({ track: audioTrack });
          this.producers.set('audio', producer);
        }

        console.log('🎤 Audio started');
        return true;
      }
    } catch (error) {
      console.error('❌ Error toggling audio:', error);
      this.handleError('Failed to toggle audio', error);
      return false;
    }
  }

  /**
   * Start screen sharing (teacher only)
   */
  async startScreenShare() {
    try {
      // Multi-role permission check for screen sharing
      const allowedRoles = ['teacher', 'admin', 'hod', 'dean'];
      if (!allowedRoles.includes(this.userRole)) {
        throw new Error(`Screen sharing not allowed for role: ${this.userRole}. Allowed roles: ${allowedRoles.join(', ')}`);
      }

      console.log('🖥️ Starting screen share...');
      
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 },
          frameRate: { ideal: 30, max: 30 },
        },
        audio: true,
      });

      const videoTrack = this.screenStream.getVideoTracks()[0];
      
      // Replace video producer with screen share
      const videoProducer = this.producers.get('video');
      if (videoProducer) {
        await videoProducer.replaceTrack({ track: videoTrack });
      } else if (this.sendTransport) {
        const producer = await this.sendTransport.produce({ track: videoTrack });
        this.producers.set('screen', producer);
      }

      // Handle screen share end
      videoTrack.onended = () => {
        this.stopScreenShare();
      };

      console.log('✅ Screen share started');
      return this.screenStream;
    } catch (error) {
      console.error('❌ Error starting screen share:', error);
      this.handleError('Failed to start screen share', error);
      throw error;
    }
  }

  /**
   * Stop screen sharing
   */
  async stopScreenShare() {
    try {
      if (this.screenStream) {
        this.screenStream.getTracks().forEach(track => track.stop());
        this.screenStream = null;
      }

      // Replace with camera if available
      if (this.localStream) {
        const videoTrack = this.localStream.getVideoTracks()[0];
        const videoProducer = this.producers.get('video');
        
        if (videoProducer && videoTrack) {
          await videoProducer.replaceTrack({ track: videoTrack });
        }
      }

      console.log('🛑 Screen share stopped');
    } catch (error) {
      console.error('❌ Error stopping screen share:', error);
    }
  }

  /**
   * Monitor producer statistics for quality adaptation
   */
  async monitorProducerStats(producer) {
    if (!this.adaptiveQuality) return;

    const statsInterval = setInterval(async () => {
      try {
        // Check if producer is closed before accessing stats
        if (producer.closed) {
          console.log('🛑 Producer closed, stopping stats monitoring');
          clearInterval(statsInterval);
          return;
        }
        
        const stats = await producer.getStats();
        
        for (const stat of stats.values()) {
          if (stat.type === 'outbound-rtp') {
            const currentBitrate = stat.bytesSent * 8 / stat.timestamp;
            
            // Adaptive quality based on available bandwidth - but check if producer is still active
            if (producer.closed) {
              console.log('🛑 Producer closed during stats processing, stopping monitoring');
              clearInterval(statsInterval);
              return;
            }
            
            if (currentBitrate < this.targetBitrate * 0.7) {
              await this.reduceQuality(producer);
            } else if (currentBitrate > this.targetBitrate * 1.2) {
              await this.increaseQuality(producer);
            }
          }
        }
      } catch (error) {
        // If producer is closed, InvalidStateError is expected - stop monitoring
        if (error.name === 'InvalidStateError' && error.message.includes('closed')) {
          console.log('🛑 Producer closed (InvalidStateError), stopping stats monitoring');
          clearInterval(statsInterval);
          return;
        }
        console.error('❌ Error monitoring producer stats:', error);
        // Stop monitoring on any error to prevent spam
        clearInterval(statsInterval);
      }
    }, 5000);

    producer.on('close', () => {
      clearInterval(statsInterval);
    });
  }

  /**
   * Monitor consumer statistics
   */
  async monitorConsumerStats(consumer) {
    const statsInterval = setInterval(async () => {
      try {
        const stats = await consumer.getStats();
        
        for (const stat of stats.values()) {
          if (stat.type === 'inbound-rtp') {
            this.stats.bytesReceived = stat.bytesReceived;
            this.stats.packetsLost = stat.packetsLost;
            this.stats.jitter = stat.jitter;
            
            // Auto-pause consumer if connection is poor
            if (stat.packetsLost > 100 || stat.jitter > 0.1) {
              console.warn('⚠️ Poor connection detected, pausing consumer');
              await this.pauseConsumer(consumer.id);
              
              // Resume after delay
              setTimeout(() => {
                this.resumeConsumer(consumer.id);
              }, 5000);
            }
          }
        }
      } catch (error) {
        console.error('❌ Error monitoring consumer stats:', error);
      }
    }, 5000);

    consumer.on('close', () => {
      clearInterval(statsInterval);
    });
  }

  /**
   * Reduce quality for bandwidth optimization
   */
  async reduceQuality(producer) {
    try {
      // Check if producer is closed before attempting quality adjustment
      if (producer.closed) {
        console.log('⚠️ Cannot reduce quality - producer is closed');
        return;
      }
      
      if (this.currentQuality === 'high') {
        await producer.setMaxSpatialLayer(1);
        this.currentQuality = 'medium';
        console.log('📉 Reduced quality to medium');
      } else if (this.currentQuality === 'medium') {
        await producer.setMaxSpatialLayer(0);
        this.currentQuality = 'low';
        console.log('📉 Reduced quality to low');
      }
    } catch (error) {
      console.error('❌ Error reducing quality:', error);
    }
  }

  /**
   * Increase quality when bandwidth allows
   */
  async increaseQuality(producer) {
    try {
      // Check if producer is closed before attempting quality adjustment
      if (producer.closed) {
        console.log('⚠️ Cannot increase quality - producer is closed');
        return;
      }
      
      if (this.currentQuality === 'low') {
        await producer.setMaxSpatialLayer(1);
        this.currentQuality = 'medium';
        console.log('📈 Increased quality to medium');
      } else if (this.currentQuality === 'medium') {
        await producer.setMaxSpatialLayer(2);
        this.currentQuality = 'high';
        console.log('📈 Increased quality to high');
      }
    } catch (error) {
      console.error('❌ Error increasing quality:', error);
    }
  }

  /**
   * Handle errors with user notification
   */
  handleError(message, error) {
    console.error(`❌ ${message}:`, error);
    
    if (this.onError) {
      this.onError(message, error);
    }
  }

  /**
   * Disconnect from class
   */
  async disconnect() {
    try {
      console.log('🔌 Disconnecting from class...');
      
      // Stop local media
      this.stopLocalMedia();
      
      // Close consumers
      for (const consumer of this.consumers.values()) {
        consumer.close();
      }
      this.consumers.clear();

      // Close transports
      if (this.sendTransport) {
        this.sendTransport.close();
        this.sendTransport = null;
      }
      
      if (this.recvTransport) {
        this.recvTransport.close();
        this.recvTransport = null;
      }

      // Leave class via socket
      if (this.socket) {
        this.socket.emit('leaveClass', { classId: this.classId });
        this.socket.disconnect();
        this.socket = null;
      }

      this.isConnected = false;
      console.log('✅ Disconnected successfully');
    } catch (error) {
      console.error('❌ Error during disconnect:', error);
    }
  }

  /**
   * Broadcast drawing data to other participants
   */
  broadcastDrawing(drawingData) {
    if (this.socket && this.isConnected) {
      this.socket.emit('drawingData', {
        classId: this.classId,
        userId: this.userId,
        ...drawingData
      });
      console.log('🎨 Broadcasted drawing data:', drawingData);
    }
  }

  /**
   * Broadcast whiteboard clear to other participants
   */
  broadcastClearWhiteboard() {
    if (this.socket && this.isConnected) {
      this.socket.emit('clearWhiteboard', {
        classId: this.classId,
        userId: this.userId
      });
      console.log('🗑️ Broadcasted whiteboard clear');
    }
  }

  /**
   * Setup drawing event handlers
   */
  setupDrawingHandlers(onDrawingReceived, onWhiteboardCleared) {
    if (!this.socket) return;

    this.socket.on('drawingData', (data) => {
      if (data.userId !== this.userId && onDrawingReceived) {
        onDrawingReceived(data);
      }
    });

    this.socket.on('clearWhiteboard', (data) => {
      if (data.userId !== this.userId && onWhiteboardCleared) {
        onWhiteboardCleared();
      }
    });
  }

  /**
   * Send chat message
   */
  sendMessage(message, messageType = 'chat') {
    if (this.socket && this.isConnected) {
      const messageData = {
        classId: this.classId,
        userId: this.userId,
        type: messageType,
        content: message,
        timestamp: Date.now()
      };
      
      this.socket.emit('chatMessage', messageData);
      console.log('💬 Sent message:', messageData);
      return messageData;
    }
  }

  /**
   * Setup chat handlers
   */
  setupChatHandlers(onMessageReceived) {
    if (!this.socket) return;

    this.socket.on('chatMessage', (data) => {
      if (onMessageReceived) {
        onMessageReceived(data);
      }
    });
  }

  /**
   * Raise/lower hand
   */
  toggleHand(isRaised) {
    if (this.socket && this.isConnected) {
      this.socket.emit('handToggle', {
        classId: this.classId,
        userId: this.userId,
        isRaised
      });
      console.log(`✋ Hand ${isRaised ? 'raised' : 'lowered'}`);
    }
  }

  /**
   * Setup hand raise handlers
   */
  setupHandHandlers(onHandToggled) {
    if (!this.socket) return;
    this.socket.on('handToggled', (data) => {
      if (onHandToggled) {
        onHandToggled(data);
      }
    });
  }

  /**
   * Get connection / media statistics
   */
  getStats() {
    return {
      ...this.stats,
      isConnected: this.isConnected,
      currentQuality: this.currentQuality,
      producers: this.producers.size,
      consumers: this.consumers.size,
      hasLocalStream: !!this.localStream,
      hasScreenStream: !!this.screenStream,
    };
  }

  // Toggle microphone on/off
  async toggleMicrophone() {
    try {
      console.log('🎤 [WebRTC] Toggle microphone called');
      console.log('🎤 [WebRTC] Current state:', {
        micEnabled: this.micEnabled,
        hasLocalStream: !!this.localStream,
        userRole: this.userRole,
        userId: this.userId
      });

      if (!this.localStream) {
        console.warn('⚠️ [WebRTC] No local stream available for microphone toggle');
        return false;
      }

      const audioTrack = this.localStream.getAudioTracks()[0];
      if (!audioTrack) {
        console.warn('⚠️ [WebRTC] No audio track available');
        console.log('🎤 [WebRTC] Available tracks:', {
          audioTracks: this.localStream.getAudioTracks().length,
          videoTracks: this.localStream.getVideoTracks().length
        });
        return false;
      }

      const newState = !this.micEnabled;
      this.micEnabled = newState;
      audioTrack.enabled = newState;
      
      console.log('🎤 [WebRTC] Audio track enabled set to:', audioTrack.enabled);

      // Simply pause/resume the existing producer (don't recreate)
      const audioProducer = this.producers.get('audio');
      console.log('🎤 [WebRTC] Audio producer exists:', !!audioProducer);
      
      if (audioProducer && !audioProducer.closed) {
        try {
          if (this.micEnabled) {
            await audioProducer.resume();
            console.log('🎤 [WebRTC] Audio producer resumed');
          } else {
            await audioProducer.pause();
            console.log('🎤 [WebRTC] Audio producer paused');
          }
        } catch (producerError) {
          console.error('🎤 [WebRTC] Producer operation failed:', producerError);
        }
      }

      console.log('🎤 [WebRTC] Microphone toggled successfully:', this.micEnabled ? 'ON' : 'OFF');
      
      // Emit state change to other participants
      if (this.socket) {
        this.socket.emit('media-state-changed', {
          userId: this.userId,
          audio: this.micEnabled,
          video: this.cameraEnabled
        });
      }

      return this.micEnabled;
    } catch (error) {
      console.error('❌ Error toggling microphone:', error);
      return false;
    }
  }

  // Toggle camera on/off
  async toggleCamera() {
    try {
      console.log('📹 [WebRTC] Toggle camera called');
      console.log('📹 [WebRTC] Current state:', {
        cameraEnabled: this.cameraEnabled,
        hasLocalStream: !!this.localStream,
        userRole: this.userRole,
        userId: this.userId
      });

      if (!this.localStream) {
        console.warn('⚠️ [WebRTC] No local stream available for camera toggle');
        return false;
      }

      const newState = !this.cameraEnabled;
      this.cameraEnabled = newState;
      
      console.log('📹 [WebRTC] Changing camera to:', newState ? 'ON' : 'OFF');

      if (newState) {
        // Turning camera ON - need to get new video track and create producer
        try {
          console.log('📹 Getting new video track...');
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: {
              width: { ideal: 1280, max: 1920 },
              height: { ideal: 720, max: 1080 },
              facingMode: 'user',
              frameRate: { ideal: 30 }
            } 
          });
          
          const newVideoTrack = stream.getVideoTracks()[0];
          
          // Remove old video track
          const oldVideoTracks = this.localStream.getVideoTracks();
          oldVideoTracks.forEach(track => {
            this.localStream.removeTrack(track);
            track.stop();
          });
          
          // Add new video track
          this.localStream.addTrack(newVideoTrack);
          console.log('📹 New video track added to local stream');
          
          // Close existing video producer if any
          const oldProducer = this.producers.get('video');
          if (oldProducer && !oldProducer.closed) {
            console.log('�️ Closing old video producer:', oldProducer.id);
            oldProducer.close();
            this.producers.delete('video');
            
            // Notify backend to close the producer
            if (this.socket) {
              this.socket.emit('closeProducer', { producerId: oldProducer.id });
            }
          }
          
          // Create new producer with new track
          if (this.sendTransport) {
            console.log('📹 Creating new video producer...');
            await this.produceTrack('video', newVideoTrack);
            console.log('✅ New video producer created');
          }
        } catch (error) {
          console.error('❌ Failed to turn camera on:', error);
          this.cameraEnabled = false;
          return false;
        }
      } else {
        // Turning camera OFF - stop and remove video track
        const videoTracks = this.localStream.getVideoTracks();
        videoTracks.forEach(track => {
          track.stop();
          this.localStream.removeTrack(track);
        });
        console.log('📹 Video track stopped and removed');
        
        // Close video producer
        const videoProducer = this.producers.get('video');
        if (videoProducer && !videoProducer.closed) {
          console.log('🗑️ Closing video producer:', videoProducer.id);
          videoProducer.close();
          this.producers.delete('video');
          
          // Notify backend to close the producer
          if (this.socket) {
            this.socket.emit('closeProducer', { producerId: videoProducer.id });
          }
        }
      }

      console.log('📹 [WebRTC] Camera toggled successfully:', this.cameraEnabled ? 'ON' : 'OFF');
      
      // Emit state change to other participants
      if (this.socket) {
        this.socket.emit('media-state-changed', {
          userId: this.userId,
          audio: this.micEnabled,
          video: this.cameraEnabled
        });
      }

      return this.cameraEnabled;
    } catch (error) {
      console.error('❌ Error toggling camera:', error);
      this.cameraEnabled = false;
      return false;
    }
  }

  // Alias functions for backward compatibility with existing code
  async toggleAudio() {
    return await this.toggleMicrophone();
  }

  async toggleVideo() {
    return await this.toggleCamera();
  }

  // Get local video stream for UI display
  getLocalVideoStream() {
    return this.localStream;
  }

  // New generic accessor
  getLocalStream() {
    return this.localStream;
  }

  // Get local audio enabled state
  getMicrophoneEnabled() {
    return this.micEnabled;
  }

  // Get camera enabled state
  getCameraEnabled() {
    return this.cameraEnabled;
  }

  // Get current media state
  getMediaState() {
    return {
      audio: this.micEnabled,
      video: this.cameraEnabled,
      hasAudioTrack: this.localStream ? this.localStream.getAudioTracks().length > 0 : false,
      hasVideoTrack: this.localStream ? this.localStream.getVideoTracks().length > 0 : false,
      isConnected: this.isConnected,
      userRole: this.userRole
    };
  }

  /**
   * Retry producer consumption with exponential backoff
   */
  async retryProducerConsumption(producerId, peerId, kind, retryCount = 0, maxRetries = 3) {
    const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 5000); // Max 5 second delay
    
    console.log(`🔄 Retry attempt ${retryCount + 1}/${maxRetries + 1} for producer ${producerId} (${kind}) from peer ${peerId}, delay: ${backoffDelay}ms`);
    
    const timeoutId = setTimeout(async () => {
      try {
        // Remove from pending consumptions
        this.pendingConsumptions.delete(producerId);
        
        // Check if producer mapping still exists (not cleaned up)
        if (!this.producerToPeer.has(producerId)) {
          console.log(`⚠️ Producer ${producerId} mapping removed, aborting retry`);
          return;
        }
        
        // Check if producer was recently closed
        const producerKey = `${peerId}-${kind}`;
        if (this.recentlyClosedProducers.has(producerKey)) {
          console.log(`⚠️ Producer ${producerKey} was recently closed, aborting consumption`);
          this.producerToPeer.delete(producerId);
          return;
        }
        
        await this.consume(producerId);
        console.log(`✅ Successfully consumed producer on retry ${retryCount + 1}:`, producerId);
      } catch (error) {
        // Handle specific "Producer not found" error gracefully
        if (error.message && error.message.includes('not found')) {
          if (retryCount < maxRetries) {
            console.warn(`⚠️ Producer ${producerId} not found on retry ${retryCount + 1}, will retry again...`);
            // Retry with exponential backoff
            this.retryProducerConsumption(producerId, peerId, kind, retryCount + 1, maxRetries);
          } else {
            console.warn(`⚠️ Producer ${producerId} permanently unavailable after ${maxRetries + 1} attempts, giving up`);
            // Clean up the mapping since producer doesn't exist
            this.producerToPeer.delete(producerId);
          }
        } else {
          console.error(`❌ Consume failed for producer ${producerId} on retry ${retryCount + 1}:`, error);
          // For non-"not found" errors, don't retry
          this.producerToPeer.delete(producerId);
        }
      }
    }, backoffDelay);
    
    // Track pending consumption
    this.pendingConsumptions.set(producerId, timeoutId);
  }
}

export default ScalableWebRTCManager;