import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Divider,
  Button,
  Fade,
  Slide,
  Zoom,
  Stack,
  IconButton,
} from '@mui/material';
import {
  VideoLibrary as VideoLibraryIcon,
  OndemandVideo as OndemandVideoIcon,
  AccessTime as AccessTimeIcon,
  BarChart as BarChartIcon,
  TrendingUp as TrendingUpIcon,
  School as SchoolIcon,
  PlayCircleOutline as PlayCircleOutlineIcon,
  Warning as WarningIcon,
  EmojiEvents as EmojiEventsIcon,
  Dashboard as DashboardIcon,
  MenuBook as MenuBookIcon,
  Assignment as AssignmentIcon,
  People as PeopleIcon,
  CalendarToday as CalendarTodayIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { keyframes } from '@mui/system';
import LoadingScreen from '../../components/common/LoadingScreen';
import SGTLogo from '../../components/common/SGTLogo';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient, handleApiError } from '../../services/api';

// Animations
const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const bounce = keyframes`
  0%, 20%, 53%, 80%, 100% {
    transform: translateY(0);
  }
  40%, 43% {
    transform: translateY(-10px);
  }
  70% {
    transform: translateY(-5px);
  }
`;

const pulse = keyframes`
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.02);
  }
  100% {
    transform: scale(1);
  }
`;

// Circular Progress Component with Label
const CircularProgressWithLabel = ({ value, size = 120, thickness = 4, color = '#4F46E5' }) => {
  return (
    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
      <CircularProgress
        variant="determinate"
        value={value}
        size={size}
        thickness={thickness}
        sx={{
          color: color,
          '& .MuiCircularProgress-circle': {
            strokeLinecap: 'round',
          },
        }}
      />
      <Box
        sx={{
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          position: 'absolute',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography
          variant="h4"
          component="div"
          sx={{ color: color, fontWeight: 'bold' }}
        >
          {`${Math.round(value)}%`}
        </Typography>
      </Box>
    </Box>
  );
};

const StudentHomeDashboard = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  // State management
  const [showLoading, setShowLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cardsLoaded, setCardsLoaded] = useState(false);
  const [courses, setCourses] = useState([]);
  const [statistics, setStatistics] = useState({
    totalCourses: 0,
    videosWatched: 0,
    totalVideos: 0,
    totalWatchTime: 0,
    completedQuizzes: 0,
    averageScore: 0,
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [deadlineWarnings, setDeadlineWarnings] = useState(null);
  const [deadlineLoading, setDeadlineLoading] = useState(false);

  // Format duration helper
  const formatDuration = (seconds) => {
    if (!seconds || seconds === 0) return '0m';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Format date helper
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  // Calculate overall progress
  const calculateOverallProgress = () => {
    if (courses.length === 0) return 0;
    const totalProgress = courses.reduce((sum, course) => {
      return sum + (course.enhancedProgress !== undefined ? course.enhancedProgress : (course.progress || 0));
    }, 0);
    return Math.round(totalProgress / courses.length);
  };

  // Load dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch courses
        const coursesResponse = await apiClient.get('/api/courses/student');
        
        // Fetch watch history
        const watchHistoryResponse = await apiClient.get('/api/student/watch-history');
        const watchHistoryData = watchHistoryResponse.data || [];
        
        // Process watch data
        let totalVideosWatched = 0;
        let totalWatchTimeAccumulated = 0;
        const courseWatchMap = {};
        
        watchHistoryData.forEach(courseHistory => {
          if (courseHistory.videos && Array.isArray(courseHistory.videos)) {
            const courseId = courseHistory.courseId;
            const watchedVideosInCourse = courseHistory.videos.filter(video => video.timeSpent > 0).length;
            const courseWatchTime = courseHistory.totalTimeSpent || 0;
            
            courseWatchMap[courseId] = {
              videosWatched: watchedVideosInCourse,
              totalWatchTime: courseWatchTime,
              videos: courseHistory.videos
            };
            
            totalVideosWatched += watchedVideosInCourse;
            totalWatchTimeAccumulated += courseWatchTime;
          }
        });
        
        // Enhanced courses
        const enhancedCourses = coursesResponse.data.map(course => {
          const watchData = courseWatchMap[course._id];
          if (watchData) {
            const videoProgress = course.totalVideos > 0 ? 
              Math.round((watchData.videosWatched / course.totalVideos) * 100) : 0;
            
            return {
              ...course,
              enhancedProgress: Math.max(course.progress || 0, videoProgress),
              actualVideosWatched: watchData.videosWatched,
              actualWatchTime: watchData.totalWatchTime,
              watchedVideos: watchData.videos
            };
          }
          return course;
        });
        
        setCourses(enhancedCourses);
        
        // Update statistics
        setStatistics({
          totalCourses: enhancedCourses.length,
          videosWatched: totalVideosWatched,
          totalVideos: enhancedCourses.reduce((sum, course) => sum + (course.totalVideos || 0), 0),
          totalWatchTime: totalWatchTimeAccumulated,
          completedQuizzes: 0, // This would come from quiz API
          averageScore: 0, // This would come from quiz API
        });
        
        // Set recent activity
        setRecentActivity(watchHistoryData);
        
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        setError(handleApiError(error));
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  // Cards animation effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setCardsLoaded(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {showLoading && (
        <LoadingScreen 
          onComplete={() => setShowLoading(false)}
          message="Loading your academic dashboard..."
        />
      )}
      
      {!showLoading && (
        <Box
          sx={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Sidebar */}
          <Box
            sx={{
              position: 'fixed',
              left: 0,
              top: 0,
              height: '100vh',
              width: '80px',
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(20px)',
              borderRight: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              py: 3,
              zIndex: 1000,
            }}
          >
            {/* Logo */}
            <Box sx={{ mb: 4 }}>
              <SGTLogo size={50} animate={false} showText={false} />
            </Box>

            {/* Navigation Icons */}
            <Stack spacing={3}>
              {[
                { icon: <DashboardIcon />, active: true },
                { icon: <MenuBookIcon /> },
                { icon: <AssignmentIcon /> },
                { icon: <PeopleIcon /> },
                { icon: <CalendarTodayIcon /> },
                { icon: <NotificationsIcon /> },
                { icon: <SettingsIcon /> },
              ].map((item, index) => (
                <IconButton
                  key={index}
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 3,
                    color: 'white',
                    background: item.active ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.1)',
                      transform: 'scale(1.05)',
                    },
                    transition: 'all 0.2s ease',
                  }}
                >
                  {item.icon}
                </IconButton>
              ))}
            </Stack>
          </Box>

          {/* Main Content */}
          <Container 
            maxWidth="xl" 
            sx={{ 
              ml: '80px', 
              pt: 4, 
              pb: 4, 
              pr: 4,
              minHeight: '100vh',
            }}
          >
            {/* Header Section */}
            <Fade in={cardsLoaded} timeout={800}>
              <Box sx={{ mb: 6 }}>
                <Grid container spacing={4} alignItems="center">
                  <Grid item xs={12} md={8}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      {/* User Avatar */}
                      <Avatar
                        sx={{
                          width: 80,
                          height: 80,
                          background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
                          border: '4px solid rgba(255, 255, 255, 0.2)',
                          fontSize: '2rem',
                          fontWeight: 'bold',
                        }}
                      >
                        {currentUser?.name?.charAt(0) || 'S'}
                      </Avatar>

                      {/* Welcome Text */}
                      <Box>
                        <Typography 
                          variant="h3" 
                          sx={{ 
                            fontWeight: 'bold',
                            color: 'white',
                            mb: 1,
                          }}
                        >
                          {calculateOverallProgress()}
                        </Typography>
                        <Typography 
                          variant="h6" 
                          sx={{ 
                            color: 'rgba(255, 255, 255, 0.9)',
                            fontWeight: 500,
                          }}
                        >
                          Your learning level points
                        </Typography>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: 'rgba(255, 255, 255, 0.7)',
                            mt: 1,
                          }}
                        >
                          {currentUser?.name || 'Student'}, you did a great job last week! 🎉
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Card
                          sx={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: 3,
                            textAlign: 'center',
                            py: 2,
                          }}
                        >
                          <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
                            {formatDuration(statistics.totalWatchTime).split(' ')[0] || '3.5h'}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                            Last week
                          </Typography>
                        </Card>
                      </Grid>
                      <Grid item xs={6}>
                        <Card
                          sx={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: 3,
                            textAlign: 'center',
                            py: 2,
                          }}
                        >
                          <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
                            {statistics.totalWatchTime > 0 ? Math.floor(statistics.totalWatchTime / 3600) * 10 : 125}h
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                            Last semester
                          </Typography>
                        </Card>
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>
              </Box>
            </Fade>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
                <CircularProgress 
                  size={80} 
                  thickness={4}
                  sx={{
                    color: 'white',
                    '& .MuiCircularProgress-circle': {
                      strokeLinecap: 'round',
                    },
                  }}
                />
              </Box>
            ) : error ? (
              <Fade in={cardsLoaded} timeout={800}>
                <Alert severity="error" sx={{ 
                  textAlign: 'center', 
                  mt: 4, 
                  borderRadius: 3,
                  boxShadow: 3 
                }}>
                  {error}
                </Alert>
              </Fade>
            ) : (
              <>
                {/* Main Dashboard Content */}
                <Grid container spacing={4}>
                  {/* Skills Progress Card */}
                  <Grid item xs={12} md={6}>
                    <Zoom in={cardsLoaded} timeout={600}>
                      <Card
                        sx={{
                          background: 'rgba(255, 255, 255, 0.95)',
                          backdropFilter: 'blur(20px)',
                          borderRadius: 4,
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          p: 3,
                          height: '400px',
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                          <Typography variant="h6" fontWeight="bold">
                            Your main skillset
                          </Typography>
                          <IconButton>
                            <SettingsIcon />
                          </IconButton>
                        </Box>
                        
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                          You improved by 17 points last week
                        </Typography>

                        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
                          <CircularProgressWithLabel
                            value={calculateOverallProgress()}
                            size={160}
                            thickness={6}
                            color="#4F46E5"
                          />
                        </Box>

                        <Grid container spacing={2}>
                          {[
                            { label: 'Course Progress', value: '85%', color: '#4F46E5' },
                            { label: 'Quiz Scores', value: '30%', color: '#F59E0B' },
                            { label: 'Assignments', value: '35%', color: '#10B981' },
                          ].map((skill, index) => (
                            <Grid item xs={4} key={index}>
                              <Box sx={{ textAlign: 'center' }}>
                                <Box
                                  sx={{
                                    width: 12,
                                    height: 12,
                                    borderRadius: '50%',
                                    backgroundColor: skill.color,
                                    mx: 'auto',
                                    mb: 1,
                                  }}
                                />
                                <Typography variant="body2" color="text.secondary">
                                  {skill.label}
                                </Typography>
                                <Typography variant="body2" fontWeight="bold">
                                  {skill.value}
                                </Typography>
                              </Box>
                            </Grid>
                          ))}
                        </Grid>
                      </Card>
                    </Zoom>
                  </Grid>

                  {/* Next Lessons Card */}
                  <Grid item xs={12} md={6}>
                    <Zoom in={cardsLoaded} timeout={800}>
                      <Card
                        sx={{
                          background: 'rgba(255, 255, 255, 0.95)',
                          backdropFilter: 'blur(20px)',
                          borderRadius: 4,
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          p: 3,
                          height: '400px',
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                          <Box
                            sx={{
                              width: 40,
                              height: 40,
                              borderRadius: 2,
                              background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <MenuBookIcon sx={{ color: 'white' }} />
                          </Box>
                          <Box>
                            <Typography variant="h6" fontWeight="bold">
                              Next lessons
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              You will need 3.5 hours this week
                            </Typography>
                          </Box>
                        </Box>

                        <List sx={{ py: 0 }}>
                          {courses.slice(0, 4).map((course, index) => {
                            const colors = ['#4F46E5', '#F59E0B', '#10B981', '#EF4444'];
                            return (
                              <ListItem key={course._id} sx={{ px: 0, py: 1.5 }}>
                                <ListItemAvatar>
                                  <Avatar
                                    sx={{
                                      width: 40,
                                      height: 40,
                                      backgroundColor: colors[index % colors.length],
                                    }}
                                  >
                                    <PlayCircleOutlineIcon />
                                  </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                  primary={
                                    <Typography variant="body1" fontWeight="medium">
                                      {course.title || `Advanced Creative Technique`}
                                    </Typography>
                                  }
                                  secondary={
                                    <Typography variant="body2" color="text.secondary">
                                      Course Progress • {course.enhancedProgress || 65}% • {formatDuration(course.actualWatchTime || 3600)}
                                    </Typography>
                                  }
                                />
                              </ListItem>
                            );
                          })}
                          
                          {courses.length === 0 && [1, 2, 3, 4].map((item, index) => {
                            const lessons = [
                              { title: 'Advanced Creative Technique', subject: 'Graphic Design, Photoshop', time: '48:15 m' },
                              { title: 'Customer Journey Mapping', subject: 'UX / UI, Architecture', time: '29:45 m' },
                              { title: 'Building Remote Teams', subject: 'Management, HR', time: '1:58 h' },
                              { title: 'Figma Workshop', subject: 'Professional tools', time: '1:45 h' },
                            ];
                            const colors = ['#4F46E5', '#F59E0B', '#10B981', '#EF4444'];
                            
                            return (
                              <ListItem key={index} sx={{ px: 0, py: 1.5 }}>
                                <ListItemAvatar>
                                  <Avatar
                                    sx={{
                                      width: 40,
                                      height: 40,
                                      backgroundColor: colors[index],
                                    }}
                                  >
                                    <PlayCircleOutlineIcon />
                                  </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                  primary={
                                    <Typography variant="body1" fontWeight="medium">
                                      {lessons[index].title}
                                    </Typography>
                                  }
                                  secondary={
                                    <Typography variant="body2" color="text.secondary">
                                      {lessons[index].subject} • {lessons[index].time}
                                    </Typography>
                                  }
                                />
                              </ListItem>
                            );
                          })}
                        </List>

                        <Box sx={{ mt: 2, textAlign: 'center' }}>
                          <Button
                            variant="text"
                            onClick={() => navigate('/student/courses')}
                            sx={{
                              color: '#4F46E5',
                              fontWeight: 'bold',
                              textTransform: 'none',
                            }}
                          >
                            View learning plan
                          </Button>
                        </Box>
                      </Card>
                    </Zoom>
                  </Grid>
                </Grid>

                {/* Bottom Section */}
                <Grid container spacing={4} sx={{ mt: 2 }}>
                  {/* Teammates Card */}
                  <Grid item xs={12} md={4}>
                    <Zoom in={cardsLoaded} timeout={1000}>
                      <Card
                        sx={{
                          background: 'rgba(255, 255, 255, 0.95)',
                          backdropFilter: 'blur(20px)',
                          borderRadius: 4,
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          p: 3,
                          height: '300px',
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                          <Typography variant="h6" fontWeight="bold">
                            MY TEAMMATES
                          </Typography>
                          <IconButton size="small">
                            <NotificationsIcon />
                          </IconButton>
                        </Box>

                        <List sx={{ py: 0 }}>
                          {[
                            { name: 'Anna Ballard', score: 87, avatar: 'A' },
                            { name: 'Melissa Reelika', score: 76, avatar: 'M' },
                            { name: 'Sam Voulkins', score: 64, avatar: 'S' },
                          ].map((teammate, index) => (
                            <ListItem key={index} sx={{ px: 0, py: 1 }}>
                              <ListItemAvatar>
                                <Avatar
                                  sx={{
                                    width: 40,
                                    height: 40,
                                    background: `linear-gradient(135deg, ${['#4F46E5', '#10B981', '#F59E0B'][index]} 0%, ${['#7C3AED', '#059669', '#D97706'][index]} 100%)`,
                                  }}
                                >
                                  {teammate.avatar}
                                </Avatar>
                              </ListItemAvatar>
                              <ListItemText
                                primary={teammate.name}
                                sx={{ flex: 1 }}
                              />
                              <Typography variant="h6" fontWeight="bold">
                                {teammate.score}
                              </Typography>
                            </ListItem>
                          ))}
                        </List>

                        <Button
                          variant="contained"
                          fullWidth
                          startIcon={<StarIcon />}
                          onClick={() => navigate('/student/section')}
                          sx={{
                            mt: 2,
                            background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                            borderRadius: 3,
                            textTransform: 'none',
                            fontWeight: 'bold',
                            py: 1.5,
                          }}
                        >
                          Improve your skill
                        </Button>
                      </Card>
                    </Zoom>
                  </Grid>

                  {/* Statistics Cards */}
                  <Grid item xs={12} md={8}>
                    <Grid container spacing={3}>
                      {[
                        {
                          title: 'Total Courses',
                          value: statistics.totalCourses,
                          icon: <VideoLibraryIcon sx={{ fontSize: 32 }} />,
                          gradient: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
                        },
                        {
                          title: 'Videos Watched',
                          value: statistics.videosWatched,
                          subtitle: `out of ${statistics.totalVideos}`,
                          icon: <OndemandVideoIcon sx={{ fontSize: 32 }} />,
                          gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                        },
                        {
                          title: 'Quizzes Completed',
                          value: statistics.completedQuizzes,
                          subtitle: statistics.averageScore > 0 ? `Avg: ${statistics.averageScore}%` : '',
                          icon: <BarChartIcon sx={{ fontSize: 32 }} />,
                          gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                        },
                        {
                          title: 'Watch Time',
                          value: formatDuration(statistics.totalWatchTime),
                          icon: <AccessTimeIcon sx={{ fontSize: 32 }} />,
                          gradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                        },
                      ].map((stat, index) => (
                        <Grid item xs={6} md={3} key={index}>
                          <Zoom in={cardsLoaded} timeout={600 + index * 200}>
                            <Card
                              sx={{
                                background: 'rgba(255, 255, 255, 0.95)',
                                backdropFilter: 'blur(20px)',
                                borderRadius: 3,
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                p: 2,
                                textAlign: 'center',
                                height: '140px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                  transform: 'translateY(-8px)',
                                  boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                                },
                              }}
                            >
                              <Box
                                sx={{
                                  width: 50,
                                  height: 50,
                                  borderRadius: 2,
                                  background: stat.gradient,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  mx: 'auto',
                                  mb: 2,
                                  color: 'white',
                                }}
                              >
                                {stat.icon}
                              </Box>
                              <Typography variant="h5" fontWeight="bold" gutterBottom>
                                {stat.value}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {stat.title}
                              </Typography>
                              {stat.subtitle && (
                                <Typography variant="caption" color="text.disabled">
                                  {stat.subtitle}
                                </Typography>
                              )}
                            </Card>
                          </Zoom>
                        </Grid>
                      ))}
                    </Grid>
                  </Grid>
                </Grid>
              </>
            )}
          </Container>
        </Box>
      )}
    </>
  );
};

export default StudentHomeDashboard;