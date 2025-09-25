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
        const videoSender = senders.find(s => s.track && s.track.kind === 'video');
        const audioSender = senders.find(s => s.track && s.track.kind === 'audio');
        
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
        }
        
        // Trigger renegotiation if needed
        if (pc.signalingState === 'stable') {
          console.log(`🔄 Triggering renegotiation for ${userId}`);
          this.createOffer(userId);
        } else {
          console.log(`⏳ Waiting for stable state to renegotiate with ${userId} (current: ${pc.signalingState})`);
        }
        
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
      
      console.log('� Emitted join-room event to backend');
      
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
      
      // Ensure media sections exist even before local tracks
      try {
        pc.addTransceiver('video', { direction: 'sendrecv' });
        pc.addTransceiver('audio', { direction: 'sendrecv' });
      } catch (e) {
        console.warn('Transceiver add failed (older browser?)', e);
      }
      
      // Add local stream tracks
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          pc.addTrack(track, this.localStream);
        });
      }
      
      // Handle negotiationneeded to renegotiate when tracks are added/replaced
      pc.onnegotiationneeded = async () => {
        try {
          // Avoid spamming offers: only create an offer if connection is stable
          if (pc.signalingState === 'stable') {
            await this.createOffer(remoteUserId);
          }
        } catch (err) {
          console.error('Negotiation error:', err);
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
      const pc = this.peerConnections.get(remoteUserId) || this.createPeerConnection(remoteUserId);
      
      const offer = await pc.createOffer();
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
      const pc = this.peerConnections.get(fromUserId) || this.createPeerConnection(fromUserId);
      
      await pc.setRemoteDescription(offer);
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
    }
  }
  
  // Handle received answer
  async handleAnswer(fromUserId, answer) {
    try {
      const pc = this.peerConnections.get(fromUserId);
      if (pc) {
        await pc.setRemoteDescription(answer);
        console.log('✅ Set remote description from:', fromUserId, {
          signalingState: pc.signalingState,
          connectionState: pc.connectionState,
          iceState: pc.iceConnectionState
        });
        // Optional: dump selected candidate pair after a short delay
        setTimeout(() => this.logSelectedCandidatePair(fromUserId).catch(()=>{}), 1500);
      }
    } catch (error) {
      console.error('❌ Error handling answer:', error);
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
        return audioTrack.enabled;
      }
    }
    return false;
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