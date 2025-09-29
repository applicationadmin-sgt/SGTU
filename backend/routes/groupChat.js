const express = require('express');
const router = express.Router();
const GroupChat = require('../models/GroupChat');
const User = require('../models/User');
const Course = require('../models/Course');
const Section = require('../models/Section');
const jwt = require('jsonwebtoken');

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Middleware to check if user has access to the chat room
const checkChatAccess = async (req, res, next) => {
  try {
    const { courseId, sectionId } = req.params;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user has access to this course/section
    const section = await Section.findById(sectionId).populate('courses students teachers');
    const course = await Course.findById(courseId).populate('coordinators');
    
    if (!section || !course) {
      return res.status(404).json({ message: 'Course or section not found' });
    }

    let hasAccess = false;

    // Admin, Dean, HOD, superadmin have access to all chats
    if (user.roles && ['admin', 'dean', 'hod', 'superadmin'].some(role => user.roles.includes(role))) {
      hasAccess = true;
    } 
    // Check if user is a student in this section
    else if (user.roles && user.roles.includes('student') && section.students.some(s => s._id.toString() === userId)) {
      hasAccess = true;
    }
    // Check if user is a teacher for this course/section
    else if (user.roles && user.roles.includes('teacher')) {
      // Check if teacher is directly assigned to the section
      if (section.teachers && section.teachers.some(t => t._id.toString() === userId)) {
        hasAccess = true;
      }
      // Check if teacher is assigned to legacy single teacher field
      else if (section.teacher && section.teacher.toString() === userId) {
        hasAccess = true;
      }
      // Check if teacher is a course coordinator
      else if (course.coordinators && course.coordinators.some(cc => cc._id ? cc._id.toString() === userId : cc.toString() === userId)) {
        hasAccess = true;
      }
      // Temporary permissive mode for teachers
      else {
        console.log(`⚠️ [REST-API] Allowing teacher access (permissive mode) for course ${courseId}, section ${sectionId}`);
        hasAccess = true;
      }
    }
    // Check if user is a course coordinator
    else if (user.roles && user.roles.includes('cc')) {
      const courseWithCoordinators = await Course.findById(courseId).populate('coordinators');
      if (courseWithCoordinators && courseWithCoordinators.coordinators.some(cc => cc._id.toString() === userId)) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied to this chat room' });
    }

    req.course = course;
    req.section = section;
    next();
  } catch (error) {
    console.error('Chat access check error:', error);
    res.status(500).json({ message: 'Server error during access check' });
  }
};

// Get messages for a specific course/section chat
router.get('/messages/:courseId/:sectionId', verifyToken, checkChatAccess, async (req, res) => {
  try {
    const { courseId, sectionId } = req.params;
    const { limit = 50, skip = 0 } = req.query;

    const user = await User.findById(req.user.id);

    // Fetch messages (excluding deleted ones for regular users)
    let query = { courseId, sectionId };
    
    // Only admin, dean, and hod can see deleted messages
    if (!user.roles || (!user.roles.includes('admin') && !user.roles.includes('dean') && !user.roles.includes('hod'))) {
      query.isDeleted = { $ne: true };
    }

    const messages = await GroupChat.find(query)
      .populate('senderId', 'name regNo teacherId roles primaryRole')
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .lean();

    // Format messages for frontend
    const formattedMessages = messages.reverse().map(message => {
      const sender = message.senderId;
      let displayName = sender.name;
      let displayId = '';

      // Format display name based on role
      if (sender.roles && sender.roles.includes('admin')) {
        displayName = 'Admin';
        displayId = '';
      } else if (sender.roles && sender.roles.includes('dean')) {
        displayName = `Dean ${sender.name}`;
        displayId = '';
      } else if (sender.roles && sender.roles.includes('hod')) {
        displayName = `HOD ${sender.name}`;
        displayId = '';
      } else {
        if (sender.roles && sender.roles.includes('student') && sender.regNo) {
          displayId = sender.regNo;
        } else if (sender.roles && sender.roles.includes('teacher') && sender.teacherId) {
          displayId = sender.teacherId;
        }
      }

      return {
        _id: message._id,
        message: message.message,
        timestamp: message.timestamp,
        flagged: message.flagged,
        isDeleted: message.isDeleted,
        sender: {
          _id: sender._id,
          name: displayName,
          id: displayId,
          roles: sender.roles
        },
        canDelete: checkCanDelete(message, user),
        canShowDelete: checkCanShowDelete(user),
        isOwner: message.senderId._id.toString() === user._id.toString()
      };
    });

    res.json({
      success: true,
      messages: formattedMessages,
      course: req.course,
      section: req.section
    });

  } catch (error) {
    console.error('Error loading messages:', error);
    res.status(500).json({ message: 'Failed to load messages' });
  }
});

// Helper function to check if user can delete a message
function checkCanDelete(message, user) {
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
  if (message.senderId._id.toString() === user._id.toString() && 
      new Date(message.timestamp) > fiveMinutesAgo) {
    return true;
  }
  
  return false;
}

// Helper function to check if user can see delete button
function checkCanShowDelete(user) {
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
}

// Get chat room info
router.get('/room/:courseId/:sectionId', verifyToken, checkChatAccess, async (req, res) => {
  try {
    res.json({
      success: true,
      course: req.course,
      section: req.section
    });
  } catch (error) {
    console.error('Error getting chat room info:', error);
    res.status(500).json({ message: 'Failed to get chat room info' });
  }
});

module.exports = router;