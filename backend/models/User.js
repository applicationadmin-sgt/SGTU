const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  regNo: { type: String, unique: true, sparse: true, index: true }, // Only for students - unique and sparse to allow null values
  teacherId: { type: String, unique: true, sparse: true, index: true }, // Only for teachers - unique and sparse
  name: { type: String, required: true },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true,
    set: v => v.toLowerCase() // Convert email to lowercase before saving
  },
  password: { type: String, required: true },
  // Multi-role system - each user can have multiple roles
  roles: [{ 
    type: String, 
    enum: ['admin', 'teacher', 'student', 'dean', 'hod', 'cc', 'superadmin']
  }],
  primaryRole: { 
    type: String, 
    enum: ['admin', 'teacher', 'student', 'dean', 'hod', 'cc', 'superadmin']
  },
  
  // Role-specific assignments - each role can have different school/department contexts
  roleAssignments: [{
    role: { 
      type: String, 
      enum: ['admin', 'teacher', 'student', 'dean', 'hod', 'cc', 'superadmin'],
      required: true
    },
    school: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'School'
    },
    departments: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Department'
    }],
    // For dean role: multiple schools they oversee
    schools: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'School'
    }],
    isActive: { type: Boolean, default: true },
    assignedAt: { type: Date, default: Date.now }
  }],
  
  // Legacy field for backward compatibility (will be removed after migration)
  role: { type: String, enum: ['admin', 'teacher', 'student', 'dean', 'hod', 'cc', 'superadmin'] },
  permissions: [{ type: String }], // e.g., ['manage_teachers', 'manage_students']
  
  // Hierarchy fields
  school: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'School',
    required: function() {
      // School is required for all roles except admin and superadmin
      return this.role !== 'admin' && this.role !== 'superadmin' && 
             (!this.roles || (!this.roles.includes('admin') && !this.roles.includes('superadmin')));
    },
    index: true
  },
  department: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Department',
    index: true
  },
  departments: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Department',
    index: true
  }],
  
  // Legacy field - courses are now assigned through sections
  coursesAssigned: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course', index: true }],
  
  // Section assignments (students and teachers get courses through sections)
  assignedSections: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Section', index: true }],
  
  watchHistory: [{
    video: { type: mongoose.Schema.Types.ObjectId, ref: 'Video' },
    timeSpent: { type: Number, default: 0 }, // in seconds
    lastWatched: { type: Date },
    currentPosition: { type: Number, default: 0 }, // Current playback position in seconds
    playbackRate: { type: Number, default: 1 } // Playback speed (1x, 1.5x, 2x, etc.)
  }],
  isActive: { type: Boolean, default: true },
  canAnnounce: { type: Boolean, default: false }, // Allow teacher to post announcements
  emailVerified: { type: Boolean, default: false },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date }
}, {
  timestamps: true
});

// Compound index for fast search by regNo and email
userSchema.index({ regNo: 1, email: 1 });
userSchema.index({ role: 1, school: 1 });
userSchema.index({ role: 1, department: 1 });

// Virtual to get courses through sections
userSchema.virtual('coursesFromSections', {
  ref: 'Section',
  localField: 'assignedSections',
  foreignField: '_id',
  justOne: false
});

// Ensure email is always lowercase before saving
userSchema.pre('save', async function(next) {
  if (this.isModified('email')) {
    this.email = this.email.toLowerCase();
  }
  
  // Set default values for multi-role system (backward compatibility)
  if (this.isNew) {
    // If roles array is empty but role field exists, populate roles from role
    if ((!this.roles || this.roles.length === 0) && this.role) {
      this.roles = [this.role];
    }
    
    // If primaryRole is not set but role field exists, set it
    if (!this.primaryRole && this.role) {
      this.primaryRole = this.role;
    }
    
    // If role field is not set but roles array exists, set role from primary
    if (!this.role && this.roles && this.roles.length > 0) {
      this.role = this.primaryRole || this.roles[0];
    }
  }
  
  // Generate teacherId for new teacher accounts
  if (this.isNew && ((this.role === 'teacher') || (this.roles && this.roles.includes('teacher'))) && !this.teacherId) {
    try {
      // Find the highest existing teacherId
      const highestTeacher = await this.constructor.findOne(
        { teacherId: { $regex: /^T\d{4}$/ } },
        { teacherId: 1 },
        { sort: { teacherId: -1 } }
      );

      let nextNumber = 1;
      if (highestTeacher && highestTeacher.teacherId) {
        // Extract the number from existing ID and increment
        const currentNumber = parseInt(highestTeacher.teacherId.substring(1), 10);
        nextNumber = currentNumber + 1;
      }

      // Format with leading zeros to ensure 4 digits
      this.teacherId = 'T' + nextNumber.toString().padStart(4, '0');
    } catch (err) {
      return next(err);
    }
  }
  
  next();
});

module.exports = mongoose.model('User', userSchema);
