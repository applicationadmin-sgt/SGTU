# 🔍 Live Class Streaming Debug Guide

## Current Status
- ✅ Backend running on `https://192.168.7.20:5000`
- ✅ Frontend running on `https://192.168.7.20:3000`
- ✅ Mediasoup initialized with 4 workers
- ✅ Redis connected for scaling
- ✅ Firewall rule created for UDP ports 10000-10100

## 🔧 How to Debug the Streaming Issue

### Step 1: Open Browser Developer Tools

**For Teacher:**
1. Open Chrome/Edge
2. Navigate to `https://192.168.7.20:3000`
3. Press `F12` to open Developer Tools
4. Go to **Console** tab
5. Login as teacher and join a live class

**Look for these messages:**
```javascript
✅ GOOD:
- "🔌 Socket connected"
- "✅ Successfully joined class"
- "📱 Device loaded with capabilities"
- "🚚 Both transports created successfully"
- "📡 Produced video track, id: xxx"

❌ BAD (indicates problem):
- "❌ Failed to load device"
- "❌ Failed to create transport"
- "❌ Error producing video track"
- "Transport connection timeout"
```

### Step 2: Check Network Tab

1. In Developer Tools, go to **Network** tab
2. Filter by `WS` (WebSocket)
3. Look for connection to `wss://192.168.7.20:5000`

**Expected:**
- Status: `101 Switching Protocols`
- Should stay connected (green dot)

**If Failed:**
- Status: `Failed` or `Cancelled`
- Connection drops repeatedly

### Step 3: Check Backend Console

In the terminal where backend is running, look for:

```
✅ GOOD:
- "👤 User xxx joining class xxx as teacher"
- "✅ User xxx joined class xxx successfully"
- "🚚 Creating send transport for class xxx"
- "✅ send transport created: xxx"
- "🎬 Producing video for user xxx"
- "✅ Producer created: xxx (video)"

❌ BAD:
- "❌ Join class error"
- "❌ Create transport error"
- "❌ Produce error"
```

## 🐛 Common Issues & Solutions

### Issue 1: "Cannot read property 'produce' of null"

**Symptom**: Frontend error when trying to produce media
**Cause**: Transport not created or not connected
**Solution**: 
```javascript
// Check if transport exists before producing
if (!this.sendTransport || this.sendTransport.connectionState !== 'connected') {
  console.error('❌ Send transport not ready');
  await this.createTransports();
}
```

### Issue 2: "Device not loaded"

**Symptom**: Cannot create transports
**Cause**: Router RTP capabilities not received
**Solution**:
1. Check backend is sending RTP capabilities
2. Verify `joinClass` response includes `rtpCapabilities`
3. Ensure device.load() is awaited

### Issue 3: "Transport connection timeout"

**Symptom**: Transport stuck in "connecting" state
**Cause**: ICE connection cannot establish
**Solution**:
1. Verify `MEDIASOUP_ANNOUNCED_IP` matches server IP
2. Check UDP ports 10000-10100 are open
3. Verify no VPN or complex NAT

### Issue 4: "No video stream visible"

**Symptom**: Everything connects but no video appears
**Cause**: Producer created but consumer not receiving
**Solution**:
1. Check backend sends `newProducer` event
2. Verify student creates consumer
3. Ensure `resumeConsumer` is called
4. Check video element has correct srcObject

## 🔬 Advanced Debugging

### Enable Mediasoup Debug Logging

**Backend** (`backend/services/MediasoupService.js`):
```javascript
// Change log level to 'debug'
worker: {
  logLevel: 'debug',  // Changed from 'warn'
  logTags: [
    'info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'
  ],
}
```

### Enable WebRTC Internal Stats

**Frontend Console:**
```javascript
// Run this in browser console
const pc = webrtcManager.current?.sendTransport?._handler?._pc;
if (pc) {
  setInterval(async () => {
    const stats = await pc.getStats();
    stats.forEach(stat => {
      if (stat.type === 'candidate-pair' && stat.state === 'succeeded') {
        console.log('✅ ICE connected:', stat);
      }
    });
  }, 5000);
}
```

### Check Mediasoup Worker Status

**Backend:**
```javascript
// Add to server.js or run in REPL
console.log('Workers:', global.mediasoupService.workers.map(w => ({
  pid: w.pid,
  died: w.closed,
  usage: w.resourceUsage
})));
```

## 📋 Step-by-Step Testing Procedure

### Test 1: Basic Connectivity
```bash
# From another computer on same network
ping 192.168.7.20
# Should get replies
```

### Test 2: WebSocket Connection
```javascript
// In browser console
const socket = io('https://192.168.7.20:5000', {
  auth: { token: localStorage.getItem('token') }
});
socket.on('connect', () => console.log('✅ Connected'));
socket.on('error', (err) => console.error('❌ Error:', err));
```

### Test 3: Join Class
```javascript
// In browser console (after WebSocket connected)
socket.emit('joinClass', {
  classId: 'YOUR_CLASS_ID',
  userId: 'YOUR_USER_ID',
  userRole: 'teacher',
  name: 'Test Teacher'
}, (response) => {
  console.log('Join response:', response);
});
```

### Test 4: Check RTP Capabilities
```javascript
// Should be in join response
console.log('RTP Capabilities:', response.rtpCapabilities);
// Should have mediaCodecs array
```

### Test 5: Create Transport
```javascript
// In browser console
socket.emit('createTransport', {
  classId: 'YOUR_CLASS_ID',
  direction: 'send'
}, (response) => {
  console.log('Transport:', response);
  // Should have id, iceParameters, dtlsParameters
});
```

## 🎯 Quick Diagnostic Script

**Run this in browser console when on live class page:**

```javascript
async function diagnoseStreaming() {
  console.log('🔍 Starting streaming diagnostics...');
  
  const manager = webrtcManager?.current;
  if (!manager) {
    console.error('❌ WebRTC Manager not initialized');
    return;
  }
  
  console.log('📊 WebRTC Manager State:', {
    isConnected: manager.isConnected,
    hasSocket: !!manager.socket,
    socketConnected: manager.socket?.connected,
    deviceLoaded: manager.device?.loaded,
    hasSendTransport: !!manager.sendTransport,
    hasRecvTransport: !!manager.recvTransport,
    sendTransportState: manager.sendTransport?.connectionState,
    recvTransportState: manager.recvTransport?.connectionState,
    localStream: !!manager.localStream,
    producersCount: manager.producers?.size || 0,
    consumersCount: manager.consumers?.size || 0
  });
  
  // Check local media
  if (manager.localStream) {
    console.log('🎥 Local Media:', {
      videoTracks: manager.localStream.getVideoTracks().length,
      audioTracks: manager.localStream.getAudioTracks().length,
      videoEnabled: manager.localStream.getVideoTracks()[0]?.enabled,
      audioEnabled: manager.localStream.getAudioTracks()[0]?.enabled
    });
  }
  
  // Check producers
  console.log('📡 Producers:', Array.from(manager.producers.entries()).map(([kind, p]) => ({
    kind,
    id: p.id,
    closed: p.closed,
    paused: p.paused
  })));
  
  console.log('✅ Diagnostics complete');
}

// Run it
diagnoseStreaming();
```

## 🔄 Reset Procedure

If streaming is completely broken:

1. **Stop both servers** (Ctrl+C)
2. **Clear browser cache**: Ctrl+Shift+Delete
3. **Restart backend**:
   ```bash
   cd C:\Users\Administrator\Desktop\test\Private\deployment-sgtlms\backend
   npm start
   ```
4. **Restart frontend**:
   ```bash
   cd C:\Users\Administrator\Desktop\test\Private\deployment-sgtlms\frontend
   npm start
   ```
5. **Hard refresh browser**: Ctrl+Shift+R
6. **Try again**

## 📞 Still Not Working?

If streaming still fails after all debugging:

1. **Check browser console for exact error message**
2. **Check backend console for exact error message**
3. **Copy both error messages** for further diagnosis
4. **Check if camera/microphone permissions are granted**
5. **Try in incognito mode** to rule out extensions
6. **Try different browser** (Chrome vs Edge)
7. **Check if WebRTC is blocked** by corporate firewall

## 🎓 Understanding the Flow

**Normal Flow:**
```
1. Teacher joins class
   ↓
2. Socket.IO connects to backend
   ↓
3. Emit 'joinClass' event
   ↓
4. Receive RTP capabilities
   ↓
5. Load mediasoup device
   ↓
6. Create send/recv transports
   ↓
7. Produce video/audio tracks
   ↓
8. Backend broadcasts 'newProducer'
   ↓
9. Students create consumers
   ↓
10. Students see teacher video ✅
```

**Where it usually breaks:**
- Step 3: Join fails (auth issue)
- Step 5: Device won't load (missing capabilities)
- Step 6: Transports timeout (network issue)
- Step 7: Produce fails (no local media)
- Step 9: Consume fails (consumer error)

## ✅ Success Indicators

You'll know streaming is working when you see:

**Teacher:**
- Local video preview visible
- Toast: "📹 Your video is now streaming to students!"
- Console: "✅ Teacher video stream started"
- No errors in console

**Student:**
- Teacher's video appears in participant grid
- Toast: "📹 Receiving Teacher's video stream"
- Console: "📺 Received remote stream"
- Video is playing (not frozen)

