const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Section = require('./models/Section');
const Course = require('./models/Course');
const StudentProgress = require('./models/StudentProgress');

async function verifyMunmun2Assignment() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/student-dashboard');
    console.log('Connected to MongoDB');

    // Find Munmun2
    const student = await User.findOne({ 
      $or: [
        { email: { $regex: /munmun2/i } },
        { name: { $regex: /munmun2/i } },
        { email: { $regex: /munmun/i } }
      ]
    });

    if (!student) {
      console.log('❌ Student Munmun2 not found');
      console.log('Let me search for all students with "mun" in name/email:');
      const similarStudents = await User.find({ 
        $or: [
          { email: { $regex: /mun/i } },
          { name: { $regex: /mun/i } }
        ],
        role: 'student'
      }).select('name email role');
      console.log('Similar students:', similarStudents);
      return;
    }

    console.log('✅ Found student:', {
      _id: student._id,
      name: student.name,
      email: student.email,
      role: student.role
    });

    // Find M.NURO003 section
    const section = await Section.findOne({ 
      sectionName: { $regex: /M\.NURO003/i }
    }).populate('courses', 'title courseCode').populate('students', 'name email');

    if (!section) {
      console.log('❌ Section M.NURO003 not found');
      console.log('Let me search for sections with "NURO" in name:');
      const similarSections = await Section.find({ 
        sectionName: { $regex: /nuro/i }
      }).select('sectionName courses students');
      console.log('Similar sections:', similarSections);
      return;
    }

    console.log('✅ Found section:', {
      _id: section._id,
      sectionName: section.sectionName,
      courses: section.courses.map(c => ({ id: c._id, title: c.title, code: c.courseCode })),
      studentsCount: section.students.length
    });

    // Check if student is in section
    const isStudentInSection = section.students.some(s => s._id.toString() === student._id.toString());
    console.log('✅ Student in section:', isStudentInSection);

    if (isStudentInSection) {
      console.log('✅ Student names in section:', section.students.map(s => ({ name: s.name, email: s.email })));
    }

    // Check if C000008 course is in section
    const courseInSection = section.courses.find(c => c.courseCode === 'C000008');
    console.log('✅ Course C000008 in section:', !!courseInSection);

    if (courseInSection) {
      console.log('✅ Course details:', {
        _id: courseInSection._id,
        title: courseInSection.title,
        courseCode: courseInSection.courseCode
      });

      // Check student progress for this course
      const progress = await StudentProgress.findOne({
        student: student._id,
        course: courseInSection._id
      });

      console.log('📊 Student progress exists:', !!progress);
      if (progress) {
        console.log('📊 Progress details:', {
          unlockedVideosCount: progress.unlockedVideos?.length || 0,
          unlockedVideoIds: progress.unlockedVideos?.map(id => id.toString()) || [],
          unitsCount: progress.units?.length || 0,
          overallProgress: progress.overallProgress || 0
        });
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

verifyMunmun2Assignment();