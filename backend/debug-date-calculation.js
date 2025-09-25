const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lms', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const Unit = require('./models/Unit');
const { checkUnitDeadline } = require('./utils/deadlineUtils');

async function debugDateCalculation() {
  try {
    console.log('Current time:', new Date());
    console.log('Current time (ISO):', new Date().toISOString());
    console.log('Current time (local):', new Date().toLocaleString());

    // Find the unit with deadline
    const unit = await Unit.findOne({ 
      hasDeadline: true,
      deadline: { $ne: null }
    });

    if (!unit) {
      console.log('No unit with deadline found');
      return;
    }

    console.log('\nUnit details:');
    console.log('Unit ID:', unit._id);
    console.log('Unit title:', unit.title);
    console.log('Has deadline:', unit.hasDeadline);
    console.log('Deadline (raw):', unit.deadline);
    console.log('Deadline (ISO):', new Date(unit.deadline).toISOString());
    console.log('Deadline (local):', new Date(unit.deadline).toLocaleString());
    console.log('Warning days:', unit.warningDays);

    // Manual calculation
    const now = new Date();
    const deadline = new Date(unit.deadline);
    const diffTime = deadline - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    console.log('\nManual calculation:');
    console.log('Diff time (ms):', diffTime);
    console.log('Diff time (hours):', diffTime / (1000 * 60 * 60));
    console.log('Diff days (Math.ceil):', diffDays);
    console.log('Diff days (Math.floor):', Math.floor(diffTime / (1000 * 60 * 60 * 24)));
    
    const isExpired = now > deadline;
    const showWarning = diffDays <= unit.warningDays && diffDays > 0;
    
    console.log('\nLogic checks:');
    console.log('Is expired:', isExpired);
    console.log('diffDays <= warningDays:', diffDays, '<=', unit.warningDays, '=', diffDays <= unit.warningDays);
    console.log('diffDays > 0:', diffDays, '> 0 =', diffDays > 0);
    console.log('Show warning:', showWarning);

    // Call the actual function
    console.log('\nActual function result:');
    const deadlineCheck = await checkUnitDeadline(unit._id);
    console.log(JSON.stringify(deadlineCheck, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.disconnect();
  }
}

debugDateCalculation();