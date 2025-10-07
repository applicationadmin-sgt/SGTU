const LiveClass = require('../models/LiveClass');
const Section = require('../models/Section');
const Course = require('../models/Course');
const User = require('../models/User');
const SectionCourseTeacher = require('../models/SectionCourseTeacher');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs').promises;

// Helper function to check if teacher can access section/course
const canTeacherAccessSectionCourse = async (teacherId, sectionId, courseId) => {
  // Check if teacher is assigned to this section-course combination
  const assignment = await SectionCourseTeacher.findOne({
    teacher: teacherId,
    section: sectionId,
    course: courseId,
    isActive: true
  });
  
  // Also check if teacher is a course coordinator
  const course = await Course.findById(courseId);
  const isCoordinator = course && course.coordinators && 
    course.coordinators.some(coord => coord.toString() === teacherId.toString());
  
  return assignment || isCoordinator;
};

// Schedule a new live class
exports.scheduleClass = async (req, res) => {
  try {
    console.log('📅 === SCHEDULE CLASS REQUEST ===');
    console.log('📅 User ID:', req.user?._id);
    console.log('📅 User role:', req.user?.role);
    console.log('📅 Request body:', req.body);
    
    const {
      title,
      description,
      sectionId,
      courseId,
      scheduledAt,
      duration,
      allowStudentMic,
      allowStudentCamera,
      allowChat,
      requireApprovalToJoin
    } = req.body;
    
    const teacherId = req.user._id;
    
    console.log('📅 Scheduling live class:', {
      title,
      teacherId,
      sectionId,
      courseId,
      scheduledAt
    });
    
    // Validate required fields
    if (!title || !sectionId || !courseId || !scheduledAt || !duration) {
      return res.status(400).json({
        success: false,
        message: 'Title, section, course, scheduled time, and duration are required'
      });
    }
    
    // Validate duration (15 minutes to 3 hours)
    if (duration < 15 || duration > 180) {
      return res.status(400).json({
        success: false,
        message: 'Duration must be between 15 and 180 minutes'
      });
    }
    
    // Check if teacher can access this section-course combination
    const hasAccess = await canTeacherAccessSectionCourse(teacherId, sectionId, courseId);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to create classes for this section and course'
      });
    }
    
    // Get section details
    const section = await Section.findById(sectionId)
      .populate('school')
      .populate('department');
    
    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section not found'
      });
    }
    
    // Check if scheduled time is in the future
    const scheduledTime = new Date(scheduledAt);
    if (scheduledTime <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Scheduled time must be in the future'
      });
    }
    
    // Check for conflicts with existing classes
    const estimatedEndTime = new Date(scheduledTime.getTime() + (duration * 60 * 1000));
    const conflictingClass = await LiveClass.findOne({
      $or: [
        { teacher: teacherId },
        { section: sectionId }
      ],
      status: { $in: ['scheduled', 'live'] },
      $or: [
        {
          scheduledAt: { $lt: estimatedEndTime },
          estimatedEndTime: { $gt: scheduledTime }
        }
      ],
      isActive: true
    });
    
    if (conflictingClass) {
      return res.status(409).json({
        success: false,
        message: 'There is a scheduling conflict with another class'
      });
    }
    
    // Create the live class
    const liveClass = new LiveClass({
      title,
      description,
      teacher: teacherId,
      section: sectionId,
      course: courseId,
      school: section.school._id,
      department: section.department?._id,
      scheduledAt: scheduledTime,
      duration,
      estimatedEndTime: new Date(scheduledTime.getTime() + (duration * 60 * 1000)),
      allowStudentMic: allowStudentMic || false,
      allowStudentCamera: allowStudentCamera || false,
      allowChat: allowChat !== false, // Default true
      requireApprovalToJoin: requireApprovalToJoin || false,
      maxParticipants: section.capacity || 100,
      createdBy: teacherId,
      // Let pre-save middleware generate these
      sections: [sectionId], // Add sections array for enhanced functionality
      autoAllowRoles: ['hod', 'dean', 'admin'] // Enable multi-role access
    });
    
    await liveClass.save();
    
    // Populate response data
    await liveClass.populate([
      { path: 'teacher', select: 'name email teacherId' },
      { path: 'section', select: 'name capacity' },
      { path: 'course', select: 'title courseCode' }
    ]);
    
    console.log('✅ Live class scheduled successfully:', liveClass._id);
    
    res.status(201).json({
      success: true,
      message: 'Live class scheduled successfully',
      liveClass
    });
    
  } catch (error) {
    console.error('❌ Error scheduling live class:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to schedule live class',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get live classes for a teacher
exports.getTeacherClasses = async (req, res) => {
  try {
    const teacherId = req.user._id;
    const { status, limit = 20, page = 1 } = req.query;
    
    console.log('👨‍🏫 Getting live classes for teacher:', teacherId);
    
    // Build query
    const query = {
      teacher: teacherId,
      isActive: true
    };
    
    if (status && ['scheduled', 'live', 'completed', 'cancelled'].includes(status)) {
      query.status = status;
    }
    
    // Get total count
    const total = await LiveClass.countDocuments(query);
    
    // Get classes with pagination
    const classes = await LiveClass.find(query)
      .populate('section', 'name capacity')
      .populate('course', 'title courseCode')
      .sort({ scheduledAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    res.json({
      success: true,
      classes,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('❌ Error getting teacher classes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get classes',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get live classes for a student (based on their sections)
exports.getStudentClasses = async (req, res) => {
  try {
    const studentId = req.user._id;
    const { status, limit = 20, page = 1 } = req.query;
    
    console.log('👨‍🎓 Getting live classes for student:', studentId);
    
    // Get student's sections
    const student = await User.findById(studentId).populate('assignedSections');
    if (!student || !student.assignedSections || student.assignedSections.length === 0) {
      return res.json({
        success: true,
        classes: [],
        pagination: { total: 0, page: 1, limit: parseInt(limit), pages: 0 }
      });
    }
    
    const sectionIds = student.assignedSections.map(section => section._id);
    
    // Build query
    const query = {
      section: { $in: sectionIds },
      isActive: true
    };
    
    if (status && ['scheduled', 'live', 'completed', 'cancelled'].includes(status)) {
      query.status = status;
    }
    
    // Get total count
    const total = await LiveClass.countDocuments(query);
    
    // Get classes with pagination
    const classes = await LiveClass.find(query)
      .populate('teacher', 'name email')
      .populate('section', 'name')
      .populate('course', 'title courseCode')
      .sort({ scheduledAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    const response = {
      success: true,
      classes,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    };
    
    console.log('✅ Sending student classes response:', {
      studentId,
      classCount: classes.length,
      total,
      success: true
    });
    
    res.json(response);
    
  } catch (error) {
    console.error('❌ Error getting student classes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get classes',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get specific live class details
exports.getClassDetails = async (req, res) => {
  try {
    const { classId } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;
    
    console.log('🔍 Getting class details:', { classId, userId, userRole });
    
    const liveClass = await LiveClass.findById(classId)
      .populate('teacher', 'name email teacherId')
      .populate('section', 'name capacity students')
      .populate('course', 'title courseCode')
      .populate('participants.user', 'name email regNo');
    
    if (!liveClass) {
      return res.status(404).json({
        success: false,
        message: 'Live class not found'
      });
    }
    
    // Check authorization
    let hasAccess = false;
    
    if (userRole === 'admin') {
      hasAccess = true;
    } else if (userRole === 'teacher') {
      hasAccess = liveClass.teacher._id.toString() === userId.toString();
    } else if (userRole === 'student') {
      // Check if student is in the section
      hasAccess = liveClass.section.students.some(
        studentId => studentId.toString() === userId.toString()
      );
    }
    
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to access this class'
      });
    }
    
    // Remove sensitive data for students
    if (userRole === 'student') {
      delete liveClass.participants;
      delete liveClass.chatMessages;
    }
    
    res.json({
      success: true,
      liveClass
    });
    
  } catch (error) {
    console.error('❌ Error getting class details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get class details',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Start a live class
exports.startClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const teacherId = req.user._id;
    
    console.log('▶️ Starting live class:', { classId, teacherId });
    
    const liveClass = await LiveClass.findById(classId);
    
    if (!liveClass) {
      return res.status(404).json({
        success: false,
        message: 'Live class not found'
      });
    }
    
    // Check if teacher owns this class
    if (liveClass.teacher.toString() !== teacherId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to start this class'
      });
    }
    
    // Check if class is scheduled
    if (liveClass.status !== 'scheduled') {
      return res.status(400).json({
        success: false,
        message: `Cannot start class with status: ${liveClass.status}`
      });
    }
    
    // Update class status
    liveClass.status = 'live';
    liveClass.actualStartTime = new Date();
    liveClass.updatedBy = teacherId;
    
    await liveClass.save();
    
    console.log('✅ Live class started successfully:', classId);
    
    res.json({
      success: true,
      message: 'Live class started successfully',
      liveClass: {
        _id: liveClass._id,
        status: liveClass.status,
        actualStartTime: liveClass.actualStartTime,
        roomId: liveClass.roomId
      }
    });
    
  } catch (error) {
    console.error('❌ Error starting live class:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start live class',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// End a live class
exports.endClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const teacherId = req.user._id;
    
    console.log('⏹️ Ending live class:', { classId, teacherId });
    
    const liveClass = await LiveClass.findById(classId);
    
    if (!liveClass) {
      console.log('❌ Live class not found:', classId);
      return res.status(404).json({
        success: false,
        message: 'Live class not found'
      });
    }
    
    console.log('📋 Found live class:', {
      _id: liveClass._id,
      teacher: liveClass.teacher,
      status: liveClass.status,
      participantCount: liveClass.participants?.length || 0
    });
    
    // Check if teacher owns this class
    if (liveClass.teacher.toString() !== teacherId.toString()) {
      console.log('❌ Unauthorized teacher:', { classTeacher: liveClass.teacher, requestingTeacher: teacherId });
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to end this class'
      });
    }
    
    // Check if class is live
    if (liveClass.status !== 'live') {
      console.log('❌ Invalid class status:', liveClass.status);
      return res.status(400).json({
        success: false,
        message: `Cannot end class with status: ${liveClass.status}`
      });
    }
    
    // Update class status
    liveClass.status = 'completed';
    liveClass.actualEndTime = new Date();
    liveClass.currentParticipants = 0;
    liveClass.isRecording = false;
    liveClass.updatedBy = teacherId;
    
    // Mark all participants as disconnected
    if (liveClass.participants && liveClass.participants.length > 0) {
      liveClass.participants.forEach(participant => {
        if (participant.isCurrentlyConnected) {
          participant.leftAt = new Date();
          participant.isCurrentlyConnected = false;
          
          if (participant.joinedAt) {
            const sessionDuration = Math.floor((participant.leftAt - participant.joinedAt) / 1000);
            participant.totalDuration = (participant.totalDuration || 0) + sessionDuration;
          }
        }
      });
    }
    
    console.log('💾 Saving live class changes...');
    await liveClass.save();
    
    console.log('✅ Live class ended successfully:', classId);
    
    res.json({
      success: true,
      message: 'Live class ended successfully',
      liveClass: {
        _id: liveClass._id,
        status: liveClass.status,
        actualEndTime: liveClass.actualEndTime
      }
    });
    
  } catch (error) {
    console.error('❌ Error ending live class:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to end live class',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Join a live class (for students)
exports.joinClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const studentId = req.user._id;
    
    console.log('🚪 Student joining live class:', { classId, studentId });
    
    const liveClass = await LiveClass.findById(classId)
      .populate('section', 'students');
    
    if (!liveClass) {
      return res.status(404).json({
        success: false,
        message: 'Live class not found'
      });
    }
    
    // Check if student is in the section
    const isInSection = liveClass.section.students.some(
      sId => sId.toString() === studentId.toString()
    );
    
    if (!isInSection) {
      return res.status(403).json({
        success: false,
        message: 'You are not enrolled in this section'
      });
    }
    
    // Check if class is live
    if (liveClass.status !== 'live') {
      return res.status(400).json({
        success: false,
        message: 'This class is not currently live'
      });
    }
    
    // Check participant limit
    if (liveClass.currentParticipants >= liveClass.maxParticipants) {
      return res.status(423).json({
        success: false,
        message: 'Class has reached maximum participant limit'
      });
    }
    
    // Add participant
    await liveClass.addParticipant(studentId);
    
    console.log('✅ Student joined live class successfully:', { classId, studentId });
    
    res.json({
      success: true,
      message: 'Joined live class successfully',
      classData: {
        _id: liveClass._id,
        title: liveClass.title,
        roomId: liveClass.roomId,
        allowStudentMic: liveClass.allowStudentMic,
        allowStudentCamera: liveClass.allowStudentCamera,
        allowChat: liveClass.allowChat,
        currentParticipants: liveClass.currentParticipants + 1
      }
    });
    
  } catch (error) {
    console.error('❌ Error joining live class:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to join live class',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Leave a live class (for students)
exports.leaveClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const studentId = req.user._id;
    
    console.log('🚪 Student leaving live class:', { classId, studentId });
    
    const liveClass = await LiveClass.findById(classId);
    
    if (!liveClass) {
      return res.status(404).json({
        success: false,
        message: 'Live class not found'
      });
    }
    
    // Remove participant
    await liveClass.removeParticipant(studentId);
    
    console.log('✅ Student left live class successfully:', { classId, studentId });
    
    res.json({
      success: true,
      message: 'Left live class successfully'
    });
    
  } catch (error) {
    console.error('❌ Error leaving live class:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to leave live class',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Update class settings
exports.updateClassSettings = async (req, res) => {
  try {
    const { classId } = req.params;
    const teacherId = req.user._id;
    const {
      allowStudentMic,
      allowStudentCamera,
      allowChat,
      requireApprovalToJoin
    } = req.body;
    
    console.log('⚙️ Updating class settings:', { classId, teacherId });
    
    const liveClass = await LiveClass.findById(classId);
    
    if (!liveClass) {
      return res.status(404).json({
        success: false,
        message: 'Live class not found'
      });
    }
    
    // Check if teacher owns this class
    if (liveClass.teacher.toString() !== teacherId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update this class'
      });
    }
    
    // Update settings
    if (typeof allowStudentMic === 'boolean') {
      liveClass.allowStudentMic = allowStudentMic;
    }
    if (typeof allowStudentCamera === 'boolean') {
      liveClass.allowStudentCamera = allowStudentCamera;
    }
    if (typeof allowChat === 'boolean') {
      liveClass.allowChat = allowChat;
    }
    if (typeof requireApprovalToJoin === 'boolean') {
      liveClass.requireApprovalToJoin = requireApprovalToJoin;
    }
    
    liveClass.updatedBy = teacherId;
    await liveClass.save();
    
    console.log('✅ Class settings updated successfully:', classId);
    
    // Emit socket event to notify all connected participants about the settings change
    const io = req.app.get('io');
    if (io && liveClass.roomId) {
      const settingsData = {
        allowStudentMic: liveClass.allowStudentMic,
        allowStudentCamera: liveClass.allowStudentCamera,
        allowChat: liveClass.allowChat,
        requireApprovalToJoin: liveClass.requireApprovalToJoin
      };
      
      console.log('📡 Broadcasting settings update to room:', liveClass.roomId);
      io.to(liveClass.roomId).emit('class-settings-updated', {
        settings: settingsData,
        updatedAt: new Date()
      });
    }
    
    res.json({
      success: true,
      message: 'Class settings updated successfully',
      settings: {
        allowStudentMic: liveClass.allowStudentMic,
        allowStudentCamera: liveClass.allowStudentCamera,
        allowChat: liveClass.allowChat,
        requireApprovalToJoin: liveClass.requireApprovalToJoin
      }
    });
    
  } catch (error) {
    console.error('❌ Error updating class settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update class settings',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get teacher's sections and courses for scheduling
exports.getTeacherSectionsAndCourses = async (req, res) => {
  try {
    const teacherId = req.user._id;
    
    console.log('📚 Getting teacher sections and courses:', teacherId);
    
    // Get teacher's assignments
    const assignments = await SectionCourseTeacher.find({
      teacher: teacherId,
      isActive: true
    })
      .populate('section', 'name capacity students')
      .populate('course', 'title courseCode description');
    
    // Group by section
    const sectionsMap = new Map();
    
    assignments.forEach(assignment => {
      const sectionId = assignment.section._id.toString();
      
      if (!sectionsMap.has(sectionId)) {
        sectionsMap.set(sectionId, {
          _id: assignment.section._id,
          name: assignment.section.name,
          capacity: assignment.section.capacity,
          studentCount: assignment.section.students?.length || 0,
          courses: []
        });
      }
      
      sectionsMap.get(sectionId).courses.push({
        _id: assignment.course._id,
        title: assignment.course.title,
        courseCode: assignment.course.courseCode,
        description: assignment.course.description
      });
    });
    
    const sections = Array.from(sectionsMap.values());
    
    res.json({
      success: true,
      sections
    });
    
  } catch (error) {
    console.error('❌ Error getting teacher sections and courses:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get sections and courses',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Delete/cancel a live class
exports.deleteClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const teacherId = req.user._id;
    
    console.log('🗑️ Deleting live class:', { classId, teacherId });
    
    const liveClass = await LiveClass.findById(classId);
    
    if (!liveClass) {
      return res.status(404).json({
        success: false,
        message: 'Live class not found'
      });
    }
    
    // Check if teacher owns this class
    if (liveClass.teacher.toString() !== teacherId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this class'
      });
    }
    
    // Can only delete/cancel if not live or completed
    if (liveClass.status === 'live') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete a live class. Please end it first.'
      });
    }
    
    if (liveClass.status === 'scheduled') {
      // Cancel the class
      liveClass.status = 'cancelled';
      liveClass.updatedBy = teacherId;
      await liveClass.save();
    } else {
      // Mark as inactive for completed classes
      liveClass.isActive = false;
      liveClass.updatedBy = teacherId;
      await liveClass.save();
    }
    
    console.log('✅ Live class deleted/cancelled successfully:', classId);
    
    res.json({
      success: true,
      message: liveClass.status === 'cancelled' ? 'Live class cancelled successfully' : 'Live class deleted successfully'
    });
    
  } catch (error) {
    console.error('❌ Error deleting live class:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete live class',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Upload recording for a live class
exports.uploadRecording = async (req, res) => {
  try {
    const { classId } = req.params;
    const teacherId = req.user._id;
    
    console.log('📹 Uploading recording for class:', classId);
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No recording file provided'
      });
    }
    
    const liveClass = await LiveClass.findById(classId);
    
    if (!liveClass) {
      return res.status(404).json({
        success: false,
        message: 'Live class not found'
      });
    }
    
    // Check if teacher owns this class
    if (liveClass.teacher.toString() !== teacherId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to upload recordings for this class'
      });
    }
    
    // Update class with recording information
    liveClass.recordingPath = req.file.path;
    liveClass.recordingUrl = `/uploads/recordings/${req.file.filename}`;
    liveClass.recordingSize = req.file.size;
    liveClass.recordingEndTime = new Date();
    
    // Calculate recording duration (this is approximate)
    if (liveClass.recordingStartTime) {
      liveClass.recordingDuration = Math.floor(
        (liveClass.recordingEndTime - liveClass.recordingStartTime) / 1000
      );
    }
    
    liveClass.updatedBy = teacherId;
    await liveClass.save();
    
    console.log('✅ Recording uploaded successfully:', req.file.filename);
    
    res.json({
      success: true,
      message: 'Recording uploaded successfully',
      recording: {
        url: liveClass.recordingUrl,
        size: liveClass.recordingSize,
        duration: liveClass.recordingDuration
      }
    });
    
  } catch (error) {
    console.error('❌ Error uploading recording:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload recording',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Enhanced: Schedule merged class for multiple sections
exports.scheduleMergedClass = async (req, res) => {
  try {
    console.log('📅 === SCHEDULE MERGED CLASS REQUEST ===');
    console.log('Request body:', req.body);
    console.log('Teacher ID from auth:', req.user?._id);

    const {
      title,
      description,
      sectionIds, // Array of section IDs
      courseId,
      scheduledAt,
      duration,
      settings = {}
    } = req.body;

    const teacherId = req.user._id;

    // Validate required fields
    if (!title || !sectionIds || !Array.isArray(sectionIds) || sectionIds.length === 0 || 
        !courseId || !scheduledAt || !duration) {
      return res.status(400).json({
        success: false,
        message: 'Title, section IDs array, course ID, scheduled time, and duration are required'
      });
    }

    // Validate that teacher can access all section-course combinations
    for (const sectionId of sectionIds) {
      const canAccess = await canTeacherAccessSectionCourse(teacherId, sectionId, courseId);
      if (!canAccess) {
        return res.status(403).json({
          success: false,
          message: `You don't have permission to schedule classes for one or more sections`
        });
      }
    }

    // Get all sections and calculate total capacity
    const sections = await Section.find({ _id: { $in: sectionIds } });
    if (sections.length !== sectionIds.length) {
      return res.status(404).json({
        success: false,
        message: 'One or more sections not found'
      });
    }

    const totalCapacity = sections.reduce((sum, section) => sum + (section.capacity || 50), 0);
    
    // Get course and school information from first section
    const firstSection = sections[0];
    await firstSection.populate(['course', 'school', 'department']);

    // Create merged live class
    const liveClass = new LiveClass({
      title: `${title} (Merged: ${sections.map(s => s.name).join(', ')})`,
      description,
      teacher: teacherId,
      sections: sectionIds,
      section: sectionIds[0], // Primary section for backward compatibility
      course: courseId,
      school: firstSection.school._id,
      department: firstSection.department?._id,
      scheduledAt: new Date(scheduledAt),
      duration: parseInt(duration),
      maxParticipants: totalCapacity,
      createdBy: teacherId,
      
      // Enhanced settings
      allowStudentMic: settings.allowStudentMic || false,
      allowStudentCamera: settings.allowStudentCamera || false,
      allowChat: settings.allowChat !== undefined ? settings.allowChat : true,
      requireApprovalToJoin: settings.requireApprovalToJoin !== undefined ? settings.requireApprovalToJoin : true,
      enableHandRaise: settings.enableHandRaise !== undefined ? settings.enableHandRaise : true,
      enableWhiteboard: settings.enableWhiteboard || false,
      isPasswordProtected: settings.isPasswordProtected || false,
      classPassword: settings.classPassword || undefined,
      allowedUserTypes: settings.allowedUserTypes || ['student', 'teacher'],
      'waitingRoom.enabled': settings.waitingRoomEnabled !== undefined ? settings.waitingRoomEnabled : true
    });

    await liveClass.save();

    // Populate the created class for response
    await liveClass.populate([
      { path: 'teacher', select: 'name email' },
      { path: 'sections', select: 'name capacity' },
      { path: 'course', select: 'title courseCode' },
      { path: 'school', select: 'name' },
      { path: 'department', select: 'name' }
    ]);

    console.log('✅ Merged class scheduled successfully:', liveClass._id);

    res.status(201).json({
      success: true,
      message: `Merged class scheduled successfully for ${sections.length} sections`,
      liveClass: liveClass,
      accessToken: liveClass.accessToken,
      joinUrl: `${process.env.CLIENT_URL}/live-class/join/${liveClass.accessToken}`
    });

  } catch (error) {
    console.error('❌ Error scheduling merged class:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to schedule merged class',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Enhanced: Join class with access token authentication
exports.joinClassByToken = async (req, res) => {
  try {
    const { accessToken } = req.params;
    const { password } = req.body;
    const user = req.user;

    console.log('🚪 === JOIN CLASS BY TOKEN ===');
    console.log('Access token:', accessToken);
    console.log('User:', user.email, user.role);

    // Find class by access token
    const liveClass = await LiveClass.getClassByAccessToken(accessToken);
    
    if (!liveClass) {
      return res.status(404).json({
        success: false,
        message: 'Invalid access token or class not found'
      });
    }

    // Check if class is accessible (not ended/cancelled)
    if (liveClass.status === 'cancelled') {
      return res.status(410).json({
        success: false,
        message: 'This class has been cancelled'
      });
    }

    if (liveClass.status === 'completed') {
      return res.status(410).json({
        success: false,
        message: 'This class has already ended'
      });
    }

    // Check user access permissions
    const accessCheck = LiveClass.canUserAccessClass(liveClass, user);
    if (!accessCheck.canAccess) {
      return res.status(403).json({
        success: false,
        message: accessCheck.reason
      });
    }

    // Check password if class is password protected
    if (liveClass.isPasswordProtected) {
      if (!password) {
        return res.status(401).json({
          success: false,
          message: 'This class is password protected',
          requiresPassword: true
        });
      }

      // Get class with password field
      const classWithPassword = await LiveClass.findById(liveClass._id).select('+classPassword');
      if (classWithPassword.classPassword !== password) {
        return res.status(401).json({
          success: false,
          message: 'Invalid password'
        });
      }
    }

    // Check if class is currently joinable (within time window)
    const now = new Date();
    const scheduledTime = new Date(liveClass.scheduledAt);
    const endTime = new Date(liveClass.estimatedEndTime);
    
    // Allow joining 10 minutes before scheduled time
    const joinableFrom = new Date(scheduledTime.getTime() - (10 * 60 * 1000));
    
    if (now < joinableFrom) {
      return res.status(425).json({
        success: false,
        message: 'Class is not yet available for joining',
        scheduledAt: liveClass.scheduledAt
      });
    }

    if (now > endTime && liveClass.status !== 'live') {
      return res.status(410).json({
        success: false,
        message: 'Class time has passed'
      });
    }

    // Success response with class details
    res.json({
      success: true,
      message: 'Access granted to live class',
      liveClass: {
        _id: liveClass._id,
        title: liveClass.title,
        description: liveClass.description,
        teacher: liveClass.teacher,
        sections: liveClass.sections,
        course: liveClass.course,
        roomId: liveClass.roomId,
        scheduledAt: liveClass.scheduledAt,
        duration: liveClass.duration,
        status: liveClass.status,
        settings: {
          allowStudentMic: liveClass.allowStudentMic,
          allowStudentCamera: liveClass.allowStudentCamera,
          allowChat: liveClass.allowChat,
          enableHandRaise: liveClass.enableHandRaise,
          enableWhiteboard: liveClass.enableWhiteboard,
          waitingRoom: liveClass.waitingRoom
        }
      },
      userRole: accessCheck.role,
      permissions: {
        canSpeak: accessCheck.role === 'teacher' || liveClass.allowStudentMic,
        canVideo: accessCheck.role === 'teacher' || liveClass.allowStudentCamera,
        canChat: liveClass.allowChat,
        canScreenShare: accessCheck.role === 'teacher',
        canControlClass: accessCheck.role === 'teacher',
        canRecord: accessCheck.role === 'teacher'
      }
    });

  } catch (error) {
    console.error('❌ Error joining class by token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to join class',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Enhanced: Update class settings in real-time
exports.updateClassSettings = async (req, res) => {
  try {
    const { classId } = req.params;
    const { settings } = req.body;
    const teacherId = req.user.id;

    console.log('⚙️ === UPDATE CLASS SETTINGS ===');
    console.log('Class ID:', classId);
    console.log('Settings:', settings);

    const liveClass = await LiveClass.findById(classId);
    if (!liveClass) {
      return res.status(404).json({
        success: false,
        message: 'Live class not found'
      });
    }

    // Check if user is the teacher
    if (liveClass.teacher.toString() !== teacherId) {
      return res.status(403).json({
        success: false,
        message: 'Only the class teacher can update settings'
      });
    }

    // Update allowed settings
    const allowedSettings = [
      'allowStudentMic',
      'allowStudentCamera', 
      'allowChat',
      'enableHandRaise',
      'enableWhiteboard',
      'requireApprovalToJoin'
    ];

    allowedSettings.forEach(setting => {
      if (settings[setting] !== undefined) {
        liveClass[setting] = settings[setting];
      }
    });

    if (settings.waitingRoom) {
      liveClass.waitingRoom.enabled = settings.waitingRoom.enabled;
    }

    liveClass.updatedBy = teacherId;
    await liveClass.save();

    // Emit settings update to all participants via socket
    const io = req.app.get('socketio');
    if (io) {
      io.to(liveClass.roomId).emit('class-settings-updated', {
        settings: {
          allowStudentMic: liveClass.allowStudentMic,
          allowStudentCamera: liveClass.allowStudentCamera,
          allowChat: liveClass.allowChat,
          enableHandRaise: liveClass.enableHandRaise,
          enableWhiteboard: liveClass.enableWhiteboard,
          waitingRoom: liveClass.waitingRoom
        }
      });
    }

    res.json({
      success: true,
      message: 'Class settings updated successfully',
      settings: {
        allowStudentMic: liveClass.allowStudentMic,
        allowStudentCamera: liveClass.allowStudentCamera,
        allowChat: liveClass.allowChat,
        enableHandRaise: liveClass.enableHandRaise,
        enableWhiteboard: liveClass.enableWhiteboard,
        waitingRoom: liveClass.waitingRoom
      }
    });

  } catch (error) {
    console.error('❌ Error updating class settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update class settings',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Enhanced: Get waiting room participants
exports.getWaitingRoomParticipants = async (req, res) => {
  try {
    const { classId } = req.params;
    const teacherId = req.user.id;

    const liveClass = await LiveClass.findById(classId)
      .populate('waitingRoom.participants.user', 'name email regNo');

    if (!liveClass) {
      return res.status(404).json({
        success: false,
        message: 'Live class not found'
      });
    }

    // Check if user is the teacher
    if (liveClass.teacher.toString() !== teacherId) {
      return res.status(403).json({
        success: false,
        message: 'Only the class teacher can view waiting room'
      });
    }

    res.json({
      success: true,
      waitingParticipants: liveClass.waitingRoom.participants
    });

  } catch (error) {
    console.error('❌ Error getting waiting room participants:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get waiting room participants',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Enhanced: Approve or deny participant from waiting room
exports.handleWaitingRoomRequest = async (req, res) => {
  try {
    const { classId } = req.params;
    const { userId, action } = req.body; // action: 'approve' or 'deny'
    const teacherId = req.user.id;

    const liveClass = await LiveClass.findById(classId);
    if (!liveClass) {
      return res.status(404).json({
        success: false,
        message: 'Live class not found'
      });
    }

    // Check if user is the teacher
    if (liveClass.teacher.toString() !== teacherId) {
      return res.status(403).json({
        success: false,
        message: 'Only the class teacher can handle waiting room requests'
      });
    }

    // Find and remove user from waiting room
    const waitingIndex = liveClass.waitingRoom.participants.findIndex(
      p => p.user.toString() === userId
    );

    if (waitingIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'User not found in waiting room'
      });
    }

    const participant = liveClass.waitingRoom.participants[waitingIndex];
    liveClass.waitingRoom.participants.splice(waitingIndex, 1);

    await liveClass.save();

    // Emit response to the waiting user via socket
    const io = req.app.get('socketio');
    if (io) {
      if (action === 'approve') {
        // Add user to approved list for this room
        const approvedUsers = io.approvedUsers || new Map();
        if (!approvedUsers.has(liveClass.roomId)) {
          approvedUsers.set(liveClass.roomId, new Set());
        }
        approvedUsers.get(liveClass.roomId).add(userId);
        io.approvedUsers = approvedUsers;
        
        io.to(`user_${userId}`).emit('waiting-room-approved', {
          classId: liveClass._id,
          roomId: liveClass.roomId
        });
      } else {
        io.to(`user_${userId}`).emit('waiting-room-denied', {
          classId: liveClass._id,
          message: 'Your request to join the class has been denied'
        });
      }
    }

    res.json({
      success: true,
      message: `Participant ${action === 'approve' ? 'approved' : 'denied'} successfully`
    });

  } catch (error) {
    console.error('❌ Error handling waiting room request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to handle waiting room request',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Enhanced join by token for multi-role access (300+ students, HOD/Dean anytime access)
exports.joinByToken = async (req, res) => {
  try {
    const { accessToken, password } = req.body;
    const user = req.user;

    console.log('🔐 Enhanced: Multi-role token join attempt:', { 
      accessToken: accessToken?.substring(0, 8) + '...', 
      userRole: user.role, 
      userId: user._id 
    });

    // Find class by access token with enhanced population
    const liveClass = await LiveClass.findOne({ 
      accessToken: accessToken,
      isActive: true 
    })
    .populate('teacher', 'name email')
    .populate('sections', 'name capacity students')
    .populate('section', 'name capacity students')
    .populate('course', 'title courseCode')
    .populate('school', 'name')
    .populate('department', 'name');

    if (!liveClass) {
      return res.status(404).json({ 
        success: false,
        message: 'Invalid access token or class not found' 
      });
    }

    console.log('🎓 Enhanced: Found class:', {
      title: liveClass.title,
      teacher: liveClass.teacher.name,
      maxParticipants: liveClass.maxParticipants,
      currentParticipants: liveClass.currentParticipants,
      autoAllowRoles: liveClass.autoAllowRoles
    });

    // Enhanced multi-role access check
    const accessCheck = LiveClass.canUserAccessClass(liveClass, user);
    if (!accessCheck.canAccess) {
      return res.status(403).json({ 
        success: false,
        message: accessCheck.reason 
      });
    }

    // Auto-allow roles (HOD, Dean, Admin) - can join anytime
    const isAutoAllowed = liveClass.autoAllowRoles && 
                         liveClass.autoAllowRoles.includes(user.role);

    console.log('🎯 Enhanced: Access granted:', { 
      canAccess: accessCheck.canAccess, 
      role: accessCheck.role,
      isAutoAllowed,
      permissions: accessCheck.permissions 
    });

    // Check timing - auto-allowed roles can join anytime
    const now = new Date();
    if (!isAutoAllowed && now < liveClass.scheduledAt) {
      const timeUntilStart = Math.ceil((liveClass.scheduledAt - now) / (1000 * 60));
      return res.status(400).json({ 
        success: false,
        message: `Class starts in ${timeUntilStart} minutes`,
        scheduledAt: liveClass.scheduledAt
      });
    }

    // Check capacity - support 300+ students as requested
    if (!isAutoAllowed && liveClass.currentParticipants >= liveClass.maxParticipants) {
      return res.status(400).json({ 
        success: false,
        message: `Class is at maximum capacity (${liveClass.maxParticipants} participants)` 
      });
    }

    // Add participant to class with enhanced tracking
    await liveClass.addParticipant(user._id, user.role);

    // Enhanced scalability for 300+ students
    let scalabilitySettings = {
      isLargeClass: liveClass.currentParticipants > 100,
      maxVideoStreams: Math.min(25, Math.floor(liveClass.maxParticipants * 0.1)),
      audioOnlyRecommended: liveClass.currentParticipants > 200
    };

    console.log('✅ Enhanced: User successfully joined class');

    res.json({
      success: true,
      message: 'Successfully joined enhanced live class',
      liveClass: {
        _id: liveClass._id,
        title: liveClass.title,
        teacher: liveClass.teacher,
        roomId: liveClass.roomId,
        maxParticipants: liveClass.maxParticipants,
        currentParticipants: liveClass.currentParticipants + 1,
        enableWhiteboard: liveClass.enableWhiteboard,
        enableHandRaise: liveClass.enableHandRaise,
        allowChat: liveClass.allowChat
      },
      userRole: accessCheck.role,
      permissions: accessCheck.permissions,
      scalabilitySettings,
      bypassWaitingRoom: accessCheck.permissions?.bypassWaitingRoom || isAutoAllowed,
      isEnhanced: true
    });

  } catch (error) {
    console.error('❌ Enhanced: Join by token error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Enhanced: Save whiteboard as note
exports.saveWhiteboardNote = async (req, res) => {
  try {
    const { classId } = req.params;
    const { title, description, content, tags, isPublic } = req.body;
    const userId = req.user._id;

    console.log('💾 Enhanced: Saving whiteboard note:', { classId, title, userId });

    const liveClass = await LiveClass.findById(classId)
      .populate('teacher', 'name email')
      .populate('sections', 'name')
      .populate('section', 'name');
      
    if (!liveClass) {
      return res.status(404).json({ 
        success: false,
        message: 'Live class not found' 
      });
    }

    // Enhanced access check
    const accessCheck = LiveClass.canUserAccessClass(liveClass, req.user);
    if (!accessCheck.canAccess) {
      return res.status(403).json({ 
        success: false,
        message: 'No access to this class' 
      });
    }

    // Create enhanced whiteboard note
    const newNote = {
      title: title.trim(),
      description: description ? description.trim() : '',
      content: content,
      savedBy: userId,
      isPublic: isPublic !== false,
      tags: tags ? tags.map(tag => tag.trim()).filter(tag => tag) : []
    };

    if (!liveClass.whiteboardNotes) {
      liveClass.whiteboardNotes = [];
    }
    
    liveClass.whiteboardNotes.push(newNote);
    await liveClass.save();

    const savedNote = liveClass.whiteboardNotes[liveClass.whiteboardNotes.length - 1];

    console.log('✅ Enhanced: Whiteboard note saved successfully');
    
    res.json({
      success: true,
      message: 'Whiteboard note saved successfully',
      note: savedNote
    });

  } catch (error) {
    console.error('❌ Enhanced: Save whiteboard note error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get whiteboard notes
exports.getWhiteboardNotes = async (req, res) => {
  try {
    const { classId } = req.params;
    const userId = req.user._id;

    const liveClass = await LiveClass.findById(classId)
      .populate('whiteboardNotes.savedBy', 'name email role')
      .populate('whiteboardNotes.sharedWith.user', 'name email');
    
    if (!liveClass) {
      return res.status(404).json({ 
        success: false,
        message: 'Live class not found' 
      });
    }

    // Filter notes based on access permissions
    const accessibleNotes = liveClass.whiteboardNotes.filter(note => {
      if (note.isPublic) return true;
      if (note.savedBy._id.toString() === userId.toString()) return true;
      return note.sharedWith.some(share => 
        share.user._id.toString() === userId.toString()
      );
    });

    res.json({
      success: true,
      notes: accessibleNotes,
      totalCount: accessibleNotes.length
    });

  } catch (error) {
    console.error('❌ Get whiteboard notes error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get class analytics for monitoring large classes
exports.getClassAnalytics = async (req, res) => {
  try {
    const { classId } = req.params;
    const user = req.user;

    const liveClass = await LiveClass.findById(classId)
      .populate('participants.user', 'name email role')
      .populate('teacher', 'name email');
    
    if (!liveClass) {
      return res.status(404).json({ 
        success: false,
        message: 'Live class not found' 
      });
    }

    // Check permissions
    if (!['teacher', 'admin', 'hod', 'dean'].includes(user.role) && 
        liveClass.teacher._id.toString() !== user._id.toString()) {
      return res.status(403).json({ 
        success: false,
        message: 'No permission to view analytics' 
      });
    }

    // Calculate analytics
    const analytics = {
      totalParticipants: liveClass.participants.length,
      currentlyConnected: liveClass.participants.filter(p => p.isCurrentlyConnected).length,
      peakParticipants: liveClass.analytics.peakParticipants,
      chatMessages: liveClass.analytics.chatMessageCount,
      handRaises: liveClass.participants.filter(p => p.status === 'hand-raised').length,
      scalabilityMetrics: {
        isLargeClass: liveClass.currentParticipants > 50,
        videoStreamsActive: Math.min(
          liveClass.currentParticipants, 
          liveClass.scalabilitySettings?.maxVideoStreams || 25
        ),
        audioOnlyParticipants: liveClass.participants.filter(p => 
          p.isCurrentlyConnected && !p.permissions?.canVideo
        ).length
      },
      participantBreakdown: {
        teachers: liveClass.participants.filter(p => p.role === 'teacher').length,
        students: liveClass.participants.filter(p => p.role === 'student').length,
        hods: liveClass.participants.filter(p => p.role === 'hod').length,
        deans: liveClass.participants.filter(p => p.role === 'dean').length,
        admins: liveClass.participants.filter(p => p.role === 'admin').length
      }
    };

    res.json({ 
      success: true,
      analytics 
    });

  } catch (error) {
    console.error('❌ Get analytics error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Public join by token (no auth required)
exports.publicJoinByToken = async (req, res) => {
  try {
    const { accessToken, userName, userEmail, password } = req.body;

    console.log('🔓 Public: Token join attempt:', { 
      accessToken: accessToken?.substring(0, 8) + '...', 
      userName,
      userEmail: userEmail ? userEmail.substring(0, 3) + '***' : 'N/A'
    });

    // Find class by access token
    const liveClass = await LiveClass.findOne({ 
      accessToken: accessToken,
      isActive: true 
    })
    .populate('teacher', 'name email')
    .populate('sections', 'name capacity students')
    .populate('section', 'name capacity students')
    .populate('course', 'title courseCode')
    .populate('school', 'name')
    .populate('department', 'name');

    if (!liveClass) {
      return res.status(404).json({ 
        success: false,
        message: 'Invalid access token or class not found' 
      });
    }

    // Check if class requires password
    if (liveClass.isPasswordProtected && liveClass.classPassword !== password) {
      return res.json({
        success: false,
        requiresPassword: true,
        message: 'This class requires a password'
      });
    }

    // Check timing
    const now = new Date();
    if (now < liveClass.scheduledAt) {
      const timeUntilStart = Math.ceil((liveClass.scheduledAt - now) / (1000 * 60));
      return res.status(400).json({ 
        success: false,
        message: `Class starts in ${timeUntilStart} minutes`,
        scheduledAt: liveClass.scheduledAt
      });
    }

    // Check capacity
    if (liveClass.currentParticipants >= liveClass.maxParticipants) {
      return res.status(400).json({ 
        success: false,
        message: `Class is at maximum capacity (${liveClass.maxParticipants} participants)` 
      });
    }

    // Create a temporary user object for guest access
    const guestUser = {
      _id: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: userName || 'Guest User',
      email: userEmail || `guest_${Date.now()}@temp.com`,
      role: 'student',
      isGuest: true
    };

    console.log('🎓 Public: Found class, creating guest user:', {
      title: liveClass.title,
      teacher: liveClass.teacher.name,
      guestUserId: guestUser._id,
      guestName: guestUser.name
    });

    // Determine user role and permissions
    const userRole = 'student';
    const userPermissions = {
      canSpeak: liveClass.allowStudentMic || false,
      canVideo: liveClass.allowStudentCamera || false,
      canChat: liveClass.allowChat || true,
      canScreenShare: false,
      canControlClass: false,
      canRecord: false,
      canJoin: true
    };

    // Check if waiting room is enabled
    if (liveClass.waitingRoom?.enabled && liveClass.requireApprovalToJoin) {
      return res.json({
        success: true,
        requiresApproval: true,
        message: 'This class requires teacher approval to join',
        liveClass: {
          _id: liveClass._id,
          title: liveClass.title,
          teacher: liveClass.teacher,
          roomId: liveClass.roomId,
          settings: {
            allowStudentMic: liveClass.allowStudentMic,
            allowStudentCamera: liveClass.allowStudentCamera,
            allowChat: liveClass.allowChat,
            enableHandRaise: liveClass.enableHandRaise,
            enableWhiteboard: liveClass.enableWhiteboard,
            waitingRoomEnabled: liveClass.waitingRoom?.enabled
          }
        },
        user: guestUser,
        userRole,
        permissions: userPermissions,
        token: `guest_token_${guestUser._id}` // Temporary token for guest
      });
    }

    console.log('✅ Public: Guest user can join directly');

    res.json({
      success: true,
      message: 'Successfully joined live class as guest',
      liveClass: {
        _id: liveClass._id,
        title: liveClass.title,
        teacher: liveClass.teacher,
        roomId: liveClass.roomId,
        maxParticipants: liveClass.maxParticipants,
        currentParticipants: liveClass.currentParticipants,
        course: liveClass.course,
        sections: liveClass.sections || (liveClass.section ? [liveClass.section] : []),
        settings: {
          allowStudentMic: liveClass.allowStudentMic,
          allowStudentCamera: liveClass.allowStudentCamera,
          allowChat: liveClass.allowChat,
          enableHandRaise: liveClass.enableHandRaise,
          enableWhiteboard: liveClass.enableWhiteboard,
          waitingRoomEnabled: liveClass.waitingRoom?.enabled
        }
      },
      user: guestUser,
      userRole,
      permissions: userPermissions,
      token: `guest_token_${guestUser._id}`, // Temporary token for guest
      scalabilityMode: liveClass.currentParticipants > 100
    });

  } catch (error) {
    console.error('❌ Public join by token error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get class participants
exports.getClassParticipants = async (req, res) => {
  try {
    const { classId } = req.params;
    const userId = req.user._id || req.user.id;

    const liveClass = await LiveClass.findById(classId)
      .populate('participants.user', 'name email regNo')
      .populate('teacher', 'name email');

    if (!liveClass) {
      return res.status(404).json({ success: false, message: 'Live class not found' });
    }

    // Check if user has access to this class
    const hasAccess = liveClass.teacher._id.toString() === userId.toString() ||
      liveClass.participants.some(p => p.user._id.toString() === userId.toString()) ||
      ['admin', 'hod', 'dean'].includes(req.user.role);

    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const participants = liveClass.participants.map(p => ({
      id: p.user._id,
      name: p.user.name,
      email: p.user.email,
      regNo: p.user.regNo,
      role: p.user._id.toString() === liveClass.teacher._id.toString() ? 'teacher' : 'student',
      isOnline: p.isConnected || false,
      joinedAt: p.joinedAt,
      handRaised: p.handRaised || false,
      micEnabled: p.micEnabled || false,
      cameraEnabled: p.cameraEnabled || false
    }));

    // Add teacher as participant
    const teacherInParticipants = participants.find(p => p.id.toString() === liveClass.teacher._id.toString());
    if (!teacherInParticipants) {
      participants.unshift({
        id: liveClass.teacher._id,
        name: liveClass.teacher.name,
        email: liveClass.teacher.email,
        role: 'teacher',
        isOnline: liveClass.status === 'live',
        joinedAt: liveClass.startedAt,
        handRaised: false,
        micEnabled: true,
        cameraEnabled: true
      });
    }

    res.json({ success: true, participants });
  } catch (error) {
    console.error('Error fetching participants:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch participants' });
  }
};

// Get class messages
exports.getClassMessages = async (req, res) => {
  try {
    const { classId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    // For now, return empty array - messages will be real-time via Socket.IO
    // In production, you would implement message storage in database
    res.json({
      success: true,
      messages: [],
      hasMore: false,
      total: 0
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch messages' });
  }
};

// Upload class file
exports.uploadClassFile = async (req, res) => {
  try {
    const { classId } = req.params;
    const userId = req.user._id || req.user.id;
    
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const liveClass = await LiveClass.findById(classId);
    if (!liveClass) {
      return res.status(404).json({ success: false, message: 'Live class not found' });
    }

    // Check if user is teacher or has permission
    const hasPermission = liveClass.teacher.toString() === userId.toString() ||
      ['admin', 'hod', 'dean'].includes(req.user.role);

    if (!hasPermission) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const fileInfo = {
      name: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype,
      uploadedBy: userId,
      uploadedAt: new Date()
    };

    if (!liveClass.files) {
      liveClass.files = [];
    }
    liveClass.files.push(fileInfo);
    await liveClass.save();

    res.json({ success: true, file: fileInfo });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ success: false, message: 'Failed to upload file' });
  }
};

// Get class files
exports.getClassFiles = async (req, res) => {
  try {
    const { classId } = req.params;
    const userId = req.user._id || req.user.id;

    const liveClass = await LiveClass.findById(classId).populate('files.uploadedBy', 'name');
    if (!liveClass) {
      return res.status(404).json({ success: false, message: 'Live class not found' });
    }

    // Check access
    const hasAccess = liveClass.teacher.toString() === userId.toString() ||
      liveClass.participants.some(p => p.user.toString() === userId.toString()) ||
      ['admin', 'hod', 'dean'].includes(req.user.role);

    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, files: liveClass.files || [] });
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch files' });
  }
};

// Create poll
exports.createPoll = async (req, res) => {
  try {
    const { classId } = req.params;
    const { question, options, duration } = req.body;
    const userId = req.user._id || req.user.id;

    const liveClass = await LiveClass.findById(classId);
    if (!liveClass) {
      return res.status(404).json({ success: false, message: 'Live class not found' });
    }

    // Check permission
    const hasPermission = liveClass.teacher.toString() === userId.toString() ||
      ['admin', 'hod', 'dean'].includes(req.user.role);

    if (!hasPermission) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const poll = {
      id: new mongoose.Types.ObjectId(),
      question,
      options: options.map(opt => ({ text: opt, votes: 0 })),
      createdBy: userId,
      createdAt: new Date(),
      duration: duration || 60000, // 1 minute default
      isActive: true,
      responses: []
    };

    if (!liveClass.polls) {
      liveClass.polls = [];
    }
    liveClass.polls.push(poll);
    await liveClass.save();

    res.json({ success: true, poll });
  } catch (error) {
    console.error('Error creating poll:', error);
    res.status(500).json({ success: false, message: 'Failed to create poll' });
  }
};

// Get class polls
exports.getClassPolls = async (req, res) => {
  try {
    const { classId } = req.params;
    const userId = req.user._id || req.user.id;

    const liveClass = await LiveClass.findById(classId);
    if (!liveClass) {
      return res.status(404).json({ success: false, message: 'Live class not found' });
    }

    res.json({ success: true, polls: liveClass.polls || [] });
  } catch (error) {
    console.error('Error fetching polls:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch polls' });
  }
};

// Respond to poll
exports.respondToPoll = async (req, res) => {
  try {
    const { classId, pollId } = req.params;
    const { optionIndex } = req.body;
    const userId = req.user._id || req.user.id;

    const liveClass = await LiveClass.findById(classId);
    if (!liveClass) {
      return res.status(404).json({ success: false, message: 'Live class not found' });
    }

    const poll = liveClass.polls.id(pollId);
    if (!poll) {
      return res.status(404).json({ success: false, message: 'Poll not found' });
    }

    if (!poll.isActive) {
      return res.status(400).json({ success: false, message: 'Poll is no longer active' });
    }

    // Check if user already responded
    const existingResponse = poll.responses.find(r => r.user.toString() === userId.toString());
    if (existingResponse) {
      return res.status(400).json({ success: false, message: 'You have already responded to this poll' });
    }

    // Add response
    poll.responses.push({ user: userId, optionIndex, respondedAt: new Date() });
    poll.options[optionIndex].votes++;
    
    await liveClass.save();

    res.json({ success: true, message: 'Response recorded' });
  } catch (error) {
    console.error('Error responding to poll:', error);
    res.status(500).json({ success: false, message: 'Failed to respond to poll' });
  }
};

// Upload file to live class
exports.uploadFile = async (req, res) => {
  try {
    const { classId } = req.params;
    const userId = req.user._id;
    
    console.log('📁 File upload request for class:', classId);
    console.log('📁 Uploaded by user:', userId);
    console.log('📁 File:', req.file);
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }
    
    // Find the live class
    const liveClass = await LiveClass.findById(classId);
    if (!liveClass) {
      return res.status(404).json({
        success: false,
        error: 'Live class not found'
      });
    }
    
    // Check permissions - only teacher or admins can upload files
    const isTeacher = liveClass.teacher.toString() === userId.toString();
    const isAdmin = req.user.role === 'admin' || req.user.role === 'hod' || req.user.role === 'dean';
    
    if (!isTeacher && !isAdmin) {
      if (req.user.role === 'teacher') {
        const hasAccess = await canTeacherAccessSectionCourse(userId, liveClass.section, liveClass.course);
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to upload files for this class'
          });
        }
      } else {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to upload files for this class'
        });
      }
    }
    
    // Create file object
    const fileObj = {
      id: new mongoose.Types.ObjectId(),
      name: req.file.originalname,
      path: req.file.path,
      url: `/uploads/live-classes/${req.file.filename}`,
      size: req.file.size,
      mimetype: req.file.mimetype,
      uploadedBy: userId,
      uploadedAt: new Date()
    };
    
    // Add file to live class
    if (!liveClass.files) {
      liveClass.files = [];
    }
    liveClass.files.push(fileObj);
    await liveClass.save();
    
    console.log('📁 File uploaded successfully:', fileObj.name);
    
    res.json({
      success: true,
      file: fileObj,
      message: 'File uploaded successfully'
    });
    
  } catch (error) {
    console.error('❌ Error uploading file:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload file',
      details: error.message
    });
  }
};

// Delete file from live class
exports.deleteFile = async (req, res) => {
  try {
    const { classId, fileId } = req.params;
    const userId = req.user._id;
    
    console.log('🗑️ Delete file request:', { classId, fileId, userId });
    
    // Find the live class
    const liveClass = await LiveClass.findById(classId);
    if (!liveClass) {
      return res.status(404).json({
        success: false,
        error: 'Live class not found'
      });
    }
    
    // Check permissions - only teacher or admins can delete files
    const isTeacher = liveClass.teacher.toString() === userId.toString();
    const isAdmin = req.user.role === 'admin' || req.user.role === 'hod' || req.user.role === 'dean';
    
    if (!isTeacher && !isAdmin) {
      if (req.user.role === 'teacher') {
        const hasAccess = await canTeacherAccessSectionCourse(userId, liveClass.section, liveClass.course);
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to delete files for this class'
          });
        }
      } else {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to delete files for this class'
        });
      }
    }
    
    // Find and remove the file
    const fileIndex = liveClass.files.findIndex(f => f.id.toString() === fileId);
    if (fileIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }
    
    const file = liveClass.files[fileIndex];
    
    // Remove file from filesystem
    try {
      await fs.unlink(file.path);
      console.log('🗑️ File deleted from filesystem:', file.path);
    } catch (fsError) {
      console.warn('⚠️ Could not delete file from filesystem:', fsError.message);
    }
    
    // Remove file from database
    liveClass.files.splice(fileIndex, 1);
    await liveClass.save();
    
    console.log('🗑️ File deleted successfully:', file.name);
    
    res.json({
      success: true,
      message: 'File deleted successfully'
    });
    
  } catch (error) {
    console.error('❌ Error deleting file:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete file',
      details: error.message
    });
  }
};