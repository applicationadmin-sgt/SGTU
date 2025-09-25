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
  
  // Participants
  participants: [{
    student: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User',
      required: true
    },
    joinedAt: { type: Date },
    leftAt: { type: Date },
    totalDuration: { type: Number, default: 0 }, // in seconds
    isCurrentlyConnected: { type: Boolean, default: false }
  }],
  
  // WebRTC Connection Details
  roomId: { 
    type: String, 
    unique: true,
    required: true,
    index: true
  },
  maxParticipants: { 
    type: Number, 
    default: 100 // Based on section capacity
  },
  currentParticipants: { 
    type: Number, 
    default: 0 
  },
  
  // Recording information
  isRecording: { 
    type: Boolean, 
    default: false 
  },
  recordingStartTime: { type: Date },
  recordingEndTime: { type: Date },
  recordingPath: { type: String }, // Server file path for the recording
  recordingUrl: { type: String }, // URL to access the recording
  recordingSize: { type: Number }, // File size in bytes
  recordingDuration: { type: Number }, // Duration in seconds
  
  // Settings
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
    default: false 
  },
  
  // Chat messages (optional - for simple text chat)
  chatMessages: [{
    sender: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User',
      required: true
    },
    message: { 
      type: String, 
      required: true,
      maxlength: 500
    },
    timestamp: { 
      type: Date, 
      default: Date.now 
    },
    isFromTeacher: { 
      type: Boolean, 
      default: false 
    }
  }],
  
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

// Pre-save middleware to calculate estimated end time
LiveClassSchema.pre('save', function(next) {
  if (this.isModified('scheduledAt') || this.isModified('duration')) {
    this.estimatedEndTime = new Date(this.scheduledAt.getTime() + (this.duration * 60 * 1000));
  }
  
  // Generate unique room ID if not exists
  if (this.isNew && !this.roomId) {
    this.roomId = `lc_${this._id}_${Date.now()}`;
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

// Instance method to add participant
LiveClassSchema.methods.addParticipant = function(studentId) {
  const existingParticipant = this.participants.find(
    p => p.student.toString() === studentId.toString()
  );
  
  if (!existingParticipant) {
    this.participants.push({
      student: studentId,
      joinedAt: new Date(),
      isCurrentlyConnected: true
    });
    this.currentParticipants += 1;
  } else if (!existingParticipant.isCurrentlyConnected) {
    existingParticipant.joinedAt = new Date();
    existingParticipant.isCurrentlyConnected = true;
    this.currentParticipants += 1;
  }
  
  return this.save();
};

// Instance method to remove participant
LiveClassSchema.methods.removeParticipant = function(studentId) {
  const participant = this.participants.find(
    p => p.student.toString() === studentId.toString()
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

// Static method to get live classes
LiveClassSchema.statics.getLiveClasses = function() {
  return this.find({
    status: 'live',
    isActive: true
  })
  .populate('teacher', 'name email')
  .populate('section', 'name')
  .populate('course', 'title courseCode');
};

module.exports = mongoose.model('LiveClass', LiveClassSchema);