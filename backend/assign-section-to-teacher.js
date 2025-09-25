const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('./models/User');
const Section = require('./models/Section');
const Course = require('./models/Course');

async function assignSectionToTeacher() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🔗 Connected to MongoDB');
    
    // Find Mukherjee Sourav
    const teacher = await User.findOne({ email: '1109sourav@gmail.com' });
    console.log('👨‍🏫 Teacher:', teacher.name, teacher._id);
    
    // Check if there are any unassigned sections or if we should create one
    console.log('\n🔍 Checking available sections...');
    
    // First, let's see all sections and their teacher assignments
    const allSections = await Section.find({})
      .populate('teacher', 'name email')
      .populate('courses', 'title courseCode')
      .populate('students', 'name');
    
    console.log(`\n📚 All sections in system (${allSections.length}):`);
    allSections.forEach((section, i) => {
      console.log(`${i + 1}. ${section.name} - Teacher: ${section.teacher?.name || 'UNASSIGNED'} - ${section.students?.length || 0} students - Courses: ${section.courses?.map(c => c.courseCode).join(', ') || 'None'}`);
    });
    
    // Check if there are sections without a teacher that we could assign
    const unassignedSections = allSections.filter(section => !section.teacher);
    console.log(`\n🎯 Unassigned sections: ${unassignedSections.length}`);
    
    if (unassignedSections.length > 0) {
      console.log('\n💡 Found unassigned sections. We could assign one to Mukherjee Sourav.');
      unassignedSections.forEach((section, i) => {
        console.log(`${i + 1}. ${section.name} - ${section.students?.length || 0} students`);
      });
      
      // Assign the first unassigned section to this teacher
      const sectionToAssign = unassignedSections[0];
      console.log(`\n✅ Assigning section "${sectionToAssign.name}" to ${teacher.name}...`);
      
      await Section.findByIdAndUpdate(sectionToAssign._id, {
        teacher: teacher._id
      });
      
      console.log('✅ Section assignment completed!');
      
      // Verify the assignment
      const updatedSection = await Section.findById(sectionToAssign._id)
        .populate('teacher', 'name email')
        .populate('students', 'name')
        .populate('courses', 'title courseCode');
      
      console.log('\n🔍 Verification:');
      console.log(`Section: ${updatedSection.name}`);
      console.log(`Teacher: ${updatedSection.teacher?.name}`);
      console.log(`Students: ${updatedSection.students?.length || 0}`);
      console.log(`Courses: ${updatedSection.courses?.map(c => `${c.title} (${c.courseCode})`).join(', ') || 'None'}`);
      
    } else {
      console.log('\n💡 No unassigned sections found. All sections already have teachers assigned.');
      console.log('You might need to:');
      console.log('1. Create a new section for this teacher');
      console.log('2. Or reassign an existing section from another teacher');
      console.log('3. Or check if the teacher should be added to an existing section as additional teacher');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

assignSectionToTeacher();