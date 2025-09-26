import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Grid, 
  Card, 
  CardContent, 
  Typography, 
  Alert, 
  CircularProgress, 
  TextField, 
  MenuItem, 
  Button, 
  Paper, 
  Table, 
  TableHead, 
  TableBody, 
  TableRow, 
  TableCell, 
  Chip, 
  Divider,
  List,
  ListItem,
  ListItemText,
  Avatar
} from '@mui/material';
import { 
  TrendingUp as TrendingUpIcon,
  Group as GroupIcon,
  School as SchoolIcon,
  Book as BookIcon,
  Assignment as AssignmentIcon,
  Chat as ChatIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const HODSections = () => {
  const navigate = useNavigate();
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState('');
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [analytics, setAnalytics] = useState(null);

  const token = localStorage.getItem('token');

  // Load sections managed by HOD
  useEffect(() => {
    loadSections();
    
    // Set up auto-refresh every 30 seconds
    const refreshInterval = setInterval(() => {
      loadSections();
      if (selectedSection) {
        loadAnalytics();
      }
    }, 30000);

    return () => clearInterval(refreshInterval);
  }, [selectedSection]);

  const loadSections = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/hod/sections', { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      setSections(res.data?.sections || []);
      setError('');
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load sections');
    } finally {
      setLoading(false);
    }
  };

  // Load courses for HOD's department
  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      const res = await axios.get('/api/hod/courses', { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      setCourses(res.data?.courses || []);
    } catch (e) {
      console.error('Failed to load courses:', e);
    }
  };

  // Load analytics for selected section and course
  const loadAnalytics = async () => {
    if (!selectedSection) {
      setError('Please select a section');
      return;
    }

    try {
      setLoading(true);
      setError('');

      let url = `/api/hod/sections/${selectedSection}/analytics`;
      if (selectedCourse) {
        url += `?courseId=${selectedCourse}`;
      }

      const res = await axios.get(url, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      // Extract statistics from response and merge with other data for easier access
      const responseData = res.data;
      const analytics = {
        ...responseData.statistics,
        section: responseData.section,
        courseBreakdown: responseData.courseBreakdown || [],
        studentPerformance: responseData.studentPerformance || [],
        lastUpdated: responseData.lastUpdated
      };
      setAnalytics(analytics);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon, color, description }) => (
    <Card sx={{ 
      height: '100%', 
      background: `linear-gradient(135deg, ${color}15 0%, ${color}25 100%)`,
      border: `1px solid ${color}30`
    }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box sx={{ 
            p: 1.5, 
            borderRadius: 2, 
            bgcolor: `${color}20`,
            color: color,
            mr: 2
          }}>
            {icon}
          </Box>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: color }}>
              {value}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {title}
            </Typography>
          </Box>
        </Box>
        {description && (
          <Typography variant="body2" color="textSecondary">
            {description}
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 3 }}>
        Section Analytics
      </Typography>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Select Section and Course for Analytics
          </Typography>
          
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                select
                fullWidth
                label="Select Section"
                value={selectedSection}
                onChange={(e) => {
                  setSelectedSection(e.target.value);
                  setAnalytics(null);
                }}
                size="small"
              >
                <MenuItem value="">
                  <em>All Sections</em>
                </MenuItem>
                {sections.map((section) => (
                  <MenuItem key={section._id} value={section._id}>
                    {section.name} ({section.code})
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                select
                fullWidth
                label="Filter by Course (Optional)"
                value={selectedCourse}
                onChange={(e) => {
                  setSelectedCourse(e.target.value);
                  setAnalytics(null);
                }}
                size="small"
              >
                <MenuItem value="">
                  <em>All Courses</em>
                </MenuItem>
                {courses.map((course) => (
                  <MenuItem key={course._id} value={course._id}>
                    {course.title} ({course.courseCode})
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <Button
                variant="contained"
                onClick={loadAnalytics}
                disabled={!selectedSection || loading}
                fullWidth
              >
                {loading ? <CircularProgress size={24} /> : 'Load Analytics'}
              </Button>
            </Grid>
            
            <Grid item xs={12} md={1}>
              <Button
                variant="outlined"
                onClick={() => {
                  loadSections();
                  loadCourses();
                  if (selectedSection) loadAnalytics();
                }}
                disabled={loading}
                fullWidth
              >
                🔄
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Sections Overview */}
      {sections.length > 0 && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Department Sections Overview
            </Typography>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Section Name</TableCell>
                  <TableCell>Section Code</TableCell>
                  <TableCell>Students</TableCell>
                  <TableCell>Courses & Group Chat</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sections.map((section) => (
                  <TableRow key={section._id}>
                    <TableCell>{section.name}</TableCell>
                    <TableCell>
                      <Chip label={section.code} size="small" />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        icon={<GroupIcon />} 
                        label={section.students?.length || section.studentCount || 0} 
                        variant="outlined" 
                        size="small" 
                      />
                    </TableCell>
                    <TableCell>
                      {section.courses && section.courses.length > 0 ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <Chip 
                            icon={<BookIcon />} 
                            label={`${section.courses.length} course${section.courses.length !== 1 ? 's' : ''}`} 
                            variant="outlined" 
                            size="small" 
                          />
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {section.courses.map((course) => (
                              <Button
                                key={course._id}
                                variant="contained"
                                size="small"
                                startIcon={<ChatIcon />}
                                onClick={() => navigate(`/group-chat/${course._id}/${section._id}`)}
                                sx={{ 
                                  bgcolor: '#395a7f',
                                  '&:hover': { bgcolor: '#6e9fc1' },
                                  minWidth: 'auto',
                                  fontSize: '0.75rem'
                                }}
                              >
                                {course.courseCode}
                              </Button>
                            ))}
                          </Box>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No courses
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Analytics Results */}
      {analytics && (
        <>
          {/* Overview Stats */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Total Students"
                value={analytics.totalStudents || 0}
                icon={<GroupIcon />}
                color="#1976d2"
                description="Students in section"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Active Courses"
                value={analytics.totalCourses || 0}
                icon={<BookIcon />}
                color="#ed6c02"
                description="Courses running"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Assignments"
                value={analytics.totalAssignments || 0}
                icon={<AssignmentIcon />}
                color="#2e7d32"
                description="Total assignments"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Average Progress"
                value={`${analytics.averageProgress || 0}%`}
                icon={<TrendingUpIcon />}
                color="#9c27b0"
                description="Student progress"
              />
            </Grid>
          </Grid>

          {/* Section Details */}
          <Grid container spacing={3}>
            {/* Course-wise Breakdown */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                    <BookIcon sx={{ mr: 1 }} />
                    Course-wise Breakdown
                  </Typography>
                  
                  {analytics.courseBreakdown && analytics.courseBreakdown.length > 0 ? (
                    <List>
                      {analytics.courseBreakdown.map((course, index) => (
                        <ListItem key={index} divider>
                          <ListItemText
                            primary={course.title}
                            secondary={
                              <Box>
                                <Typography variant="body2" color="textSecondary">
                                  Code: {course.courseCode}
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                  Students: {course.enrolledStudents || 0}
                                </Typography>
                                {course.teacher && (
                                  <Typography variant="body2" color="textSecondary">
                                    Teacher: {course.teacher.name}
                                  </Typography>
                                )}
                              </Box>
                            }
                          />
                          <Chip 
                            label={`${course.progress || 0}%`} 
                            color="primary" 
                            size="small" 
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="textSecondary">
                      No course data available
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Student Details */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                    <GroupIcon sx={{ mr: 1 }} />
                    Student Performance
                  </Typography>
                  
                  {analytics.students && analytics.students.length > 0 ? (
                    <List>
                      {analytics.students.slice(0, 10).map((student, index) => (
                        <ListItem key={index} divider>
                          <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                            {student.name ? student.name.charAt(0).toUpperCase() : 'S'}
                          </Avatar>
                          <ListItemText
                            primary={student.name}
                            secondary={
                              <Box>
                                <Typography variant="body2" color="textSecondary">
                                  ID: {student.studentId || 'N/A'}
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                  Progress: {student.progress || 0}%
                                </Typography>
                              </Box>
                            }
                          />
                        </ListItem>
                      ))}
                      {analytics.students.length > 10 && (
                        <ListItem>
                          <ListItemText 
                            primary={`... and ${analytics.students.length - 10} more students`}
                            sx={{ textAlign: 'center', fontStyle: 'italic' }}
                          />
                        </ListItem>
                      )}
                    </List>
                  ) : (
                    <Typography variant="body2" color="textSecondary">
                      No student data available
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Detailed Table */}
          {analytics.detailedData && (
            <Card sx={{ mt: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Detailed Section Report
                </Typography>
                <Box sx={{ overflowX: 'auto' }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Student Name</TableCell>
                        <TableCell>Student ID</TableCell>
                        <TableCell>Course</TableCell>
                        <TableCell>Progress</TableCell>
                        <TableCell>Last Activity</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {analytics.detailedData.map((row, index) => (
                        <TableRow key={index}>
                          <TableCell>{row.studentName}</TableCell>
                          <TableCell>{row.studentId}</TableCell>
                          <TableCell>{row.courseName}</TableCell>
                          <TableCell>
                            <Chip 
                              label={`${row.progress || 0}%`}
                              color={
                                (row.progress || 0) >= 80 ? 'success' :
                                (row.progress || 0) >= 50 ? 'warning' : 'error'
                              }
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{row.lastActivity || 'N/A'}</TableCell>
                          <TableCell>
                            <Chip 
                              label={row.status || 'Active'}
                              color={row.status === 'Active' ? 'success' : 'default'}
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* No Selection State */}
      {!analytics && !loading && (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <SchoolIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="textSecondary" gutterBottom>
              Select a section to view analytics
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Choose a section from the dropdown above to see detailed student and course analytics
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default HODSections;