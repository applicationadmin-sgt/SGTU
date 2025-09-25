const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('./models/User');
const Video = require('./models/Video');
const Unit = require('./models/Unit');
const Course = require('./models/Course');
const Section = require('./models/Section');
const SectionCourseTeacher = require('./models/SectionCourseTeacher');
const VideoUnlockRequest = require('./models/VideoUnlockRequest');

async function checkVideoUnlockData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sgt-learning', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    console.log('\n🔍 Checking Video Unlock System Data...\n');

    // 1. Check if there are students
    const students = await User.find({ role: 'student' }).limit(5);
    console.log(`👥 Students in database: ${students.length}`);
    if (students.length > 0) {
      console.log(`   Sample student: ${students[0].name} (${students[0].email})`);
    }

    // 2. Check if there are teachers
    const teachers = await User.find({ role: 'teacher' }).limit(5);
    console.log(`👨‍🏫 Teachers in database: ${teachers.length}`);
    if (teachers.length > 0) {
      console.log(`   Sample teacher: ${teachers[0].name} (${teachers[0].email})`);
    }

    // 3. Check sections
    const sections = await Section.find().limit(5);
    console.log(`🏫 Sections in database: ${sections.length}`);
    if (sections.length > 0) {
      console.log(`   Sample section: ${sections[0].name}`);
    }

    // 4. Check courses
    const courses = await Course.find().limit(5);
    console.log(`📚 Courses in database: ${courses.length}`);
    if (courses.length > 0) {
      console.log(`   Sample course: ${courses[0].name}`);
    }

    // 5. Check units
    const units = await Unit.find().limit(5);
    console.log(`📖 Units in database: ${units.length}`);
    if (units.length > 0) {
      console.log(`   Sample unit: ${units[0].title}`);
    }

    // 6. Check videos
    const videos = await Video.find().limit(5);
    console.log(`🎥 Videos in database: ${videos.length}`);
    if (videos.length > 0) {
      console.log(`   Sample video: ${videos[0].title}`);
    }

    // 7. Check teacher-section-course assignments
    const assignments = await SectionCourseTeacher.find().limit(5);
    console.log(`🔗 Section-Course-Teacher assignments: ${assignments.length}`);

    // 8. Check existing video unlock requests
    const unlockRequests = await VideoUnlockRequest.find().limit(5);
    console.log(`🔓 Video unlock requests: ${unlockRequests.length}`);

    // 9. Let's check if there's a specific teacher and get their students
    const adminTeacher = await User.findOne({ email: 'sourav11092002@gmail.com' });
    if (adminTeacher) {
      console.log(`\n👨‍🏫 Checking data for teacher: ${adminTeacher.name}`);
      
      // Get sections where this teacher teaches
      const teacherAssignments = await SectionCourseTeacher.find({ teacher: adminTeacher._id })
        .populate('section')
        .populate('course');
      
      console.log(`   Teacher assignments: ${teacherAssignments.length}`);
      
      if (teacherAssignments.length > 0) {
        const sectionIds = [...new Set(teacherAssignments.map(a => a.section._id))];
        
        // Get students in these sections
        const sectionStudents = await User.find({
          role: 'student',
          sections: { $in: sectionIds }
        });
        
        console.log(`   Students in teacher's sections: ${sectionStudents.length}`);
        
        if (sectionStudents.length > 0) {
          console.log(`   Sample student: ${sectionStudents[0].name} (${sectionStudents[0].regNo})`);
          
          // Check if this student has courses in common with the teacher
          const studentSections = sectionStudents[0].sections;
          const commonCourses = teacherAssignments.filter(assignment => 
            studentSections.some(sectionId => sectionId.toString() === assignment.section._id.toString())
          );
          
          console.log(`   Common courses with first student: ${commonCourses.length}`);
          
          if (commonCourses.length > 0) {
            const courseId = commonCourses[0].course._id;
            console.log(`   Sample course: ${commonCourses[0].course.name}`);
            
            // Check units and videos for this course
            const courseUnits = await Unit.find({ course: courseId });
            console.log(`   Units in course: ${courseUnits.length}`);
            
            if (courseUnits.length > 0) {
              const unitVideos = await Video.find({ unit: courseUnits[0]._id });
              console.log(`   Videos in first unit: ${unitVideos.length}`);
              
              if (unitVideos.length > 0) {
                console.log(`   Sample video: ${unitVideos[0].title}`);
                console.log(`\n✅ Data chain complete: Teacher → Section → Course → Unit → Video → Student`);
              }
            }
          }
        }
      } else {
        console.log(`   ⚠️ Teacher has no section-course assignments!`);
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   - Students: ${students.length}`);
    console.log(`   - Teachers: ${teachers.length}`);
    console.log(`   - Sections: ${sections.length}`);
    console.log(`   - Courses: ${courses.length}`);
    console.log(`   - Units: ${units.length}`);
    console.log(`   - Videos: ${videos.length}`);
    console.log(`   - Teacher Assignments: ${assignments.length}`);
    console.log(`   - Video Unlock Requests: ${unlockRequests.length}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

// Run the check
checkVideoUnlockData();