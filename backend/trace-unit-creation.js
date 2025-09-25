require('dotenv').config();
const mongoose = require('mongoose');
const Unit = require('./models/Unit');
const Course = require('./models/Course');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sgt_learning');

console.log('🔍 Tracing Unit Creation Process');
console.log('================================');

async function traceUnitCreation() {
  try {
    // First, let's see what a typical course structure looks like
    const course = await Course.findOne().lean();
    if (!course) {
      console.log('❌ No courses found');
      return;
    }

    console.log('✅ Sample Course found:', course.title);
    console.log('Course ID:', course._id);

    // Now let's test creating a unit with deadline data
    const testUnitData = {
      title: 'TEST UNIT WITH DEADLINE',
      description: 'This is a test unit to check deadline persistence',
      course: course._id,
      unitNumber: 999,
      hasDeadline: true,
      deadline: new Date('2025-12-31T23:59:00'),
      deadlineDescription: 'End of year deadline',
      strictDeadline: true,
      warningDays: 3
    };

    console.log('\n📝 Creating test unit with deadline data:');
    console.log('hasDeadline:', testUnitData.hasDeadline);
    console.log('deadline:', testUnitData.deadline);
    console.log('deadlineDescription:', testUnitData.deadlineDescription);
    console.log('strictDeadline:', testUnitData.strictDeadline);
    console.log('warningDays:', testUnitData.warningDays);

    // Create the unit
    const newUnit = new Unit(testUnitData);
    const savedUnit = await newUnit.save();

    console.log('\n💾 Unit saved to database:');
    console.log('ID:', savedUnit._id);
    console.log('hasDeadline:', savedUnit.hasDeadline);
    console.log('deadline:', savedUnit.deadline);
    console.log('deadlineDescription:', savedUnit.deadlineDescription);
    console.log('strictDeadline:', savedUnit.strictDeadline);
    console.log('warningDays:', savedUnit.warningDays);

    // Now fetch it back from the database to confirm persistence
    const fetchedUnit = await Unit.findById(savedUnit._id).lean();
    console.log('\n🔄 Fetched unit from database:');
    console.log('hasDeadline:', fetchedUnit.hasDeadline);
    console.log('deadline:', fetchedUnit.deadline);
    console.log('deadlineDescription:', fetchedUnit.deadlineDescription);
    console.log('strictDeadline:', fetchedUnit.strictDeadline);
    console.log('warningDays:', fetchedUnit.warningDays);

    // Clean up test unit
    await Unit.findByIdAndDelete(savedUnit._id);
    console.log('\n🗑️ Test unit cleaned up');

    // Check if the issue is with existing units - maybe the schema changed?
    console.log('\n🔍 Checking existing units schema...');
    const existingUnit = await Unit.findOne().lean();
    if (existingUnit) {
      console.log('Existing unit fields:', Object.keys(existingUnit));
      console.log('Has deadline field?', 'hasDeadline' in existingUnit);
      console.log('Has deadline date field?', 'deadline' in existingUnit);
    }

  } catch (error) {
    console.error('❌ Error during unit creation test:', error);
  } finally {
    mongoose.disconnect();
  }
}

traceUnitCreation();