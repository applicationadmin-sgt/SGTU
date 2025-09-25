import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Divider,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  IconButton
} from '@mui/material';
import {
  School as SchoolIcon,
  ExpandMore as ExpandMoreIcon,
  People as PeopleIcon,
  Book as BookIcon,
  Assignment as AssignmentIcon,
  Analytics as AnalyticsIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { getMyTeachingAssignments } from '../../api/hierarchyApi';
import { parseJwt } from '../../utils/jwt';

const MyTeachingSections = () => {
  const [teachingSections, setTeachingSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const currentUser = parseJwt(token);

  useEffect(() => {
    fetchTeachingSections();
  }, []);

  const fetchTeachingSections = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await getMyTeachingAssignments();
      
      if (response.success) {
        setTeachingSections(response.assignments || []);
      } else {
        setError('Failed to fetch teaching assignments');
      }
    } catch (error) {
      console.error('Error fetching teaching sections:', error);
      setError(error.response?.data?.message || error.message || 'Failed to fetch teaching assignments');
    } finally {
      setLoading(false);
    }
  };

  const handleViewSection = (sectionId) => {
    // Navigate to section details or analytics
    navigate(`/section-details/${sectionId}`);
  };

  const handleViewStudents = (sectionId) => {
    // Navigate to students view for this section
    navigate(`/section-students/${sectionId}`);
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'hod':
        return '#1976d2';
      case 'dean':
        return '#7b1fa2';
      case 'teacher':
        return '#388e3c';
      default:
        return '#757575';
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'hod':
        return 'HOD';
      case 'dean':
        return 'DEAN';
      case 'teacher':
        return 'TEACHER';
      default:
        return role?.toUpperCase();
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button onClick={fetchTeachingSections} variant="contained">
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <SchoolIcon color="primary" />
          My Teaching Sections
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your assigned sections and courses as{' '}
          <Chip 
            label={getRoleBadge(currentUser.role)} 
            size="small" 
            sx={{ 
              backgroundColor: getRoleColor(currentUser.role),
              color: 'white',
              fontWeight: 'bold'
            }}
          />
        </Typography>
      </Box>

      {/* Teaching Statistics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ textAlign: 'center', p: 2 }}>
            <SchoolIcon sx={{ fontSize: 40, color: '#1976d2', mb: 1 }} />
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
              {teachingSections.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Assigned Sections
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ textAlign: 'center', p: 2 }}>
            <BookIcon sx={{ fontSize: 40, color: '#388e3c', mb: 1 }} />
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#388e3c' }}>
              {new Set(teachingSections.map(section => section.course?._id)).size}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Unique Courses
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ textAlign: 'center', p: 2 }}>
            <PeopleIcon sx={{ fontSize: 40, color: '#f57c00', mb: 1 }} />
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#f57c00' }}>
              {teachingSections.reduce((total, section) => total + (section.studentCount || 0), 0)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Students
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ textAlign: 'center', p: 2 }}>
            <AssignmentIcon sx={{ fontSize: 40, color: '#7b1fa2', mb: 1 }} />
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#7b1fa2' }}>
              {new Set(teachingSections.map(section => section.section?.department?._id)).size}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Departments
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Teaching Sections List */}
      {teachingSections.length === 0 ? (
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <SchoolIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
            No Teaching Assignments Found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            You are not currently assigned to teach any sections.
          </Typography>
        </Card>
      ) : (
        <Box>
          <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
            Your Teaching Assignments
          </Typography>
          
          {teachingSections.map((assignment, index) => (
            <Accordion key={index} sx={{ mb: 2, boxShadow: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', pr: 2 }}>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {assignment.section?.name || 'Section Name N/A'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Course: {assignment.course?.title || 'Course Name N/A'} | 
                      School: {assignment.section?.school?.name || 'School N/A'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip 
                      label={`${assignment.studentCount || 0} Students`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                    <Chip 
                      label={getRoleBadge(currentUser.role)}
                      size="small"
                      sx={{ 
                        backgroundColor: getRoleColor(currentUser.role),
                        color: 'white'
                      }}
                    />
                  </Box>
                </Box>
              </AccordionSummary>
              
              <AccordionDetails>
                <Grid container spacing={3}>
                  {/* Section Details */}
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <SchoolIcon color="primary" />
                        Section Information
                      </Typography>
                      <Divider sx={{ mb: 2 }} />
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Typography variant="body2">
                          <strong>Section:</strong> {assignment.section?.name || 'N/A'}
                        </Typography>
                        <Typography variant="body2">
                          <strong>School:</strong> {assignment.section?.school?.name || 'N/A'}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Department:</strong> {assignment.section?.department?.name || 'General'}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Students:</strong> {assignment.studentCount || 0}
                        </Typography>
                      </Box>
                    </Card>
                  </Grid>

                  {/* Course Details */}
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <BookIcon color="success" />
                        Course Information
                      </Typography>
                      <Divider sx={{ mb: 2 }} />
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Typography variant="body2">
                          <strong>Course:</strong> {assignment.course?.title || 'N/A'}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Code:</strong> {assignment.course?.courseCode || 'N/A'}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Department:</strong> {assignment.course?.department?.name || 'N/A'}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Credits:</strong> {assignment.course?.credits || 'N/A'}
                        </Typography>
                      </Box>
                    </Card>
                  </Grid>

                  {/* Action Buttons */}
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      <Button
                        variant="contained"
                        startIcon={<VisibilityIcon />}
                        onClick={() => handleViewSection(assignment.section?._id)}
                        disabled={!assignment.section?._id}
                      >
                        View Section Details
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<PeopleIcon />}
                        onClick={() => handleViewStudents(assignment.section?._id)}
                        disabled={!assignment.section?._id}
                      >
                        View Students
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<AnalyticsIcon />}
                        color="secondary"
                        disabled={!assignment.section?._id}
                      >
                        View Analytics
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default MyTeachingSections;