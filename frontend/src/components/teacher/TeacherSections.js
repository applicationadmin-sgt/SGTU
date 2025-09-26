import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { 
  People as PeopleIcon, 
  School as SchoolIcon,
  MenuBook as MenuBookIcon,
  Person as PersonIcon,
  Chat as ChatIcon
} from '@mui/icons-material';
import * as sectionApi from '../../api/sectionApi';
import { useUserRole } from '../../contexts/UserRoleContext';
import { parseJwt } from '../../utils/jwt';
import { useNavigate } from 'react-router-dom';

const TeacherSections = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const { user: contextUser } = useUserRole();
  const currentUser = parseJwt(token);
  const user = contextUser || currentUser;
  
  console.log('[TeacherSections] Component mounted - user:', user, 'token:', !!token);
  
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null);
  const [studentListOpen, setStudentListOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    console.log('[TeacherSections] useEffect triggered - user:', user, 'token:', !!token);
    // If user not ready yet, stop loading to avoid infinite spinner
    if (!user || (!user._id && !user.id)) {
      console.log('[TeacherSections] No user or user._id/id, stopping loading');
      setLoading(false);
      return;
    }
    // If token missing, surface error and stop loading
    if (!token) {
      console.log('[TeacherSections] No token, setting error');
      setError('You are not authenticated. Please sign in again.');
      setLoading(false);
      return;
    }
    console.log('[TeacherSections] User and token ready, calling fetchTeacherSections');
    fetchTeacherSections();
  }, [user, token]);

  const fetchTeacherSections = async () => {
    try {
      setLoading(true);
      // Guard: require user
      const userId = user._id || user.id;
      if (!user || !userId) {
        throw new Error('Missing user session.');
      }
      console.log('[TeacherSections] Fetching sections for teacher:', userId);
      console.log('[TeacherSections] Token present:', !!token);
      const data = await sectionApi.getTeacherStudentConnections(userId);
      console.log('[TeacherSections] Received sections data:', data);
      setSections(data);
      setError(''); // Clear any previous errors
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to fetch your sections';
      setError(errorMsg);
      console.error('[TeacherSections] Error fetching teacher sections:', err);
      console.error('[TeacherSections] Error response:', err.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const handleViewStudents = (section) => {
    setSelectedSection(section);
    setStudentListOpen(true);
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
          <Typography>Loading your sections...</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          My Sections
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Manage your assigned sections and view students in each section.
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {sections.length === 0 ? (
          <Alert severity="info">
            You are not assigned to any sections yet. Contact your administrator for section assignments.
          </Alert>
        ) : (
          <Grid container spacing={3}>
            {sections.map((section) => (
              <Grid item xs={12} md={6} lg={4} key={section._id}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      <SchoolIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                      {section.name}
                    </Typography>
                    
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        <MenuBookIcon sx={{ mr: 1, verticalAlign: 'middle', fontSize: 16 }} />
                        Courses: {section.courses?.length > 0 
                          ? section.courses.map(course => course.title).join(', ')
                          : 'No courses assigned'
                        }
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        School: {section.school?.name || 'N/A'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Department: {section.department?.name || 'N/A'}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <PeopleIcon sx={{ mr: 1, fontSize: 16 }} />
                      <Typography variant="body2">
                        {section.students?.length || 0} students enrolled
                      </Typography>
                    </Box>

                    {section.students?.length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Sample students:
                        </Typography>
                        {section.students.slice(0, 3).map((student) => (
                          <Chip
                            key={student._id}
                            label={student.name}
                            size="small"
                            sx={{ mr: 0.5, mb: 0.5 }}
                          />
                        ))}
                        {section.students.length > 3 && (
                          <Chip
                            label={`+${section.students.length - 3} more`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    )}

                    <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column' }}>
                      <Button
                        variant="outlined"
                        fullWidth
                        onClick={() => handleViewStudents(section)}
                        disabled={!section.students?.length}
                      >
                        View All Students
                      </Button>
                      
                      {/* Group Chat buttons for each course in the section */}
                      {section.courses && section.courses.length > 0 && (
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
                                flex: 1,
                                minWidth: 'auto'
                              }}
                            >
                              {course.courseCode} Chat
                            </Button>
                          ))}
                        </Box>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Student List Dialog */}
        <Dialog 
          open={studentListOpen} 
          onClose={() => setStudentListOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Students in {selectedSection?.name}
          </DialogTitle>
          <DialogContent>
            {selectedSection?.students?.length > 0 ? (
              <List>
                {selectedSection.students.map((student, index) => (
                  <ListItem key={student._id} divider={index < selectedSection.students.length - 1}>
                    <ListItemAvatar>
                      <Avatar>
                        <PersonIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={student.name}
                      secondary={
                        <>
                          <Typography component="span" variant="body2" color="text.primary">
                            Email: {student.email}
                          </Typography>
                          <br />
                          {student.studentId && (
                            <Typography component="span" variant="body2" color="text.secondary">
                              Student ID: {student.studentId}
                            </Typography>
                          )}
                        </>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography>No students assigned to this section.</Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setStudentListOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default TeacherSections;
