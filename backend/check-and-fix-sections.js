const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Section = require('./models/Section');

async function checkStudentSections() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sgt-learning');
    console.log('✅ Connected to MongoDB');

    const students = await User.find({ role: 'student' }).populate('assignedSections');
    console.log(`\n👥 Found ${students.length} students:`);
    
    students.forEach((student, index) => {
      const sectionNames = student.assignedSections?.map(sec => sec.name).join(', ') || 'No sections';
      console.log(`   ${index + 1}. ${student.name} (${student.regNo}) - Sections: ${sectionNames}`);
    });

    // Now let's also check which sections exist and assign our admin to a section that has students
    const sectionsWithStudents = await Section.find();
    console.log(`\n🏫 Checking sections for students:`);
    
    for (const section of sectionsWithStudents) {
      const studentCount = await User.countDocuments({ 
        role: 'student', 
        assignedSections: section._id 
      });
      console.log(`   - ${section.name}: ${studentCount} students`);
      
      if (studentCount > 0) {
        console.log(`     ✅ This section has students!`);
        
        // Let's assign the admin to this section instead of "de"
        const admin = await User.findOne({ email: 'sourav11092002@gmail.com' });
        if (admin) {
          // Check if admin is already assigned to courses in this section
          const SectionCourseTeacher = require('./models/SectionCourseTeacher');
          const adminAssignments = await SectionCourseTeacher.find({
            teacher: admin._id,
            section: section._id
          });
          
          if (adminAssignments.length === 0) {
            console.log(`     🎯 Admin should be assigned to this section for video unlock requests`);
            
            // Get courses and assign admin to this section
            const Course = require('./models/Course');
            const courses = await Course.find().limit(2);
            
            if (courses.length > 0) {
              const assignmentsToCreate = courses.map(course => ({
                teacher: admin._id,
                section: section._id,
                course: course._id,
                assignedBy: admin._id,
                assignedAt: new Date()
              }));
              
              const result = await SectionCourseTeacher.insertMany(assignmentsToCreate);
              console.log(`     ✅ Created ${result.length} assignments for admin in ${section.name}`);
            }
          } else {
            console.log(`     ✅ Admin already assigned to ${adminAssignments.length} courses in this section`);
          }
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

checkStudentSections();