const mongoose = require('mongoose');
const SectionCourseTeacher = require('./models/SectionCourseTeacher');
const Section = require('./models/Section');
const Course = require('./models/Course');
const User = require('./models/User');
const Department = require('./models/Department');
require('dotenv').config();

async function debugTeacherProfile() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    const meghaId = '68cba9bcaf91a41ca93194bf';
    
    console.log('\n🔍 Step 1: Getting teacher assignments...');
    const teacherAssignments = await SectionCourseTeacher.find({ 
      teacher: meghaId,
      isActive: true 
    })
    .populate({
      path: 'section',
      select: 'name department students courses',
      populate: [
        { path: 'department', select: 'name' },
        { path: 'courses', select: 'title courseCode description' },
        { path: 'students', select: 'name email regNo' }
      ]
    })
    .populate('course', 'title courseCode description');

    console.log(`Found ${teacherAssignments.length} assignments`);
    
    console.log('\n🔍 Step 2: Processing assignments...');
    const sectionsMap = new Map();
    const allCourses = new Set();
    
    for (const assignment of teacherAssignments) {
      console.log(`\nProcessing assignment ${assignment._id}:`);
      console.log(`  Section: ${assignment.section?.name} (${assignment.section?._id})`);
      console.log(`  Course: ${assignment.course?.title} (${assignment.course?._id})`);
      
      if (assignment.section && assignment.course) {
        const sectionId = assignment.section._id.toString();
        allCourses.add(assignment.course._id.toString());
        
        console.log(`  Adding course ${assignment.course.title} to section ${assignment.section.name}`);
        
        if (!sectionsMap.has(sectionId)) {
          sectionsMap.set(sectionId, {
            _id: assignment.section._id,
            name: assignment.section.name,
            department: assignment.section.department,
            students: assignment.section.students || [],
            allCourses: assignment.section.courses || [],
            teacherCourses: []
          });
          console.log(`  Created new section entry for ${assignment.section.name}`);
        }
        
        // Add this course to the teacher's courses in this section
        sectionsMap.get(sectionId).teacherCourses.push(assignment.course);
        console.log(`  Added course to section. Teacher courses count: ${sectionsMap.get(sectionId).teacherCourses.length}`);
      } else {
        console.log(`  ❌ Missing section or course data`);
      }
    }
    
    const sections = Array.from(sectionsMap.values());
    
    console.log(`\n📊 Final Results:`);
    console.log(`Total unique sections: ${sections.length}`);
    console.log(`Total unique courses: ${allCourses.size}`);
    
    sections.forEach((section, index) => {
      console.log(`\nSection ${index + 1}: ${section.name}`);
      console.log(`  Students: ${section.students?.length || 0}`);
      console.log(`  Teacher courses: ${section.teacherCourses?.length || 0}`);
      section.teacherCourses?.forEach(course => {
        console.log(`    - ${course.title} (${course.courseCode})`);
      });
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

debugTeacherProfile();