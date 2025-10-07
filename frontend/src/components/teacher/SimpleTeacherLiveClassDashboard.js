import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';

const SimpleTeacherLiveClassDashboard = ({ token, user }) => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Live Classes Dashboard (TEST)
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 3 }}>
        This is the teacher live classes dashboard - you should see a list of classes here
      </Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Expected Flow:
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          1. You should see this dashboard with tabs: All, Upcoming, Live, Completed
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          2. You should see a table with your scheduled classes
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          3. You can click "Schedule Class" to create new classes
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          4. You can click "Start" or "Join" to enter the classroom
        </Typography>
        
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          sx={{ mt: 2 }}
        >
          Schedule Class (Test Button)
        </Button>
      </Paper>
      
      <Paper sx={{ p: 3 }}>
        <Typography variant="body2" color="error">
          If you're seeing the classroom interface instead of this message,
          then there's a routing problem in the application.
        </Typography>
      </Paper>
    </Box>
  );
};

export default SimpleTeacherLiveClassDashboard;