import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Alert,
  Grid,
  Switch,
  FormControlLabel,
  CircularProgress
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import liveClassAPI from '../../api/liveClassApi';

const ScheduleLiveClassDialog = ({ 
  open, 
  onClose, 
  onClassScheduled,
  token 
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    sectionId: '',
    courseId: '',
    scheduledAt: new Date(Date.now() + 60 * 60 * 1000), // Default to 1 hour from now
    duration: 60, // Default 60 minutes
    allowStudentMic: false,
    allowStudentCamera: false,
    allowChat: true,
    requireApprovalToJoin: false
  });

  const [sectionsAndCourses, setSectionsAndCourses] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadingSections, setLoadingSections] = useState(false);

  // Load teacher's sections and courses when dialog opens
  useEffect(() => {
    if (open) {
      loadSectionsAndCourses();
    }
  }, [open, token]);

  const loadSectionsAndCourses = async () => {
    try {
      setLoadingSections(true);
      setError('');
      
      console.log('📚 Loading sections and courses...');
      console.log('🔑 Using token:', token ? 'Token available' : 'No token');
      
      const response = await liveClassAPI.getTeacherSectionsAndCourses(token);
      console.log('📚 Sections loaded:', response);
      setSectionsAndCourses(response.sections || []);
      
    } catch (err) {
      console.error('❌ Failed to load sections:', err);
      setError(err.message);
    } finally {
      setLoadingSections(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Reset course selection when section changes
    if (field === 'sectionId') {
      setFormData(prev => ({ ...prev, courseId: '' }));
      setSelectedSection(sectionsAndCourses.find(s => s._id === value) || null);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('🚀 Submitting live class form:', formData);
      console.log('🔑 Using token:', token ? 'Token available' : 'No token');
      
      // Validation
      if (!formData.title.trim()) {
        setError('Title is required');
        return;
      }
      
      if (!formData.sectionId) {
        setError('Please select a section');
        return;
      }
      
      if (!formData.courseId) {
        setError('Please select a course');
        return;
      }
      
      if (formData.scheduledAt <= new Date()) {
        setError('Scheduled time must be in the future');
        return;
      }
      
      if (formData.duration < 15 || formData.duration > 180) {
        setError('Duration must be between 15 and 180 minutes');
        return;
      }
      
      // Schedule the class
      console.log('📡 Making API call to schedule class...');
      const response = await liveClassAPI.scheduleClass(formData, token);
      console.log('✅ Class scheduled successfully:', response);
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        sectionId: '',
        courseId: '',
        scheduledAt: new Date(Date.now() + 60 * 60 * 1000),
        duration: 60,
        allowStudentMic: false,
        allowStudentCamera: false,
        allowChat: true,
        requireApprovalToJoin: false
      });
      
      setSelectedSection(null);
      
      // Notify parent component
      if (onClassScheduled) {
        onClassScheduled(response.liveClass);
      }
      
      onClose();
      
    } catch (err) {
      console.error('❌ Failed to schedule class:', err);
      console.error('❌ Error details:', err.response?.data);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError('');
      onClose();
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Typography variant="h6">
            Schedule Live Class
          </Typography>
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            
            {loadingSections ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
                <Typography variant="body2" sx={{ ml: 2 }}>
                  Loading sections and courses...
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={2}>
                {/* Basic Information */}
                <Grid item xs={12}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    Basic Information
                  </Typography>
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Class Title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="Enter a descriptive title for your live class"
                    required
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Description (Optional)"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Describe what will be covered in this class"
                    multiline
                    rows={3}
                  />
                </Grid>
                
                {/* Section and Course Selection */}
                <Grid item xs={12}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
                    Section and Course
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Section</InputLabel>
                    <Select
                      value={formData.sectionId}
                      onChange={(e) => handleInputChange('sectionId', e.target.value)}
                      label="Section"
                    >
                      {sectionsAndCourses.map((section) => (
                        <MenuItem key={section._id} value={section._id}>
                          {section.name} ({section.studentCount} students)
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth required disabled={!selectedSection}>
                    <InputLabel>Course</InputLabel>
                    <Select
                      value={formData.courseId}
                      onChange={(e) => handleInputChange('courseId', e.target.value)}
                      label="Course"
                    >
                      {selectedSection?.courses?.map((course) => (
                        <MenuItem key={course._id} value={course._id}>
                          {course.courseCode} - {course.title}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                {/* Scheduling */}
                <Grid item xs={12}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
                    Scheduling
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <DateTimePicker
                    label="Scheduled Date & Time"
                    value={formData.scheduledAt}
                    onChange={(value) => handleInputChange('scheduledAt', value)}
                    renderInput={(params) => <TextField {...params} fullWidth required />}
                    minDateTime={new Date()}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Duration (minutes)"
                    type="number"
                    value={formData.duration}
                    onChange={(e) => handleInputChange('duration', parseInt(e.target.value) || 60)}
                    inputProps={{ min: 15, max: 180 }}
                    helperText="Between 15 and 180 minutes"
                    required
                  />
                </Grid>
                
                {/* Settings */}
                <Grid item xs={12}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
                    Class Settings
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.allowStudentMic}
                        onChange={(e) => handleInputChange('allowStudentMic', e.target.checked)}
                      />
                    }
                    label="Allow students to use microphone"
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.allowStudentCamera}
                        onChange={(e) => handleInputChange('allowStudentCamera', e.target.checked)}
                      />
                    }
                    label="Allow students to use camera"
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.allowChat}
                        onChange={(e) => handleInputChange('allowChat', e.target.checked)}
                      />
                    }
                    label="Enable chat"
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.requireApprovalToJoin}
                        onChange={(e) => handleInputChange('requireApprovalToJoin', e.target.checked)}
                      />
                    }
                    label="Require approval to join"
                  />
                </Grid>
              </Grid>
            )}
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            disabled={loading || loadingSections}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {loading ? 'Scheduling...' : 'Schedule Class'}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default ScheduleLiveClassDialog;