const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('./models/User');
const Section = require('./models/Section');
const Course = require('./models/Course');
const Department = require('./models/Department');
const School = require('./models/School');

async function checkCourseTeacherFlow() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🔗 Connected to MongoDB');
    
    // Find the course "Basics of Nurology"
    const course = await Course.findOne({ courseCode: 'C000008' })
      .populate('coordinators', 'name email')
      .populate('department', 'name hod')
      .populate({
        path: 'department',
        populate: {
          path: 'hod',
          select: 'name email'
        }
      });
    
    console.log('\n📚 Course: Basics of Nurology (C000008)');
    console.log('Department:', course.department?.name);
    console.log('HOD:', course.department?.hod?.name);
    console.log('Course Coordinators (CC):');
    course.coordinators?.forEach((cc, i) => {
      console.log(`   ${i + 1}. ${cc.name} (${cc.email})`);
    });
    
    // Find section teaching this course
    const section = await Section.findOne({ courses: course._id })
      .populate('teacher', 'name email')
      .populate('teachers', 'name email')
      .populate('students', 'name regNo')
      .populate('courses', 'title courseCode');
    
    console.log('\n📋 Section: M.NURO01');
    console.log('Main Teacher:', section.teacher?.name, '(' + section.teacher?.email + ')');
    console.log('Additional Teachers:', section.teachers?.map(t => `${t.name} (${t.email})`).join(', ') || 'None');
    console.log('Students:', section.students?.length || 0);
    console.log('Courses in section:');
    section.courses?.forEach((c, i) => {
      console.log(`   ${i + 1}. ${c.title} (${c.courseCode})`);
    });
    
    console.log('\n🤔 Analysis:');
    console.log('- Current teacher of M.NURO01:', section.teacher?.name);
    console.log('- CC for Basics of Nurology:', course.coordinators?.[0]?.name);
    console.log('- These are different people!');
    
    // Check if we should assign the CC as the teacher of this section
    const ccTeacher = course.coordinators?.[0];
    if (ccTeacher && section.teacher?._id.toString() !== ccTeacher._id.toString()) {
      console.log('\n💡 Suggestion:');
      console.log(`Should ${ccTeacher.name} (CC) be the teacher of section M.NURO01 instead of ${section.teacher?.name}?`);
      console.log('Or should both be assigned as teachers to this section?');
    }
    
    // Check what other teachers are in the same department
    console.log('\n👥 All teachers in the same department:');
    const departmentTeachers = await User.find({ 
      department: course.department._id, 
      role: 'teacher' 
    }).select('name email');
    
    departmentTeachers.forEach((teacher, i) => {
      const isCC = course.coordinators?.some(cc => cc._id.toString() === teacher._id.toString());
      const isMainTeacher = section.teacher?._id.toString() === teacher._id.toString();
      const isAdditionalTeacher = section.teachers?.some(t => t._id.toString() === teacher._id.toString());
      
      let roles = [];
      if (isMainTeacher) roles.push('Main Teacher of M.NURO01');
      if (isAdditionalTeacher) roles.push('Additional Teacher of M.NURO01');
      if (isCC) roles.push('CC for Basics of Nurology');
      
      console.log(`   ${i + 1}. ${teacher.name} (${teacher.email}) - ${roles.join(', ') || 'No assignments'}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkCourseTeacherFlow();