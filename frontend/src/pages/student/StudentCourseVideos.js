import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  Button, 
  CircularProgress, 
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Breadcrumbs,
  Link,
  Paper,
  Chip,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress
} from '@mui/material';
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { formatVideoUrl, formatDuration } from '../../utils/videoUtils';
import CustomVideoPlayer from '../../components/student/CustomVideoPlayer';
import { getCourseVideos, updateWatchHistory, getStudentQuizResults, getDeadlineWarnings } from '../../api/studentVideoApi';

// Icons
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LockIcon from '@mui/icons-material/Lock';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import QuizIcon from '@mui/icons-material/Quiz';
import SchoolIcon from '@mui/icons-material/School';
import WarningIcon from '@mui/icons-material/Warning';

// Function to check if a video is locked (for non-unit based videos)
const isVideoLocked = (index, videos) => {
  // Find the last watched video
  let lastWatchedIndex = -1;
  for (let i = 0; i < videos.length; i++) {
    // Only count videos that have been fully watched
    if (videos[i].watched === true) {
      lastWatchedIndex = i;
    } else {
      // Found the first unwatched video
      break;
    }
  }
  
  // Only unlock the video right after the last watched video
  // or the first video if none are watched yet
  if (index === lastWatchedIndex + 1 || index === 0) {
    console.log(`Video at index ${index} is unlocked (next in sequence)`);
    return false;
  }
  
  console.log(`Video at index ${index} is locked. Last watched index: ${lastWatchedIndex}`);
  return true;
};

const StudentCourseVideos = () => {
  const { courseId, videoId } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  
  const [course, setCourse] = useState(null);
  const [units, setUnits] = useState([]);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentVideo, setCurrentVideo] = useState(null);
  const [videoOpen, setVideoOpen] = useState(false);
  const [videoCompleted, setVideoCompleted] = useState(false);
  const [isUpdatingVideoState, setIsUpdatingVideoState] = useState(false);
  const [expandedUnit, setExpandedUnit] = useState(null);
  const [hasUnits, setHasUnits] = useState(false);
  const [latestUnitAttempts, setLatestUnitAttempts] = useState({}); // unitId -> latest attempt
  const [quizResultsLoading, setQuizResultsLoading] = useState(true);
  const [quizResultsError, setQuizResultsError] = useState(null);
  const [unitQuizStatus, setUnitQuizStatus] = useState({}); // unitId -> { quizCompleted, quizPassed }
  const [deadlineWarnings, setDeadlineWarnings] = useState([]);
  const [deadlineLoading, setDeadlineLoading] = useState(true);
  
  useEffect(() => {
    const fetchCourseAndVideos = async () => {
      try {
        setLoading(true);
        
        // Fetch videos for this course (this API returns both course and videos)
        const videosResponse = await getCourseVideos(courseId, token);
        
        console.log('Student videos response:', videosResponse);
        
        setCourse(videosResponse.course);
        
        // Handle both unit-based and direct video responses
        if (videosResponse.units && videosResponse.units.length > 0) {
          // Course has units - use unit-based display
          console.log('Course has units:', videosResponse.units.length);
          setUnits(videosResponse.units);
          setHasUnits(true);
          
          // Expand the first unlocked unit by default
          const firstUnlockedUnit = videosResponse.units.find(unit => unit.unlocked);
          if (firstUnlockedUnit) {
            setExpandedUnit(firstUnlockedUnit._id);
          }
          
          // Also extract all videos for backward compatibility
          let allVideos = [];
          videosResponse.units.forEach(unit => {
            if (unit.videos && unit.videos.length > 0) {
              allVideos.push(...unit.videos);
            }
          });
          setVideos(allVideos);
          
          console.log('Total videos found:', allVideos.length);
          console.log('Video URLs:', allVideos.map(v => ({ id: v._id, title: v.title, url: v.videoUrl })));

          // Prefetch availability for each unit to derive pass/completed fallback
          try {
            const statuses = {};
            await Promise.all(videosResponse.units.map(async (u) => {
              try {
                const avail = await axios.get(`/api/student/unit/${u._id}/quiz/availability`, {
                  headers: { Authorization: `Bearer ${token}` }
                });
                statuses[u._id] = {
                  quizCompleted: !!avail.data.quizCompleted,
                  quizPassed: !!avail.data.quizPassed,
                  attemptsTaken: typeof avail.data.attemptsTaken === 'number' ? avail.data.attemptsTaken : undefined,
                  remainingAttempts: typeof avail.data.remainingAttempts === 'number' ? avail.data.remainingAttempts : undefined,
                  attemptLimit: typeof avail.data.attemptLimit === 'number' ? avail.data.attemptLimit : 3,
                  isLocked: !!avail.data.isLocked,
                  lockInfo: avail.data.lockInfo || null
                };
              } catch (e) {
                // ignore per-unit errors; keep others
              }
            }));
            setUnitQuizStatus(statuses);
          } catch (availErr) {
            console.warn('Could not prefetch unit availability:', availErr?.response?.data || availErr.message);
          }
        } else if (videosResponse.videos) {
          // Course has direct videos - use old display
          console.log('Course has direct videos:', videosResponse.videos.length);
          setVideos(videosResponse.videos);
          setHasUnits(false);
        }
        
        // Fetch latest quiz results for this course to show marks per unit
        try {
          setQuizResultsLoading(true);
          setQuizResultsError(null);
          const results = await getStudentQuizResults(courseId, token);
          console.log('Quiz results for course:', { courseId, attempts: results?.attempts?.length || 0 });
          if (results && Array.isArray(results.attempts)) {
            const latest = {};
            results.attempts.forEach((a) => {
              if (a.unit && a.unit._id) {
                const uid = a.unit._id;
                const prev = latest[uid];
                if (!prev || new Date(a.completedAt || 0) > new Date(prev.completedAt || 0)) {
                  latest[uid] = a;
                }
              }
            });
            console.log('Latest attempts by unit:', Object.keys(latest));
            setLatestUnitAttempts(latest);
          }
        } catch (resErr) {
          console.warn('Could not load quiz results for marks display:', resErr?.response?.data || resErr.message);
          setQuizResultsError(resErr?.response?.data?.message || resErr.message || 'Failed to load results');
        } finally {
          setQuizResultsLoading(false);
        }

        // If videoId is provided in URL, find and open that video
        if (videoId) {
          let videoToPlay = null;
          if (hasUnits && units.length > 0) {
            // Search in units
            for (const unit of units) {
              videoToPlay = unit.videos.find(v => v._id === videoId);
              if (videoToPlay) break;
            }
          } else {
            // Search in direct videos
            videoToPlay = videos.find(v => v._id === videoId);
          }
          
          if (videoToPlay) {
            setCurrentVideo(videoToPlay);
            setVideoOpen(true);
            
            // Record initial video watch
            updateWatchHistory(videoId, {
              timeSpent: 0.1,
              currentTime: 0,
              duration: videoToPlay.duration
            }, token).catch(err => {
              console.error('Error recording initial video watch:', err);
            });
          }
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching course videos:', err);
        console.error('Error details:', {
          status: err.response?.status,
          statusText: err.response?.statusText,
          data: err.response?.data,
          message: err.message
        });
        
        if (err.response?.status === 403) {
          setError('You are not assigned to this course or do not have permission to view videos.');
        } else if (err.response?.status === 404) {
          setError('Course not found. Please check the course ID.');
        } else if (err.response?.status === 401) {
          setError('Authentication failed. Please log in again.');
        } else {
          setError(`Failed to load course videos: ${err.response?.data?.message || err.message}`);
        }
        setLoading(false);
      }
    };
    
    if (token && courseId) {
      fetchCourseAndVideos();
    }
  }, [token, courseId, videoId, videoCompleted]);

  // Fetch deadline warnings for this course
  useEffect(() => {
    const fetchDeadlineWarnings = async () => {
      try {
        console.log('🔍 CourseVideos: Fetching deadline warnings for course:', courseId);
        if (token && courseId) {
          const warnings = await getDeadlineWarnings(courseId, token);
          console.log('📋 Received course deadline warnings:', warnings);
          setDeadlineWarnings(warnings.warnings || []);
        }
      } catch (error) {
        console.error('❌ Error fetching course deadline warnings:', error);
        setDeadlineWarnings([]);
      } finally {
        setDeadlineLoading(false);
      }
    };

    if (token && courseId) {
      fetchDeadlineWarnings();
    }
  }, [token, courseId]);
  
  const handlePlayVideo = (video) => {
    setCurrentVideo(video);
    setVideoOpen(true);
    
    // Record initial video watch event with a minimal time spent (0.1s to pass validation)
    try {
      if (!token) {
        console.warn('Cannot update watch history: Token is missing');
        return;
      }
      
      updateWatchHistory(video._id, {
        timeSpent: 0.1, // Use 0.1 instead of 0 to pass backend validation
        currentTime: 0,
        duration: video.duration
      }, token);
    } catch (err) {
      console.error('Error recording video watch:', err);
    }
  };

  const handleAccordionChange = (unitId) => (event, isExpanded) => {
    setExpandedUnit(isExpanded ? unitId : null);
  };

  const generateUnitQuiz = async (unitId) => {
    try {
      // Check if token exists
      if (!token) {
        console.error('No authentication token found');
        alert('Authentication token is missing. Please log in again.');
        navigate('/login');
        return;
      }

      console.log('Generating quiz for unit:', unitId);
      // First check if quiz is available
      const availabilityResponse = await axios.get(`/api/student/unit/${unitId}/quiz/availability`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Full quiz availability response:', availabilityResponse.data);
      if (!availabilityResponse.data.available) {
        // Show detailed information about why quiz is not available
        console.error('Quiz not available. Details:', availabilityResponse.data);
        alert(`Quiz is not available.\n\nReason: ${availabilityResponse.data.message || 'Unknown'}\n\nDetails:\n- Total Videos: ${availabilityResponse.data.totalVideos || 'N/A'}\n- Watched Videos: ${availabilityResponse.data.watchedVideos || 'N/A'}\n- All Videos Watched: ${availabilityResponse.data.allVideosWatched || 'false'}\n\nCheck console for more details.`);
        return;
      }
      // Try to generate the quiz
      let response = await axios.post(`/api/student/unit/${unitId}/quiz/generate`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // If incomplete attempt is found, prompt user to destroy or continue
      if (response.data.incomplete && response.data.attemptId) {
        const destroy = window.confirm('You have an incomplete quiz attempt.\nClick OK to start a new quiz (your previous attempt will be deleted), or Cancel to continue your previous attempt.');
        if (destroy) {
          // Regenerate with destroyIncomplete param
          response = await axios.post(`/api/student/unit/${unitId}/quiz/generate?destroyIncomplete=true`, {}, {
            headers: { Authorization: `Bearer ${token}` }
          });
          console.log('After destroyIncomplete, quiz response:', response.data);
        } else {
          // Continue previous attempt
          console.log('Continuing previous attempt, navigating to:', `/student/course/${courseId}/quiz/${response.data.attemptId}`);
          // Explicitly set localStorage again to ensure it's available
          localStorage.setItem('token', token);
          navigate(`/student/course/${courseId}/quiz/${response.data.attemptId}`);
          return;
        }
      }
      // Navigate to quiz page with the attempt ID
      if (response.data && response.data.attemptId) {
        console.log('Quiz generated successfully, attemptId:', response.data.attemptId);
        console.log('About to navigate to:', `/student/course/${courseId}/quiz/${response.data.attemptId}`);
        
        // Debugging
        console.log('DEBUG Navigation: Current path:', window.location.pathname);
        console.log('DEBUG Navigation: Current user:', localStorage.getItem('user'));
        console.log('DEBUG Navigation: Token present:', !!token);
        
        // Force sync to ensure everything is saved to localStorage
        localStorage.setItem('token', token);
        const user = localStorage.getItem('user');
        if (user) {
          localStorage.setItem('user', user); // Re-save to ensure it's not corrupted
        }
        
        // Use direct window location instead of navigate
        try {
          console.log('Using window.location.href for navigation');
          window.location.href = `/student/course/${courseId}/quiz/${response.data.attemptId}`;
          return; // Important: stop execution after redirect
        } catch (navError) {
          console.error('Direct navigation failed:', navError);
          // Fallback to React Router navigate
          console.log('Falling back to React Router navigate');
          navigate(`/student/course/${courseId}/quiz/${response.data.attemptId}`);
        }
      } else {
        console.error('Quiz generation failed or no attemptId:', response.data);
        alert('Quiz generated but no attempt ID received. Please try again.');
      }
    } catch (err) {
      console.error('Error generating quiz:', err);
      if (err.response?.status === 403) {
        const responseData = err.response?.data;
        
        // Check if this is a quiz lock error
        if (responseData?.isLocked) {
          const lockInfo = responseData.lockInfo;
          const authLevel = lockInfo?.unlockAuthorizationLevel === 'DEAN' ? 'Dean' : 'Teacher';
          const remainingUnlocks = lockInfo?.remainingTeacherUnlocks || 0;
          
          let lockMessage = `🔒 Quiz Locked\n\n`;
          lockMessage += `Reason: ${responseData.message}\n\n`;
          lockMessage += `Authorization Required: ${authLevel}\n`;
          
          if (authLevel === 'Teacher' && remainingUnlocks > 0) {
            lockMessage += `Teacher Unlocks Remaining: ${remainingUnlocks}\n\n`;
            lockMessage += `Contact your teacher to request an unlock.`;
          } else if (authLevel === 'Dean') {
            lockMessage += `Teacher unlock limit exceeded.\n\n`;
            lockMessage += `Contact the Dean for authorization.`;
          } else {
            lockMessage += `\nContact your instructor for assistance.`;
          }
          
          alert(lockMessage);
        } else {
          // Regular authorization error
          alert(`Authorization Error: ${responseData?.message || 'You are not authorized to take this quiz. Please complete all videos first.'}\n\nCheck console for more details.`);
        }
      } else if (err.response?.status === 404) {
        alert('Quiz not found for this unit. Please contact your instructor.');
      } else if (err.response?.status === 400) {
        alert(err.response?.data?.message || 'Bad request. Please check if you meet the quiz requirements.');
      } else {
        alert(`Error: ${err.response?.data?.message || 'Error generating quiz. Please try again.'}\n\nStatus: ${err.response?.status || 'Unknown'}\nCheck console for more details.`);
      }
    }
  };

  const renderUnitProgress = (unit) => {
    const totalVideos = unit.videos.length;
    const backendCompletedVideos = unit.progress.videosCompleted;
    const frontendCompletedVideos = unit.videos.filter(v => v.watched).length;
    
    // Use backend count as the authoritative source, fallback to frontend calculation
    const completedVideos = typeof backendCompletedVideos === 'number' ? backendCompletedVideos : frontendCompletedVideos;
    const progressPercentage = totalVideos > 0 ? (completedVideos / totalVideos) * 100 : 0;
    
    console.log('Unit progress calculation:', {
      unitId: unit._id,
      totalVideos,
      backendCompletedVideos,
      frontendCompletedVideos,
      usingCompletedVideos: completedVideos,
      progressPercentage
    });
    
    return (
      <Box sx={{ mt: 1, mb: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
          Progress: {completedVideos}/{totalVideos} videos completed ({Math.round(progressPercentage)}%)
          {backendCompletedVideos !== frontendCompletedVideos && (
            <Typography component="span" color="warning.main" sx={{ ml: 1, fontSize: '0.75rem' }}>
              (Frontend: {frontendCompletedVideos})
            </Typography>
          )}
        </Typography>
        <LinearProgress 
          variant="determinate" 
          value={progressPercentage} 
          sx={{ height: 8, borderRadius: 5 }}
        />
      </Box>
    );
  };

  const renderQuizSection = (unit) => {
    const frontendWatchedVideos = unit.videos.filter(v => v.watched).length;
    const backendCompletedVideos = unit.progress?.videosCompleted;
    
    // Use backend count as the authoritative source, fallback to frontend calculation
    const actualWatchedVideos = typeof backendCompletedVideos === 'number' ? backendCompletedVideos : frontendWatchedVideos;
    const allVideosWatched = actualWatchedVideos === unit.videos.length && unit.videos.length > 0;
    const hasCompletedVideos = actualWatchedVideos > 0;
    const quizCompleted = unit.progress && unit.progress.unitQuizCompleted;
    // Prefer central results API; fallback to unit.progress.latestQuizAttempt
    const latestAttempt = latestUnitAttempts[unit._id] || (unit.progress && unit.progress.latestQuizAttempt ? {
      percentage: unit.progress.latestQuizAttempt.percentage,
      passed: unit.progress.latestQuizAttempt.passed,
      completedAt: unit.progress.latestQuizAttempt.completedAt
    } : null);
    const quizPassedFlag = (unit.progress && unit.progress.unitQuizPassed) || (unitQuizStatus[unit._id]?.quizPassed) || false;
    const quizCompletedFlag = (unit.progress && unit.progress.unitQuizCompleted) || (unitQuizStatus[unit._id]?.quizCompleted) || false;

    // Derive a single attempt object if available from either source
  const attemptToShow = latestAttempt;
  const avail = unitQuizStatus[unit._id] || {};
  const attemptsTaken = typeof avail.attemptsTaken === 'number' ? avail.attemptsTaken : undefined;
  const remainingAttempts = typeof avail.remainingAttempts === 'number' ? avail.remainingAttempts : undefined;
  const attemptLimit = typeof avail.attemptLimit === 'number' ? avail.attemptLimit : 3;
  const isLocked = !!avail.isLocked;
  const lockInfo = avail.lockInfo;
    return (
      <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <QuizIcon color={allVideosWatched ? "primary" : "disabled"} />
          <Typography variant="h6">Unit Quiz</Typography>
          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
            {attemptToShow ? (
              <>
                <Chip
                  label={`${Math.round(attemptToShow.percentage)}%`}
                  color={attemptToShow.passed ? 'success' : 'error'}
                  size="small"
                />
                <Typography variant="body2" color="text.secondary">
                  {attemptToShow.completedAt ? new Date(attemptToShow.completedAt).toLocaleDateString() : ''}
                </Typography>
              </>
            ) : quizResultsLoading ? (
              <Typography variant="body2" color="text.secondary">Loading…</Typography>
            ) : (quizPassedFlag || quizCompletedFlag) ? (
              <>
                <Chip
                  label={quizPassedFlag ? 'Passed' : 'Failed'}
                  color={quizPassedFlag ? 'success' : 'error'}
                  size="small"
                />
              </>
            ) : quizResultsError ? (
              <Typography variant="body2" color="error">Results unavailable</Typography>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No attempt yet
              </Typography>
            )}
            {/* Attempts counter (when available) */}
            {typeof attemptsTaken === 'number' && (
              <Chip
                label={`Attempts: ${attemptsTaken}/${attemptLimit}`}
                color={attemptsTaken >= attemptLimit ? 'error' : 'default'}
                size="small"
              />
            )}
          </Box>
        </Box>
        {!allVideosWatched ? (
          <Alert severity="info">
            Complete all {unit.videos.length} videos in this unit to unlock the quiz. 
            ({hasCompletedVideos}/{unit.videos.length} completed)
          </Alert>
        ) : quizPassedFlag ? (
          <Alert severity="success">
            You have passed this unit's quiz. The next unit is now unlocked!
          </Alert>
        ) : (
          <Box sx={{ mt: 1 }}>
            {isLocked && (
              <Alert severity="warning" sx={{ mb: 1 }}>
                This unit quiz is locked due to security violations. {lockInfo?.reason ? `Reason: ${lockInfo.reason}.` : ''}
                Please contact your administrator to unlock this section.
              </Alert>
            )}
            {quizCompletedFlag && (
              <Alert severity="error" sx={{ mb: 1 }}>
                You completed the quiz but did not pass. Review the content and try again.
              </Alert>
            )}
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              • 10 random questions<br/>
              • 70% passing score required<br/>
              • Unlock next unit upon passing
            </Typography>
            <Button
              variant="contained"
              startIcon={<QuizIcon />}
              onClick={() => generateUnitQuiz(unit._id)}
              color="primary"
              sx={{ mr: 2 }}
              disabled={quizPassedFlag || isLocked || (typeof remainingAttempts === 'number' && remainingAttempts <= 0)}
            >
              {typeof remainingAttempts === 'number' ? `Take Unit Quiz (${Math.max(0, remainingAttempts)} left)` : 'Take Unit Quiz'}
            </Button>
            {/* Temporary debug button to force update progress */}
            <Button
              variant="outlined"
              color="secondary"
              size="small"
              onClick={async () => {
                try {
                  console.log('Force updating video progress for unit:', unit._id);
                  // Force update all videos in the unit as completed
                  for (const video of unit.videos) {
                    if (video.watched) {
                      console.log('Force updating video:', video._id);
                      const response = await axios.post(`/api/student/video/${video._id}/watch`, {
                        timeSpent: video.duration || 0,
                        currentTime: video.duration || 0,
                        duration: video.duration || 0,
                        completed: true
                      }, {
                        headers: { Authorization: `Bearer ${token}` }
                      });
                      console.log('Force update response:', response.data);
                    }
                  }
                  alert('Force update completed. Try taking the quiz again.');
                  window.location.reload();
                } catch (err) {
                  console.error('Error during force update:', err);
                  alert('Error during force update: ' + (err.response?.data?.message || err.message));
                }
              }}
            >
              🔧 Force Update Progress
            </Button>
          </Box>
        )}
      </Box>
    );
  };


  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
        <Link component={RouterLink} to="/student" color="inherit">
          Dashboard
        </Link>
        <Link component={RouterLink} to="/student/courses" color="inherit">
          My Courses
        </Link>
        <Typography color="text.primary">
          {hasUnits ? 'Course Units' : 'Course Videos'}
        </Typography>
      </Breadcrumbs>

      {/* Course Deadline Warnings */}
      {console.log('🎨 Rendering course deadline section. deadlineLoading:', deadlineLoading, 'deadlineWarnings:', deadlineWarnings)}
      {deadlineLoading ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          Loading deadline information...
        </Alert>
      ) : deadlineWarnings && deadlineWarnings.length > 0 && (
        <Alert 
          severity={deadlineWarnings.some(w => w.isExpired) ? "error" : "warning"} 
          sx={{ mb: 3 }}
          icon={<WarningIcon />}
        >
          <Typography variant="h6" gutterBottom>
            {deadlineWarnings.some(w => w.isExpired) ? "⚠️ Urgent Deadline Alerts!" : "📅 Course Deadlines"}
          </Typography>
          <Typography variant="body2" paragraph>
            This course has {deadlineWarnings.length} deadline{deadlineWarnings.length !== 1 ? 's' : ''} requiring attention
            {deadlineWarnings.some(w => w.isExpired) && (
              <span style={{ fontWeight: 'bold', color: '#d32f2f' }}>
                {' '}({deadlineWarnings.filter(w => w.isExpired).length} expired!)
              </span>
            )}
          </Typography>
          <List dense>
            {deadlineWarnings.map((warning) => (
              <ListItem key={warning.unitId}>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="subtitle2">
                        {warning.unitTitle}
                      </Typography>
                      <Chip
                        size="small"
                        label={warning.isExpired ? 'EXPIRED' : `${warning.daysLeft} days left`}
                        color={warning.isExpired ? 'error' : warning.daysLeft <= 1 ? 'warning' : 'info'}
                      />
                    </Box>
                  }
                  secondary={
                    <Typography variant="body2" color="text.secondary">
                      Deadline: {new Date(warning.deadline).toLocaleDateString()} at{' '}
                      {new Date(warning.deadline).toLocaleTimeString()}
                      {warning.deadlineDescription && ` - ${warning.deadlineDescription}`}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Alert>
      )}
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : !course ? (
        <Typography variant="body1">
          Course not found or you don't have access to this course.
        </Typography>
      ) : (
        <>
          <Typography variant="h4" gutterBottom>
            {course.title}
          </Typography>
          
          <Typography variant="subtitle1" color="text.secondary" paragraph>
            Course Code: {course.courseCode}
          </Typography>
          
          <Grid container spacing={4}>
            {/* Current/Selected Video Player */}
            {videoOpen && currentVideo && (
              <Grid item xs={12}>
                <Paper sx={{ p: 2, mb: 3 }}>
                  <Typography variant="h5" gutterBottom>
                    {currentVideo.title}
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <CustomVideoPlayer 
                      videoId={currentVideo._id}
                      videoUrl={currentVideo.videoUrl.startsWith('http') ? currentVideo.videoUrl : formatVideoUrl(currentVideo.videoUrl)}
                      title={currentVideo.title}
                      token={token}
                      onTimeUpdate={(currentTime, duration) => {
                        // Update the local duration if different from what's stored
                        if (duration > 0 && Math.abs(currentVideo.duration - duration) > 1) {
                          console.log(`Updating video duration in parent: ${duration}s`);
                          setCurrentVideo(prev => ({
                            ...prev,
                            duration: duration
                          }));
                        }
                      }}
                      onVideoComplete={(videoId, duration) => {
                        console.log(`Video ${videoId} completed - updating backend and refreshing videos list`);
                        console.log('Current video state:', { videoId, duration, isUpdatingVideoState });
                        if (isUpdatingVideoState) {
                          console.log('Already updating video state, ignoring duplicate completion event');
                          return;
                        }
                        console.log('Starting video completion update process');
                        setIsUpdatingVideoState(true);
                        // Mark as watched locally
                        setCurrentVideo(prev => ({ ...prev, watched: true }));
                        if (hasUnits) {
                          setUnits(prevUnits => prevUnits.map(unit => ({
                            ...unit,
                            videos: unit.videos.map(video => video._id === videoId ? { ...video, watched: true, completedAt: new Date().toISOString() } : video)
                          })));
                        } else {
                          setVideos(prevVideos => prevVideos.map(video => video._id === videoId ? { ...video, watched: true, completedAt: new Date().toISOString() } : video));
                        }
                        // Call backend to mark as completed
                        const payload = {
                          timeSpent: duration || currentVideo.duration || 0, // Use actual duration, not 9999
                          currentTime: duration || currentVideo.duration || 0, // Use full duration
                          duration: currentVideo.duration || duration || 0,
                          completed: true, // Explicitly mark as completed
                          isCompleted: true // Add this flag for better backend handling
                        };
                        console.log('Calling updateWatchHistory with:', payload);
                        console.log('Current video details:', currentVideo);
                        
                        updateWatchHistory(videoId, payload, token)
                          .then(response => {
                            console.log('Watch history update successful:', response);
                            setVideoCompleted(prev => !prev);
                            // Delay reload slightly to ensure backend has processed the update
                            setTimeout(() => {
                              window.location.reload();
                            }, 500);
                          })
                          .catch(error => {
                            console.error('Error updating watch history:', error);
                          })
                          .finally(() => {
                            setTimeout(() => {
                              setIsUpdatingVideoState(false);
                            }, 1000);
                          });
                      }}
                    />
                  </Box>
                  
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Your progress is automatically tracked while watching. 
                    {hasUnits && ' Complete all videos in a unit to unlock the quiz.'}
                  </Alert>
                  
                  <Typography variant="body1" paragraph>
                    {currentVideo.description}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Chip 
                      icon={<AccessTimeIcon />} 
                      label={`Duration: ${formatDuration(currentVideo.duration)}`} 
                    />
                    
                    {currentVideo.watched && (
                      <Chip 
                        icon={<CheckCircleIcon />} 
                        color="success" 
                        label="Watched" 
                      />
                    )}
                  </Box>
                </Paper>
              </Grid>
            )}
            
            {/* Main Content - Units or Videos */}
            <Grid item xs={12}>
              {hasUnits ? (
                // Unit-based display
                <>
                  <Typography variant="h5" gutterBottom>
                    Course Units ({units.length})
                  </Typography>
                  
                  {units.length === 0 ? (
                    <Typography variant="body1">
                      No units available for this course yet.
                    </Typography>
                  ) : (
                    <Box>
                      {units.map((unit, index) => (
                        <Accordion 
                          key={unit._id}
                          expanded={expandedUnit === unit._id}
                          onChange={handleAccordionChange(unit._id)}
                          disabled={!unit.unlocked}
                          sx={{ 
                            mb: 2,
                            opacity: unit.unlocked ? 1 : 0.6,
                            '&.Mui-disabled': {
                              backgroundColor: 'action.disabledBackground'
                            }
                          }}
                        >
                          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {unit.unlocked ? (
                                  unit.progress.status === 'completed' ? (
                                    <CheckCircleIcon color="success" />
                                  ) : (
                                    <SchoolIcon color="primary" />
                                  )
                                ) : (
                                  <LockIcon color="disabled" />
                                )}
                                <Typography variant="h6">
                                  Unit {index + 1}: {unit.title}
                                </Typography>
                              </Box>
                              
                              <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
                                <Chip 
                                  size="small" 
                                  label={`${unit.videos.length} videos`}
                                  color="default"
                                />
                                <Chip 
                                  size="small" 
                                  label={unit.progress.status}
                                  color={
                                    unit.progress.status === 'completed' ? 'success' :
                                    unit.progress.status === 'in-progress' ? 'primary' : 'default'
                                  }
                                />
                                {!unit.unlocked && (
                                  <Chip size="small" label="Locked" color="default" />
                                )}
                              </Box>
                            </Box>
                          </AccordionSummary>
                          
                          <AccordionDetails>
                            <Box>
                              <Typography variant="body1" paragraph>
                                {unit.description}
                              </Typography>
                              
                              {renderUnitProgress(unit)}
                              
                              {/* Videos List */}
                              <Typography variant="h6" gutterBottom>
                                Videos ({unit.videos.length})
                              </Typography>
                              
                              {unit.videos.length === 0 ? (
                                <Typography variant="body2" color="text.secondary">
                                  No videos in this unit yet.
                                </Typography>
                              ) : (
                                <List>
                                  {unit.videos.map((video, videoIndex) => {
                                    // Check if this video is locked
                                    const isVideoLocked = videoIndex > 0 && !unit.videos[videoIndex - 1].watched;
                                    
                                    return (
                                      <ListItem 
                                        key={video._id}
                                        sx={{ 
                                          cursor: isVideoLocked ? 'not-allowed' : 'pointer',
                                          opacity: isVideoLocked ? 0.6 : 1,
                                          '&:hover': { 
                                            bgcolor: isVideoLocked ? 'inherit' : 'action.hover' 
                                          },
                                          borderRadius: 1,
                                          mb: 1,
                                          border: isVideoLocked ? '1px dashed #ccc' : 'none'
                                        }}
                                        onClick={() => !isVideoLocked && handlePlayVideo(video)}
                                      >
                                        <ListItemIcon>
                                          {isVideoLocked ? (
                                            <LockIcon color="disabled" />
                                          ) : video.watched ? (
                                            <CheckCircleIcon color="success" />
                                          ) : (
                                            <PlayCircleOutlineIcon color="primary" />
                                          )}
                                        </ListItemIcon>
                                        
                                        <ListItemText
                                          primary={
                                            <Typography variant="subtitle1">
                                              {videoIndex + 1}. {video.title}
                                              {video.watched && (
                                                <Chip 
                                                  size="small" 
                                                  label="Watched" 
                                                  color="success" 
                                                  sx={{ ml: 1 }} 
                                                />
                                              )}
                                              {isVideoLocked && (
                                                <Chip 
                                                  size="small" 
                                                  label="Locked" 
                                                  color="default" 
                                                  sx={{ ml: 1 }} 
                                                />
                                              )}
                                            </Typography>
                                          }
                                          secondary={
                                            <Box component="div">
                                              <Typography component="div" variant="body2" color="text.primary">
                                                Duration: {formatDuration(video.duration || 0)}
                                              </Typography>
                                              
                                              {isVideoLocked ? (
                                                <Typography component="div" variant="body2" color="text.secondary">
                                                  Complete the previous video to unlock this one
                                                </Typography>
                                              ) : (
                                                <>
                                              {video.timeSpent > 0 && (
                                                <Typography component="div" variant="body2" color="text.secondary">
                                                  Watched: {Math.floor(video.timeSpent / 60)}m {Math.floor(video.timeSpent % 60)}s
                                                  {video.duration > 0 && video.timeSpent > 0 && (
                                                    <> ({Math.min(100, Math.round((video.timeSpent / video.duration) * 100))}%)</>
                                                  )}
                                                </Typography>
                                              )}                                                  {video.description && (
                                                    <Typography component="div" variant="body2" color="text.secondary">
                                                      {video.description.substring(0, 100)}
                                                      {video.description.length > 100 ? '...' : ''}
                                                    </Typography>
                                                  )}
                                                </>
                                              )}
                                            </Box>
                                          }
                                        />
                                        
                                        <Button 
                                          variant="outlined" 
                                          color="primary" 
                                          size="small"
                                          disabled={isVideoLocked}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            !isVideoLocked && handlePlayVideo(video);
                                          }}
                                        >
                                          {isVideoLocked ? 'Locked' : (video.watched ? 'Rewatch' : 'Watch')}
                                        </Button>
                                      </ListItem>
                                    );
                                  })}
                                </List>
                              )}
                              
                              {/* Quiz Section */}
                              {renderQuizSection(unit)}
                            </Box>
                          </AccordionDetails>
                        </Accordion>
                      ))}
                    </Box>
                  )}
                </>
              ) : (
                // Direct videos display (legacy)
                <>
                  <Typography variant="h6" gutterBottom>
                    Videos ({videos.length})
                  </Typography>
                  
                  {videos.length === 0 ? (
                    <Typography variant="body1">
                      No videos available for this course yet.
                    </Typography>
                  ) : (
                    <List sx={{ bgcolor: 'background.paper' }}>
                      {videos.map((video, index) => {
                        const locked = isVideoLocked(index, videos);
                        
                        return (
                          <React.Fragment key={video._id}>
                            <ListItem 
                              alignItems="flex-start"
                              sx={{ 
                                cursor: locked ? 'not-allowed' : 'pointer',
                                opacity: locked ? 0.7 : 1,
                                '&:hover': {
                                  bgcolor: locked ? 'inherit' : 'action.hover'
                                }
                              }}
                              onClick={() => !locked && handlePlayVideo(video)}
                            >
                              <ListItemIcon>
                                {locked ? (
                                  <LockIcon color="action" />
                                ) : video.watched ? (
                                  <CheckCircleIcon color="success" />
                                ) : (
                                  <PlayCircleOutlineIcon color="primary" />
                                )}
                              </ListItemIcon>
                              
                              <ListItemText
                                primary={
                                  <Typography variant="subtitle1">
                                    {index + 1}. {video.title}
                                    {video.watched && (
                                      <Chip 
                                        size="small" 
                                        label="Watched" 
                                        color="success" 
                                        sx={{ ml: 1 }} 
                                      />
                                    )}
                                    {locked && (
                                      <Chip 
                                        size="small" 
                                        label="Locked" 
                                        color="default" 
                                        sx={{ ml: 1 }} 
                                      />
                                    )}
                                  </Typography>
                                }
                                secondary={
                                  <Box component="div">
                                    <Typography component="div" variant="body2" color="text.primary">
                                      Duration: {formatDuration(video.duration || 0)}
                                    </Typography>
                                    
                                    {/* Add progress bar for each video */}
                                    {!locked && video.duration > 0 && (
                                      <Box sx={{ mt: 1, mb: 1 }}>
                                        <Typography component="div" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                          Progress: {Math.min(100, Math.round((video.timeSpent / video.duration) * 100))}%
                                        </Typography>
                                        <Box sx={{ width: '100%', mr: 1 }}>
                                          <Box
                                            sx={{
                                              width: '100%',
                                              height: 8,
                                              bgcolor: 'grey.300',
                                              borderRadius: 5,
                                              position: 'relative'
                                            }}
                                          >
                                            <Box
                                              sx={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                height: '100%',
                                                borderRadius: 5,
                                                bgcolor: video.watched ? 'success.main' : 'primary.main',
                                                width: `${Math.min(100, Math.round((video.timeSpent / video.duration) * 100))}%`,
                                                transition: 'width 0.5s ease-in-out'
                                              }}
                                            />
                                          </Box>
                                        </Box>
                                      </Box>
                                    )}
                                    
                                    {video.timeSpent > 0 && (
                                      <Typography component="div" variant="body2" color="text.secondary">
                                        Watched: {Math.floor(video.timeSpent / 60)}m {Math.floor(video.timeSpent % 60)}s
                                        {video.duration > 0 && video.timeSpent > 0 && (
                                          <> ({Math.min(100, Math.round((video.timeSpent / video.duration) * 100))}%)</>
                                        )}
                                      </Typography>
                                    )}
                                    {video.completedAt && (
                                      <Typography component="div" variant="body2" color="text.secondary">
                                        Completed: {new Date(video.completedAt).toLocaleDateString()}
                                      </Typography>
                                    )}
                                    {video.description && (
                                      <Typography component="div" variant="body2" color="text.secondary">
                                        {video.description.substring(0, 100)}
                                        {video.description.length > 100 ? '...' : ''}
                                      </Typography>
                                    )}
                                  </Box>
                                }
                              />
                              
                              <Button 
                                variant="outlined" 
                                color="primary" 
                                size="small"
                                sx={{ mt: 1 }}
                                disabled={locked}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  !locked && handlePlayVideo(video);
                                }}
                              >
                                {video.watched ? 'Rewatch' : 'Watch'}
                              </Button>
                            </ListItem>
                            
                            {index < videos.length - 1 && <Divider variant="inset" component="li" />}
                          </React.Fragment>
                        );
                      })}
                    </List>
                  )}
                </>
              )}
            </Grid>
          </Grid>
        </>
      )}
    </Container>
  );
};

export default StudentCourseVideos;
