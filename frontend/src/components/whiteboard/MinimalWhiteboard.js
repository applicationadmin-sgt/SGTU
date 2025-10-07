import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  IconButton,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  Slider,
  Typography,
  Paper,
  Tooltip,
  Divider
} from '@mui/material';
import {
  Brush,
  Create,
  Clear,
  Undo,
  Mouse
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

// ==================== STYLED COMPONENTS ====================
const WhiteboardContainer = styled(Box)(({ theme }) => ({
  height: '100%',
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: '#ffffff',
  borderRadius: theme.spacing(1),
  overflow: 'hidden',
  border: '1px solid rgba(255, 255, 255, 0.1)'
}));

const MainToolbar = styled(Box)(({ theme }) => ({
  backgroundColor: 'rgba(15, 23, 42, 0.95)',
  color: '#ffffff',
  padding: theme.spacing(1, 2),
  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
  flexWrap: 'wrap',
  minHeight: 60
}));

const CanvasContainer = styled(Box)(() => ({
  flex: 1,
  position: 'relative',
  backgroundColor: '#ffffff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 400,
  '& canvas': {
    display: 'block',
    border: '1px solid #e2e8f0',
    borderRadius: 4,
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  }
}));

const ToolGroup = styled(Box)(() => ({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '4px 8px',
  borderRadius: 6,
  backgroundColor: 'rgba(255, 255, 255, 0.1)',
  border: '1px solid rgba(255, 255, 255, 0.2)'
}));

// ==================== MAIN COMPONENT ====================
const MinimalWhiteboard = ({ socket, user, classId, isTeacher = false }) => {
  const canvasRef = useRef(null);
  const canvasContext = useRef(null);
  
  const [currentTool, setCurrentTool] = useState('pen');
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(2);
  const [lastPoint, setLastPoint] = useState({ x: 0, y: 0 });

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = 800;
    canvas.height = 600;
    
    // Set drawing properties
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = color;
    context.lineWidth = brushSize;
    
    canvasContext.current = context;
    
    // Clear canvas with white background
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  // Update drawing settings
  useEffect(() => {
    if (canvasContext.current) {
      canvasContext.current.strokeStyle = color;
      canvasContext.current.lineWidth = brushSize;
    }
  }, [color, brushSize]);

  // Drawing functions
  const handleMouseDown = useCallback((event) => {
    if (!isTeacher) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    setIsDrawing(true);
    setLastPoint({ x, y });
  }, [isTeacher]);

  const handleMouseMove = useCallback((event) => {
    if (!isDrawing || !isTeacher || !canvasContext.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const context = canvasContext.current;
    
    if (currentTool === 'eraser') {
      context.globalCompositeOperation = 'destination-out';
      context.lineWidth = brushSize * 3;
    } else {
      context.globalCompositeOperation = 'source-over';
      context.lineWidth = brushSize;
    }
    
    context.beginPath();
    context.moveTo(lastPoint.x, lastPoint.y);
    context.lineTo(x, y);
    context.stroke();
    
    setLastPoint({ x, y });

    // Emit drawing data if socket is available
    if (socket && socket.emit) {
      socket.emit('whiteboard:draw', {
        classId,
        from: lastPoint,
        to: { x, y },
        tool: currentTool,
        settings: { color, width: brushSize },
        userId: user?.id
      });
    }
  }, [isDrawing, isTeacher, currentTool, brushSize, color, lastPoint, socket, classId, user]);

  const handleMouseUp = useCallback(() => {
    setIsDrawing(false);
  }, []);

  // Clear canvas
  const clearCanvas = useCallback(() => {
    if (!canvasContext.current || !isTeacher) return;
    
    const context = canvasContext.current;
    const canvas = canvasRef.current;
    
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);

    if (socket && socket.emit) {
      socket.emit('whiteboard:clear', {
        classId,
        userId: user?.id
      });
    }
  }, [isTeacher, socket, classId, user]);

  // Socket event handlers
  useEffect(() => {
    if (!socket || typeof socket.on !== 'function') return;

    const handleRemoteDraw = (data) => {
      if (data.userId === user?.id) return;
      
      const context = canvasContext.current;
      if (!context) return;
      
      context.strokeStyle = data.settings.color;
      context.lineWidth = data.settings.width;
      context.globalCompositeOperation = data.tool === 'eraser' ? 'destination-out' : 'source-over';
      
      context.beginPath();
      context.moveTo(data.from.x, data.from.y);
      context.lineTo(data.to.x, data.to.y);
      context.stroke();
    };

    const handleRemoteClear = () => {
      const canvas = canvasRef.current;
      const context = canvasContext.current;
      if (canvas && context) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
      }
    };

    socket.on('whiteboard:draw', handleRemoteDraw);
    socket.on('whiteboard:clear', handleRemoteClear);

    return () => {
      if (socket && socket.off) {
        socket.off('whiteboard:draw', handleRemoteDraw);
        socket.off('whiteboard:clear', handleRemoteClear);
      }
    };
  }, [socket, user]);

  return (
    <WhiteboardContainer>
      <MainToolbar>
        {/* Drawing Tools */}
        <ToolGroup>
          <Typography variant="body2" sx={{ color: '#94a3b8', fontWeight: 500 }}>
            Tools:
          </Typography>
          <ToggleButtonGroup
            value={currentTool}
            exclusive
            onChange={(e, value) => value && setCurrentTool(value)}
            size="small"
          >
            <ToggleButton value="select" sx={{ color: 'white', '&.Mui-selected': { backgroundColor: '#3b82f6' } }}>
              <Tooltip title="Select"><Mouse fontSize="small" /></Tooltip>
            </ToggleButton>
            <ToggleButton value="pen" sx={{ color: 'white', '&.Mui-selected': { backgroundColor: '#3b82f6' } }}>
              <Tooltip title="Pen"><Create fontSize="small" /></Tooltip>
            </ToggleButton>
            <ToggleButton value="brush" sx={{ color: 'white', '&.Mui-selected': { backgroundColor: '#3b82f6' } }}>
              <Tooltip title="Brush"><Brush fontSize="small" /></Tooltip>
            </ToggleButton>
            <ToggleButton value="eraser" sx={{ color: 'white', '&.Mui-selected': { backgroundColor: '#ef4444' } }}>
              <Tooltip title="Eraser"><Clear fontSize="small" /></Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
        </ToolGroup>

        {/* Color and Size */}
        <ToolGroup>
          <Typography variant="body2" sx={{ color: '#94a3b8', fontWeight: 500 }}>
            Color:
          </Typography>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            disabled={!isTeacher}
            style={{ 
              width: 36, 
              height: 36, 
              border: '2px solid rgba(255,255,255,0.2)', 
              borderRadius: 6,
              cursor: isTeacher ? 'pointer' : 'not-allowed'
            }}
          />
          <Typography variant="body2" sx={{ color: '#94a3b8', fontWeight: 500, ml: 2 }}>
            Size: {brushSize}
          </Typography>
          <Slider
            value={brushSize}
            onChange={(e, value) => setBrushSize(value)}
            min={1}
            max={20}
            step={1}
            size="small"
            disabled={!isTeacher}
            sx={{ 
              width: 80,
              color: '#3b82f6',
              '& .MuiSlider-thumb': {
                backgroundColor: '#3b82f6'
              }
            }}
          />
        </ToolGroup>

        {/* Actions */}
        {isTeacher && (
          <ToolGroup>
            <Button
              onClick={clearCanvas}
              variant="contained"
              size="small"
              startIcon={<Clear />}
              sx={{ 
                backgroundColor: '#ef4444',
                '&:hover': { backgroundColor: '#dc2626' }
              }}
            >
              Clear All
            </Button>
          </ToolGroup>
        )}

        <Box sx={{ flexGrow: 1 }} />

        {/* Status */}
        <ToolGroup>
          <Typography variant="body2" sx={{ 
            color: isTeacher ? '#10b981' : '#f59e0b',
            fontWeight: 600
          }}>
            {isTeacher ? '🎨 Teaching Mode' : '👀 View Only'}
          </Typography>
        </ToolGroup>
      </MainToolbar>

      <CanvasContainer>
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            width: '100%',
            height: '100%',
            display: 'block'
          }}
        />
      </CanvasContainer>
    </WhiteboardContainer>
  );
};

export default MinimalWhiteboard;