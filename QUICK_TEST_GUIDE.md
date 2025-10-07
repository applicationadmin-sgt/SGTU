# 🚀 QUICK START TESTING GUIDE

## Start Servers

### Backend:
```powershell
cd backend
npm start
```

### Frontend:
```powershell
cd frontend  
npm start
```

---

## Test Flow

### 1. Teacher Joins (Browser 1)
- Login as teacher
- Go to live class
- Click "Join Class"
- **VERIFY:** See your own video

### 2. Student Joins (Browser 2 - Incognito)
- Login as student
- Go to same live class
- Click "Join Class"
- **VERIFY:** See teacher's video immediately

### 3. Check Both Screens
- **Teacher screen:** Should show student video
- **Student screen:** Should show teacher video
- **Audio:** Both should hear each other
- **Controls:** Test mute/unmute on both

---

## Expected Console Logs

### Teacher Console (First):
```
✅ Successfully joined class
✅ Both transports created successfully
✅ Media started successfully
🎉 New producer from: [student name]
```

### Student Console (Second):
```
✅ Successfully joined class
🔍 Consuming existing producers from: [teacher name]
✅ Successfully consumed producer
```

---

## Success Checklist

- [ ] Teacher sees own video
- [ ] Teacher sees student video
- [ ] Student sees teacher video
- [ ] Both can hear each other
- [ ] No console errors
- [ ] Connection stays stable
- [ ] Mute buttons work
- [ ] Camera toggle works

---

## If Something Goes Wrong

### Check These:
1. **Backend running?** → Should show on port 5000
2. **Frontend running?** → Should show on port 3000
3. **HTTPS working?** → Check green padlock in browser
4. **Logged in?** → Check token in localStorage
5. **Permissions granted?** → Camera/mic popup approved?

### Common Errors & Fixes:

**"Cannot read property 'connect'"**
→ Refresh page, WebRTC manager not initialized

**"Socket connection failed"**
→ Check backend is running on https://192.168.7.20:5000

**"No video showing"**
→ Grant camera/microphone permissions in browser

**"No audio"**
→ Check browser audio isn't muted, check system volume

---

## Emergency Reset

If things are broken:
1. Stop both servers (Ctrl+C)
2. Clear browser cache
3. Restart backend
4. Restart frontend
5. Login again
6. Try joining class

---

## Connection State Debug

Paste this in console after joining:
```javascript
console.log({
  isConnected: webrtcManager.current?.isConnected,
  hasTransports: !!(webrtcManager.current?.sendTransport && webrtcManager.current?.recvTransport),
  producerCount: webrtcManager.current?.producers?.size,
  consumerCount: webrtcManager.current?.consumers?.size
});
```

**Should see:**
```javascript
{
  isConnected: true,
  hasTransports: true,
  producerCount: 2,  // audio + video
  consumerCount: 2+  // other participants
}
```

---

## Quick Test Script

Run all tests in order:

1. ✅ Backend starts without errors
2. ✅ Frontend compiles without errors  
3. ✅ Teacher can login
4. ✅ Teacher can join class
5. ✅ Teacher sees own video
6. ✅ Student can login
7. ✅ Student can join class
8. ✅ Student sees teacher video
9. ✅ Teacher sees student video
10. ✅ Audio works both ways

If all 10 pass → **FIX IS WORKING!** ✅

---

*Quick reference for testing the WebRTC streaming fix*
