require('dotenv').config();
const mongoose = require('mongoose');
const QuizLock = require('./models/QuizLock');

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Get one QuizLock record that has admin unlock history
    const record = await QuizLock.findOne({
      'adminUnlockHistory.0': { $exists: true },
      courseId: '68da652ec35425a4aff02532'
    });
    
    if (!record) {
      console.log('No record found');
      process.exit(0);
    }
    
    console.log('\nQuizLock Record:');
    console.log('- _id:', record._id);
    console.log('- courseId:', record.courseId);
    console.log('- quizId:', record.quizId);
    console.log('- studentId:', record.studentId);
    console.log('- Admin unlocks:', record.adminUnlockHistory.length);
    
    // Now try the aggregation with quiz lookup
    const result = await QuizLock.aggregate([
      { $match: { _id: record._id } },
      {
        $lookup: {
          from: 'quizzes',
          localField: 'quizId',
          foreignField: '_id',
          as: 'quiz'
        }
      },
      { $unwind: { path: '$quiz', preserveNullAndEmptyArrays: true } }
    ]);
    
    console.log('\nAggregation Result:');
    if (result.length > 0) {
      console.log('✅ Found record');
      console.log('- quiz field:', result[0].quiz ? 'FOUND' : 'NULL/EMPTY');
      if (result[0].quiz) {
        console.log('  - Quiz _id:', result[0].quiz._id);
        console.log('  - Quiz title:', result[0].quiz.title);
      }
    } else {
      console.log('❌ No records returned from aggregation');
    }
    
    // Check if quiz exists in quizzes collection
    const Quiz = require('./models/Quiz');
    const quiz = await Quiz.findById(record.quizId);
    console.log('\nDirect Quiz lookup:');
    if (quiz) {
      console.log('✅ Quiz found in quizzes collection');
      console.log('- _id:', quiz._id);
      console.log('- title:', quiz.title);
    } else {
      console.log('❌ Quiz NOT found in quizzes collection');
    }
    
    // Check collection name
    const collections = await mongoose.connection.db.listCollections().toArray();
    const quizCollections = collections.filter(c => c.name.toLowerCase().includes('quiz'));
    console.log('\nQuiz-related collections:');
    quizCollections.forEach(c => console.log('- ', c.name));
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
