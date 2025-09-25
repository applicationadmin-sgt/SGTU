const mongoose = require('mongoose');

const quizLockSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  
  // Lock status and failure tracking
  isLocked: {
    type: Boolean,
    default: false
  },
  failureReason: {
    type: String,
    enum: ['BELOW_PASSING_SCORE', 'SECURITY_VIOLATION', 'TIME_EXCEEDED', 'MANUAL_LOCK'],
    required: function() { return this.isLocked; }
  },
  lastFailureScore: {
    type: Number,
    min: 0,
    max: 100
  },
  passingScore: {
    type: Number,
    min: 0,
    max: 100,
    required: true
  },
  lockTimestamp: {
    type: Date,
    default: Date.now
  },
  
  // Teacher unlock tracking
  teacherUnlockCount: {
    type: Number,
    default: 0,
    min: 0,
    max: 3
  },
  teacherUnlockHistory: [{
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    unlockTimestamp: {
      type: Date,
      default: Date.now
    },
    reason: {
      type: String,
      required: true
    },
    notes: String
  }],
  
  // Dean unlock tracking
  deanUnlockCount: {
    type: Number,
    default: 0,
    min: 0
  },
  deanUnlockHistory: [{
    deanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    unlockTimestamp: {
      type: Date,
      default: Date.now
    },
    reason: {
      type: String,
      required: true
    },
    notes: String
  }],
  
  // Current authorization level required for unlock
  unlockAuthorizationLevel: {
    type: String,
    enum: ['TEACHER', 'DEAN'],
    default: 'TEACHER'
  },
  
  // Attempt tracking
  totalAttempts: {
    type: Number,
    default: 0
  },
  lastAttemptScore: {
    type: Number,
    min: 0,
    max: 100
  },
  lastAttemptTimestamp: Date,
  
  // Notifications
  notificationsSent: [{
    type: {
      type: String,
      enum: ['STUDENT_LOCKED', 'TEACHER_UNLOCK_NEEDED', 'DEAN_UNLOCK_NEEDED', 'UNLOCK_GRANTED']
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }]
}, {
  timestamps: true
});

// Compound index to ensure one lock record per student-quiz combination
quizLockSchema.index({ studentId: 1, quizId: 1 }, { unique: true });

// Index for efficient querying
quizLockSchema.index({ courseId: 1, isLocked: 1 });
quizLockSchema.index({ unlockAuthorizationLevel: 1, isLocked: 1 });

// Virtual for remaining teacher unlocks
quizLockSchema.virtual('remainingTeacherUnlocks').get(function() {
  return Math.max(0, 3 - this.teacherUnlockCount);
});

// Virtual for whether teacher can still unlock
quizLockSchema.virtual('canTeacherUnlock').get(function() {
  return this.isLocked && this.unlockAuthorizationLevel === 'TEACHER' && this.teacherUnlockCount < 3;
});

// Virtual for whether dean unlock is required
quizLockSchema.virtual('requiresDeanUnlock').get(function() {
  return this.isLocked && (this.unlockAuthorizationLevel === 'DEAN' || this.teacherUnlockCount >= 3);
});

// Methods
quizLockSchema.methods.lockQuiz = function(reason, score = null, passingScore = null) {
  this.isLocked = true;
  this.failureReason = reason;
  this.lockTimestamp = new Date();
  this.lastFailureScore = score;
  if (passingScore !== null) this.passingScore = passingScore;
  
  // Set authorization level based on teacher unlock count
  this.unlockAuthorizationLevel = this.teacherUnlockCount >= 3 ? 'DEAN' : 'TEACHER';
  
  return this.save();
};

quizLockSchema.methods.unlockByTeacher = function(teacherId, reason, notes = '') {
  if (this.teacherUnlockCount >= 3) {
    throw new Error('Teacher unlock limit exceeded. Dean authorization required.');
  }
  
  this.isLocked = false;
  this.teacherUnlockCount += 1;
  this.teacherUnlockHistory.push({
    teacherId,
    reason,
    notes,
    unlockTimestamp: new Date()
  });
  
  // Update authorization level for next potential lock
  if (this.teacherUnlockCount >= 3) {
    this.unlockAuthorizationLevel = 'DEAN';
  }
  
  return this.save();
};

quizLockSchema.methods.unlockByDean = function(deanId, reason, notes = '') {
  this.isLocked = false;
  this.deanUnlockCount += 1;
  this.deanUnlockHistory.push({
    deanId,
    reason,
    notes,
    unlockTimestamp: new Date()
  });
  
  return this.save();
};

quizLockSchema.methods.recordAttempt = function(score) {
  this.totalAttempts += 1;
  this.lastAttemptScore = score;
  this.lastAttemptTimestamp = new Date();
  
  return this.save();
};

// Static methods
quizLockSchema.statics.getOrCreateLock = async function(studentId, quizId, courseId, passingScore) {
  let lock = await this.findOne({ studentId, quizId });
  
  if (!lock) {
    lock = new this({
      studentId,
      quizId,
      courseId,
      passingScore
    });
    await lock.save();
  }
  
  return lock;
};

quizLockSchema.statics.getLockedStudentsByTeacher = async function(teacherId) {
  // Teachers are assigned to courses through sections, not directly to courses
  // Find sections where teacher is assigned and get students and courses from those sections
  const Section = require('./Section');
  
  const sections = await Section.find({
    $or: [
      { teacher: teacherId }, // Legacy single teacher field
      { teachers: teacherId } // New multiple teachers field
    ]
  });
  
  // Get course IDs and student IDs from teacher's sections
  const sectionCourseIds = [];
  const sectionStudentIds = [];
  
  for (const section of sections) {
    if (section.courses) {
      sectionCourseIds.push(...section.courses);
    }
    if (section.students) {
      sectionStudentIds.push(...section.students);
    }
  }
  
  // Find locked students who are either:
  // 1. In courses taught by this teacher through sections, OR
  // 2. Directly in the teacher's sections (even if different course)
  const query = {
    isLocked: true,
    unlockAuthorizationLevel: 'TEACHER',
    $or: [
      { courseId: { $in: sectionCourseIds } }, // Students in courses taught by teacher
      { studentId: { $in: sectionStudentIds } } // Students in teacher's sections
    ]
  };
  
  return this.find(query);
};

quizLockSchema.statics.getLockedStudentsForDean = async function() {
  return this.find({
    isLocked: true,
    unlockAuthorizationLevel: 'DEAN'
  });
};

module.exports = mongoose.model('QuizLock', quizLockSchema);