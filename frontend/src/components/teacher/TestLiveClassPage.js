import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const TestLiveClassPage = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Live Classes Dashboard - Test Page
        </Typography>
        <Typography variant="body1">
          This is a test page to verify that the routing is working correctly.
          If you can see this page, then the routing is fine and the issue is with the original component.
        </Typography>
      </Paper>
    </Box>
  );
};

export default TestLiveClassPage;