const axios = require('axios');

async function testSimpleFix() {
    try {
        console.log('🔧 Testing the SIMPLE PERMANENT FIX...\n');
        console.log('Fix: First unit is always unlocked by default\n');
        
        // Test the API endpoint
        const response = await axios.get('http://localhost:5000/api/unit/student/course/68c8e5486a8d60601e77f327', {
            headers: {
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGNhNGY1MDJmZjJjOWJlZDQ4YWYzNzAiLCJlbWFpbCI6Im11bm11bjI5MTJAZ21haWwuY29tIiwicm9sZSI6InN0dWRlbnQiLCJpYXQiOjE3Mzc3OTgwNzQsImV4cCI6MTczNzg4NDQ3NH0.Fhsqn1u8ztNcfINS7X7V3OLnHnK7oy7bz7WCOtWMvdM'
            }
        });
        
        console.log('✅ API responded successfully');
        console.log(`📊 Units returned: ${response.data.length}\n`);
        
        response.data.forEach((unit, index) => {
            console.log(`📂 Unit ${index + 1}: ${unit.unitName || unit.title}`);
            console.log(`   Unlocked: ${unit.unlocked ? '✅ YES' : '❌ NO'}`);
            console.log(`   Videos: ${unit.videos ? unit.videos.length : 0}`);
            
            if (unit.videos && unit.videos.length > 0) {
                unit.videos.forEach((video, vIndex) => {
                    console.log(`     🎥 Video ${vIndex + 1}: ${video.title}`);
                    console.log(`        Watched: ${video.watched ? '✅' : '⏸️'}`);
                });
            }
            console.log('');
        });
        
        // Check if first unit is unlocked
        const firstUnit = response.data[0];
        if (firstUnit && firstUnit.unlocked) {
            console.log('🎯 SUCCESS: First unit is unlocked by default!');
            if (firstUnit.videos && firstUnit.videos.length > 0) {
                console.log('🎥 SUCCESS: Videos are visible in first unit!');
            } else {
                console.log('⚠️  First unit has no videos to show');
            }
        } else {
            console.log('❌ ISSUE: First unit is not unlocked');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

testSimpleFix();