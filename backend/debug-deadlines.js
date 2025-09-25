const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sgt_learning', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const Unit = require('./models/Unit');
const { checkUnitDeadline } = require('./utils/deadlineUtils');

async function debugDeadlines() {
  try {
    console.log('=== Debugging Unit Deadlines ===');
    
    // Get all units with deadlines
    const units = await Unit.find({ hasDeadline: true })
      .populate('course', 'title courseCode')
      .select('title hasDeadline deadline deadlineDescription strictDeadline warningDays course');
    
    console.log(`Found ${units.length} units with deadlines:`);
    
    for (const unit of units) {
      console.log(`\n--- Unit: ${unit.title} ---`);
      console.log(`Course: ${unit.course?.title} (${unit.course?.courseCode})`);
      console.log(`Has Deadline: ${unit.hasDeadline}`);
      console.log(`Deadline: ${unit.deadline}`);
      console.log(`Strict: ${unit.strictDeadline}`);
      console.log(`Warning Days: ${unit.warningDays}`);
      console.log(`Description: ${unit.deadlineDescription}`);
      
      // Check deadline status
      const deadlineInfo = await checkUnitDeadline(unit._id);
      console.log(`Deadline Status:`, deadlineInfo);
    }
    
    console.log('\n=== Current Date ===');
    console.log('Current Date:', new Date());
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

debugDeadlines();