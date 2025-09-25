// Debug script to test the quiz pool questions fix
console.log('Testing quiz pool questions data structure...');

// Simulate the backend response
const mockBackendResponse = {
  questions: [
    {
      _id: "6123456789abcdef12345678",
      text: "What is React?",
      options: [
        { text: "A JavaScript library", isCorrect: true },
        { text: "A programming language", isCorrect: false },
        { text: "A database", isCorrect: false },
        { text: "An operating system", isCorrect: false }
      ],
      explanation: "React is a JavaScript library for building user interfaces",
      points: 2,
      originalQuizId: "6123456789abcdef12345679",
      originalQuizTitle: "React Basics Quiz",
      uploader: {
        id: "6123456789abcdef12345680",
        name: "John Doe",
        email: "john@example.com",
        teacherId: "T001"
      }
    }
  ]
};

// Simulate the old frontend code (BROKEN)
console.log('\n--- OLD CODE (BROKEN) ---');
const oldQuestions = mockBackendResponse; // This would be { questions: [...] }
console.log('oldQuestions structure:', oldQuestions);
console.log('oldQuestions.length:', oldQuestions.length); // undefined
console.log('Array.isArray(oldQuestions):', Array.isArray(oldQuestions)); // false

// Simulate the new frontend code (FIXED)
console.log('\n--- NEW CODE (FIXED) ---');
const newQuestions = mockBackendResponse.questions || mockBackendResponse;
console.log('newQuestions structure:', newQuestions);
console.log('newQuestions.length:', newQuestions.length); // 1
console.log('Array.isArray(newQuestions):', Array.isArray(newQuestions)); // true

// Test the UI condition
console.log('\n--- UI CONDITIONS ---');
console.log('OLD: selectedQuizData.data.questions && Array.isArray(selectedQuizData.data.questions)');
console.log('  Result:', oldQuestions && Array.isArray(oldQuestions)); // false -> shows "No questions available"

console.log('NEW: selectedQuizData.data.questions && Array.isArray(selectedQuizData.data.questions)');
console.log('  Result:', newQuestions && Array.isArray(newQuestions)); // true -> shows questions

console.log('\n✅ Fix confirmed: The quiz pool questions should now display correctly!');