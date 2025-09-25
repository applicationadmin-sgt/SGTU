// Quick test to check current profile data
// Open browser console and paste this code to run it

console.log('🔍 Starting profile debug test...');

const testCurrentProfile = async () => {
  try {
    const token = localStorage.getItem('token');
    console.log('Token found:', !!token);
    
    // Test 1: Direct API call
    console.log('📡 Making direct API call...');
    const response = await fetch(`http://localhost:5000/api/teacher/profile?_t=${Date.now()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    console.group('📊 Raw API Response');
    console.log('Full response:', data);
    console.log('Statistics object:', data.statistics);
    console.groupEnd();
    
    console.group('🎯 Key Values');
    console.log('totalSections:', data.statistics?.totalSections);
    console.log('totalStudents:', data.statistics?.totalStudents);
    console.log('directStudents:', data.statistics?.directStudents);
    console.log('coordinatedStudents:', data.statistics?.coordinatedStudents);
    console.log('assignedSections length:', data.assignedSections?.length);
    console.groupEnd();
    
    // Test 2: Check React component state
    console.group('⚛️ React Component Check');
    console.log('Current URL:', window.location.href);
    console.log('React components on page:', document.querySelectorAll('[data-reactroot]').length);
    console.groupEnd();
    
    return data;
    
  } catch (error) {
    console.error('❌ Error in profile test:', error);
  }
};

testCurrentProfile();