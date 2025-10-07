/**
 * Mediasoup Configuration for Production Deployment
 * Optimized for handling 10,000+ concurrent users
 */

const os = require('os');

module.exports = {
  mediasoup: {
    // Number of workers (typically CPU cores * 2)
    numWorkers: process.env.MEDIASOUP_WORKERS || Math.min(os.cpus().length, 8),
    
    worker: {
      rtcMinPort: Number(process.env.MEDIASOUP_MIN_PORT) || 10000,
      rtcMaxPort: Number(process.env.MEDIASOUP_MAX_PORT) || 10100,
      logLevel: process.env.MEDIASOUP_LOG_LEVEL || 'warn',
      logTags: [
        'info',
        'ice',
        'dtls',
        'rtp',
        'srtp',
        'rtcp',
        'rtx',
        'bwe',
        'score',
        'simulcast',
        'svc'
      ],
    },
    
    router: {
      mediaCodecs: [
        {
          kind: 'audio',
          mimeType: 'audio/opus',
          clockRate: 48000,
          channels: 2,
        },
        {
          kind: 'video',
          mimeType: 'video/VP8',
          clockRate: 90000,
          parameters: {
            'x-google-start-bitrate': 1000,
          },
        },
        {
          kind: 'video',
          mimeType: 'video/VP9',
          clockRate: 90000,
          parameters: {
            'profile-id': 2,
            'x-google-start-bitrate': 1000,
          },
        },
        {
          kind: 'video',
          mimeType: 'video/h264',
          clockRate: 90000,
          parameters: {
            'packetization-mode': 1,
            'profile-level-id': '4d0032',
            'level-asymmetry-allowed': 1,
            'x-google-start-bitrate': 1000,
          },
        },
        {
          kind: 'video',
          mimeType: 'video/H264',
          clockRate: 90000,
          parameters: {
            'packetization-mode': 1,
            'profile-level-id': '42e01f',
            'level-asymmetry-allowed': 1,
            'x-google-start-bitrate': 1000,
          },
        },
      ],
    },
    
    // WebRTC transport settings
    webRtcTransport: {
      listenIps: [
        {
          ip: process.env.MEDIASOUP_LISTEN_IP || '0.0.0.0',
          announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP,
        },
      ],
      maxIncomingBitrate: 1500000,
      initialAvailableOutgoingBitrate: 1000000,
      minimumAvailableOutgoingBitrate: 600000,
      maxSctpMessageSize: 262144,
    },
  },
  
  // Redis configuration for scaling Socket.IO
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD,
    db: Number(process.env.REDIS_DB) || 0,
    keyPrefix: 'lms:',
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
  },
  
  // Database configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    name: process.env.DB_NAME || 'lms_scalable',
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    dialect: 'postgres',
    pool: {
      min: 0,
      max: 20,
      acquire: 30000,
      idle: 10000,
    },
  },
  
  // Server configuration
  server: {
    port: Number(process.env.PORT) || 3001,
    cors: {
      origin: process.env.CORS_ORIGIN ? 
        process.env.CORS_ORIGIN.split(',') : 
        ['http://localhost:3000', 'https://localhost:3000'],
      credentials: true,
    },
  },
  
  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  
  // AWS/S3 configuration for recordings
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1',
    s3: {
      bucket: process.env.S3_BUCKET || 'lms-recordings',
      prefix: 'recordings/',
    },
  },
  
  // Recording configuration
  recording: {
    enabled: process.env.RECORDING_ENABLED === 'true',
    storage: process.env.RECORDING_STORAGE || 'local', // 'local' | 's3' | 'gcp'
    localPath: process.env.RECORDING_LOCAL_PATH || './recordings',
    formats: ['webm', 'mp4'],
    maxDuration: Number(process.env.MAX_RECORDING_DURATION) || 3600000, // 1 hour
  },
  
  // Rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    message: 'Too many requests from this IP',
  },
  
  // Scalability settings
  scalability: {
    maxStudentsPerClass: Number(process.env.MAX_STUDENTS_PER_CLASS) || 10000,
    maxTeachersPerClass: Number(process.env.MAX_TEACHERS_PER_CLASS) || 10,
    maxConcurrentClasses: Number(process.env.MAX_CONCURRENT_CLASSES) || 100,
    studentVideoEnabled: process.env.STUDENT_VIDEO_ENABLED === 'true',
    studentAudioEnabled: process.env.STUDENT_AUDIO_ENABLED === 'true',
    autoOptimizeQuality: process.env.AUTO_OPTIMIZE_QUALITY !== 'false',
  },
  
  // Monitoring and logging
  monitoring: {
    enabled: process.env.MONITORING_ENABLED === 'true',
    statsInterval: Number(process.env.STATS_INTERVAL) || 10000, // 10 seconds
    healthCheckPort: Number(process.env.HEALTH_CHECK_PORT) || 8080,
  },
  
  // TURN/STUN servers for NAT traversal
  webrtc: {
    iceServers: [
      { 
        urls: 'stun:stun.l.google.com:19302' 
      },
      {
        urls: process.env.TURN_URLS ? 
          process.env.TURN_URLS.split(',') : 
          ['turn:your-turn-server.com:3478'],
        username: process.env.TURN_USERNAME || 'turnuser',
        credential: process.env.TURN_PASSWORD || 'turnpass',
      },
    ],
  },
};