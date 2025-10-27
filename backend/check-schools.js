const mongoose = require('mongoose');
const School = require('./models/School');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/sgtlms', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));

async function checkSchools() {
  try {
    const schools = await School.find({});
    console.log(`\n📚 Found ${schools.length} schools in database:\n`);
    
    schools.forEach((school, index) => {
      console.log(`${index + 1}. Name: "${school.name}"`);
      console.log(`   Code: "${school.code}"`);
      console.log(`   ID: ${school._id}`);
      console.log('');
    });
    
    if (schools.length === 0) {
      console.log('⚠️  No schools found! Please create schools first.');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

checkSchools();
