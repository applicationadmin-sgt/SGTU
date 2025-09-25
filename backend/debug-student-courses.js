const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lms', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const User = require('./models/User');
const StudentProgress = require('./models/StudentProgress');
const Course = require('./models/Course');
const Unit = require('./models/Unit');

async function findStudentCourses() {
  try {
    // Find the student
    const student = await User.findOne({ email: 'titli@gmail.com' });
    if (!student) {
      console.log('Student not found');
      return;
    }

    console.log('Student found:');
    console.log('ID:', student._id);
    console.log('Name:', student.name);
    console.log('Email:', student.email);

    // Find student's course enrollments
    const progressRecords = await StudentProgress.find({ student: student._id })
      .populate('course', 'title courseCode');

    console.log('\nStudent course enrollments:');
    console.log('Total courses:', progressRecords.length);

    for (const progress of progressRecords) {
      console.log(`\nCourse: ${progress.course.title} (${progress.course.courseCode})`);
      console.log(`Course ID: ${progress.course._id}`);
      
      // Check if this course has any units with deadlines
      const unitsWithDeadlines = await Unit.find({
        course: progress.course._id,
        hasDeadline: true,
        deadline: { $ne: null }
      });

      console.log(`Units with deadlines: ${unitsWithDeadlines.length}`);
      
      for (const unit of unitsWithDeadlines) {
        console.log(`  - Unit: ${unit.title}`);
        console.log(`    Deadline: ${unit.deadline}`);
        console.log(`    Warning days: ${unit.warningDays}`);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.disconnect();
  }
}

findStudentCourses();