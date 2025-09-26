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

  // HOD unlock tracking (new level between teacher and dean)
  hodUnlockCount: {
    type: Number,
    default: 0,
    min: 0
  },
  hodUnlockHistory: [{
    hodId: {
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

  // Admin unlock tracking (ultimate override authority)
  adminUnlockCount: {
    type: Number,
    default: 0,
    min: 0
  },
  adminUnlockHistory: [{
    adminId: {
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
    notes: String,
    overrideLevel: {
      type: String,
      enum: ['TEACHER', 'HOD', 'DEAN'],
      required: true
    },
    lockReason: {
      type: String,
      required: true
    }
  }],
  
  // Current authorization level required for unlock
  unlockAuthorizationLevel: {
    type: String,
    enum: ['TEACHER', 'HOD', 'DEAN'],
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

// Virtual for remaining HOD unlocks
quizLockSchema.virtual('remainingHodUnlocks').get(function() {
  return Math.max(0, 3 - this.hodUnlockCount);
});

// Virtual for whether teacher can still unlock
quizLockSchema.virtual('canTeacherUnlock').get(function() {
  return this.isLocked && this.unlockAuthorizationLevel === 'TEACHER' && this.teacherUnlockCount < 3;
});

// Virtual for whether HOD can still unlock
quizLockSchema.virtual('canHodUnlock').get(function() {
  return this.isLocked && this.unlockAuthorizationLevel === 'HOD' && this.hodUnlockCount < 3;
});

// Virtual for whether HOD unlock is required
quizLockSchema.virtual('requiresHodUnlock').get(function() {
  return this.isLocked && this.unlockAuthorizationLevel === 'HOD';
});

// Virtual for whether dean unlock is required
quizLockSchema.virtual('requiresDeanUnlock').get(function() {
  return this.isLocked && this.unlockAuthorizationLevel === 'DEAN';
});

// Methods
quizLockSchema.methods.lockQuiz = function(reason, score = null, passingScore = null) {
  this.isLocked = true;
  this.failureReason = reason;
  this.lockTimestamp = new Date();
  this.lastFailureScore = score;
  if (passingScore !== null) this.passingScore = passingScore;
  
  // Set authorization level based on unlock history
  // Teacher → HOD → Dean escalation flow
  if (this.teacherUnlockCount >= 3 && this.hodUnlockCount >= 3) {
    // Both teacher and HOD limits exceeded → Dean level
    this.unlockAuthorizationLevel = 'DEAN';
  } else if (this.teacherUnlockCount >= 3) {
    // Teacher limit exceeded → HOD level
    this.unlockAuthorizationLevel = 'HOD';
  } else {
    // Initial failure or teacher unlocks available → Teacher level
    this.unlockAuthorizationLevel = 'TEACHER';
  }
  
  return this.save();
};

// Method to ensure authorization level is correct based on unlock history
quizLockSchema.methods.updateAuthorizationLevel = function() {
  if (!this.isLocked) return this; // No need to update if not locked
  
  // Determine correct authorization level based on unlock history
  if (this.teacherUnlockCount >= 3 && this.hodUnlockCount >= 3) {
    // Both teacher and HOD limits exceeded → Dean level
    this.unlockAuthorizationLevel = 'DEAN';
  } else if (this.teacherUnlockCount >= 3) {
    // Teacher limit exceeded → HOD level  
    this.unlockAuthorizationLevel = 'HOD';
  } else {
    // Teacher unlocks available → Teacher level
    this.unlockAuthorizationLevel = 'TEACHER';
  }
  
  return this;
};

quizLockSchema.methods.unlockByTeacher = function(teacherId, reason, notes = '') {
  if (this.teacherUnlockCount >= 3) {
    throw new Error('Teacher unlock limit exceeded. HOD authorization required.');
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
  // After 3 teacher unlocks, escalate to HOD level
  if (this.teacherUnlockCount >= 3) {
    this.unlockAuthorizationLevel = 'HOD';
  }
  
  return this.save();
};

quizLockSchema.methods.unlockByHOD = function(hodId, reason, notes = '') {
  if (this.unlockAuthorizationLevel !== 'HOD') {
    throw new Error('HOD unlock not authorized at this level.');
  }
  
  if (this.hodUnlockCount >= 3) {
    throw new Error('HOD unlock limit exceeded. Dean authorization required.');
  }
  
  this.isLocked = false;
  this.hodUnlockCount += 1;
  this.hodUnlockHistory.push({
    hodId,
    reason,
    notes,
    unlockTimestamp: new Date()
  });
  
  // After HOD unlocks reach limit, escalate to Dean level for FUTURE locks
  if (this.hodUnlockCount >= 3) {
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
  
  // Dean has unlimited unlock authority
  return this.save();
};

quizLockSchema.methods.recordAttempt = function(score) {
  this.totalAttempts += 1;
  this.lastAttemptScore = score;
  this.lastAttemptTimestamp = new Date();
  
  return this.save();
};

quizLockSchema.methods.unlockByAdmin = function(adminId, reason, notes = '') {
  // Admin can unlock at any authorization level and for any reason
  this.isLocked = false;
  this.adminUnlockCount = (this.adminUnlockCount || 0) + 1;
  
  // Initialize adminUnlockHistory if it doesn't exist
  if (!this.adminUnlockHistory) {
    this.adminUnlockHistory = [];
  }
  
  this.adminUnlockHistory.push({
    adminId,
    reason,
    notes,
    unlockTimestamp: new Date(),
    overrideLevel: this.unlockAuthorizationLevel, // Record what level was overridden
    lockReason: this.failureReason // Record what type of lock was overridden
  });
  
  // Reset authorization level to teacher for next potential lock
  this.unlockAuthorizationLevel = 'TEACHER';
  
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
  // First, update authorization levels for all locked students
  const allLockedStudents = await this.find({ isLocked: true });
  
  for (const lock of allLockedStudents) {
    const originalLevel = lock.unlockAuthorizationLevel;
    lock.updateAuthorizationLevel();
    
    if (lock.unlockAuthorizationLevel !== originalLevel) {
      await lock.save();
      console.log(`Updated authorization level for student ${lock.studentId}: ${originalLevel} → ${lock.unlockAuthorizationLevel}`);
    }
  }
  
  // Now return only Dean-level locks
  return this.find({
    isLocked: true,
    unlockAuthorizationLevel: 'DEAN'
  });
};

quizLockSchema.statics.getLockedStudentsForHOD = async function(hodId) {
  // Find students in courses from HOD's department
  const User = require('./User');
  const Course = require('./Course');
  
  const hod = await User.findById(hodId).populate('department');
  if (!hod || !hod.department) {
    return [];
  }
  
  // Find courses in HOD's department
  const departmentCourses = await Course.find({ 
    department: hod.department._id 
  }).select('_id');
  
  const courseIds = departmentCourses.map(course => course._id);
  
  // First, update authorization levels for all locked students in this department
  const allDeptLockedStudents = await this.find({ 
    isLocked: true,
    courseId: { $in: courseIds }
  });
  
  for (const lock of allDeptLockedStudents) {
    const originalLevel = lock.unlockAuthorizationLevel;
    lock.updateAuthorizationLevel();
    
    if (lock.unlockAuthorizationLevel !== originalLevel) {
      await lock.save();
      console.log(`Updated authorization level for student ${lock.studentId}: ${originalLevel} → ${lock.unlockAuthorizationLevel}`);
    }
  }
  
  // Now return only HOD-level locks in this department
  return this.find({
    isLocked: true,
    unlockAuthorizationLevel: 'HOD',
    courseId: { $in: courseIds }
  });
};

module.exports = mongoose.model('QuizLock', quizLockSchema);