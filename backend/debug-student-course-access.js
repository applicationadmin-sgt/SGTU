const mongoose = require('mongoose');
require('dotenv').config();

async function debugStudentCourseAccess() {
  try {
    console.log('🔍 Debugging Student Course Access');
    console.log('=================================');

    await mongoose.connect(process.env.MONGODB_URI);

    const User = require('./models/User');
    const StudentProgress = require('./models/StudentProgress');
    const Course = require('./models/Course');

    // Find the student
    const student = await User.findOne({ email: 'titli@gmail.com' });
    if (!student) {
      console.log('❌ Student not found');
      return;
    }

    console.log('✅ Student found:', student.name, 'ID:', student._id);

    // Check student's course enrollments
    const studentProgress = await StudentProgress.find({ student: student._id })
      .populate('course', 'title courseCode');

    console.log(`\n📚 Student is enrolled in ${studentProgress.length} courses:`);
    studentProgress.forEach((progress, index) => {
      console.log(`  ${index + 1}. ${progress.course.title} (${progress.course.courseCode})`);
    });

    // Check if C000011 (Astrophysics) is in the list
    const astrophysicsProgress = studentProgress.find(p => p.course.courseCode === 'C000011');
    if (astrophysicsProgress) {
      console.log('\n✅ Student IS enrolled in Astrophysics course');
      console.log('Progress details:', {
        courseId: astrophysicsProgress.course._id,
        unitsCount: astrophysicsProgress.units.length,
        overallProgress: astrophysicsProgress.overallProgress
      });
    } else {
      console.log('\n❌ Student is NOT enrolled in Astrophysics course');
      console.log('This explains why no deadline warnings were found');
    }

    // Check what courses have C000011
    const astrophysicsCourse = await Course.findOne({ courseCode: 'C000011' });
    if (astrophysicsCourse) {
      console.log('\n📖 Astrophysics course exists:', astrophysicsCourse.title);
      console.log('Course ID:', astrophysicsCourse._id);
    }

    await mongoose.disconnect();

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugStudentCourseAccess();