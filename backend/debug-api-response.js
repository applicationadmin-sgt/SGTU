const axios = require('axios');

async function testAPI() {
    try {
        console.log('🔍 Testing API response structure...\n');
        
        // This simulates what the frontend would receive
        const response = await axios.get('http://localhost:5000/api/unit/student/course/68c8e5486a8d60601e77f327', {
            headers: {
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGNhNGY1MDJmZjJjOWJlZDQ4YWYzNzAiLCJlbWFpbCI6Im11bm11bjI5MTJAZ21haWwuY29tIiwicm9sZSI6InN0dWRlbnQiLCJpYXQiOjE3Mzc3OTgwNzQsImV4cCI6MTczNzg4NDQ3NH0.Fhsqn1u8ztNcfINS7X7V3OLnHnK7oy7bz7WCOtWMvdM'
            }
        });
        
        console.log('📊 API Response Analysis:');
        console.log('Status:', response.status);
        console.log('Units returned:', response.data.length);
        
        response.data.forEach((unit, index) => {
            console.log(`\n📂 Unit ${index + 1}:`);
            console.log(`   Name: ${unit.unitName}`);
            console.log(`   Order: ${unit.unitOrder}`);
            console.log(`   Unlocked: ${unit.unlocked}`);
            console.log(`   Videos count: ${unit.videos ? unit.videos.length : 0}`);
            
            if (unit.videos && unit.videos.length > 0) {
                console.log(`   Video details:`);
                unit.videos.forEach((video, vIndex) => {
                    console.log(`     ${vIndex + 1}. ${video.title || video.videoId}`);
                    console.log(`        VideoId: ${video.videoId}`);
                    console.log(`        Watched: ${video.watched}`);
                    console.log(`        URL: ${video.url ? 'Present' : 'Missing'}`);
                });
            } else {
                console.log(`   ❌ No videos in response`);
            }
        });
        
    } catch (error) {
        console.error('❌ API Test failed:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    }
}

testAPI();