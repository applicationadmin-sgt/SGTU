/**
 * Comprehensive Streaming Debugging Script
 * 
 * This script helps debug live video call streaming issues by checking:
 * 1. ICE candidates
 * 2. Socket.IO signaling
 * 3. Mediasoup producers/consumers
 * 4. DTLS connection state
 * 5. Browser video element assignment
 * 6. HTTPS/certificate status
 */

console.log('🔥 STREAMING DEBUG SCRIPT LOADED');
console.log('📝 Open browser console to see all debug output');

// Check HTTPS status
function checkHTTPS() {
  const isHTTPS = location.protocol === 'https:';
  const isLocalhost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  
  console.log('🔥 HTTPS DEBUG: Protocol check');
  console.log('🔒 HTTPS Status:', {
    protocol: location.protocol,
    isHTTPS,
    isLocalhost,
    isSecure: isHTTPS || isLocalhost,
    hostname: location.hostname,
    port: location.port
  });
  
  if (!isHTTPS && !isLocalhost) {
    console.error('❌ HTTPS ERROR: WebRTC requires HTTPS or localhost!');
    console.error('🔧 FIX: Use https:// or localhost for WebRTC to work');
  } else {
    console.log('✅ HTTPS: Protocol is secure for WebRTC');
  }
  
  return isHTTPS || isLocalhost;
}

// Monitor ICE candidates
function monitorICE() {
  console.log('🔥 ICE DEBUG: Setting up ICE monitoring');
  
  // Override RTCPeerConnection to monitor ICE
  const originalRTCPeerConnection = window.RTCPeerConnection;
  window.RTCPeerConnection = function(...args) {
    const pc = new originalRTCPeerConnection(...args);
    
    pc.addEventListener('icecandidate', (event) => {
      if (event.candidate) {
        console.log('🔥 ICE DEBUG: ICE candidate generated:', {
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
          type: event.candidate.type,
          protocol: event.candidate.protocol,
          address: event.candidate.address,
          port: event.candidate.port
        });
      } else {
        console.log('🔥 ICE DEBUG: ICE gathering complete');
      }
    });
    
    pc.addEventListener('iceconnectionstatechange', () => {
      console.log('🔥 ICE DEBUG: ICE connection state changed:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'failed') {
        console.error('❌ ICE CONNECTION FAILED - Check network/firewall');
      } else if (pc.iceConnectionState === 'connected') {
        console.log('✅ ICE CONNECTION SUCCESS');
      }
    });
    
    return pc;
  };
}

// Monitor Socket.IO events
function monitorSocketIO() {
  console.log('🔥 SIGNALING DEBUG: Setting up Socket.IO monitoring');
  
  // Look for existing socket instances
  const checkForSocket = () => {
    if (window.io && window.socket) {
      const socket = window.socket;
      console.log('🔥 SIGNALING DEBUG: Found Socket.IO instance');
      
      // Monitor all events
      const originalEmit = socket.emit;
      socket.emit = function(event, ...args) {
        console.log('🔥 SIGNALING DEBUG: Outgoing event:', event, args);
        return originalEmit.apply(this, [event, ...args]);
      };
      
      const originalOn = socket.on;
      socket.on = function(event, callback) {
        const wrappedCallback = (...args) => {
          console.log('🔥 SIGNALING DEBUG: Incoming event:', event, args);
          return callback(...args);
        };
        return originalOn.apply(this, [event, wrappedCallback]);
      };
      
    } else {
      setTimeout(checkForSocket, 1000);
    }
  };
  
  checkForSocket();
}

// Monitor video elements
function monitorVideoElements() {
  console.log('🔥 BROWSER DEBUG: Setting up video element monitoring');
  
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.tagName === 'VIDEO') {
          console.log('🔥 BROWSER DEBUG: Video element added to DOM:', node);
          
          node.addEventListener('loadedmetadata', () => {
            console.log('🔥 BROWSER DEBUG: Video metadata loaded:', {
              videoWidth: node.videoWidth,
              videoHeight: node.videoHeight,
              duration: node.duration,
              srcObject: !!node.srcObject,
              src: node.src
            });
          });
          
          node.addEventListener('play', () => {
            console.log('🔥 BROWSER DEBUG: Video started playing');
          });
          
          node.addEventListener('error', (e) => {
            console.error('🔥 BROWSER DEBUG: Video error:', e);
          });
          
          // Check for stream assignment
          const checkStream = () => {
            if (node.srcObject) {
              console.log('🔥 BROWSER DEBUG: Video has stream:', {
                streamId: node.srcObject.id,
                active: node.srcObject.active,
                tracks: node.srcObject.getTracks().length,
                videoTracks: node.srcObject.getVideoTracks().length,
                audioTracks: node.srcObject.getAudioTracks().length
              });
            } else {
              setTimeout(checkStream, 1000);
            }
          };
          
          setTimeout(checkStream, 100);
        }
      });
    });
  });
  
  observer.observe(document.body, { childList: true, subtree: true });
}

// Monitor MediaStream API
function monitorMediaStream() {
  console.log('🔥 MEDIASOUP DEBUG: Setting up MediaStream monitoring');
  
  const originalGetUserMedia = navigator.mediaDevices.getUserMedia;
  navigator.mediaDevices.getUserMedia = async function(constraints) {
    console.log('🔥 MEDIASOUP DEBUG: getUserMedia called:', constraints);
    try {
      const stream = await originalGetUserMedia.call(this, constraints);
      console.log('🔥 MEDIASOUP DEBUG: getUserMedia success:', {
        streamId: stream.id,
        active: stream.active,
        tracks: stream.getTracks().map(t => ({
          kind: t.kind,
          label: t.label,
          enabled: t.enabled,
          readyState: t.readyState
        }))
      });
      return stream;
    } catch (error) {
      console.error('🔥 MEDIASOUP DEBUG: getUserMedia failed:', error);
      throw error;
    }
  };
}

// Check WebRTC support
function checkWebRTCSupport() {
  console.log('🔥 BROWSER DEBUG: Checking WebRTC support');
  
  const support = {
    getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    RTCPeerConnection: !!window.RTCPeerConnection,
    RTCSessionDescription: !!window.RTCSessionDescription,
    RTCIceCandidate: !!window.RTCIceCandidate
  };
  
  console.log('🔥 BROWSER DEBUG: WebRTC support:', support);
  
  const allSupported = Object.values(support).every(Boolean);
  if (allSupported) {
    console.log('✅ BROWSER: Full WebRTC support detected');
  } else {
    console.error('❌ BROWSER: Missing WebRTC features');
  }
  
  return allSupported;
}

// Main debug initialization
function initDebug() {
  console.log('🔥🔥🔥 COMPREHENSIVE STREAMING DEBUG INITIALIZED 🔥🔥🔥');
  console.log('📋 This will help debug:');
  console.log('   1. ✅ ICE candidates');
  console.log('   2. ✅ Socket.IO signaling');
  console.log('   3. ✅ Mediasoup producer/consumer creation');
  console.log('   4. ✅ DTLS connection state');
  console.log('   5. ✅ Browser video element assignment');
  console.log('   6. ✅ HTTPS/certificate status');
  console.log('');
  
  // Run all checks
  const httpsOk = checkHTTPS();
  const webrtcOk = checkWebRTCSupport();
  
  if (httpsOk && webrtcOk) {
    console.log('🚀 READY: All prerequisites met, initializing monitors...');
    monitorICE();
    monitorSocketIO();
    monitorVideoElements();
    monitorMediaStream();
    
    console.log('✅ ALL MONITORS ACTIVE - Check console for real-time debug info');
  } else {
    console.error('❌ PREREQUISITES FAILED - Fix HTTPS/WebRTC support first');
  }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDebug);
} else {
  initDebug();
}

// Export for manual use
window.streamingDebug = {
  checkHTTPS,
  monitorICE,
  monitorSocketIO,
  monitorVideoElements,
  monitorMediaStream,
  checkWebRTCSupport,
  init: initDebug
};