const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lms', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const Course = require('./models/Course');
const Unit = require('./models/Unit');

async function checkAstrochemistryDeadlines() {
  try {
    // The course ID from URL: 68cbcc904eb37fd405cae0c2
    const courseId = '68cbcc904eb37fd405cae0c2';
    
    console.log('🔍 Checking course ID:', courseId);
    
    // Find the course
    const course = await Course.findById(courseId);
    if (!course) {
      console.log('❌ Course not found');
      return;
    }

    console.log('✅ Course found:');
    console.log('- Title:', course.title);
    console.log('- Code:', course.courseCode);
    console.log('- Has units:', course.hasUnits);

    // Find units for this course
    const units = await Unit.find({ course: courseId });
    console.log(`\n📝 Found ${units.length} units:`);

    for (const unit of units) {
      console.log(`\nUnit: ${unit.title}`);
      console.log(`- ID: ${unit._id}`);
      console.log(`- Order: ${unit.order}`);
      console.log(`- Has deadline: ${unit.hasDeadline}`);
      console.log(`- Deadline: ${unit.deadline}`);
      console.log(`- Warning days: ${unit.warningDays}`);
      console.log(`- Strict deadline: ${unit.strictDeadline}`);
      console.log(`- Description: ${unit.deadlineDescription}`);
    }

    // If no units have deadlines, let's add one to the first unit
    if (units.length > 0) {
      const firstUnit = units[0];
      if (!firstUnit.hasDeadline) {
        console.log(`\n🎯 Adding deadline to unit: ${firstUnit.title}`);
        
        const deadline = new Date('2025-09-20T18:29:00.000Z'); // Same deadline as before
        
        await Unit.findByIdAndUpdate(firstUnit._id, {
          hasDeadline: true,
          deadline: deadline,
          deadlineDescription: 'Test deadline for Astrochemistry course',
          strictDeadline: true,
          warningDays: 3
        });
        
        console.log('✅ Deadline added successfully!');
        console.log('Deadline:', deadline);
        console.log('Warning days: 3');
      } else {
        console.log(`\n✅ Unit ${firstUnit.title} already has a deadline`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.disconnect();
  }
}

checkAstrochemistryDeadlines();