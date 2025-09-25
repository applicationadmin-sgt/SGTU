const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sgt_learning', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const Unit = require('./models/Unit');
const Course = require('./models/Course');

async function checkAllUnits() {
  try {
    console.log('=== All Units in Database ===');
    
    const units = await Unit.find({})
      .populate('course', 'title courseCode')
      .sort('createdAt');
    
    console.log(`Found ${units.length} total units:`);
    
    for (const unit of units) {
      console.log(`\n--- Unit: ${unit.title} ---`);
      console.log(`Course: ${unit.course?.title} (${unit.course?.courseCode})`);
      console.log(`Created: ${unit.createdAt}`);
      console.log(`Has Deadline: ${unit.hasDeadline}`);
      console.log(`Deadline: ${unit.deadline}`);
      console.log(`Strict: ${unit.strictDeadline}`);
      console.log(`Warning Days: ${unit.warningDays}`);
      console.log(`Description: ${unit.deadlineDescription}`);
      console.log(`Order: ${unit.order}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkAllUnits();