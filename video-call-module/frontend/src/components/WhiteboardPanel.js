import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  IconButton,
  Tooltip,
  Divider,
  Typography,
  ButtonGroup,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Brush,
  Crop,
  FormatColorFill,
  Highlight,
  TextFields,
  CropFree,
  Undo,
  Redo,
  Clear,
  Save,
  FolderOpen,
  PictureAsPdf,
  Download,
  ZoomIn,
  ZoomOut,
  CenterFocusStrong,
} from '@mui/icons-material';

import AdvancedWhiteboard from './whiteboard/AdvancedWhiteboard';

const WhiteboardPanel = ({ 
  socket, 
  isTeacher = false, 
  classId, 
  onClose,
  fullscreen = false 
}) => {
  const whiteboardRef = useRef(null);
  const [currentTool, setCurrentTool] = useState('pen');
  const [brushSize, setBrushSize] = useState(3);
  const [brushColor, setBrushColor] = useState('#000000');
  const [brushOpacity, setBrushOpacity] = useState(1);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);

  // Available tools
  const tools = [
    { id: 'pen', icon: <Brush />, label: 'Pen', color: 'primary' },
    { id: 'highlighter', icon: <Highlight />, label: 'Highlighter', color: 'warning' },
    { id: 'eraser', icon: <Crop />, label: 'Eraser', color: 'error' },
    { id: 'text', icon: <TextFields />, label: 'Text', color: 'info' },
    { id: 'rectangle', icon: <CropFree />, label: 'Rectangle', color: 'secondary' },
    { id: 'circle', icon: <CropFree />, label: 'Circle', color: 'secondary' },
    { id: 'line', icon: <CropFree />, label: 'Line', color: 'secondary' },
  ];

  // Color palette
  const colors = [
    '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
    '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080',
    '#008000', '#FFC0CB', '#A52A2A', '#808080', '#000080'
  ];

  // Initialize whiteboard
  useEffect(() => {
    if (whiteboardRef.current && socket) {
      // Initialize advanced whiteboard with collaboration
      whiteboardRef.current.enableCollaboration({
        socket: socket,
        roomId: classId,
        userId: socket.id,
        isTeacher: isTeacher
      });

      // Set initial tool settings
      whiteboardRef.current.setTool(currentTool);
      whiteboardRef.current.setBrushSettings({
        size: brushSize,
        color: brushColor,
        opacity: brushOpacity
      });
    }
  }, [socket, classId, isTeacher]);

  // Handle tool change
  const handleToolChange = (toolId) => {
    setCurrentTool(toolId);
    if (whiteboardRef.current) {
      whiteboardRef.current.setTool(toolId);
    }
  };

  // Handle brush settings change
  const handleBrushChange = (property, value) => {
    const settings = { size: brushSize, color: brushColor, opacity: brushOpacity };
    settings[property] = value;

    if (property === 'size') setBrushSize(value);
    if (property === 'color') setBrushColor(value);
    if (property === 'opacity') setBrushOpacity(value);

    if (whiteboardRef.current) {
      whiteboardRef.current.setBrushSettings(settings);
    }
  };

  // Handle whiteboard actions
  const handleUndo = () => whiteboardRef.current?.undo();
  const handleRedo = () => whiteboardRef.current?.redo();
  const handleClear = () => whiteboardRef.current?.clear();
  const handleZoomIn = () => whiteboardRef.current?.zoomIn();
  const handleZoomOut = () => whiteboardRef.current?.zoomOut();
  const handleResetZoom = () => whiteboardRef.current?.resetZoom();

  // Handle save/load
  const handleSave = async () => {
    if (whiteboardRef.current) {
      const data = await whiteboardRef.current.exportData();
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `whiteboard-${classId}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
    setSaveDialogOpen(false);
  };

  const handleExportPDF = async () => {
    if (whiteboardRef.current) {
      await whiteboardRef.current.exportToPDF(`whiteboard-${classId}.pdf`);
    }
  };

  const handleLoadFile = (event) => {
    const file = event.target.files[0];
    if (file && whiteboardRef.current) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          whiteboardRef.current.importData(data);
        } catch (error) {
          console.error('Error loading whiteboard data:', error);
        }
      };
      reader.readAsText(file);
    }
    setLoadDialogOpen(false);
  };

  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      bgcolor: 'background.paper'
    }}>
      {/* Toolbar */}
      <Paper elevation={2} sx={{ p: 1, mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          {/* Tools */}
          <ButtonGroup size="small" variant="outlined">
            {tools.map((tool) => (
              <Tooltip key={tool.id} title={tool.label}>
                <IconButton
                  onClick={() => handleToolChange(tool.id)}
                  color={currentTool === tool.id ? tool.color : 'default'}
                  variant={currentTool === tool.id ? 'contained' : 'outlined'}
                >
                  {tool.icon}
                </IconButton>
              </Tooltip>
            ))}
          </ButtonGroup>

          <Divider orientation="vertical" flexItem />

          {/* Brush Size */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 120 }}>
            <Typography variant="caption">Size:</Typography>
            <Slider
              value={brushSize}
              onChange={(e, value) => handleBrushChange('size', value)}
              min={1}
              max={50}
              size="small"
              sx={{ width: 80 }}
            />
            <Typography variant="caption">{brushSize}</Typography>
          </Box>

          <Divider orientation="vertical" flexItem />

          {/* Colors */}
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {colors.map((color) => (
              <Tooltip key={color} title={`Color: ${color}`}>
                <Box
                  onClick={() => handleBrushChange('color', color)}
                  sx={{
                    width: 24,
                    height: 24,
                    bgcolor: color,
                    border: brushColor === color ? '2px solid #1976d2' : '1px solid #ccc',
                    borderRadius: 1,
                    cursor: 'pointer',
                    '&:hover': { transform: 'scale(1.1)' }
                  }}
                />
              </Tooltip>
            ))}
          </Box>

          <Divider orientation="vertical" flexItem />

          {/* Actions */}
          <ButtonGroup size="small">
            <Tooltip title="Undo">
              <IconButton onClick={handleUndo}>
                <Undo />
              </IconButton>
            </Tooltip>
            <Tooltip title="Redo">
              <IconButton onClick={handleRedo}>
                <Redo />
              </IconButton>
            </Tooltip>
            <Tooltip title="Clear All">
              <IconButton onClick={handleClear} color="error">
                <Clear />
              </IconButton>
            </Tooltip>
          </ButtonGroup>

          <Divider orientation="vertical" flexItem />

          {/* Zoom Controls */}
          <ButtonGroup size="small">
            <Tooltip title="Zoom In">
              <IconButton onClick={handleZoomIn}>
                <ZoomIn />
              </IconButton>
            </Tooltip>
            <Tooltip title="Zoom Out">
              <IconButton onClick={handleZoomOut}>
                <ZoomOut />
              </IconButton>
            </Tooltip>
            <Tooltip title="Reset Zoom">
              <IconButton onClick={handleResetZoom}>
                <CenterFocusStrong />
              </IconButton>
            </Tooltip>
          </ButtonGroup>

          {/* Save/Load Controls (Teacher only) */}
          {isTeacher && (
            <>
              <Divider orientation="vertical" flexItem />
              <ButtonGroup size="small">
                <Tooltip title="Save Whiteboard">
                  <IconButton onClick={() => setSaveDialogOpen(true)}>
                    <Save />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Load Whiteboard">
                  <IconButton onClick={() => setLoadDialogOpen(true)}>
                    <FolderOpen />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Export PDF">
                  <IconButton onClick={handleExportPDF}>
                    <PictureAsPdf />
                  </IconButton>
                </Tooltip>
              </ButtonGroup>
            </>
          )}
        </Box>

        {/* Opacity Slider */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
          <Typography variant="caption">Opacity:</Typography>
          <Slider
            value={brushOpacity}
            onChange={(e, value) => handleBrushChange('opacity', value)}
            min={0.1}
            max={1}
            step={0.1}
            size="small"
            sx={{ width: 200 }}
          />
          <Typography variant="caption">{Math.round(brushOpacity * 100)}%</Typography>
        </Box>
      </Paper>

      {/* Whiteboard Canvas */}
      <Box sx={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <AdvancedWhiteboard
          ref={whiteboardRef}
          width="100%"
          height="100%"
          collaborationEnabled={true}
          teacherMode={isTeacher}
          style={{ 
            width: '100%', 
            height: '100%', 
            border: '1px solid #e0e0e0',
            borderRadius: 4
          }}
        />
      </Box>

      {/* Save Dialog */}
      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)}>
        <DialogTitle>Save Whiteboard</DialogTitle>
        <DialogContent>
          <Typography>
            Save the current whiteboard state as a JSON file that can be loaded later.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Load Dialog */}
      <Dialog open={loadDialogOpen} onClose={() => setLoadDialogOpen(false)}>
        <DialogTitle>Load Whiteboard</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Load a previously saved whiteboard file.
          </Typography>
          <input
            type="file"
            accept=".json"
            onChange={handleLoadFile}
            style={{ width: '100%' }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLoadDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WhiteboardPanel;
