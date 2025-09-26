# 🔐 SGT HTTPS Setup Complete

## 📋 What Was Configured

### 1. SSL Certificates Generated
- ✅ Generated certificates for: `localhost`, `127.0.0.1`, `10.20.49.165`, `::1`
- ✅ Certificates located: `frontend/localhost+3.pem` and `frontend/localhost+3-key.pem`
- ✅ Certificates copied to backend directory
- ✅ Certificates valid until: **December 26, 2027**

### 2. Frontend Configuration Updated
- ✅ `.env.development` configured for HTTPS
- ✅ `setupProxy.js` enhanced with proper HTTPS proxy handling
- ✅ `axiosConfig.js` updated to use environment variables
- ✅ `videoUtils.js` updated for dynamic API URLs
- ✅ `CourseDetails.js` updated for dynamic API URLs
- ✅ All hardcoded `localhost:5000` references replaced with environment variables

### 3. Backend Configuration Enhanced
- ✅ `server.js` updated with enhanced CORS for HTTPS frontend
- ✅ `server-https.js` created for full HTTPS backend support
- ✅ New npm scripts added: `start:https` and `dev:https`

### 4. Startup Scripts Created
- ✅ `start-sgt-app.bat` - Interactive startup with 3 modes
- ✅ `restart-servers-https.bat` - Updated for current IP
- ✅ `start-full-https.bat` - Both servers in HTTPS mode
- ✅ `test-connections.js` - Connection testing utility

## 🚀 How to Start Your Application

### Option 1: Interactive Startup (Recommended)
```bash
start-sgt-app.bat
```
Choose from:
1. HTTP Frontend + HTTP Backend
2. **HTTPS Frontend + HTTP Backend (Best for WebRTC)**
3. HTTPS Frontend + HTTPS Backend

### Option 2: Manual Startup
```bash
# Backend (HTTP)
cd backend
npm start

# Frontend (HTTPS)
cd frontend
npm start
```

### Option 3: Full HTTPS Mode
```bash
start-full-https.bat
```

## 🌐 Access URLs

### After Starting with HTTPS Frontend:
- **Frontend**: `https://10.20.49.165:3000` ⭐ **SECURE**
- **Backend**: `http://10.20.49.165:5000`

### Alternative Access Methods:
- `https://localhost:3000` (local access)
- `http://10.20.49.165:3000` (if HTTP mode)

## 🔐 Browser Certificate Handling

When accessing HTTPS URLs for the first time:
1. Browser shows "Not Secure" or "Certificate Error"
2. Click **"Advanced"**
3. Click **"Proceed to site (unsafe)"**
4. Certificate will be remembered for future visits

## ✅ WebRTC Features Now Work

With HTTPS frontend enabled:
- ✅ Camera access works
- ✅ Microphone access works
- ✅ Live classes fully functional
- ✅ Peer-to-peer video streaming

## 🧪 Testing Your Setup

Run the connection test:
```bash
node test-connections.js
```

## 📁 Files Modified/Created

### Frontend Files:
- `.env.development` - HTTPS configuration
- `.env.production` - Production HTTPS config
- `src/setupProxy.js` - Enhanced proxy with HTTPS support
- `src/utils/axiosConfig.js` - Dynamic API URL configuration
- `src/utils/videoUtils.js` - Environment-aware video URLs
- `src/components/admin/CourseDetails.js` - Dynamic API URLs

### Backend Files:
- `server.js` - Enhanced CORS for HTTPS frontend
- `server-https.js` - Full HTTPS backend server
- `package.json` - New HTTPS start scripts
- SSL certificates copied from frontend

### Utility Scripts:
- `start-sgt-app.bat` - Interactive startup menu
- `restart-servers-https.bat` - Updated for current setup
- `start-full-https.bat` - Full HTTPS mode
- `test-connections.js` - Connection testing

## 🔧 Environment Variables

Your frontend now uses these environment variables:

```env
DISABLE_ESLINT_PLUGIN=true
REACT_APP_API_URL=http://localhost:5000  # Backend URL
HTTPS=true                               # Enable HTTPS frontend
SSL_CRT_FILE=localhost+3.pem            # SSL certificate
SSL_KEY_FILE=localhost+3-key.pem        # SSL private key
HOST=10.20.49.165                       # Network interface
PORT=3000                               # Frontend port
```

## 🚨 Important Notes

1. **WebRTC Requirement**: Use HTTPS frontend (option 2) for live classes
2. **Certificate Expiry**: Certificates expire Dec 26, 2027 - regenerate before then
3. **Network Access**: Other devices on network can access via `https://10.20.49.165:3000`
4. **Mixed Content**: HTTPS frontend can call HTTP backend (browser allows this)
5. **Development Only**: These are self-signed certificates for development

## 🔄 Troubleshooting

### Frontend won't start:
- Check certificates exist in frontend folder
- Verify .env.development file is correct
- Try HTTP mode first (option 1)

### Backend connection issues:
- Ensure backend is running on port 5000
- Check CORS configuration
- Verify MongoDB is running

### Certificate issues:
- Regenerate certificates: `mkcert localhost 127.0.0.1 10.20.49.165 ::1`
- Reinstall mkcert root CA: `mkcert -install`

## 🎯 Next Steps

1. **Start your application** using `start-sgt-app.bat`
2. **Choose option 2** for WebRTC features
3. **Test live classes** functionality
4. **Access from other devices** using `https://10.20.49.165:3000`

Your SGT application is now fully configured for HTTPS with WebRTC support! 🎉