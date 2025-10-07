/**
 * Enhanced Live Class Routes for Scalable System
 * Integrates with Mediasoup SFU and Redis clustering
 */

const express = require('express');
const router = express.Router();
const { auth, authorizeRoles } = require('../middleware/auth');

// Enhanced join class endpoint for scalable system
router.post('/scalable/:classId/join', auth, async (req, res) => {
  try {
    const { classId } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    console.log(`🎯 Scalable join request: User ${userId} joining class ${classId} as ${userRole}`);

    // Validate class exists and is live
    const LiveClass = require('../models/LiveClass');
    const liveClass = await LiveClass.findById(classId);

    if (!liveClass) {
      return res.status(404).json({
        success: false,
        message: 'Live class not found'
      });
    }

    if (liveClass.status !== 'live') {
      return res.status(400).json({
        success: false,
        message: 'Class is not currently live'
      });
    }

    // Check if Mediasoup service is available
    if (!global.mediasoupService) {
      return res.status(503).json({
        success: false,
        message: 'Scalable service not available'
      });
    }

    // Create or get router for the class
    const router = await global.mediasoupService.getOrCreateRouter(classId);
    
    // Add participant to Mediasoup
    global.mediasoupService.addParticipant(classId, userId.toString(), {
      name: req.user.name,
      role: userRole,
    });

    // Get existing producers for this class
    const existingProducers = global.mediasoupService.getExistingProducers(classId);

    // Add to live class participants
    await liveClass.addParticipant(userId);

    res.json({
      success: true,
      message: 'Successfully joined scalable live class',
      data: {
        classId: liveClass._id,
        title: liveClass.title,
        roomId: liveClass.roomId,
        rtpCapabilities: router.rtpCapabilities,
        existingProducers,
        userRole,
        permissions: {
          canSpeak: userRole === 'teacher' || liveClass.allowStudentMic,
          canVideo: userRole === 'teacher' || liveClass.allowStudentCamera,
          canChat: liveClass.allowChat,
          canScreenShare: userRole === 'teacher',
          canRecord: userRole === 'teacher',
        },
        scalabilityMode: true,
        currentParticipants: liveClass.currentParticipants + 1
      }
    });

    console.log(`✅ User ${userId} successfully joined scalable class ${classId}`);

  } catch (error) {
    console.error('❌ Scalable join error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to join scalable class',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Create transport endpoint
router.post('/scalable/:classId/createTransport', auth, async (req, res) => {
  try {
    const { classId } = req.params;
    const { direction } = req.body;

    if (!global.mediasoupService) {
      return res.status(503).json({
        success: false,
        message: 'Mediasoup service not available'
      });
    }

    const transport = await global.mediasoupService.createWebRtcTransport(classId, direction);

    res.json({
      success: true,
      transport
    });

  } catch (error) {
    console.error('❌ Create transport error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create transport',
      error: error.message
    });
  }
});

// Connect transport endpoint
router.post('/scalable/transport/:transportId/connect', auth, async (req, res) => {
  try {
    const { transportId } = req.params;
    const { dtlsParameters } = req.body;

    if (!global.mediasoupService) {
      return res.status(503).json({
        success: false,
        message: 'Mediasoup service not available'
      });
    }

    await global.mediasoupService.connectWebRtcTransport(transportId, dtlsParameters);

    res.json({
      success: true,
      message: 'Transport connected successfully'
    });

  } catch (error) {
    console.error('❌ Connect transport error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to connect transport',
      error: error.message
    });
  }
});

// Produce media endpoint
router.post('/scalable/transport/:transportId/produce', auth, async (req, res) => {
  try {
    const { transportId } = req.params;
    const { kind, rtpParameters, classId } = req.body;
    const userId = req.user._id.toString();

    if (!global.mediasoupService) {
      return res.status(503).json({
        success: false,
        message: 'Mediasoup service not available'
      });
    }

    const producerId = await global.mediasoupService.createProducer(
      transportId,
      rtpParameters,
      kind,
      userId,
      classId
    );

    res.json({
      success: true,
      producerId
    });

  } catch (error) {
    console.error('❌ Produce error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to produce media',
      error: error.message
    });
  }
});

// Consume media endpoint
router.post('/scalable/transport/:transportId/consume', auth, async (req, res) => {
  try {
    const { transportId } = req.params;
    const { producerId, rtpCapabilities } = req.body;
    const userId = req.user._id.toString();

    if (!global.mediasoupService) {
      return res.status(503).json({
        success: false,
        message: 'Mediasoup service not available'
      });
    }

    const consumer = await global.mediasoupService.createConsumer(
      transportId,
      producerId,
      rtpCapabilities,
      userId
    );

    res.json({
      success: true,
      consumer
    });

  } catch (error) {
    console.error('❌ Consume error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to consume media',
      error: error.message
    });
  }
});

// Resume consumer endpoint
router.post('/scalable/consumer/:consumerId/resume', auth, async (req, res) => {
  try {
    const { consumerId } = req.params;

    if (!global.mediasoupService) {
      return res.status(503).json({
        success: false,
        message: 'Mediasoup service not available'
      });
    }

    await global.mediasoupService.resumeConsumer(consumerId);

    res.json({
      success: true,
      message: 'Consumer resumed successfully'
    });

  } catch (error) {
    console.error('❌ Resume consumer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resume consumer',
      error: error.message
    });
  }
});

// Pause consumer endpoint
router.post('/scalable/consumer/:consumerId/pause', auth, async (req, res) => {
  try {
    const { consumerId } = req.params;

    if (!global.mediasoupService) {
      return res.status(503).json({
        success: false,
        message: 'Mediasoup service not available'
      });
    }

    await global.mediasoupService.pauseConsumer(consumerId);

    res.json({
      success: true,
      message: 'Consumer paused successfully'
    });

  } catch (error) {
    console.error('❌ Pause consumer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to pause consumer',
      error: error.message
    });
  }
});

// Get class statistics
router.get('/scalable/:classId/stats', auth, authorizeRoles('teacher', 'admin'), async (req, res) => {
  try {
    const { classId } = req.params;

    const stats = {
      timestamp: Date.now(),
      classId,
    };

    if (global.mediasoupService) {
      const mediasoupStats = global.mediasoupService.getStats();
      stats.mediasoup = mediasoupStats;

      // Get class-specific data
      const classData = global.mediasoupService.classes.get(classId);
      if (classData) {
        stats.classParticipants = classData.participants.size;
        stats.lastActivity = classData.lastActivity;
      }
    }

    if (global.scalableSocketService) {
      const socketStats = global.scalableSocketService.getStats();
      stats.socket = socketStats;
    }

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('❌ Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get statistics',
      error: error.message
    });
  }
});

// Close class and cleanup
router.post('/scalable/:classId/close', auth, authorizeRoles('teacher'), async (req, res) => {
  try {
    const { classId } = req.params;
    const teacherId = req.user._id;

    // Verify teacher owns the class
    const LiveClass = require('../models/LiveClass');
    const liveClass = await LiveClass.findById(classId);

    if (!liveClass || liveClass.teacher.toString() !== teacherId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to close this class'
      });
    }

    // Close class in Mediasoup
    if (global.mediasoupService) {
      await global.mediasoupService.closeClass(classId);
    }

    // Update class status
    liveClass.status = 'completed';
    liveClass.actualEndTime = new Date();
    liveClass.currentParticipants = 0;
    await liveClass.save();

    // Notify participants via Socket.IO
    if (global.scalableSocketService) {
      global.scalableSocketService.broadcastToClass(classId, 'classEnded', {
        message: 'Class has ended',
        timestamp: Date.now(),
      });
    }

    res.json({
      success: true,
      message: 'Class closed and resources cleaned up'
    });

    console.log(`🔐 Scalable class ${classId} closed by teacher ${teacherId}`);

  } catch (error) {
    console.error('❌ Close class error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to close class',
      error: error.message
    });
  }
});

module.exports = router;