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
  deleted: { 
    type: Boolean, 
    default: false 
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
  },
  editedAt: { 
    type: Date 
  },
  flagged: { 
    type: Boolean, 
    default: false 
  },
  flaggedReason: { 
    type: String 
  }
}, {
  timestamps: true,
  collection: 'groupchats'
});

// Compound indexes for efficient queries
groupChatSchema.index({ courseId: 1, sectionId: 1, timestamp: -1 });
groupChatSchema.index({ senderId: 1, timestamp: -1 });
groupChatSchema.index({ isDeleted: 1, timestamp: -1 });

// Method to check if a user can delete this message
groupChatSchema.methods.canDelete = function(user) {
  if (!user) return false;
  
  // Admin, Dean, and HOD can delete any message
  if (user.roles && (
    user.roles.includes('admin') || 
    user.roles.includes('dean') || 
    user.roles.includes('hod')
  )) {
    return true;
  }
  
  // Users can delete their own messages within 5 minutes
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  if (this.senderId.toString() === user._id.toString() && this.timestamp > fiveMinutesAgo) {
    return true;
  }
  
  return false;
};

// Method to check if user can see delete button
groupChatSchema.methods.canShowDeleteButton = function(user) {
  if (!user) return false;
  
  // Admin, Dean, and HOD can always see delete button
  if (user.roles && (
    user.roles.includes('admin') || 
    user.roles.includes('dean') || 
    user.roles.includes('hod')
  )) {
    return true;
  }
  
  return false;
};

// Static method for content filtering
groupChatSchema.statics.filterContent = function(message) {
  const vulgarWords = [
    // English vulgar words
    'fuck', 'shit', 'damn', 'bitch', 'asshole', 'bastard', 'crap', 'piss',
    'whore', 'slut', 'stupid', 'idiot', 'moron', 'retard', 'gay', 'lesbian',
    // Bengali vulgar words (common ones)
    'chuda', 'magir', 'bal', 'khankir', 'tor ma', 'kuttar baccha', 'haramjada',
    'madarchod', 'bhenchod', 'randi', 'gadha', 'ullu', 'pagol', 'mitchil',
    // Hindi vulgar words (common ones)  
    'madarchod', 'behenchod', 'chutiya', 'randi', 'harami', 'kamina', 'gadha',
    'bakchod', 'gaandu', 'kutte', 'saala', 'bhosadi', 'lauda', 'lund'
  ];

  let filteredMessage = message.toLowerCase();
  let flagged = false;
  let flaggedWords = [];

  vulgarWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    if (regex.test(filteredMessage)) {
      flagged = true;
      flaggedWords.push(word);
      filteredMessage = filteredMessage.replace(regex, '*'.repeat(word.length));
    }
  });

  return {
    original: message,
    filtered: filteredMessage,
    flagged: flagged,
    flaggedWords: flaggedWords
  };
};

// Virtual for display name logic (for backward compatibility)
groupChatSchema.virtual('senderName').get(function() {
  if (this.senderId && this.senderId.name) {
    return this.senderId.name;
  }
  return 'Unknown User';
});

// Ensure virtual fields are serialized
groupChatSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('GroupChat', groupChatSchema);