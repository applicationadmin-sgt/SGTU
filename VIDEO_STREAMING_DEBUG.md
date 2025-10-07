# Live Class Video Streaming Debug Script

## Issue Analysis
- Both users have cameras ON (visible in participant lists)
- Self-video working (can see own video)
- Remote video NOT working (can't see each other)
- Mediasoup connection needs debugging

## Console Commands for Debugging

Run these in both teacher and student browser consoles:

```javascript
// 1. Check WebRTC manager state
console.log('🔍 WebRTC Manager State:', {
  socket: !!window.webrtcManager?.socket,
  device: !!window.webrtcManager?.device,
  sendTransport: !!window.webrtcManager?.sendTransport,
  recvTransport: !!window.webrtcManager?.recvTransport,
  producers: window.webrtcManager?.producers?.size || 0,
  consumers: window.webrtcManager?.consumers?.size || 0,
  producerToPeer: window.webrtcManager?.producerToPeer?.size || 0
});

// 2. Check if mediasoup is connected
console.log('📡 Mediasoup Device:', {
  loaded: window.webrtcManager?.device?.loaded,
  rtpCapabilities: !!window.webrtcManager?.device?.rtpCapabilities
});

// 3. List all participants
console.log('👥 Participants:', window.participants);

// 4. Check socket events
window.webrtcManager?.socket?.emit('getRouterRtpCapabilities', { classId: window.classId }, (response) => {
  console.log('🎯 RTP Capabilities Response:', response);
});
```

## Expected Flow
1. Teacher produces video → Backend receives → Notifies students
2. Students consume teacher's video → Display in UI
3. Same for student → teacher communication