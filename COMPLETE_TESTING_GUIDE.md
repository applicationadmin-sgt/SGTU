# 🎯 FINAL TESTING GUIDE - STREAMING SYSTEM

## ✅ **SERVERS ARE RUNNING**

### Backend Status:
```
✅ Running on https://192.168.7.20:5000
✅ MongoDB Connected
✅ Mediasoup initialized with 4 workers
✅ Socket.IO ready
```

### Frontend Status:
```
⏳ Compiling... (Wait for "Compiled successfully!")
🌐 Will run on https://192.168.7.20:3000
```

---

## 🧪 **STEP-BY-STEP TESTING**

### Step 1: Wait for "Compiled successfully!" message

In your frontend terminal, wait until you see:
```
Compiled successfully!
You can now view sgt-frontend in the browser.
https://192.168.7.20:3000
```

### Step 2: Open Teacher Browser

1. Open browser: `https://192.168.7.20:3000`
2. **Press F12** to open Developer Console (IMPORTANT!)
3. Login with teacher credentials
4. Navigate to: **Live Classes**
5. Select a class and click **"Join Class"** or **"Start Class"**
6. When browser asks for permissions, click **"Allow"** for camera and microphone

### Step 3: Watch Console Logs (Teacher)

You MUST see these logs in order:
```
🔗 Connecting to scalable live class: [classId]
🔌 Socket connected
📤 Joining class: {classId, userId, userRole: "teacher", userName}
✅ Successfully joined class: {success: true, rtpCapabilities: {...}}
📱 Device loaded with capabilities
🚚 Creating WebRTC transports...
📤 Creating send transport...
📤 Send transport data received: [transportId]
✅ Send transport created successfully
📥 Creating receive transport...
📥 Receive transport data received: [transportId]
✅ Receive transport created successfully
✅ Both transports created successfully
🎥 Starting media for teacher...
✅ Local media obtained
📡 Producing tracks for teacher...
📤 Connecting send transport...
✅ Send transport connected
📤 Producing audio track...
✅ Producer created: [producerId]
📤 Producing video track...
✅ Producer created: [producerId]
📡 Produced audio track, id: [producerId]
📡 Produced video track, id: [producerId]
✅ All tracks produced for teacher
✅ Media started successfully
✅ Connected to scalable live class successfully
```

### Step 4: Verify Teacher Side

- [ ] ✅ You see YOUR OWN video in the local preview
- [ ] ✅ Camera icon shows "on" (not crossed out)
- [ ] ✅ Microphone icon shows "on" (not crossed out)
- [ ] ✅ NO RED ERRORS in console
- [ ] ✅ Class status shows "Connected" or "Live"

**If ANY of these fail, STOP and share the console errors!**

### Step 5: Open Student Browser

1. Open **NEW browser window** (or incognito: Ctrl+Shift+N)
2. **Press F12** to open console
3. Go to: `https://192.168.7.20:3000`
4. Login with **DIFFERENT student credentials**
5. Navigate to the **SAME live class**
6. Click **"Join Class"**
7. Click **"Allow"** for camera/microphone permissions

### Step 6: Watch Console Logs (Student)

You MUST see:
```
🔗 Connecting to scalable live class: [classId]
🔌 Socket connected
📤 Joining class: {classId, userId, userRole: "student", userName}
✅ Successfully joined class: {success: true, existingProducers: [2 items]}
📱 Device loaded with capabilities
🚚 Creating WebRTC transports...
✅ Both transports created successfully
🎥 Starting media for student...
✅ Local media obtained
📡 Producing tracks for student...
✅ All tracks produced for student
✅ Media started successfully
🔍 Consuming 2 existing producers
🗺️ Mapped producer [audioProducerId] to peer [teacherId]
📥 Connecting receive transport...
✅ Receive transport connected
📺 Started consuming audio from producer [producerId]
🎥 Calling onRemoteStream for peer [teacherId] (audio)
✅ Consumed producer [producerId] from peer [teacherId]
🗺️ Mapped producer [videoProducerId] to peer [teacherId]
📺 Started consuming video from producer [producerId]
🎥 Calling onRemoteStream for peer [teacherId] (video)
✅ Consumed producer [producerId] from peer [teacherId]
```

### Step 7: Verify Student Side

- [ ] ✅ Student sees TEACHER'S video (not just their own)
- [ ] ✅ Student can HEAR teacher's audio
- [ ] ✅ Student sees their OWN video in small preview
- [ ] ✅ NO RED ERRORS in console

### Step 8: Check Teacher Console Again

Teacher's console should NOW show:
```
🎉 New audio producer available: {producerId: [...], peerId: [studentId], kind: 'audio'}
🗺️ Mapped producer [...] to peer [studentId]
🍽️ Auto-consuming audio producer [...] from peer [studentId]
📺 Started consuming audio from producer [...]
🎥 Calling onRemoteStream for peer [studentId] (audio)

🎉 New video producer available: {producerId: [...], peerId: [studentId], kind: 'video'}
🗺️ Mapped producer [...] to peer [studentId]
🍽️ Auto-consuming video producer [...] from peer [studentId]
📺 Started consuming video from producer [...]
🎥 Calling onRemoteStream for peer [studentId] (video)
```

### Step 9: Final Verification

#### On Teacher Screen:
- [ ] ✅ Own video visible
- [ ] ✅ **STUDENT'S VIDEO VISIBLE** in participant grid
- [ ] ✅ Student's name shows below their video
- [ ] ✅ Can hear student when they speak
- [ ] ✅ Audio indicator animates when student speaks

#### On Student Screen:
- [ ] ✅ Own video visible
- [ ] ✅ **TEACHER'S VIDEO VISIBLE** (larger, in main area)
- [ ] ✅ Teacher's name shows
- [ ] ✅ Can hear teacher when they speak
- [ ] ✅ Audio indicator animates when teacher speaks

#### Test Controls:
- [ ] ✅ Teacher clicks mute → Audio stops for student
- [ ] ✅ Student clicks mute → Audio stops for teacher
- [ ] ✅ Teacher clicks camera off → Video stops for student
- [ ] ✅ Student clicks camera off → Video stops for teacher

---

## ❌ **IF IT'S NOT WORKING**

### Check #1: Console Errors

**Look for these specific errors:**

1. **"Device not loaded"** → Device.load() failed
2. **"Failed to create transport"** → Backend transport creation failed
3. **"Producer creation failed"** → Can't send media
4. **"Not ready to consume"** → Can't receive media
5. **"Transport connection failed"** → DTLS connection failed

### Check #2: Backend Logs

In backend terminal, you should see:
```
👤 User [userId] ([userName]) joining class [classId] as teacher
📡 Router exists for class [classId]
✅ User [userId] joined class [classId] successfully
📡 Producing audio for user [userId]
✅ Producer created: [producerId]
📢 Broadcasting newProducer to [X] users in class [classId]
```

### Check #3: Network Issues

1. Check firewall isn't blocking ports 5000/3000
2. Check HTTPS certificates are trusted
3. Try in different browser
4. Check camera/mic aren't used by another app

### Check #4: Permissions

1. Click lock icon in address bar
2. Ensure camera and microphone are set to "Allow"
3. Reload page after changing permissions

---

## 📸 **WHAT SUCCESS LOOKS LIKE**

### Teacher View:
```
┌─────────────────────────────────────────┐
│  Local Preview (You)                     │
│  ┌───────────────────────────────────┐  │
│  │   [Teacher's Face]                │  │
│  └───────────────────────────────────┘  │
│  🎤 ━━━━━━━━ 📹 ━━━━━━━━              │
│                                          │
│  Participants:                           │
│  ┌───────────┐  ┌───────────┐          │
│  │ Student 1 │  │ Student 2 │          │
│  │  [Face]   │  │  [Face]   │          │
│  └───────────┘  └───────────┘          │
└─────────────────────────────────────────┘
```

### Student View:
```
┌─────────────────────────────────────────┐
│  Teacher's Video (Main)                  │
│  ┌───────────────────────────────────┐  │
│  │                                    │  │
│  │      [Teacher's Face - BIG]       │  │
│  │                                    │  │
│  └───────────────────────────────────┘  │
│                                          │
│  Your Video:    Other Students:         │
│  ┌────────┐    ┌────────┐              │
│  │  You   │    │Student2│              │
│  └────────┘    └────────┘              │
└─────────────────────────────────────────┘
```

---

## 🆘 **EMERGENCY DEBUGGING**

### Command 1: Check Connection State
In browser console, type:
```javascript
window.debugVideoStreaming.checkStatus()
```

**Expected output:**
```javascript
{
  webrtcManager: true,
  socket: true,
  device: true,
  sendTransport: true,
  recvTransport: true,
  producers: [["audio", Producer], ["video", Producer]],
  consumers: [[producerId, Consumer], ...],
  producerToPeer: [[producerId, peerId], ...]
}
```

### Command 2: Manual Consume
```javascript
window.debugVideoStreaming.forceConsumeExisting()
```

### Command 3: Check Participants
```javascript
console.log('Participants:', window.participants)
```

---

## 📝 **SHARE THIS IF IT FAILS**

If streaming doesn't work, share:

1. **Teacher Console** (all text, especially red errors)
2. **Student Console** (all text, especially red errors)
3. **Backend Terminal** (last 50 lines)
4. **What you see** (do you see ANY videos? Which ones?)
5. **Which step failed** (at what point did it stop working?)

---

## ✅ **SUCCESS!**

If you see teacher and student videos on both screens + can hear each other:

🎉 **CONGRATULATIONS!** 🎉

You now have a fully working:
- ✅ Bidirectional video streaming system
- ✅ Bidirectional audio communication
- ✅ Multi-participant live classroom
- ✅ Scalable SFU architecture with mediasoup
- ✅ Production-ready online classroom

**The system is working correctly!**

---

*Complete testing guide - October 7, 2025*
*All code fixes applied and ready for testing*
