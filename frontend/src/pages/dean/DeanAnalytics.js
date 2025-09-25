import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Pagination,
  Button
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SchoolIcon from '@mui/icons-material/School';
import PeopleIcon from '@mui/icons-material/People';
import ClassIcon from '@mui/icons-material/Class';
import PersonIcon from '@mui/icons-material/Person';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import AssessmentIcon from '@mui/icons-material/Assessment';
import axios from 'axios';

const DeanAnalytics = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [currentTab, setCurrentTab] = useState(0); // 0=Explore (Lazy), 1=Dept, 2=Course, 3=Student

  // Explore (Lazy) state
  const [deptLoading, setDeptLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [expandedDept, setExpandedDept] = useState(null);
  const [deptFilter, setDeptFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [peopleFilter, setPeopleFilter] = useState('');
  const [coursesByDept, setCoursesByDept] = useState({}); // { [deptId]: Course[] }
  const [coursesLoading, setCoursesLoading] = useState({}); // { [deptId]: bool }
  const [relationsByCourse, setRelationsByCourse] = useState({}); // { [courseId]: { teachers, students, pagination } }
  const [relationsLoading, setRelationsLoading] = useState({}); // { [courseId]: bool }
  const [studentPages, setStudentPages] = useState({}); // { [courseId]: { page, totalPages, limit } }
  const [sectionsDialog, setSectionsDialog] = useState({ open: false, loading: false, course: null, data: null });
  const [studentDialog, setStudentDialog] = useState({ open: false, loading: false, data: null });
  const [studentSearch, setStudentSearch] = useState('');
  const [studentSearchResult, setStudentSearchResult] = useState(null);

  // Defer heavy analytics fetch: only when opening Department or Course tabs
  useEffect(() => {
    if (currentTab === 0 || currentTab === 3) return; // Explore & Student tabs, don't fetch heavy data
    if (data) return; // Already loaded
    (async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const res = await axios.get('/api/dean/analytics', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setData(res.data);
        setError('');
      } catch (err) {
        console.error('Error loading dean analytics:', err);
        setError(err.response?.data?.message || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    })();
  }, [currentTab, data]);

  // Student tab (school-wide sections)
  const [sectionsFilter, setSectionsFilter] = useState('');
  const [sectionsPage, setSectionsPage] = useState(1);
  const [sectionsTotalPages, setSectionsTotalPages] = useState(1);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null);
  const [sectionAnalytics, setSectionAnalytics] = useState(null);
  const [sectionAnalyticsLoading, setSectionAnalyticsLoading] = useState(false);

  const loadSections = async (page = 1, q = '') => {
    try {
      setSectionsLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/dean/sections', { params: { page, q, limit: 10 }, headers: { Authorization: `Bearer ${token}` } });
      setSections(res.data?.sections || []);
      const p = res.data?.pagination || { page: 1, totalPages: 1 };
      setSectionsPage(p.page || 1);
      setSectionsTotalPages(p.totalPages || 1);
    } catch (err) {
      console.error('Failed to load sections', err);
      setError(err.response?.data?.message || 'Failed to load sections');
    } finally {
      setSectionsLoading(false);
    }
  };

  useEffect(() => {
    if (currentTab !== 3) return;
    loadSections(1, sectionsFilter);
  }, [currentTab]);

  const loadSectionAnalytics = async (sectionId) => {
    try {
      setSectionAnalytics(null);
      setSectionAnalyticsLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/dean/section/${sectionId}/analytics`, { headers: { Authorization: `Bearer ${token}` } });
      setSectionAnalytics(res.data);
    } catch (err) {
      console.error('Failed to load section analytics', err);
      setError(err.response?.data?.message || 'Failed to load section analytics');
    } finally {
      setSectionAnalyticsLoading(false);
    }
  };

  // Load departments for Explore tab on first enter
  useEffect(() => {
    if (currentTab !== 0) return;
    if (departments.length > 0) return;
    (async () => {
      try {
        setDeptLoading(true);
        const token = localStorage.getItem('token');
        const res = await axios.get('/api/dean/departments', { headers: { Authorization: `Bearer ${token}` } });
        setDepartments(res.data?.departments || []);
      } catch (err) {
        console.error('Failed to load departments', err);
        setError(err.response?.data?.message || 'Failed to load departments');
      } finally {
        setDeptLoading(false);
      }
    })();
  }, [currentTab, departments.length]);

  const handleExpandDept = (deptId) => async (event, isExpanded) => {
    setExpandedDept(isExpanded ? deptId : null);
    if (isExpanded && !coursesByDept[deptId]) {
      try {
        setCoursesLoading(prev => ({ ...prev, [deptId]: true }));
        const token = localStorage.getItem('token');
        const res = await axios.get(`/api/dean/department/${deptId}/courses`, { headers: { Authorization: `Bearer ${token}` } });
        setCoursesByDept(prev => ({ ...prev, [deptId]: res.data?.courses || [] }));
      } catch (err) {
        console.error('Failed to load department courses', err);
        setError(err.response?.data?.message || 'Failed to load department courses');
      } finally {
        setCoursesLoading(prev => ({ ...prev, [deptId]: false }));
      }
    }
  };

  const loadCourseRelations = async (courseId, page = 1, limit = 25) => {
    try {
      setRelationsLoading(prev => ({ ...prev, [courseId]: true }));
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/dean/course/${courseId}/relations`, { params: { page, limit }, headers: { Authorization: `Bearer ${token}` } });
      setRelationsByCourse(prev => ({ ...prev, [courseId]: res.data }));
      const p = res.data?.pagination || { page: 1, totalPages: 1, limit };
      setStudentPages(prev => ({ ...prev, [courseId]: p }));
    } catch (err) {
      console.error('Failed to load course relations', err);
      setError(err.response?.data?.message || 'Failed to load course relations');
    } finally {
      setRelationsLoading(prev => ({ ...prev, [courseId]: false }));
    }
  };

  const loadCourseSections = async (courseId, page = 1, limit = 25) => {
    try {
      setSectionsDialog(prev => ({ ...prev, open: true, loading: true, course: prev.course || { _id: courseId } }));
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/dean/course/${courseId}/sections`, { params: { page, limit }, headers: { Authorization: `Bearer ${token}` } });
      setSectionsDialog({ open: true, loading: false, course: res.data.course, data: res.data });
    } catch (err) {
      console.error('Failed to load course sections', err);
      setError(err.response?.data?.message || 'Failed to load course sections');
      setSectionsDialog({ open: false, loading: false, course: null, data: null });
    }
  };

  const searchStudentByRegNo = async () => {
    try {
      setStudentSearchResult(null);
      if (!studentSearch.trim()) return;
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/dean/student/search', { params: { regNo: studentSearch.trim() }, headers: { Authorization: `Bearer ${token}` } });
      setStudentSearchResult(res.data);
    } catch (err) {
      console.error('Failed to search student', err);
      setStudentSearchResult({ error: err.response?.data?.message || 'Student not found' });
    }
  };

  const openStudentDialog = async (studentId) => {
    try {
      setStudentDialog({ open: true, loading: true, data: null });
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/dean/student/${studentId}/details`, { headers: { Authorization: `Bearer ${token}` } });
      setStudentDialog({ open: true, loading: false, data: res.data });
    } catch (err) {
      console.error('Failed to load student details', err);
      setError(err.response?.data?.message || 'Failed to load student details');
      setStudentDialog({ open: false, loading: false, data: null });
    }
  };

  // Chart data preparation
  const departmentChartData = useMemo(() => {
    if (!data?.departmentAnalytics) return [];
    return data.departmentAnalytics.map(dept => ({
      name: dept.name,
      courses: dept.totalCourses,
      teachers: dept.totalTeachers,
      students: dept.totalStudents,
      sections: dept.totalSections,
      avgStudents: dept.avgStudentsPerCourse,
      noTeacher: dept.coursesWithoutTeachers,
      noStudents: dept.coursesWithoutStudents
    }));
  }, [data]);

  const courseUtilizationData = useMemo(() => {
    if (!data?.courseAnalytics) return [];
    return data.courseAnalytics.slice(0, 10).map(course => ({
      name: `${course.title} (${course.courseCode})`,
      students: course.studentCount,
      teachers: course.teacherCount,
      videos: course.videoCount,
      dept: course.departmentName
    }));
  }, [data]);

  const MetricCard = ({ title, value, subtitle, icon, color, progress }) => (
    <Card sx={{ 
      height: '100%', 
      position: 'relative', 
      overflow: 'visible',
      background: '#ffffff',
      border: '1px solid #6497b1',
      boxShadow: '0 6px 20px rgba(0, 91, 150, 0.2)',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: '0 8px 25px rgba(0, 91, 150, 0.3)'
      }
    }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Box sx={{ 
            p: 1, 
            borderRadius: 2, 
            bgcolor: `${color}15`, 
            color: color,
            mr: 2,
            display: 'flex',
            alignItems: 'center'
          }}>
            {icon}
          </Box>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" color="textSecondary" gutterBottom sx={{ mb: 0 }}>
              {title}
            </Typography>
            <Typography variant="h4" sx={{ color: color, fontWeight: 'bold', mb: 0.5 }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="textSecondary">
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>
        {progress !== undefined && (
          <LinearProgress 
            variant="determinate" 
            value={progress} 
            sx={{ 
              mt: 1, 
              height: 6, 
              borderRadius: 3,
              bgcolor: `${color}20`,
              '& .MuiLinearProgress-bar': { bgcolor: color }
            }} 
          />
        )}
      </CardContent>
    </Card>
  );

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  // Note: For Explore tab we don't require `data`

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
        <AssessmentIcon sx={{ fontSize: 40 }} />
        Dean Analytics Dashboard
      </Typography>
      
      {data?.school?.name && (
        <Typography variant="h6" color="textSecondary" sx={{ mb: 3 }}>
          {data.school?.name} - Comprehensive School Analytics
        </Typography>
      )}

      {/* Key Metrics Overview */}
      {data && (
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <MetricCard 
            title="Departments" 
            value={data.summary?.totalDepartments || 0} 
            subtitle={`Avg ${data.summary?.avgCoursesPerDepartment || 0} courses each`}
            icon={<SchoolIcon />} 
            color="#1976d2" 
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <MetricCard 
            title="Total Students" 
            value={data.summary?.totalStudents || 0} 
            subtitle={`Avg ${data.summary?.avgStudentsPerDepartment || 0} per dept`}
            icon={<PeopleIcon />} 
            color="#2e7d32" 
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <MetricCard 
            title="Faculty Members" 
            value={data.summary?.totalTeachers || 0} 
            subtitle="Active teachers"
            icon={<PeopleIcon />} 
            color="#ed6c02" 
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <MetricCard 
            title="Active Courses" 
            value={data.summary?.totalCourses || 0} 
            subtitle="Across all departments"
            icon={<ClassIcon />} 
            color="#9c27b0" 
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <MetricCard 
            title="Video Content" 
            value={data.summary?.totalVideos || 0} 
            subtitle="Learning materials"
            icon={<VideoLibraryIcon />} 
            color="#26a69a" 
          />
        </Grid>
      </Grid>
      )}

      {/* Detailed Analytics Tabs */}
      <Card sx={{
        background: '#ffffff',
        border: '1px solid #6497b1',
        boxShadow: '0 6px 20px rgba(0, 91, 150, 0.2)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 8px 25px rgba(0, 91, 150, 0.3)'
        }
      }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={currentTab} onChange={handleTabChange} aria-label="analytics tabs">
            <Tab label="Explore (Lazy)" />
            <Tab label="Department Analytics" />
            <Tab label="Course Analytics" />
            <Tab label="Student Analytics" />
          </Tabs>
        </Box>

        {/* Explore (Lazy) Tab */}
        {currentTab === 0 && (
          <CardContent>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} md={3}>
                <TextField fullWidth size="small" label="Filter departments" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField fullWidth size="small" label="Filter courses" value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField fullWidth size="small" label="Filter people" value={peopleFilter} onChange={(e) => setPeopleFilter(e.target.value)} />
              </Grid>
              <Grid item xs={12} md={3}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField fullWidth size="small" label="Search student by Reg No" value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} />
                  <Button variant="contained" onClick={searchStudentByRegNo}>Search</Button>
                </Box>
                {studentSearchResult && (
                  <Box sx={{ mt: 1 }}>
                    {studentSearchResult.error ? (
                      <Alert severity="warning">{studentSearchResult.error}</Alert>
                    ) : (
                      <Chip label={`${studentSearchResult.name} (${studentSearchResult.regNo})`} onClick={() => openStudentDialog(studentSearchResult._id)} clickable />
                    )}
                  </Box>
                )}
              </Grid>
            </Grid>

            {deptLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  {(departments || [])
                    .filter(d => !deptFilter || d.name?.toLowerCase().includes(deptFilter.toLowerCase()) || (d.code||'').toLowerCase().includes(deptFilter.toLowerCase()))
                    .map(dept => (
                      <Accordion key={dept._id} expanded={expandedDept === dept._id} onChange={handleExpandDept(dept._id)} sx={{ mb: 1 }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                            <Typography variant="h6">{dept.name} ({dept.code})</Typography>
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                          {coursesLoading[dept._id] ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                              <CircularProgress size={22} />
                            </Box>
                          ) : (
                            <List dense>
                              {(coursesByDept[dept._id] || [])
                                .filter(c => !courseFilter || c.title?.toLowerCase().includes(courseFilter.toLowerCase()) || (c.courseCode||'').toLowerCase().includes(courseFilter.toLowerCase()))
                                .map(course => {
                                  const rel = relationsByCourse[course._id];
                                  const relLoad = relationsLoading[course._id];
                                  const pageMeta = studentPages[course._id];
                                  return (
                                    <Box key={course._id} sx={{ mb: 2 }}>
                                      <ListItem
                                        secondaryAction={
                                          <Box sx={{ display: 'flex', gap: 1 }}>
                                            <Button size="small" variant="outlined" onClick={() => loadCourseRelations(course._id)}>
                                              {relLoad ? 'Loading...' : 'Teachers/Students'}
                                            </Button>
                                            <Button size="small" variant="outlined" onClick={() => loadCourseSections(course._id)}>Sections</Button>
                                          </Box>
                                        }
                                      >
                                        <ListItemText primary={`${course.title} (${course.courseCode || ''})`} />
                                      </ListItem>
                                      {rel && (
                                        <Box sx={{ pl: 2, pr: 2, pb: 1 }}>
                                          <Typography variant="subtitle2" sx={{ mt: 1, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <PeopleIcon fontSize="small" /> Teachers
                                          </Typography>
                                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                                            {(rel.teachers || [])
                                              .filter(t => !peopleFilter || (t.name||'').toLowerCase().includes(peopleFilter.toLowerCase()) || (t.teacherId||'').toLowerCase().includes(peopleFilter.toLowerCase()) || (t.email||'').toLowerCase().includes(peopleFilter.toLowerCase()))
                                              .map(t => (
                                                <Chip key={t._id} label={`${t.name} (${t.teacherId || t.email})`} />
                                              ))}
                                            {(rel.teachers || []).length === 0 && (<Typography variant="body2" color="textSecondary">No teachers</Typography>)}
                                          </Box>
                                          <Typography variant="subtitle2" sx={{ mt: 1, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <PersonIcon fontSize="small" /> Students
                                          </Typography>
                                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                            {(rel.students || [])
                                              .filter(s => !peopleFilter || (s.name||'').toLowerCase().includes(peopleFilter.toLowerCase()) || (s.regNo||'').toLowerCase().includes(peopleFilter.toLowerCase()) || (s.email||'').toLowerCase().includes(peopleFilter.toLowerCase()))
                                              .map(s => (
                                                <Chip key={s._id} label={`${s.name} (${s.regNo || s.email})`} onClick={() => openStudentDialog(s._id)} clickable variant="outlined" />
                                              ))}
                                            {(rel.students || []).length === 0 && (<Typography variant="body2" color="textSecondary">No students</Typography>)}
                                          </Box>
                                          {pageMeta && pageMeta.totalPages > 1 && (
                                            <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
                                              <Pagination size="small" count={pageMeta.totalPages} page={pageMeta.page} onChange={(e, p) => loadCourseRelations(course._id, p, pageMeta.limit)} />
                                            </Box>
                                          )}
                                          <Divider sx={{ mt: 2 }} />
                                        </Box>
                                      )}
                                    </Box>
                                  );
                                })}
                              {(coursesByDept[dept._id] || []).length === 0 && (
                                <Typography variant="body2" color="textSecondary" sx={{ pl: 2 }}>No courses</Typography>
                              )}
                            </List>
                          )}
                        </AccordionDetails>
                      </Accordion>
                  ))}
                </Grid>
              </Grid>
            )}

            {/* Sections Dialog */}
            <Dialog open={sectionsDialog.open} onClose={() => setSectionsDialog({ open: false, loading: false, course: null, data: null })} fullWidth maxWidth="md">
              <DialogTitle>Sections for {sectionsDialog.course ? `${sectionsDialog.course.title} (${sectionsDialog.course.courseCode||''})` : ''}</DialogTitle>
              <DialogContent dividers>
                {sectionsDialog.loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <CircularProgress />
                  </Box>
                ) : sectionsDialog.data ? (
                  <Box>
                    <List dense>
                      {(sectionsDialog.data.sections || []).map(s => (
                        <ListItem key={s._id}>
                          <ListItemText primary={s.name} secondary={`Teacher: ${s.teacher ? `${s.teacher.name} (${s.teacher.teacherId||s.teacher.email})` : 'N/A'} | Students: ${s.studentsCount}`} />
                        </ListItem>
                      ))}
                    </List>
                    {sectionsDialog.data.pagination?.totalPages > 1 && (
                      <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
                        <Pagination size="small" count={sectionsDialog.data.pagination.totalPages} page={sectionsDialog.data.pagination.page} onChange={(e, p) => loadCourseSections(sectionsDialog.course._id, p, sectionsDialog.data.pagination.limit)} />
                      </Box>
                    )}
                  </Box>
                ) : (
                  <Alert severity="warning">No sections found</Alert>
                )}
              </DialogContent>
              <DialogActions>
                <Button
                  variant="outlined"
                  onClick={async () => {
                    if (!sectionsDialog.course) return;
                    const token = localStorage.getItem('token');
                    const url = `/api/dean/course/${sectionsDialog.course._id}/sections/export?mode=summary`;
                    await downloadCsv(url, token);
                  }}
                >
                  Download Summary CSV
                </Button>
                <Button
                  variant="outlined"
                  onClick={async () => {
                    if (!sectionsDialog.course) return;
                    const token = localStorage.getItem('token');
                    const url = `/api/dean/course/${sectionsDialog.course._id}/sections/export?mode=students`;
                    await downloadCsv(url, token);
                  }}
                >
                  Download Students CSV
                </Button>
                <Button onClick={() => setSectionsDialog({ open: false, loading: false, course: null, data: null })}>Close</Button>
              </DialogActions>
            </Dialog>

            {/* Student Details Dialog */}
            <Dialog open={studentDialog.open} onClose={() => setStudentDialog({ open: false, loading: false, data: null })} fullWidth maxWidth="md">
              <DialogTitle>Student Details</DialogTitle>
              <DialogContent dividers>
                {studentDialog.loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <CircularProgress />
                  </Box>
                ) : studentDialog.data ? (
                  <Box>
                    <Typography variant="h6">{studentDialog.data.student?.name}</Typography>
                    <Typography variant="body2" color="textSecondary">Email: {studentDialog.data.student?.email}</Typography>
                    <Typography variant="body2" color="textSecondary">Reg No: {studentDialog.data.student?.regNo}</Typography>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Courses</Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {(studentDialog.data.courses || []).map(c => (
                        <Chip key={c._id} label={`${c.title} (${c.courseCode || ''})`} />
                      ))}
                      {(studentDialog.data.courses || []).length === 0 && (<Typography variant="body2" color="textSecondary">No courses</Typography>)}
                    </Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 2, mb: 1 }}>Sections</Typography>
                    <List dense>
                      {(studentDialog.data.sections || []).map(s => (
                        <ListItem key={s._id}>
                          <ListItemText primary={s.name} secondary={(s.courses || []).map(c => c.title).join(', ')} />
                        </ListItem>
                      ))}
                      {(studentDialog.data.sections || []).length === 0 && (<Typography variant="body2" color="textSecondary">No sections</Typography>)}
                    </List>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 2, mb: 1 }}>Course-wise Performance (Total Watch Time)</Typography>
                    <List dense>
                      {(studentDialog.data.coursePerformance || []).map(cp => (
                        <ListItem key={cp._id}>
                          <ListItemText primary={`${cp.title} (${cp.courseCode || ''})`} secondary={`Total watch time: ${cp.totalWatchTime} sec`} />
                        </ListItem>
                      ))}
                      {(studentDialog.data.coursePerformance || []).length === 0 && (<Typography variant="body2" color="textSecondary">No performance data</Typography>)}
                    </List>
                  </Box>
                ) : (
                  <Alert severity="warning">No data</Alert>
                )}
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setStudentDialog({ open: false, loading: false, data: null })}>Close</Button>
              </DialogActions>
            </Dialog>
          </CardContent>
        )}

        {/* Department Analytics Tab */}
        {currentTab === 1 && data && (
          <CardContent>
            <Grid container spacing={3}>
              {/* Department Overview Chart */}
              <Grid item xs={12} lg={8}>
                <Typography variant="h6" sx={{ mb: 2 }}>Department Overview</Typography>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={departmentChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="students" fill="#1976d2" name="Students" />
                    <Bar dataKey="teachers" fill="#2e7d32" name="Teachers" />
                    <Bar dataKey="courses" fill="#ed6c02" name="Courses" />
                  </BarChart>
                </ResponsiveContainer>
              </Grid>

              {/* Department Issues */}
              <Grid item xs={12} lg={4}>
                <Typography variant="h6" sx={{ mb: 2 }}>Department Issues</Typography>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={departmentChartData} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={80} />
                    <Tooltip />
                    <Bar dataKey="noTeacher" fill="#d32f2f" name="Courses w/o Teachers" />
                    <Bar dataKey="noStudents" fill="#ff5722" name="Courses w/o Students" />
                  </BarChart>
                </ResponsiveContainer>
              </Grid>

              {/* Detailed Department Analysis */}
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mb: 2 }}>Detailed Department Analysis</Typography>
                {data.departmentAnalytics?.map((dept, index) => (
                  <Accordion key={dept._id} sx={{ mb: 1 }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                        <Typography variant="h6">{dept.name} ({dept.code})</Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Chip label={`${dept.totalStudents} Students`} color="primary" size="small" />
                          <Chip label={`${dept.totalTeachers} Teachers`} color="secondary" size="small" />
                          <Chip label={`${dept.totalCourses} Courses`} color="default" size="small" />
                        </Box>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={4}>
                          <Paper sx={{ p: 2 }}>
                            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                              Course Details
                            </Typography>
                            <Typography variant="body2">Average Students per Course: {dept.avgStudentsPerCourse}</Typography>
                            <Typography variant="body2" color="error">
                              Courses without Teachers: {dept.coursesWithoutTeachers}
                            </Typography>
                            <Typography variant="body2" color="warning.main">
                              Courses without Students: {dept.coursesWithoutStudents}
                            </Typography>
                          </Paper>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <Paper sx={{ p: 2 }}>
                            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                              Top Courses
                            </Typography>
                            <List dense>
                              {dept.courses?.slice(0, 3).map((course) => (
                                <ListItem key={course._id} sx={{ px: 0 }}>
                                  <ListItemText 
                                    primary={course.title}
                                    secondary={`${course.studentCount} students, ${course.teacherCount} teachers`}
                                  />
                                </ListItem>
                              ))}
                            </List>
                          </Paper>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <Paper sx={{ p: 2 }}>
                            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                              Sections ({dept.totalSections})
                            </Typography>
                            <List dense>
                              {dept.sections?.slice(0, 3).map((section) => (
                                <ListItem key={section._id} sx={{ px: 0 }}>
                                  <ListItemText 
                                    primary={section.name}
                                    secondary={`${section.studentCount} students`}
                                  />
                                </ListItem>
                              ))}
                            </List>
                          </Paper>
                        </Grid>
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Grid>
            </Grid>
          </CardContent>
        )}

        {/* Course Analytics Tab */}
        {currentTab === 2 && data && (
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12} lg={8}>
                <Typography variant="h6" sx={{ mb: 2 }}>Top Courses by Enrollment</Typography>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={courseUtilizationData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={120} />
                    <YAxis />
                    <Tooltip />
                    <Area dataKey="students" fill="#1976d2" stroke="#1976d2" name="Students" />
                  </AreaChart>
                </ResponsiveContainer>
              </Grid>

              <Grid item xs={12} lg={4}>
                <Typography variant="h6" sx={{ mb: 2 }}>Course Resources</Typography>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={courseUtilizationData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" hide />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="videos" fill="#26a69a" name="Videos" />
                    <Bar dataKey="teachers" fill="#ed6c02" name="Teachers" />
                  </BarChart>
                </ResponsiveContainer>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mb: 2 }}>Course Performance Table</Typography>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Course</TableCell>
                        <TableCell>Department</TableCell>
                        <TableCell align="center">Students</TableCell>
                        <TableCell align="center">Teachers</TableCell>
                        <TableCell align="center">Videos</TableCell>
                        <TableCell align="center">Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.courseAnalytics?.slice(0, 15).map((course) => (
                        <TableRow key={course._id}>
                          <TableCell>
                            <Typography variant="body2" fontWeight="bold">
                              {course.title}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {course.courseCode}
                            </Typography>
                          </TableCell>
                          <TableCell>{course.departmentName}</TableCell>
                          <TableCell align="center">
                            <Chip 
                              label={course.studentCount} 
                              color={course.studentCount > 0 ? "primary" : "default"}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Chip 
                              label={course.teacherCount} 
                              color={course.teacherCount > 0 ? "secondary" : "error"}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="center">{course.videoCount}</TableCell>
                          <TableCell align="center">
                            <Chip 
                              label={course.teacherCount > 0 && course.studentCount > 0 ? "Active" : "Needs Attention"}
                              color={course.teacherCount > 0 && course.studentCount > 0 ? "success" : "warning"}
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            </Grid>
          </CardContent>
        )}

        {/* Student Analytics Tab */}
        {currentTab === 3 && (
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>Sections</Typography>
                  <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                    <TextField fullWidth size="small" label="Filter sections" value={sectionsFilter} onChange={(e)=>setSectionsFilter(e.target.value)} onKeyDown={(e)=>{ if (e.key==='Enter') loadSections(1, e.target.value); }} />
                    <Button variant="outlined" onClick={() => loadSections(1, sectionsFilter)}>Search</Button>
                  </Box>
                  {sectionsLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress size={22} /></Box>
                  ) : (
                    <List dense>
                      {(sections || []).map(s => (
                        <ListItem key={s._id} button selected={selectedSection?._id===s._id} onClick={() => { setSelectedSection(s); loadSectionAnalytics(s._id); }}>
                          <ListItemText primary={s.name} secondary={`${s.department?.name || '—'} • ${s.studentsCount} students`} />
                        </ListItem>
                      ))}
                      {(sections || []).length === 0 && (
                        <Typography variant="body2" color="textSecondary">No sections</Typography>
                      )}
                    </List>
                  )}
                  {sectionsTotalPages > 1 && (
                    <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
                      <Pagination size="small" count={sectionsTotalPages} page={sectionsPage} onChange={(e, p) => { setSectionsPage(p); loadSections(p, sectionsFilter); }} />
                    </Box>
                  )}
                </Paper>
              </Grid>
              <Grid item xs={12} md={8}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    {selectedSection ? `Section: ${selectedSection.name}` : 'Select a section to view analytics'}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <TextField size="small" label="Search student by Reg No" value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} />
                    <Button variant="contained" onClick={searchStudentByRegNo}>Search</Button>
                    {studentSearchResult && !studentSearchResult.error && (
                      <Button variant="outlined" onClick={() => openStudentDialog(studentSearchResult._id)}>Open</Button>
                    )}
                  </Box>
                  {studentSearchResult && (
                    <Box sx={{ mb: 2 }}>
                      {studentSearchResult.error ? (
                        <Alert severity="warning">{studentSearchResult.error}</Alert>
                      ) : (
                        <Chip label={`${studentSearchResult.name} (${studentSearchResult.regNo})`} onClick={() => openStudentDialog(studentSearchResult._id)} clickable />
                      )}
                    </Box>
                  )}
                  {sectionAnalyticsLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>
                  ) : selectedSection && sectionAnalytics ? (
                    <>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                        <Button
                          variant="outlined"
                          onClick={async () => {
                            const token = localStorage.getItem('token');
                            await downloadCsv(`/api/dean/section/${selectedSection._id}/analytics/export`, token);
                          }}
                        >
                          Download CSV
                        </Button>
                      </Box>
                      <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Student</TableCell>
                            <TableCell>Course</TableCell>
                            <TableCell>Units</TableCell>
                            <TableCell align="right">Watch Time (min)</TableCell>
                            <TableCell align="center">Avg Quiz %</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {(sectionAnalytics.students || []).flatMap(st => (
                            (st.courses || []).map(c => {
                              const totalMin = Math.round((c.totalWatchTime || 0) / 60);
                              const avgQuiz = c.averageQuiz == null ? '—' : Math.round(c.averageQuiz);
                              return (
                                <TableRow key={`${st._id}:${c.courseId}`}>
                                  <TableCell>
                                    <Typography variant="body2" fontWeight={600}>{st.name}</Typography>
                                    <Typography variant="caption" color="textSecondary">{st.regNo}</Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="body2">{c.courseTitle}</Typography>
                                    <Typography variant="caption" color="textSecondary">{c.courseCode}</Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="caption" color="textSecondary">{(c.units||[]).length}</Typography>
                                  </TableCell>
                                  <TableCell align="right">{totalMin}</TableCell>
                                  <TableCell align="center">{avgQuiz}</TableCell>
                                </TableRow>
                              );
                            })
                          ))}
                        </TableBody>
                      </Table>
                      </TableContainer>
                    </>
                  ) : (
                    <Alert severity="info">Pick a section to load students.</Alert>
                  )}
                </Paper>
              </Grid>
            </Grid>
          </CardContent>
        )}
      </Card>
    </Box>
  );
};

export default DeanAnalytics;

// Helper to download CSV with auth
async function downloadCsv(url, token) {
  try {
    const res = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'blob'
    });
    const blob = new Blob([res.data], { type: 'text/csv' });
    const link = document.createElement('a');
    const href = window.URL.createObjectURL(blob);
    link.href = href;
    // Try to infer filename from Content-Disposition
    const cd = res.headers['content-disposition'];
    let filename = 'sections.csv';
    if (cd) {
      const m = /filename="?([^";]+)"?/i.exec(cd);
      if (m && m[1]) filename = m[1];
    }
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(href);
  } catch (e) {
    console.error('Failed to download CSV', e);
    alert('Failed to download CSV');
  }
}
