import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  IconButton,
  Button,
  ButtonGroup,
  ToggleButton,
  ToggleButtonGroup,
  Slider,
  Typography,
  Paper,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  FormControl,
  InputLabel,
  Tooltip,
  Chip,
  Stack,
  Divider,
  Snackbar,
  Alert,
  Card,
  CardContent,
  LinearProgress
} from '@mui/material';
import {
  Brush,
  Create,
  Clear,
  Undo,
  Redo,
  Save,
  GetApp,
  CloudUpload,
  PictureAsPdf,
  CropFree,
  Circle,
  Timeline,
  TextFields,
  Highlight,
  Lock,
  LockOpen,
  Groups,
  ZoomIn,
  ZoomOut,
  CenterFocusStrong,
  Fullscreen,
  FullscreenExit,
  GridOn,
  GridOff,
  Delete,
  Mouse,
  ChevronLeft,
  ChevronRight
} from '@mui/icons-material';
import { styled, alpha } from '@mui/material/styles';

// ==================== STYLED COMPONENTS ====================

const WhiteboardContainer = styled(Box)(({ theme, fullscreen }) => ({
  height: fullscreen ? '100vh' : '100%',
  width: fullscreen ? '100vw' : '100%',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: '#f8fafc',
  position: fullscreen ? 'fixed' : 'relative',
  top: fullscreen ? 0 : 'auto',
  left: fullscreen ? 0 : 'auto',
  zIndex: fullscreen ? 9999 : 1,
  overflow: 'hidden',
  border: fullscreen ? 'none' : '2px solid #e2e8f0',
  borderRadius: fullscreen ? 0 : theme.spacing(1),
  transition: 'all 0.3s ease-in-out'
}));

const MainToolbar = styled(AppBar)(({ theme }) => ({
  backgroundColor: '#ffffff',
  color: '#374151',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  borderBottom: '1px solid #e2e8f0',
  '& .MuiToolbar-root': {
    minHeight: 64,
    padding: theme.spacing(0, 2),
    gap: theme.spacing(1)
  }
}));

const ToolPanel = styled(Paper)(({ theme, position = 'left', collapsed }) => ({
  position: 'absolute',
  top: 64,
  [position]: collapsed ? -280 : 0,
  width: 300,
  height: 'calc(100% - 64px)',
  zIndex: 1000,
  backgroundColor: 'rgba(255, 255, 255, 0.95)',
  backdropFilter: 'blur(10px)',
  borderRadius: position === 'left' ? '0 8px 8px 0' : '8px 0 0 8px',
  transition: 'all 0.3s ease-in-out',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  border: '1px solid #e2e8f0',
  boxShadow: '4px 0 20px rgba(0,0,0,0.1)'
}));

const CanvasContainer = styled(Box)(({ theme }) => ({
  flex: 1,
  position: 'relative',
  overflow: 'hidden',
  backgroundColor: '#ffffff',
  '& canvas': {
    border: 'none !important'
  }
}));

const StatusBar = styled(Box)(({ theme }) => ({
  height: 40,
  backgroundColor: '#f1f5f9',
  borderTop: '1px solid #e2e8f0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(0, 2),
  fontSize: '0.875rem',
  color: '#64748b'
}));

// ==================== SIMPLIFIED WHITEBOARD COMPONENT ====================

const SimpleAdvancedWhiteboard = ({ 
  socket, 
  user, 
  classId, 
  isTeacher = false, 
  onStateChange 
}) => {
  // Early return if required props are missing
  if (!user || !classId) {
    console.warn('SimpleAdvancedWhiteboard: Missing required props user or classId');
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography>Loading whiteboard...</Typography>
      </Box>
    );
  }
  // ==================== CORE STATE ====================
  const canvasRef = useRef(null);
  const canvasContext = useRef(null);
  
  const [isReady, setIsReady] = useState(false);
  const [currentTool, setCurrentTool] = useState('pen');
  const [isDrawing, setIsDrawing] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);
  
  // ==================== TOOL STATES ====================
  const [brushSettings, setBrushSettings] = useState({
    color: '#000000',
    width: 2,
    opacity: 1
  });
  
  // ==================== UI STATES ====================
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(false);
  
  // ==================== COLLABORATION STATES ====================
  const [collaborators, setCollaborators] = useState([]);
  const [isLocked, setIsLocked] = useState(false);
  const [lockUser, setLockUser] = useState(null);
  
  // ==================== NOTIFICATION STATES ====================
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  
  // ==================== CANVAS INITIALIZATION ====================
  useEffect(() => {
    // Initialize immediately without waiting for canvas ref
    const timer = setTimeout(() => {
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        
        canvas.width = 1200;
        canvas.height = 800;
        
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.strokeStyle = brushSettings.color;
        context.lineWidth = brushSettings.width;
        
        canvasContext.current = context;
      }
      setIsReady(true); // Set ready regardless of canvas state
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Update canvas settings when brush settings change
  useEffect(() => {
    if (canvasContext.current) {
      canvasContext.current.strokeStyle = brushSettings.color;
      canvasContext.current.lineWidth = brushSettings.width;
    }
  }, [brushSettings.color, brushSettings.width]);
  
  // ==================== DRAWING FUNCTIONS ====================
  const [lastPoint, setLastPoint] = useState({ x: 0, y: 0 });
  
  const handleMouseDown = useCallback((event) => {
    if (!isTeacher && isLocked) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    setIsDrawing(true);
    setLastPoint({ x, y });
    
    const context = canvasContext.current;
    context.beginPath();
    context.moveTo(x, y);
    
    if (socket) {
      socket.emit('whiteboard:start-draw', {
        classId,
        point: { x, y },
        tool: currentTool,
        settings: brushSettings,
        userId: user.id
      });
    }
  }, [isTeacher, isLocked, currentTool, brushSettings, socket, classId, user.id]);
  
  const handleMouseMove = useCallback((event) => {
    if (!isDrawing || (!isTeacher && isLocked)) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const context = canvasContext.current;
    context.lineTo(x, y);
    context.stroke();
    
    if (socket && Date.now() % 3 === 0) { // Throttle events
      socket.emit('whiteboard:draw', {
        classId,
        from: lastPoint,
        to: { x, y },
        tool: currentTool,
        settings: brushSettings,
        userId: user.id
      });
    }
    
    setLastPoint({ x, y });
  }, [isDrawing, isTeacher, isLocked, lastPoint, currentTool, brushSettings, socket, classId, user.id]);
  
  const handleMouseUp = useCallback(() => {
    if (isDrawing) {
      setIsDrawing(false);
      
      if (socket) {
        socket.emit('whiteboard:end-draw', {
          classId,
          userId: user.id
        });
      }
    }
  }, [isDrawing, socket, classId, user.id]);
  
  // ==================== TOOL FUNCTIONS ====================
  const setTool = useCallback((tool) => {
    const context = canvasContext.current;
    if (!context) return;
    
    setCurrentTool(tool);
    
    switch (tool) {
      case 'pen':
      case 'brush':
        context.globalCompositeOperation = 'source-over';
        context.strokeStyle = brushSettings.color;
        break;
      case 'eraser':
        context.globalCompositeOperation = 'destination-out';
        break;
      default:
        context.globalCompositeOperation = 'source-over';
        context.strokeStyle = brushSettings.color;
    }
    
    context.lineWidth = brushSettings.width;
  }, [brushSettings]);
  
  // ==================== CANVAS FUNCTIONS ====================
  const clearCanvas = useCallback(() => {
    if (!canvasContext.current) return;
    
    const canvas = canvasRef.current;
    const context = canvasContext.current;
    
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    if (socket && isTeacher) {
      socket.emit('whiteboard:clear', {
        classId,
        userId: user.id
      });
    }
    
    showNotification('Canvas cleared', 'info');
  }, [socket, classId, isTeacher, user.id]);
  
  // ==================== COLLABORATION FUNCTIONS ====================
  const lockCanvas = useCallback(() => {
    if (!isTeacher) return;
    
    setIsLocked(true);
    setLockUser(user);
    
    if (socket) {
      socket.emit('whiteboard:lock', {
        classId,
        userId: user.id,
        userName: user.name
      });
    }
    
    showNotification('Canvas locked for editing', 'info');
  }, [isTeacher, user, socket, classId]);
  
  const unlockCanvas = useCallback(() => {
    if (!isTeacher) return;
    
    setIsLocked(false);
    setLockUser(null);
    
    if (socket) {
      socket.emit('whiteboard:unlock', {
        classId,
        userId: user.id
      });
    }
    
    showNotification('Canvas unlocked', 'info');
  }, [isTeacher, user, socket, classId]);
  
  // ==================== UTILITY FUNCTIONS ====================
  const showNotification = useCallback((message, severity = 'info') => {
    setNotification({ open: true, message, severity });
  }, []);
  
  // ==================== SOCKET EVENT HANDLERS ====================
  useEffect(() => {
    if (!socket || typeof socket.on !== 'function' || !socketConnected) return;
    
    const handleRemoteDraw = (data) => {
      if (data.userId === user.id) return;
      
      const context = canvasContext.current;
      if (!context) return;
      
      // Save current settings
      const currentColor = context.strokeStyle;
      const currentWidth = context.lineWidth;
      const currentComposite = context.globalCompositeOperation;
      
      // Apply remote settings
      context.strokeStyle = data.settings.color;
      context.lineWidth = data.settings.width;
      context.globalCompositeOperation = data.tool === 'eraser' ? 'destination-out' : 'source-over';
      
      // Draw the line
      context.beginPath();
      context.moveTo(data.from.x, data.from.y);
      context.lineTo(data.to.x, data.to.y);
      context.stroke();
      
      // Restore settings
      context.strokeStyle = currentColor;
      context.lineWidth = currentWidth;
      context.globalCompositeOperation = currentComposite;
    };
    
    const handleRemoteClear = () => {
      const canvas = canvasRef.current;
      const context = canvasContext.current;
      if (canvas && context) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        showNotification('Canvas cleared by instructor', 'info');
      }
    };
    
    const handleRemoteLock = (data) => {
      setIsLocked(true);
      setLockUser({ id: data.userId, name: data.userName });
      showNotification(`Canvas locked by ${data.userName}`, 'warning');
    };
    
    const handleRemoteUnlock = () => {
      setIsLocked(false);
      setLockUser(null);
      showNotification('Canvas unlocked', 'info');
    };
    
    socket.on('whiteboard:draw', handleRemoteDraw);
    socket.on('whiteboard:clear', handleRemoteClear);
    socket.on('whiteboard:lock', handleRemoteLock);
    socket.on('whiteboard:unlock', handleRemoteUnlock);
    
    return () => {
      if (socket && socket.off) {
        socket.off('whiteboard:draw', handleRemoteDraw);
        socket.off('whiteboard:clear', handleRemoteClear);
        socket.off('whiteboard:lock', handleRemoteLock);
        socket.off('whiteboard:unlock', handleRemoteUnlock);
      }
    };
  }, [socket, user.id, showNotification, socketConnected]);
  
  // Update tool settings when they change
  useEffect(() => {
    setTool(currentTool);
  }, [currentTool, setTool]);

  // Monitor socket connection status
  useEffect(() => {
    if (!socket) {
      setSocketConnected(false);
      return;
    }

    const handleConnect = () => setSocketConnected(true);
    const handleDisconnect = () => setSocketConnected(false);

    if (socket.connected) {
      setSocketConnected(true);
    }

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    return () => {
      if (socket && socket.off) {
        socket.off('connect', handleConnect);
        socket.off('disconnect', handleDisconnect);
      }
    };
  }, [socket]);
  
  // ==================== RENDER MAIN TOOLBAR ====================
  const renderMainToolbar = () => (
    <MainToolbar position="static">
      <Toolbar>
        {/* Basic Tools */}
        <ToggleButtonGroup
          value={currentTool}
          exclusive
          onChange={(e, tool) => tool && setTool(tool)}
          size="small"
        >
          <ToggleButton value="select">
            <Tooltip title="Select"><Mouse /></Tooltip>
          </ToggleButton>
          <ToggleButton value="pen">
            <Tooltip title="Pen"><Create /></Tooltip>
          </ToggleButton>
          <ToggleButton value="brush">
            <Tooltip title="Brush"><Brush /></Tooltip>
          </ToggleButton>
          <ToggleButton value="eraser">
            <Tooltip title="Eraser"><Clear /></Tooltip>
          </ToggleButton>
        </ToggleButtonGroup>
        
        <Divider orientation="vertical" sx={{ mx: 1, height: 30 }} />
        
        {/* Color and Width Controls */}
        <input
          type="color"
          value={brushSettings.color}
          onChange={(e) => setBrushSettings(prev => ({ 
            ...prev, 
            color: e.target.value 
          }))}
          style={{ 
            width: 40, 
            height: 32, 
            border: 'none', 
            borderRadius: 4,
            cursor: 'pointer'
          }}
        />
        
        <Box sx={{ width: 100, mx: 1 }}>
          <Typography variant="caption" display="block">
            Width: {brushSettings.width}px
          </Typography>
          <Slider
            value={brushSettings.width}
            onChange={(e, value) => setBrushSettings(prev => ({ 
              ...prev, 
              width: value 
            }))}
            min={1}
            max={20}
            step={1}
            size="small"
          />
        </Box>
        
        <Divider orientation="vertical" sx={{ mx: 1, height: 30 }} />
        
        {/* View Controls */}
        <ButtonGroup size="small">
          <Button onClick={() => setShowGrid(!showGrid)}>
            <Tooltip title="Toggle Grid">
              {showGrid ? <GridOff /> : <GridOn />}
            </Tooltip>
          </Button>
          <Button onClick={() => setZoom(1)}>
            <Tooltip title="Reset Zoom"><CenterFocusStrong /></Tooltip>
          </Button>
          <Button onClick={() => setFullscreen(!fullscreen)}>
            <Tooltip title="Fullscreen">
              {fullscreen ? <FullscreenExit /> : <Fullscreen />}
            </Tooltip>
          </Button>
        </ButtonGroup>
        
        <Box sx={{ flexGrow: 1 }} />
        
        {/* Collaboration Controls */}
        {isTeacher && (
          <>
            <Button 
              onClick={isLocked ? unlockCanvas : lockCanvas}
              color={isLocked ? "error" : "primary"}
              size="small"
              startIcon={isLocked ? <Lock /> : <LockOpen />}
            >
              {isLocked ? 'Unlock' : 'Lock'}
            </Button>
          </>
        )}
        
        {/* Clear Canvas */}
        {isTeacher && (
          <Button 
            onClick={clearCanvas} 
            color="error" 
            size="small"
            startIcon={<Delete />}
          >
            Clear
          </Button>
        )}
      </Toolbar>
    </MainToolbar>
  );
  
  // ==================== RENDER TOOL PANEL ====================
  const renderToolPanel = () => (
    <ToolPanel collapsed={!leftPanelOpen}>
      <Box sx={{ p: 2, borderBottom: '1px solid #e2e8f0' }}>
        <Typography variant="h6" gutterBottom>
          Drawing Tools
        </Typography>
      </Box>
      
      <Box sx={{ p: 2, flex: 1, overflow: 'auto' }}>
        <Stack spacing={3}>
          {/* Brush Settings */}
          <Card>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                Brush Settings
              </Typography>
              
              <Stack spacing={2}>
                <Box>
                  <Typography variant="body2" gutterBottom>Color</Typography>
                  <input
                    type="color"
                    value={brushSettings.color}
                    onChange={(e) => setBrushSettings(prev => ({ 
                      ...prev, 
                      color: e.target.value 
                    }))}
                    style={{ 
                      width: '100%', 
                      height: 40, 
                      border: '1px solid #e2e8f0',
                      borderRadius: 4,
                      cursor: 'pointer'
                    }}
                  />
                </Box>
                
                <Box>
                  <Typography variant="body2" gutterBottom>
                    Width: {brushSettings.width}px
                  </Typography>
                  <Slider
                    value={brushSettings.width}
                    onChange={(e, value) => setBrushSettings(prev => ({ 
                      ...prev, 
                      width: value 
                    }))}
                    min={1}
                    max={50}
                    step={1}
                    marks
                    valueLabelDisplay="auto"
                  />
                </Box>
                
                <Box>
                  <Typography variant="body2" gutterBottom>
                    Opacity: {Math.round(brushSettings.opacity * 100)}%
                  </Typography>
                  <Slider
                    value={brushSettings.opacity}
                    onChange={(e, value) => setBrushSettings(prev => ({ 
                      ...prev, 
                      opacity: value 
                    }))}
                    min={0}
                    max={1}
                    step={0.1}
                    marks
                    valueLabelDisplay="auto"
                  />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Box>
    </ToolPanel>
  );
  
  // ==================== MAIN RENDER ====================
  if (!isReady) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <LinearProgress sx={{ mb: 2 }} />
        <Typography>Initializing Whiteboard...</Typography>
      </Box>
    );
  }
  
  return (
    <WhiteboardContainer fullscreen={fullscreen}>
      {renderMainToolbar()}
      
      <Box sx={{ position: 'relative', flex: 1 }}>
        {renderToolPanel()}
        
        <CanvasContainer>
          <canvas 
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{
              cursor: currentTool === 'eraser' ? 'crosshair' : 
                     currentTool === 'select' ? 'default' : 'crosshair'
            }}
          />
          
          {/* Lock Overlay */}
          {isLocked && !isTeacher && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 999
              }}
            >
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Lock sx={{ fontSize: 48, color: '#ff9800', mb: 1 }} />
                <Typography variant="h6" gutterBottom>
                  Canvas Locked
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {lockUser ? `Locked by ${lockUser.name}` : 'Canvas is currently locked for editing'}
                </Typography>
              </Paper>
            </Box>
          )}
        </CanvasContainer>
        
        {/* Tool Panel Toggle */}
        <IconButton
          sx={{
            position: 'absolute',
            left: leftPanelOpen ? 300 : 0,
            top: '50%',
            transform: 'translateY(-50%)',
            backgroundColor: 'white',
            border: '1px solid #e2e8f0',
            zIndex: 1002,
            '&:hover': {
              backgroundColor: '#f8fafc'
            }
          }}
          onClick={() => setLeftPanelOpen(!leftPanelOpen)}
        >
          {leftPanelOpen ? <ChevronLeft /> : <ChevronRight />}
        </IconButton>
      </Box>
      
      <StatusBar>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2">
            Zoom: {Math.round(zoom * 100)}%
          </Typography>
          <Typography variant="body2">
            Tool: {currentTool}
          </Typography>
          {isLocked && (
            <Chip
              icon={<Lock />}
              label={lockUser ? `Locked by ${lockUser.name}` : 'Locked'}
              size="small"
              color="warning"
            />
          )}
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {collaborators.length > 0 && (
            <Typography variant="body2">
              {collaborators.length} collaborator{collaborators.length > 1 ? 's' : ''}
            </Typography>
          )}
        </Box>
      </StatusBar>
      
      {/* Notifications */}
      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={() => setNotification(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setNotification(prev => ({ ...prev, open: false }))}
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </WhiteboardContainer>
  );
};

export default SimpleAdvancedWhiteboard;