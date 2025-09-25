const mongoose = require('mongoose');
const Section = require('./models/Section');
const Course = require('./models/Course');

// Try to use the same connection approach as the main server
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/sgt-learning';

console.log('Using MONGO_URI:', MONGO_URI);

// Connect to MongoDB
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB successfully');
    debugSectionCourses();
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

async function debugSectionCourses() {
  try {
    console.log('=== DEBUGGING SECTION-COURSE ASSIGNMENTS ===\n');
    
    // Check connection
    console.log('Database connection state:', mongoose.connection.readyState);
    console.log('Database name:', mongoose.connection.name);
    
    // Get all sections with populated courses
    const sections = await Section.find();
    console.log(`Raw sections count: ${sections.length}`);
    
    if (sections.length === 0) {
      console.log('No sections found. Checking collections...');
      
      // List all collections
      const collections = await mongoose.connection.db.listCollections().toArray();
      console.log('Available collections:', collections.map(c => c.name));
      
      // Check if there's a sections collection with data
      const sectionsCount = await mongoose.connection.db.collection('sections').countDocuments();
      console.log(`Documents in sections collection: ${sectionsCount}`);
      
      if (sectionsCount > 0) {
        const sampleSections = await mongoose.connection.db.collection('sections').find().limit(3).toArray();
        console.log('Sample sections:', JSON.stringify(sampleSections, null, 2));
      }
      
      return;
    }
    
    const populatedSections = await Section.find()
      .populate('courses', 'title courseCode')
      .populate('school', 'name')
      .populate('department', 'name')
      .sort({ createdAt: -1 });
    
    console.log(`Found ${populatedSections.length} sections:\n`);
    
    for (const section of populatedSections) {
      console.log(`Section: ${section.name}`);
      console.log(`  School: ${section.school?.name || 'N/A'}`);
      console.log(`  Department: ${section.department?.name || 'N/A'}`);
      console.log(`  Courses: ${section.courses?.length || 0}`);
      
      if (section.courses && section.courses.length > 0) {
        section.courses.forEach(course => {
          console.log(`    - ${course.title} (${course.courseCode})`);
        });
      } else {
        console.log(`    - No courses assigned`);
      }
      
      console.log(`  Created: ${section.createdAt}`);
      console.log(`  ID: ${section._id}\n`);
    }
    
    // Check for courses that might be assigned to multiple sections
    console.log('=== CHECKING FOR SHARED COURSES ===\n');
    
    const courses = await Course.find();
    console.log(`Found ${courses.length} courses`);
    
    for (const course of courses) {
      const sectionsWithThisCourse = await Section.find({ courses: course._id }).populate('school', 'name');
      if (sectionsWithThisCourse.length > 1) {
        console.log(`⚠️  Course "${course.title}" (${course.courseCode}) is assigned to ${sectionsWithThisCourse.length} sections:`);
        sectionsWithThisCourse.forEach(section => {
          console.log(`   - ${section.name} (${section.school?.name})`);
        });
        console.log('');
      } else if (sectionsWithThisCourse.length === 1) {
        console.log(`✅ Course "${course.title}" is assigned to 1 section: ${sectionsWithThisCourse[0].name}`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.disconnect();
  }
}

debugSectionCourses();