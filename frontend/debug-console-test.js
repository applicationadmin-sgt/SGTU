// Simple test to check what the frontend receives
const testFrontendData = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('http://localhost:5000/api/teacher/profile', {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    console.group('🔍 Frontend Debug - Teacher Profile Data');
    console.log('Full response:', data);
    console.log('Statistics object:', data.statistics);
    console.log('totalSections:', data.statistics?.totalSections);
    console.log('totalStudents:', data.statistics?.totalStudents);
    console.log('directStudents:', data.statistics?.directStudents);
    console.log('coordinatedStudents:', data.statistics?.coordinatedStudents);
    console.log('coordinatedCoursesCount:', data.statistics?.coordinatedCoursesCount);
    console.log('Condition (coordinatedStudents > 0):', data.statistics?.coordinatedStudents > 0);
    console.groupEnd();
    
    // Check assigned sections
    console.group('📚 Assigned Sections');
    console.log('assignedSections array:', data.assignedSections);
    console.log('assignedSections length:', data.assignedSections?.length);
    data.assignedSections?.forEach((section, index) => {
      console.log(`Section ${index + 1}:`, {
        name: section.name,
        studentCount: section.studentCount,
        courseCount: section.courseCount
      });
    });
    console.groupEnd();
    
    return data;
  } catch (error) {
    console.error('❌ Error fetching profile:', error);
  }
};

// Run this in browser console when on the teacher profile page
testFrontendData();