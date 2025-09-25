// Test frontend API call to see what data is actually being received
async function testFrontendAPI() {
  try {
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2OGNhMzI2MTE0MjgyNDY1Y2YwOWM3YjEiLCJyb2xlIjoic3R1ZGVudCIsImlhdCI6MTczNDYwNzA5OSwiZXhwIjoxNzM0NjkzNDk5fQ.2n9pBQiEXrOKYHKlhI0hXPd_x1nqhY4c-iU7cGp8sVE'; // Replace with actual token
    const courseId = '68c8e5486a8d60601e77f327'; // C000008 course ID
    
    const response = await fetch(`http://localhost:5000/api/student/course/${courseId}/videos`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error('API call failed:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return;
    }
    
    const data = await response.json();
    console.log('Frontend API Response:');
    console.log('Course:', data.course?.title);
    console.log('Has units:', !!data.units);
    
    if (data.units) {
      console.log('Units count:', data.units.length);
      data.units.forEach((unit, index) => {
        console.log(`Unit ${index + 1}: ${unit.title}`);
        console.log(`  Unlocked: ${unit.unlocked}`);
        console.log(`  Videos count: ${unit.videos.length}`);
        if (unit.videos.length > 0) {
          unit.videos.forEach(video => {
            console.log(`    - ${video.title} (${video._id})`);
          });
        } else {
          console.log('    ❌ NO VIDEOS IN THIS UNIT');
        }
      });
    } else if (data.videos) {
      console.log('Direct videos count:', data.videos.length);
      data.videos.forEach(video => {
        console.log(`  - ${video.title} (${video._id})`);
      });
    }
  } catch (error) {
    console.error('Error testing frontend API:', error);
  }
}

testFrontendAPI();