const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lms', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const Unit = require('./models/Unit');
const Course = require('./models/Course');

async function checkAstrophysicsUnits() {
  try {
    const astrophysicsCourse = await Course.findOne({ courseCode: 'C000011' });
    
    if (!astrophysicsCourse) {
      console.log('Astrophysics course not found');
      return;
    }

    console.log('Astrophysics Course:');
    console.log('ID:', astrophysicsCourse._id);
    console.log('Title:', astrophysicsCourse.title);
    console.log('Code:', astrophysicsCourse.courseCode);

    const units = await Unit.find({ course: astrophysicsCourse._id }).sort('order');
    
    console.log(`\nFound ${units.length} units in Astrophysics course:`);
    
    for (const unit of units) {
      console.log(`\nUnit: ${unit.title}`);
      console.log(`ID: ${unit._id}`);
      console.log(`Order: ${unit.order}`);
      console.log(`Has deadline: ${unit.hasDeadline}`);
      console.log(`Deadline: ${unit.deadline}`);
    }

    // Add deadline to the first unit if it exists
    if (units.length > 0) {
      const firstUnit = units[0];
      console.log(`\n🎯 Adding deadline to unit: ${firstUnit.title}`);
      
      const deadline = new Date('2025-09-20T18:29:00.000Z'); // Same deadline as the other unit
      
      await Unit.findByIdAndUpdate(firstUnit._id, {
        hasDeadline: true,
        deadline: deadline,
        deadlineDescription: 'Test deadline for Astrophysics student',
        strictDeadline: true,
        warningDays: 3
      });
      
      console.log('✅ Deadline added successfully!');
      console.log('Deadline:', deadline);
      console.log('Warning days: 3');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.disconnect();
  }
}

checkAstrophysicsUnits();