# 🔐 WebRTC HTTPS Solution Guide

## Problem
Browser security policies block `navigator.mediaDevices.getUserMedia()` when accessing the app over:
- HTTP (instead of HTTPS)
- IP addresses (instead of localhost/domain names)

This prevents camera/microphone access in WebRTC applications.

## Solutions

### Solution 1: Enable HTTPS for Development (Recommended)

1. **Generate SSL Certificate:**
   ```bash
   cd frontend
   node generate-ssl.js
   ```

2. **Update .env file:**
   ```properties
   REACT_APP_API_URL=https://10.20.58.236:5000
   HTTPS=true
   SSL_CRT_FILE=ssl/server.crt
   SSL_KEY_FILE=ssl/server.key
   ```

3. **Update backend for HTTPS (optional):**
   - Backend can remain HTTP as only frontend needs HTTPS for WebRTC
   - API calls from HTTPS frontend to HTTP backend work fine

4. **Accept Certificate:**
   - Browser will show security warning for self-signed certificate
   - Click "Advanced" → "Proceed to site (unsafe)"
   - This only needs to be done once per browser

### Solution 2: Use Localhost for Development

1. **Access via localhost:**
   - Change .env to use localhost:
   ```properties
   REACT_APP_API_URL=http://localhost:5000
   ```
   
2. **Update backend to bind to localhost:**
   ```javascript
   // In backend/server.js
   app.listen(PORT, 'localhost', () => {
     console.log(`Server running on http://localhost:${PORT}`);
   });
   ```

3. **Access app at:** `http://localhost:3000`

### Solution 3: Browser Flags (Development Only)

For Chrome/Edge (temporary, resets on browser restart):
```bash
chrome.exe --user-data-dir=/tmp/chrome_dev_session --disable-web-security --unsafely-treat-insecure-origin-as-secure=http://10.20.58.236:3000
```

### Solution 4: Production Deployment

For production, use proper SSL certificates:
- Let's Encrypt for free SSL
- Cloudflare for SSL termination
- Deploy to platforms with automatic SSL (Vercel, Netlify, etc.)

## Implementation Status

✅ **Completed:**
- Added MediaDevices availability check with helpful error message
- Created SSL certificate generation script
- Updated .env with HTTPS configuration options
- WebRTC implementation with proper error handling

🔧 **Next Steps:**
1. Choose and implement one of the solutions above
2. Test camera/microphone access
3. Verify peer-to-peer video streaming works

## Testing WebRTC

After implementing HTTPS:
1. Open browser developer tools
2. Navigate to the live class page
3. Click "Toggle Camera" - should see video
4. Click "Toggle Microphone" - should see audio permissions
5. No more "MediaDevices API not available" errors

## Browser Security Context

Modern browsers require secure contexts for WebRTC:
- **Secure:** `https://`, `localhost`, `127.0.0.1`
- **Insecure:** `http://` with IP addresses like `10.20.58.236`

This is a security feature to prevent malicious websites from accessing cameras/microphones without user knowledge.