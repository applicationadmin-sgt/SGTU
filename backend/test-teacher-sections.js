const mongoose = require('mongoose');
const User = require('./models/User');
const Section = require('./models/Section');
const Course = require('./models/Course');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI);

async function testTeacherSections() {
  try {
    console.log('🔍 Testing teacher section assignments...\n');
    
    // Find the teacher "Dipanwita"
    const teacher = await User.findOne({ name: "Dipanwita" });
    if (!teacher) {
      console.log('❌ Teacher Dipanwita not found');
      return;
    }
    
    console.log('✅ Teacher found:');
    console.log(`   Name: ${teacher.name}`);
    console.log(`   Email: ${teacher.email}`);
    console.log(`   ID: ${teacher._id}`);
    console.log(`   Role: ${teacher.role}\n`);
    
    // Query sections using the same logic as teacher profile
    const sections = await Section.find({ 
      $or: [
        { teacher: teacher._id }, 
        { teachers: teacher._id }
      ] 
    })
    .populate('courses', 'title courseCode')
    .populate('students', 'name regNo');
    
    console.log(`🔍 Sections found using profile query: ${sections.length}\n`);
    
    if (sections.length > 0) {
      sections.forEach((section, index) => {
        console.log(`📚 Section ${index + 1}:`);
        console.log(`   Name: ${section.name}`);
        console.log(`   ID: ${section._id}`);
        console.log(`   Teacher (legacy): ${section.teacher || 'Not set'}`);
        console.log(`   Teachers (array): ${section.teachers?.length || 0} teachers`);
        console.log(`   Students: ${section.students?.length || 0}`);
        console.log(`   Courses: ${section.courses?.length || 0}`);
        
        if (section.teachers && section.teachers.length > 0) {
          console.log(`   Teachers in array: ${section.teachers.map(t => t.toString()).join(', ')}`);
        }
        console.log('');
      });
    } else {
      console.log('❌ No sections found for this teacher');
      
      // Check if the teacher is in any section at all
      console.log('\n🔍 Checking all sections to see if teacher is assigned anywhere...');
      
      const allSections = await Section.find({})
        .populate('courses', 'title courseCode')
        .populate('students', 'name regNo');
      
      let foundInSections = [];
      
      allSections.forEach(section => {
        const isTeacher = section.teacher && section.teacher.toString() === teacher._id.toString();
        const isInTeachers = section.teachers && section.teachers.some(t => t.toString() === teacher._id.toString());
        
        if (isTeacher || isInTeachers) {
          foundInSections.push({
            section: section,
            isMainTeacher: isTeacher,
            isInTeachersArray: isInTeachers
          });
        }
      });
      
      if (foundInSections.length > 0) {
        console.log(`✅ Found teacher in ${foundInSections.length} sections:`);
        foundInSections.forEach((item, index) => {
          console.log(`\n📚 Section ${index + 1}:`);
          console.log(`   Name: ${item.section.name}`);
          console.log(`   ID: ${item.section._id}`);
          console.log(`   Is main teacher: ${item.isMainTeacher}`);
          console.log(`   Is in teachers array: ${item.isInTeachersArray}`);
          console.log(`   Students: ${item.section.students?.length || 0}`);
        });
      } else {
        console.log('❌ Teacher not found in any sections');
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.disconnect();
  }
}

testTeacherSections();