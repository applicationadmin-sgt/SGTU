import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  Typography,
  Paper,
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  LinearProgress,
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Chip,
  Grid,
  Breadcrumbs,
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import FlagIcon from '@mui/icons-material/Flag';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import QuizIcon from '@mui/icons-material/Quiz';
import axios from 'axios';
import { Link as RouterLink } from 'react-router-dom';
import { restoreUserFromToken, isAuthenticated, getCurrentUser } from '../../utils/authService';

const StudentQuizPage = ({ user: userProp, token: tokenProp }) => {
  const { attemptId, courseId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get token from various sources in priority order
  const getToken = () => {
    // 1. From props
    if (tokenProp) return tokenProp;
    
    // 2. From localStorage
    const localToken = localStorage.getItem('token');
    if (localToken) return localToken;
    
    // 3. No token found
    console.error('No authentication token found from any source');
    return null;
  };
  
  // Initialize token state
  const [token, setToken] = useState(getToken());
  // Track user state
  const [user, setUser] = useState(userProp || getCurrentUser());
  // Debug mode
  const [debug] = useState(true);
  
  // Log important information when in debug mode
  useEffect(() => {
    if (debug) {
      console.group('StudentQuizPage Debug Info');
      console.log('Page Load Time:', new Date().toISOString());
      console.log('Attempt ID:', attemptId);
      console.log('Course ID:', courseId);
      console.log('Token present:', !!token);
      console.log('User present:', !!user);
      console.log('Current path:', window.location.pathname);
      console.log('isAuthenticated():', isAuthenticated());
      console.log('localStorage token present:', !!localStorage.getItem('token'));
      console.log('localStorage user present:', !!localStorage.getItem('user'));
      console.groupEnd();
    }
  }, [debug, attemptId, courseId, token, user]);
  
  // Check authentication on mount and restore user from token if needed
  useEffect(() => {
    console.log('StudentQuizPage: Authentication check running');
    
    // If no token, try to restore it
    if (!token) {
      console.warn('StudentQuizPage: No token in state, trying to restore');
      const restoredToken = getToken();
      if (restoredToken) {
        console.log('StudentQuizPage: Token restored from alternate source');
        setToken(restoredToken);
        return; // Exit early as the next effect run will handle user restoration
      } else {
        console.error('StudentQuizPage: Failed to restore token, redirecting to login');
        navigate('/login', { state: { from: location } });
        return;
      }
    }
    
    // Restore user from token if not already available
    if (!user && token) {
      console.log('StudentQuizPage: Attempting to restore user from token');
      const restoredUser = restoreUserFromToken();
      console.log('StudentQuizPage: User restored from token:', !!restoredUser);
      
      if (restoredUser) {
        setUser(restoredUser);
      } else {
        console.error('StudentQuizPage: Failed to restore user from token');
        navigate('/login', { state: { from: location } });
      }
    }
  }, [token, navigate, user, location]);
  
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [markedForReview, setMarkedForReview] = useState(new Set());
  const [timeLeft, setTimeLeft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [endsAtTs, setEndsAtTs] = useState(null); // absolute end timestamp (ms)
  // Security monitoring state
  const [violations, setViolations] = useState([]);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const [warningCount, setWarningCount] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [warningCountdown, setWarningCountdown] = useState(0);
  const [windowMinimizeCount, setWindowMinimizeCount] = useState(0);
  const quizContainerRef = useRef(null);
  const keyBlockCountRef = useRef(0);
  const awayTimerRef = useRef(null);
  const awayStartRef = useRef(null);
  const fsExitCountRef = useRef(0);
  const prevFsRef = useRef(false);
  const quizActiveRef = useRef(true);
  const lastVisHiddenRef = useRef(false);
  const warningTimerRef = useRef(null);

  // Monitor tab switch count for auto-submit
  useEffect(() => {
    console.log('🔢 TAB SWITCH COUNT CHANGED TO:', tabSwitchCount);
    if (tabSwitchCount >= 3 && !autoSubmitted && !submitted) {
      console.log('🚫 TAB SWITCH LIMIT EXCEEDED! Triggering auto-submit...');
      triggerAutoSubmit(`Tab switch limit exceeded (${tabSwitchCount}/3)`);
    }
  }, [tabSwitchCount, autoSubmitted, submitted]);

  // Security state persistence functions
  const getSecurityStateKey = () => `quiz_security_${attemptId}`;
  
  const saveSecurityState = (customValues = {}) => {
    const securityState = {
      violations: customValues.violations || violations,
      tabSwitchCount: customValues.tabSwitchCount || tabSwitchCount,
      warningCount: customValues.warningCount !== undefined ? customValues.warningCount : warningCount,
      fsExitCount: customValues.fsExitCount !== undefined ? customValues.fsExitCount : fsExitCountRef.current,
      keyBlockCount: customValues.keyBlockCount !== undefined ? customValues.keyBlockCount : keyBlockCountRef.current,
      windowMinimizeCount: customValues.windowMinimizeCount || windowMinimizeCount,
      timestamp: Date.now()
    };
    localStorage.setItem(getSecurityStateKey(), JSON.stringify(securityState));
    console.log('💾 Security state saved:', securityState);
    console.log('🚨 Warning count saved:', securityState.warningCount);
  };
  
  const restoreSecurityState = () => {
    try {
      const saved = localStorage.getItem(getSecurityStateKey());
      if (saved) {
        const state = JSON.parse(saved);
        setViolations(state.violations || []);
        setTabSwitchCount(state.tabSwitchCount || 0);
        setWarningCount(state.warningCount || 0);
        setWindowMinimizeCount(state.windowMinimizeCount || 0);
        fsExitCountRef.current = state.fsExitCount || 0;
        keyBlockCountRef.current = state.keyBlockCount || 0;
        console.log('🔒 Security state restored:', state);
        console.log('🚨 Warning count restored:', state.warningCount || 0);
      } else {
        console.log('🔒 No security state found to restore');
      }
    } catch (error) {
      console.error('❌ Failed to restore security state:', error);
    }
  };
  
  const clearSecurityState = () => {
    localStorage.removeItem(getSecurityStateKey());
  };

  const showSecurityWarning = (violationType, message) => {
    if (warningCount >= 3) {
      // Already reached max warnings, auto-submit immediately
      triggerAutoSubmit('Maximum security warnings reached');
      return;
    }
    
    const newWarningCount = warningCount + 1;
    setWarningCount(newWarningCount);
    setShowWarning(true);
    setWarningCountdown(15);
    
    addViolation(violationType, { 
      warning: newWarningCount, 
      message,
      countdown: 15
    });
    
    // Save security state immediately with the new warning count
    saveSecurityState({ warningCount: newWarningCount });
    
    // Clear any existing warning timer
    if (warningTimerRef.current) {
      clearInterval(warningTimerRef.current);
    }
    
    // Start countdown timer
    let countdown = 15;
    warningTimerRef.current = setInterval(() => {
      countdown--;
      setWarningCountdown(countdown);
      
      if (countdown <= 0) {
        clearInterval(warningTimerRef.current);
        setShowWarning(false);
        
        if (newWarningCount >= 3) {
          triggerAutoSubmit('Three security warnings - final warning expired');
        }
      }
    }, 1000);
  };

  const dismissWarning = () => {
    if (warningTimerRef.current) {
      clearInterval(warningTimerRef.current);
    }
    setShowWarning(false);
    setWarningCountdown(0);
  };

  const addViolation = (type, details = {}) => {
    const newViolation = { type, details, at: Date.now() };
    const newViolations = [...violations, newViolation];
    setViolations(newViolations);
    
    // Save security state with the new violation
    saveSecurityState({ violations: newViolations });
  };

  const triggerAutoSubmit = (reason, currentTabCount = null) => {
    if (autoSubmitted || submitted) return;
    setAutoSubmitted(true);
    addViolation('auto-submit', { reason });
    // Clear any warning timers
    if (warningTimerRef.current) {
      clearInterval(warningTimerRef.current);
    }
    setShowWarning(false);
    
    // Use the provided tab count or current state
    const actualTabCount = currentTabCount !== null ? currentTabCount : tabSwitchCount;
    console.log(`🚨 Auto-submit triggered with tab count: ${actualTabCount}`);
    
    // Defer slightly to let violation record flush to state
    setTimeout(() => {
      handleSubmitQuiz(true, actualTabCount);
    }, 250);
  };

  // Simple fullscreen support for legacy page
  const enterFullscreen = async () => {
    const el = quizContainerRef.current || document.documentElement;
    try {
      let p;
      if (el.requestFullscreen) {
        p = el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        p = el.webkitRequestFullscreen();
      } else if (el.mozRequestFullScreen) {
        p = el.mozRequestFullScreen();
      } else if (el.msRequestFullscreen) {
        p = el.msRequestFullscreen();
      }
      
      if (p && typeof p.then === 'function') {
        await p;
      }
      return true;
    } catch (err) {
      // Only record as violation if it's not a permission issue
      const errorMessage = err?.message || String(err);
      if (!errorMessage.includes('Permissions check failed') && 
          !errorMessage.includes('Permission denied') &&
          !errorMessage.includes('denied by the user agent') &&
          !errorMessage.includes('not allowed')) {
        addViolation('fullscreen-error', { message: errorMessage });
      }
      console.log('Fullscreen request failed (not counted as violation):', errorMessage);
      return false;
    }
  };
  const exitFullscreen = () => {
    try {
      const p = document.exitFullscreen
        ? document.exitFullscreen()
        : document.webkitExitFullscreen
        ? document.webkitExitFullscreen()
        : document.mozCancelFullScreen
        ? document.mozCancelFullScreen()
        : document.msExitFullscreen
        ? document.msExitFullscreen()
        : undefined;
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (_) {}
  };

  // Important: this hook must be declared before any conditional returns
  useEffect(() => {
    const onFsChange = () => {
      const fs = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
      setIsFullscreen(fs);
      // Detect FS exit events for violation logging
      if (prevFsRef.current && !fs) {
        fsExitCountRef.current += 1;
        // Save the new fullscreen exit count immediately
        saveSecurityState({ fsExitCount: fsExitCountRef.current });
        showSecurityWarning(
          'fullscreen-exit', 
          `Warning ${warningCount + 1}/3: You exited fullscreen mode. Return to fullscreen immediately.`
        );
      }
      prevFsRef.current = fs;
    };
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    document.addEventListener('mozfullscreenchange', onFsChange);
    document.addEventListener('MSFullscreenChange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
      document.removeEventListener('mozfullscreenchange', onFsChange);
      document.removeEventListener('MSFullscreenChange', onFsChange);
    };
  }, []);

  // Auto-enter fullscreen: arm one-time user-gesture listeners after quiz loads
  useEffect(() => {
    if (!quiz) return;
    const attemptAutoFs = () => {
      if (!document.fullscreenElement && quizContainerRef.current) {
        enterFullscreen();
      }
      window.removeEventListener('pointerdown', attemptAutoFs, true);
      window.removeEventListener('keydown', attemptAutoFs, true);
    };
    // In case navigation click still counts as gesture in some browsers
    setTimeout(() => {
      if (!document.fullscreenElement && quizContainerRef.current) {
        enterFullscreen();
      }
    }, 100);
    window.addEventListener('pointerdown', attemptAutoFs, true);
    window.addEventListener('keydown', attemptAutoFs, true);
    return () => {
      window.removeEventListener('pointerdown', attemptAutoFs, true);
      window.removeEventListener('keydown', attemptAutoFs, true);
    };
  }, [quiz]);

  // Security: monitor tab switching, keyboard, context menu, clipboard, and basic devtools
  useEffect(() => {
    quizActiveRef.current = !submitted;
  }, [submitted]);

  useEffect(() => {
    if (!quizActiveRef.current) return;

    const startAwayTimer = () => {
      awayStartRef.current = Date.now();
      // Auto-submit if away for >= 15s
      if (awayTimerRef.current) clearTimeout(awayTimerRef.current);
      awayTimerRef.current = setTimeout(() => {
        showSecurityWarning(
          'suspicious-timing', 
          `Warning ${warningCount + 1}/3: You've been away from the quiz for too long.`
        );
      }, 15000);
    };

    const clearAwayTimer = () => {
      if (awayTimerRef.current) {
        clearTimeout(awayTimerRef.current);
        awayTimerRef.current = null;
      }
    };

    const onVisibility = () => {
      if (document.hidden) {
        lastVisHiddenRef.current = true;
        startAwayTimer();
        // Additional check for minimization when page becomes hidden
        if (window.outerHeight <= 100 || window.outerWidth <= 100) {
          showSecurityWarning(
            'window-minimize', 
            `Warning ${warningCount + 1}/3: Do not minimize the browser window during the quiz.`
          );
        }
      } else {
        if (lastVisHiddenRef.current) {
          lastVisHiddenRef.current = false;
          const awayMs = awayStartRef.current ? Date.now() - awayStartRef.current : 0;
          clearAwayTimer();
          setTabSwitchCount((c) => {
            const next = c + 1;
            console.log(`🔢 TAB SWITCH DETECTED! Count: ${c} -> ${next}`);
            
            // Save the new count immediately with the updated value
            setTimeout(() => saveSecurityState({ tabSwitchCount: next }), 0);
            
            // Check if we've reached the limit for auto-submit
            if (next >= 3) {
              console.log('🚫 TAB SWITCH LIMIT REACHED! Auto-submitting...');
              triggerAutoSubmit(`Maximum tab switches reached (${next})`, next);
              return next;
            }
            
            showSecurityWarning(
              'tab-switch', 
              `Warning ${warningCount + 1}/3: You switched tabs or windows. Stay on the quiz page.`
            );
            return next;
          });
        }
      }
    };

    const onBlur = () => {
      // Some browsers don't mark hidden; treat blur as potential away
      if (!document.hidden) startAwayTimer();
      // Also check for window minimization
      if (document.visibilityState === 'hidden' || window.outerHeight === 0 || window.outerWidth === 0) {
        showSecurityWarning(
          'window-minimize', 
          `Warning ${warningCount + 1}/3: Do not minimize the browser window during the quiz.`
        );
      }
    };
    const onFocus = () => {
      if (awayStartRef.current) {
        const awayMs = Date.now() - awayStartRef.current;
        clearAwayTimer();
        addViolation('window-focus-return', { awayMs });
      }
    };

    const forbiddenCombo = (e) => {
      const k = e.key?.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;
      const alt = e.altKey;
      
      // Alt+Tab (tab switching)
      if (alt && k === 'tab') {
        setTabSwitchCount(prevCount => {
          const newTabCount = prevCount + 1;
          console.log(`🔢 ALT+TAB DETECTED! Count: ${prevCount} -> ${newTabCount}`);
          
          // Save the new tab switch count immediately with updated value
          setTimeout(() => saveSecurityState({ tabSwitchCount: newTabCount }), 0);
          
          // Check if we've reached the limit for auto-submit
          if (newTabCount >= 3) {
            console.log('🚫 ALT+TAB LIMIT REACHED! Auto-submitting...');
            triggerAutoSubmit(`Maximum tab switches reached via Alt+Tab (${newTabCount})`, newTabCount);
            return newTabCount;
          }
          
          showSecurityWarning(
            'alt-tab', 
            `Warning ${warningCount + 1}/3: Alt+Tab detected. Stay focused on the quiz.`
          );
          return newTabCount;
        });
        return 'alt-tab';
      }
      
      // Developer tools and disruptive shortcuts
      if (
        k === 'f12' ||
        (ctrl && shift && (k === 'i' || k === 'j' || k === 'c')) ||
        (ctrl && (k === 's' || k === 'p'))
      ) {
        return 'devtools-or-system-shortcut';
      }
      // Clipboard
      if (ctrl && (k === 'c' || k === 'v' || k === 'x')) return 'clipboard';
      return null;
    };

    const onKeyDown = (e) => {
      const category = forbiddenCombo(e);
      if (category) {
        e.preventDefault();
        e.stopPropagation();
        keyBlockCountRef.current += 1;
        addViolation('keyboard-shortcut', { category, key: e.key, count: keyBlockCountRef.current });
        if (keyBlockCountRef.current >= 5) triggerAutoSubmit('Repeated forbidden shortcuts');
      }
    };

    const onContextMenu = (e) => {
      e.preventDefault();
      addViolation('context-menu');
    };

    const onCopy = (e) => {
      e.preventDefault();
      addViolation('clipboard', { action: 'copy' });
    };
    const onPaste = (e) => {
      e.preventDefault();
      addViolation('clipboard', { action: 'paste' });
    };
    const onCut = (e) => {
      e.preventDefault();
      addViolation('clipboard', { action: 'cut' });
    };

    let resizeFlagged = false;
    const onResize = () => {
      // Basic devtools heuristic: large diff between outer and inner sizes
      const wDiff = (window.outerWidth || 0) - (window.innerWidth || 0);
      const hDiff = (window.outerHeight || 0) - (window.innerHeight || 0);
      if ((wDiff > 160 || hDiff > 160) && !resizeFlagged) {
        resizeFlagged = true;
        addViolation('devtools-open-heuristic', { wDiff, hDiff });
      }
      
      // Check for window minimization (outer dimensions become 0 or very small)
      if (window.outerHeight <= 100 || window.outerWidth <= 100) {
        const newMinimizeCount = windowMinimizeCount + 1;
        setWindowMinimizeCount(newMinimizeCount);
        // Save the new minimize count immediately
        saveSecurityState({ windowMinimizeCount: newMinimizeCount });
        showSecurityWarning(
          'window-minimize', 
          `Warning ${warningCount + 1}/3: Do not minimize or resize the browser window too small.`
        );
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    document.addEventListener('keydown', onKeyDown, { capture: true });
    document.addEventListener('contextmenu', onContextMenu, { capture: true });
    document.addEventListener('copy', onCopy, { capture: true });
    document.addEventListener('paste', onPaste, { capture: true });
    document.addEventListener('cut', onCut, { capture: true });
    window.addEventListener('resize', onResize);

    return () => {
      clearAwayTimer();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('keydown', onKeyDown, { capture: true });
      document.removeEventListener('contextmenu', onContextMenu, { capture: true });
      document.removeEventListener('copy', onCopy, { capture: true });
      document.removeEventListener('paste', onPaste, { capture: true });
      document.removeEventListener('cut', onCut, { capture: true });
      window.removeEventListener('resize', onResize);
    };
  }, [submitted]);

  // Load quiz attempt data
  useEffect(() => {
    const fetchQuizAttempt = async () => {
      try {
        console.log('Fetching quiz attempt:', attemptId, 'with token:', !!token);
        setLoading(true);
        
        // Early validation of inputs
        if (!attemptId) {
          console.error('Cannot fetch quiz: No attempt ID provided');
          setError('Quiz attempt ID is missing. Please return to the course page and try again.');
          setLoading(false);
          return;
        }
        
        if (!token) {
          console.error('Cannot fetch quiz: No token available');
          setError('Authentication token is missing. Please log in again.');
          setLoading(false);
          
          // Try to restore token one more time
          const restoredToken = localStorage.getItem('token');
          if (restoredToken) {
            console.log('Restored token at last chance, trying again');
            setToken(restoredToken);
            return; // Exit and let the effect run again with the new token
          }
          
          setTimeout(() => navigate('/login', { state: { from: location } }), 2000);
          return;
        }
        
        // Make the API request with exponential backoff retry
        let retries = 0;
        const maxRetries = 2;
        
        const makeRequest = async () => {
          try {
            const response = await axios.get(`/api/student/quiz/attempt/${attemptId}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            
            console.log('Quiz attempt API response:', response);
            console.log('Quiz attempt data:', response.data);
            
            if (!response.data || !response.data.attemptId) {
              console.error('Quiz API returned no attemptId:', response.data);
              setError('Quiz data is missing or invalid.');
              setLoading(false);
              return false;
            }
            
            // Process quiz data to ensure options are arrays
            const processedQuizData = {
              ...response.data,
              questions: response.data.questions?.map(question => ({
                ...question,
                options: typeof question.options === 'string' 
                  ? question.options.split(' ').filter(opt => opt.trim() !== '')
                  : Array.isArray(question.options) ? question.options : []
              })) || []
            };
            
            setQuiz(processedQuizData);
            // Establish an absolute endsAt (preferred from server). Fallback to startedAt + timeLimit.
            const { remainingSeconds, timeLimit, startedAt, endsAt } = response.data || {};
            let ends = null;
            if (endsAt) {
              const parsed = Date.parse(endsAt);
              if (!Number.isNaN(parsed)) ends = parsed;
            }
            if (!ends) {
              const startMs = startedAt ? Date.parse(startedAt) : Date.now();
              const tlMin = typeof timeLimit === 'number' ? timeLimit : null;
              if (tlMin !== null) ends = startMs + tlMin * 60 * 1000;
            }
            if (ends) {
              setEndsAtTs(ends);
              const remain = Math.max(0, Math.ceil((ends - Date.now()) / 1000));
              setTimeLeft(remain);
              try {
                localStorage.setItem(`quiz-endsAt-${attemptId}`, String(ends));
              } catch (_) {}
            } else if (typeof remainingSeconds === 'number') {
              // As a last resort, use remainingSeconds
              setTimeLeft(remainingSeconds);
            }
            setLoading(false);
            return true;
          } catch (err) {
            if (retries < maxRetries) {
              retries++;
              console.log(`Request failed, retrying (${retries}/${maxRetries})...`);
              await new Promise(resolve => setTimeout(resolve, 1000 * retries)); // Exponential backoff
              return await makeRequest();
            }
            throw err;
          }
        };
        
        await makeRequest();
      } catch (err) {
        console.error('Error loading quiz after retries:', err.response || err);
        setLoading(false);
        
        if (err.response?.status === 401) {
          console.log('Unauthorized access (401). Redirecting to login...');
          setError('Your session has expired. Please log in again.');
          setTimeout(() => navigate('/login', { state: { from: location } }), 1500);
          return;
        }
        
        if (err.response?.status === 404) {
          console.log('Quiz not found (404).');
          setError('This quiz attempt does not exist or has been deleted.');
          setTimeout(() => navigate('/student'), 3000);
          return;
        }
        
        if (err.response?.data?.completed) {
          // Quiz already completed, show result summary
          console.log('Quiz already completed, showing results');
          setResult(err.response.data.attempt);
          setSubmitted(true);
        } else {
          setError(`Failed to load quiz: ${err.response?.data?.message || err.message}. Please try again.`);
          
          // Add a retry button
          setTimeout(() => {
            if (document.getElementById('retry-button')) return;
            
            const retryBtn = document.createElement('button');
            retryBtn.id = 'retry-button';
            retryBtn.innerText = 'Retry Loading Quiz';
            retryBtn.style.padding = '10px 20px';
            retryBtn.style.margin = '20px auto';
            retryBtn.style.display = 'block';
            retryBtn.onclick = () => window.location.reload();
            
            document.querySelector('main')?.appendChild(retryBtn);
          }, 1000);
        }
      }
    };
    
    if (attemptId && token) {
      fetchQuizAttempt();
    } else if (!attemptId) {
      setError('No quiz attempt ID provided');
      setLoading(false);
    }
  }, [attemptId, token, navigate, location]);

  // Timer countdown driven by endsAtTs to survive refresh and avoid drift
  useEffect(() => {
    if (!endsAtTs || submitted) return;
    const tick = () => {
      const remain = Math.max(0, Math.ceil((endsAtTs - Date.now()) / 1000));
      setTimeLeft(remain);
      if (remain === 0) {
        handleSubmitQuiz();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAtTs, submitted]);

  // On mount, try to restore endsAt from localStorage quickly while API loads
  useEffect(() => {
    if (!attemptId) return;
    try {
      const ends = localStorage.getItem(`quiz-endsAt-${attemptId}`);
      if (ends) {
        const endsNum = parseInt(ends, 10);
        if (!Number.isNaN(endsNum)) {
          setEndsAtTs(endsNum);
          const remain = Math.max(0, Math.ceil((endsNum - Date.now()) / 1000));
          setTimeLeft(remain);
        }
      }
    } catch (_) {}
  }, [attemptId]);

  // Restore security state on mount
  useEffect(() => {
    if (!attemptId) return;
    restoreSecurityState();
  }, [attemptId]);

  const handleAnswerChange = (questionId, selectedOption) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: parseInt(selectedOption)
    }));
  };

  const handleNextQuestion = async () => {
    // Check if fullscreen is active, if not, enter it first
    if (!isFullscreen) {
      const success = await enterFullscreen();
      if (success) {
        // Give a moment for fullscreen to activate
        setTimeout(() => {
          if (currentQuestion < quiz.questions.length - 1) {
            setCurrentQuestion(currentQuestion + 1);
          }
        }, 100);
      } else {
        addViolation('fullscreen-required-navigation', { button: 'next' });
        // Still navigate but record violation
        if (currentQuestion < quiz.questions.length - 1) {
          setCurrentQuestion(currentQuestion + 1);
        }
      }
    } else {
      if (currentQuestion < quiz.questions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
      }
    }
  };

  const handlePreviousQuestion = async () => {
    // Check if fullscreen is active, if not, enter it first
    if (!isFullscreen) {
      const success = await enterFullscreen();
      if (success) {
        // Give a moment for fullscreen to activate
        setTimeout(() => {
          if (currentQuestion > 0) {
            setCurrentQuestion(currentQuestion - 1);
          }
        }, 100);
      } else {
        addViolation('fullscreen-required-navigation', { button: 'previous' });
        // Still navigate but record violation
        if (currentQuestion > 0) {
          setCurrentQuestion(currentQuestion - 1);
        }
      }
    } else {
      if (currentQuestion > 0) {
        setCurrentQuestion(currentQuestion - 1);
      }
    }
  };

  const handleQuestionNavigation = async (index) => {
    if (index >= 0 && index < quiz.questions.length) {
      // Check if fullscreen is active, if not, enter it first
      if (!isFullscreen) {
        const success = await enterFullscreen();
        if (success) {
          // Give a moment for fullscreen to activate
          setTimeout(() => {
            setCurrentQuestion(index);
          }, 100);
        } else {
          addViolation('fullscreen-required-navigation', { button: 'question-number', questionIndex: index });
          // Don't navigate if fullscreen failed
          return;
        }
      } else {
        setCurrentQuestion(index);
      }
    }
  };

  const handleToggleFlag = (questionId) => {
    setMarkedForReview(prev => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  const handleClearResponse = (questionId) => {
    setAnswers(prev => {
      const n = { ...prev };
      delete n[questionId];
      return n;
    });
  };

  const handleSubmitQuiz = async (auto = false, overrideTabCount = null) => {
    try {
      setSubmitting(true);
      
      // Convert answers to the expected format
      const formattedAnswers = Object.entries(answers).map(([questionId, selectedOption]) => ({
        questionId,
        selectedOption
      }));

      // For auto-submit, ensure we have at least empty answers for all questions to satisfy validation
      if (auto && formattedAnswers.length === 0 && quiz?.questions) {
        quiz.questions.forEach((question, index) => {
          formattedAnswers.push({
            questionId: question._id || question.id || `question_${index}`,
            selectedOption: null // or -1 to indicate no answer
          });
        });
        console.log('Auto-submit: Added empty answers for validation');
      }

      // Use override tab count if provided (for auto-submit), otherwise use current state
      const actualTabCount = overrideTabCount !== null ? overrideTabCount : tabSwitchCount;

      console.log('Submitting quiz answers:', formattedAnswers);
      console.log('Auto-submit mode:', auto);
      console.log('Tab switch count:', actualTabCount);

      // Convert violations to match backend schema - convert to strings instead of objects
      const formattedViolations = violations.map(violation => 
        `${violation.type || 'unknown'}: ${violation.details ? JSON.stringify(violation.details) : violation.message || 'Security violation detected'} at ${new Date(violation.at || Date.now()).toISOString()}`
      );

      console.log('🔍 Original violations:', violations);
      console.log('🔍 Formatted violations:', formattedViolations);

      const submissionData = {
        answers: formattedAnswers,
        securityViolations: formattedViolations,
        tabSwitchCount: actualTabCount,
        isAutoSubmit: auto,
        fsExitCount: fsExitCountRef.current,
        timeSpent: quiz?.timeLimit ? Math.max(0, (quiz.timeLimit * 60) - (timeLeft || 0)) : 0
      };

      console.log('Submission data being sent:', submissionData);
      console.log('🔍 Security violations type:', typeof submissionData.securityViolations);
      console.log('🔍 Security violations Array.isArray:', Array.isArray(submissionData.securityViolations));
      console.log('🔍 Security violations JSON.stringify:', JSON.stringify(submissionData.securityViolations, null, 2));

      // Test backend connectivity
      console.log('🔍 Testing backend connectivity...');
      try {
        const testResponse = await axios.get('/api/notifications/unread-count', {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Backend connectivity test passed:', testResponse.status);
      } catch (testErr) {
        console.error('❌ Backend connectivity test failed:', testErr);
      }

      console.log('📤 Submitting quiz to:', `/api/student/quiz-attempt/${attemptId}/submit`);
      const response = await axios.post(`/api/student/quiz-attempt/${attemptId}/submit`, submissionData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('✅ Quiz submission successful!');
      console.log('Response status:', response.status);
      console.log('Response data:', response.data);
      
      setResult(response.data);
      setSubmitted(true);
      setSubmitting(false);
      
      // Clear security state after successful submission
      clearSecurityState();
    } catch (err) {
      console.error('❌ Error submitting quiz:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      
      setError('Failed to submit quiz. Please try again.');
      setSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getAnsweredCount = () => {
    if (!quiz?.questions) return 0;
    return quiz.questions.reduce((count, q) => (
      answers[q.questionId] !== undefined ? count + 1 : count
    ), 0);
  };

  const getFlaggedCount = () => markedForReview.size;
  const getPendingCount = () => {
    const total = quiz?.questions?.length || 0;
    const answered = getAnsweredCount();
    return Math.max(0, total - answered);
  };

  const getQuestionStatus = (questionId) => {
    const isAnswered = Object.prototype.hasOwnProperty.call(answers, questionId);
    const isFlagged = markedForReview.has(questionId);
    return { isAnswered, isFlagged };
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Loading quiz...</Typography>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">{error}</Alert>
        <Button 
          variant="contained" 
          onClick={() => navigate(-1)} 
          sx={{ mt: 2 }}
        >
          Go Back
        </Button>
      </Container>
    );
  }

  if (submitted && result) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <Link component={RouterLink} to="/student" color="inherit">
            Dashboard
          </Link>
          <Link component={RouterLink} to="/student/courses" color="inherit">
            My Courses
          </Link>
          {courseId && (
            <Link component={RouterLink} to={`/student/course/${courseId}/videos`} color="inherit">
              Course
            </Link>
          )}
          <Typography color="text.primary">Quiz Results</Typography>
        </Breadcrumbs>

        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Box sx={{ mb: 3 }}>
            {result.passed ? (
              <CheckCircleIcon color="success" sx={{ fontSize: 80 }} />
            ) : (
              <CancelIcon color="error" sx={{ fontSize: 80 }} />
            )}
          </Box>
          
          <Typography variant="h4" gutterBottom>
            Quiz {result.passed ? 'Passed!' : 'Not Passed'}
          </Typography>
          
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {quiz.unitTitle} - {quiz.courseTitle}
          </Typography>
          
          <Grid container spacing={2} sx={{ mt: 2, mb: 3 }}>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6">Score</Typography>
                  <Typography variant="h4" color="primary">
                    {result.score}/{result.maxScore}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6">Percentage</Typography>
                  <Typography variant="h4" color={result.passed ? 'success.main' : 'error.main'}>
                    {result.percentage}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6">Status</Typography>
                  <Chip 
                    label={result.passed ? 'PASSED' : 'FAILED'} 
                    color={result.passed ? 'success' : 'error'}
                    size="large"
                  />
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Typography variant="body1" sx={{ mb: 3 }}>
            {result.passed 
              ? 'Congratulations! You have successfully completed this unit quiz.' 
              : `You need at least 70% to pass. Please review the material and try again.`
            }
          </Typography>

          <Button 
            variant="contained" 
            onClick={() => navigate(courseId ? `/student/course/${courseId}/videos` : '/student/courses')}
            size="large"
          >
            {result.passed ? 'Continue to Next Unit' : 'Back to Course'}
          </Button>
        </Paper>
      </Container>
    );
  }

  if (!quiz) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">Quiz data not found.</Alert>
      </Container>
    );
  }

  const currentQ = quiz.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / quiz.questions.length) * 100;
  const answeredCount = getAnsweredCount();
  const flaggedCount = getFlaggedCount();
  const pendingCount = getPendingCount();
  const isLastQuestion = currentQuestion === quiz.questions.length - 1;
  const allAnswered = quiz.questions.every(q => answers[q.questionId] !== undefined);


  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
        <Link component={RouterLink} to="/student" color="inherit">
          Dashboard
        </Link>
        <Link component={RouterLink} to="/student/courses" color="inherit">
          My Courses
        </Link>
        {courseId && (
          <Link component={RouterLink} to={`/student/course/${courseId}/videos`} color="inherit">
            Course
          </Link>
        )}
        <Typography color="text.primary">Quiz</Typography>
      </Breadcrumbs>

      {/* Main two-column layout (Fullscreen target wrapper) */}
      <Box
        ref={quizContainerRef}
        sx={{
          outline: 'none',
          '&:fullscreen': {
            width: '100vw',
            height: '100vh',
            overflow: 'auto',
            backgroundColor: '#fff',
          },
          '&:-webkit-full-screen': {
            width: '100vw',
            height: '100vh',
            overflow: 'auto',
            backgroundColor: '#fff',
          },
        }}
      >
      <Grid container spacing={2}>
        {/* Left: Question Navigator */}
        <Grid item xs={12} md={4} lg={3}>
          <Paper sx={{ p: 2, position: 'sticky', top: 16 }}>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>
              Attempt Status
            </Typography>
            <Grid container spacing={1} sx={{ mb: 2 }}>
              <Grid item xs={4}>
                <Box sx={{ p: 1, bgcolor: 'success.light', color: 'success.contrastText', borderRadius: 1, textAlign: 'center' }}>
                  <Typography variant="caption">Answered</Typography>
                  <Typography variant="h6" sx={{ m: 0 }}>{answeredCount}</Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box sx={{ p: 1, bgcolor: 'warning.light', color: 'warning.contrastText', borderRadius: 1, textAlign: 'center' }}>
                  <Typography variant="caption">Flagged</Typography>
                  <Typography variant="h6" sx={{ m: 0 }}>{flaggedCount}</Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box sx={{ p: 1, bgcolor: 'info.light', color: 'info.contrastText', borderRadius: 1, textAlign: 'center' }}>
                  <Typography variant="caption">Pending</Typography>
                  <Typography variant="h6" sx={{ m: 0 }}>{pendingCount}</Typography>
                </Box>
              </Grid>
            </Grid>

            <Typography variant="subtitle1" sx={{ mb: 1 }}>Questions</Typography>
            {!isFullscreen && (
              <Typography variant="caption" color="error" sx={{ display: 'block', fontSize: '0.7rem', mb: 1 }}>
                Enter fullscreen to navigate
              </Typography>
            )}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 1, maxHeight: 320, overflowY: 'auto', pr: 0.5 }}>
              {quiz.questions.map((q, idx) => {
                const { isAnswered, isFlagged } = getQuestionStatus(q.questionId);
                const isActive = idx === currentQuestion;
                return (
                  <Button
                    key={q.questionId}
                    variant={isActive ? 'contained' : 'outlined'}
                    color={isFlagged ? 'warning' : isAnswered ? 'success' : 'inherit'}
                    size="small"
                    onClick={() => handleQuestionNavigation(idx)}
                    disabled={!isFullscreen}
                    sx={{ 
                      minWidth: 0, 
                      p: 0.5,
                      opacity: !isFullscreen ? 0.5 : 1,
                    }}
                  >
                    {String(idx + 1).padStart(2, '0')}
                  </Button>
                );
              })}
            </Box>
          </Paper>
        </Grid>

  {/* Right: Quiz Content */}
  <Grid item xs={12} md={8} lg={9}>
          {/* Quiz Header */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Grid container alignItems="center" spacing={2}>
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <QuizIcon color="primary" />
                  <Typography variant="h5">{quiz.unitTitle}</Typography>
                </Box>
                <Typography variant="subtitle1" color="text.secondary">
                  {quiz.courseTitle}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6} sx={{ textAlign: { xs: 'left', md: 'right' }, display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' }, gap: 1 }}>
                {timeLeft !== null && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AccessTimeIcon color={timeLeft < 300 ? 'error' : 'primary'} />
                    <Typography 
                      variant="h6" 
                      color={timeLeft < 300 ? 'error.main' : 'text.primary'}
                    >
                      {formatTime(timeLeft)}
                    </Typography>
                  </Box>
                )}
                <Button size="small" variant="outlined" onClick={() => (isFullscreen ? exitFullscreen() : enterFullscreen())}>
                  {isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                </Button>
              </Grid>
            </Grid>
            
            {/* Debug Panel - Security State */}
            {debug && (
              <Box sx={{ mt: 1, p: 1, bgcolor: 'grey.100', borderRadius: 1, fontSize: '0.75rem' }}>
                <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                  🔒 Security Debug: Warnings: {warningCount}/3 | Tab: {tabSwitchCount}/3 | FS Exits: {fsExitCountRef.current} | Minimize: {windowMinimizeCount} | Violations: {violations.length}
                  {tabSwitchCount >= 3 && <span style={{color: 'red', fontWeight: 'bold'}}> ⚠️ TAB LIMIT EXCEEDED!</span>}
                </Typography>
              </Box>
            )}
            
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Question {currentQuestion + 1} of {quiz.questions.length} • {answeredCount} answered
              </Typography>
              <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 5 }} />
            </Box>
          </Paper>

          {/* Question */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="h6">
                Question {currentQuestion + 1}
              </Typography>
              <Button
                variant={markedForReview.has(currentQ.questionId) ? 'contained' : 'outlined'}
                color={markedForReview.has(currentQ.questionId) ? 'warning' : 'inherit'}
                size="small"
                startIcon={<FlagIcon />}
                onClick={() => handleToggleFlag(currentQ.questionId)}
              >
                {markedForReview.has(currentQ.questionId) ? 'Flagged' : 'Flag'}
              </Button>
            </Box>

            <Typography variant="body1" sx={{ mb: 3 }}>
              {currentQ.questionText}
            </Typography>

            <FormControl component="fieldset" fullWidth>
              <RadioGroup
                value={answers[currentQ.questionId]?.toString() || ''}
                onChange={(e) => handleAnswerChange(currentQ.questionId, e.target.value)}
              >
                {currentQ.options.map((option, index) => (
                  <FormControlLabel
                    key={index}
                    value={index.toString()}
                    control={<Radio />}
                    label={`${index + 1}. ${option}`}
                    sx={{ 
                      mb: 1,
                      p: 1,
                      border: '1px solid transparent',
                      borderRadius: 1,
                      '&:hover': {
                        backgroundColor: 'action.hover'
                      }
                    }}
                  />
                ))}
              </RadioGroup>
            </FormControl>

            <Box sx={{ mt: 1 }}>
              <Button size="small" color="info" onClick={() => handleClearResponse(currentQ.questionId)}>
                Clear Response
              </Button>
            </Box>
          </Paper>

          {/* Navigation */}
          <Paper sx={{ p: 3 }}>
            <Grid container justifyContent="space-between" alignItems="center">
              <Grid item>
                <Button
                  variant="outlined"
                  onClick={handlePreviousQuestion}
                  disabled={currentQuestion === 0 || !isFullscreen}
                  sx={{
                    opacity: !isFullscreen ? 0.5 : 1,
                  }}
                >
                  Previous
                </Button>
                {!isFullscreen && (
                  <Typography variant="caption" color="error" sx={{ display: 'block', fontSize: '0.7rem', mt: 0.5 }}>
                    Fullscreen required
                  </Typography>
                )}
              </Grid>
              
              <Grid item>
                <Typography variant="body2" color="text.secondary">
                  {answeredCount} answered • {flaggedCount} flagged • {pendingCount} pending
                </Typography>
              </Grid>
              
              <Grid item>
        {isLastQuestion ? (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => handleSubmitQuiz()}
          disabled={submitting || !allAnswered || !isFullscreen}
                    startIcon={submitting ? <CircularProgress size={20} /> : <CheckCircleIcon />}
          sx={{
            opacity: !isFullscreen ? 0.5 : 1,
          }}
                  >
                    {submitting ? 'Submitting...' : 'Submit Quiz'}
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    onClick={handleNextQuestion}
            disabled={!isFullscreen}
            sx={{
              opacity: !isFullscreen ? 0.5 : 1,
            }}
                  >
            {!isFullscreen ? 'Next (Enter Fullscreen)' : 'Next'}
                  </Button>
                )}
                {!isFullscreen && (
                  <Typography variant="caption" color="error" sx={{ display: 'block', fontSize: '0.7rem', mt: 0.5 }}>
                    Fullscreen required for navigation
                  </Typography>
                )}
              </Grid>
            </Grid>
            
            {!allAnswered && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Please answer all questions before submitting the quiz.
              </Alert>
            )}
          </Paper>
        </Grid>
      </Grid>
  </Box>

      {/* Security Warning Dialog */}
      <Dialog 
        open={showWarning} 
        onClose={() => {}} // Prevent closing by clicking outside
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: '#ffebee',
            border: '2px solid #f44336'
          }
        }}
      >
        <DialogTitle sx={{ color: '#d32f2f', fontWeight: 'bold' }}>
          ⚠️ Security Warning {warningCount}/3
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            You have violated quiz security rules. This is warning <strong>{warningCount} of 3</strong>.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            If you receive 3 warnings, your quiz will be automatically submitted.
          </Typography>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            backgroundColor: '#fff',
            p: 2,
            borderRadius: 1,
            border: '1px solid #f44336'
          }}>
            <Typography variant="h4" color="error" sx={{ fontWeight: 'bold' }}>
              {warningCountdown}
            </Typography>
            <Typography variant="body1" sx={{ ml: 1 }}>
              seconds to return to quiz
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ mt: 2, fontWeight: 'bold', color: '#d32f2f' }}>
            Please:
          </Typography>
          <Typography variant="body2" component="ul" sx={{ mt: 1, pl: 2 }}>
            <li>Stay in fullscreen mode</li>
            <li>Do not switch tabs or windows</li>
            <li>Do not minimize the browser window</li>
            <li>Keep focus on the quiz</li>
            <li>Do not use browser shortcuts</li>
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={dismissWarning} 
            variant="contained" 
            color="primary"
            disabled={warningCountdown > 0}
          >
            {warningCountdown > 0 ? `Wait ${warningCountdown}s` : 'I Understand'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default StudentQuizPage;
