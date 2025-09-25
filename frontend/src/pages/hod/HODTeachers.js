import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  Avatar,
  Button,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete,
  TextField,
  Snackbar,
  Alert as MuiAlert
} from '@mui/material';
import axios from 'axios';
import { parseJwt } from '../../utils/jwt';

const HODTeachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [department, setDepartment] = useState(null);
  const [deptCourses, setDeptCourses] = useState([]);
  const [deptSections, setDeptSections] = useState([]);
  const [assignOpen, setAssignOpen] = useState(false);
  const [sectionOpen, setSectionOpen] = useState(false);
  const [actingTeacher, setActingTeacher] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [busy, setBusy] = useState(false);
  const [snack, setSnack] = useState({ open: false, severity: 'success', message: '' });
  
  const token = localStorage.getItem('token');
  const currentUser = parseJwt(token);

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      // Get HOD department from HOD dashboard (accessible to HOD)
      let departmentId = null;
      try {
        const dashRes = await axios.get(`/api/hod/dashboard`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (dashRes?.data?.department) {
          setDepartment(dashRes.data.department);
          departmentId = dashRes.data.department._id || dashRes.data.department.id;
        }
      } catch (e) {
        // If dashboard fails, continue; teachers list may still load
        console.warn('HOD dashboard fetch failed (continuing):', e.response?.data?.message || e.message);
      }
      // Preload department courses and sections if department known (non-fatal)
      if (departmentId) {
        try {
          const [coursesRes, sectionsRes] = await Promise.all([
            axios.get(`/api/courses/department/${departmentId}`, { headers: { Authorization: `Bearer ${token}` } }),
            axios.get(`/api/hod/sections`, { headers: { Authorization: `Bearer ${token}` } })
          ]);
          setDeptCourses(coursesRes.data || []);
          setDeptSections(sectionsRes.data || []);
        } catch (e) {
          console.warn('Preloading dept courses/sections failed (non-fatal):', e.response?.data?.message || e.message);
        }
      }
      // Use HOD endpoint for teachers (includes populated sections/courses)
      const response = await axios.get(`/api/hod/teachers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeachers(response.data);
    } catch (error) {
      console.error('Error fetching teachers:', error);
      const msg = error.response?.data?.message || error.message || 'Failed to fetch teachers';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const openAssignDialog = (teacher) => {
    setActingTeacher(teacher);
    setSelectedCourse(null);
    setAssignOpen(true);
  };

  const confirmAssignCourse = async () => {
    if (!actingTeacher || !selectedCourse) return;
    setBusy(true);
    try {
      await axios.post(`/api/hod/teachers/${actingTeacher._id}/courses/${selectedCourse._id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSnack({ open: true, severity: 'success', message: 'Course assigned to teacher' });
      setAssignOpen(false);
      await fetchTeachers();
    } catch (e) {
      setSnack({ open: true, severity: 'error', message: e.response?.data?.message || 'Failed to assign course' });
    } finally {
      setBusy(false);
    }
  };

  const removeCourse = async (teacherId, courseId) => {
    try {
      if (!window.confirm('Remove this course from the teacher?')) return;
      await axios.delete(`/api/hod/teachers/${teacherId}/courses/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSnack({ open: true, severity: 'success', message: 'Course removed from teacher' });
      await fetchTeachers();
    } catch (e) {
      setSnack({ open: true, severity: 'error', message: e.response?.data?.message || 'Failed to remove course' });
    }
  };

  const openSectionDialog = (teacher) => {
    setActingTeacher(teacher);
    setSelectedSection(null);
    setSectionOpen(true);
  };

  const confirmChangeSection = async () => {
    if (!actingTeacher || !selectedSection) return;
    setBusy(true);
    try {
      await axios.patch(`/api/hod/teachers/${actingTeacher._id}/section`, { toSectionId: selectedSection._id }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSnack({ open: true, severity: 'success', message: 'Teacher section updated' });
      setSectionOpen(false);
      await fetchTeachers();
    } catch (e) {
      setSnack({ open: true, severity: 'error', message: e.response?.data?.message || 'Failed to change section' });
    } finally {
      setBusy(false);
    }
  };

  const getInitials = (firstName, lastName, fallbackName) => {
    if (firstName || lastName) return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
    const name = fallbackName || '';
    const parts = String(name).trim().split(' ');
    return `${parts[0]?.[0] || ''}${parts[1]?.[0] || ''}`.toUpperCase();
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

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 1, fontWeight: 'bold' }}>
        Department Teachers
      </Typography>
      {department && (
        <Typography variant="h6" color="textSecondary" sx={{ mb: 3 }}>
          {department.name} Department
        </Typography>
      )}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Faculty Members ({teachers.length})
          </Typography>
          {teachers.length === 0 ? (
            <Typography color="textSecondary">No teachers found in your department.</Typography>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Teacher</strong></TableCell>
                    <TableCell><strong>UID</strong></TableCell>
                    <TableCell><strong>Contact</strong></TableCell>
                    <TableCell><strong>Assigned Sections</strong></TableCell>
                    <TableCell><strong>Courses Assigned</strong></TableCell>
                    <TableCell><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {teachers.map((teacher) => (
                    <TableRow key={teacher._id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ bgcolor: 'primary.main' }}>
                            {getInitials(teacher.firstName, teacher.lastName, teacher.name)}
                          </Avatar>
                          <Box>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                              {teacher.name || `${teacher.firstName || ''} ${teacher.lastName || ''}`}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              {teacher.email}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip label={teacher.teacherId || 'N/A'} size="small" color="primary" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{teacher.phone || '—'}</Typography>
                        <Typography variant="caption" color="textSecondary">{teacher.email}</Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          {(teacher.assignedSections || []).length === 0 ? (
                            <Typography variant="body2" color="textSecondary">None</Typography>
                          ) : (
                            (teacher.assignedSections || []).map(s => (
                              <Chip key={s._id || s} label={s.name || s} size="small" />
                            ))
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          {(teacher.coursesAssigned || []).length === 0 ? (
                            <Typography variant="body2" color="textSecondary">None</Typography>
                          ) : (
                            (teacher.coursesAssigned || []).map(c => (
                              <Chip key={c._id || c} label={`${c.courseCode || ''} ${c.title || ''}`.trim()} size="small" onDelete={() => removeCourse(teacher._id, c._id || c)} />
                            ))
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          <Button size="small" variant="outlined" onClick={() => openAssignDialog(teacher)}>Assign Course</Button>
                          <Button size="small" variant="outlined" onClick={() => openSectionDialog(teacher)}>Change Section</Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

    {/* Assign Course Dialog */}
    <Dialog open={assignOpen} onClose={() => !busy && setAssignOpen(false)} fullWidth maxWidth="sm">
      <DialogTitle>Assign Course</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          {actingTeacher ? `Teacher: ${actingTeacher.name || actingTeacher.email}` : ''}
        </Typography>
        <Autocomplete
          options={deptCourses}
          getOptionLabel={(opt) => `${opt.courseCode || ''} ${opt.title || ''}`.trim()}
          onChange={(_, val) => setSelectedCourse(val)}
          renderInput={(params) => <TextField {...params} label="Select Course" placeholder="Search courses" />}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setAssignOpen(false)} disabled={busy}>Cancel</Button>
        <Button onClick={confirmAssignCourse} disabled={!selectedCourse || busy} variant="contained">Assign</Button>
      </DialogActions>
    </Dialog>

    {/* Change Section Dialog */}
    <Dialog open={sectionOpen} onClose={() => !busy && setSectionOpen(false)} fullWidth maxWidth="sm">
      <DialogTitle>Change Section</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          {actingTeacher ? `Teacher: ${actingTeacher.name || actingTeacher.email}` : ''}
        </Typography>
        <Autocomplete
          options={deptSections}
          getOptionLabel={(opt) => opt.name || ''}
          onChange={(_, val) => setSelectedSection(val)}
          renderInput={(params) => <TextField {...params} label="Select Section" placeholder="Search sections" />}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setSectionOpen(false)} disabled={busy}>Cancel</Button>
        <Button onClick={confirmChangeSection} disabled={!selectedSection || busy} variant="contained">Update</Button>
      </DialogActions>
    </Dialog>

    <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack(s => ({ ...s, open: false }))}>
      <MuiAlert onClose={() => setSnack(s => ({ ...s, open: false }))} severity={snack.severity} elevation={6} variant="filled">
        {snack.message}
      </MuiAlert>
    </Snackbar>
    </Box>
  );
};

export default HODTeachers;
