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
      createdBy: teacherId
    });

    // Generate unique room ID
    liveClass.roomId = `lc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
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
      .populate('participants.student', 'name email regNo');
    
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
      return res.status(404).json({
        success: false,
        message: 'Live class not found'
      });
    }
    
    // Check if teacher owns this class
    if (liveClass.teacher.toString() !== teacherId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to end this class'
      });
    }
    
    // Check if class is live
    if (liveClass.status !== 'live') {
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
    liveClass.participants.forEach(participant => {
      if (participant.isCurrentlyConnected) {
        participant.leftAt = new Date();
        participant.isCurrentlyConnected = false;
        
        if (participant.joinedAt) {
          const sessionDuration = Math.floor((participant.leftAt - participant.joinedAt) / 1000);
          participant.totalDuration += sessionDuration;
        }
      }
    });
    
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