// Test script for teacher analytics endpoint
// Run this after starting the backend server

const axios = require('axios');
const https = require('https');

// Create axios instance that accepts self-signed certificates
const axiosInstance = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false
  })
});

const BASE_URL = 'https://192.168.7.20:5000';
const TEACHER_EMAIL = 'tarun@gmail.com';
const TEACHER_PASSWORD = 'tarun@gmail.com';

async function testTeacherAnalytics() {
  try {
    console.log('='.repeat(60));
    console.log('TEACHER ANALYTICS ENDPOINT TEST');
    console.log('='.repeat(60));

    // Step 1: Login
    console.log('\n1. Logging in as teacher...');
    const loginResponse = await axiosInstance.post(`${BASE_URL}/api/auth/login`, {
      email: TEACHER_EMAIL,
      password: TEACHER_PASSWORD
    });

    const token = loginResponse.data.token;
    console.log('✓ Login successful');
    console.log('   Token:', token.substring(0, 20) + '...');

    // Step 2: Get teacher courses
    console.log('\n2. Fetching teacher courses...');
    const coursesResponse = await axiosInstance.get(`${BASE_URL}/api/teacher/courses`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const courses = coursesResponse.data.courses || coursesResponse.data;
    console.log('✓ Courses fetched:', courses.length);
    courses.forEach(course => {
      console.log(`   - ${course.title} (${course.courseCode}) [ID: ${course._id}]`);
    });

    if (courses.length === 0) {
      console.log('\n✗ No courses found for this teacher!');
      console.log('   Please assign courses to the teacher first.');
      return;
    }

    // Step 3: Get analytics for first course
    const firstCourse = courses[0];
    console.log(`\n3. Fetching analytics for course: ${firstCourse.title}...`);
    
    const analyticsResponse = await axiosInstance.get(
      `${BASE_URL}/api/teacher-analytics/course-analytics`,
      {
        params: { courseId: firstCourse._id },
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    const analytics = analyticsResponse.data;
    console.log('✓ Analytics data fetched');
    console.log('\n   Course Info:');
    console.log(`   - Title: ${analytics.course.title}`);
    console.log(`   - Code: ${analytics.course.code}`);
    console.log(`   - School: ${analytics.course.school}`);
    console.log(`   - Department: ${analytics.course.department}`);

    console.log('\n   Sections:');
    analytics.sections.forEach(section => {
      console.log(`   - ${section.name}: ${section.studentCount} students`);
    });

    console.log('\n   Units:');
    analytics.units.forEach(unit => {
      console.log(`   - ${unit.title}`);
    });

    console.log(`\n   Total Students: ${analytics.totalStudents}`);

    if (analytics.analytics && analytics.analytics.length > 0) {
      console.log('\n   Student Analytics:');
      analytics.analytics.forEach(student => {
        console.log(`\n   ${student.studentName} (${student.registrationNo})`);
        console.log(`   - Email: ${student.email}`);
        console.log(`   - Section: ${student.sectionName}`);
        console.log(`   - Watch Time: ${student.watchTimeFormatted} (${student.watchTime}s)`);
        console.log(`   - Videos Watched: ${student.videosWatched}/${student.totalVideos}`);
        console.log(`   - Progress: ${student.progress}% [${student.progressColor}]`);
        console.log(`   - Course Marks: ${student.courseMarks}%`);
        console.log(`   - Quizzes Taken: ${student.totalQuizzesTaken}/${student.totalQuizzes}`);
      });
    } else {
      console.log('\n   ✗ No student analytics data found');
      console.log('   This could mean:');
      console.log('   - Sections have no students assigned');
      console.log('   - Students haven\'t watched videos yet');
      console.log('   - Students haven\'t taken quizzes yet');
    }

    console.log('\n' + '='.repeat(60));
    console.log('TEST COMPLETED SUCCESSFULLY');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n✗ ERROR:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
    console.log('\n' + '='.repeat(60));
    console.log('TEST FAILED');
    console.log('='.repeat(60));
  }
}

// Run the test
testTeacherAnalytics();
