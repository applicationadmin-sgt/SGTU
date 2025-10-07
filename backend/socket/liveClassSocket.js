const jwt = require('jsonwebtoken');
const User = require('../models/User');
const LiveClass = require('../models/LiveClass');

// Store active rooms and their state
const rooms = new Map();
// Map userId to socketId for direct messaging
const userSocketMap = new Map();
// Track approved users for each room (roomId -> Set of approved userIds)
const approvedUsers = new Map();

function initializeLiveClassSocket(server, io) {
  console.log('🔧 Initializing Live Class Socket with shared Socket.IO instance...');
  
  console.log('📋 Live Class Socket using shared Socket.IO instance');

  // Initialize approved users map on the socket.io server
  if (!io.approvedUsers) {
    io.approvedUsers = new Map();
  }

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      console.log('🔐 Socket.IO authentication attempt:', {
        socketId: socket.id,
        hasToken: !!socket.handshake.auth.token,
        origin: socket.handshake.headers.origin,
        userAgent: socket.handshake.headers['user-agent']
      });
      
      const token = socket.handshake.auth.token;
      
      if (!token) {
        console.error('❌ No token provided in Socket.IO handshake');
        return next(new Error('Authentication error: No token provided'));
      }

      // Check if it's a guest token
      if (token.startsWith('guest_token_')) {
        const guestId = token.replace('guest_token_', '');
        console.log('🎭 Guest authentication for:', guestId);
        
        socket.userId = guestId;
        socket.userName = socket.handshake.auth.userName || 'Guest User';
        socket.userRole = 'student';
        socket.userEmail = socket.handshake.auth.userEmail || `${guestId}@guest.com`;
        socket.isGuest = true;
        
        // Map userId to socketId for direct messaging
        userSocketMap.set(socket.userId, socket.id);
        
        console.log('✅ Socket.IO guest authentication successful:', {
          userId: socket.userId,
          userName: socket.userName,
          userRole: socket.userRole,
          isGuest: socket.isGuest
        });
        
        return next();
      }

      // Regular JWT authentication
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('🔍 JWT decoded payload (full):', decoded);
      console.log('🔍 JWT decoded properties:', { 
        hasId: !!decoded.id, 
        hasUserId: !!decoded.userId,
        id: decoded.id,
        userId: decoded.userId,
        allKeys: Object.keys(decoded)
      });
      
      // The JWT token uses 'id' not 'userId'
      const userId = decoded.id || decoded.userId;
      console.log('🎯 Extracted userId:', userId);
      
      const user = await User.findById(userId);
      
      if (!user) {
        console.error('❌ User not found for Socket.IO connection:', { 
          attemptedUserId: userId,
          decodedId: decoded.id,
          decodedUserId: decoded.userId,
          fullDecoded: decoded
        });
        return next(new Error('Authentication error: User not found'));
      }

      socket.userId = user._id.toString();
      socket.userName = user.name;
      socket.userRole = user.role;
      socket.userEmail = user.email;
      socket.isGuest = false;
      
      // Map userId to socketId for direct messaging
      userSocketMap.set(socket.userId, socket.id);
      
      console.log('✅ Socket.IO authentication successful:', {
        userId: socket.userId,
        userName: socket.userName,
        userRole: socket.userRole
      });
      
      next();
    } catch (error) {
      console.error('❌ Socket authentication error:', error);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔗 Socket.IO connection established: ${socket.userName} (${socket.userId}) - Socket ID: ${socket.id}`);
    
    // Join live class room
    socket.on('join-room', async (data) => {
      try {
        const { roomId } = data;
        
        console.log('📝 Join room request details:', data);
        console.log('📝 Socket user details:', { 
          socketUserId: socket.userId, 
          socketUserName: socket.userName, 
          socketUserRole: socket.userRole 
        });
        
        if (!roomId) {
          console.log('❌ Missing roomId in join request');
          socket.emit('error', { message: 'Room ID is required' });
          return;
        }
        
        console.log(`🚪 User ${socket.userName} joining room: ${roomId}`);
        
        // Verify the live class exists with enhanced multi-section support
        console.log('🔍 Looking for live class with roomId:', roomId);
        
        const liveClass = await LiveClass.findOne({ roomId })
          .populate('sections', 'students name')
          .populate('section', 'students name') // Backward compatibility
          .populate('teacher', 'name email');
        
        console.log('🔍 LiveClass found:', !!liveClass);
        if (liveClass) {
          console.log('🔍 LiveClass details:', {
            id: liveClass._id,
            title: liveClass.title,
            teacherId: liveClass.teacher?._id,
            teacherName: liveClass.teacher?.name,
            sectionsCount: liveClass.sections?.length || 0,
            hasLegacySection: !!liveClass.section
          });
        }
        
        if (!liveClass) {
          console.log('❌ Live class not found for roomId:', roomId);
          socket.emit('error', { message: 'Live class not found' });
          return;
        }
        
        // Enhanced permission check with multi-section support
        const teacherId = liveClass.teacher._id.toString();
        const currentUserId = socket.userId.toString();
        const isTeacher = (teacherId === currentUserId);
        
        console.log('🔍 Enhanced permission check:', {
          userId: currentUserId,
          userName: socket.userName,
          userRole: socket.userRole,
          teacherId: teacherId,
          isTeacher: isTeacher,
          roomId: roomId,
          hasMultipleSections: liveClass.sections && liveClass.sections.length > 1,
          sectionCount: liveClass.sections ? liveClass.sections.length : (liveClass.section ? 1 : 0)
        });
        
        let hasPermission = false;
        let userRole = socket.userRole;
        
        if (isTeacher) {
          hasPermission = true;
          userRole = 'teacher';
          console.log(`✅ Teacher access granted: ${socket.userName}`);
        } else if (socket.userRole === 'admin') {
          hasPermission = true;
          console.log(`✅ Admin access granted: ${socket.userName}`);
        } else if (socket.userRole === 'student') {
          // Enhanced student permission check for multiple sections
          const allSections = liveClass.sections || (liveClass.section ? [liveClass.section] : []);
          
          hasPermission = allSections.some(section => 
            section.students && section.students.some(s => s._id.toString() === currentUserId)
          );
          
          console.log(`🔍 Student permission check result: ${hasPermission}`, {
            sectionsChecked: allSections.length,
            studentInAnySections: hasPermission
          });
        }
        
        if (!hasPermission) {
          console.log(`❌ Permission denied for: ${socket.userName}`);
          socket.emit('error', { message: 'You do not have permission to join this class' });
          return;
        }
        
        // For non-teachers, verify they are enrolled in the class sections
        if (!isTeacher) {
          console.log(`🔍 Checking enrollment for student ${socket.userName} in class sections`);
          
          // Enhanced student enrollment check for multiple sections
          const allSections = liveClass.sections || (liveClass.section ? [liveClass.section] : []);
          console.log(`📚 Found ${allSections.length} sections to check enrollment against`);
          
          let isEnrolled = false;
          let enrolledSectionName = '';
          
          for (const section of allSections) {
            if (section.students && section.students.some(s => s._id.toString() === currentUserId)) {
              isEnrolled = true;
              enrolledSectionName = section.name;
              console.log(`✅ Student ${socket.userName} found in section: ${section.name}`);
              break;
            }
          }
          
          if (!isEnrolled) {
            console.log(`❌ Student ${socket.userName} is not enrolled in any section of this class`);
            console.log(`� Available sections: ${allSections.map(s => s.name).join(', ')}`);
            socket.emit('error', { 
              message: 'You are not enrolled in this class. Please contact your teacher to add you to the appropriate section.' 
            });
            return;
          }
          
          console.log(`✅ Student ${socket.userName} is enrolled in section "${enrolledSectionName}" and can join directly`);
        }
        
        // Initialize room if it doesn't exist
        if (!rooms.has(roomId)) {
          rooms.set(roomId, {
            users: new Map(),
            liveClassId: liveClass._id,
            createdAt: new Date()
          });
        }
        
        const room = rooms.get(roomId);
        
        // Add user to room
        room.users.set(socket.userId, {
          socket: socket,
          userName: socket.userName,
          isTeacher: isTeacher,
          joinedAt: new Date()
        });
        
        // Join socket room
        socket.join(roomId);
        socket.currentRoom = roomId;
        socket.isTeacher = isTeacher;
        
        console.log(`✅ User ${socket.userName} joined room ${roomId}. Room size: ${room.users.size}`);
        
        // Notify user they joined successfully
        socket.emit('joined-room', {
          roomId,
          isTeacher,
          participantCount: room.users.size
        });
        
        // Notify other users
        socket.to(roomId).emit('user-joined', {
          userId: socket.userId,
          userName: socket.userName,
          isTeacher
        });
        
        // Also emit participant-joined for CodeTantraLiveClass compatibility
        socket.to(roomId).emit('participant-joined', {
          id: socket.userId,
          name: socket.userName,
          role: socket.userRole,
          joinedAt: new Date()
        });
        
        // Build participant list and broadcast to entire room so existing peers can negotiate
        const participants = Array.from(room.users.values()).map(user => ({
          userId: user.socket.userId,
          userName: user.userName,
          isTeacher: user.isTeacher
        }));

  // Send to newly joined user and also broadcast to the room for deterministic offer initiation
  socket.emit('participants-list', participants);
  io.to(roomId).emit('participants-list', participants);
  console.log(`👥 Broadcast participants-list to room ${roomId} with ${participants.length} users`);
        
        // Update participant count in database
        if (!isTeacher) {
          await liveClass.addParticipant(socket.userId);
        }
        
        // Store room info on socket for cleanup
        socket.currentRoom = roomId;
        
      } catch (error) {
        console.error('❌ Error joining room:', error);
        console.error('❌ Error stack:', error.stack);
        console.error('❌ Error details:', {
          userId: socket.userId,
          userName: socket.userName,
          userRole: socket.userRole,
          roomId: data?.roomId,
          errorMessage: error.message
        });
        socket.emit('error', { 
          message: 'Failed to join room: ' + error.message,
          code: 'JOIN_ROOM_ERROR'
        });
      }
    });

    // WebRTC signaling
    socket.on('offer', (data) => {
      const targetSocketId = userSocketMap.get(data.targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('offer', {
          offer: data.offer,
          fromUserId: socket.userId
        });
        console.log(`📤 Forwarded offer from ${socket.userId} to ${data.targetUserId}`);
      } else {
        console.warn(`⚠️ Offer target not found for ${data.targetUserId}`);
      }
    });

    socket.on('answer', (data) => {
      const targetSocketId = userSocketMap.get(data.targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('answer', {
          answer: data.answer,
          fromUserId: socket.userId
        });
        console.log(`📤 Forwarded answer from ${socket.userId} to ${data.targetUserId}`);
      } else {
        console.warn(`⚠️ Answer target not found for ${data.targetUserId}`);
      }
    });

    socket.on('ice-candidate', (data) => {
      const targetSocketId = userSocketMap.get(data.targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('ice-candidate', {
          candidate: data.candidate,
          fromUserId: socket.userId
        });
        console.log(`📤 Forwarded ICE candidate from ${socket.userId} to ${data.targetUserId}`);
      } else {
        console.warn(`⚠️ ICE candidate target not found for ${data.targetUserId}`);
      }
    });

    // Enhanced chat messages with reactions and file support
    socket.on('chat-message', async (data) => {
      if (socket.currentRoom) {
        try {
          const liveClass = await LiveClass.findOne({ roomId: socket.currentRoom });
          if (!liveClass || !liveClass.allowChat) {
            socket.emit('error', { message: 'Chat is not allowed in this class' });
            return;
          }

          const messageData = {
            message: data.message,
            messageType: data.messageType || 'text',
            userId: socket.userId,
            userName: socket.userName,
            userRole: socket.userRole,
            isFromTeacher: socket.isTeacher,
            timestamp: new Date(),
            isPrivate: data.isPrivate || false,
            recipient: data.recipient || null
          };

          // Handle private messages
          if (data.isPrivate && data.recipient) {
            const recipientSocketId = userSocketMap.get(data.recipient);
            if (recipientSocketId) {
              io.to(recipientSocketId).emit('chat-message', messageData);
              socket.emit('chat-message', messageData); // Send to sender too
            }
          } else {
            // Public message to room
            io.to(socket.currentRoom).emit('chat-message', messageData);
          }

          // Save message to database
          liveClass.chatMessages.push({
            sender: socket.userId,
            senderRole: socket.userRole,
            messageType: data.messageType || 'text',
            content: data.message,
            timestamp: new Date(),
            isPrivate: data.isPrivate || false,
            recipient: data.recipient || null
          });

          liveClass.analytics.chatMessageCount += 1;
          await liveClass.save();

        } catch (error) {
          console.error('Error handling chat message:', error);
          socket.emit('error', { message: 'Failed to send message' });
        }
      }
    });

    // Hand raising functionality
    socket.on('raise-hand', async (data) => {
      if (socket.currentRoom && !socket.isTeacher) {
        try {
          const liveClass = await LiveClass.findOne({ roomId: socket.currentRoom });
          if (!liveClass || !liveClass.enableHandRaise) {
            socket.emit('error', { message: 'Hand raising is not enabled' });
            return;
          }

          // Update participant status
          const participant = liveClass.participants.find(p => p.user.toString() === socket.userId);
          if (participant) {
            participant.status = 'hand-raised';
            participant.handRaisedAt = new Date();
            await liveClass.save();
          }

          // Notify teacher and other participants
          io.to(socket.currentRoom).emit('hand-raised', {
            userId: socket.userId,
            userName: socket.userName,
            timestamp: new Date()
          });

          console.log(`✋ ${socket.userName} raised hand in room ${socket.currentRoom}`);

        } catch (error) {
          console.error('Error handling hand raise:', error);
        }
      }
    });

    socket.on('lower-hand', async (data) => {
      if (socket.currentRoom) {
        try {
          const liveClass = await LiveClass.findOne({ roomId: socket.currentRoom });
          if (liveClass) {
            const participant = liveClass.participants.find(p => p.user.toString() === socket.userId);
            if (participant) {
              participant.status = 'joined';
              participant.handRaisedAt = null;
              await liveClass.save();
            }
          }

          io.to(socket.currentRoom).emit('hand-lowered', {
            userId: socket.userId,
            userName: socket.userName
          });

        } catch (error) {
          console.error('Error handling lower hand:', error);
        }
      }
    });

    // Whiteboard functionality
    socket.on('whiteboard-update', (data) => {
      if (socket.currentRoom && (socket.isTeacher || data.allowStudentDraw)) {
        socket.to(socket.currentRoom).emit('whiteboard-update', {
          data: data.drawingData,
          fromUserId: socket.userId,
          fromUserName: socket.userName,
          timestamp: new Date()
        });
      }
    });

    // Advanced Whiteboard Events
    socket.on('whiteboard:path-created', (data) => {
      if (socket.currentRoom && socket.isTeacher) {
        console.log(`🎨 Path created by ${socket.userName} in room ${socket.currentRoom}`);
        socket.to(socket.currentRoom).emit('whiteboard:path-created', {
          ...data,
          fromUserId: socket.userId,
          fromUserName: socket.userName,
          timestamp: new Date()
        });
      }
    });

    socket.on('whiteboard:object-modified', (data) => {
      if (socket.currentRoom && socket.isTeacher) {
        console.log(`🎨 Object modified by ${socket.userName} in room ${socket.currentRoom}`);
        socket.to(socket.currentRoom).emit('whiteboard:object-modified', {
          ...data,
          fromUserId: socket.userId,
          fromUserName: socket.userName,
          timestamp: new Date()
        });
      }
    });

    socket.on('whiteboard:shape-added', (data) => {
      if (socket.currentRoom && socket.isTeacher) {
        console.log(`🎨 Shape added by ${socket.userName} in room ${socket.currentRoom}`);
        socket.to(socket.currentRoom).emit('whiteboard:shape-added', {
          ...data,
          fromUserId: socket.userId,
          fromUserName: socket.userName,
          timestamp: new Date()
        });
      }
    });

    socket.on('whiteboard:text-added', (data) => {
      if (socket.currentRoom && socket.isTeacher) {
        console.log(`🎨 Text added by ${socket.userName} in room ${socket.currentRoom}`);
        socket.to(socket.currentRoom).emit('whiteboard:text-added', {
          ...data,
          fromUserId: socket.userId,
          fromUserName: socket.userName,
          timestamp: new Date()
        });
      }
    });

    socket.on('whiteboard:image-added', (data) => {
      if (socket.currentRoom && socket.isTeacher) {
        console.log(`🎨 Image added by ${socket.userName} in room ${socket.currentRoom}`);
        socket.to(socket.currentRoom).emit('whiteboard:image-added', {
          ...data,
          fromUserId: socket.userId,
          fromUserName: socket.userName,
          timestamp: new Date()
        });
      }
    });

    socket.on('whiteboard:lock', (data) => {
      if (socket.currentRoom && socket.isTeacher) {
        console.log(`🔒 Whiteboard locked by ${socket.userName} in room ${socket.currentRoom}`);
        socket.to(socket.currentRoom).emit('whiteboard:lock', {
          ...data,
          fromUserId: socket.userId,
          fromUserName: socket.userName,
          timestamp: new Date()
        });
      }
    });

    socket.on('whiteboard:unlock', (data) => {
      if (socket.currentRoom && socket.isTeacher) {
        console.log(`🔓 Whiteboard unlocked by ${socket.userName} in room ${socket.currentRoom}`);
        socket.to(socket.currentRoom).emit('whiteboard:unlock', {
          ...data,
          fromUserId: socket.userId,
          fromUserName: socket.userName,
          timestamp: new Date()
        });
      }
    });

    socket.on('whiteboard:clear', (data) => {
      if (socket.currentRoom && socket.isTeacher) {
        console.log(`🗑️ Whiteboard cleared by ${socket.userName} in room ${socket.currentRoom}`);
        socket.to(socket.currentRoom).emit('whiteboard:clear', {
          ...data,
          fromUserId: socket.userId,
          fromUserName: socket.userName,
          timestamp: new Date()
        });
      }
    });

    socket.on('whiteboard:undo', (data) => {
      if (socket.currentRoom && socket.isTeacher) {
        console.log(`↶ Whiteboard undo by ${socket.userName} in room ${socket.currentRoom}`);
        socket.to(socket.currentRoom).emit('whiteboard:undo', {
          ...data,
          fromUserId: socket.userId,
          fromUserName: socket.userName,
          timestamp: new Date()
        });
      }
    });

    socket.on('whiteboard:redo', (data) => {
      if (socket.currentRoom && socket.isTeacher) {
        console.log(`↷ Whiteboard redo by ${socket.userName} in room ${socket.currentRoom}`);
        socket.to(socket.currentRoom).emit('whiteboard:redo', {
          ...data,
          fromUserId: socket.userId,
          fromUserName: socket.userName,
          timestamp: new Date()
        });
      }
    });

    socket.on('whiteboard:pointer-move', (data) => {
      if (socket.currentRoom) {
        // Real-time pointer sharing for collaboration
        socket.to(socket.currentRoom).emit('whiteboard:pointer-move', {
          ...data,
          fromUserId: socket.userId,
          fromUserName: socket.userName,
          timestamp: new Date()
        });
      }
    });

    socket.on('whiteboard:save-state', async (data) => {
      if (socket.currentRoom && socket.isTeacher) {
        try {
          console.log(`💾 Whiteboard state saved by ${socket.userName} in room ${socket.currentRoom}`);
          
          const liveClass = await LiveClass.findOne({ roomId: socket.currentRoom });
          if (liveClass) {
            if (!liveClass.whiteboardStates) {
              liveClass.whiteboardStates = [];
            }
            
            liveClass.whiteboardStates.push({
              state: data.state,
              savedBy: socket.userId,
              savedByName: socket.userName,
              savedAt: new Date(),
              version: liveClass.whiteboardStates.length + 1
            });
            
            await liveClass.save();
            
            socket.emit('whiteboard:save-success', {
              version: liveClass.whiteboardStates.length,
              timestamp: new Date()
            });
          }
        } catch (error) {
          console.error('❌ Error saving whiteboard state:', error);
          socket.emit('whiteboard:save-error', {
            message: 'Failed to save whiteboard state',
            error: error.message
          });
        }
      }
    });

    socket.on('whiteboard:load-state', async (data) => {
      if (socket.currentRoom) {
        try {
          console.log(`📂 Whiteboard state load request by ${socket.userName} in room ${socket.currentRoom}`);
          
          const liveClass = await LiveClass.findOne({ roomId: socket.currentRoom });
          if (liveClass && liveClass.whiteboardStates && liveClass.whiteboardStates.length > 0) {
            const requestedVersion = data.version || liveClass.whiteboardStates.length;
            const stateIndex = Math.min(requestedVersion - 1, liveClass.whiteboardStates.length - 1);
            const state = liveClass.whiteboardStates[stateIndex];
            
            socket.emit('whiteboard:load-success', {
              state: state.state,
              version: stateIndex + 1,
              savedBy: state.savedByName,
              savedAt: state.savedAt
            });
          } else {
            socket.emit('whiteboard:load-error', {
              message: 'No saved whiteboard states found'
            });
          }
        } catch (error) {
          console.error('❌ Error loading whiteboard state:', error);
          socket.emit('whiteboard:load-error', {
            message: 'Failed to load whiteboard state',
            error: error.message
          });
        }
      }
    });

    // Teacher controls for student permissions
    socket.on('toggle-student-permissions', async (data) => {
      if (socket.currentRoom && socket.isTeacher) {
        try {
          const { studentUserId, permissionType, enabled } = data;
          
          const liveClass = await LiveClass.findOne({ roomId: socket.currentRoom });
          if (liveClass) {
            const participant = liveClass.participants.find(p => p.user.toString() === studentUserId);
            if (participant) {
              participant.permissions[permissionType] = enabled;
              await liveClass.save();
              
              // Notify the specific student
              const studentSocketId = userSocketMap.get(studentUserId);
              if (studentSocketId) {
                io.to(studentSocketId).emit('permissions-updated', {
                  permissions: participant.permissions
                });
              }
              
              // Notify teacher
              socket.emit('permissions-updated-success', {
                studentUserId,
                permissionType,
                enabled
              });
            }
          }
        } catch (error) {
          console.error('Error updating student permissions:', error);
        }
      }
    });

    // Class settings updates
    socket.on('class-settings-updated', async (data) => {
      console.log('📋 Class settings update received from:', socket.userName);
      console.log('📋 New settings:', data.settings);
      
      if (socket.currentRoom && (socket.userRole === 'teacher' || socket.isTeacher)) {
        try {
          // Broadcast settings to all participants in the room except sender
          socket.to(socket.currentRoom).emit('class-settings-updated', {
            settings: data.settings,
            updatedBy: socket.userName,
            timestamp: new Date()
          });
          
          console.log('📋 Settings broadcasted to room:', socket.currentRoom);
        } catch (error) {
          console.error('❌ Error broadcasting settings update:', error);
        }
      } else {
        console.log('❌ Settings update rejected - insufficient permissions');
      }
    });

    // Screen share notifications
    socket.on('screen-share-started', (data) => {
      if (socket.currentRoom) {
        socket.to(socket.currentRoom).emit('screen-share-started', {
          userId: socket.userId,
          userName: socket.userName,
          isTeacher: socket.isTeacher
        });
      }
    });

    socket.on('screen-share-stopped', (data) => {
      if (socket.currentRoom) {
        socket.to(socket.currentRoom).emit('screen-share-stopped', {
          userId: socket.userId,
          userName: socket.userName
        });
      }
    });

    // Recording status updates
    socket.on('recording-started', async (data) => {
      if (socket.currentRoom && socket.isTeacher) {
        try {
          const liveClass = await LiveClass.findOne({ roomId: socket.currentRoom });
          if (liveClass) {
            liveClass.isRecording = true;
            liveClass.recordingStartTime = new Date();
            await liveClass.save();
          }

          io.to(socket.currentRoom).emit('recording-status-changed', {
            isRecording: true,
            startedBy: socket.userName,
            timestamp: new Date()
          });
        } catch (error) {
          console.error('Error updating recording status:', error);
        }
      }
    });

    socket.on('recording-stopped', async (data) => {
      if (socket.currentRoom && socket.isTeacher) {
        try {
          const liveClass = await LiveClass.findOne({ roomId: socket.currentRoom });
          if (liveClass) {
            liveClass.isRecording = false;
            liveClass.recordingEndTime = new Date();
            await liveClass.save();
          }

          io.to(socket.currentRoom).emit('recording-status-changed', {
            isRecording: false,
            stoppedBy: socket.userName,
            timestamp: new Date()
          });
        } catch (error) {
          console.error('Error updating recording status:', error);
        }
      }
    });

    // Leave room
    socket.on('leave-room', async () => {
      await handleUserLeaveRoom(socket);
    });

    // File upload notification handler
    socket.on('file-uploaded', (data) => {
      console.log(`📁 File upload notification from ${socket.userName}:`, data.file.name);
      
      // Broadcast to all participants in the class
      socket.to(data.classId).emit('file-uploaded', {
        file: data.file,
        uploader: data.uploader,
        timestamp: new Date()
      });
    });

    // Poll creation notification handler
    socket.on('poll-created', (data) => {
      console.log(`📊 Poll created by ${socket.userName}:`, data.poll.question);
      
      // Broadcast to all participants in the class
      socket.to(data.classId).emit('poll-created', {
        poll: data.poll,
        creator: data.creator,
        timestamp: new Date()
      });
    });

    // Poll response notification handler
    socket.on('poll-response', (data) => {
      console.log(`📊 Poll response from ${socket.userName}`);
      
      // Broadcast updated poll data to all participants
      socket.to(data.classId).emit('poll-updated', {
        pollId: data.pollId,
        updatedPoll: data.updatedPoll,
        timestamp: new Date()
      });
    });

    // Handle join-class (alias for join-room for CodeTantraLiveClass compatibility)
    socket.on('join-class', async (data) => {
      console.log(`📚 Join class request from ${socket.userName}:`, data);
      
      // Convert classId to roomId for compatibility
      const roomId = data.classId;
      const isTeacher = data.userRole === 'teacher' || ['admin', 'hod', 'dean'].includes(data.userRole);
      
      console.log(`🚪 User ${socket.userName} joining class room: ${roomId}`);
      
      // Create or get room
      if (!rooms.has(roomId)) {
        rooms.set(roomId, {
          id: roomId,
          users: new Map(),
          createdAt: new Date()
        });
        console.log(`📦 Created new room: ${roomId}`);
      }
      
      const room = rooms.get(roomId);
      
      // Add user to room
      const userInfo = {
        socket: socket,
        userId: socket.userId,
        userName: socket.userName,
        userRole: socket.userRole,
        isTeacher: isTeacher,
        joinedAt: new Date()
      };
      
      room.users.set(socket.id, userInfo);
      socket.join(roomId);
      socket.currentRoom = roomId;
      socket.isTeacher = isTeacher;
      
      console.log(`✅ User ${socket.userName} joined room ${roomId}. Room size: ${room.users.size}`);
      
      // Notify user they joined successfully
      socket.emit('joined-room', {
        roomId,
        isTeacher,
        participantCount: room.users.size
      });
      
      // Notify other users and emit participant-joined for CodeTantraLiveClass
      socket.to(roomId).emit('participant-joined', {
        id: socket.userId,
        name: socket.userName,
        role: socket.userRole,
        isOnline: true,
        joinedAt: new Date()
      });
      
      console.log(`👥 Emitted participant-joined for ${socket.userName}`);
    });

    // Handle participant updates for live synchronization
    socket.on('request-participants', async (data) => {
      try {
        const { classId } = data;
        const room = rooms.get(classId);
        
        if (room) {
          const participants = Array.from(room.users.values()).map(user => ({
            id: user.userId,
            name: user.userName,
            role: user.userRole,
            joinedAt: user.joinedAt,
            isOnline: true
          }));
          
          socket.emit('participants-updated', { participants });
          console.log(`👥 Sent ${participants.length} participants to ${socket.userName}`);
        }
      } catch (error) {
        console.error('❌ Error sending participants:', error);
      }
    });

    // Handle media state changes
    socket.on('media-state-changed', (data) => {
      console.log(`🎬 Media state changed for ${socket.userName}:`, data);
      
      // Broadcast media state to other participants in the room
      socket.to(data.classId).emit('participant-media-updated', {
        userId: socket.userId,
        userName: socket.userName,
        audio: data.audio,
        video: data.video,
        timestamp: new Date()
      });
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`🔌 User disconnected: ${socket.userName} (${socket.userId})`);
      // Clean up user socket mapping
      userSocketMap.delete(socket.userId);
      await handleUserLeaveRoom(socket);
    });
  });

  // Helper function to handle user leaving room
  async function handleUserLeaveRoom(socket) {
    try {
      const roomId = socket.currentRoom;
      if (!roomId) return;

      const room = rooms.get(roomId);
      if (!room) return;

      const userData = room.users.get(socket.userId);
      if (!userData) return;
      
      // Remove user from room
      room.users.delete(socket.userId);
      
      // Leave socket room
      socket.leave(roomId);
      
      // Notify other users
      socket.to(roomId).emit('user-left', {
        userId: socket.userId,
        userName: socket.userName
      });
      
      // Also emit participant-left for CodeTantraLiveClass compatibility
      socket.to(roomId).emit('participant-left', {
        id: socket.userId,
        name: socket.userName,
        role: socket.userRole,
        isOnline: false
      });
      
      console.log(`🚪 User ${socket.userName} left room ${roomId}. Room size: ${room.users.size}`);
      
      // Update participant count in database if student
      if (!userData.isTeacher) {
        const liveClass = await LiveClass.findById(room.liveClassId);
        if (liveClass) {
          await liveClass.removeParticipant(socket.userId);
        }
      }
      
      // Clean up empty rooms
      if (room.users.size === 0) {
        rooms.delete(roomId);
        console.log(`🧹 Cleaned up empty room: ${roomId}`);
      }
      
    } catch (error) {
      console.error('Error handling user leave room:', error);
    }
  }
  
  console.log('✅ Live Class Socket.IO server initialized');
  
  return io;
}

// Enhanced helper function to get current participant count for scalability
async function getCurrentParticipantCount(roomId) {
  try {
    const liveClass = await LiveClass.findOne({ roomId });
    return liveClass ? liveClass.currentParticipants : 0;
  } catch (error) {
    console.error('Error getting participant count:', error);
    return 0;
  }
}

// Enhanced helper to handle multi-role permissions
function hasPermission(userRole, action, liveClass) {
  const autoAllowRoles = liveClass.autoAllowRoles || ['admin', 'hod', 'dean'];
  
  if (autoAllowRoles.includes(userRole)) {
    return true;
  }
  
  switch (action) {
    case 'mute_all':
    case 'end_class':
    case 'manage_participants':
      return ['teacher', 'admin', 'hod', 'dean'].includes(userRole);
    case 'record':
      return ['teacher', 'admin', 'hod', 'dean'].includes(userRole);
    case 'screen_share':
      return ['teacher', 'admin', 'hod', 'dean'].includes(userRole);
    case 'moderate_chat':
      return ['teacher', 'admin', 'hod', 'dean'].includes(userRole);
    default:
      return false;
  }
}

// Enhanced whiteboard note management
async function saveWhiteboardNote(classId, noteData, userId) {
  try {
    const liveClass = await LiveClass.findById(classId);
    if (!liveClass) return null;
    
    const note = {
      ...noteData,
      savedBy: userId,
      savedAt: new Date(),
      version: 1,
      accessCount: 0
    };
    
    liveClass.whiteboardNotes.push(note);
    await liveClass.save();
    
    return note;
  } catch (error) {
    console.error('Error saving whiteboard note:', error);
    return null;
  }
}

// Scalability optimization for large classes
function optimizeForLargeClass(participantCount, liveClass) {
  const optimizations = {
    maxVideoStreams: 25,
    audioOnlyRecommended: false,
    qualityReduction: false,
    bandwidthLimit: 2000
  };
  
  if (participantCount > 50) {
    optimizations.maxVideoStreams = Math.min(25, Math.floor(participantCount * 0.3));
    optimizations.qualityReduction = true;
  }
  
  if (participantCount > 100) {
    optimizations.audioOnlyRecommended = true;
    optimizations.maxVideoStreams = 15;
    optimizations.bandwidthLimit = 1500;
  }
  
  if (participantCount > 200) {
    optimizations.maxVideoStreams = 10;
    optimizations.bandwidthLimit = 1000;
  }
  
  return optimizations;
}

module.exports = initializeLiveClassSocket;