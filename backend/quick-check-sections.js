const mongoose = require('mongoose');
const User = require('./models/User');
const Section = require('./models/Section');

// Connect to MongoDB Atlas
mongoose.connect('mongodb+srv://sourav092002_db_user:aq5UgwNDh2tgyZcB@cluster0.nvkrxcx.mongodb.net/');

async function quickCheckStudentSections() {
  try {
    console.log('🔍 Quick check of student section assignments...\n');
    
    // Find a few students
    const students = await User.find({ role: 'student' }).limit(3);
    console.log(`Found ${students.length} students\n`);
    
    for (const student of students) {
      console.log(`🧑‍🎓 Checking student: ${student.name} (${student.email})`);
      
      // Check if this student is in any section
      const section = await Section.findOne({ students: student._id })
        .populate('teacher', 'name email')
        .populate('students', 'name email');
      
      if (section) {
        console.log(`✅ Student IS in section: ${section.name}`);
        console.log(`   Teacher: ${section.teacher?.name || 'N/A'}`);
        console.log(`   Total students: ${section.students?.length || 0}`);
      } else {
        console.log(`❌ Student is NOT assigned to any section`);
      }
      console.log('---');
    }
    
    // Check how many sections exist and how many have students
    const totalSections = await Section.countDocuments({});
    const sectionsWithStudents = await Section.countDocuments({ students: { $exists: true, $ne: [] } });
    
    console.log(`\n📊 Section Summary:`);
    console.log(`Total sections: ${totalSections}`);
    console.log(`Sections with students: ${sectionsWithStudents}`);
    
    // Get a sample section with students
    const sampleSection = await Section.findOne({ students: { $exists: true, $ne: [] } })
      .populate('students', 'name email role');
    
    if (sampleSection) {
      console.log(`\n📚 Sample section with students: ${sampleSection.name}`);
      console.log(`Students in this section: ${sampleSection.students?.length || 0}`);
      
      // Let's assign our test student to this section if they're not assigned anywhere
      const testStudent = students[0];
      const testStudentSection = await Section.findOne({ students: testStudent._id });
      
      if (!testStudentSection) {
        console.log(`\n🔧 Assigning ${testStudent.name} to section ${sampleSection.name}...`);
        
        await Section.findByIdAndUpdate(sampleSection._id, {
          $addToSet: { students: testStudent._id }
        });
        
        console.log('✅ Assignment complete!');
      } else {
        console.log(`\n✅ ${testStudent.name} is already assigned to a section.`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    mongoose.connection.close();
  }
}

quickCheckStudentSections();