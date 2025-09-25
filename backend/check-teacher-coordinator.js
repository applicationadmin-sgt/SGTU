const mongoose = require('mongoose');
const User = require('./models/User');
const Course = require('./models/Course');
const Section = require('./models/Section');
require('dotenv').config();

async function checkTeacherStatus() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find teacher Dipanwita
    const teacher = await User.findOne({ name: 'Dipanwita', role: 'teacher' });
    
    if (!teacher) {
      console.log('❌ Teacher Dipanwita not found');
      return;
    }

    console.log('✅ Teacher found:');
    console.log('- Name:', teacher.name);
    console.log('- Email:', teacher.email);
    console.log('- Role:', teacher.role);
    console.log('- ID:', teacher._id);

    // Check sections where this teacher is assigned
    const sections = await Section.find({ 
      $or: [{ teacher: teacher._id }, { teachers: teacher._id }] 
    })
    .populate('courses', 'title courseCode')
    .populate('students', 'name regNo');

    console.log('\n📚 Sections where teacher is assigned:', sections.length);
    sections.forEach(section => {
      console.log(`- ${section.name}: ${section.students?.length || 0} students`);
      if (section.courses) {
        section.courses.forEach(course => {
          console.log(`  Course: ${course.title} (${course.courseCode})`);
        });
      }
    });

    // Check courses where this teacher is a coordinator
    const coordinatorCourses = await Course.find({ coordinators: teacher._id })
      .select('title courseCode coordinators');

    console.log('\n🎓 Courses where teacher is coordinator:', coordinatorCourses.length);
    coordinatorCourses.forEach(course => {
      console.log(`- ${course.title} (${course.courseCode})`);
      console.log(`  Coordinators: ${course.coordinators?.length || 0}`);
    });

    // Check the specific course "Basics of Nurology"
    const nurologyCourse = await Course.findOne({ courseCode: 'C000008' })
      .populate('coordinators', 'name email');
    
    if (nurologyCourse) {
      console.log('\n🧠 Basics of Nurology course details:');
      console.log('- Title:', nurologyCourse.title);
      console.log('- Code:', nurologyCourse.courseCode);
      console.log('- Coordinators:');
      if (nurologyCourse.coordinators && nurologyCourse.coordinators.length > 0) {
        nurologyCourse.coordinators.forEach(coord => {
          console.log(`  - ${coord.name} (${coord.email}) [ID: ${coord._id}]`);
        });
      } else {
        console.log('  None assigned');
      }
      
      // Check if Dipanwita's ID is in the coordinators array
      const isDipanwitaCoordinator = nurologyCourse.coordinators?.some(
        coord => coord._id.toString() === teacher._id.toString()
      );
      console.log(`- Is Dipanwita a coordinator? ${isDipanwitaCoordinator ? 'YES' : 'NO'}`);
    }

    // Check all sections for this specific course
    const nurologyCourseSections = await Section.find({ 
      courses: nurologyCourse._id 
    }).populate('students', 'name regNo');

    console.log('\n📋 All sections for Basics of Nurology course:');
    let totalNurologyStudents = 0;
    nurologyCourseSections.forEach(section => {
      const studentCount = section.students?.length || 0;
      totalNurologyStudents += studentCount;
      console.log(`- ${section.name}: ${studentCount} students`);
    });
    console.log(`Total students in Basics of Nurology: ${totalNurologyStudents}`);

  } catch (error) {
    console.error('Error checking teacher status:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

checkTeacherStatus();