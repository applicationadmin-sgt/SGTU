import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import AnnouncementHistory from '../../components/AnnouncementHistory';

const HODAnnouncementHistory = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Announcement History
        </Typography>
        <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
          View your announcements and teacher approvals
        </Typography>
        
        <AnnouncementHistory 
          userRole="hod" 
          title="HOD Announcement Management"
        />
      </Paper>
    </Box>
  );
};

export default HODAnnouncementHistory;