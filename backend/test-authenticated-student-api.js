const axios = require('axios');

async function testAuthenticatedStudentAPI() {
    console.log('Testing student course videos API with authentication...');
    
    // You can get a fresh token by logging in as the student in the browser
    // and copying the token from localStorage.getItem('token')
    const studentEmail = 'munmun2912@gmail.com';
    const password = 'password123'; // Default password for this student
    const courseId = '68c8e5486a8d60601e77f327';
    
    try {
        // Step 1: Login to get a fresh token
        console.log('Step 1: Logging in as student...');
        const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
            email: studentEmail,
            password: password
        });
        
        const token = loginResponse.data.token;
        console.log('✅ Login successful, got token');
        
        // Step 2: Test the course videos API
        console.log('Step 2: Fetching course videos...');
        const videosResponse = await axios.get(`http://localhost:5000/api/student/course/${courseId}/videos`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ API Response Status:', videosResponse.status);
        console.log('✅ API Response Data:');
        console.log(JSON.stringify(videosResponse.data, null, 2));
        
        // Analyze the response
        const data = videosResponse.data;
        if (data.course) {
            console.log('\n=== COURSE INFO ===');
            console.log('Course Title:', data.course.title);
            console.log('Has Units:', data.course.hasUnits);
        }
        
        if (data.units) {
            console.log('\n=== UNITS ===');
            data.units.forEach((unit, index) => {
                console.log(`Unit ${index + 1}: ${unit.title}`);
                console.log(`  Unlocked: ${unit.unlocked}`);
                console.log(`  Videos: ${unit.videos ? unit.videos.length : 0}`);
                if (unit.videos) {
                    unit.videos.forEach((video, vIndex) => {
                        console.log(`    ${vIndex + 1}. ${video.title}`);
                    });
                }
            });
        }
        
        if (data.videos) {
            console.log('\n=== DIRECT VIDEOS ===');
            console.log('Video count:', data.videos.length);
            data.videos.forEach((video, index) => {
                console.log(`${index + 1}. ${video.title}`);
            });
        }
        
        // Test if the issue is in flattening
        if (data.units) {
            console.log('\n=== SIMULATING FRONTEND FLATTENING ===');
            const allVideos = [];
            data.units.forEach(unit => {
                if (unit.videos && Array.isArray(unit.videos)) {
                    const videosWithUnitInfo = unit.videos.map(video => ({
                        ...video,
                        unitTitle: unit.title,
                        unitId: unit._id
                    }));
                    allVideos.push(...videosWithUnitInfo);
                }
            });
            console.log('Flattened videos count:', allVideos.length);
            allVideos.forEach((video, index) => {
                console.log(`${index + 1}. ${video.title} (from ${video.unitTitle})`);
            });
        }
        
    } catch (error) {
        if (error.response) {
            console.error('❌ API Error:', error.response.status);
            console.error('❌ Error Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('❌ Request Error:', error.message);
        }
    }
}

testAuthenticatedStudentAPI();