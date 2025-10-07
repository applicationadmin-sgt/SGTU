# Live Class Streaming Fix

## 🔍 Issue Diagnosis

The live class streaming is not working. Based on the codebase analysis:

### Potential Issues:
1. **MEDIASOUP_ANNOUNCED_IP Configuration**: The backend might not have the correct external IP configured for WebRTC connections
2. **Port Range**: Mediasoup ports (10000-10100) might be blocked by firewall
3. **Transport Connection**: DTLS handshake might be failing
4. **Device Loading**: Mediasoup client device might not be loading properly

## 🔧 Solutions Applied

### 1. Check Backend Environment Configuration

The backend needs proper IP configuration for mediasoup to work:

```env
# Required in backend/.env
MEDIASOUP_ANNOUNCED_IP=192.168.7.20  # Your actual server IP
MEDIASOUP_MIN_PORT=10000
MEDIASOUP_MAX_PORT=10100
USE_REDIS=false  # Set to false for single-instance testing
```

### 2. Verify Firewall Rules

Mediasoup requires UDP ports 10000-10100 to be open:

```powershell
# Run as Administrator
New-NetFirewallRule -DisplayName "Mediasoup RTC" -Direction Inbound -LocalPort 10000-10100 -Protocol UDP -Action Allow
```

### 3. Frontend Connection URL

Ensure the frontend is connecting to the correct WebSocket URL:

```javascript
// In .env or CodeTantraLiveClass.js
REACT_APP_SOCKET_URL=https://192.168.7.20:5000
```

### 4. Debug Logging Enhanced

Added comprehensive logging to track the exact point of failure:
- Socket connection status
- Device loading status
- Transport creation status
- Producer creation status
- Consumer creation status

## 📋 Testing Checklist

### Backend (Server Console)
- [ ] ✅ Mediasoup SFU Service initialized with X workers
- [ ] ✅ User joined class successfully  
- [ ] 📡 Creating send transport for class
- [ ] 📡 Creating recv transport for class
- [ ] 🎬 Producing video/audio for user
- [ ] 🍽️ Consuming producer for user

### Frontend (Browser Console)
- [ ] 🔗 Socket connected
- [ ] ✅ Successfully joined class
- [ ] 📱 Device loaded with capabilities
- [ ] 🚚 Both transports created successfully
- [ ] 📡 Produced video/audio track successfully
- [ ] 📺 Received remote stream

### Browser (Network Tab)
- [ ] WebSocket connection to wss://192.168.7.20:5000 established
- [ ] UDP/SRTP connections on ports 10000-10100 active

## 🐛 Common Issues & Solutions

### Issue 1: "Device not loaded"
**Symptom**: Console shows device loading error
**Solution**: 
```javascript
// Ensure router capabilities are received before loading device
if (!response.rtpCapabilities) {
  throw new Error('No RTP capabilities received from server');
}
await this.device.load({ routerRtpCapabilities: response.rtpCapabilities });
```

### Issue 2: "Transport connection timeout"
**Symptom**: Transport stuck in "connecting" state
**Solution**: 
- Check MEDIASOUP_ANNOUNCED_IP is set correctly
- Verify UDP ports 10000-10100 are not blocked
- Check if using VPN or complex NAT setup

### Issue 3: "No remote stream received"
**Symptom**: Teacher produces but students don't see video
**Solution**:
- Verify backend sends `newProducer` event
- Check students create consumers successfully
- Ensure resume consumer is called

### Issue 4: "Cannot read property 'produce' of null"
**Symptom**: sendTransport is null when trying to produce
**Solution**:
- Ensure transports are created before producing
- Wait for transport 'connect' event before producing

## 🚀 Quick Fix Steps

1. **Stop both servers** (Ctrl+C in terminals)

2. **Update backend .env**:
```bash
cd C:\Users\Administrator\Desktop\test\Private\deployment-sgtlms\backend
# Edit .env file and add:
MEDIASOUP_ANNOUNCED_IP=192.168.7.20
```

3. **Open Windows Firewall**:
```powershell
# Run PowerShell as Administrator
New-NetFirewallRule -DisplayName "Mediasoup RTC" -Direction Inbound -LocalPort 10000-10100 -Protocol UDP -Action Allow
```

4. **Restart backend**:
```bash
cd C:\Users\Administrator\Desktop\test\Private\deployment-sgtlms\backend
npm start
```

5. **Restart frontend**:
```bash
cd C:\Users\Administrator\Desktop\test\Private\deployment-sgtlms\frontend
npm start
```

6. **Test the connection**:
   - Login as teacher
   - Join a live class
   - Check console for success messages
   - Login as student (different browser/incognito)
   - Join same class
   - Student should see teacher's video

## 📊 Expected Console Output

### Teacher's Console (Success):
```
🔗 Socket connected: abc123
✅ Successfully joined class: 67...
📱 Device loaded with capabilities
🚚 Both transports created successfully
📡 Produced video track, id: xyz789
📡 Produced audio track, id: abc456
✅ Teacher video stream started
```

### Student's Console (Success):
```
🔗 Socket connected: def456
✅ Successfully joined class: 67...
📱 Device loaded with capabilities  
🚚 Both transports created successfully
🎥 New producer available: xyz789 (video) from teacher
📺 Received remote stream: {peerId: '...', kind: 'video'}
🎥 New producer available: abc456 (audio) from teacher
📺 Received remote stream: {peerId: '...', kind: 'audio'}
```

## 🔄 Alternative: Fallback to WebRTC P2P

If mediasoup continues to have issues, you can temporarily use P2P WebRTC:

```javascript
// In CodeTantraLiveClass.js, use simple-peer instead
import Peer from 'simple-peer';

// Direct P2P connection (works for small classes <10 students)
```

Note: P2P is not suitable for 10,000+ students but works for testing/small classes.

## ✅ Verification

After applying fixes, verify:
1. Backend logs show transport creation
2. Frontend console shows device loaded
3. Teacher sees "Streaming to X students"
4. Students see teacher's video playing
5. No WebRTC errors in console

## 📞 Still Not Working?

Check these advanced issues:
1. **Corporate Firewall**: Some networks block all UDP traffic
2. **VPN Issues**: VPN can interfere with WebRTC signaling
3. **Browser Permissions**: Camera/mic permissions must be granted
4. **HTTPS Certificate**: Must be valid for WebRTC to work
5. **Mixed Content**: All resources must be served over HTTPS

