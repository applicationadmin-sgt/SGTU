require('dotenv').config();
const mongoose = require('mongoose');
const Unit = require('./models/Unit');

async function checkUnits() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const courseId = '68da652ec35425a4aff02532';
    const units = await Unit.find({ course: courseId }).select('_id title order');

    console.log(`Units for course ${courseId}:\n`);
    units.forEach((unit, index) => {
      console.log(`${index + 1}. Unit ID: ${unit._id}`);
      console.log(`   Title: ${unit.title}`);
      console.log(`   Order: ${unit.order}`);
      console.log('');
    });

    console.log('Quiz ID in QuizLock records: 68e5e2e129b7c9df01300342');
    const matchingUnit = units.find(u => u._id.toString() === '68e5e2e129b7c9df01300342');
    if (matchingUnit) {
      console.log(`✅ MATCH FOUND: ${matchingUnit.title}`);
    } else {
      console.log('❌ No matching unit found - Quiz might not be a Unit');
    }

    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkUnits();
