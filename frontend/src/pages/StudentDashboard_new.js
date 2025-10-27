import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import { getCurrentUser } from '../utils/authService';
import Sidebar from '../components/Sidebar';
import NotificationBell from '../components/admin/NotificationBell';
import RoleSwitcher from '../components/RoleSwitcher';
import AnnouncementPage from './AnnouncementPage';

// Import student pages
import StudentHomeDashboard from './student/StudentHomeDashboard';
import StudentCoursesPage from './student/StudentCoursesPage';
import StudentCourseVideos from './student/StudentCourseVideos';
import StudentCourseProgress from './student/StudentCourseProgress';
import StudentQuizPage from './student/StudentQuizPage';
import StudentSection from '../components/student/StudentSection';
// import StudentLiveClassDashboard from '../components/student/StudentLiveClassDashboard';
// Live class components moved to independent video-call-module
// import SgtLmsLiveClass from '../components/liveclass/CodeTantraLiveClass';
// import EnhancedLiveClassRoom from '../components/enhanced/EnhancedLiveClassRoom';
import QuizResults from '../components/student/QuizResults';

const StudentDashboard = () => {
  const token = localStorage.getItem('token');
  const currentUser = getCurrentUser();

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar currentUser={currentUser} />
      <Box sx={{ position: 'absolute', top: 16, right: 80, zIndex: 1201 }}>
        <NotificationBell token={token} />
      </Box>
      <Box sx={{ position: 'absolute', top: 16, right: 16, zIndex: 1201 }}>
        <RoleSwitcher />
      </Box>
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          // Lighter blue gradient background to match admin dashboard
          background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 30%, #cbd5e1 70%, #94a3b8 100%)',
        }}
      >
        <Box sx={{ 
          flex: 1, 
          p: { xs: 2, md: 3 },
          backgroundColor: 'transparent'
        }}>
          <Routes>
            <Route path="/" element={<StudentHomeDashboard />} />
            <Route path="/dashboard" element={<StudentHomeDashboard />} />
            <Route path="/courses" element={<StudentCoursesPage />} />
            <Route path="/section" element={<StudentSection user={currentUser} token={token} />} />
            {/* Live class routes moved to independent video-call-module */}
            {/* <Route path="/live-classes" element={<SgtLmsLiveClass token={token} user={currentUser} />} />
            <Route path="/live-class/:classId" element={<EnhancedLiveClassRoom />} /> */}
            <Route path="/course/:courseId/videos" element={<StudentCourseVideos />} />
            <Route path="/course/:courseId/video/:videoId" element={<StudentCourseVideos />} />
            <Route path="/course/:courseId/progress" element={<StudentCourseProgress />} />
            <Route path="/quiz-results" element={<QuizResults />} />
            <Route path="/course/:courseId/quiz/:attemptId" element={<StudentQuizPage user={currentUser} token={token} />} />
            <Route path="/announcements" element={<AnnouncementPage role="student" />} />
            <Route path="*" element={<Navigate to="/student/dashboard" replace />} />
          </Routes>
        </Box>
      </Box>
    </Box>
  );
};

export default StudentDashboard;