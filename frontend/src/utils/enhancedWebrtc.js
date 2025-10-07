class EnhancedWebRTCManager {
  constructor() {
    this.localStream = null;
    this.peerConnections = new Map();
    this.socket = null;
    this.userId = null;
    this.roomId = null;
    this.isTeacher = false;
    
    // Configuration
    this.pcConfig = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };
    
    // Event handlers
    this.onRemoteStream = null;
    this.onUserLeft = null;
    this.onConnectionStateChange = null;
    
    // Media state
    this.isVideoEnabled = true;
    this.isAudioEnabled = true;
    this.isScreenSharing = false;
    this.screenShareStream = null;
  }
  
  async initialize({ roomId, userId, isTeacher, socket }) {
    this.roomId = roomId;
    this.userId = userId;
    this.isTeacher = isTeacher;
    this.socket = socket;
    
    console.log('🔧 WebRTC Manager initialized with:');
    console.log('🔧 Room ID:', roomId);
    console.log('🔧 User ID:', userId);
    console.log('🔧 Is Teacher:', isTeacher);
    console.log('🔧 Socket connected:', !!socket);
    
    // Setup socket handlers
    this.setupSocketHandlers();
  }
  
  setupSocketHandlers() {
    if (!this.socket) return;
    
    // WebRTC signaling events
    this.socket.on('user-joined', (data) => {
      console.log('User joined for WebRTC:', data.userId);
      if (data.userId !== this.userId) {
        this.createPeerConnection(data.userId, true);
      }
    });

    this.socket.on('user-disconnected', (data) => {
      console.log('User disconnected:', data.userId);
      this.removePeerConnection(data.userId);
      if (this.onUserLeft) {
        this.onUserLeft(data.userId);
      }
    });
    
    this.socket.on('offer', async (data) => {
      console.log('Received offer from:', data.fromUserId);
      await this.handleOffer(data.fromUserId, data.offer);
    });
    
    this.socket.on('answer', async (data) => {
      console.log('Received answer from:', data.fromUserId);
      await this.handleAnswer(data.fromUserId, data.answer);
    });
    
    this.socket.on('ice-candidate', async (data) => {
      console.log('Received ICE candidate from:', data.fromUserId);
      await this.handleIceCandidate(data.fromUserId, data.candidate);
    });
    
    // Handle existing participants when joining
    this.socket.on('participants-list', (participants) => {
      console.log('Received participants list for WebRTC:', participants);
      participants.forEach(participant => {
        if (participant.userId !== this.userId && !this.peerConnections.has(participant.userId)) {
          // Create peer connection for existing participants
          this.createPeerConnection(participant.userId, this.userId < participant.userId);
        }
      });
    });

    // Media control events
    this.socket.on('user-media-state-changed', (data) => {
      console.log('User media state changed:', data);
      // Handle remote user media state changes
    });
  }
  
  async getUserMedia(constraints = { video: true, audio: true }) {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.isVideoEnabled = constraints.video;
      this.isAudioEnabled = constraints.audio;
      
      // Update all peer connections with new stream
      this.peerConnections.forEach((pc, userId) => {
        this.replaceTrack(userId, this.localStream);
      });
      
      console.log('✅ Successfully got user media:', constraints);
      return this.localStream;
    } catch (error) {
      console.error('❌ Error getting user media:', error);
      
      // Try with less restrictive constraints
      if (constraints.video && constraints.audio) {
        console.log('🔄 Trying with audio only...');
        try {
          return await this.getUserMedia({ video: false, audio: true });
        } catch (audioError) {
          console.log('🔄 Trying with no media (data only mode)...');
          this.isVideoEnabled = false;
          this.isAudioEnabled = false;
          return null; // Allow joining without media
        }
      } else if (constraints.audio) {
        console.log('🔄 Switching to data only mode...');
        this.isVideoEnabled = false;
        this.isAudioEnabled = false;
        return null; // Allow joining without media
      }
      
      // Complete failure - still allow joining for text/data communication
      console.log('⚠️ No media devices available, joining in data-only mode');
      this.isVideoEnabled = false;
      this.isAudioEnabled = false;
      return null;
    }
  }
  
  createPeerConnection(userId, isInitiator = false) {
    if (this.peerConnections.has(userId)) {
      console.log('Peer connection already exists for:', userId);
      return;
    }
    
    console.log('Creating peer connection for:', userId, 'as initiator:', isInitiator);
    
    const pc = new RTCPeerConnection(this.pcConfig);
    this.peerConnections.set(userId, pc);
    
    // Add local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream);
      });
    }
    
    // Handle remote stream
    pc.ontrack = (event) => {
      console.log('Received remote stream from:', userId);
      const [remoteStream] = event.streams;
      if (this.onRemoteStream) {
        this.onRemoteStream(userId, remoteStream);
      }
    };
    
    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('Sending ICE candidate to:', userId);
        this.socket.emit('ice-candidate', {
          candidate: event.candidate,
          userId: this.userId,
          targetUserId: userId
        });
      }
    };
    
    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log('Connection state for', userId, ':', pc.connectionState);
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(userId, pc.connectionState);
      }
      
      if (pc.connectionState === 'failed' || 
          pc.connectionState === 'disconnected' || 
          pc.connectionState === 'closed') {
        this.removePeerConnection(userId);
      }
    };
    
    // Handle ICE connection state
    pc.oniceconnectionstatechange = () => {
      console.log('ICE connection state for', userId, ':', pc.iceConnectionState);
    };
    
    // Create offer if initiator
    if (isInitiator) {
      this.createOffer(userId);
    }
    
    return pc;
  }
  
  async createOffer(userId) {
    const pc = this.peerConnections.get(userId);
    if (!pc) return;
    
    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      
      await pc.setLocalDescription(offer);
      
      console.log('Sending offer to:', userId);
      this.socket.emit('offer', {
        offer,
        userId: this.userId,
        targetUserId: userId
      });
    } catch (error) {
      console.error('Error creating offer for', userId, ':', error);
    }
  }
  
  async handleOffer(userId, offer) {
    let pc = this.peerConnections.get(userId);
    if (!pc) {
      pc = this.createPeerConnection(userId, false);
    }
    
    try {
      await pc.setRemoteDescription(offer);
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      console.log('Sending answer to:', userId);
      this.socket.emit('answer', {
        answer,
        userId: this.userId,
        targetUserId: userId
      });
    } catch (error) {
      console.error('Error handling offer from', userId, ':', error);
    }
  }
  
  async handleAnswer(userId, answer) {
    const pc = this.peerConnections.get(userId);
    if (!pc) return;
    
    try {
      await pc.setRemoteDescription(answer);
    } catch (error) {
      console.error('Error handling answer from', userId, ':', error);
    }
  }
  
  async handleIceCandidate(userId, candidate) {
    const pc = this.peerConnections.get(userId);
    if (!pc) return;
    
    try {
      await pc.addIceCandidate(candidate);
    } catch (error) {
      console.error('Error handling ICE candidate from', userId, ':', error);
    }
  }
  
  toggleVideo() {
    if (!this.localStream) return false;
    
    const videoTrack = this.localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      this.isVideoEnabled = videoTrack.enabled;
      
      // Notify other users
      this.socket.emit('media-state-changed', {
        userId: this.userId,
        videoEnabled: this.isVideoEnabled,
        audioEnabled: this.isAudioEnabled
      });
      
      return this.isVideoEnabled;
    }
    return false;
  }
  
  toggleAudio() {
    if (!this.localStream) return false;
    
    const audioTrack = this.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      this.isAudioEnabled = audioTrack.enabled;
      
      // Notify other users
      this.socket.emit('media-state-changed', {
        userId: this.userId,
        videoEnabled: this.isVideoEnabled,
        audioEnabled: this.isAudioEnabled
      });
      
      return this.isAudioEnabled;
    }
    return false;
  }
  
  async startScreenShare() {
    try {
      if (this.isScreenSharing) {
        throw new Error('Screen sharing already active');
      }
      
      this.screenShareStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          mediaSource: 'screen',
          width: { max: 1920 },
          height: { max: 1080 },
          frameRate: { max: 30 }
        },
        audio: true
      });
      
      // Replace video track in all peer connections
      const videoTrack = this.screenShareStream.getVideoTracks()[0];
      if (videoTrack) {
        this.peerConnections.forEach(async (pc, userId) => {
          const sender = pc.getSenders().find(s => 
            s.track && s.track.kind === 'video'
          );
          if (sender) {
            await sender.replaceTrack(videoTrack);
          }
        });
      }
      
      // Handle screen share end
      videoTrack.onended = () => {
        this.stopScreenShare();
      };
      
      this.isScreenSharing = true;
      
      // Notify other users
      this.socket.emit('screen-share-started', {
        userId: this.userId
      });
      
      return true;
    } catch (error) {
      console.error('Error starting screen share:', error);
      throw error;
    }
  }
  
  async stopScreenShare() {
    if (!this.isScreenSharing || !this.screenShareStream) {
      return;
    }
    
    try {
      // Stop screen share stream
      this.screenShareStream.getTracks().forEach(track => track.stop());
      
      // Replace with camera stream
      if (this.localStream) {
        const videoTrack = this.localStream.getVideoTracks()[0];
        if (videoTrack) {
          this.peerConnections.forEach(async (pc, userId) => {
            const sender = pc.getSenders().find(s => 
              s.track && s.track.kind === 'video'
            );
            if (sender) {
              await sender.replaceTrack(videoTrack);
            }
          });
        }
      }
      
      this.screenShareStream = null;
      this.isScreenSharing = false;
      
      // Notify other users
      this.socket.emit('screen-share-stopped', {
        userId: this.userId
      });
      
    } catch (error) {
      console.error('Error stopping screen share:', error);
    }
  }
  
  async replaceTrack(userId, stream) {
    const pc = this.peerConnections.get(userId);
    if (!pc || !stream) return;
    
    try {
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];
      
      const senders = pc.getSenders();
      
      // Replace video track
      if (videoTrack) {
        const videoSender = senders.find(s => s.track && s.track.kind === 'video');
        if (videoSender) {
          await videoSender.replaceTrack(videoTrack);
        } else {
          pc.addTrack(videoTrack, stream);
        }
      }
      
      // Replace audio track
      if (audioTrack) {
        const audioSender = senders.find(s => s.track && s.track.kind === 'audio');
        if (audioSender) {
          await audioSender.replaceTrack(audioTrack);
        } else {
          pc.addTrack(audioTrack, stream);
        }
      }
    } catch (error) {
      console.error('Error replacing track for', userId, ':', error);
    }
  }
  
  removePeerConnection(userId) {
    const pc = this.peerConnections.get(userId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(userId);
      console.log('Removed peer connection for:', userId);
    }
  }
  
  getConnectionStats(userId) {
    const pc = this.peerConnections.get(userId);
    if (!pc) return null;
    
    return pc.getStats();
  }
  
  async getMediaDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return {
        audioInputs: devices.filter(device => device.kind === 'audioinput'),
        videoInputs: devices.filter(device => device.kind === 'videoinput'),
        audioOutputs: devices.filter(device => device.kind === 'audiooutput')
      };
    } catch (error) {
      console.error('Error getting media devices:', error);
      return { audioInputs: [], videoInputs: [], audioOutputs: [] };
    }
  }
  
  async switchCamera(deviceId) {
    try {
      if (this.localStream) {
        this.localStream.getVideoTracks().forEach(track => track.stop());
      }
      
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
        audio: this.isAudioEnabled
      });
      
      this.localStream = newStream;
      
      // Update all peer connections
      this.peerConnections.forEach((pc, userId) => {
        this.replaceTrack(userId, newStream);
      });
      
      return newStream;
    } catch (error) {
      console.error('Error switching camera:', error);
      throw error;
    }
  }
  
  async switchMicrophone(deviceId) {
    try {
      if (this.localStream) {
        this.localStream.getAudioTracks().forEach(track => track.stop());
      }
      
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: this.isVideoEnabled,
        audio: { deviceId: { exact: deviceId } }
      });
      
      this.localStream = newStream;
      
      // Update all peer connections
      this.peerConnections.forEach((pc, userId) => {
        this.replaceTrack(userId, newStream);
      });
      
      return newStream;
    } catch (error) {
      console.error('Error switching microphone:', error);
      throw error;
    }
  }
  
  setAudioOutput(deviceId) {
    // Note: This only works if the browser supports setSinkId
    const audioElements = document.querySelectorAll('audio, video');
    
    audioElements.forEach(async (element) => {
      if (element.setSinkId) {
        try {
          await element.setSinkId(deviceId);
        } catch (error) {
          console.error('Error setting audio output:', error);
        }
      }
    });
  }
  
  cleanup() {
    console.log('Cleaning up WebRTC manager');
    
    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    // Stop screen share stream
    if (this.screenShareStream) {
      this.screenShareStream.getTracks().forEach(track => track.stop());
      this.screenShareStream = null;
    }
    
    // Close all peer connections
    this.peerConnections.forEach((pc, userId) => {
      pc.close();
    });
    this.peerConnections.clear();
    
    // Reset state
    this.isVideoEnabled = true;
    this.isAudioEnabled = true;
    this.isScreenSharing = false;
  }
}

export default EnhancedWebRTCManager;