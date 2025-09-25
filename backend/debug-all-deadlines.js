const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lms', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const Unit = require('./models/Unit');
const Course = require('./models/Course');

async function findUnitsWithDeadlines() {
  try {
    console.log('Finding all units with deadlines...\n');

    const unitsWithDeadlines = await Unit.find({
      hasDeadline: true,
      deadline: { $ne: null }
    }).populate('course', 'title courseCode');

    console.log(`Found ${unitsWithDeadlines.length} units with deadlines:\n`);

    for (const unit of unitsWithDeadlines) {
      console.log(`Unit: ${unit.title}`);
      console.log(`Course: ${unit.course.title} (${unit.course.courseCode})`);
      console.log(`Course ID: ${unit.course._id}`);
      console.log(`Unit ID: ${unit._id}`);
      console.log(`Deadline: ${unit.deadline}`);
      console.log(`Warning days: ${unit.warningDays}`);
      console.log(`Strict deadline: ${unit.strictDeadline}`);
      console.log(`Description: ${unit.deadlineDescription}`);
      console.log('---');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.disconnect();
  }
}

findUnitsWithDeadlines();