import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  IconButton,
  Toolbar,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Chip,
  Typography,
  Divider,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Tab,
  Tabs,
  Badge,
  Switch,
  FormControlLabel,
  Slider
} from '@mui/material';
import {
  Brush as BrushIcon,
  Palette as PaletteIcon,
  Clear as ClearIcon,
  Save as SaveIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  Rectangle as RectIcon,
  Circle as CircleIcon,
  Edit as TextIcon,
  Note as NoteIcon,
  Add as AddPageIcon,
  Remove as RemovePageIcon,
  ScreenShare as ScreenAnnotateIcon,
  Highlight as HighlightIcon,
  FormatShapes as ShapeIcon,
  TextFields as TextFieldsIcon,
  Layers as LayersIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';

const EnhancedWhiteboard = ({ 
  open, 
  onClose, 
  onSave, 
  onUpdate, 
  initialData = null,
  userRole = 'student',
  whiteboardNotes = [],
  onLoadNote,
  isScreenSharing = false,
  screenElement = null
}) => {
  const canvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState('brush');
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [drawingHistory, setDrawingHistory] = useState([]);
  const [historyStep, setHistoryStep] = useState(-1);
  
  // Multi-page support
  const [currentPage, setCurrentPage] = useState(0);
  const [pages, setPages] = useState([{ id: 0, name: 'Page 1', history: [], historyStep: -1 }]);
  
  // Screen annotation mode
  const [annotationMode, setAnnotationMode] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [overlayOpacity, setOverlayOpacity] = useState(0.8);
  
  // Enhanced tools
  const [isTextMode, setIsTextMode] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [textPosition, setTextPosition] = useState(null);
  const [currentShape, setCurrentShape] = useState(null);
  const [shapeStart, setShapeStart] = useState(null);
  
  // Save dialog state
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteDescription, setNoteDescription] = useState('');
  const [noteTags, setNoteTags] = useState('');
  
  // Additional state for enhanced functionality
  const [tool, setTool] = useState('brush');
  const [brushColor, setBrushColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(2);
  const [lastPoint, setLastPoint] = useState(null);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInputPosition, setTextInputPosition] = useState({ x: 0, y: 0 });
  const [socket, setSocket] = useState(null);
  const [classId, setClassId] = useState(null);

  useEffect(() => {
    if (open) {
      const canvas = canvasRef.current;
      const overlayCanvas = overlayCanvasRef.current;
      
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        
        // Setup overlay canvas for screen annotation
        if (overlayCanvas) {
          overlayCanvas.width = rect.width;
          overlayCanvas.height = rect.height;
        }
        
        // Load current page or initial data
        loadCurrentPage();
      }
    }
  }, [open, currentPage]);

  useEffect(() => {
    // Switch to annotation mode when screen sharing starts
    if (isScreenSharing) {
      setAnnotationMode(true);
    }
  }, [isScreenSharing]);

  const saveState = () => {
    const canvas = annotationMode ? overlayCanvasRef.current : canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL();
      
      if (annotationMode) {
        // For annotation mode, don't save to history (temporary drawings)
        return;
      }
      
      // Save to current page history
      const updatedPages = [...pages];
      const currentPageData = updatedPages[currentPage];
      const newHistory = currentPageData.history.slice(0, currentPageData.historyStep + 1);
      newHistory.push(dataUrl);
      
      updatedPages[currentPage] = {
        ...currentPageData,
        history: newHistory,
        historyStep: newHistory.length - 1
      };
      
      setPages(updatedPages);
    }
  };

  const clearCanvas = () => {
    const canvas = annotationMode ? overlayCanvasRef.current : canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (!annotationMode) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        saveState();
      }
    }
  };

  const loadCurrentPage = () => {
    const canvas = canvasRef.current;
    if (canvas && pages[currentPage]) {
      const ctx = canvas.getContext('2d');
      const pageHistory = pages[currentPage].history;
      const pageHistoryStep = pages[currentPage].historyStep;
      
      if (pageHistory.length > 0 && pageHistoryStep >= 0) {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
        };
        img.src = pageHistory[pageHistoryStep];
      } else {
        // Clear canvas for new page
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        saveState();
      }
    }
  };





  const clearOverlay = () => {
    const overlayCanvas = overlayCanvasRef.current;
    if (overlayCanvas) {
      const ctx = overlayCanvas.getContext('2d');
      ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    }
  };



  // Shape drawing functions
  const drawShape = (startPos, endPos, shapeType) => {
    const canvas = annotationMode ? overlayCanvasRef.current : canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    
    if (shapeType === 'rectangle') {
      const width = endPos.x - startPos.x;
      const height = endPos.y - startPos.y;
      ctx.strokeRect(startPos.x, startPos.y, width, height);
    } else if (shapeType === 'circle') {
      const radius = Math.sqrt(
        Math.pow(endPos.x - startPos.x, 2) + Math.pow(endPos.y - startPos.y, 2)
      );
      ctx.beginPath();
      ctx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
      ctx.stroke();
    }
  };

  const startDrawing = (e) => {
    if (userRole === 'student' && !userRole.includes('teacher')) {
      // Only allow teachers and authorized users to draw
      return;
    }
    
    const canvas = annotationMode ? overlayCanvasRef.current : canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (tool === 'text') {
      setTextInputPosition({ x, y });
      setShowTextInput(true);
      return;
    }
    
    if (tool === 'rectangle' || tool === 'circle') {
      setShapeStart({ x, y });
      setCurrentShape(tool);
      setIsDrawing(true);
      return;
    }
    
    setIsDrawing(true);
    setLastPoint({ x, y });
    
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
    
    // Set drawing properties
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = brushSize * 2; // Eraser is bigger
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      if (tool === 'highlighter') {
        ctx.globalAlpha = 0.3;
      } else {
        ctx.globalAlpha = 1.0;
      }
    }
    
    // For annotation mode, set opacity
    if (annotationMode) {
      ctx.globalAlpha = overlayOpacity;
    }
  };

  const draw = (e) => {
    if (!isDrawing) return;
    
    const canvas = annotationMode ? overlayCanvasRef.current : canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ctx = canvas.getContext('2d');
    
    // Handle shape drawing
    if (currentShape && shapeStart) {
      // Clear and redraw for preview
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Redraw current page content
      if (!annotationMode && pages[currentPage]?.dataUrl) {
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0);
        img.src = pages[currentPage].dataUrl;
      }
      
      // Draw shape preview
      drawShape(shapeStart, { x, y }, currentShape);
      return;
    }
    
    // Handle brush/eraser drawing
    if (lastPoint) {
      ctx.beginPath();
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    
    setLastPoint({ x, y });
    
    // Broadcast drawing for real-time collaboration
    if (socket && !annotationMode) {
      socket.emit('whiteboard-draw', {
        type: 'draw',
        tool,
        fromX: lastPoint?.x,
        fromY: lastPoint?.y,
        toX: x,
        toY: y,
        color: brushColor,
        size: brushSize,
        pageId: currentPage
      });
    }

  };

  const stopDrawing = (e) => {
    if (!isDrawing) return;
    
    setIsDrawing(false);
    setLastPoint(null);
    
    // Finalize shape drawing
    if (currentShape && shapeStart && e) {
      const canvas = annotationMode ? overlayCanvasRef.current : canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Broadcast final shape
      if (socket && !annotationMode) {
        socket.emit('whiteboard-draw', {
          type: 'shape',
          shape: currentShape,
          startX: shapeStart.x,
          startY: shapeStart.y,
          endX: x,
          endY: y,
          color: brushColor,
          size: brushSize,
          pageId: currentPage
        });
      }
      
      setCurrentShape(null);
      setShapeStart(null);
    }
    
    // Save to history if not in annotation mode
    if (!annotationMode) {
      saveState();
    }

  };

  // Text handling function
  const addText = () => {
    if (!textInput.trim()) return;
    
    const canvas = annotationMode ? overlayCanvasRef.current : canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    ctx.font = `${brushSize}px Arial`;
    ctx.fillStyle = brushColor;
    ctx.fillText(textInput, textInputPosition.x, textInputPosition.y);
    
    setShowTextInput(false);
    setTextInput('');
    
    // Save state if not in annotation mode
    if (!annotationMode) {
      saveState();
    }
    
    // Broadcast text addition for real-time collaboration
    if (socket && !annotationMode) {
      socket.emit('whiteboard-draw', {
        type: 'text',
        text: textInput,
        x: textInputPosition.x,
        y: textInputPosition.y,
        fontSize: brushSize,
        color: brushColor,
        pageId: currentPage
      });
    }
  };

  const undo = () => {
    const currentPageData = pages[currentPage];
    if (currentPageData.historyStep > 0) {
      const updatedPages = [...pages];
      updatedPages[currentPage] = {
        ...currentPageData,
        historyStep: currentPageData.historyStep - 1
      };
      setPages(updatedPages);
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = currentPageData.history[currentPageData.historyStep - 1];
    }
  };

  const redo = () => {
    const currentPageData = pages[currentPage];
    if (currentPageData.historyStep < currentPageData.history.length - 1) {
      const updatedPages = [...pages];
      updatedPages[currentPage] = {
        ...currentPageData,
        historyStep: currentPageData.historyStep + 1
      };
      setPages(updatedPages);
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = currentPageData.history[currentPageData.historyStep + 1];
    }
  };

  const handleSaveNote = () => {
    const canvas = canvasRef.current;
    if (canvas && onSave && !annotationMode) {
      const dataUrl = canvas.toDataURL();
      const noteData = {
        title: noteTitle || `Whiteboard - ${pages[currentPage].name}`,
        content: dataUrl,
        description: noteDescription,
        tags: noteTags.split(',').map(tag => tag.trim()).filter(tag => tag)
      };
      
      onSave(noteData.title, noteData.content, noteData.description, noteData.tags);
      setShowSaveDialog(false);
      setNoteTitle('');
      setNoteDescription('');
      setNoteTags('');
    }
  };



  const loadNoteToCanvas = (note) => {
    const canvas = canvasRef.current;
    if (canvas && note.content) {
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        saveState();
      };
      img.src = note.content;
    }
  };

  // Page Management Functions
  const addNewPage = () => {
    const newPage = {
      id: pages.length,
      name: `Page ${pages.length + 1}`,
      history: [],
      historyStep: -1
    };
    
    setPages(prev => [...prev, newPage]);
    setCurrentPage(pages.length);
  };

  const switchToPage = (pageIndex) => {
    // Save current page state
    if (pages[currentPage]) {
      const canvas = canvasRef.current;
      if (canvas) {
        const dataUrl = canvas.toDataURL();
        const updatedPages = [...pages];
        updatedPages[currentPage] = {
          ...updatedPages[currentPage],
          dataUrl
        };
        setPages(updatedPages);
      }
    }
    
    setCurrentPage(pageIndex);
    
    // Load new page
    setTimeout(() => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (pages[pageIndex]?.dataUrl) {
          const img = new Image();
          img.onload = () => ctx.drawImage(img, 0, 0);
          img.src = pages[pageIndex].dataUrl;
        }
      }
    }, 50);
  };

  const deletePage = (pageIndex) => {
    if (pages.length <= 1) return; // Don't delete last page
    
    const newPages = pages.filter((_, index) => index !== pageIndex);
    setPages(newPages);
    
    // Switch to previous page if current page was deleted
    if (currentPage >= pageIndex && currentPage > 0) {
      setCurrentPage(currentPage - 1);
    } else if (currentPage === pageIndex && pageIndex === pages.length - 1) {
      setCurrentPage(pageIndex - 1);
    }
  };

  const saveAllPages = async () => {
    try {
      const allPages = [];
      
      pages.forEach((pageData, index) => {
        if (pageData.history.length > 0) {
          const currentDataUrl = pageData.history[pageData.historyStep] || pageData.history[pageData.history.length - 1];
          allPages.push({
            title: `${noteTitle || 'Whiteboard'} - ${pageData.name}`,
            description: noteDescription,
            tags: noteTags.split(',').map(tag => tag.trim()),
            imageData: currentDataUrl,
            pageNumber: index + 1
          });
        }
      });
      
      if (allPages.length === 0) {
        alert('No pages with content to save!');
        return;
      }
      
      const responses = await Promise.all(
        allPages.map(page => 
          fetch('/api/live-class/whiteboard-notes', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              classId,
              ...page
            })
          })
        )
      );
      
      if (responses.every(res => res.ok)) {
        alert(`Successfully saved ${allPages.length} pages!`);
        await loadWhiteboardNotes();
      }
    } catch (error) {
      console.error('Error saving all pages:', error);
      alert('Failed to save pages');
    }
  };

  // Load whiteboard notes function (placeholder)
  const loadWhiteboardNotes = async () => {
    // This function would typically fetch notes from the API
    // For now, it's a placeholder to prevent errors
    console.log('Loading whiteboard notes...');
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="xl"
        fullWidth
        PaperProps={{
          sx: { height: '90vh' }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="h6">
                {annotationMode ? 'Screen Annotation' : 'Interactive Whiteboard'}
              </Typography>
              {userRole === 'student' && (
                <Chip label="View Only" size="small" color="warning" />
              )}
              {annotationMode && (
                <Chip label="Annotation Mode" size="small" color="info" icon={<ScreenAnnotateIcon />} />
              )}
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {/* Mode Toggle */}
              <FormControlLabel
                control={
                  <Switch
                    checked={annotationMode}
                    onChange={(e) => setAnnotationMode(e.target.checked)}
                    disabled={isScreenSharing}
                  />
                }
                label="Annotation Mode"
              />
              
              {/* Overlay Controls (for annotation mode) */}
              {annotationMode && (
                <>
                  <Tooltip title="Toggle Overlay Visibility">
                    <IconButton onClick={() => setOverlayVisible(!overlayVisible)}>
                      {overlayVisible ? <VisibilityIcon /> : <VisibilityOffIcon />}
                    </IconButton>
                  </Tooltip>
                  
                  <Box sx={{ width: 100 }}>
                    <Typography variant="caption">Opacity</Typography>
                    <Slider
                      value={overlayOpacity}
                      onChange={(_, value) => setOverlayOpacity(value)}
                      min={0.1}
                      max={1}
                      step={0.1}
                      size="small"
                    />
                  </Box>
                </>
              )}
            </Box>
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ display: 'flex', height: '100%' }}>
            {/* Toolbar */}
            <Paper sx={{ width: 250, p: 1, borderRadius: 0, maxHeight: '100%', overflow: 'auto' }}>
              
              {/* Page Management (only in whiteboard mode) */}
              {!annotationMode && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>Pages</Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Tabs
                      value={currentPage}
                      onChange={(e, newValue) => setCurrentPage(newValue)}
                      variant="scrollable"
                      scrollButtons="auto"
                      sx={{ flex: 1 }}
                    >
                      {pages.map((page, index) => (
                        <Tab
                          key={page.id}
                          label={page.name}
                          sx={{ minWidth: 60, fontSize: '0.75rem' }}
                        />
                      ))}
                    </Tabs>
                    
                    <Tooltip title="Add Page">
                      <IconButton size="small" onClick={addNewPage}>
                        <AddPageIcon />
                      </IconButton>
                    </Tooltip>
                    
                    {pages.length > 1 && (
                      <Tooltip title="Delete Current Page">
                        <IconButton 
                          size="small" 
                          onClick={() => deletePage(currentPage)}
                          color="error"
                        >
                          <RemovePageIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                  
                  <Typography variant="caption" color="text.secondary">
                    Page {currentPage + 1} of {pages.length}
                  </Typography>
                  
                  <Divider sx={{ my: 1 }} />
                </Box>
              )}
              
              <Typography variant="subtitle2" gutterBottom>Drawing Tools</Typography>
              
              {/* Enhanced Tool Selection */}
              <Box sx={{ mb: 2 }}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Tool</InputLabel>
                  <Select
                    value={tool}
                    onChange={(e) => setTool(e.target.value)}
                  >
                    <MenuItem value="brush">🖌️ Brush</MenuItem>
                    <MenuItem value="eraser">🧽 Eraser</MenuItem>
                    <MenuItem value="highlight">🖍️ Highlighter</MenuItem>
                    <MenuItem value="text">✏️ Text</MenuItem>
                    <MenuItem value="rectangle">⬛ Rectangle</MenuItem>
                    <MenuItem value="circle">⭕ Circle</MenuItem>
                    <MenuItem value="line">📏 Line</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {/* Enhanced Color Selection */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption">Colors</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                  {[
                    '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', 
                    '#ffff00', '#ff00ff', '#00ffff', '#ff8000', '#8000ff',
                    '#0080ff', '#ff0080', '#80ff00', '#808080', '#400040'
                  ].map(color => (
                    <Box
                      key={color}
                      sx={{
                        width: 20,
                        height: 20,
                        bgcolor: color,
                        border: brushColor === color ? '2px solid #333' : '1px solid #ccc',
                        cursor: 'pointer',
                        borderRadius: 1
                      }}
                      onClick={() => setBrushColor(color)}
                    />
                  ))}
                </Box>
                
                {/* Custom Color Picker */}
                <Box sx={{ mt: 1 }}>
                  <input
                    type="color"
                    value={brushColor}
                    onChange={(e) => setBrushColor(e.target.value)}
                    style={{ width: '100%', height: 30, border: 'none', cursor: 'pointer' }}
                  />
                </Box>
              </Box>

              {/* Stroke Width */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption">Brush Size: {brushSize}px</Typography>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={brushSize}
                  onChange={(e) => setBrushSize(parseInt(e.target.value))}
                  style={{ width: '100%' }}
                />
              </Box>

              {/* Enhanced Actions */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<UndoIcon />}
                  onClick={undo}
                  disabled={annotationMode || (pages[currentPage]?.historyStep <= 0)}
                >
                  Undo
                </Button>
                
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<RedoIcon />}
                  onClick={redo}
                  disabled={annotationMode || (pages[currentPage]?.historyStep >= (pages[currentPage]?.history.length - 1))}
                >
                  Redo
                </Button>
                
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ClearIcon />}
                  onClick={annotationMode ? clearOverlay : clearCanvas}
                  color="error"
                >
                  {annotationMode ? 'Clear Overlay' : 'Clear Page'}
                </Button>
                
                {!annotationMode && userRole === 'teacher' && (
                  <>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<SaveIcon />}
                      onClick={() => setShowSaveDialog(true)}
                    >
                      Save Page
                    </Button>
                    
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<SaveIcon />}
                      onClick={saveAllPages}
                    >
                      Save All Pages
                    </Button>
                  </>
                )}
                
                {annotationMode && (
                  <Typography variant="caption" color="warning.main" sx={{ mt: 1, textAlign: 'center' }}>
                    ⚠️ Annotation mode - drawings are temporary and won't be saved
                  </Typography>
                )}
              </Box>

              {/* Saved Notes */}
              {whiteboardNotes.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>Saved Notes</Typography>
                  <List dense>
                    {whiteboardNotes.slice(0, 5).map((note, index) => (
                      <ListItem
                        key={index}
                        button
                        onClick={() => loadNoteToCanvas(note)}
                      >
                        <ListItemIcon>
                          <NoteIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary={note.title}
                          secondary={note.description?.substring(0, 30) + '...'}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </Paper>

            {/* Enhanced Dual Canvas System */}
            <Box sx={{ flex: 1, position: 'relative', bgcolor: '#f5f5f5', overflow: 'hidden' }}>
              {/* Main Whiteboard Canvas */}
              <canvas
                ref={canvasRef}
                style={{
                  width: '100%',
                  height: '100%',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  zIndex: 1,
                  backgroundColor: 'white'
                }}
              />
              
              {/* Annotation Overlay Canvas */}
              {annotationMode && (
                <canvas
                  ref={overlayCanvasRef}
                  style={{
                    width: '100%',
                    height: '100%',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    zIndex: 2,
                    opacity: overlayVisible ? (overlayOpacity / 100) : 0,
                    pointerEvents: overlayVisible ? 'auto' : 'none'
                  }}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                />
              )}
              
              {/* Main Canvas Event Layer */}
              {!annotationMode && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    zIndex: 3,
                    cursor: tool === 'eraser' ? 'crosshair' : 'default'
                  }}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                />
              )}
              
              {/* Text Input Overlay */}
              {showTextInput && (
                <Box
                  sx={{
                    position: 'absolute',
                    left: textInputPosition.x,
                    top: textInputPosition.y,
                    zIndex: 10,
                    minWidth: 200
                  }}
                >
                  <TextField
                    autoFocus
                    multiline
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        addText();
                      } else if (e.key === 'Escape') {
                        setShowTextInput(false);
                        setTextInput('');
                      }
                    }}
                    variant="outlined"
                    size="small"
                    sx={{
                      background: 'white',
                      '& .MuiOutlinedInput-root': {
                        fontSize: `${brushSize}px`,
                        color: brushColor
                      }
                    }}
                  />
                  <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                    <Button size="small" variant="contained" onClick={addText}>
                      Add Text
                    </Button>
                    <Button 
                      size="small" 
                      variant="outlined" 
                      onClick={() => {
                        setShowTextInput(false);
                        setTextInput('');
                      }}
                    >
                      Cancel
                    </Button>
                  </Box>
                </Box>
              )}
            </Box>
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Save Note Dialog */}
      <Dialog
        open={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Save Whiteboard as Note</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Note Title"
            value={noteTitle}
            onChange={(e) => setNoteTitle(e.target.value)}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Description (Optional)"
            value={noteDescription}
            onChange={(e) => setNoteDescription(e.target.value)}
            margin="normal"
            multiline
            rows={3}
          />
          <TextField
            fullWidth
            label="Tags (comma separated)"
            value={noteTags}
            onChange={(e) => setNoteTags(e.target.value)}
            margin="normal"
            helperText="e.g. math, lesson1, important"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSaveDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveNote} variant="contained">Save Note</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default EnhancedWhiteboard;