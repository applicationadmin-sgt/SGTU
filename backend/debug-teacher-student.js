const mongoose = require('mongoose');
const QuizLock = require('./models/QuizLock');
const User = require('./models/User');
const Section = require('./models/Section');
const Course = require('./models/Course');
const Quiz = require('./models/Quiz');

async function debugTeacherStudentRelationship() {
  try {
    // Connect to database
    await mongoose.connect('mongodb+srv://sourav092002_db_user:aq5UgwNDh2tgyZcB@cluster0.nvkrxcx.mongodb.net/');
    console.log('✅ Connected to database');
    
    // Get the locked student record
    const lock = await QuizLock.findOne({ isLocked: true });
    if (!lock) {
      console.log('❌ No locked student found');
      return;
    }
    
    console.log('\n🔒 Locked student details:');
    console.log({
      studentId: lock.studentId,
      quizId: lock.quizId,
      courseId: lock.courseId
    });
    
    // Find the student
    const student = await User.findById(lock.studentId);
    console.log(`\n👤 Student: ${student?.name} (${student?.email})`);
    
    // Find the course
    const course = await Course.findById(lock.courseId);
    console.log(`\n📚 Course: ${course?.name} (${course?.code})`);
    
    // Find sections with this student
    const sectionsWithStudent = await Section.find({ 
      students: lock.studentId 
    }).populate('teacher teachers courses');
    
    console.log(`\n📋 Sections containing this student: ${sectionsWithStudent.length}`);
    
    for (const section of sectionsWithStudent) {
      console.log({
        sectionName: section.name,
        teacher: section.teacher ? { name: section.teacher.name, id: section.teacher._id } : null,
        teachers: section.teachers ? section.teachers.map(t => ({ name: t.name, id: t._id })) : [],
        courses: section.courses ? section.courses.map(c => ({ name: c.name, id: c._id })) : [],
        studentCount: section.students ? section.students.length : 0
      });
    }
    
    // Test the query that should find this locked student
    if (sectionsWithStudent.length > 0) {
      const teacherId = sectionsWithStudent[0].teacher?._id || sectionsWithStudent[0].teachers?.[0]?._id;
      if (teacherId) {
        console.log(`\n🧪 Testing getLockedStudentsByTeacher with teacher: ${teacherId}`);
        
        try {
          const result = await QuizLock.getLockedStudentsByTeacher(teacherId);
          console.log(`📋 Result: ${result.length} locked students found`);
          
          if (result.length === 0) {
            console.log('\n🔍 Debugging the query manually...');
            
            // Manual debug of the method logic
            const sections = await Section.find({
              $or: [
                { teacher: teacherId },
                { teachers: teacherId }
              ]
            }).populate('students courses');
            console.log(`📋 Teacher sections: ${sections.length}`);
            
            const courseIds = [];
            const sectionCourseIds = [];
            const sectionStudentIds = [];
            
            for (const section of sections) {
              if (section.courses) {
                sectionCourseIds.push(...section.courses.map(course => course._id));
              }
              if (section.students) {
                sectionStudentIds.push(...section.students.map(student => student._id));
              }
            }
            
            const allCourseIds = [...new Set([...sectionCourseIds])];
            
            console.log({
              sectionCourseIds: sectionCourseIds.map(id => id.toString()),
              allCourseIds: allCourseIds.map(id => id.toString()),
              sectionStudentIds: sectionStudentIds.map(id => id.toString()),
              lockedStudentId: lock.studentId.toString(),
              lockedCourseId: lock.courseId.toString()
            });
            
            // Test the actual query
            const query = {
              isLocked: true,
              unlockAuthorizationLevel: 'TEACHER',
              $or: [
                { courseId: { $in: allCourseIds } },
                { studentId: { $in: sectionStudentIds } }
              ]
            };
            
            console.log('\n🔍 Query object:', JSON.stringify(query, null, 2));
            
            const manualResult = await QuizLock.find(query);
            console.log(`📋 Manual query result: ${manualResult.length} locked students`);
          }
        } catch (error) {
          console.error('❌ Error testing getLockedStudentsByTeacher:', error.message);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from database');
  }
}

debugTeacherStudentRelationship();