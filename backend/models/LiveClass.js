const mongoose = require('mongoose');

const LiveClassSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true,
    trim: true
  },
  description: { 
    type: String, 
    trim: true
  },
  teacher: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true
  },
  // Enhanced: Support for multiple sections (merged classes)
  sections: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Section',
    index: true
  }],
  // Keep single section for backward compatibility
  section: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Section',
    required: true,
    index: true
  },
  course: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Course', 
    required: true,
    index: true
  },
  school: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'School', 
    required: true,
    index: true
  },
  department: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Department',
    index: true
  },
  
  // Scheduling information
  scheduledAt: { 
    type: Date, 
    required: true,
    index: true
  },
  duration: { 
    type: Number, 
    required: true, // Duration in minutes
    min: 15,
    max: 180
  },
  estimatedEndTime: { 
    type: Date,
    required: true
  },
  
  // Class status and timing
  status: { 
    type: String, 
    enum: ['scheduled', 'live', 'completed', 'cancelled'],
    default: 'scheduled',
    index: true
  },
  actualStartTime: { type: Date },
  actualEndTime: { type: Date },
  
  // Enhanced participants with multi-role support
  participants: [{
    user: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User',
      required: false // Made optional for backward compatibility
    },
    role: {
      type: String,
      enum: ['teacher', 'student', 'admin', 'hod', 'dean'],
      required: false // Made optional for backward compatibility
    },
    // Legacy field for old documents
    student: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User'
    },
    joinedAt: { type: Date },
    leftAt: { type: Date },
    totalDuration: { type: Number, default: 0 },
    isCurrentlyConnected: { type: Boolean, default: false },
    permissions: {
      canSpeak: { type: Boolean, default: false },
      canVideo: { type: Boolean, default: false },
      canChat: { type: Boolean, default: true },
      canScreenShare: { type: Boolean, default: false }
    }
  }],
  
  // Enhanced WebRTC Connection Details
  roomId: { 
    type: String, 
    unique: true,
    sparse: true, // Only create unique index for non-null values
    index: true
  },
  accessToken: {
    type: String,
    sparse: true, // Only create unique index for non-null values
    index: true
  },
  maxParticipants: { 
    type: Number, 
    default: 350 // Support 300+ students as requested
  },
  currentParticipants: { 
    type: Number, 
    default: 0 
  },
  
  // Enhanced Settings for Google Meet-like functionality
  allowStudentMic: { 
    type: Boolean, 
    default: false 
  },
  allowStudentCamera: { 
    type: Boolean, 
    default: false 
  },
  allowChat: { 
    type: Boolean, 
    default: true 
  },
  enableHandRaise: {
    type: Boolean,
    default: true
  },
  enableWhiteboard: {
    type: Boolean,
    default: true
  },
  waitingRoomEnabled: {
    type: Boolean,
    default: true
  },
  
  // Multi-role access settings
  autoAllowRoles: {
    type: [String],
    enum: ['hod', 'dean', 'admin'],
    default: ['hod', 'dean', 'admin'] // HOD and Dean can join anytime
  },
  
  // Recording information
  isRecording: { 
    type: Boolean, 
    default: false 
  },
  recordingStartTime: { type: Date },
  recordingEndTime: { type: Date },
  recordingPath: { type: String },
  recordingUrl: { type: String },
  recordingSize: { type: Number },
  recordingDuration: { type: Number },
  
  // Enhanced whiteboard notes system
  whiteboardNotes: [{
    title: { 
      type: String, 
      required: true,
      trim: true,
      maxlength: 100
    },
    content: {
      type: String, // JSON string of whiteboard elements
      required: true
    },
    description: {
      type: String,
      maxlength: 500
    },
    savedBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User',
      required: true
    },
    savedAt: { 
      type: Date, 
      default: Date.now 
    },
    isPublic: { 
      type: Boolean, 
      default: true 
    },
    tags: [{
      type: String,
      trim: true,
      maxlength: 30
    }]
  }],
  
  // Enhanced Security Settings
  isPasswordProtected: {
    type: Boolean,
    default: false
  },
  classPassword: {
    type: String,
    select: false // Don't return in queries by default
  },
  allowedUserTypes: [{
    type: String,
    enum: ['student', 'teacher', 'admin', 'hod', 'dean'],
    default: ['student', 'teacher']
  }],
  // Auto-allow certain roles without waiting room
  autoAllowRoles: {
    type: [String],
    enum: ['hod', 'dean', 'admin'],
    default: ['hod', 'dean', 'admin']
  },
  // Role-based permissions
  rolePermissions: {
    hod: {
      canJoinAnytime: { type: Boolean, default: true },
      canRecord: { type: Boolean, default: true },
      canMuteAll: { type: Boolean, default: true },
      canEndClass: { type: Boolean, default: true }
    },
    dean: {
      canJoinAnytime: { type: Boolean, default: true },
      canRecord: { type: Boolean, default: true },
      canMuteAll: { type: Boolean, default: true },
      canEndClass: { type: Boolean, default: true }
    },
    admin: {
      canJoinAnytime: { type: Boolean, default: true },
      canRecord: { type: Boolean, default: true },
      canMuteAll: { type: Boolean, default: true },
      canEndClass: { type: Boolean, default: true }
    }
  },
  waitingRoom: {
    enabled: { type: Boolean, default: true },
    participants: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      joinRequestedAt: { type: Date, default: Date.now },
      deviceInfo: { type: String },
      ipAddress: { type: String }
    }]
  },
  
  // Class Control Settings
  allowStudentMic: { 
    type: Boolean, 
    default: false 
  },
  allowStudentCamera: { 
    type: Boolean, 
    default: false 
  },
  allowChat: { 
    type: Boolean, 
    default: true 
  },
  requireApprovalToJoin: { 
    type: Boolean, 
    default: true 
  },
  enableHandRaise: {
    type: Boolean,
    default: true
  },
  enableWhiteboard: {
    type: Boolean,
    default: false
  },
  enableScreenAnnotation: {
    type: Boolean,
    default: false
  },
  
  // Enhanced Chat System
  chatMessages: [{
    sender: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User',
      required: true
    },
    senderRole: {
      type: String,
      enum: ['teacher', 'student', 'admin', 'hod', 'dean'],
      required: true
    },
    messageType: {
      type: String,
      enum: ['text', 'file', 'emoji', 'poll', 'announcement'],
      default: 'text'
    },
    content: { 
      type: String, 
      required: true,
      maxlength: 1000
    },
    fileUrl: { type: String }, // For file sharing
    fileName: { type: String },
    fileSize: { type: Number },
    timestamp: { 
      type: Date, 
      default: Date.now 
    },
    isPrivate: { type: Boolean, default: false },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // For private messages
    reactions: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      emoji: { type: String },
      timestamp: { type: Date, default: Date.now }
    }],
    isPinned: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false }
  }],
  
  // Advanced Features
  breakoutRooms: [{
    name: String,
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isActive: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  }],
  polls: [{
    question: { type: String, required: true },
    options: [{ type: String, required: true }],
    responses: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      answer: String,
      timestamp: { type: Date, default: Date.now }
    }],
    isActive: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  }],
  whiteboard: {
    enabled: { type: Boolean, default: false },
    data: { type: String }, // JSON string of whiteboard state
    lastModified: { type: Date },
    modifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  // Enhanced whiteboard notes system
  whiteboardNotes: [{
    title: { 
      type: String, 
      required: true,
      trim: true,
      maxlength: 100
    },
    content: {
      type: String, // JSON string of whiteboard elements
      required: true
    },
    description: {
      type: String,
      maxlength: 500
    },
    savedBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User',
      required: true
    },
    savedAt: { 
      type: Date, 
      default: Date.now 
    },
    isPublic: { 
      type: Boolean, 
      default: true 
    },
    tags: [{
      type: String,
      trim: true,
      maxlength: 30
    }],
    version: { 
      type: Number, 
      default: 1 
    },
    thumbnail: { 
      type: String // Base64 image thumbnail
    },
    accessCount: {
      type: Number,
      default: 0
    },
    sharedWith: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      permission: {
        type: String,
        enum: ['view', 'edit'],
        default: 'view'
      }
    }]
  }],
  
  // Analytics and Monitoring
  analytics: {
    totalJoinTime: { type: Number, default: 0 }, // Total seconds all participants spent
    peakParticipants: { type: Number, default: 0 },
    averageParticipants: { type: Number, default: 0 },
    chatMessageCount: { type: Number, default: 0 },
    screenshareCount: { type: Number, default: 0 },
    qualityIssues: { type: Number, default: 0 }
  },
  
  // Metadata
  isActive: { 
    type: Boolean, 
    default: true 
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true
  },
  updatedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes for performance
LiveClassSchema.index({ teacher: 1, scheduledAt: 1 });
LiveClassSchema.index({ section: 1, scheduledAt: 1 });
LiveClassSchema.index({ course: 1, scheduledAt: 1 });
LiveClassSchema.index({ status: 1, scheduledAt: 1 });
LiveClassSchema.index({ roomId: 1 });
LiveClassSchema.index({ createdAt: 1 });

// Enhanced pre-save middleware
LiveClassSchema.pre('save', function(next) {
  // Calculate estimated end time
  if (this.isModified('scheduledAt') || this.isModified('duration')) {
    this.estimatedEndTime = new Date(this.scheduledAt.getTime() + (this.duration * 60 * 1000));
  }
  
  // Generate unique room ID if not exists
  if (this.isNew && !this.roomId) {
    this.roomId = `lc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Generate unique access token if not exists
  if (this.isNew && !this.accessToken) {
    const crypto = require('crypto');
    this.accessToken = crypto.randomBytes(16).toString('hex');
  }
  
  // Handle multi-section support
  if (this.isNew) {
    // Ensure sections array exists
    if (!this.sections) {
      this.sections = [];
    }
    
    // If single section provided but no sections array, add to array
    if (this.section && !this.sections.includes(this.section)) {
      this.sections.push(this.section);
    }
    
    // If sections array provided but no single section, set first one
    if (this.sections.length > 0 && !this.section) {
      this.section = this.sections[0];
    }
  }
  
  next();
});

// Pre-save middleware for backward compatibility with existing documents
LiveClassSchema.pre('save', function(next) {
  // Handle existing documents that don't have accessToken
  if (!this.accessToken && !this.isNew) {
    const crypto = require('crypto');
    this.accessToken = crypto.randomBytes(16).toString('hex');
  }
  
  // Handle existing participants with old schema structure
  if (this.participants && this.participants.length > 0) {
    this.participants = this.participants.map(participant => {
      // If participant has old structure (just student field or ObjectId)
      if (participant.student && !participant.user) {
        return {
          user: participant.student,
          role: 'student', // Default role for old participants
          joinedAt: participant.joinedAt,
          leftAt: participant.leftAt,
          totalDuration: participant.totalDuration || 0,
          isCurrentlyConnected: participant.isCurrentlyConnected || false,
          permissions: participant.permissions || {
            canSpeak: false,
            canVideo: false,
            canShare: false,
            canChat: true,
            canViewWhiteboard: true,
            canEditWhiteboard: false,
            canViewAttendees: false
          }
        };
      }
      
      // If participant is just an ObjectId (very old structure)
      if (typeof participant === 'string' || participant.constructor.name === 'ObjectId') {
        return {
          user: participant,
          role: 'student',
          joinedAt: new Date(),
          leftAt: null,
          totalDuration: 0,
          isCurrentlyConnected: false,
          permissions: {
            canSpeak: false,
            canVideo: false,
            canShare: false,
            canChat: true,
            canViewWhiteboard: true,
            canEditWhiteboard: false,
            canViewAttendees: false
          }
        };
      }
      
      // If participant has proper structure but missing role/user
      if (!participant.role && participant.user) {
        participant.role = 'student';
      }
      if (!participant.user && participant.student) {
        participant.user = participant.student;
        participant.role = 'student';
      }
      
      return participant;
    });
  }
  
  next();
});

// Virtual for getting current status based on time
LiveClassSchema.virtual('currentStatus').get(function() {
  const now = new Date();
  
  if (this.status === 'cancelled') return 'cancelled';
  if (this.status === 'completed') return 'completed';
  if (this.status === 'live') return 'live';
  
  if (now < this.scheduledAt) return 'upcoming';
  if (now >= this.scheduledAt && now <= this.estimatedEndTime) return 'ongoing';
  if (now > this.estimatedEndTime) return 'ended';
  
  return 'scheduled';
});

// Virtual for getting recording availability
LiveClassSchema.virtual('hasRecording').get(function() {
  return this.recordingPath && this.recordingUrl && this.status === 'completed';
});

// Virtual for participant count
LiveClassSchema.virtual('participantCount').get(function() {
  return this.participants ? this.participants.length : 0;
});

// Enhanced method to add participant with role-based permissions
LiveClassSchema.methods.addParticipant = function(userId, userRole = 'student') {
  const existingParticipant = this.participants.find(
    p => p.user.toString() === userId.toString()
  );
  
  // Set permissions based on role
  const permissions = this.getPermissionsForRole(userRole);
  
  if (!existingParticipant) {
    this.participants.push({
      user: userId,
      role: userRole,
      joinedAt: new Date(),
      isCurrentlyConnected: true,
      permissions: permissions
    });
    this.currentParticipants += 1;
  } else if (!existingParticipant.isCurrentlyConnected) {
    existingParticipant.joinedAt = new Date();
    existingParticipant.isCurrentlyConnected = true;
    existingParticipant.permissions = permissions;
    this.currentParticipants += 1;
  }
  
  return this.save();
};

// Method to get permissions based on role
LiveClassSchema.methods.getPermissionsForRole = function(role) {
  switch (role) {
    case 'teacher':
    case 'admin':
    case 'hod':
    case 'dean':
      return {
        canSpeak: true,
        canVideo: true,
        canChat: true,
        canScreenShare: true
      };
    case 'student':
    default:
      return {
        canSpeak: this.allowStudentMic || false,
        canVideo: this.allowStudentCamera || false,
        canChat: this.allowChat || true,
        canScreenShare: false
      };
  }
};

// Instance method to remove participant
LiveClassSchema.methods.removeParticipant = function(userId) {
  const participant = this.participants.find(
    p => p.user.toString() === userId.toString()
  );
  
  if (participant && participant.isCurrentlyConnected) {
    participant.leftAt = new Date();
    participant.isCurrentlyConnected = false;
    
    // Calculate session duration
    if (participant.joinedAt) {
      const sessionDuration = Math.floor((participant.leftAt - participant.joinedAt) / 1000);
      participant.totalDuration += sessionDuration;
    }
    
    this.currentParticipants = Math.max(0, this.currentParticipants - 1);
  }
  
  return this.save();
};

// Static method to get upcoming classes for a teacher
LiveClassSchema.statics.getUpcomingClassesForTeacher = function(teacherId, limit = 10) {
  return this.find({
    teacher: teacherId,
    status: { $in: ['scheduled', 'live'] },
    scheduledAt: { $gte: new Date() },
    isActive: true
  })
  .populate('section', 'name capacity')
  .populate('course', 'title courseCode')
  .sort({ scheduledAt: 1 })
  .limit(limit);
};

// Static method to get upcoming classes for a section
LiveClassSchema.statics.getUpcomingClassesForSection = function(sectionId, limit = 10) {
  return this.find({
    section: sectionId,
    status: { $in: ['scheduled', 'live'] },
    scheduledAt: { $gte: new Date() },
    isActive: true
  })
  .populate('teacher', 'name email')
  .populate('course', 'title courseCode')
  .sort({ scheduledAt: 1 })
  .limit(limit);
};

// Static method to get live classes with multi-section support
LiveClassSchema.statics.getLiveClasses = function() {
  return this.find({
    status: 'live',
    isActive: true
  })
  .populate('teacher', 'name email')
  .populate('sections', 'name capacity')
  .populate('section', 'name capacity') // Backward compatibility
  .populate('course', 'title courseCode');
};

// Enhanced static method for merged classes
LiveClassSchema.statics.getClassesForSections = function(sectionIds, limit = 10) {
  return this.find({
    $or: [
      { sections: { $in: sectionIds } },
      { section: { $in: sectionIds } }
    ],
    status: { $in: ['scheduled', 'live'] },
    isActive: true
  })
  .populate('teacher', 'name email')
  .populate('sections', 'name capacity')
  .populate('section', 'name capacity')
  .populate('course', 'title courseCode')
  .sort({ scheduledAt: 1 })
  .limit(limit);
};

// Static method to verify access token and get class
LiveClassSchema.statics.getClassByAccessToken = function(accessToken) {
  return this.findOne({
    accessToken: accessToken,
    isActive: true
  })
  .populate('teacher', 'name email')
  .populate('sections', 'name capacity students')
  .populate('course', 'title courseCode')
  .populate('school', 'name')
  .populate('department', 'name');
};

// Enhanced multi-role access control
LiveClassSchema.statics.canUserAccessClass = function(classData, user) {
  // Teacher who created the class
  if (classData.teacher._id.toString() === user._id.toString()) {
    return { 
      canAccess: true, 
      role: 'teacher',
      permissions: {
        canSpeak: true,
        canVideo: true,
        canChat: true,
        canScreenShare: true,
        canRecord: true,
        canMuteAll: true,
        canEndClass: true,
        bypassWaitingRoom: true
      }
    };
  }
  
  // Auto-allow roles (HOD, Dean, Admin) - they can join anytime
  if (classData.autoAllowRoles && classData.autoAllowRoles.includes(user.role)) {
    return {
      canAccess: true,
      role: user.role,
      permissions: {
        canSpeak: true,
        canVideo: true,
        canChat: true,
        canScreenShare: true,
        canRecord: ['hod', 'dean', 'admin'].includes(user.role),
        canMuteAll: ['hod', 'dean', 'admin'].includes(user.role),
        canEndClass: ['hod', 'dean', 'admin'].includes(user.role),
        bypassWaitingRoom: true
      }
    };
  }
  
  // Students - check section enrollment
  if (user.role === 'student') {
    const userSections = user.assignedSections || [];
    const classSectionIds = [];
    
    // Check both sections array and single section
    if (classData.sections && classData.sections.length > 0) {
      classSectionIds.push(...classData.sections.map(s => s._id ? s._id.toString() : s.toString()));
    }
    if (classData.section) {
      const sectionId = classData.section._id ? classData.section._id.toString() : classData.section.toString();
      if (!classSectionIds.includes(sectionId)) {
        classSectionIds.push(sectionId);
      }
    }
    
    const hasAccess = userSections.some(sectionId => 
      classSectionIds.includes(sectionId.toString())
    );
    
    if (!hasAccess) {
      return { canAccess: false, reason: 'Student not enrolled in class sections' };
    }
    
    return { 
      canAccess: true, 
      role: 'student',
      permissions: {
        canSpeak: classData.allowStudentMic || false,
        canVideo: classData.allowStudentCamera || false,
        canChat: classData.allowChat !== false,
        canScreenShare: false,
        canRecord: false,
        canMuteAll: false,
        canEndClass: false,
        bypassWaitingRoom: false
      }
    };
  }
  
  return { canAccess: false, reason: 'Unauthorized access' };
};

module.exports = mongoose.model('LiveClass', LiveClassSchema);