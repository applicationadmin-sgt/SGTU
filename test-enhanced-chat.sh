#!/bin/bash

# Enhanced Group Chat Testing Script
echo "🚀 Testing Enhanced Group Chat System..."

# Check if backend is running
echo "📡 Checking backend server..."
if curl -s http://localhost:5000/api/health > /dev/null; then
    echo "✅ Backend server is running"
else
    echo "❌ Backend server is not running. Please start it first."
    exit 1
fi

# Check if frontend is running
echo "🌐 Checking frontend server..."
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Frontend server is running"
else
    echo "❌ Frontend server is not running. Please start it first."
    exit 1
fi

# Test Socket.IO namespace
echo "🔌 Testing Socket.IO group-chat namespace..."
if curl -s http://localhost:5000/socket.io/?EIO=4&transport=polling&t=$(date +%s) > /dev/null; then
    echo "✅ Socket.IO is accessible"
else
    echo "⚠️ Socket.IO might not be properly configured"
fi

# Check required files
echo "📁 Checking required files..."

REQUIRED_FILES=(
    "backend/socket/groupChatSocket.js"
    "backend/models/GroupChat.js"
    "frontend/src/components/GroupChatPageEnhanced.js"
    "frontend/src/components/ChatSettings.js"
    "frontend/src/components/MessageReactions.js"
    "frontend/src/components/ChatNotification.js"
    "frontend/src/components/EnhancedGroupChatButton.js"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file is missing"
    fi
done

# Check npm packages
echo "📦 Checking required npm packages..."
cd backend
if npm list rate-limiter-flexible > /dev/null 2>&1; then
    echo "✅ rate-limiter-flexible is installed"
else
    echo "❌ rate-limiter-flexible is missing. Run: npm install rate-limiter-flexible"
fi

cd ../frontend
if npm list socket.io-client > /dev/null 2>&1; then
    echo "✅ socket.io-client is installed"
else
    echo "❌ socket.io-client is missing. Run: npm install socket.io-client"
fi

# Test database connection
echo "🗄️ Testing database connection..."
cd ../backend
if node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sgtlms')
  .then(() => { console.log('✅ Database connection successful'); process.exit(0); })
  .catch(err => { console.log('❌ Database connection failed:', err.message); process.exit(1); });
" 2>/dev/null; then
    echo "Database test completed"
else
    echo "⚠️ Database connection test failed"
fi

echo ""
echo "🎉 Enhanced Group Chat System Check Complete!"
echo ""
echo "📋 How to access:"
echo "   Enhanced Chat: http://localhost:3000/group-chat-enhanced/{courseId}/{sectionId}"
echo "   Original Chat: http://localhost:3000/group-chat/{courseId}/{sectionId}"
echo ""
echo "🔧 Features to test:"
echo "   ✓ Real-time messaging"
echo "   ✓ Typing indicators" 
echo "   ✓ Message reactions"
echo "   ✓ Reply to messages"
echo "   ✓ Search functionality"
echo "   ✓ Fullscreen mode"
echo "   ✓ Sound notifications"
echo "   ✓ Online users indicator"
echo "   ✓ Connection status"
echo "   ✓ Rate limiting"
echo ""
echo "🎵 Don't forget to add notification sounds to public/sounds/"