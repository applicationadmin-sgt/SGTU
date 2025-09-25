import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  ListItemText,
  Chip,
  Grid,
  Card,
  CardHeader,
  CardContent,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Badge,
  List,
  ListItem,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Public as GlobalIcon,
  PushPin as PinIcon,
  School as SchoolIcon,
  Business as DepartmentIcon,
  Class as SectionIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { formatDistanceToNow } from 'date-fns';

const HierarchicalAnnouncementBoard = ({ user }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [pendingAnnouncements, setPendingAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createDialog, setCreateDialog] = useState(false);
  const [moderationDialog, setModerationDialog] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [targetingOptions, setTargetingOptions] = useState({});
  const [selectedCourse, setSelectedCourse] = useState('all'); // For HOD course filtering
  
  // Form state for creating announcements
  const [form, setForm] = useState({
    title: '',
    message: '',
    priority: 'normal',
    targetAudience: {
      allUsers: false,
      isGlobal: false,
      targetRoles: [],
      targetSchools: [],
      targetDepartments: [],
      targetSections: [],
      targetCourses: [],
      specificUsers: []
    },
    scheduledFor: '',
    expiresAt: ''
  });

  // Load announcements and targeting options
  useEffect(() => {
    loadAnnouncements();
    loadTargetingOptions();
    if (user.role === 'hod') {
      loadPendingAnnouncements();
    }
  }, []);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/announcements', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAnnouncements(data.announcements || []);
      }
    } catch (error) {
      console.error('Error loading announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTargetingOptions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/announcements/targeting-options', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTargetingOptions(data);
      }
    } catch (error) {
      console.error('Error loading targeting options:', error);
    }
  };

  const loadPendingAnnouncements = async () => {
    try {
      const token = localStorage.getItem('token');
      // For HOD/Admin, load pending approvals from dedicated endpoint
      const response = await fetch('/api/announcements/pending-approvals', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPendingAnnouncements(data.announcements || []);
      }
    } catch (error) {
      console.error('Error loading pending announcements:', error);
    }
  };

  const handleTargetingChange = (field, value) => {
    setForm(prev => ({
      ...prev,
      targetAudience: {
        ...prev.targetAudience,
        [field]: value,
        // Reset other targeting if allUsers or isGlobal is selected
        ...(field === 'allUsers' && value ? {
          isGlobal: false,
          targetRoles: [],
          targetSchools: [],
          targetDepartments: [],
          targetSections: [],
          targetCourses: [],
          specificUsers: []
        } : {}),
        ...(field === 'isGlobal' && value ? {
          allUsers: false,
          targetRoles: [],
          targetSchools: [],
          targetDepartments: [],
          targetSections: [],
          targetCourses: [],
          specificUsers: []
        } : {})
      }
    }));
  };

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/announcements', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(form)
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message || 'Announcement created successfully');
        setCreateDialog(false);
        setForm({
          title: '',
          message: '',
          priority: 'normal',
          targetAudience: {
            allUsers: false,
            isGlobal: false,
            targetRoles: [],
            targetSchools: [],
            targetDepartments: [],
            targetSections: [],
            targetCourses: [],
            specificUsers: []
          },
          scheduledFor: '',
          expiresAt: ''
        });
        loadAnnouncements();
        if (user.role === 'hod') {
          loadPendingAnnouncements();
        }
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to create announcement');
      }
    } catch (error) {
      console.error('Error creating announcement:', error);
      alert('Error creating announcement');
    }
  };

  const handleModeration = async (announcementId, action, note) => {
    try {
      const token = localStorage.getItem('token');
      // Use HOD approval endpoint which supports approve/reject via action
      const response = await fetch(`/api/announcements/${announcementId}/approve`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action, note })
      });

      if (response.ok) {
        setModerationDialog(false);
        loadAnnouncements();
        loadPendingAnnouncements();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to moderate announcement');
      }
    } catch (error) {
      console.error('Error moderating announcement:', error);
      alert('Error moderating announcement');
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'normal': return 'primary';
      case 'low': return 'default';
      default: return 'primary';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'success';
      case 'pending': return 'warning';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Announcement Management
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialog(true)}
          >
            Create Announcement
          </Button>
        </Box>

        {/* Tabs for different views */}
        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={(e, newValue) => setActiveTab(newValue)}
            indicatorColor="primary"
            textColor="primary"
          >
            <Tab label="All Announcements" />
            {user.role === 'hod' && (
              <Tab 
                label={
                  <Badge badgeContent={pendingAnnouncements.length} color="error">
                    Pending Approvals
                  </Badge>
                } 
              />
            )}
          </Tabs>
        </Paper>

        {/* Announcements List */}
        {activeTab === 0 && (
          <Grid container spacing={3}>
            {loading ? (
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <CircularProgress />
                </Box>
              </Grid>
            ) : announcements.length === 0 ? (
              <Grid item xs={12}>
                <Alert severity="info">No announcements found.</Alert>
              </Grid>
            ) : (
              announcements.map((announcement) => (
                <Grid item xs={12} key={announcement._id}>
                  <Card>
                    <CardHeader
                      title={announcement.title}
                      subheader={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                          <PersonIcon fontSize="small" />
                          <Typography variant="body2">
                            {announcement.sender?.name} ({announcement.role?.toUpperCase()})
                          </Typography>
                          <ScheduleIcon fontSize="small" sx={{ ml: 2 }} />
                          <Typography variant="body2">
                            {formatDistanceToNow(new Date(announcement.createdAt), { addSuffix: true })}
                          </Typography>
                          {announcement.targetAudience?.isGlobal && (
                            <>
                              <GlobalIcon fontSize="small" sx={{ ml: 2, color: 'primary.main' }} />
                              <Typography variant="body2" color="primary">
                                Global Announcement
                              </Typography>
                            </>
                          )}
                        </Box>
                      }
                      action={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip 
                            label={announcement.priority?.toUpperCase()} 
                            color={getPriorityColor(announcement.priority)}
                            size="small"
                          />
                          <Chip 
                            label={announcement.approvalStatus?.toUpperCase()} 
                            color={getStatusColor(announcement.approvalStatus)}
                            size="small"
                          />
                          {announcement.isPinned && <PinIcon color="primary" />}
                        </Box>
                      }
                    />
                    <CardContent>
                      <Typography variant="body1" paragraph>
                        {announcement.message}
                      </Typography>
                      
                      {/* Show targeting information */}
                      {announcement.targetAudience && (
                        <Box sx={{ mt: 2, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Target Audience:
                          </Typography>
                          {announcement.targetAudience.allUsers && (
                            <Chip label="All Users" color="primary" size="small" sx={{ mr: 1, mb: 1 }} />
                          )}
                          {announcement.targetAudience.isGlobal && (
                            <Chip label="Global (All Schools)" color="secondary" size="small" sx={{ mr: 1, mb: 1 }} />
                          )}
                          {announcement.targetAudience.targetRoles?.map(role => (
                            <Chip key={role} label={role.toUpperCase()} size="small" sx={{ mr: 1, mb: 1 }} />
                          ))}
                          {announcement.targetAudience.targetSchools?.map(school => (
                            <Chip key={school._id} label={school.name} startIcon={<SchoolIcon />} size="small" sx={{ mr: 1, mb: 1 }} />
                          ))}
                          {announcement.targetAudience.targetDepartments?.map(dept => (
                            <Chip key={dept._id} label={dept.name} startIcon={<DepartmentIcon />} size="small" sx={{ mr: 1, mb: 1 }} />
                          ))}
                          {announcement.targetAudience.targetSections?.map(section => (
                            <Chip key={section._id} label={section.name} startIcon={<SectionIcon />} size="small" sx={{ mr: 1, mb: 1 }} />
                          ))}
                        </Box>
                      )}

                      {/* Actions for admins/hods */}
                      {(user.role === 'admin' || user.role === 'hod') && announcement.approvalStatus === 'pending' && (
                        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            startIcon={<ApproveIcon />}
                            onClick={() => {
                              setSelectedAnnouncement(announcement);
                              setModerationDialog(true);
                            }}
                          >
                            Review
                          </Button>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))
            )}
          </Grid>
        )}

        {/* Pending Approvals Tab */}
        {activeTab === 1 && user.role === 'hod' && (
          <Grid container spacing={3}>
            {pendingAnnouncements.length === 0 ? (
              <Grid item xs={12}>
                <Alert severity="info">No announcements pending approval.</Alert>
              </Grid>
            ) : (
              pendingAnnouncements.map((announcement) => (
                <Grid item xs={12} key={announcement._id}>
                  <Card sx={{ border: '2px solid', borderColor: 'warning.main' }}>
                    <CardHeader
                      title={`${announcement.title} (Pending Approval)`}
                      subheader={`By: ${announcement.sender?.name} (${announcement.role?.toUpperCase()})`}
                      action={
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            startIcon={<ApproveIcon />}
                            onClick={() => handleModeration(announcement._id, 'approve', '')}
                          >
                            Approve
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            color="error"
                            startIcon={<RejectIcon />}
                            onClick={() => handleModeration(announcement._id, 'reject', '')}
                          >
                            Reject
                          </Button>
                        </Box>
                      }
                    />
                    <CardContent>
                      <Typography variant="body1">
                        {announcement.message}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))
            )}
          </Grid>
        )}

        {/* Create Announcement Dialog */}
        <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>Create New Announcement</DialogTitle>
          <DialogContent>
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  label="Title"
                  fullWidth
                  value={form.title}
                  onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="Message"
                  fullWidth
                  multiline
                  rows={4}
                  value={form.message}
                  onChange={(e) => setForm(prev => ({ ...prev, message: e.target.value }))}
                />
              </Grid>

              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Priority</InputLabel>
                  <Select
                    value={form.priority}
                    label="Priority"
                    onChange={(e) => setForm(prev => ({ ...prev, priority: e.target.value }))}
                  >
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="normal">Normal</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="urgent">Urgent</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Target Audience
                </Typography>
                
                {/* Course filtering tabs for HOD */}
                {user.role === 'hod' && targetingOptions.teachersByCourse && (
                  <Paper sx={{ mb: 2 }}>
                    <Tabs
                      value={selectedCourse}
                      onChange={(e, newValue) => setSelectedCourse(newValue)}
                      variant="scrollable"
                      scrollButtons="auto"
                      sx={{ borderBottom: 1, borderColor: 'divider' }}
                    >
                      <Tab label="All Courses" value="all" />
                      {Object.keys(targetingOptions.teachersByCourse).map((courseId) => {
                        const course = targetingOptions.teachersByCourse[courseId];
                        return (
                          <Tab 
                            key={courseId} 
                            label={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <span>{course.courseName}</span>
                                <Chip 
                                  size="small" 
                                  label={`${course.teachers.length}T, ${targetingOptions.studentsByCourse?.[courseId]?.students?.length || 0}S`}
                                  variant="outlined"
                                />
                              </Box>
                            }
                            value={courseId} 
                          />
                        );
                      })}
                    </Tabs>
                    
                    {/* Quick select buttons for course-based targeting */}
                    {selectedCourse !== 'all' && (
                      <Box sx={{ p: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            const courseTeachers = targetingOptions.teachersByCourse?.[selectedCourse]?.teachers || [];
                            const teacherIds = courseTeachers.map(t => t._id);
                            const existingStudentIds = form.targetAudience.specificUsers?.filter(id => 
                              targetingOptions.students?.some(s => s._id === id)
                            ) || [];
                            handleTargetingChange('specificUsers', [...teacherIds, ...existingStudentIds]);
                          }}
                        >
                          Select All Teachers ({targetingOptions.teachersByCourse?.[selectedCourse]?.teachers?.length || 0})
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            const courseStudents = targetingOptions.studentsByCourse?.[selectedCourse]?.students || [];
                            const studentIds = courseStudents.map(s => s._id);
                            const existingTeacherIds = form.targetAudience.specificUsers?.filter(id => 
                              targetingOptions.teachers?.some(t => t._id === id)
                            ) || [];
                            handleTargetingChange('specificUsers', [...existingTeacherIds, ...studentIds]);
                          }}
                        >
                          Select All Students ({targetingOptions.studentsByCourse?.[selectedCourse]?.students?.length || 0})
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="secondary"
                          onClick={() => {
                            handleTargetingChange('specificUsers', []);
                          }}
                        >
                          Clear All Selections
                        </Button>
                      </Box>
                    )}
                  </Paper>
                )}
              </Grid>

              {/* Admin/Superadmin can select all users */}
              {(user.role === 'admin' || user.role === 'superadmin') && (
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={form.targetAudience.allUsers}
                        onChange={(e) => handleTargetingChange('allUsers', e.target.checked)}
                      />
                    }
                    label="All Users (Override all other selections)"
                  />
                </Grid>
              )}

              {/* Dean announcements are school/department scoped; no global option */}

              {/* Role-based targeting */}
              {targetingOptions.roles && targetingOptions.roles.length > 0 && !form.targetAudience.allUsers && !form.targetAudience.isGlobal && (
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Target Roles</InputLabel>
                    <Select
                      multiple
                      value={form.targetAudience.targetRoles}
                      label="Target Roles"
                      onChange={(e) => handleTargetingChange('targetRoles', e.target.value)}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map((value) => (
                            <Chip key={value} label={value.toUpperCase()} size="small" />
                          ))}
                        </Box>
                      )}
                    >
                      {targetingOptions.roles.map((role) => (
                        <MenuItem key={role} value={role}>
                          <Checkbox checked={form.targetAudience.targetRoles.includes(role)} />
                          <ListItemText primary={role.toUpperCase()} />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}

              {/* School targeting - Enhanced for Dean cross-school announcements */}
              {user.role === 'dean' && (
                <Grid item xs={12}>
                  <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                    <Typography variant="subtitle2" gutterBottom>
                      School Selection
                    </Typography>
                    
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>Select School</InputLabel>
                      <Select
                        value={form.targetAudience.targetSchools?.[0] || ''}
                        label="Select School"
                        onChange={(e) => {
                          const selectedSchoolId = e.target.value;
                          handleTargetingChange('targetSchools', selectedSchoolId ? [selectedSchoolId] : []);
                          
                          // Reset other targeting when school changes
                          setForm(prev => ({
                            ...prev,
                            targetAudience: {
                              ...prev.targetAudience,
                              targetDepartments: [],
                              targetSections: [],
                              specificUsers: []
                            }
                          }));
                        }}
                      >
                        {/* Own school option */}
                        {targetingOptions.schools?.map((school) => (
                          <MenuItem key={school._id} value={school._id}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography>{school.name}</Typography>
                              <Chip label="My School" size="small" color="primary" />
                            </Box>
                          </MenuItem>
                        ))}
                        
                        {/* Other schools for cross-school announcements */}
                        {targetingOptions.allSchools?.filter(school => 
                          !targetingOptions.schools?.some(mySchool => mySchool._id === school._id)
                        ).map((school) => (
                          <MenuItem key={school._id} value={school._id}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography>{school.name}</Typography>
                              <Chip label="Cross-School" size="small" color="warning" />
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    {/* Cross-school warning */}
                    {form.targetAudience.targetSchools?.[0] && 
                     !targetingOptions.schools?.some(school => school._id === form.targetAudience.targetSchools[0]) && (
                      <Alert severity="warning" sx={{ mb: 2 }}>
                        <Typography variant="body2">
                          <strong>Cross-School Announcement:</strong> This announcement will require approval from the Dean of the selected school before being published.
                        </Typography>
                      </Alert>
                    )}
                  </Paper>
                </Grid>
              )}

              {/* Regular school targeting for other roles */}
              {user.role !== 'dean' && targetingOptions.schools && targetingOptions.schools.length > 0 && !form.targetAudience.allUsers && !form.targetAudience.isGlobal && (
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Target Schools</InputLabel>
                    <Select
                      multiple
                      value={form.targetAudience.targetSchools}
                      label="Target Schools"
                      onChange={(e) => handleTargetingChange('targetSchools', e.target.value)}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map((value) => {
                            const school = targetingOptions.schools.find(s => s._id === value);
                            return school ? <Chip key={value} label={school.name} size="small" /> : null;
                          })}
                        </Box>
                      )}
                    >
                      {targetingOptions.schools.map((school) => (
                        <MenuItem key={school._id} value={school._id}>
                          <Checkbox checked={form.targetAudience.targetSchools.includes(school._id)} />
                          <ListItemText primary={school.name} />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}

              {/* Department targeting */}
              {targetingOptions.departments && targetingOptions.departments.length > 0 && !form.targetAudience.allUsers && !form.targetAudience.isGlobal && (
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Target Departments</InputLabel>
                    <Select
                      multiple
                      value={form.targetAudience.targetDepartments}
                      label="Target Departments"
                      onChange={(e) => handleTargetingChange('targetDepartments', e.target.value)}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map((value) => {
                            const dept = targetingOptions.departments.find(d => d._id === value);
                            return dept ? <Chip key={value} label={dept.name} size="small" /> : null;
                          })}
                        </Box>
                      )}
                    >
                      {targetingOptions.departments.map((dept) => (
                        <MenuItem key={dept._id} value={dept._id}>
                          <Checkbox checked={form.targetAudience.targetDepartments.includes(dept._id)} />
                          <ListItemText primary={dept.name} />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}

              {/* Section targeting */}
              {targetingOptions.sections && targetingOptions.sections.length > 0 && !form.targetAudience.allUsers && !form.targetAudience.isGlobal && (
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Target Sections</InputLabel>
                    <Select
                      multiple
                      value={form.targetAudience.targetSections}
                      label="Target Sections"
                      onChange={(e) => handleTargetingChange('targetSections', e.target.value)}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map((value) => {
                            const section = targetingOptions.sections.find(s => s._id === value);
                            return section ? <Chip key={value} label={section.name} size="small" /> : null;
                          })}
                        </Box>
                      )}
                    >
                      {targetingOptions.sections.map((section) => (
                        <MenuItem key={section._id} value={section._id}>
                          <Checkbox checked={form.targetAudience.targetSections.includes(section._id)} />
                          <ListItemText primary={section.name} />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}

              {/* Specific HODs targeting - Dean only */}
              {user.role === 'dean' && targetingOptions.hods && targetingOptions.hods.length > 0 && !form.targetAudience.allUsers && !form.targetAudience.isGlobal && (
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Target Specific HODs</InputLabel>
                    <Select
                      multiple
                      value={form.targetAudience.specificUsers?.filter(id => 
                        targetingOptions.hods.some(h => h._id === id)
                      ) || []}
                      label="Target Specific HODs"
                      onChange={(e) => {
                        const hodIds = e.target.value;
                        const existingOthers = (form.targetAudience.specificUsers || []).filter(id =>
                          !targetingOptions.hods.some(h => h._id === id)
                        );
                        handleTargetingChange('specificUsers', [...existingOthers, ...hodIds]);
                      }}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map((value) => {
                            const hod = targetingOptions.hods.find(h => h._id === value);
                            return hod ? <Chip key={value} label={hod.name} size="small" /> : null;
                          })}
                        </Box>
                      )}
                    >
                      {targetingOptions.hods.map((hod) => (
                        <MenuItem key={hod._id} value={hod._id}>
                          <Checkbox checked={form.targetAudience.specificUsers?.includes(hod._id) || false} />
                          <ListItemText 
                            primary={hod.name} 
                            secondary={
                              <Typography variant="caption" color="textSecondary">
                                {hod.email}
                              </Typography>
                            }
                          />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}

              {/* Quick selects by department (Dean): add all HODs/Teachers/Students of a department */}
              {user.role === 'dean' && targetingOptions.departments && targetingOptions.departments.length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Quick add by Department</Typography>
                  <List dense>
                    {targetingOptions.departments.map(dept => (
                      <ListItem key={dept._id}
                        secondaryAction={
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            <Button size="small" variant="outlined" onClick={() => {
                              const hodIds = (targetingOptions.hodsByDepartment?.[dept._id]?.hods || []).map(h => h._id);
                              const merged = new Set([...(form.targetAudience.specificUsers || []), ...hodIds]);
                              handleTargetingChange('specificUsers', Array.from(merged));
                            }}>Add HODs</Button>
                            <Button size="small" variant="outlined" onClick={() => {
                              const teacherIds = (targetingOptions.teachersByDepartment?.[dept._id]?.teachers || []).map(t => t._id);
                              const merged = new Set([...(form.targetAudience.specificUsers || []), ...teacherIds]);
                              handleTargetingChange('specificUsers', Array.from(merged));
                            }}>Add Teachers</Button>
                            <Button size="small" variant="outlined" onClick={() => {
                              const studentIds = (targetingOptions.studentsByDepartment?.[dept._id]?.students || []).map(s => s._id);
                              const merged = new Set([...(form.targetAudience.specificUsers || []), ...studentIds]);
                              handleTargetingChange('specificUsers', Array.from(merged));
                            }}>Add Students</Button>
                          </Box>
                        }
                      >
                        <ListItemText primary={dept.name} />
                      </ListItem>
                    ))}
                  </List>
                  <Divider sx={{ my: 1 }} />
                </Grid>
              )}

              {/* Specific Teachers targeting - HOD & Dean */}
              {(user.role === 'hod' || user.role === 'dean') && targetingOptions.teachers && targetingOptions.teachers.length > 0 && !form.targetAudience.allUsers && !form.targetAudience.isGlobal && (
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Target Specific Teachers</InputLabel>
                    <Select
                      multiple
                      value={form.targetAudience.specificUsers?.filter(id => 
                        targetingOptions.teachers.some(t => t._id === id)
                      ) || []}
                      label="Target Specific Teachers"
                      onChange={(e) => {
                        const teacherIds = e.target.value;
                        const existingStudentIds = form.targetAudience.specificUsers?.filter(id => 
                          targetingOptions.students?.some(s => s._id === id)
                        ) || [];
                        const existingHodIds = form.targetAudience.specificUsers?.filter(id => 
                          targetingOptions.hods?.some(h => h._id === id)
                        ) || [];
                        handleTargetingChange('specificUsers', [...teacherIds, ...existingStudentIds, ...existingHodIds]);
                      }}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map((value) => {
                            const teacher = targetingOptions.teachers.find(t => t._id === value);
                            return teacher ? <Chip key={value} label={teacher.name} size="small" /> : null;
                          })}
                        </Box>
                      )}
                    >
                      {(() => {
                        // Filter teachers based on selected course (HOD only). Dean sees all department teachers.
                        let teachersToShow = targetingOptions.teachers;
                        if (user.role === 'hod' && selectedCourse !== 'all' && targetingOptions.teachersByCourse?.[selectedCourse]) {
                          teachersToShow = targetingOptions.teachersByCourse[selectedCourse].teachers;
                        }
                        return teachersToShow.map((teacher) => (
                          <MenuItem key={teacher._id} value={teacher._id}>
                            <Checkbox checked={form.targetAudience.specificUsers?.includes(teacher._id) || false} />
                            <ListItemText 
                              primary={teacher.name} 
                              secondary={
                                <Box>
                                  <Typography variant="caption" display="block" color="textSecondary">
                                    {teacher.email}
                                  </Typography>
                                  <Typography variant="caption" display="block" color="primary">
                                    Courses: {teacher.courseNames || 'No courses assigned'}
                                  </Typography>
                                </Box>
                              }
                            />
                          </MenuItem>
                        ));
                      })()}
                    </Select>
                  </FormControl>
                  
                  {/* Department Summary for HOD */}
                  {targetingOptions.departmentSummary && (
                    <Alert severity="info" sx={{ mt: 1 }}>
                      <Typography variant="body2">
                        <strong>{targetingOptions.departmentSummary.name} Department:</strong> {targetingOptions.departmentSummary.totalTeachers} teachers, {targetingOptions.departmentSummary.totalStudents} students across {targetingOptions.departmentSummary.totalCourses} courses
                      </Typography>
                    </Alert>
                  )}
                </Grid>
              )}

              {/* Specific Students targeting - HOD & Dean */}
              {(user.role === 'hod' || user.role === 'dean') && targetingOptions.students && targetingOptions.students.length > 0 && !form.targetAudience.allUsers && !form.targetAudience.isGlobal && (
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Target Specific Students</InputLabel>
                    <Select
                      multiple
                      value={form.targetAudience.specificUsers?.filter(id => 
                        targetingOptions.students.some(s => s._id === id)
                      ) || []}
                      label="Target Specific Students"
                      onChange={(e) => {
                        const studentIds = e.target.value;
                        const existingTeacherIds = form.targetAudience.specificUsers?.filter(id => 
                          targetingOptions.teachers?.some(t => t._id === id)
                        ) || [];
                        const existingHodIds = form.targetAudience.specificUsers?.filter(id => 
                          targetingOptions.hods?.some(h => h._id === id)
                        ) || [];
                        handleTargetingChange('specificUsers', [...existingTeacherIds, ...existingHodIds, ...studentIds]);
                      }}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map((value) => {
                            const student = targetingOptions.students.find(s => s._id === value);
                            return student ? <Chip key={value} label={student.name} size="small" /> : null;
                          })}
                        </Box>
                      )}
                    >
                      {(() => {
                        // Filter students based on selected course (HOD only). Dean sees all department students.
                        let studentsToShow = targetingOptions.students;
                        if (user.role === 'hod' && selectedCourse !== 'all' && targetingOptions.studentsByCourse?.[selectedCourse]) {
                          studentsToShow = targetingOptions.studentsByCourse[selectedCourse].students;
                        }
                        return studentsToShow.map((student) => (
                          <MenuItem key={student._id} value={student._id}>
                            <Checkbox checked={form.targetAudience.specificUsers?.includes(student._id) || false} />
                            <ListItemText 
                              primary={student.name} 
                              secondary={
                                <Box>
                                  <Typography variant="caption" display="block" color="textSecondary">
                                    RegNo: {student.regNo || 'N/A'} | Email: {student.email}
                                  </Typography>
                                  <Typography variant="caption" display="block" color="primary">
                                    Courses: {student.courseNames || 'No enrollments'}
                                  </Typography>
                                  {student.sectionName && (
                                    <Typography variant="caption" display="block" color="secondary">
                                      Section: {student.sectionName}
                                    </Typography>
                                  )}
                                </Box>
                              }
                            />
                          </MenuItem>
                        ));
                      })()}
                    </Select>
                  </FormControl>
                </Grid>
              )}

              {/* Teacher announcement note */}
              {user.role === 'teacher' && (
                <Grid item xs={12}>
                  <Alert severity="info">
                    <Typography variant="body2">
                      Your announcement will be sent to your HOD for approval before being shared with students.
                    </Typography>
                  </Alert>
                </Grid>
              )}

              {/* Recipients Summary for Dean */}
              {user.role === 'dean' && (
                <Grid item xs={12}>
                  <Alert severity={(form.targetAudience.specificUsers?.length || 0) > 0 || form.targetAudience.allUsers ? 'success' : 'warning'}>
                    <Typography variant="body2">
                      <strong>Selected Recipients:</strong>{' '}
                      {form.targetAudience.allUsers && 'All users'}
                      {!form.targetAudience.allUsers && (
                        (() => {
                          const ids = new Set(form.targetAudience.specificUsers || []);
                          const hodCount = (targetingOptions.hods || []).filter(h => ids.has(h._id)).length;
                          const teacherCount = (targetingOptions.teachers || []).filter(t => ids.has(t._id)).length;
                          const studentCount = (targetingOptions.students || []).filter(s => ids.has(s._id)).length;
                          const parts = [];
                          if (hodCount) parts.push(`${hodCount} HOD${hodCount>1?'s':''}`);
                          if (teacherCount) parts.push(`${teacherCount} teacher${teacherCount>1?'s':''}`);
                          if (studentCount) parts.push(`${studentCount} student${studentCount>1?'s':''}`);
                          return parts.length ? parts.join(', ') : 'None';
                        })()
                      )}
                    </Typography>
                  </Alert>
                </Grid>
              )}

              {/* Scheduling */}
              <Grid item xs={6}>
                <DateTimePicker
                  label="Schedule For (Optional)"
                  value={form.scheduledFor ? new Date(form.scheduledFor) : null}
                  onChange={(newValue) => setForm(prev => ({ ...prev, scheduledFor: newValue?.toISOString() || '' }))}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </Grid>

              <Grid item xs={6}>
                <DateTimePicker
                  label="Expires At (Optional)"
                  value={form.expiresAt ? new Date(form.expiresAt) : null}
                  onChange={(newValue) => setForm(prev => ({ ...prev, expiresAt: newValue?.toISOString() || '' }))}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleSubmit}
              variant="contained"
              disabled={!form.title || !form.message}
            >
              {user.role === 'teacher' ? 'Submit for Approval' : 'Create Announcement'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Moderation Dialog */}
        <Dialog open={moderationDialog} onClose={() => setModerationDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Review Announcement</DialogTitle>
          <DialogContent>
            {selectedAnnouncement && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  {selectedAnnouncement.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  By: {selectedAnnouncement.sender?.name}
                </Typography>
                <Typography variant="body1">
                  {selectedAnnouncement.message}
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setModerationDialog(false)}>Cancel</Button>
            <Button 
              onClick={() => handleModeration(selectedAnnouncement?._id, 'reject', '')}
              color="error"
              variant="contained"
            >
              Reject
            </Button>
            <Button 
              onClick={() => handleModeration(selectedAnnouncement?._id, 'approve', '')}
              color="success"
              variant="contained"
            >
              Approve
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default HierarchicalAnnouncementBoard;