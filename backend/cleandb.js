// cleanDatabase.js
const mongoose = require('mongoose');
require('dotenv').config();

const collections = [
  'users',
  'sections',
  'courses',
  'departments',
  'schools',
  'sectioncourseteachers',
  'studentprogresses',
  'quizattempts',
  'quizzes',
  'units',
  'announcements',
  'notifications',
  // Add any other collection names you want to clean
];

async function cleanDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');

    for (const name of collections) {
      const result = await mongoose.connection.collection(name).deleteMany({});
      console.log(`Cleared ${result.deletedCount} documents from ${name}`);
    }

    await mongoose.disconnect();
    console.log('Database cleaned and disconnected.');
  } catch (err) {
    console.error('Error cleaning database:', err);
    process.exit(1);
  }
}

cleanDB();