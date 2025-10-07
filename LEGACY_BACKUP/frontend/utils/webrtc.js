// WebRTC utility class for handling peer-to-peer connections
// This implementation uses native browser WebRTC APIs without third-party services

class WebRTCManager {
  constructor() {
    this.localStream = null;
    this.peerConnections = new Map(); // Map of userId -> RTCPeerConnection
    this.isTeacher = false;
    this.roomId = null;
    this.userId = null;
    this.socket = null;
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.isRecording = false;
    
    // WebRTC configuration with STUN servers
    this.rtcConfig = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ],
      iceCandidatePoolSize: 10
    };
    
    // Event handlers
    this.onRemoteStream = null;
    this.onUserJoined = null;
    this.onUserLeft = null;
    this.onConnectionStateChange = null;
    this.onRecordingUpdate = null;
  }
  
  // Initialize WebRTC manager
  async initialize(config) {
    try {
      this.roomId = config.roomId;
      this.userId = config.userId;
      this.isTeacher = config.isTeacher;
      this.socket = config.socket;
      
      // Set up socket event listeners
      this.setupSocketListeners();
      
      console.log('✅ WebRTC Manager initialized:', {
        roomId: this.roomId,
        userId: this.userId,
        isTeacher: this.isTeacher
      });
      
      return true;
    } catch (error) {
      console.error('❌ Error initializing WebRTC manager:', error);
      throw error;
    }
  }
  
  // Get user media (camera and microphone)
  async getUserMedia(constraints = {}) {
    try {
      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('MediaDevices API not available. This usually happens when accessing the app over HTTP instead of HTTPS, or from a non-localhost IP address. For security reasons, browsers only allow camera/microphone access over HTTPS or localhost.');
      }

      // Ensure we always request at least video or audio
      const defaultConstraints = {
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 60 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };
      
      // Merge constraints properly
      const finalConstraints = {
        video: constraints.video !== false ? (constraints.video || defaultConstraints.video) : false,
        audio: constraints.audio !== false ? (constraints.audio || defaultConstraints.audio) : false
      };
      
      console.log('🎥 getUserMedia called with constraints:', finalConstraints);
      
      // Ensure at least one of video or audio is requested
      if (!finalConstraints.video && !finalConstraints.audio) {
        throw new Error('At least one of video or audio must be requested');
      }

      // Check permissions first if requesting video
      if (finalConstraints.video) {
        try {
          const permissions = await navigator.permissions.query({ name: 'camera' });
          console.log('📹 Camera permission state:', permissions.state);
          if (permissions.state === 'denied') {
            console.warn('⚠️ Camera permission denied by user');
          }
        } catch (permError) {
          console.warn('⚠️ Could not check camera permission:', permError);
        }
      }
      
      // Check microphone permissions
      if (finalConstraints.audio) {
        try {
          const permissions = await navigator.permissions.query({ name: 'microphone' });
          console.log('🎤 Microphone permission state:', permissions.state);
          if (permissions.state === 'denied') {
            console.warn('⚠️ Microphone permission denied by user');
          }
        } catch (permError) {
          console.warn('⚠️ Could not check microphone permission:', permError);
        }
      }
      
      this.localStream = await navigator.mediaDevices.getUserMedia(finalConstraints);
      
      const hasVideo = this.localStream.getVideoTracks().length > 0;
      const hasAudio = this.localStream.getAudioTracks().length > 0;
      console.log(`✅ Got user media: videoTracks=${hasVideo ? 1 : 0}, audioTracks=${hasAudio ? 1 : 0}`);
      
      // Check if we got what we requested
      if (finalConstraints.video && !hasVideo) {
        console.warn('⚠️ Video was requested but no video tracks received');
        console.warn('⚠️ This usually means camera permission was denied or camera is in use');
      }
      
      if (finalConstraints.audio && !hasAudio) {
        console.warn('⚠️ Audio was requested but no audio tracks received');
        console.warn('⚠️ This usually means microphone permission was denied or microphone is in use');
      }
      
      return this.localStream;
    } catch (error) {
      console.error('❌ Error getting user media:', error);
      console.error('❌ Error name:', error.name);
      console.error('❌ Error constraint:', error.constraint);
      
      // Provide specific error messages based on error type
      let errorMessage = `Failed to access camera/microphone: ${error.message}`;
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera/microphone access denied. Please click the camera icon in your browser address bar and allow access.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera or microphone found. Please check your devices are connected.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Camera or microphone is already in use by another application.';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = 'Camera or microphone constraints cannot be satisfied with available devices.';
      } else if (error.name === 'AbortError') {
        errorMessage = 'Camera/microphone access was aborted.';
      }
      
      throw new Error(errorMessage);
    }
  }

  // Decide who should initiate an offer to avoid glare
  shouldInitiateOffer(remoteUserId, remoteIsTeacher) {
    // Prefer teacher as offerer when present
    if (this.isTeacher) return true;
    if (remoteIsTeacher) return false;
    // Fallback: deterministic lexicographic order
    if (this.userId && remoteUserId) {
      return this.userId > remoteUserId;
    }
    return false;
  }

  // Update all peer connections with new local stream tracks
  updateLocalStreamTracks() {
    if (!this.localStream) {
      console.warn('⚠️ No local stream to update tracks with');
      return;
    }
    
    console.log('🔄 Updating peer connections with new tracks');
    
    this.peerConnections.forEach((pc, userId) => {
      try {
        const videoTrack = this.localStream.getVideoTracks()[0] || null;
        const audioTrack = this.localStream.getAudioTracks()[0] || null;
        
        console.log(`🔄 Updating tracks for ${userId}:`, {
          hasVideo: !!videoTrack,
          hasAudio: !!audioTrack,
          videoEnabled: videoTrack?.enabled,
          audioEnabled: audioTrack?.enabled
        });

        // Get current senders
        const senders = pc.getSenders();
        const videoSender = senders.find(s => s.track?.kind === 'video');
        const audioSender = senders.find(s => s.track?.kind === 'audio');
        
        // Handle video track
        if (videoTrack) {
          if (videoSender) {
            // Replace existing video track
            videoSender.replaceTrack(videoTrack).then(() => {
              console.log(`✅ Replaced video track for ${userId}`);
            }).catch(err => {
              console.error(`❌ Failed to replace video track for ${userId}:`, err);
            });
          } else {
            // Add video track for the first time
            console.log(`➕ Adding video track for ${userId} (first time)`);
            pc.addTrack(videoTrack, this.localStream);
          }
        } else if (videoSender && videoSender.track) {
          // Remove video track if it exists but we have no new video track
          videoSender.replaceTrack(null).then(() => {
            console.log(`🚫 Removed video track for ${userId}`);
          }).catch(err => {
            console.error(`❌ Failed to remove video track for ${userId}:`, err);
          });
        }
        
        // Handle audio track
        if (audioTrack) {
          if (audioSender) {
            // Replace existing audio track
            audioSender.replaceTrack(audioTrack).then(() => {
              console.log(`✅ Replaced audio track for ${userId}`);
            }).catch(err => {
              console.error(`❌ Failed to replace audio track for ${userId}:`, err);
            });
          } else {
            // Add audio track for the first time
            console.log(`➕ Adding audio track for ${userId} (first time)`);
            pc.addTrack(audioTrack, this.localStream);
          }
        } else if (audioSender && audioSender.track) {
          // Remove audio track if it exists but we have no new audio track
          audioSender.replaceTrack(null).then(() => {
            console.log(`🚫 Removed audio track for ${userId}`);
          }).catch(err => {
            console.error(`❌ Failed to remove audio track for ${userId}:`, err);
          });
        }
        
        // Don't manually trigger negotiation - let the negotiationneeded event handle it
        console.log(`🔄 Tracks updated for ${userId}, negotiation will be handled automatically`);
        
        
      } catch (error) {
        console.error(`❌ Error updating tracks for ${userId}:`, error);
      }
    });
  }
  
  // Join a room
  async joinRoom() {
    try {
      if (!this.socket) {
        throw new Error('Socket not initialized');
      }
      
      if (!this.roomId) {
        throw new Error('Room ID not set');
      }
      
      console.log('🚪 Joining room:', this.roomId, {
        userId: this.userId,
        isTeacher: this.isTeacher,
        socketConnected: this.socket.connected,
        socketId: this.socket.id
      });
      
      // Emit join room event
      this.socket.emit('join-room', {
        roomId: this.roomId,
        userId: this.userId,
        isTeacher: this.isTeacher
      });
      
      console.log('  Emitted join-room event to backend');
      
    } catch (error) {
      console.error('❌ Error joining room:', error);
      throw error;
    }
  }
  
  // Leave the room
  leaveRoom() {
    try {
      // Close all peer connections
      this.peerConnections.forEach((pc, userId) => {
        pc.close();
      });
      this.peerConnections.clear();
      
      // Stop local stream
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
        this.localStream = null;
      }
      
      // Stop recording if active
      if (this.isRecording) {
        this.stopRecording();
      }
      
      // Emit leave room event
      if (this.socket && this.roomId) {
        this.socket.emit('leave-room', {
          roomId: this.roomId,
          userId: this.userId
        });
      }
      
      console.log('🚪 Left room:', this.roomId);
      
    } catch (error) {
      console.error('❌ Error leaving room:', error);
    }
  }
  
  // Create peer connection for a user
  createPeerConnection(remoteUserId) {
    try {
      const pc = new RTCPeerConnection(this.rtcConfig);
      
      // Add transceivers first to ensure media sections exist
      const videoTransceiver = pc.addTransceiver('video', { 
        direction: 'sendrecv',
        streams: this.localStream ? [this.localStream] : []
      });
      const audioTransceiver = pc.addTransceiver('audio', { 
        direction: 'sendrecv',
        streams: this.localStream ? [this.localStream] : []
      });
      
      // Add local stream tracks if available
      if (this.localStream) {
        const videoTrack = this.localStream.getVideoTracks()[0];
        const audioTrack = this.localStream.getAudioTracks()[0];
        
        if (videoTrack && videoTransceiver.sender) {
          videoTransceiver.sender.replaceTrack(videoTrack);
        }
        if (audioTrack && audioTransceiver.sender) {
          audioTransceiver.sender.replaceTrack(audioTrack);
        }
      }
      
      // Handle negotiationneeded to renegotiate when tracks are added/replaced
      let negotiationTimer = null;
      pc.onnegotiationneeded = async () => {
        try {
          // Debounce negotiation to avoid multiple rapid calls
          if (negotiationTimer) {
            clearTimeout(negotiationTimer);
          }
          
          negotiationTimer = setTimeout(async () => {
            try {
              // Only create an offer if we should initiate and connection is stable
              if (pc.signalingState === 'stable' && this.shouldInitiateOffer(remoteUserId, false)) {
                console.log(`🔄 Negotiation needed for ${remoteUserId}, creating offer`);
                await this.createOffer(remoteUserId);
              } else {
                console.log(`⏳ Skipping negotiation for ${remoteUserId}: state=${pc.signalingState}, shouldInitiate=${this.shouldInitiateOffer(remoteUserId, false)}`);
              }
            } catch (err) {
              console.error('Negotiation error:', err);
            }
          }, 100); // 100ms debounce
          
        } catch (err) {
          console.error('Negotiation setup error:', err);
        }
      };
      
      // Handle remote stream
      pc.ontrack = (event) => {
        console.log('📹 Received remote stream from:', remoteUserId, {
          streamCount: event.streams.length,
          streamId: event.streams[0]?.id,
          trackKind: event.track?.kind,
          trackId: event.track?.id,
          trackEnabled: event.track?.enabled,
          trackReadyState: event.track?.readyState
        });
        
        if (event.streams[0]) {
          const stream = event.streams[0];
          console.log('📊 Remote stream details:', {
            id: stream.id,
            videoTracks: stream.getVideoTracks().length,
            audioTracks: stream.getAudioTracks().length,
            videoEnabled: stream.getVideoTracks()[0]?.enabled,
            audioEnabled: stream.getAudioTracks()[0]?.enabled
          });
        }
        
        if (this.onRemoteStream) {
          this.onRemoteStream(remoteUserId, event.streams[0]);
        }
      };
      
      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && this.socket) {
          this.socket.emit('ice-candidate', {
            roomId: this.roomId,
            targetUserId: remoteUserId,
            candidate: event.candidate
          });
        }
      };
      
      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        console.log(`🔗 Connection state with ${remoteUserId}:`, pc.connectionState);
        if (this.onConnectionStateChange) {
          this.onConnectionStateChange(remoteUserId, pc.connectionState);
        }
      };
      pc.oniceconnectionstatechange = () => {
        console.log(`❄️ ICE state with ${remoteUserId}:`, pc.iceConnectionState);
      };
      pc.onsignalingstatechange = () => {
        console.log(`📶 Signaling state with ${remoteUserId}:`, pc.signalingState);
      };
      pc.onicegatheringstatechange = () => {
        console.log(`🧊 ICE gathering state with ${remoteUserId}:`, pc.iceGatheringState);
      };
      
      this.peerConnections.set(remoteUserId, pc);
      return pc;
      
    } catch (error) {
      console.error('❌ Error creating peer connection:', error);
      throw error;
    }
  }
  
  // Create and send offer
  async createOffer(remoteUserId) {
    try {
      let pc = this.peerConnections.get(remoteUserId);
      
      if (!pc) {
        pc = this.createPeerConnection(remoteUserId);
      }
      
      // Check if we're in the right state to create an offer
      if (pc.signalingState !== 'stable') {
        console.warn(`⚠️ Cannot create offer in state: ${pc.signalingState} for ${remoteUserId}`);
        return;
      }
      
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await pc.setLocalDescription(offer);
      
      this.socket.emit('offer', {
        roomId: this.roomId,
        targetUserId: remoteUserId,
        offer: offer
      });
      
      console.log('📤 Sent offer to:', remoteUserId, {
        sdpType: offer.type,
        sdpBytes: offer.sdp ? offer.sdp.length : 0,
        signalingState: pc.signalingState
      });
      
    } catch (error) {
      console.error('❌ Error creating offer:', error);
    }
  }
  
  // Handle received offer
  async handleOffer(fromUserId, offer) {
    try {
      let pc = this.peerConnections.get(fromUserId);
      
      if (!pc) {
        pc = this.createPeerConnection(fromUserId);
      }
      
      // Check if we're in the right state to handle an offer
      if (pc.signalingState !== 'stable' && pc.signalingState !== 'have-local-offer') {
        console.warn(`⚠️ Received offer in wrong state: ${pc.signalingState}, closing and recreating connection`);
        pc.close();
        pc = this.createPeerConnection(fromUserId);
      }
      
      // Set remote description (the offer)
      await pc.setRemoteDescription(offer);
      console.log('✅ Set remote description (offer) from:', fromUserId);
      
      // Create and send answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      this.socket.emit('answer', {
        roomId: this.roomId,
        targetUserId: fromUserId,
        answer: answer
      });
      
      console.log('📤 Sent answer to:', fromUserId, {
        sdpType: answer.type,
        sdpBytes: answer.sdp ? answer.sdp.length : 0,
        signalingState: pc.signalingState
      });
      
    } catch (error) {
      console.error('❌ Error handling offer:', error);
      // Clean up the problematic connection
      const pc = this.peerConnections.get(fromUserId);
      if (pc) {
        pc.close();
        this.peerConnections.delete(fromUserId);
      }
    }
  }
  
  // Handle received answer
  async handleAnswer(fromUserId, answer) {
    try {
      const pc = this.peerConnections.get(fromUserId);
      if (!pc) {
        console.warn(`⚠️ No peer connection found for ${fromUserId} when handling answer`);
        return;
      }
      
      // Check if we're in the right state to handle an answer
      if (pc.signalingState !== 'have-local-offer') {
        console.warn(`⚠️ Received answer in wrong state: ${pc.signalingState} for ${fromUserId}`);
        return;
      }
      
      await pc.setRemoteDescription(answer);
      console.log('✅ Set remote description (answer) from:', fromUserId, {
        signalingState: pc.signalingState,
        connectionState: pc.connectionState,
        iceState: pc.iceConnectionState
      });
      
      // Optional: dump selected candidate pair after a short delay
      setTimeout(() => this.logSelectedCandidatePair(fromUserId).catch(()=>{}), 1500);
      
    } catch (error) {
      console.error('❌ Error handling answer:', error);
      // Clean up the problematic connection
      const pc = this.peerConnections.get(fromUserId);
      if (pc) {
        pc.close();
        this.peerConnections.delete(fromUserId);
      }
    }
  }
  
  // Handle received ICE candidate
  async handleIceCandidate(fromUserId, candidate) {
    try {
      const pc = this.peerConnections.get(fromUserId);
      if (pc) {
        await pc.addIceCandidate(candidate);
        console.log('🧊 Added ICE candidate from:', fromUserId);
      }
    } catch (error) {
      console.error('❌ Error handling ICE candidate:', error);
    }
  }

  // Debug helper to log selected candidate pair details
  async logSelectedCandidatePair(remoteUserId) {
    const pc = this.peerConnections.get(remoteUserId);
    if (!pc) return;
    try {
      const stats = await pc.getStats();
      let selectedPairId = null;
      const candidates = {};
      stats.forEach(report => {
        if (report.type === 'transport') {
          selectedPairId = report.selectedCandidatePairId || selectedPairId;
        }
        if (report.type === 'candidate-pair' && report.nominated) {
          selectedPairId = report.id;
        }
        if (report.type === 'local-candidate' || report.type === 'remote-candidate') {
          candidates[report.id] = report;
        }
      });
      if (selectedPairId) {
        const pair = Array.from(stats.values()).find(r => r.type === 'candidate-pair' && r.id === selectedPairId);
        if (pair) {
          const local = candidates[pair.localCandidateId];
          const remote = candidates[pair.remoteCandidateId];
          console.log(`📡 Selected candidate pair with ${remoteUserId}:`, {
            state: pair.state,
            currentRoundTripTime: pair.currentRoundTripTime,
            local: local ? { ip: local.ip || local.address, port: local.port, type: local.candidateType } : null,
            remote: remote ? { ip: remote.ip || remote.address, port: remote.port, type: remote.candidateType } : null
          });
        }
      }
    } catch (e) {
      console.warn('Failed to get ICE stats:', e);
    }
  }
  
  // Setup socket event listeners
  setupSocketListeners() {
    if (!this.socket) return;
    
    // User joined the room
    this.socket.on('user-joined', (data) => {
      console.log('👤 User joined:', data.userId, 'isTeacher:', data.isTeacher);
      if (data.userId !== this.userId) {
        if (this.onUserJoined) {
          this.onUserJoined(data.userId, data.isTeacher);
        }
        if (this.shouldInitiateOffer(data.userId, data.isTeacher)) {
          this.createOffer(data.userId);
        }
      }
    });
    
    // User left the room
    this.socket.on('user-left', (data) => {
      console.log('👤 User left:', data.userId);
      if (this.onUserLeft) {
        this.onUserLeft(data.userId);
      }
      
      // Close peer connection
      const pc = this.peerConnections.get(data.userId);
      if (pc) {
        pc.close();
        this.peerConnections.delete(data.userId);
      }
    });
    
    // Received offer
    this.socket.on('offer', (data) => {
      console.log('📥 Received offer from:', data.fromUserId);
      this.handleOffer(data.fromUserId, data.offer);
    });
    
    // Received answer
    this.socket.on('answer', (data) => {
      console.log('📥 Received answer from:', data.fromUserId);
      this.handleAnswer(data.fromUserId, data.answer);
    });
    
    // Received ICE candidate
    this.socket.on('ice-candidate', (data) => {
      console.log('🧊 Received ICE candidate from:', data.fromUserId);
      this.handleIceCandidate(data.fromUserId, data.candidate);
    });
    
    // Room info (legacy) and participants list (current server event)
    const handleParticipants = (users) => {
      users.forEach(user => {
        if (user.userId !== this.userId) {
          if (this.onUserJoined) {
            this.onUserJoined(user.userId, user.isTeacher);
          }
          if (this.shouldInitiateOffer(user.userId, user.isTeacher)) {
            this.createOffer(user.userId);
          }
        }
      });
    };
    this.socket.on('room-info', (data) => {
      console.log('ℹ️ Room info:', data);
      if (data && Array.isArray(data.users)) {
        handleParticipants(data.users);
      }
    });
    this.socket.on('participants-list', (participants) => {
      console.log('👥 Participants list:', participants);
      if (Array.isArray(participants)) {
        handleParticipants(participants);
      }
    });
  }
  
  // Toggle video
  toggleVideo() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        console.log(`📹 Video ${videoTrack.enabled ? 'enabled' : 'disabled'}`);
        return videoTrack.enabled;
      }
    }
    return false;
  }
  
  // Toggle audio
  toggleAudio() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        console.log(`🎤 Audio ${audioTrack.enabled ? 'enabled' : 'disabled'}`);
        return audioTrack.enabled;
      }
    }
    return false;
  }

  // Enable video (get new video track if needed)
  async enableVideo() {
    try {
      if (!this.localStream) {
        // Get new stream with video
        this.localStream = await this.getUserMedia({ video: true, audio: true });
        this.updateLocalStreamTracks();
        return true;
      }

      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = true;
        console.log(`📹 Video enabled`);
        return true;
      } else {
        // Need to get video track
        const newStream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: false 
        });
        const newVideoTrack = newStream.getVideoTracks()[0];
        
        if (newVideoTrack) {
          this.localStream.addTrack(newVideoTrack);
          this.updateLocalStreamTracks();
          console.log(`📹 Video track added and enabled`);
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('❌ Error enabling video:', error);
      throw error;
    }
  }

  // Enable audio (get new audio track if needed)
  async enableAudio() {
    try {
      if (!this.localStream) {
        // Get new stream with audio
        this.localStream = await this.getUserMedia({ video: false, audio: true });
        this.updateLocalStreamTracks();
        return true;
      }

      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = true;
        console.log(`🎤 Audio enabled`);
        return true;
      } else {
        // Need to get audio track
        const newStream = await navigator.mediaDevices.getUserMedia({ 
          video: false, 
          audio: true 
        });
        const newAudioTrack = newStream.getAudioTracks()[0];
        
        if (newAudioTrack) {
          this.localStream.addTrack(newAudioTrack);
          this.updateLocalStreamTracks();
          console.log(`🎤 Audio track added and enabled`);
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('❌ Error enabling audio:', error);
      throw error;
    }
  }

  // Disable video
  disableVideo() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = false;
        console.log(`📹 Video disabled`);
        return true;
      }
    }
    return false;
  }

  // Disable audio
  disableAudio() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = false;
        console.log(`🎤 Audio disabled`);
        return true;
      }
    }
    return false;
  }

  // Create placeholder tracks for students (silent audio, blank video)
  async createPlaceholderTracks() {
    try {
      console.log('🎭 Creating placeholder tracks for student...');
      
      // Create a blank video track (1x1 pixel canvas)
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, 1, 1);
      
      const videoStream = canvas.captureStream(15); // 15 FPS
      const videoTrack = videoStream.getVideoTracks()[0];
      videoTrack.enabled = false; // Start disabled
      
      // Create a silent audio track
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const dst = audioContext.createMediaStreamDestination();
      oscillator.connect(dst);
      oscillator.start();
      
      const audioTrack = dst.stream.getAudioTracks()[0];
      audioTrack.enabled = false; // Start disabled
      
      // Create a MediaStream with these tracks
      this.localStream = new MediaStream([videoTrack, audioTrack]);
      
      console.log('✅ Created placeholder tracks:', {
        hasVideo: this.localStream.getVideoTracks().length > 0,
        hasAudio: this.localStream.getAudioTracks().length > 0,
        videoEnabled: this.localStream.getVideoTracks()[0]?.enabled,
        audioEnabled: this.localStream.getAudioTracks()[0]?.enabled
      });
      
      return this.localStream;
    } catch (error) {
      console.error('❌ Error creating placeholder tracks:', error);
      throw error;
    }
  }

  // Enable student media (for students who start with no media)
  async enableStudentMedia(constraints = { video: false, audio: false }) {
    try {
      console.log('🎬 Enabling student media with constraints:', constraints);
      
      // Stop existing tracks (placeholder or real)
      if (this.localStream) {
        console.log('🛑 Stopping existing tracks before getting new media');
        this.localStream.getTracks().forEach(track => {
          console.log(`Stopping ${track.kind} track, enabled: ${track.enabled}`);
          track.stop();
        });
      }
      
      // Get fresh media stream
      this.localStream = await this.getUserMedia(constraints);
      console.log('✅ Created new stream for student with tracks:', {
        video: this.localStream.getVideoTracks().length,
        audio: this.localStream.getAudioTracks().length,
        videoEnabled: this.localStream.getVideoTracks()[0]?.enabled,
        audioEnabled: this.localStream.getAudioTracks()[0]?.enabled
      });
      
      // Update all peer connections with the new tracks
      this.updateLocalStreamTracks();
      
      return this.localStream;
    } catch (error) {
      console.error('❌ Error enabling student media:', error);
      throw error;
    }
  }

  // Force renegotiation with all peers (useful when student enables media for first time)
  async forceRenegotiationWithAllPeers() {
    console.log('🔄 Forcing renegotiation with all peers');
    
    for (const [userId, pc] of this.peerConnections) {
      try {
        if (pc.signalingState === 'stable' && this.shouldInitiateOffer(userId, false)) {
          console.log(`🔄 Creating fresh offer for ${userId}`);
          await this.createOffer(userId);
        }
      } catch (error) {
        console.error(`❌ Error renegotiating with ${userId}:`, error);
      }
    }
  }
  
  // Start recording (teacher only)
  async startRecording() {
    try {
      console.log('🎬 Start recording called:', {
        isTeacher: this.isTeacher,
        hasLocalStream: !!this.localStream,
        streamActive: this.localStream ? this.localStream.active : false,
        videoTracks: this.localStream ? this.localStream.getVideoTracks().length : 0,
        audioTracks: this.localStream ? this.localStream.getAudioTracks().length : 0
      });
      
      if (!this.isTeacher) {
        throw new Error('Only teachers can record (teacher status check failed)');
      }
      
      if (!this.localStream) {
        throw new Error('Stream must be available (no local stream found)');
      }
      
      if (!this.localStream.active) {
        throw new Error('Stream must be active (stream is not active)');
      }
      
      this.recordedChunks = [];
      
      // Create media recorder
      this.mediaRecorder = new MediaRecorder(this.localStream, {
        mimeType: 'video/webm;codecs=vp9,opus'
      });
      
      // Handle data available
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };
      
      // Handle recording stop
      this.mediaRecorder.onstop = () => {
        console.log('⏹️ Recording stopped');
        this.isRecording = false;
        if (this.onRecordingUpdate) {
          this.onRecordingUpdate(false, this.recordedChunks);
        }
      };
      
      // Start recording
      this.mediaRecorder.start(1000); // Record in 1-second chunks
      this.isRecording = true;
      
      console.log('🔴 Recording started');
      
      if (this.onRecordingUpdate) {
        this.onRecordingUpdate(true, null);
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error starting recording:', error);
      throw error;
    }
  }
  
  // Stop recording
  stopRecording() {
    try {
      if (this.mediaRecorder && this.isRecording) {
        this.mediaRecorder.stop();
        console.log('⏹️ Recording stop requested');
        return this.recordedChunks;
      }
      return null;
    } catch (error) {
      console.error('❌ Error stopping recording:', error);
      throw error;
    }
  }
  
  // Get recording blob
  getRecordingBlob() {
    if (this.recordedChunks.length > 0) {
      return new Blob(this.recordedChunks, {
        type: 'video/webm'
      });
    }
    return null;
  }
  
  // Screen sharing
  async startScreenShare() {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });
      
      // Replace video track in all peer connections
      this.peerConnections.forEach((pc, userId) => {
        const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender) {
          sender.replaceTrack(screenStream.getVideoTracks()[0]);
        }
      });
      
      // Handle screen share end
      screenStream.getVideoTracks()[0].onended = () => {
        this.stopScreenShare();
      };
      
      console.log('🖥️ Screen sharing started');
      return screenStream;
    } catch (error) {
      console.error('❌ Error starting screen share:', error);
      throw error;
    }
  }
  
  // Stop screen sharing
  async stopScreenShare() {
    try {
      if (this.localStream) {
        // Replace screen share with camera
        this.peerConnections.forEach((pc, userId) => {
          const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
          if (sender && this.localStream.getVideoTracks()[0]) {
            sender.replaceTrack(this.localStream.getVideoTracks()[0]);
          }
        });
      }
      
      console.log('🖥️ Screen sharing stopped');
    } catch (error) {
      console.error('❌ Error stopping screen share:', error);
    }
  }
  
  // Get connection stats
  async getConnectionStats() {
    const stats = {};
    
    for (const [userId, pc] of this.peerConnections) {
      try {
        const rtcStats = await pc.getStats();
        stats[userId] = {
          connectionState: pc.connectionState,
          iceConnectionState: pc.iceConnectionState,
          stats: rtcStats
        };
      } catch (error) {
        console.error(`❌ Error getting stats for ${userId}:`, error);
      }
    }
    
    return stats;
  }
}

// Export for use in React components
export default WebRTCManager;