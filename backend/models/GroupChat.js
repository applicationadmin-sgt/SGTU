const mongoose = require('mongoose');

const groupChatSchema = new mongoose.Schema({
  courseId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Course', 
    required: true,
    index: true
  },
  sectionId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Section', 
    required: true,
    index: true
  },
  senderId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true
  },
  message: { 
    type: String, 
    required: true,
    maxlength: 1000 // Limiting to ~200 words (average 5 chars per word)
  },
  timestamp: { 
    type: Date, 
    default: Date.now,
    index: true
  },
  isDeleted: { 
    type: Boolean, 
    default: false 
  },
  deletedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  deletedAt: { 
    type: Date 
  }
}, {
  timestamps: true
});

// Compound index for efficient queries by course and section
groupChatSchema.index({ courseId: 1, sectionId: 1, timestamp: -1 });

// Index for filtering non-deleted messages
groupChatSchema.index({ isDeleted: 1 });

// Method to check if user can delete this message
groupChatSchema.methods.canDelete = function(user) {
  // Admin, Dean, HOD can delete any message
  if (['admin', 'dean', 'hod', 'superadmin'].some(role => user.roles && user.roles.includes(role))) {
    return true;
  }
  
  // Users can delete their own messages (optional feature)
  return this.senderId.toString() === user._id.toString();
};

// Static method to get chat room identifier
groupChatSchema.statics.getRoomId = function(courseId, sectionId) {
  return `chat_${courseId}_${sectionId}`;
};

// Virtual to populate sender details without password
groupChatSchema.virtual('senderDetails', {
  ref: 'User',
  localField: 'senderId',
  foreignField: '_id',
  justOne: true,
  select: 'name regNo teacherId roles primaryRole -password'
});

// Ensure virtual fields are serialized
groupChatSchema.set('toJSON', { virtuals: true });
groupChatSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('GroupChat', groupChatSchema);