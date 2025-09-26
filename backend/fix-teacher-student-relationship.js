const mongoose = require('mongoose');
require('dotenv').config();

async function fixTeacherStudentRelationship() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const User = require('./models/User');
    const Section = require('./models/Section');
    
    // Find the teacher and student
    const teacher = await User.findOne({ name: /Pollav/i });
    const student = await User.findOne({ regNo: 'S999989' });
    
    console.log('\n🔧 Fixing Teacher-Student Relationship...');
    console.log(`Teacher: ${teacher?.name}`);
    console.log(`Student: ${student?.name} (${student?.regNo})`);
    
    if (!teacher || !student) {
      console.log('❌ Could not find teacher or student');
      return;
    }
    
    // Find the student's section
    const studentSection = await Section.findOne({ students: student._id });
    
    if (studentSection) {
      console.log(`\n📚 Found student's section: ${studentSection.name}`);
      
      // Add teacher to this section if not already there
      if (!studentSection.teachers.includes(teacher._id)) {
        studentSection.teachers.push(teacher._id);
        await studentSection.save();
        console.log(`✅ Added teacher "${teacher.name}" to section "${studentSection.name}"`);
      } else {
        console.log(`✅ Teacher "${teacher.name}" already in section "${studentSection.name}"`);
      }
      
      // Verify the relationship
      const updatedSection = await Section.findById(studentSection._id)
        .populate('teachers', 'name')
        .populate('students', 'name regNo');
        
      console.log(`\n✅ Updated section "${updatedSection.name}":`);
      console.log(`   Teachers: ${updatedSection.teachers.map(t => t.name).join(', ')}`);
      console.log(`   Students: ${updatedSection.students.map(s => `${s.name} (${s.regNo})`).join(', ')}`);
      
    } else {
      console.log('\n❌ No section found for student');
    }
    
    await mongoose.connection.close();
    console.log('\n🎉 Teacher-Student relationship fixed! Teacher should now see unlock requests.');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixTeacherStudentRelationship();