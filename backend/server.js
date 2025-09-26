const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const compression = require('compression');
const helmet = require('helmet');
const app = express();
require('dotenv').config();

// Enhanced CORS configuration for HTTPS frontend
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://localhost:3000',
    'http://10.20.49.165:3000',
    'https://10.20.49.165:3000',
    'http://127.0.0.1:3000',
    'https://127.0.0.1:3000'
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Security headers (lightweight defaults)
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// Gzip compression for JSON/text responses
app.use(compression());

app.use(express.json({ limit: '1mb' }));

// Serve static files from the public directory with cache headers
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '7d',
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      // Do not cache HTML to avoid stale shells
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Import routes
const adminRoutes = require('./routes/admin');
const authRoutes = require('./routes/auth');
const roleRoutes = require('./routes/role');
const notificationRoutes = require('./routes/notification');
const studentRoutes = require('./routes/student');
const teacherRoutes = require('./routes/teacher');
const hodRoutes = require('./routes/hod');
const deanRoutes = require('./routes/dean');
const hodAnnouncementHistoryRoutes = require('./routes/hodAnnouncementHistory');
// ...existing code...
const quizRoutes = require('./routes/quiz');
const quizPoolRoutes = require('./routes/quizPool');
const unitRoutes = require('./routes/unit');
// const readingMaterialRoutes = require('./routes/readingMaterial');
const teacherRequestRoutes = require('./routes/teacherRequest');
const studentQuizAttemptRoutes = require('./routes/studentQuizAttempt');
const unitQuizRoutes = require('./routes/unitQuiz');
const announcementRoutes = require('./routes/announcement');
const schoolRoutes = require('./routes/school');
const departmentRoutes = require('./routes/department');
const courseRoutes = require('./routes/course');
const sectionRoutes = require('./routes/section');
const hierarchyRoutes = require('./routes/hierarchy');
const quizSecurityRoutes = require('./routes/quizSecurity');
const secureQuizRoutes = require('./routes/secureQuiz');
const ccRoutes = require('./routes/cc');
const quizUnlockRoutes = require('./routes/quizUnlock');
const liveClassRoutes = require('./routes/liveClass');
const groupChatRoutes = require('./routes/groupChat');

app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api', roleRoutes);
app.use('/api/notifications', notificationRoutes);

// Remove verbose debug tracing in production to reduce overhead

app.use('/api/student', studentRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/hod', hodRoutes);
app.use('/api/dean', deanRoutes);
app.use('/api/hod/announcements', hodAnnouncementHistoryRoutes);
// ...existing code...
app.use('/api/quizzes', quizRoutes); // Quiz routes
app.use('/api/quiz-pools', quizPoolRoutes); // Quiz pool routes
app.use('/api/unit', unitRoutes); // Unit routes (mounted at /api/unit)
app.use('/api/units', unitRoutes); // Unit routes (also mounted at /api/units for backwards compatibility)
// app.use('/api/reading-materials', readingMaterialRoutes); // Reading material routes
app.use('/api/teacher-requests', teacherRequestRoutes);
app.use('/api/student', studentQuizAttemptRoutes); // Student quiz attempt routes (delete incomplete)
app.use('/api/student', unitQuizRoutes); // Unit quiz routes for students
app.use('/api/announcement', announcementRoutes); // Generic announcement route
app.use('/api/announcements', announcementRoutes); // New hierarchical announcement system (plural)
app.use('/api/schools', schoolRoutes); // School management routes
app.use('/api/departments', departmentRoutes); // Department management routes
app.use('/api/courses', courseRoutes); // Course management routes
app.use('/api/sections', sectionRoutes); // Section management routes
app.use('/api/hierarchy', hierarchyRoutes); // Hierarchy management routes
app.use('/api/quiz', quizSecurityRoutes); // Quiz security monitoring routes
app.use('/api/student/quiz', quizRoutes); // Student quiz routes
app.use('/api/student', secureQuizRoutes); // Secure quiz routes
app.use('/api/cc', ccRoutes); // Course Coordinator routes
app.use('/api/quiz-unlock', quizUnlockRoutes); // Quiz unlock system routes
app.use('/api/live-classes', liveClassRoutes); // Live class routes
app.use('/api/group-chat', groupChatRoutes); // Group chat routes
app.use('/api/video-unlock', require('./routes/videoUnlock')); // Video unlock system routes

// Connect to MongoDB using only the .env file configuration
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB Connected Successfully');
    
    // Run migrations after successful connection
    const generateTeacherIds = require('./migrations/generateTeacherIds');
    generateTeacherIds();
  })
  .catch(err => {
    console.error('MongoDB Connection Error:', err.message);
    console.log('Please check your MONGO_URI in .env file and ensure MongoDB is running');
    process.exit(1); // Exit with error code
  });

const db = mongoose.connection;
db.on('error', (err) => {
  console.error('MongoDB connection error:', err);
  console.log('Please check your MONGO_URI in .env file and ensure MongoDB is running');
});
db.once('open', () => {
  console.log('Connected to MongoDB');
});

app.get('/', (req, res) => {
  res.send('SGT Project Backend Running');
});

// Add a database status check endpoint for debugging
app.get('/api/db-status', (req, res) => {
  const status = {
    isConnected: mongoose.connection.readyState === 1,
    connectionState: mongoose.connection.readyState,
    stateDescription: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState]
  };
  res.json(status);
});


// Auto-create single admin if not exists
const User = require('./models/User');
const bcrypt = require('bcryptjs');

async function createAdmin() {
  try {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    const name = process.env.ADMIN_NAME || 'Admin';
    if (!email || !password) {
      console.warn('Admin credentials not set in .env');
      return;
    }
    let user = await User.findOne({ email, role: 'admin' });
    if (!user) {
      const hashed = await bcrypt.hash(password, 10);
      user = new User({
        name,
        email,
        password: hashed,
        role: 'admin',
        permissions: ['*'],
        isActive: true,
        emailVerified: true
      });
      await user.save();
      console.log('Admin created:', email);
    } else {
      console.log('Admin already exists:', email);
    }
  } catch (err) {
    console.error('Error creating admin:', err.message);
  }
}

// Error handling middleware for multer and file uploads
app.use((err, req, res, next) => {
  if (err.name === 'MulterError') {
    // Multer error handling
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        message: 'File too large. Maximum size is 100MB.' 
      });
    }
    return res.status(400).json({ message: err.message });
  } else if (err.message === 'Only video files are allowed') {
    return res.status(400).json({ message: err.message });
  }
  // For any other errors
  console.error('Server error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

// Initialize Socket.IO for live classes and group chat BEFORE starting the server
const http = require('http');
const https = require('https');
const fs = require('fs');

// Set PORT
const PORT = process.env.PORT || 5000;

// Always use HTTPS for better WebRTC and live class compatibility
let server;
try {
  // SSL certificate options
  const sslOptions = {
    key: fs.readFileSync(path.join(__dirname, 'localhost+3-key.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'localhost+3.pem'))
  };
  
  // Create HTTPS server
  server = https.createServer(sslOptions, app);
  console.log('🔐 HTTPS server created with SSL certificates');
} catch (error) {
  console.error('❌ SSL certificate error:', error.message);
  console.error('Please ensure localhost+3.pem and localhost+3-key.pem files exist in the backend directory');
  process.exit(1);
}

// Create a single Socket.IO instance for both live classes and group chat
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "http://10.242.31.20:3000", 
      "https://10.242.31.20:3000",
      "https://localhost:3000"
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Initialize Live Class Socket (using shared Socket.IO instance)
const initializeLiveClassSocket = require('./socket/liveClassSocket');
initializeLiveClassSocket(server, io); // Pass the io instance
console.log('✅ Live Class Socket.IO server initialized (HTTPS)');

// Initialize Group Chat Socket (using shared Socket.IO instance)
const initializeGroupChatSocket = require('./socket/groupChatSocket');
initializeGroupChatSocket(io);
console.log('✅ Group Chat Socket.IO server initialized');
server.listen(PORT, '0.0.0.0', async () => {
  await createAdmin();
  // Run migrations
  const generateTeacherIds = require('./migrations/generateTeacherIds');
  await generateTeacherIds();
  
  console.log(`🔐 HTTPS Server running on port ${PORT}`);
  console.log(`   Access via: https://10.242.31.20:${PORT}`);
  console.log(`   Access via: https://localhost:${PORT}`);
});
