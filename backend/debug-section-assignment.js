const mongoose = require('mongoose');
const User = require('./models/User');
const Section = require('./models/Section');
const Course = require('./models/Course');

const MONGODB_URI = 'mongodb://localhost:27017/sgt_learning';

async function debugTeacherSectionAssignment() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('🔗 Connected to MongoDB');
    
    // Find the teacher from our test
    const teacher = await User.findOne({ email: '1109sourav@gmail.com' });
    if (!teacher) {
      console.log('❌ Teacher not found');
      return;
    }
    
    console.log('👨‍🏫 Teacher found:', {
      id: teacher._id,
      name: teacher.name,
      email: teacher.email,
      role: teacher.role
    });
    
    // Check sections where teacher is assigned
    console.log('\n📚 Checking section assignments...');
    
    const directSections = await Section.find({ teacher: teacher._id })
      .populate('students', '_id name regNo')
      .populate('courses', 'title courseCode');
    
    console.log(`Direct sections (teacher field): ${directSections.length}`);
    directSections.forEach((section, i) => {
      console.log(`  ${i + 1}. ${section.name} - ${section.students?.length || 0} students`);
    });
    
    const teachersSections = await Section.find({ teachers: teacher._id })
      .populate('students', '_id name regNo')
      .populate('courses', 'title courseCode');
    
    console.log(`Sections in teachers array: ${teachersSections.length}`);
    teachersSections.forEach((section, i) => {
      console.log(`  ${i + 1}. ${section.name} - ${section.students?.length || 0} students`);
    });
    
    // Combined query (what the API uses)
    const allSections = await Section.find({ 
      $or: [
        { teacher: teacher._id }, 
        { teachers: teacher._id }
      ] 
    })
      .populate('students', '_id name regNo')
      .populate('courses', 'title courseCode');
    
    console.log(`\n📊 Combined sections (API query): ${allSections.length}`);
    allSections.forEach((section, i) => {
      console.log(`  ${i + 1}. ${section.name} - ${section.students?.length || 0} students, ${section.courses?.length || 0} courses`);
    });
    
    // Check coordinated courses
    console.log('\n🎓 Checking coordinated courses...');
    const coordinatedCourses = await Course.find({ coordinators: teacher._id })
      .populate('department', 'name')
      .populate('school', 'name');
    
    console.log(`Coordinated courses: ${coordinatedCourses.length}`);
    coordinatedCourses.forEach((course, i) => {
      console.log(`  ${i + 1}. ${course.title} (${course.courseCode})`);
    });
    
    // Calculate what the API should return
    console.log('\n🧮 Expected API statistics:');
    const totalSections = allSections.length;
    const directStudents = allSections.reduce((sum, section) => sum + (section.students?.length || 0), 0);
    
    console.log({
      totalSections,
      directStudents,
      coordinatedCourses: coordinatedCourses.length,
      coordinatedStudents: 0 // Should be 0 if no coord courses have students
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📤 Disconnected from MongoDB');
  }
}

debugTeacherSectionAssignment();