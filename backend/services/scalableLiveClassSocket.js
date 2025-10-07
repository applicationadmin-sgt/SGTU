/**
 * Scalable Live Class Socket Handler
 * Handles Socket.IO events for mediasoup-based live classes
 */

const setupScalableLiveClassSocket = (io, mediasoupService) => {
  console.log('🔌 Setting up scalable live class socket handlers');

  io.on('connection', (socket) => {
    console.log(`🔗 Socket connected: ${socket.id}`);

    // Join class handler
    socket.on('joinClass', async (data, callback) => {
      try {
        const { classId, userId, userRole, name } = data;
        console.log(`👤 User ${userId} (${name}) joining class ${classId} as ${userRole}`);

        // Clean up any existing connections/producers for this user to prevent conflicts
        if (mediasoupService) {
          try {
            const existingProducers = Array.from(mediasoupService.producers.values())
              .filter(p => p.userId === userId && p.classId === classId);
            
            for (const producerData of existingProducers) {
              console.log(`🧹 Cleaning up existing producer ${producerData.producer.id} for user ${userId}`);
              try {
                producerData.producer.close();
                mediasoupService.producers.delete(producerData.producer.id);
              } catch (cleanupError) {
                console.warn(`⚠️ Error cleaning up producer:`, cleanupError.message);
              }
            }
          } catch (cleanupError) {
            console.warn(`⚠️ Error during user cleanup:`, cleanupError.message);
          }
        }

        // Join socket room
        socket.join(classId);
        socket.classId = classId;
        socket.userId = userId;
        socket.userRole = userRole;
        socket.userName = name;

        // Get or create router FIRST (this creates the class entry)
        const router = await mediasoupService.getOrCreateRouter(classId);
        
        // Add participant to mediasoup AFTER router is created
        if (mediasoupService) {
          mediasoupService.addParticipant(classId, userId, {
            name,
            role: userRole,
            socketId: socket.id
          });
        }

        // Get existing producers
        const existingProducers = mediasoupService.getExistingProducers(classId);

        // Send join response
        if (callback) {
          callback({
            success: true,
            rtpCapabilities: router.rtpCapabilities,
            existingProducers
          });
        }

        // Notify others
        socket.to(classId).emit('userJoined', {
          userId: String(userId),
          userName: name,
          userRole,
          socketId: socket.id
        });

        console.log(`✅ User ${userId} joined class ${classId} successfully`);
      } catch (error) {
        console.error('❌ Join class error:', error);
        if (callback) {
          callback({ success: false, error: error.message });
        }
      }
    });

    // Get router RTP capabilities
    socket.on('getRouterRtpCapabilities', async (data, callback) => {
      try {
        const { classId } = data;
        console.log(`📡 Getting RTP capabilities for class ${classId}`);

        if (!mediasoupService) {
          throw new Error('Mediasoup service not available');
        }

        const router = await mediasoupService.getOrCreateRouter(classId);
        
        if (callback) {
          callback({
            success: true,
            rtpCapabilities: router.rtpCapabilities
          });
        }
      } catch (error) {
        console.error('❌ Get RTP capabilities error:', error);
        if (callback) {
          callback({ success: false, error: error.message });
        }
      }
    });

    // Create transport
    socket.on('createTransport', async (data, callback) => {
      try {
        const { classId, direction } = data; // 'send' or 'recv'
        console.log(`🚚 Creating ${direction} transport for class ${classId}`);

        if (!mediasoupService) {
          throw new Error('Mediasoup service not available');
        }

        const transport = await mediasoupService.createWebRtcTransport(classId, direction);
        
        if (callback) {
          callback({
            success: true,
            transport: {
              id: transport.id,
              iceParameters: transport.iceParameters,
              iceCandidates: transport.iceCandidates,
              dtlsParameters: transport.dtlsParameters
            }
          });
        }

        console.log(`✅ ${direction} transport created: ${transport.id}`);
      } catch (error) {
        console.error('❌ Create transport error:', error);
        if (callback) {
          callback({ success: false, error: error.message });
        }
      }
    });

    // Connect transport
    socket.on('connectTransport', async (data, callback) => {
      try {
        const { transportId, dtlsParameters } = data;
        console.log(`🔗 Connecting transport ${transportId}`);

        if (!mediasoupService) {
          throw new Error('Mediasoup service not available');
        }

        await mediasoupService.connectWebRtcTransport(transportId, dtlsParameters);
        
        if (callback) {
          callback({ success: true });
        }

        console.log(`✅ Transport connected: ${transportId}`);
      } catch (error) {
        console.error('❌ Connect transport error:', error);
        if (callback) {
          callback({ success: false, error: error.message });
        }
      }
    });

    // Produce media
    socket.on('produce', async (data, callback) => {
      try {
        const { transportId, kind, rtpParameters, classId } = data;
        console.log(`🎬 PRODUCE REQUEST: ${kind} for user ${socket.userId} in class ${classId || socket.classId}`);
        console.log(`🔍 Transport ID: ${transportId}`);

        if (!mediasoupService) {
          throw new Error('Mediasoup service not available');
        }

        console.log(`📡 Creating producer on mediasoup...`);
        const producerId = await mediasoupService.createProducer(
          transportId,
          rtpParameters,
          kind,
          socket.userId,
          classId || socket.classId
        );
        
        console.log(`✅ Producer created successfully: ${producerId}`);
        
        if (callback) {
          callback({ success: true, producerId });
        }

        // Get room participants count
        const roomSize = socket.adapter.rooms.get(socket.classId)?.size || 0;
        console.log(`📢 Broadcasting newProducer to ${roomSize - 1} other participants in room ${socket.classId}`);

        // Notify other participants about new producer
        socket.to(socket.classId).emit('newProducer', {
          producerId,
          peerId: String(socket.userId),
          userId: String(socket.userId),
          kind
        });

        console.log(`✅ PRODUCER BROADCAST SENT: ${producerId} (${kind}) from user ${socket.userId}`);
      } catch (error) {
        console.error('❌ PRODUCE ERROR:', error);
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          transportId: data.transportId,
          kind: data.kind
        });
        if (callback) {
          callback({ success: false, error: error.message });
        }
      }
    });

    // Consume media
    socket.on('consume', async (data, callback) => {
      try {
        const { transportId, producerId, rtpCapabilities } = data;
        console.log(`🍽️ Consuming producer ${producerId} for user ${socket.userId}`);

        if (!mediasoupService) {
          throw new Error('Mediasoup service not available');
        }

        const consumer = await mediasoupService.createConsumer(
          transportId,
          producerId,
          rtpCapabilities,
          socket.userId
        );
        
        if (callback) {
          callback({
            success: true,
            consumer: {
              id: consumer.id,
              producerId: consumer.producerId,
              kind: consumer.kind,
              rtpParameters: consumer.rtpParameters
            }
          });
        }

        console.log(`✅ Consumer created: ${consumer.id}`);
      } catch (error) {
        console.error('❌ Consume error:', error);
        if (callback) {
          callback({ success: false, error: error.message });
        }
      }
    });

    // Resume consumer
    socket.on('resumeConsumer', async (data, callback) => {
      try {
        const { consumerId } = data;
        console.log(`▶️ Resuming consumer ${consumerId}`);

        if (!mediasoupService) {
          throw new Error('Mediasoup service not available');
        }

        await mediasoupService.resumeConsumer(consumerId);
        
        if (callback) {
          callback({ success: true });
        }

        console.log(`✅ Consumer resumed: ${consumerId}`);
      } catch (error) {
        console.error('❌ Resume consumer error:', error);
        if (callback) {
          callback({ success: false, error: error.message });
        }
      }
    });

    // Close producer (for camera/mic toggle)
    socket.on('closeProducer', async (data, callback) => {
      try {
        const { producerId } = data;
        console.log(`🗑️ Closing producer ${producerId} for user ${socket.userId}`);

        if (!mediasoupService) {
          throw new Error('Mediasoup service not available');
        }

        await mediasoupService.closeProducer(producerId);
        
        // Notify other participants that producer closed
        socket.to(socket.classId).emit('producerClosed', {
          producerId,
          peerId: socket.userId
        });
        
        if (callback) {
          callback({ success: true });
        }

        console.log(`✅ Producer closed: ${producerId}`);
      } catch (error) {
        console.error('❌ Close producer error:', error);
        if (callback) {
          callback({ success: false, error: error.message });
        }
      }
    });

    // Request existing producers
    socket.on('requestExistingProducers', async (data, callback) => {
      try {
        const { classId } = data;
        console.log(`📋 Requesting existing producers for class ${classId}`);

        if (!mediasoupService) {
          throw new Error('Mediasoup service not available');
        }

        const existingProducers = mediasoupService.getExistingProducers(classId || socket.classId);
        
        if (callback) {
          callback({
            success: true,
            existingProducers: existingProducers
          });
        }

        console.log(`✅ Sent ${existingProducers.length} existing producers`);
      } catch (error) {
        console.error('❌ Request existing producers error:', error);
        if (callback) {
          callback({ success: false, error: error.message });
        }
      }
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
      
      if (socket.classId && socket.userId && mediasoupService) {
        try {
          await mediasoupService.removeParticipant(socket.classId, socket.userId);
          
          // Notify others
          socket.to(socket.classId).emit('userLeft', {
            userId: socket.userId,
            name: socket.userName
          });
        } catch (error) {
          console.error('❌ Disconnect cleanup error:', error);
        }
      }
    });

    // Media state changes
    socket.on('media-state-changed', (data) => {
      socket.to(socket.classId).emit('media-state-changed', {
        userId: socket.userId,
        ...data
      });
    });

    // Test message handler
    socket.on('test-message', (data) => {
      console.log('🧪 TEST MESSAGE RECEIVED:', data);
      socket.emit('test-response', { received: true, timestamp: Date.now() });
    });

    // Student permission management
    socket.on('grantStudentPermission', (data) => {
      const { studentId, permission } = data;
      console.log(`🎛️ Granting ${permission} permission to student ${studentId}`);
      
      io.to(socket.classId).emit('studentPermissionGranted', {
        studentId,
        permission,
        grantedBy: socket.userId
      });
    });

    socket.on('revokeStudentPermission', (data) => {
      const { studentId, permission } = data;
      console.log(`🚫 Revoking ${permission} permission from student ${studentId}`);
      
      io.to(socket.classId).emit('studentPermissionRevoked', {
        studentId,
        permission,
        revokedBy: socket.userId
      });
    });
  });
};

module.exports = setupScalableLiveClassSocket;