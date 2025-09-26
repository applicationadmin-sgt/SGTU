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

    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Admin, Dean, HOD have access to all chats
    if (['admin', 'dean', 'hod', 'superadmin'].some(role => user.roles && user.roles.includes(role))) {
      req.userDetails = user;
      return next();
    }

    // Check if section exists
    const section = await Section.findById(sectionId).populate('courses students teachers');
    if (!section) {
      return res.status(404).json({ message: 'Section not found' });
    }

    // Check if course exists and is in the section
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (!section.courses.some(c => c._id.toString() === courseId)) {
      return res.status(403).json({ message: 'Course not found in this section' });
    }

    // Check if user is student in this section
    if (user.roles && user.roles.includes('student') && section.students.some(s => s._id.toString() === userId)) {
      req.userDetails = user;
      return next();
    }

    // Check if user is teacher in this section
    if (user.roles && user.roles.includes('teacher') && section.teachers.some(t => t._id.toString() === userId)) {
      req.userDetails = user;
      return next();
    }

    // Check if user is course coordinator
    if (user.roles && user.roles.includes('cc') && course.coordinators.some(cc => cc._id.toString() === userId)) {
      req.userDetails = user;
      return next();
    }

    return res.status(403).json({ message: 'Access denied to this chat roomm2' });
  } catch (error) {
    console.error('Chat access check error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get chat messages for a specific course-section combination
router.get('/messages/:courseId/:sectionId', verifyToken, checkChatAccess, async (req, res) => {
  try {
    const { courseId, sectionId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const messages = await GroupChat.find({
      courseId,
      sectionId,
      isDeleted: false
    })
    .populate('senderId', 'name regNo teacherId roles primaryRole')
    .sort({ timestamp: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .exec();

    // Format messages for frontend
    const formattedMessages = messages.reverse().map(msg => {
      const sender = msg.senderId;
      let displayName = sender.name;
      let displayId = '';

      // Show admin as just "Admin" without name/ID
      if (sender.roles && sender.roles.includes('admin')) {
        displayName = 'Admin';
        displayId = '';
      } else {
        // Show appropriate ID based on role
        if (sender.roles && sender.roles.includes('student') && sender.regNo) {
          displayId = sender.regNo;
        } else if (sender.roles && sender.roles.includes('teacher') && sender.teacherId) {
          displayId = sender.teacherId;
        }
      }

      return {
        _id: msg._id,
        message: msg.message,
        timestamp: msg.timestamp,
        sender: {
          _id: sender._id,
          name: displayName,
          id: displayId,
          roles: sender.roles
        },
        canDelete: msg.canDelete(req.userDetails)
      };
    });

    res.json({
      messages: formattedMessages,
      pagination: {
        currentPage: parseInt(page),
        limit: parseInt(limit),
        hasMore: messages.length === parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send a new message
router.post('/messages/:courseId/:sectionId', verifyToken, checkChatAccess, async (req, res) => {
  try {
    const { courseId, sectionId } = req.params;
    const { message } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ message: 'Message cannot be empty' });
    }

    if (message.length > 1000) {
      return res.status(400).json({ message: 'Message too long (max 200 words)' });
    }

    const newMessage = new GroupChat({
      courseId,
      sectionId,
      senderId: req.user.id,
      message: message.trim()
    });

    await newMessage.save();
    await newMessage.populate('senderId', 'name regNo teacherId roles primaryRole');

    // Format message for response
    const sender = newMessage.senderId;
    let displayName = sender.name;
    let displayId = '';

    if (sender.roles && sender.roles.includes('admin')) {
      displayName = 'Admin';
      displayId = '';
    } else {
      if (sender.roles && sender.roles.includes('student') && sender.regNo) {
        displayId = sender.regNo;
      } else if (sender.roles && sender.roles.includes('teacher') && sender.teacherId) {
        displayId = sender.teacherId;
      }
    }

    const formattedMessage = {
      _id: newMessage._id,
      message: newMessage.message,
      timestamp: newMessage.timestamp,
      sender: {
        _id: sender._id,
        name: displayName,
        id: displayId,
        roles: sender.roles
      },
      canDelete: newMessage.canDelete(req.userDetails)
    };

    res.status(201).json({ message: formattedMessage });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a message (only for admin, dean, hod)
router.delete('/messages/:messageId', verifyToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const message = await GroupChat.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (!message.canDelete(user)) {
      return res.status(403).json({ message: 'Not authorized to delete this message' });
    }

    message.isDeleted = true;
    message.deletedBy = userId;
    message.deletedAt = new Date();
    await message.save();

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get chat rooms for a user (for admin/dean/hod to see all available chats)
router.get('/rooms', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let chatRooms = [];

    if (['admin', 'superadmin'].some(role => user.roles && user.roles.includes(role))) {
      // Admin can see all chat rooms
      const sections = await Section.find({ isActive: true })
        .populate('courses', 'title courseCode')
        .populate('school', 'name')
        .populate('department', 'name');

      sections.forEach(section => {
        section.courses.forEach(course => {
          chatRooms.push({
            courseId: course._id,
            sectionId: section._id,
            courseName: course.title,
            courseCode: course.courseCode,
            sectionName: section.name,
            schoolName: section.school?.name,
            departmentName: section.department?.name
          });
        });
      });
    } else if (user.roles && user.roles.includes('dean')) {
      // Dean can see chats for their schools
      const sections = await Section.find({ 
        school: { $in: user.roleAssignments.find(ra => ra.role === 'dean')?.schools || [] },
        isActive: true 
      })
        .populate('courses', 'title courseCode')
        .populate('school', 'name')
        .populate('department', 'name');

      sections.forEach(section => {
        section.courses.forEach(course => {
          chatRooms.push({
            courseId: course._id,
            sectionId: section._id,
            courseName: course.title,
            courseCode: course.courseCode,
            sectionName: section.name,
            schoolName: section.school?.name,
            departmentName: section.department?.name
          });
        });
      });
    } else if (user.roles && user.roles.includes('hod')) {
      // HOD can see chats for their departments
      const sections = await Section.find({ 
        department: { $in: user.roleAssignments.find(ra => ra.role === 'hod')?.departments || [] },
        isActive: true 
      })
        .populate('courses', 'title courseCode')
        .populate('school', 'name')
        .populate('department', 'name');

      sections.forEach(section => {
        section.courses.forEach(course => {
          chatRooms.push({
            courseId: course._id,
            sectionId: section._id,
            courseName: course.title,
            courseCode: course.courseCode,
            sectionName: section.name,
            schoolName: section.school?.name,
            departmentName: section.department?.name
          });
        });
      });
    }

    res.json({ chatRooms });
  } catch (error) {
    console.error('Get chat rooms error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;