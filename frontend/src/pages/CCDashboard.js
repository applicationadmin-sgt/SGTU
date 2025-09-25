import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Box, Toolbar, Typography } from '@mui/material';
import Sidebar from '../components/Sidebar';
import { parseJwt } from '../utils/jwt';

const CCDashboardHome = React.lazy(() => import('./cc/CCDashboardHome'));
const CCReviews = React.lazy(() => import('./cc/CCReviews'));

const CCDashboard = () => {
  const token = localStorage.getItem('token');
  const currentUser = parseJwt(token);
  const location = useLocation();

  useEffect(() => {
    // no-op: placeholder for future notifications
  }, []);

  if (!currentUser || (currentUser.role !== 'cc' && currentUser.role !== 'admin')) {
    return <Navigate to="/login" replace />;
  }

  if (location.pathname === '/cc') {
    return <Navigate to="/cc/dashboard" replace />;
  }

  return (
    <Box sx={{ display: 'flex' }}>
      <Sidebar currentUser={currentUser} />
      <Box sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: '#f5f5f5' }}>
        <Box sx={{ bgcolor: 'white', borderBottom: '1px solid #e0e0e0', px: 3, py: 1 }}>
          <Typography variant="h5">Course Coordinator</Typography>
        </Box>
        <Toolbar />
        <React.Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}> 
          <Routes>
            <Route path="/dashboard" element={<CCDashboardHome />} />
            <Route path="/reviews" element={<CCReviews />} />
            <Route path="*" element={<Navigate to="/cc/dashboard" replace />} />
          </Routes>
        </React.Suspense>
      </Box>
    </Box>
  );
};

export default CCDashboard;
