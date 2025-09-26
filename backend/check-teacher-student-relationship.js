const mongoose = require('mongoose');
require('dotenv').config();

async function checkTeacherStudentRelationship() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const User = require('./models/User');
    const Section = require('./models/Section');
    const QuizLock = require('./models/QuizLock');
    
    // Find the teacher and student
    const teacher = await User.findOne({ name: /Pollav/i });
    const student = await User.findOne({ regNo: 'S999989' });
    
    console.log('\n👥 Users Found:');
    console.log(`Teacher: ${teacher?.name} (${teacher?.email}) - ID: ${teacher?._id}`);
    console.log(`Student: ${student?.name} (${student?.regNo}) - ID: ${student?._id}`);
    
    if (!teacher || !student) {
      console.log('❌ Could not find teacher or student');
      return;
    }
    
    // Check sections that include both teacher and student
    const sectionsWithBoth = await Section.find({
      $and: [
        {
          $or: [
            { teacher: teacher._id },
            { teachers: teacher._id }
          ]
        },
        { students: student._id }
      ]
    }).populate('courses', 'name code');
    
    console.log(`\n🔍 Sections linking teacher and student: ${sectionsWithBoth.length}`);
    sectionsWithBoth.forEach(section => {
      console.log(`   - ${section.name} (Courses: ${section.courses?.map(c => c.name).join(', ')})`);
    });
    
    if (sectionsWithBoth.length === 0) {
      console.log('\n❌ NO SECTIONS LINK TEACHER AND STUDENT - This is why unlock requests are not visible!');
      
      // Check what sections the teacher is in
      const teacherSections = await Section.find({
        $or: [
          { teacher: teacher._id },
          { teachers: teacher._id }
        ]
      }).populate('students', 'name regNo');
      
      console.log(`\n📚 Teacher's sections: ${teacherSections.length}`);
      teacherSections.forEach(section => {
        console.log(`   - ${section.name} (${section.students?.length} students)`);
        section.students?.slice(0, 3).forEach(s => console.log(`     • ${s.name} (${s.regNo})`));
      });
      
      // Check what sections the student is in
      const studentSections = await Section.find({ students: student._id }).populate({
        path: 'teachers',
        select: 'name email'
      });
      
      console.log(`\n🎓 Student's sections: ${studentSections.length}`);
      studentSections.forEach(section => {
        console.log(`   - ${section.name} (Teachers: ${section.teachers?.map(t => t.name).join(', ')})`);
      });
    }
    
    // Check the QuizLock for this student
    const quizLock = await QuizLock.findOne({ studentId: student._id }).populate('quizId', 'title').populate('courseId', 'name');
    
    console.log(`\n🔒 QuizLock for student:`);
    console.log(`   Quiz: ${quizLock?.quizId?.title}`);
    console.log(`   Course: ${quizLock?.courseId?.name}`);
    console.log(`   Locked: ${quizLock?.isLocked}`);
    console.log(`   Reason: ${quizLock?.failureReason}`);
    
    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkTeacherStudentRelationship();