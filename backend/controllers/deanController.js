const User = require('../models/User');
const School = require('../models/School');
const Department = require('../models/Department');
const Course = require('../models/Course');
const Section = require('../models/Section');
const Video = require('../models/Video');
const Unit = require('../models/Unit');
const StudentProgress = require('../models/StudentProgress');
const QuizAttempt = require('../models/QuizAttempt');
const SectionCourseTeacher = require('../models/SectionCourseTeacher');
const mongoose = require('mongoose');

// Ensure requester is dean and get school
async function getDeanSchool(req) {
  if (req.user.role !== 'dean') {
    const err = new Error('Access denied: Dean only');
    err.status = 403;
    throw err;
  }
  if (!req.user.school) {
    const err = new Error('Dean is not assigned to any school');
    err.status = 400;
    throw err;
  }
  const school = await School.findById(req.user.school).select('name code').lean();
  if (!school) {
    const err = new Error('School not found');
    err.status = 404;
    throw err;
  }
  return school;
}

// GET /api/dean/overview
exports.getOverview = async (req, res) => {
  try {
    const school = await getDeanSchool(req);

    const [departments, teachersCount, studentsCount, coursesCount, hodsCount] = await Promise.all([
      Department.countDocuments({ school: school._id, isActive: true }),
      User.countDocuments({ role: 'teacher', school: school._id, isActive: true }),
      User.countDocuments({ role: 'student', school: school._id, isActive: true }),
      Course.countDocuments({ school: school._id, isActive: true }),
      Department.countDocuments({ school: school._id, isActive: true, hod: { $ne: null } })
    ]);

    res.json({
      school,
      stats: {
        departments,
        teachers: teachersCount,
        students: studentsCount,
  courses: coursesCount,
  hods: hodsCount
      }
    });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

// GET /api/dean/departments
exports.getDepartments = async (req, res) => {
  try {
    const school = await getDeanSchool(req);

    const departments = await Department.find({ school: school._id, isActive: true })
      .populate('hod', 'name email teacherId _id')
      .select('name code hod courses')
      .lean();

    // Compute quick counts per department
    const deptIds = departments.map(d => d._id);
    const [courseCounts, teacherCounts, studentCounts] = await Promise.all([
      Course.aggregate([
        { $match: { department: { $in: deptIds }, isActive: true } },
        { $group: { _id: '$department', count: { $sum: 1 } } }
      ]),
      User.aggregate([
        { $match: { role: 'teacher', isActive: true, department: { $in: deptIds } } },
        { $group: { _id: '$department', count: { $sum: 1 } } }
      ]),
      User.aggregate([
        { $match: { role: 'student', isActive: true } },
        { $lookup: { from: 'courses', localField: 'coursesAssigned', foreignField: '_id', as: 'courses' } },
        { $unwind: { path: '$courses', preserveNullAndEmptyArrays: true } },
        { $group: { _id: '$courses.department', count: { $sum: 1 } } }
      ])
    ]);

    const cMap = new Map(courseCounts.map(x => [x._id?.toString(), x.count]));
    const tMap = new Map(teacherCounts.map(x => [x._id?.toString(), x.count]));
    const sMap = new Map(studentCounts.map(x => [x._id?.toString(), x.count]));

    const result = departments.map(d => ({
      _id: d._id,
      name: d.name,
      code: d.code,
      hod: d.hod ? { _id: d.hod._id, name: d.hod.name, email: d.hod.email, uid: d.hod.teacherId } : null,
      counts: {
        courses: cMap.get(d._id.toString()) || 0,
        teachers: tMap.get(d._id.toString()) || 0,
        students: sMap.get(d._id.toString()) || 0
      }
    }));

    res.json({ school, departments: result });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

// GET /api/dean/analytics
exports.getAnalytics = async (req, res) => {
  try {
    const school = await getDeanSchool(req);

    // Department-wise detailed analytics
    const departmentAnalytics = await Department.aggregate([
      { $match: { school: school._id, isActive: true } },
      {
        $lookup: {
          from: 'courses',
          let: { deptId: '$_id' },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ['$department', '$$deptId'] }, { $ne: ['$isActive', false] }] } } },
            {
              $lookup: {
                from: 'users',
                let: { courseId: '$_id' },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ['$role', 'teacher'] },
                          { $in: ['$$courseId', '$coursesAssigned'] },
                          { $ne: ['$isActive', false] }
                        ]
                      }
                    }
                  }
                ],
                as: 'teachers'
              }
            },
            {
              $lookup: {
                from: 'users',
                let: { courseId: '$_id' },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ['$role', 'student'] },
                          { $in: ['$$courseId', '$coursesAssigned'] },
                          { $ne: ['$isActive', false] }
                        ]
                      }
                    }
                  }
                ],
                as: 'students'
              }
            },
            {
              $lookup: {
                from: 'videos',
                localField: '_id',
                foreignField: 'course',
                as: 'videos'
              }
            },
            {
              $project: {
                title: 1,
                courseCode: 1,
                teacherCount: { $size: '$teachers' },
                studentCount: { $size: '$students' },
                videoCount: { $size: '$videos' },
                teachers: { $slice: ['$teachers.name', 3] },
                enrolledStudents: { $size: '$students' }
              }
            }
          ],
          as: 'courses'
        }
      },
      {
        $lookup: {
          from: 'users',
          let: { deptId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$department', '$$deptId'] },
                    { $eq: ['$role', 'teacher'] },
                    { $ne: ['$isActive', false] }
                  ]
                }
              }
            },
            { $project: { name: 1, email: 1, teacherId: 1, coursesAssigned: 1 } }
          ],
          as: 'teachers'
        }
      },
      {
        $lookup: {
          from: 'users',
          let: { deptId: '$_id' },
          pipeline: [
            { $match: { role: 'student', isActive: { $ne: false } } },
            { $lookup: { from: 'courses', localField: 'coursesAssigned', foreignField: '_id', as: 'studentCourses' } },
            { $unwind: { path: '$studentCourses', preserveNullAndEmptyArrays: false } },
            { $match: { $expr: { $eq: ['$studentCourses.department', '$$deptId'] } } },
            { $group: { _id: '$_id', name: { $first: '$name' }, email: { $first: '$email' }, regNo: { $first: '$regNo' }, courseCount: { $sum: 1 } } }
          ],
          as: 'students'
        }
      },
      {
        $lookup: {
          from: 'sections',
          let: { deptId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$department', '$$deptId'] } } },
            {
              $lookup: {
                from: 'users',
                localField: '_id',
                foreignField: 'sections',
                as: 'sectionStudents'
              }
            },
            {
              $project: {
                name: 1,
                studentCount: { $size: '$sectionStudents' },
                teacher: 1
              }
            }
          ],
          as: 'sections'
        }
      },
      {
        $addFields: {
          totalCourses: { $size: '$courses' },
          totalTeachers: { $size: '$teachers' },
          totalStudents: { $size: '$students' },
          totalSections: { $size: '$sections' },
          avgStudentsPerCourse: {
            $cond: {
              if: { $gt: [{ $size: '$courses' }, 0] },
              then: { $divide: [{ $sum: '$courses.studentCount' }, { $size: '$courses' }] },
              else: 0
            }
          },
          coursesWithoutTeachers: {
            $size: { $filter: { input: '$courses', as: 'course', cond: { $eq: ['$$course.teacherCount', 0] } } }
          },
          coursesWithoutStudents: {
            $size: { $filter: { input: '$courses', as: 'course', cond: { $eq: ['$$course.studentCount', 0] } } }
          }
        }
      },
      {
        $project: {
          name: 1,
          code: 1,
          hod: 1,
          totalCourses: 1,
          totalTeachers: 1,
          totalStudents: 1,
          totalSections: 1,
          avgStudentsPerCourse: { $round: ['$avgStudentsPerCourse', 1] },
          coursesWithoutTeachers: 1,
          coursesWithoutStudents: 1,
          courses: { $slice: ['$courses', 10] }, // Top 10 courses
          teachers: { $slice: ['$teachers', 10] }, // Top 10 teachers
          students: { $slice: ['$students', 10] }, // Top 10 students
          sections: 1
        }
      },
      { $sort: { name: 1 } }
    ]);

    // Course-wise analytics across the school
    const courseAnalytics = await Course.aggregate([
      { $match: { school: school._id, isActive: { $ne: false } } },
      {
        $lookup: {
          from: 'departments',
          localField: 'department',
          foreignField: '_id',
          as: 'department'
        }
      },
      { $unwind: '$department' },
      {
        $lookup: {
          from: 'users',
          let: { courseId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$role', 'teacher'] },
                    { $in: ['$$courseId', '$coursesAssigned'] },
                    { $ne: ['$isActive', false] }
                  ]
                }
              }
            }
          ],
          as: 'teachers'
        }
      },
      {
        $lookup: {
          from: 'users',
          let: { courseId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$role', 'student'] },
                    { $in: ['$$courseId', '$coursesAssigned'] },
                    { $ne: ['$isActive', false] }
                  ]
                }
              }
            }
          ],
          as: 'students'
        }
      },
      {
        $lookup: {
          from: 'videos',
          localField: '_id',
          foreignField: 'course',
          as: 'videos'
        }
      },
      {
        $project: {
          title: 1,
          courseCode: 1,
          departmentName: '$department.name',
          teacherCount: { $size: '$teachers' },
          studentCount: { $size: '$students' },
          videoCount: { $size: '$videos' },
          utilization: {
            $cond: {
              if: { $gt: [{ $size: '$students' }, 0] },
              then: { $multiply: [{ $divide: [{ $size: '$students' }, 100] }, 100] },
              else: 0
            }
          }
        }
      },
      { $sort: { studentCount: -1 } },
      { $limit: 20 }
    ]);

    // Student performance analytics
    const studentAnalytics = await User.aggregate([
      { $match: { role: 'student', school: school._id, isActive: { $ne: false } } },
      {
        $lookup: {
          from: 'courses',
          localField: 'coursesAssigned',
          foreignField: '_id',
          as: 'courses'
        }
      },
      {
        $lookup: {
          from: 'departments',
          localField: 'courses.department',
          foreignField: '_id',
          as: 'departments'
        }
      },
      {
        $lookup: {
          from: 'studentprogresses',
          localField: '_id',
          foreignField: 'student',
          as: 'progress'
        }
      },
      {
        $project: {
          name: 1,
          email: 1,
          regNo: 1,
          courseCount: { $size: '$courses' },
          departmentCount: { $size: { $setUnion: ['$courses.department', []] } },
          totalWatchTime: { $sum: '$progress.totalWatchTime' },
          avgProgress: { $avg: '$progress.progressPercentage' }
        }
      },
      { $sort: { totalWatchTime: -1 } },
      { $limit: 20 }
    ]);

    // School summary
    const [totalDepartments, totalCourses, totalTeachers, totalStudents] = await Promise.all([
      Department.countDocuments({ school: school._id, isActive: true }),
      Course.countDocuments({ school: school._id, isActive: { $ne: false } }),
      User.countDocuments({ role: 'teacher', school: school._id, isActive: { $ne: false } }),
      User.countDocuments({ role: 'student', school: school._id, isActive: { $ne: false } })
    ]);

    // Videos don't store school directly; count videos for courses in this school
    const courseIdsInSchool = await Course.find({ school: school._id, isActive: { $ne: false } }).distinct('_id');
    const totalVideos = await Video.countDocuments({ course: { $in: courseIdsInSchool } });

    res.json({
      school,
      summary: {
        totalDepartments,
        totalCourses,
        totalTeachers,
        totalStudents,
        totalVideos,
        avgStudentsPerDepartment: totalDepartments > 0 ? Math.round(totalStudents / totalDepartments) : 0,
        avgCoursesPerDepartment: totalDepartments > 0 ? Math.round(totalCourses / totalDepartments) : 0
      },
      departmentAnalytics,
      courseAnalytics,
      studentAnalytics
    });
  } catch (err) {
    console.error('Dean analytics error:', err);
    res.status(err.status || 500).json({ message: err.message });
  }
};

// ============ School Management Endpoints ============

// GET /api/dean/school-management/options
// Returns all departments in the dean's school and available HOD candidates
exports.getSchoolManagementOptions = async (req, res) => {
  try {
    const school = await getDeanSchool(req);

    const [departments, hodCandidates] = await Promise.all([
      Department.find({ school: school._id, isActive: true })
        .populate('hod', 'name email teacherId _id department')
        .select('name code hod'),
      User.find({ role: 'hod', school: school._id, isActive: true })
        .select('name email teacherId department')
        .populate('department', 'name code')
    ]);

    res.json({ school, departments, hodCandidates });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

// PUT /api/dean/department/:deptId/hod  { hodId }
// Assign/update department HOD from hods within the same school
exports.setDepartmentHod = async (req, res) => {
  try {
    const school = await getDeanSchool(req);
    const { deptId } = req.params;
    const { hodId } = req.body;

  const dept = await Department.findOne({ _id: deptId, school: school._id }).lean();
    if (!dept) return res.status(404).json({ message: 'Department not found in your school' });

    // If hodId is falsy, unassign HOD
    if (!hodId) {
      dept.hod = null;
      await dept.save();
      const populated = await Department.findById(dept._id).populate('hod', 'name email teacherId _id');
      return res.json({ message: 'HOD unassigned successfully', department: {
        _id: populated._id, name: populated.name, code: populated.code,
        hod: populated.hod ? { _id: populated.hod._id, name: populated.hod.name, email: populated.hod.email, uid: populated.hod.teacherId } : null
      }});
    }

    const hodUser = await User.findOne({ _id: hodId, role: 'hod', school: school._id, isActive: true });
    if (!hodUser) return res.status(400).json({ message: 'HOD candidate not found in your school' });

    dept.hod = hodUser._id;
    await dept.save();

    const populated = await Department.findById(dept._id).populate('hod', 'name email teacherId _id');
    res.json({ message: 'HOD updated successfully', department: {
      _id: populated._id, name: populated.name, code: populated.code,
      hod: populated.hod ? { _id: populated.hod._id, name: populated.hod.name, email: populated.hod.email, uid: populated.hod.teacherId } : null
    }});
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

// GET /api/dean/department/:deptId/courses
exports.getDepartmentCourses = async (req, res) => {
  try {
    const school = await getDeanSchool(req);
    const { deptId } = req.params;

    const dept = await Department.findOne({ _id: deptId, school: school._id });
    if (!dept) return res.status(404).json({ message: 'Department not found in your school' });

    const courses = await Course.find({ department: dept._id, school: school._id, isActive: true })
      .select('title courseCode description');

    res.json({ department: { _id: dept._id, name: dept.name, code: dept.code }, courses });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

// GET /api/dean/course/:courseId/relations
// Returns teachers and students related to a course (via sections)
exports.getCourseRelations = async (req, res) => {
  try {
    const school = await getDeanSchool(req);
    const { courseId } = req.params;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit, 10) || 25, 1);

  const course = await Course.findOne({ _id: courseId, school: school._id }).lean();
    if (!course) return res.status(404).json({ message: 'Course not found in your school' });

    // Get sections that include this course
    const sections = await Section.find({ school: school._id, courses: course._id, isActive: true })
      .populate('teacher', 'name email teacherId department')
      .populate('students', 'name email regNo department')
      .lean();

    // Teachers teaching this course via sections
    const teacherMap = new Map();
    sections.forEach(s => {
      if (s.teacher) {
        teacherMap.set(s.teacher._id.toString(), {
          _id: s.teacher._id,
          name: s.teacher.name,
          email: s.teacher.email,
          teacherId: s.teacher.teacherId
        });
      }
    });

    // Also check teachers who have this course in their coursesAssigned field
    const courseTeachers = await User.find({
      role: 'teacher',
      school: school._id,
      coursesAssigned: course._id,
      isActive: { $ne: false }
    }).select('name email teacherId');

    courseTeachers.forEach(teacher => {
      teacherMap.set(teacher._id.toString(), {
        _id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        teacherId: teacher.teacherId
      });
    });

    // Also check for teachers who have this course in their coursesAssigned array
    const assignedTeachers = await User.find({ 
      role: 'teacher', 
      school: school._id, 
      coursesAssigned: course._id,
      isActive: { $ne: false }
    }).select('name email teacherId department');

    assignedTeachers.forEach(teacher => {
      if (!teacherMap.has(teacher._id.toString())) {
        teacherMap.set(teacher._id.toString(), {
          _id: teacher._id,
          name: teacher.name,
          email: teacher.email,
          teacherId: teacher.teacherId
        });
      }
    });

    // Students enrolled via sections
    const studentMap = new Map();
    sections.forEach(s => {
      (s.students || []).forEach(st => {
        if (st && st._id) {
          studentMap.set(st._id.toString(), {
            _id: st._id,
            name: st.name,
            email: st.email,
            regNo: st.regNo
          });
        }
      });
    });

    const teachersArr = Array.from(teacherMap.values());
    const studentsArr = Array.from(studentMap.values());
    const totalStudents = studentsArr.length;
    const totalPages = Math.max(Math.ceil(totalStudents / limit), 1);
    const start = (page - 1) * limit;
    const pagedStudents = studentsArr.slice(start, start + limit);

    res.json({
      course: { _id: course._id, title: course.title, courseCode: course.courseCode },
      teachers: teachersArr,
      students: pagedStudents,
      pagination: {
        page,
        limit,
        total: totalStudents,
        totalPages
      }
    });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

// GET /api/dean/teacher/:teacherId/details
exports.getTeacherDetails = async (req, res) => {
  try {
    const school = await getDeanSchool(req);
    const { teacherId } = req.params;

    const teacher = await User.findOne({ _id: teacherId, role: 'teacher', school: school._id, isActive: true })
      .select('name email teacherId department')
      .populate('department', 'name code')
      .lean();
    if (!teacher) return res.status(404).json({ message: 'Teacher not found in your school' });

    const sections = await Section.find({ teacher: teacher._id, school: school._id })
      .populate('courses', 'title courseCode')
      .select('name courses')
      .lean();

    // Derive unique courses across sections
    const courseMap = new Map();
    sections.forEach(sec => sec.courses?.forEach(c => c && courseMap.set(c._id.toString(), c)));

    res.json({
      teacher: {
        _id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        teacherId: teacher.teacherId,
        department: teacher.department ? { _id: teacher.department._id, name: teacher.department.name, code: teacher.department.code } : null
      },
      courses: Array.from(courseMap.values()),
      sections: sections.map(s => ({ _id: s._id, name: s.name, courses: s.courses }))
    });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

// GET /api/dean/student/:studentId/details
exports.getStudentDetails = async (req, res) => {
  try {
    const school = await getDeanSchool(req);
    const { studentId } = req.params;

    const student = await User.findOne({ _id: studentId, role: 'student', school: school._id, isActive: true })
      .select('name email regNo coursesAssigned assignedSections watchHistory')
      .lean();
    if (!student) return res.status(404).json({ message: 'Student not found in your school' });

    // Sections the student is in
    const sections = await Section.find({ school: school._id, students: student._id })
      .populate('courses', 'title courseCode')
      .select('name courses')
      .lean();

    // Courses via sections + directly assigned
    const sectionCourseIds = new Set();
    sections.forEach(s => s.courses?.forEach(c => c && sectionCourseIds.add(c._id.toString())));
    const directCourseIds = (student.coursesAssigned || []).map(id => id.toString());
    const allCourseIds = Array.from(new Set([...sectionCourseIds, ...directCourseIds]));
    const courses = await Course.find({ _id: { $in: allCourseIds } }).select('title courseCode');

    // Simple course-wise performance: total watch time per course (using videos -> course)
  const videos = await Video.find({ course: { $in: allCourseIds } }).select('_id course').lean();
    const videoByCourse = new Map();
    videos.forEach(v => {
      const cid = v.course?.toString();
      if (!cid) return;
      if (!videoByCourse.has(cid)) videoByCourse.set(cid, new Set());
      videoByCourse.get(cid).add(v._id.toString());
    });
    const perfByCourse = {};
    (student.watchHistory || []).forEach(item => {
      const vid = item.video?.toString();
      const time = item.timeSpent || 0;
      if (!vid || time <= 0) return;
      // find course containing this video
      for (const [cid, vids] of videoByCourse.entries()) {
        if (vids.has(vid)) {
          perfByCourse[cid] = (perfByCourse[cid] || 0) + time;
          break;
        }
      }
    });

    const coursePerformance = courses.map(c => ({
      _id: c._id,
      title: c.title,
      courseCode: c.courseCode,
      totalWatchTime: perfByCourse[c._id.toString()] || 0
    }));

    res.json({
      student: { _id: student._id, name: student.name, email: student.email, regNo: student.regNo },
      sections: sections.map(s => ({ _id: s._id, name: s.name, courses: s.courses })),
      courses,
      coursePerformance
    });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

// GET /api/dean/student/search?regNo=...
exports.getStudentByRegNo = async (req, res) => {
  try {
    const school = await getDeanSchool(req);
    const { regNo } = req.query;

    if (!regNo || typeof regNo !== 'string' || !regNo.trim()) {
      return res.status(400).json({ message: 'Registration number (regNo) is required' });
    }

    const student = await User.findOne({
      role: 'student',
      school: school._id,
      isActive: { $ne: false },
      regNo: regNo.trim()
    }).select('_id name email regNo');

    if (!student) {
      return res.status(404).json({ message: 'Student not found in your school' });
    }

    res.json(student);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

// GET /api/dean/course/:courseId/sections
// Returns section-wise report for a course within dean's school
exports.getCourseSections = async (req, res) => {
  try {
    const school = await getDeanSchool(req);
    const { courseId } = req.params;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit, 10) || 25, 1);

  const course = await Course.findOne({ _id: courseId, school: school._id }).lean();
    if (!course) return res.status(404).json({ message: 'Course not found in your school' });

    const query = { school: school._id, courses: course._id, isActive: { $ne: false } };
    const total = await Section.countDocuments(query);
    const sections = await Section.find(query)
      .populate('teacher', 'name email teacherId department')
      .populate('students', '_id')
      .select('name teacher students')
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const result = sections.map(s => ({
      _id: s._id,
      name: s.name,
      teacher: s.teacher ? {
        _id: s.teacher._id,
        name: s.teacher.name,
        email: s.teacher.email,
        teacherId: s.teacher.teacherId
      } : null,
      studentsCount: Array.isArray(s.students) ? s.students.length : 0
    }));

    res.json({
      course: { _id: course._id, title: course.title, courseCode: course.courseCode },
      pagination: { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) },
      sections: result
    });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

// GET /api/dean/course/:courseId/sections/export?mode=summary|students
// Exports section-wise report CSV for a course. Default mode=summary
exports.exportCourseSectionsCsv = async (req, res) => {
  try {
    const school = await getDeanSchool(req);
    const { courseId } = req.params;
    const mode = (req.query.mode || 'summary').toString();

    const course = await Course.findOne({ _id: courseId, school: school._id });
    if (!course) return res.status(404).json({ message: 'Course not found in your school' });

    const sections = await Section.find({ school: school._id, courses: course._id, isActive: { $ne: false } })
      .populate('teacher', 'name email teacherId')
      .populate('students', 'name email regNo')
      .select('name teacher students')
      .lean();

    let csv = '';
    if (mode === 'students') {
      csv += 'Course Title,Course Code,Section Name,Teacher Name,Teacher ID,Student Name,Student Reg No,Student Email\n';
      sections.forEach(sec => {
        const t = sec.teacher || {};
        if (Array.isArray(sec.students) && sec.students.length > 0) {
          sec.students.forEach(st => {
            csv += [
              escapeCsv(course.title),
              escapeCsv(course.courseCode || ''),
              escapeCsv(sec.name),
              escapeCsv(t.name || ''),
              escapeCsv(t.teacherId || ''),
              escapeCsv(st.name || ''),
              escapeCsv(st.regNo || ''),
              escapeCsv(st.email || '')
            ].join(',') + '\n';
          });
        } else {
          // No students, still include a row to show empty
          csv += [
            escapeCsv(course.title),
            escapeCsv(course.courseCode || ''),
            escapeCsv(sec.name),
            escapeCsv(t.name || ''),
            escapeCsv(t.teacherId || ''),
            '', '', ''
          ].join(',') + '\n';
        }
      });
    } else {
      // summary
      csv += 'Course Title,Course Code,Section Name,Teacher Name,Teacher ID,Teacher Email,Students Count\n';
      sections.forEach(sec => {
        const t = sec.teacher || {};
        csv += [
          escapeCsv(course.title),
          escapeCsv(course.courseCode || ''),
          escapeCsv(sec.name),
          escapeCsv(t.name || ''),
          escapeCsv(t.teacherId || ''),
          escapeCsv(t.email || ''),
          (Array.isArray(sec.students) ? sec.students.length : 0)
        ].join(',') + '\n';
      });
    }

    const filename = `course_${(course.courseCode || course._id).toString()}_sections_${mode}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csv);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

// Helper: escape CSV fields (minimal)
function escapeCsv(value) {
  const s = String(value ?? '');
  if (/[",\n]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

// GET /api/dean/section/:sectionId/analytics
// Returns detailed analytics for a section: per-student courses in section, unit-wise watch time and quiz scores, with department names
exports.getSectionAnalyticsDetailed = async (req, res) => {
  try {
    const school = await getDeanSchool(req);
    const { sectionId } = req.params;

    // Load section with relations
    const section = await Section.findOne({ _id: sectionId, school: school._id, isActive: { $ne: false } })
      .populate('courses', 'title courseCode department')
      .populate('department', 'name code')
      .populate('students', '_id name email regNo')
      .lean();
    if (!section) return res.status(404).json({ message: 'Section not found in your school' });

    const courseIds = (section.courses || []).map(c => c._id);
    const dept = section.department ? { _id: section.department._id, name: section.department.name, code: section.department.code } : null;

    // Fetch units for each course
  const units = await Unit.find({ course: { $in: courseIds } }).select('_id title course order').lean();
    const unitsByCourse = units.reduce((acc, u) => {
      const cid = u.course.toString();
      if (!acc[cid]) acc[cid] = [];
      acc[cid].push({ _id: u._id, title: u.title, order: u.order });
      return acc;
    }, {});

    // Progress docs for students in this section for the section's courses
    const studentIds = (section.students || []).map(s => s._id);
  const progresses = await StudentProgress.find({ student: { $in: studentIds }, course: { $in: courseIds } }).lean();

    // Build quick lookup by student->course
    const progByStudentCourse = new Map(); // key: `${studentId}:${courseId}` => progressDoc
    for (const p of progresses) {
      progByStudentCourse.set(`${p.student.toString()}:${p.course.toString()}`, p);
    }

    // Optionally fetch latest quiz attempts per student-course-unit (fallback source)
    const quizAttempts = await QuizAttempt.find({
      student: { $in: studentIds },
      course: { $in: courseIds },
      isComplete: true
    }).select('student course unit percentage passed completedAt').lean();

    const quizByStuCourseUnit = new Map(); // key `${sid}:${cid}:${uid}` -> latest attempt
    for (const qa of quizAttempts) {
      const key = `${qa.student.toString()}:${qa.course?.toString()}:${qa.unit?.toString()}`;
      const existing = quizByStuCourseUnit.get(key);
      if (!existing || (qa.completedAt && (!existing.completedAt || qa.completedAt > existing.completedAt))) {
        quizByStuCourseUnit.set(key, qa);
      }
    }

    // Compose students array with per-course and per-unit metrics
    const students = (section.students || []).map(st => {
      const studentCourses = (section.courses || []).map(c => {
        const key = `${st._id.toString()}:${c._id.toString()}`;
        const p = progByStudentCourse.get(key);
        // Unit metrics
        const unitList = (unitsByCourse[c._id.toString()] || []).sort((a,b) => a.order - b.order).map(u => {
          // from StudentProgress units array
          let watchedSeconds = 0;
          let completedVideos = 0;
          let totalVideos = 0;
          let quizPct = null;
          let quizPassed = null;
          let attemptsCount = 0;
          let blocked = null;
          if (p && Array.isArray(p.units)) {
            const up = p.units.find(x => x.unitId && x.unitId.toString() === u._id.toString());
            if (up) {
              totalVideos = Array.isArray(up.videosWatched) ? up.videosWatched.length : 0;
              watchedSeconds = (up.videosWatched || []).reduce((sum, vw) => sum + (vw.timeSpent || 0), 0);
              completedVideos = (up.videosWatched || []).filter(vw => vw.completed).length;
              attemptsCount = Array.isArray(up.quizAttempts) ? up.quizAttempts.length : 0;
              if (up.securityLock && typeof up.securityLock.locked === 'boolean') {
                blocked = up.securityLock.locked;
              }
              // Prefer StudentProgress embedded quizAttempts as source of truth
              if (Array.isArray(up.quizAttempts) && up.quizAttempts.length > 0) {
                const completedAttempts = up.quizAttempts.filter(a => !!a.completedAt);
                if (completedAttempts.length > 0) {
                  const sorted = completedAttempts.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
                  const latest = sorted[0];
                  if (latest && typeof latest.percentage === 'number') quizPct = latest.percentage;
                  if (typeof latest?.passed === 'boolean') quizPassed = latest.passed;
                }
              }
            }
          }
          // Fallback to QuizAttempt collection if SP has no attempt info
          if (quizPct === null || quizPassed === null) {
            const qa = quizByStuCourseUnit.get(`${st._id.toString()}:${c._id.toString()}:${u._id.toString()}`);
            if (qa) {
              if (quizPct === null && typeof qa.percentage === 'number') quizPct = qa.percentage;
              if (quizPassed === null && typeof qa.passed === 'boolean') quizPassed = qa.passed;
            }
          }
          return {
            unitId: u._id,
            unitTitle: u.title,
            videosCompleted: completedVideos,
            videosWatched: totalVideos,
            watchTime: watchedSeconds,
            quizPercentage: quizPct,
            quizPassed: quizPassed,
            attemptsCount,
            blocked
          };
        });

        const totalWatch = unitList.reduce((s, x) => s + (x.watchTime || 0), 0);
        const avgQuiz = (() => {
          const vals = unitList.map(x => x.quizPercentage).filter(v => typeof v === 'number');
          return vals.length ? (vals.reduce((a,b)=>a+b,0) / vals.length) : null;
        })();

        return {
          courseId: c._id,
          courseTitle: c.title,
          courseCode: c.courseCode,
          departmentName: dept?.name || null,
          totalWatchTime: totalWatch,
          averageQuiz: avgQuiz,
          units: unitList
        };
      });

      return {
        _id: st._id,
        name: st.name,
        email: st.email,
        regNo: st.regNo,
        courses: studentCourses
      };
    });

    res.json({
      section: { _id: section._id, name: section.name },
      department: dept,
      courses: (section.courses || []).map(c => ({ _id: c._id, title: c.title, courseCode: c.courseCode })),
      students
    });
  } catch (err) {
    console.error('Dean section analytics error:', err);
    res.status(err.status || 500).json({ message: err.message });
  }
};

// GET /api/dean/sections?departmentId=&q=&page=&limit=
// Lists sections across the dean's school (not course-bound) with optional filters
exports.getSections = async (req, res) => {
  try {
    const school = await getDeanSchool(req);
    const { departmentId, q } = req.query;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit, 10) || 25, 1);

    const filter = { school: school._id, isActive: { $ne: false } };
    if (departmentId) filter.department = departmentId;
    if (q && typeof q === 'string') filter.name = { $regex: q.trim(), $options: 'i' };

    const total = await Section.countDocuments(filter);
    const sections = await Section.find(filter)
      .populate('teacher', 'name email teacherId')
      .populate('courses', 'title courseCode')
      .populate('department', 'name code')
      .populate('students', '_id')
      .select('name teacher courses department students')
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const data = sections.map(s => ({
      _id: s._id,
      name: s.name,
      department: s.department ? { _id: s.department._id, name: s.department.name, code: s.department.code } : null,
      teacher: s.teacher ? { _id: s.teacher._id, name: s.teacher.name, email: s.teacher.email, teacherId: s.teacher.teacherId } : null,
      studentsCount: Array.isArray(s.students) ? s.students.length : 0,
      courses: (s.courses || []).map(c => ({ _id: c._id, title: c.title, courseCode: c.courseCode }))
    }));

    res.json({
      pagination: { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) },
      sections: data
    });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

// GET /api/dean/section/:sectionId/analytics/export
// Exports detailed section analytics (student/course/unit) as CSV
exports.exportSectionAnalyticsCsv = async (req, res) => {
  try {
    const school = await getDeanSchool(req);
    const { sectionId } = req.params;

    const section = await Section.findOne({ _id: sectionId, school: school._id, isActive: { $ne: false } })
      .populate('courses', 'title courseCode department')
      .populate('department', 'name code')
      .populate('students', '_id name email regNo')
      .lean();
    if (!section) return res.status(404).json({ message: 'Section not found in your school' });

    const courseIds = (section.courses || []).map(c => c._id);
    const deptName = section.department ? section.department.name : '';

    // Units per course
  const units = await Unit.find({ course: { $in: courseIds } }).select('_id title course order').lean();
    const unitsByCourse = units.reduce((acc, u) => {
      const cid = u.course.toString();
      if (!acc[cid]) acc[cid] = [];
      acc[cid].push({ _id: u._id, title: u.title, order: u.order });
      return acc;
    }, {});
    for (const cid of Object.keys(unitsByCourse)) {
      unitsByCourse[cid].sort((a,b)=>a.order-b.order);
    }

    const studentIds = (section.students || []).map(s => s._id);
    const progresses = await StudentProgress.find({ student: { $in: studentIds }, course: { $in: courseIds } }).lean();
    const progByStudentCourse = new Map();
    for (const p of progresses) {
      progByStudentCourse.set(`${p.student.toString()}:${p.course.toString()}`, p);
    }

    const quizAttempts = await QuizAttempt.find({
      student: { $in: studentIds },
      course: { $in: courseIds },
      isComplete: true
    }).select('student course unit percentage passed completedAt').lean();

    const quizByStuCourseUnit = new Map();
    for (const qa of quizAttempts) {
      const key = `${qa.student.toString()}:${qa.course?.toString()}:${qa.unit?.toString()}`;
      const existing = quizByStuCourseUnit.get(key);
      if (!existing || (qa.completedAt && (!existing.completedAt || qa.completedAt > existing.completedAt))) {
        quizByStuCourseUnit.set(key, qa);
      }
    }

    let csv = 'Section,Department,Student Name,Reg No,Email,Course Title,Course Code,Unit,Watch Time (min),Videos Completed,Videos Watched,Quiz %,Passed,Attempts,Blocked\n';

    for (const st of (section.students || [])) {
      for (const c of (section.courses || [])) {
        const key = `${st._id.toString()}:${c._id.toString()}`;
        const p = progByStudentCourse.get(key);
        const unitList = (unitsByCourse[c._id.toString()] || []);
        for (const u of unitList) {
          let watchedSeconds = 0;
          let completedVideos = 0;
          let totalVideos = 0;
          let quizPct = null;
          let quizPassed = null;
          let attemptsCount = 0;
          let blocked = null;

          if (p && Array.isArray(p.units)) {
            const up = p.units.find(x => x.unitId && x.unitId.toString() === u._id.toString());
            if (up) {
              totalVideos = Array.isArray(up.videosWatched) ? up.videosWatched.length : 0;
              watchedSeconds = (up.videosWatched || []).reduce((sum, vw) => sum + (vw.timeSpent || 0), 0);
              completedVideos = (up.videosWatched || []).filter(vw => vw.completed).length;
              attemptsCount = Array.isArray(up.quizAttempts) ? up.quizAttempts.length : 0;
              if (up.securityLock && typeof up.securityLock.locked === 'boolean') {
                blocked = up.securityLock.locked;
              }
              if (Array.isArray(up.quizAttempts) && up.quizAttempts.length > 0) {
                const completedAttempts = up.quizAttempts.filter(a => !!a.completedAt);
                if (completedAttempts.length > 0) {
                  const sorted = completedAttempts.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
                  const latest = sorted[0];
                  if (latest && typeof latest.percentage === 'number') quizPct = latest.percentage;
                  if (typeof latest?.passed === 'boolean') quizPassed = latest.passed;
                }
              }
            }
          }
          if (quizPct === null || quizPassed === null) {
            const qa = quizByStuCourseUnit.get(`${st._id.toString()}:${c._id.toString()}:${u._id.toString()}`);
            if (qa) {
              if (quizPct === null && typeof qa.percentage === 'number') quizPct = qa.percentage;
              if (quizPassed === null && typeof qa.passed === 'boolean') quizPassed = qa.passed;
            }
          }

          const row = [
            escapeCsv(section.name),
            escapeCsv(deptName),
            escapeCsv(st.name || ''),
            escapeCsv(st.regNo || ''),
            escapeCsv(st.email || ''),
            escapeCsv(c.title || ''),
            escapeCsv(c.courseCode || ''),
            escapeCsv(u.title || ''),
            Math.round((watchedSeconds || 0) / 60),
            completedVideos,
            totalVideos,
            quizPct === null ? '' : Math.round(quizPct),
            quizPassed === null ? '' : (quizPassed ? 'Yes' : 'No'),
            attemptsCount,
            blocked === null ? '' : (blocked ? 'Yes' : 'No')
          ].join(',');
          csv += row + '\n';
        }
      }
    }

    const filename = `section_${section._id.toString()}_analytics.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csv);
  } catch (err) {
    console.error('Dean section analytics export error:', err);
    res.status(err.status || 500).json({ message: err.message });
  }
};
// ...existing code...
