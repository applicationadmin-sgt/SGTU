/**
 * DEBUG SCRIPT: Check HOD Department Assignment
 * 
 * Purpose: Debug why HOD is getting 403 Forbidden error
 * This will check the HOD user's department assignment
 */

const mongoose = require('mongoose');
const User = require('./backend/models/User');
const Department = require('./backend/models/Department');

async function debugHODDepartment() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/sgtlms', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    console.log('🔍 DEBUGGING HOD DEPARTMENT ASSIGNMENT:\n');

    // Find all HOD users
    const hodUsers = await User.find({
      $or: [
        { role: 'hod' },
        { roles: { $in: ['hod'] } }
      ]
    }).populate('department').populate('assignedDepartments');

    console.log(`📊 Found ${hodUsers.length} HOD users:`);
    
    for (const hod of hodUsers) {
      console.log(`\n👤 HOD: ${hod.name} (${hod.email})`);
      console.log(`   ID: ${hod._id}`);
      console.log(`   Role: ${hod.role}`);
      console.log(`   Roles array: ${JSON.stringify(hod.roles || [])}`);
      console.log(`   Department (single): ${hod.department ? hod.department.name : 'NOT SET'}`);
      console.log(`   Assigned Departments: ${hod.assignedDepartments ? hod.assignedDepartments.map(d => d.name).join(', ') : 'NONE'}`);
      console.log(`   Active: ${hod.isActive !== false ? 'YES' : 'NO'}`);
      
      // Check if this HOD has any department access
      const hasDepartmentAccess = hod.department || (hod.assignedDepartments && hod.assignedDepartments.length > 0);
      console.log(`   ✅ Has Department Access: ${hasDepartmentAccess ? 'YES' : 'NO'}`);
      
      if (!hasDepartmentAccess) {
        console.log(`   ❌ ISSUE: This HOD has no department assignment!`);
      }
    }

    // Also check all departments and their HODs
    console.log(`\n📋 DEPARTMENT -> HOD ASSIGNMENTS:`);
    const departments = await Department.find({}).populate('hod');
    
    for (const dept of departments) {
      console.log(`\n🏢 Department: ${dept.name}`);
      console.log(`   ID: ${dept._id}`);
      console.log(`   HOD: ${dept.hod ? dept.hod.name : 'NOT ASSIGNED'}`);
      console.log(`   Active: ${dept.isActive !== false ? 'YES' : 'NO'}`);
    }

    // Check the specific course that's causing the 403 error
    const courseId = '68da652ec35425a4aff02532';
    const Course = require('./backend/models/Course');
    
    console.log(`\n🔍 CHECKING SPECIFIC COURSE: ${courseId}`);
    const course = await Course.findById(courseId).populate('department');
    
    if (course) {
      console.log(`   Course: ${course.title || course.name}`);
      console.log(`   Department: ${course.department ? course.department.name : 'NOT SET'}`);
      console.log(`   Department ID: ${course.department ? course.department._id : 'N/A'}`);
      
      // Find which HOD should have access to this course
      if (course.department) {
        const courseDeptHOD = await User.findOne({
          department: course.department._id,
          $or: [
            { role: 'hod' },
            { roles: { $in: ['hod'] } }
          ]
        });
        
        console.log(`   Expected HOD: ${courseDeptHOD ? courseDeptHOD.name : 'NONE FOUND'}`);
      }
    } else {
      console.log(`   ❌ Course not found!`);
    }

  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the debug
if (require.main === module) {
  debugHODDepartment();
}

module.exports = debugHODDepartment;