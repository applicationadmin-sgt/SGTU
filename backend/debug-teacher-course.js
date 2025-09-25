const mongoose = require('mongoose');
const User = require('./models/User');
const Course = require('./models/Course');
const Section = require('./models/Section');
const Department = require('./models/Department');

async function debugTeacherCourseAssignment() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/sgt');
    console.log('Connected to MongoDB');

    console.log('=== Debug Teacher-Course Assignment ===\n');

    // Find the mechatronics department
    const dept = await Department.findOne({ name: /mecatronics/i });
    if (!dept) {
      console.log('❌ Mechatronics department not found');
      return;
    }
    console.log('✅ Department found:', dept.name, `(${dept._id})`);

    // Find the course 1247
    const course = await Course.findOne({ 
      $or: [
        { title: '1247' },
        { courseCode: 'C000007' },
        { department: dept._id }
      ]
    });
    if (!course) {
      console.log('❌ Course 1247/C000007 not found');
      return;
    }
    console.log('✅ Course found:', course.title, `(${course.courseCode}) - ID: ${course._id}`);

    // Find teachers in mechatronics department
    console.log('\n--- Teachers in Mechatronics Department ---');
    const teachers = await User.find({ 
      role: 'teacher', 
      department: dept._id,
      isActive: { $ne: false }
    }).select('name email teacherId coursesAssigned assignedSections');

    console.log(`Found ${teachers.length} teachers:`);
    for (const teacher of teachers) {
      console.log(`- ${teacher.name} (${teacher.email})`);
      console.log(`  Teacher ID: ${teacher.teacherId}`);
      console.log(`  Courses Assigned: ${teacher.coursesAssigned?.length || 0}`);
      if (teacher.coursesAssigned?.length > 0) {
        for (const courseId of teacher.coursesAssigned) {
          const c = await Course.findById(courseId).select('title courseCode');
          console.log(`    - ${c?.title} (${c?.courseCode})`);
        }
      }
      console.log(`  Sections Assigned: ${teacher.assignedSections?.length || 0}`);
      if (teacher.assignedSections?.length > 0) {
        for (const sectionId of teacher.assignedSections) {
          const s = await Section.findById(sectionId).select('name courses');
          console.log(`    - Section: ${s?.name} (${s?.courses?.length || 0} courses)`);
        }
      }
      console.log('');
    }

    // Find sections that include this course
    console.log('\n--- Sections with Course 1247 ---');
    const sections = await Section.find({ 
      courses: course._id,
      isActive: { $ne: false }
    }).populate('teacher', 'name email teacherId')
      .populate('courses', 'title courseCode');

    console.log(`Found ${sections.length} sections:`);
    for (const section of sections) {
      console.log(`- Section: ${section.name}`);
      console.log(`  Teacher: ${section.teacher?.name || 'No teacher assigned'}`);
      console.log(`  Courses in section: ${section.courses?.length || 0}`);
      section.courses?.forEach(c => {
        console.log(`    - ${c.title} (${c.courseCode})`);
      });
      console.log('');
    }

    // Check if teacher is assigned to course via coursesAssigned
    console.log('\n--- Course Assignment Check ---');
    const courseTeachers = await User.find({
      role: 'teacher',
      coursesAssigned: course._id,
      isActive: { $ne: false }
    }).select('name email teacherId department');

    console.log(`Teachers with course ${course.title} in coursesAssigned: ${courseTeachers.length}`);
    courseTeachers.forEach(t => {
      console.log(`- ${t.name} (${t.email}) - Dept: ${t.department}`);
    });

    console.log('\n=== Summary ===');
    console.log(`Department Teachers: ${teachers.length}`);
    console.log(`Course Sections: ${sections.length}`);
    console.log(`Teachers via coursesAssigned: ${courseTeachers.length}`);
    console.log(`Teachers via sections: ${sections.filter(s => s.teacher).length}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

debugTeacherCourseAssignment();