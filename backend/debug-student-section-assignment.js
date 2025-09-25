const mongoose = require('mongoose');
const User = require('./models/User');
const Section = require('./models/Section');

// Connect to MongoDB Atlas
mongoose.connect('mongodb+srv://sourav092002_db_user:aq5UgwNDh2tgyZcB@cluster0.nvkrxcx.mongodb.net/');

async function debugStudentSectionIssue() {
  try {
    console.log('🔍 Debugging student section assignment issue...\n');
    
    // Find a student to test with
    const student = await User.findOne({ role: 'student' }).limit(1);
    if (!student) {
      console.log('❌ No students found in database');
      return;
    }
    
    console.log(`🧑‍🎓 Testing with student: ${student.name} (${student.email})`);
    console.log(`Student ID: ${student._id}`);
    console.log(`Role: ${student.role}\n`);
    
    // Check if this student is assigned to any section
    const studentSection = await Section.findOne({ students: student._id })
      .populate('teacher', 'name email')
      .populate('courses', 'title courseCode')
      .populate('students', 'name email')
      .populate('school', 'name')
      .populate('department', 'name');
    
    if (studentSection) {
      console.log('✅ Student IS assigned to a section:');
      console.log(`Section Name: ${studentSection.name}`);
      console.log(`Course: ${studentSection.courses?.[0]?.title || 'N/A'}`);
      console.log(`Courses: ${studentSection.courses?.map(c => c.title).join(', ') || 'N/A'}`);
      console.log(`Teacher: ${studentSection.teacher?.name}`);
      console.log(`School: ${studentSection.school?.name}`);
      console.log(`Department: ${studentSection.department?.name}`);
      console.log(`Total Students: ${studentSection.students?.length}`);
    } else {
      console.log('❌ Student is NOT assigned to any section');
      
      // Let's check what sections exist and how they're structured
      console.log('\n📚 Available sections in database:');
      const allSections = await Section.find({})
        .populate('teacher', 'name email')
        .populate('courses', 'title courseCode')
        .populate('students', 'name email')
        .limit(5);
      
      if (allSections.length > 0) {
        allSections.forEach((section, index) => {
          console.log(`${index + 1}. Section: ${section.name}`);
          console.log(`   Course: ${section.courses?.[0]?.title || 'N/A'}`);
          console.log(`   Courses: ${section.courses?.map(c => c.title).join(', ') || 'N/A'}`);
          console.log(`   Teacher: ${section.teacher?.name || 'N/A'}`);
          console.log(`   Students: ${section.students?.length || 0}`);
          if (section.students?.length > 0) {
            console.log(`   Sample students: ${section.students.slice(0, 2).map(s => s.name).join(', ')}`);
          }
          console.log('---');
        });
        
        // Let's assign the student to the first available section for testing
        console.log(`\n🔧 Assigning student ${student.name} to section ${allSections[0].name}...`);
        
        // Add student to section
        await Section.findByIdAndUpdate(allSections[0]._id, {
          $addToSet: { students: student._id }
        });
        
        console.log('✅ Student assigned to section successfully!');
        
        // Verify the assignment
        const verifySection = await Section.findById(allSections[0]._id)
          .populate('students', 'name email');
        
        const isStudentInSection = verifySection.students.some(s => s._id.toString() === student._id.toString());
        console.log(`Verification: Student in section? ${isStudentInSection}`);
        
      } else {
        console.log('❌ No sections found in database');
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    mongoose.connection.close();
  }
}

debugStudentSectionIssue();