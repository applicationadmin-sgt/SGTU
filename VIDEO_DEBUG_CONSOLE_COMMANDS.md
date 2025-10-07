# Video Streaming Debug Instructions

## Run these commands in BOTH teacher and student browser consoles:

### 1. Check WebRTC Manager Status
```javascript
console.log('🔍 WebRTC Status:', {
  webrtcManager: !!window.webrtcManager,
  socket: !!window.webrtcManager?.socket?.connected,
  device: !!window.webrtcManager?.device?.loaded,
  sendTransport: !!window.webrtcManager?.sendTransport,
  recvTransport: !!window.webrtcManager?.recvTransport,
  producers: Array.from(window.webrtcManager?.producers?.entries() || []),
  consumers: Array.from(window.webrtcManager?.consumers?.entries() || []),
  producerToPeer: Array.from(window.webrtcManager?.producerToPeer?.entries() || [])
});
```

### 2. Check Current Participants
```javascript
console.log('👥 Participants:', window.participants?.map(p => ({
  id: p.id,
  name: p.name,
  role: p.role,
  hasStream: !!p.stream,
  hasVideo: p.hasVideo,
  hasAudio: p.hasAudio
})));
```

### 3. Manually Request Router Capabilities
```javascript
window.webrtcManager?.socket?.emit('getRouterRtpCapabilities', { classId: window.classId }, (response) => {
  console.log('📡 Manual RTP Request:', response);
});
```

### 4. Check for New Producers (Run in Student Console)
```javascript
// This should show when teacher produces video
window.webrtcManager?.socket?.on('newProducer', (data) => {
  console.log('🎥 NEW PRODUCER EVENT:', data);
});
```

### 5. Force Consume All Available Producers (Run in Student Console)
```javascript
// Manually trigger consumption
window.webrtcManager?.socket?.emit('getExistingProducers', { classId: window.classId }, async (response) => {
  console.log('🎯 Existing Producers:', response);
  if (response.existingProducers) {
    for (const producer of response.existingProducers) {
      console.log('🔥 Attempting to consume:', producer);
      try {
        await window.webrtcManager.consume(producer.producerId);
        console.log('✅ Successfully consumed:', producer.producerId);
      } catch (error) {
        console.error('❌ Failed to consume:', producer.producerId, error);
      }
    }
  }
});
```

### 6. Check Teacher Producer Status (Run in Teacher Console)
```javascript
// Check if teacher is actually producing
if (window.webrtcManager?.sendTransport) {
  const videoTrack = window.webrtcManager.localStream?.getVideoTracks()[0];
  const audioTrack = window.webrtcManager.localStream?.getAudioTracks()[0];
  
  console.log('🎥 Teacher Media Status:', {
    hasVideoTrack: !!videoTrack,
    videoEnabled: videoTrack?.enabled,
    hasAudioTrack: !!audioTrack,
    audioEnabled: audioTrack?.enabled,
    videoProducer: window.webrtcManager.producers.get('video')?.id,
    audioProducer: window.webrtcManager.producers.get('audio')?.id
  });
  
  // Try to manually produce if not producing
  if (videoTrack && videoTrack.enabled && !window.webrtcManager.producers.get('video')) {
    console.log('🔨 Manually producing video...');
    window.webrtcManager.produceTrack('video', videoTrack)
      .then(producer => console.log('✅ Video producer created:', producer.id))
      .catch(error => console.error('❌ Video production failed:', error));
  }
}
```

## Expected Results:
- **Teacher**: Should have producers in the producers Map
- **Student**: Should have consumers in the consumers Map  
- **Both**: Should see each other in participants with hasStream: true