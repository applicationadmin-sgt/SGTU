import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  IconButton,
  Button,
  ButtonGroup,
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
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Badge,
  Snackbar,
  Alert,
  Tabs,
  Tab,
  Card,
  CardContent,
  LinearProgress,
  Fade,
  Zoom,
  Drawer,
  Switch,
  FormControlLabel
} from '@mui/material';
// Material-UI icons replaced with emoji/unicode symbols for better compatibility
import { styled, alpha } from '@mui/material/styles';
// Enhanced fabric loading with better error handling and debugging
let fabric;
let Canvas, PencilBrush, IText, Rect, FabricCircle, Line, Path, FabricImage, util;

// Removed legacy simple-canvas fallback (it caused conflicts & disappearing objects). Advanced Fabric version below.
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// ==================== STYLED COMPONENTS ====================

const WhiteboardContainer = styled(Box)(({ theme, fullscreen }) => ({
  height: fullscreen === true ? '100vh' : '95vh', // Use more viewport height
  width: fullscreen === true ? '100vw' : '100%',
  minHeight: '600px', // Reduced minimum height
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: '#f8fafc',
  position: fullscreen === true ? 'fixed' : 'relative',
  top: fullscreen === true ? 0 : 'auto',
  left: fullscreen === true ? 0 : 'auto',
  zIndex: fullscreen === true ? 9999 : 1,
  overflow: 'hidden',
  border: fullscreen === true ? 'none' : '1px solid #e2e8f0',
  borderRadius: fullscreen === true ? 0 : theme.spacing(1),
  transition: 'all 0.3s ease-in-out',
  // Add CSS animation for upload spinner
  '& @keyframes spin': {
    '0%': { transform: 'rotate(0deg)' },
    '100%': { transform: 'rotate(360deg)' }
  }
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
  },
  // Enhanced button hover effects
  '& .MuiToggleButton-root': {
    transition: 'all 0.2s ease-in-out',
    '&:hover': {
      backgroundColor: 'rgba(59, 130, 246, 0.08)',
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 8px rgba(0,0,0,0.12)'
    },
    '&.Mui-selected': {
      backgroundColor: 'rgba(59, 130, 246, 0.12)',
      '&:hover': {
        backgroundColor: 'rgba(59, 130, 246, 0.16)'
      }
    }
  },
  '& .MuiButton-root': {
    transition: 'all 0.2s ease-in-out',
    '&:hover': {
      backgroundColor: 'rgba(59, 130, 246, 0.08)',
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 8px rgba(0,0,0,0.12)'
    }
  }
}));

const ToolPanel = styled(Paper)(({ theme, position = 'left', collapsed }) => {
  // Normalize collapsed (can arrive as string 'true' / 'false')
  const isCollapsed = collapsed === true || collapsed === 'true';
  return {
  position: 'relative',
  width: isCollapsed ? 48 : 260,
  minWidth: isCollapsed ? 48 : 260,
  height: '100%',
  zIndex: 1000,
  // Use fully opaque solid background to avoid milky/faded appearance over canvas
  backgroundColor: '#ffffff',
  // Removed backdropFilter blur which created a semi-transparent / washed-out look
  borderRadius: '8px',
  transition: 'all 0.3s ease-in-out',
  overflow: isCollapsed ? 'hidden' : 'visible',
  display: 'flex',
  flexDirection: 'column',
  border: '1px solid #e2e8f0',
  boxShadow: '2px 0 10px rgba(0,0,0,0.05)',
  marginRight: theme.spacing(2)
};
});

const CanvasContainer = styled(Box)(({ theme, fullscreen }) => ({
  flex: 1,
  position: 'relative',
  overflow: 'hidden',
  backgroundColor: '#ffffff',
  minHeight: fullscreen === true ? '100vh' : 'calc(100vh - 200px)', // Better height calculation
  height: '100%',
  width: '100%',
  display: 'flex', // Use flex for better centering
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(1),
  '& canvas': {
    border: '2px solid #e2e8f0 !important',
    display: 'block !important',
    boxShadow: fullscreen === true ? 'none' : '0 4px 12px rgba(0,0,0,0.15)',
    borderRadius: '8px',
    maxWidth: '100%',
    maxHeight: '100%',
    cursor: 'crosshair'
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

const FloatingToolbar = styled(Paper)(({ theme }) => ({
  position: 'absolute',
  bottom: 20,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 1001,
  padding: theme.spacing(1),
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  backgroundColor: '#ffffff',
  // Removed backdropFilter blur for clarity
  borderRadius: 24,
  transition: 'all 0.3s ease-in-out',
  border: '1px solid #e2e8f0',
  boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
}));

// ==================== MAIN COMPONENT ====================

const AdvancedWhiteboard = ({ 
  socket, 
  user, 
  classId, 
  isTeacher = false, 
  onStateChange,
  initialData = null 
}) => {
  // ==================== CORE STATE ====================
  // Track async loading of Fabric.js so we can show a clean inline fallback without throwing
  const [fabricLoading, setFabricLoading] = useState(true);
  const canvasRef = useRef(null);
  const fabricCanvas = useRef(null);
  const fileInputRef = useRef(null);
  const pdfInputRef = useRef(null);
  
  // Performance optimization variables
  let lastPointerTime = 0;
  let lastRenderTime = 0;
  
  const [isReady, setIsReady] = useState(false);
  const [currentTool, setCurrentTool] = useState('pen');
  const [isDrawing, setIsDrawing] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // ==================== TOOL STATES ====================
  const [brushSettings, setBrushSettings] = useState({
    color: '#000000',
    width: 2,
    opacity: 1,
    type: 'pencil' // pencil, brush, marker, highlighter
  });
  
  const [shapeSettings, setShapeSettings] = useState({
    fillColor: '#ffffff',
    strokeColor: '#000000',
    strokeWidth: 2,
    opacity: 1,
    fill: false
  });
  
  const [textSettings, setTextSettings] = useState({
    fontSize: 16,
    fontFamily: 'Arial',
    color: '#000000',
    bold: false,
    italic: false,
    underline: false,
    alignment: 'left'
  });
  
  // ==================== UI STATES ====================
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [showRulers, setShowRulers] = useState(false);
  const [gridSize, setGridSize] = useState(20);
  
  // ==================== COLLABORATION STATES ====================
  const [collaborators, setCollaborators] = useState([]);
  const [isLocked, setIsLocked] = useState(false);
  const [lockUser, setLockUser] = useState(null);
  const [remotePointers, setRemotePointers] = useState({});
  // === New state for transform panel sync ===
  const [selectedTransform, setSelectedTransform] = useState({ scale: 1, angle: 0 });
  const [activeImageId, setActiveImageId] = useState(null); // track currently selected image/pdf for HUD

  // Ref to store original & successive cropped sources for multi-step crop undo
  // Map<key, Array<{src:string, angle:number}>>
  const originalImageSourcesRef = useRef(new Map());
  const [cropVersionTick, setCropVersionTick] = useState(0); // force re-render when history changes
  
  // ==================== LAYER STATES ====================
  const [layers, setLayers] = useState([
    { id: 'main', name: 'Main Layer', visible: true, locked: false, opacity: 1 }
  ]);
  const [currentLayer, setCurrentLayer] = useState('main');
  
  // ==================== HISTORY STATES ====================
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  
  // ==================== ANNOTATION STATES ====================
  const [annotations, setAnnotations] = useState([]);
  const [selectedAnnotation, setSelectedAnnotation] = useState(null);
  const [annotationMode, setAnnotationMode] = useState(false);
  
  // ==================== EXPORT/IMPORT STATES ====================
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState('png');
  const [exportQuality, setExportQuality] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // ==================== NOTIFICATION STATES ====================
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  
  // ==================== ERROR RECOVERY STATES ====================
  const [initializationError, setInitializationError] = useState(null);
  
  // ==================== MATH TOOL STATES ====================
  const [mathMode, setMathMode] = useState(false);
  const [mathEquation, setMathEquation] = useState('');
  const [mathDialogOpen, setMathDialogOpen] = useState(false);
  
  // ==================== PDF/IMAGE STATES ====================
  const [loadedImages, setLoadedImages] = useState([]);
  const [currentPdf, setCurrentPdf] = useState(null);
  const [pdfPages, setPdfPages] = useState([]);
  const [currentPdfPage, setCurrentPdfPage] = useState(0);
  const [pdfContextMenu, setPdfContextMenu] = useState({ show: false, x: 0, y: 0, pdfObject: null });
  
  // ==================== RECORDING STATES ====================
  const [isRecording, setIsRecording] = useState(false);
  const [recordingData, setRecordingData] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  
  // ==================== UNDO/REDO FUNCTIONS ====================
  // Define undo/redo early to be used in keyboard shortcuts useEffect
  const undo = useCallback(() => {
    if (!canUndo || historyIndex <= 0) return;
    
    const newIndex = historyIndex - 1;
    const state = history[newIndex];
    
    if (fabricCanvas.current) {
      fabricCanvas.current.loadFromJSON(state, () => {
        fabricCanvas.current.renderAll();
      });
    }
    
    setHistoryIndex(newIndex);
    setCanUndo(newIndex > 0);
    setCanRedo(true);
    
    if (socket && isTeacher) {
      socket.emit('whiteboard:undo', { classId, userId: user.id });
    }
  }, [canUndo, historyIndex, history, socket, classId, isTeacher, user.id]);
  
  const redo = useCallback(() => {
    if (!canRedo || historyIndex >= history.length - 1) return;
    
    const newIndex = historyIndex + 1;
    const state = history[newIndex];
    
    if (fabricCanvas.current) {
      fabricCanvas.current.loadFromJSON(state, () => {
        fabricCanvas.current.renderAll();
      });
    }
    
    setHistoryIndex(newIndex);
    setCanRedo(newIndex < history.length - 1);
    setCanUndo(true);
    
    if (socket && isTeacher) {
      socket.emit('whiteboard:redo', { classId, userId: user.id });
    }
  }, [canRedo, historyIndex, history, socket, classId, isTeacher, user.id]);

  // ==================== EARLY FUNCTION STUBS ====================
  // Create early stubs to avoid initialization order issues
  let recordActionRef = useRef(() => {}); // Stub function
  let saveCanvasStateRef = useRef(() => {}); // Stub function
  let updateLayersFromCanvasRef = useRef(() => {}); // Stub function
  let showNotificationRef = useRef(() => {}); // Stub function
  let setToolRef = useRef(() => {}); // Stub function
  
  const recordAction = useCallback((action, data) => {
    return recordActionRef.current(action, data);
  }, []);
  
  const saveCanvasState = useCallback(() => {
    return saveCanvasStateRef.current();
  }, []);
  
  const updateLayersFromCanvas = useCallback(() => {
    return updateLayersFromCanvasRef.current();
  }, []);
  
  const showNotification = useCallback((message, severity = 'info') => {
    return showNotificationRef.current(message, severity);
  }, []);
  
  const setTool = useCallback((tool) => {
    return setToolRef.current(tool);
  }, []);
  
  // ==================== CANVAS INITIALIZATION ====================
  const initializeCanvas = useCallback((canvasElement) => {
    if (!canvasElement) {
      console.log('[INIT] Canvas element not provided');
      setInitializationError('Canvas element not available');
      return;
    }

    if (!Canvas || !fabric) {
      console.error('[INIT] Fabric.js not loaded properly');
      setInitializationError('Fabric.js library not loaded. Please refresh the page.');
      return;
    }

    console.log('[INIT] Canvas element received, initializing...');
    
    try {
      // Clean up any existing canvas
      if (fabricCanvas.current) {
        try {
          fabricCanvas.current.dispose();
        } catch (e) {
          console.warn('Canvas cleanup warning:', e);
        }
        fabricCanvas.current = null;
      }
      
      console.log('[FABRIC] Creating Fabric.js canvas...');
      
      // Get container dimensions with better responsive calculation
      const container = canvasElement.parentElement;
      if (!container) {
        throw new Error('Canvas container not found');
      }
      
      const containerRect = container.getBoundingClientRect();
      const containerWidth = Math.max(containerRect.width || 800, 300);
      const containerHeight = Math.max(containerRect.height || 600, 200);
      
      // Calculate optimal canvas size (responsive but with reasonable limits)
      const canvasWidth = Math.min(Math.max(containerWidth - 40, 400), 1400);
      const canvasHeight = Math.min(Math.max(containerHeight - 40, 300), 900);
      
      console.log('[CANVAS] Setting responsive dimensions:', canvasWidth, 'x', canvasHeight);
      console.log('[CONTAINER] Container dimensions:', containerWidth, 'x', containerHeight);
      
      // Get device pixel ratio for high-DPI displays
      const dpr = window.devicePixelRatio || 1;
      console.log('[DPI] Device Pixel Ratio:', dpr);
      
      // Create canvas with high-DPI settings for crisp rendering
      // Fabric.js will handle retina scaling automatically when enabled
      const canvas = new Canvas(canvasElement, {
        width: canvasWidth,
        height: canvasHeight,
        backgroundColor: '#ffffff',
        selection: true,
        preserveObjectStacking: true,
        renderOnAddRemove: true,
        enableRetinaScaling: true, // Fabric.js handles DPI scaling automatically
        allowTouchScrolling: false,
        imageSmoothingEnabled: true, // Enable for better text/image quality
        perPixelTargetFind: true,
        targetFindTolerance: 4
      });
      
      console.log('[CANVAS] Created with dimensions:', canvasWidth, 'x', canvasHeight);
      console.log('[CANVAS] Retina scaling enabled - Fabric.js will handle DPI automatically');
      console.log('[CANVAS] Actual canvas resolution:', canvasElement.width, 'x', canvasElement.height);
      
      // Force global alpha to 1.0 (fully opaque) for the canvas context
      const ctx = canvasElement.getContext('2d');
      if (ctx) {
        ctx.globalAlpha = 1.0; // Ensure full opacity globally
        console.log('[CANVAS] Global alpha set to 1.0 for solid colors');
      }
      
      console.log('[SUCCESS] ✅ Fabric canvas created with dimensions:', canvasWidth, 'x', canvasHeight);
      console.log('[CONTAINER] Container dimensions:', containerWidth, 'x', containerHeight);
      
      // Store reference
      fabricCanvas.current = canvas;
      
      // Set up basic brush with high-quality settings and SOLID OPACITY
      const brush = new PencilBrush(canvas);
      brush.width = brushSettings.width || 2;
      brush.strokeLineCap = 'round';
      brush.strokeLineJoin = 'round';
      brush.strokeMiterLimit = 10;
      
      // ALWAYS start with solid opaque color (100% opacity)
      const initOpacity = brushSettings.opacity !== undefined ? brushSettings.opacity : 1;
      if (initOpacity < 1) {
        // Handle transparent colors
        const color = brushSettings.color || '#000000';
        if (color.startsWith('#')) {
          const r = parseInt(color.slice(1, 3), 16);
          const g = parseInt(color.slice(3, 5), 16);
          const b = parseInt(color.slice(5, 7), 16);
          brush.color = `rgba(${r}, ${g}, ${b}, ${initOpacity})`;
        } else {
          brush.color = color;
        }
      } else {
        // Use solid opaque color for 100% opacity
        brush.color = brushSettings.color || '#000000';
      }
      
      canvas.freeDrawingBrush = brush;
      
      console.log('[BRUSH] Initial brush configured:', { 
        color: brush.color, 
        width: brush.width, 
        opacity: initOpacity 
      });
      
      // CRITICAL: Force canvas to render at full opacity
      // Override Fabric.js rendering to prevent opacity reduction
      canvas.renderAll();
      
      // Set canvas default rendering properties for solid colors
      if (canvas.contextContainer) {
        canvas.contextContainer.globalAlpha = 1.0;
      }
      if (canvas.contextTop) {
        canvas.contextTop.globalAlpha = 1.0;
      }
      
      // Set initial mode
      canvas.isDrawingMode = true; // Start with pen mode
      canvas.selection = false;
      
      // Performance optimizations
      canvas.perPixelTargetFind = false;
      canvas.targetFindTolerance = 4;
      
      // Set ready
      console.log('[READY] ✅ Canvas is ready for use!');
      setIsReady(true);
      setInitializationError(null);
      // Ensure the automatically created upper canvas stays transparent (it was covering drawings)
      try {
        if (canvas.upperCanvasEl) {
          canvas.upperCanvasEl.style.background = 'transparent';
          // IMPORTANT: keep pointer events enabled so Fabric can capture drawing events
          canvas.upperCanvasEl.style.pointerEvents = 'auto';
          canvas.upperCanvasEl.style.opacity = '1';
          canvas.upperCanvasEl.style.cursor = 'crosshair';
          console.log('[FIX] upperCanvasEl ready (pointerEvents=auto)');
        }
      } catch (ucErr) { console.warn('[WARN] Could not adjust upperCanvasEl', ucErr); }
      // DEBUG visibility test rectangle
      // (Removed debug test rectangle & raw 2D square used during diagnostics)
      // If future visual diagnostics are needed, reintroduce a temporary shape here.

      // Expose debug helper
      window.__whiteboardDebug = () => {
        try {
          const objs = canvas.getObjects();
          console.log('[WB DEBUG] objects:', objs.length, objs.map(o=>({type:o.type,left:o.left,top:o.top,visible:o.visible,width:o.width,height:o.height,stroke:o.stroke,fill:o.fill,opacity:o.opacity}))); 
          console.log('[WB DEBUG] zoom:', canvas.getZoom(), 'vpt:', canvas.viewportTransform, 'size:', canvas.getWidth(), canvas.getHeight());
          console.log('[WB DEBUG] canvas element size:', canvasElement.width, canvasElement.height, 'css:', canvasElement.style.width, canvasElement.style.height);
          const rect = canvasElement.getBoundingClientRect();
          console.log('[WB DEBUG] boundingClientRect:', rect);
        } catch(err){ console.error('[WB DEBUG] error', err); }
      };
      console.log('[DEBUG] window.__whiteboardDebug() registered');
      
    } catch (error) {
      console.error('[ERROR] ❌ Fabric canvas creation failed:', error);
      setInitializationError(error.message);
    }
  }, [brushSettings]);

  // Callback ref function to initialize canvas when element is mounted
  const canvasCallbackRef = useCallback((element) => {
    console.log('[REF] Canvas ref callback called with:', element);
    canvasRef.current = element;
    
    // Only attempt initialization after fabric core is loaded
    if (element && !isReady && !fabricCanvas.current && !fabricLoading && fabric && Canvas) {
      console.log('[REF] Starting initialization from callback...');
      // Small delay to ensure DOM is fully ready
      setTimeout(() => initializeCanvas(element), 50);
    }
  }, [initializeCanvas, isReady, fabricLoading]);

  // ==================== FABRIC DYNAMIC LOADER ====================
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // If already loaded (hot reload) skip
      if (fabric && Canvas) {
        if (!cancelled) setFabricLoading(false);
        return;
      }
      try {
        console.log('[FABRIC] Attempting dynamic import of fabric...');
        const mod = await import('fabric');
        const f = mod.fabric || mod.default || mod; // different builds expose differently
        if (!f) throw new Error('Fabric module resolved but no fabric export found');
        fabric = f;
        Canvas = f.Canvas;
        PencilBrush = f.PencilBrush || f.FabricBrush || f.FreeDrawingBrush || f.PencilBrush; // fallback chain
        IText = f.IText;
        Rect = f.Rect;
        FabricCircle = f.Circle;
        Line = f.Line;
        Path = f.Path;
        FabricImage = f.Image;
        util = f.util;
        console.log('[FABRIC] ✅ Fabric.js loaded successfully');
      } catch (err) {
        console.error('[FABRIC] ❌ Failed to load fabric dynamically:', err);
      } finally {
        if (!cancelled) setFabricLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Initialize canvas once Fabric is loaded and the <canvas> ref is present
  useEffect(() => {
    if (!fabricLoading && !isReady && canvasRef.current && !fabricCanvas.current && fabric && Canvas) {
      console.log('[FABRIC] Post-load initializing canvas...');
      initializeCanvas(canvasRef.current);
    }
  }, [fabricLoading, isReady, initializeCanvas]);

  // Fallback initialization with useEffect as backup
  useEffect(() => {
    console.log('[FALLBACK] Checking if canvas needs initialization...');
    console.log('[FALLBACK] isReady:', isReady, 'canvasRef.current:', !!canvasRef.current, 'fabricCanvas.current:', !!fabricCanvas.current);
    
    if (!isReady && canvasRef.current && !fabricCanvas.current) {
      console.log('[FALLBACK] Running fallback initialization...');
      setTimeout(() => {
        if (canvasRef.current && !fabricCanvas.current) {
          initializeCanvas(canvasRef.current);
        }
      }, 100);
    }
  }, [isReady, initializeCanvas]);

  // Keyboard shortcuts for better workflow
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!fabricCanvas.current || !isReady) return;
      
      // Don't trigger shortcuts when typing in inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      switch (e.key.toLowerCase()) {
        case 's':
          if (!e.ctrlKey && !e.metaKey) setTool('select');
          break;
        case 'p':
          if (!e.ctrlKey && !e.metaKey) setTool('pen');
          break;
        case 'b':
          if (!e.ctrlKey && !e.metaKey) setTool('brush');
          break;
        case 'e':
          if (!e.ctrlKey && !e.metaKey) setTool('eraser');
          break;
        case 't':
          if (!e.ctrlKey && !e.metaKey) setTool('text');
          break;
        case 'r':
          if (!e.ctrlKey && !e.metaKey) setTool('rectangle');
          break;
        case 'c':
          if (!e.ctrlKey && !e.metaKey) setTool('circle');
          break;
        case 'z':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (e.shiftKey) {
              redo();
            } else {
              undo();
            }
          }
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [setTool, undo, redo, isReady]);

  // Auto-activate initial tool when ready
  useEffect(() => {
    if (isReady && fabricCanvas.current && setTool) {
      console.log('🔧 Activating initial tool: pen');
      console.log('🔧 Canvas ready:', !!fabricCanvas.current);
      console.log('🔧 SetTool function ready:', !!setTool);
      
      // Small delay to ensure canvas is fully ready
      setTimeout(() => {
        setTool('pen'); // Start with pen tool
        console.log('🔧 Initial tool set to pen');
      }, 200);
    }
  }, [isReady, setTool]);

  // Update brush settings when they change (debounced to reduce re-renders)
  useEffect(() => {
    if (isReady && fabricCanvas.current && currentTool && 
        ['pen', 'pencil', 'brush', 'marker', 'highlighter', 'eraser'].includes(currentTool)) {
      
      console.log('🎨 Updating brush for tool:', currentTool, 'settings:', brushSettings);
      
      // Debounce the tool update to reduce excessive re-renders
      const timeoutId = setTimeout(() => {
        setTool(currentTool);
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [brushSettings, isReady, currentTool, setTool]);  

  // ==================== TOOL CHANGE HANDLER ====================
  // Tool changes will be handled after setTool is defined
  
  // ==================== CANVAS EVENT HANDLERS ====================
  const handlePathCreated = useCallback((e) => {
    const path = e.path;
    
    // Get current brush from canvas to ensure we use the exact same properties
    const currentBrush = fabricCanvas.current?.freeDrawingBrush;
    const actualStrokeColor = currentBrush ? currentBrush.color : brushSettings.color;
    const actualStrokeWidth = currentBrush ? currentBrush.width : brushSettings.width;
    
    console.log('🎨 Path created with brush color:', actualStrokeColor, 'original path stroke:', path.stroke);
    
    // FORCE solid color if it's a hex color (no transparency)
    let finalColor = actualStrokeColor;
    if (typeof finalColor === 'string' && finalColor.startsWith('#') && !finalColor.includes('rgba')) {
      // It's a hex color, ensure it stays solid
      finalColor = actualStrokeColor;
    } else if (typeof finalColor === 'string' && finalColor.includes('rgba')) {
      // It's already RGBA, use as-is
      finalColor = actualStrokeColor;
    } else {
      // Fallback to solid black
      finalColor = '#000000';
    }
    
    console.log('🎨 Final path color:', finalColor);
    try {
      const preBounds = path.getBoundingRect(true);
      console.log('[DEBUG] Path pre-set bounds:', preBounds);
    } catch(eBounds) { console.warn('[DEBUG] pre-bounds error', eBounds); }
    
    // Optimize path properties for better performance while preserving drawing quality
    path.set({
      layer: currentLayer,
      userId: user.id,
      timestamp: Date.now(),
      selectable: false, // Make paths non-selectable by default for performance
      evented: false, // Disable events for better performance
      hasControls: false,
      hasBorders: false,
      // Use the actual brush color and width to prevent fading
      stroke: finalColor, // Use the processed color
      strokeWidth: actualStrokeWidth, // Use the actual brush width
      opacity: 1, // FORCE opacity to 1 (100%)
      globalAlpha: 1, // Additional opacity enforcement
      strokeLineCap: 'round', // Ensure smooth line caps
      strokeLineJoin: 'round', // Ensure smooth line joins
      // Prevent any transparency
      fillRule: 'nonzero',
      paintFirst: 'stroke'
    });
    // Extra enforcement
    path.visible = true;
    if (!path.stroke || path.stroke === 'transparent' || path.stroke === '#ffffff') {
      path.set({ stroke: '#000000' });
    }
    
    // Immediate render for responsive feel with proper opacity
    fabricCanvas.current.renderAll();

    try {
      const postBounds = path.getBoundingRect(true);
      console.log('[DEBUG] Path post-render bounds:', postBounds);
      console.log('[DEBUG] Total objects now:', fabricCanvas.current.getObjects().length);
    } catch(e2) { console.warn('[DEBUG] post-bounds error', e2); }
    
    // Force additional render to ensure opacity is properly applied
    setTimeout(() => {
      if (fabricCanvas.current) {
        fabricCanvas.current.requestRenderAll();
      }
    }, 50);
    
    // Debounce canvas state saving for smoother drawing
    setTimeout(() => saveCanvasState(), 200); // Increased delay
    
    // Throttled socket emission
    if (socket && isTeacher) {
      setTimeout(() => {
        socket.emit('whiteboard:path-created', {
          classId,
          pathData: path.toObject(),
          userId: user.id,
          layer: currentLayer
        });
      }, 100);
    }
    
    // Record action if recording
    if (isRecording) {
      recordAction('path-created', { pathData: path.toObject() });
    }
  }, [currentLayer, user.id, socket, classId, isTeacher, isRecording, saveCanvasState, recordAction]);
  
  const handleObjectAdded = useCallback((e) => {
    // Debounce layer updates and state changes to reduce re-renders
    setTimeout(() => {
      updateLayersFromCanvas();
      onStateChange?.({ type: 'object-added', object: e.target });
    }, 50);
  }, [onStateChange, updateLayersFromCanvas]);
  
  const handleObjectRemoved = useCallback((e) => {
    // Debounce layer updates and state changes to reduce re-renders
    setTimeout(() => {
      updateLayersFromCanvas();
      onStateChange?.({ type: 'object-removed', object: e.target });
    }, 50);
  }, [onStateChange, updateLayersFromCanvas]);
  
  const handleObjectModified = useCallback((e) => {
    saveCanvasState();
    
    if (socket && isTeacher) {
      socket.emit('whiteboard:object-modified', {
        classId,
        objectData: e.target.toObject(),
        userId: user.id
      });
    }
    
    if (isRecording) {
      recordAction('object-modified', { objectData: e.target.toObject() });
    }
  }, [socket, classId, isTeacher, user.id, isRecording, saveCanvasState, recordAction]);
  
  const handleSelectionCreated = useCallback((e) => {
    const selectedObjects = e.selected || [e.target];
    onStateChange?.({ type: 'selection-created', objects: selectedObjects });
  }, [onStateChange]);
  
  const handleSelectionCleared = useCallback(() => {
    onStateChange?.({ type: 'selection-cleared' });
  }, [onStateChange]);
  
  const handleMouseDown = useCallback((e) => {
    if (!isTeacher && isLocked) return;
    
    setIsDrawing(true);
    console.log('[MOUSE] down - isDrawingMode:', fabricCanvas.current?.isDrawingMode, 'tool:', currentTool);
    
    const pointer = fabricCanvas.current.getPointer(e.e);
    
    // Emit pointer position for collaboration
    if (socket) {
      socket.emit('whiteboard:pointer-move', {
        classId,
        userId: user.id,
        pointer,
        action: 'down'
      });
    }
  }, [isTeacher, isLocked, socket, classId, user.id]);
  
  const handleMouseMove = useCallback((e) => {
    if (!isTeacher && isLocked) return;
    
    // Throttle mouse move events more aggressively to reduce lag
    const now = Date.now();
    if (now - lastPointerTime < 50) return; // Throttle to ~20fps instead of 60fps
    
    lastPointerTime = now;
    if (fabricCanvas.current?.isDrawingMode) {
      // Light debug trace every ~100ms
      if (now % 500 < 60) console.log('[MOUSE] move drawing active');
    }
    
    const pointer = fabricCanvas.current.getPointer(e.e);
    
    // Only emit to socket occasionally for collaboration
    if (socket && now - lastPointerTime > 100) {
      socket.emit('whiteboard:pointer-move', {
        classId,
        userId: user.id,
        pointer,
        action: 'move'
      });
    }
  }, [isTeacher, isLocked, socket, classId, user.id]);
  
  const handleMouseUp = useCallback(() => {
    setIsDrawing(false);
    console.log('[MOUSE] up');
    
    if (socket) {
      socket.emit('whiteboard:pointer-move', {
        classId,
        userId: user.id,
        pointer: null,
        action: 'up'
      });
    }
  }, [socket, classId, user.id]);
  
  // ==================== HISTORY FUNCTIONS ====================
  // Update the ref to point to the actual implementation
  useEffect(() => {
    saveCanvasStateRef.current = () => {
      if (!fabricCanvas.current) return;
      
      const state = JSON.stringify(fabricCanvas.current.toJSON(['layer', 'userId']));
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(state);
      
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      setCanUndo(true);
      setCanRedo(false);
    };
  }, [history, historyIndex]);

  // ==================== RECORDING FUNCTIONS ====================
  // Update the ref to point to the actual implementation
  useEffect(() => {
    recordActionRef.current = (action, data) => {
      if (!isRecording) return;
      
      const actionData = {
        timestamp: Date.now(),
        action,
        data,
        userId: user.id
      };
      
      setRecordingData(prev => [...prev, actionData]);
    };
  }, [isRecording, user.id]);

  // ==================== EVENT LISTENERS SETUP ====================
  useEffect(() => {
    if (fabricCanvas.current && isReady) {
      const canvas = fabricCanvas.current;
      
      // Add event listeners (only once when ready)
      canvas.on('path:created', handlePathCreated);
      canvas.on('object:added', handleObjectAdded);
      canvas.on('object:removed', handleObjectRemoved);
      canvas.on('object:modified', handleObjectModified);
      canvas.on('selection:created', handleSelectionCreated);
      canvas.on('selection:cleared', handleSelectionCleared);
      canvas.on('mouse:down', handleMouseDown);
      canvas.on('mouse:move', handleMouseMove);
      canvas.on('mouse:up', handleMouseUp);
      
      console.log('✅ Event listeners attached to canvas');
      console.log('✅ Canvas ready for drawing with tool:', currentTool);
      
      return () => {
        // Clean up event listeners
        canvas.off('path:created', handlePathCreated);
        canvas.off('object:added', handleObjectAdded);
        canvas.off('object:removed', handleObjectRemoved);
        canvas.off('object:modified', handleObjectModified);
        canvas.off('selection:created', handleSelectionCreated);
        canvas.off('selection:cleared', handleSelectionCleared);
        canvas.off('mouse:down', handleMouseDown);
        canvas.off('mouse:move', handleMouseMove);
        canvas.off('mouse:up', handleMouseUp);
      };
    }
  }, [isReady]); // Only depend on isReady, not currentTool to prevent re-attachment
  
  // ==================== ZOOM FUNCTIONALITY ====================
  useEffect(() => {
    if (fabricCanvas.current && isReady) {
      const canvas = fabricCanvas.current;
      console.log('🔍 Setting canvas zoom to:', zoom);
      
      // Apply zoom
      canvas.setZoom(zoom);
      canvas.renderAll();
    }
  }, [zoom, isReady]);
  
  // ==================== GRID FUNCTIONALITY ====================
  useEffect(() => {
    if (fabricCanvas.current && isReady) {
      const canvas = fabricCanvas.current;
      console.log('🔲 Grid visibility:', showGrid);
      
      if (showGrid) {
        // Create grid pattern
        const gridSize = 20;
        const canvasWidth = canvas.width || 800;
        const canvasHeight = canvas.height || 600;
        
        // Create SVG pattern for grid
        const patternCanvas = document.createElement('canvas');
        patternCanvas.width = gridSize;
        patternCanvas.height = gridSize;
        const ctx = patternCanvas.getContext('2d');
        
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(gridSize, 0);
        ctx.lineTo(gridSize, gridSize);
        ctx.moveTo(0, 0);
        ctx.lineTo(0, gridSize);
        ctx.stroke();
        
        const pattern = ctx.createPattern(patternCanvas, 'repeat');
        canvas.backgroundColor = pattern;
        canvas.renderAll();
      } else {
        // Remove grid
        canvas.backgroundColor = 'white';
        canvas.renderAll();
      }
    }
  }, [showGrid, isReady]);
  
  // ==================== FULLSCREEN FUNCTIONALITY ====================
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && fullscreen) {
        setFullscreen(false);
      }
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [fullscreen]);
  
  useEffect(() => {
    if (fabricCanvas.current && isReady) {
      const container = document.querySelector('[data-testid="whiteboard-container"]');
      const canvas = fabricCanvas.current;
      
      // Store current viewport transform to preserve zoom and pan
      const currentZoom = canvas.getZoom();
      const vpt = canvas.viewportTransform.slice(); // Clone the viewport transform
      
      if (fullscreen && container) {
        console.log('📺 Entering fullscreen mode');
        if (container.requestFullscreen) {
          container.requestFullscreen().catch(err => {
            console.error('Error entering fullscreen:', err);
          });
        }
        
        // Calculate fullscreen dimensions (account for toolbar space)
        const toolbarHeight = 64; // Approximate toolbar height
        const availableWidth = window.innerWidth;
        const availableHeight = window.innerHeight - toolbarHeight;
        
        // Resize canvas with proper dimensions
        canvas.setWidth(availableWidth);
        canvas.setHeight(availableHeight);
        
        // Restore zoom and viewport position
        canvas.setZoom(currentZoom);
        canvas.setViewportTransform(vpt);
        canvas.renderAll();
        
      } else if (!fullscreen && document.fullscreenElement) {
        console.log('📺 Exiting fullscreen mode');
        document.exitFullscreen().catch(err => {
          console.error('Error exiting fullscreen:', err);
        });
      } else if (!fullscreen && !document.fullscreenElement) {
        // Reset to normal size when not in fullscreen
        const normalWidth = 800;
        const normalHeight = 600;
        
        // Only resize if current size is different (avoid unnecessary re-renders)
        if (canvas.width !== normalWidth || canvas.height !== normalHeight) {
          console.log('📺 Resetting to normal size');
          canvas.setWidth(normalWidth);
          canvas.setHeight(normalHeight);
          
          // Restore zoom and viewport position
          canvas.setZoom(currentZoom);
          canvas.setViewportTransform(vpt);
          canvas.renderAll();
        }
      }
    }
  }, [fullscreen, isReady]);
  
  // ==================== MOUSE WHEEL ZOOM ====================
  useEffect(() => {
    if (fabricCanvas.current && isReady) {
      const canvas = fabricCanvas.current;
      
      const handleMouseWheel = (opt) => {
        const delta = opt.e.deltaY;
        let newZoom = canvas.getZoom();
        
        if (opt.e.ctrlKey || opt.e.metaKey) {
          // Prevent default browser zoom
          opt.e.preventDefault();
          opt.e.stopPropagation();
          
          newZoom *= 0.999 ** delta;
          
          // Constrain zoom level
          newZoom = Math.max(0.25, Math.min(3, newZoom));
          
          setZoom(newZoom);
          
          console.log('🔍 Mouse wheel zoom:', Math.round(newZoom * 100) + '%');
          return false;
        }
      };
      
      canvas.on('mouse:wheel', handleMouseWheel);
      
      return () => {
        canvas.off('mouse:wheel', handleMouseWheel);
      };
    }
  }, [isReady]);
  
  // ==================== WINDOW RESIZE HANDLER ====================
  useEffect(() => {
    const handleWindowResize = () => {
      if (fabricCanvas.current && isReady && fullscreen) {
        const canvas = fabricCanvas.current;
        const currentZoom = canvas.getZoom();
        const vpt = canvas.viewportTransform.slice();
        
        // Update canvas size for fullscreen
        const toolbarHeight = 64;
        const availableWidth = window.innerWidth;
        const availableHeight = window.innerHeight - toolbarHeight;
        
        console.log('📺 Resizing fullscreen canvas:', availableWidth, 'x', availableHeight);
        
        // Force exact canvas dimensions for fullscreen
        const canvasElement = canvas.lowerCanvasEl;
        canvasElement.style.width = availableWidth + 'px';
        canvasElement.style.height = availableHeight + 'px';
        canvasElement.width = availableWidth;
        canvasElement.height = availableHeight;
        
        // Update Fabric canvas dimensions
        canvas.setDimensions({
          width: availableWidth,
          height: availableHeight
        });
        
        canvas.setZoom(currentZoom);
        canvas.setViewportTransform(vpt);
        canvas.renderAll();
        
        console.log('✅ Fullscreen canvas set to exact dimensions');
      }
    };
    
    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, [fullscreen, isReady]);
  
  // ==================== TOOL FUNCTIONS ====================
  // Update the ref to point to the actual implementation
  useEffect(() => {
    setToolRef.current = (tool) => {
      console.log('[TOOL] Setting tool to:', tool);
      
      if (!fabricCanvas.current || !isReady) {
        console.warn('[ERROR] Canvas not ready for tool:', tool);
        return;
      }
      
      const canvas = fabricCanvas.current;
      
      try {
        // Defensive: ensure PencilBrush exists (Fabric v4 name vs v5 differences)
        if (!PencilBrush && fabric) {
          PencilBrush = fabric.PencilBrush || fabric.FabricBrush || fabric.FreeDrawingBrush || fabric.BaseBrush;
          console.log('[TOOL] Recovered PencilBrush reference:', !!PencilBrush);
        }
        if (!PencilBrush) {
          console.error('[TOOL] No drawing brush available – aborting draw tool setup');
        }
        // Clean up all previous event listeners
        // (Do not detach Fabric internal drawing listeners; only custom shape/text listeners are managed elsewhere)
        
        // Reset canvas modes
        canvas.isDrawingMode = false;
        canvas.selection = true;
        canvas.defaultCursor = 'default';
        
        switch (tool) {
          case 'select':
            console.log('[SELECT] Setting up selection tool');
            canvas.defaultCursor = 'default';
            canvas.selection = true;
            canvas.isDrawingMode = false;
            break;
            
          case 'pen':
          case 'pencil':
            console.log('[PEN] Setting up pen tool');
            canvas.isDrawingMode = true;
            canvas.selection = false;
            const penBrush = new (PencilBrush || fabric.PencilBrush || fabric.FreeDrawingBrush)(canvas);
            // Always use solid color unless opacity explicitly set below 1
            const penOpacity = brushSettings.opacity !== undefined ? brushSettings.opacity : 1;
            if (penOpacity < 1) {
              // For semi-transparent brushes, modify the color to include alpha
              const color = brushSettings.color || '#000000';
              if (color.startsWith('#')) {
                const r = parseInt(color.slice(1, 3), 16);
                const g = parseInt(color.slice(3, 5), 16);
                const b = parseInt(color.slice(5, 7), 16);
                penBrush.color = `rgba(${r}, ${g}, ${b}, ${penOpacity})`;
              } else {
                penBrush.color = color;
              }
            } else {
              // Use solid opaque color for 100% opacity
              penBrush.color = brushSettings.color || '#000000';
            }
            penBrush.width = brushSettings.width;
            penBrush.strokeLineCap = 'round';
            penBrush.strokeLineJoin = 'round';
            console.log('[PEN] Brush configured:', { color: penBrush.color, width: penBrush.width, opacity: penOpacity });
            canvas.freeDrawingBrush = penBrush;
            if (canvas.upperCanvasEl) {
              canvas.upperCanvasEl.style.cursor = 'crosshair';
            }
            break;
            
          case 'brush':
            console.log('[BRUSH] Setting up brush tool');
            canvas.isDrawingMode = true;
            canvas.selection = false;
            const brush = new (PencilBrush || fabric.PencilBrush || fabric.FreeDrawingBrush)(canvas);
            const brushOpacity = brushSettings.opacity !== undefined ? brushSettings.opacity : 1;
            if (brushOpacity < 1) {
              // For semi-transparent brushes, modify the color to include alpha
              const color = brushSettings.color || '#000000';
              if (color.startsWith('#')) {
                const r = parseInt(color.slice(1, 3), 16);
                const g = parseInt(color.slice(3, 5), 16);
                const b = parseInt(color.slice(5, 7), 16);
                brush.color = `rgba(${r}, ${g}, ${b}, ${brushOpacity})`;
              } else {
                brush.color = color;
              }
            } else {
              // Use solid opaque color for 100% opacity
              brush.color = brushSettings.color || '#000000';
            }
            brush.width = Math.max(brushSettings.width + 3, 5); // Noticeably thicker
            brush.strokeLineCap = 'round';
            brush.strokeLineJoin = 'round';
            canvas.freeDrawingBrush = brush;
            if (canvas.upperCanvasEl) {
              canvas.upperCanvasEl.style.cursor = 'crosshair';
            }
            break;
            
          case 'marker':
            console.log('[MARKER] Setting up marker tool');
            canvas.isDrawingMode = true;
            canvas.selection = false;
            const markerBrush = new (PencilBrush || fabric.PencilBrush || fabric.FreeDrawingBrush)(canvas);
            markerBrush.color = brushSettings.color;
            markerBrush.width = Math.max(brushSettings.width * 2.5, 8); // Much thicker
            markerBrush.strokeLineCap = 'round';
            markerBrush.strokeLineJoin = 'round';
            // Set opacity on the brush to prevent fading
            if (brushSettings.opacity < 1) {
              // For semi-transparent brushes, modify the color to include alpha
              const color = brushSettings.color || '#000000';
              if (color.startsWith('#')) {
                const r = parseInt(color.slice(1, 3), 16);
                const g = parseInt(color.slice(3, 5), 16);
                const b = parseInt(color.slice(5, 7), 16);
                markerBrush.color = `rgba(${r}, ${g}, ${b}, ${brushSettings.opacity})`;
              }
            }
            canvas.freeDrawingBrush = markerBrush;
            if (canvas.upperCanvasEl) {
              canvas.upperCanvasEl.style.cursor = 'crosshair';
            }
            break;
            
          case 'highlighter':
            console.log('[HIGHLIGHTER] Setting up highlighter tool');
            canvas.isDrawingMode = true;
            canvas.selection = false;
            const highlighterBrush = new (PencilBrush || fabric.PencilBrush || fabric.FreeDrawingBrush)(canvas);
            // Create semi-transparent highlighter effect
            const color = brushSettings.color || '#FFFF00';
            if (color.startsWith('#')) {
              const r = parseInt(color.slice(1, 3), 16);
              const g = parseInt(color.slice(3, 5), 16);
              const b = parseInt(color.slice(5, 7), 16);
              highlighterBrush.color = `rgba(${r}, ${g}, ${b}, 0.4)`;
            } else {
              highlighterBrush.color = color;
            }
            highlighterBrush.width = Math.max(brushSettings.width * 5, 15); // Very thick
            highlighterBrush.strokeLineCap = 'round';
            highlighterBrush.strokeLineJoin = 'round';
            canvas.freeDrawingBrush = highlighterBrush;
            if (canvas.upperCanvasEl) {
              canvas.upperCanvasEl.style.cursor = 'crosshair';
            }
            break;
            
          case 'eraser':
            console.log('[ERASER] Setting up eraser tool');
            canvas.isDrawingMode = true;
            canvas.selection = false;
            const eraserBrush = new (PencilBrush || fabric.PencilBrush || fabric.FreeDrawingBrush)(canvas);
            eraserBrush.color = canvas.backgroundColor || '#ffffff';
            eraserBrush.width = Math.max(brushSettings.width * 4, 12); // Large eraser
            eraserBrush.strokeLineCap = 'round';
            eraserBrush.strokeLineJoin = 'round';
            canvas.freeDrawingBrush = eraserBrush;
            if (canvas.upperCanvasEl) {
              canvas.upperCanvasEl.style.cursor = 'crosshair';
            }
            break;
            
          case 'text':
            console.log('[TEXT] Setting up text tool');
            canvas.defaultCursor = 'text';
            canvas.selection = true;
            canvas.isDrawingMode = false;
            // Text tool handler will be set up in the tool change handler
            break;
            
          case 'rectangle':
          case 'circle':
          case 'line':
          case 'arrow':
            console.log(`[${tool.toUpperCase()}] Setting up shape tool`);
            canvas.defaultCursor = 'crosshair';
            canvas.selection = false;
            canvas.isDrawingMode = false;
            break;
            
          default:
            console.warn('Unknown tool:', tool);
            return;
        }
        
        setCurrentTool(tool);
        console.log('[SUCCESS] ✅ Tool set successfully:', tool);
        
        // Force a render to apply changes
        canvas.renderAll();
        canvas.defaultCursor = canvas.isDrawingMode ? 'crosshair' : canvas.defaultCursor;
        canvas.freeDrawingCursor = 'crosshair';
        console.log('[TOOL] Drawing mode?', canvas.isDrawingMode, 'Cursor now:', canvas.defaultCursor);
        
      } catch (error) {
        console.error('[ERROR] ❌ Error setting tool:', tool, error);
      }
    };
  }, [brushSettings, isReady]);
  
  // ==================== SHAPE DRAWING STATE ====================
  const [isDrawingShape, setIsDrawingShape] = useState(false);
  const [shapeStartPoint, setShapeStartPoint] = useState(null);
  const [previewShape, setPreviewShape] = useState(null);

  // ==================== FORCE DRAW DEBUG ====================
  const forceEnableDrawing = useCallback(() => {
    if (!fabricCanvas.current || !fabric) {
      console.warn('[FORCE] Fabric canvas not ready');
      return;
    }
    const canvas = fabricCanvas.current;
    try {
      if (!PencilBrush) {
        PencilBrush = fabric.PencilBrush || fabric.FreeDrawingBrush || fabric.FabricBrush || fabric.BaseBrush;
      }
      const fb = new (PencilBrush || fabric.PencilBrush || fabric.FreeDrawingBrush)(canvas);
      fb.color = brushSettings.color || '#000000';
      fb.width = brushSettings.width || 2;
      fb.strokeLineCap = 'round';
      fb.strokeLineJoin = 'round';
      canvas.freeDrawingBrush = fb;
      canvas.isDrawingMode = true;
      canvas.selection = false;
      canvas.renderAll();
      canvas.defaultCursor = 'crosshair';
      canvas.freeDrawingCursor = 'crosshair';
      console.log('[FORCE] Enabled drawing mode manually. Brush:', fb);
    } catch (e) {
      console.error('[FORCE] Failed to enable drawing mode', e);
    }
  }, [brushSettings]);

  // Expose for console usage
  useEffect(() => { window.__forceDraw = forceEnableDrawing; }, [forceEnableDrawing]);

  // ==================== TOOL CHANGE HANDLER ====================
  useEffect(() => {
    if (fabricCanvas.current && isReady && currentTool) {
      console.log('🔧 Changing tool to:', currentTool);
      const canvas = fabricCanvas.current;
      
      // Handle text tool
      if (currentTool === 'text') {
        console.log('[TEXT] Setting up text tool');
        canvas.isDrawingMode = false; // Disable drawing mode for text
        canvas.selection = true; // Enable selection for text editing
        
        const handleTextClick = (options) => {
          if (!fabricCanvas.current) return;
          
          console.log('[TEXT] Text tool clicked at:', options.e.offsetX, options.e.offsetY);
          const pointer = fabricCanvas.current.getPointer(options.e);
          
          const text = new IText('Type here...', {
            left: pointer.x,
            top: pointer.y,
            fontSize: textSettings.fontSize || 18,
            fontFamily: textSettings.fontFamily || 'Arial',
            fill: textSettings.color || '#000000',
            fontWeight: textSettings.bold ? 'bold' : 'normal',
            fontStyle: textSettings.italic ? 'italic' : 'normal',
            underline: textSettings.underline || false,
            textAlign: textSettings.alignment || 'left',
            opacity: 1, // Ensure text opacity is always 1 to prevent fading
            layer: currentLayer,
            userId: user?.id || 'anonymous',
            editable: true,
            selectable: true,
            hasControls: true,
            hasBorders: true,
            // High-quality text rendering
            objectCaching: false, // Disable caching for crisp text
            statefullCache: false,
            noScaleCache: true,
            strokeUniform: true
          });
          
          fabricCanvas.current.add(text);
          fabricCanvas.current.setActiveObject(text);
          fabricCanvas.current.renderAll();
          
          // Enter editing mode immediately
          text.enterEditing();
          text.selectAll();
          
          saveCanvasState();
          console.log('[TEXT] ✅ Text object created and added to canvas');
        };
        
        canvas.off('mouse:down'); // Remove previous handlers
        canvas.on('mouse:down', handleTextClick);
      }
      
      // Handle shape tools
      else if (['rectangle', 'circle', 'line', 'arrow'].includes(currentTool)) {
        let isDown = false;
        let startPoint = null;
        let shape = null;
        
        const handleShapeMouseDown = (o) => {
          if (!fabricCanvas.current) return;
          isDown = true;
          const pointer = canvas.getPointer(o.e);
          startPoint = { x: pointer.x, y: pointer.y };
          setShapeStartPoint(startPoint);
          setIsDrawingShape(true);
          console.log(`[SHAPE] Starting ${currentTool} at:`, startPoint);
        };
        
        const handleShapeMouseMove = (o) => {
          if (!isDown || !fabricCanvas.current) return;
          const pointer = canvas.getPointer(o.e);
          
          // Remove preview shape if exists
          if (shape) {
            canvas.remove(shape);
            shape = null;
          }
          
          // Create preview shape with minimum size
          const width = Math.abs(pointer.x - startPoint.x);
          const height = Math.abs(pointer.y - startPoint.y);
          
          if (width > 5 || height > 5) { // Only create if large enough
            shape = createShapePreview(currentTool, startPoint, pointer);
            if (shape) {
              canvas.add(shape);
              canvas.renderAll();
            }
          }
        };
        
        const handleShapeMouseUp = (o) => {
          if (!isDown || !fabricCanvas.current) return;
          isDown = false;
          setIsDrawingShape(false);
          
          const pointer = canvas.getPointer(o.e);
          const width = Math.abs(pointer.x - startPoint.x);
          const height = Math.abs(pointer.y - startPoint.y);
          
          // Remove preview
          if (shape) {
            canvas.remove(shape);
          }
          
          // Create final shape if large enough
          if (width > 10 && height > 10) {
            const finalShape = createShapePreview(currentTool, startPoint, pointer);
            if (finalShape) {
              finalShape.set({
                layer: currentLayer,
                userId: user.id,
                selectable: true,
                evented: true
              });
              canvas.add(finalShape);
              canvas.renderAll();
              saveCanvasState();
              console.log(`[SHAPE] Created ${currentTool}`);
            }
          }
          
          shape = null;
          startPoint = null;
        };
        
        canvas.on('mouse:down', handleShapeMouseDown);
        canvas.on('mouse:move', handleShapeMouseMove);
        canvas.on('mouse:up', handleShapeMouseUp);
      }
    }
  }, [currentTool, isReady, textSettings, currentLayer, user.id, saveCanvasState, shapeSettings]);
  
  // ==================== DRAWING FUNCTIONS ====================
  const addText = useCallback((options) => {
    if (!fabricCanvas.current) return;
    
    const pointer = fabricCanvas.current.getPointer(options.e);
    const text = new IText('Type here...', {
      left: pointer.x,
      top: pointer.y,
      fontSize: textSettings.fontSize,
      fontFamily: textSettings.fontFamily,
      fill: textSettings.color,
      fontWeight: textSettings.bold ? 'bold' : 'normal',
      fontStyle: textSettings.italic ? 'italic' : 'normal',
      underline: textSettings.underline,
      textAlign: textSettings.alignment,
      layer: currentLayer,
      userId: user.id,
      // High-quality text rendering
      objectCaching: false,
      statefullCache: false,
      noScaleCache: true,
      strokeUniform: true
    });
    
    fabricCanvas.current.add(text);
    fabricCanvas.current.setActiveObject(text);
    text.enterEditing();
    text.selectAll();
    
    saveCanvasState();
    
    if (socket && isTeacher) {
      socket.emit('whiteboard:text-added', {
        classId,
        textData: text.toObject(),
        userId: user.id,
        layer: currentLayer
      });
    }
  }, [textSettings, currentLayer, user.id, socket, classId, isTeacher]);
  
  const addShape = useCallback((shapeType, startPoint, endPoint) => {
    if (!fabricCanvas.current) return;
    
    let shape;
    const width = Math.abs(endPoint.x - startPoint.x);
    const height = Math.abs(endPoint.y - startPoint.y);
    const left = Math.min(startPoint.x, endPoint.x);
    const top = Math.min(startPoint.y, endPoint.y);
    
    const shapeOptions = {
      left,
      top,
      fill: shapeSettings.fill ? shapeSettings.fillColor : 'transparent',
      stroke: shapeSettings.strokeColor,
      strokeWidth: shapeSettings.strokeWidth,
      opacity: shapeSettings.opacity,
      layer: currentLayer,
      userId: user.id
    };
    
    switch (shapeType) {
      case 'rectangle':
        shape = new Rect({ ...shapeOptions, width, height });
        break;
        
      case 'circle':
        const radius = Math.min(width, height) / 2;
        shape = new FabricCircle({ 
          ...shapeOptions, 
          radius,
          left: left + width / 2 - radius,
          top: top + height / 2 - radius
        });
        break;
        
      case 'line':
        shape = new Line([startPoint.x, startPoint.y, endPoint.x, endPoint.y], {
          stroke: shapeSettings.strokeColor,
          strokeWidth: shapeSettings.strokeWidth,
          opacity: shapeSettings.opacity,
          layer: currentLayer,
          userId: user.id
        });
        break;
        
      case 'arrow':
        // Create arrow using path
        const arrowPath = createArrowPath(startPoint, endPoint);
        shape = new Path(arrowPath, {
          ...shapeOptions,
          fill: shapeSettings.strokeColor,
          stroke: 'transparent'
        });
        break;
        
      default:
        return;
    }
    
    fabricCanvas.current.add(shape);
    saveCanvasState();
    
    if (socket && isTeacher) {
      socket.emit('whiteboard:shape-added', {
        classId,
        shapeData: shape.toObject(),
        userId: user.id,
        layer: currentLayer
      });
    }
  }, [shapeSettings, currentLayer, user.id, socket, classId, isTeacher, saveCanvasState]);
  
  const createShapePreview = useCallback((shapeType, startPoint, endPoint) => {
    if (!startPoint || !endPoint) return null;
    
    const width = Math.abs(endPoint.x - startPoint.x);
    const height = Math.abs(endPoint.y - startPoint.y);
    const left = Math.min(startPoint.x, endPoint.x);
    const top = Math.min(startPoint.y, endPoint.y);
    
    // Ensure minimum size
    if (width < 2 && height < 2) return null;
    
    const shapeOptions = {
      left,
      top,
      fill: shapeSettings.fill ? shapeSettings.fillColor : 'transparent',
      stroke: shapeSettings.strokeColor || '#000000',
      strokeWidth: shapeSettings.strokeWidth || 2,
      opacity: shapeSettings.opacity || 1,
      selectable: false,
      evented: false,
      strokeLineCap: 'round',
      strokeLineJoin: 'round'
    };
    
    try {
      switch (shapeType) {
        case 'rectangle':
          return new Rect({ 
            ...shapeOptions, 
            width: Math.max(width, 1), 
            height: Math.max(height, 1) 
          });
          
        case 'circle':
          const radius = Math.max(Math.min(width, height) / 2, 1);
          return new FabricCircle({ 
            ...shapeOptions, 
            radius,
            left: startPoint.x - radius,
            top: startPoint.y - radius
          });
          
        case 'line':
          return new Line([startPoint.x, startPoint.y, endPoint.x, endPoint.y], {
            stroke: shapeSettings.strokeColor || '#000000',
            strokeWidth: shapeSettings.strokeWidth || 2,
            opacity: shapeSettings.opacity || 1,
            selectable: false,
            evented: false,
            strokeLineCap: 'round'
          });
          
        case 'arrow':
          const arrowPath = createArrowPath(startPoint, endPoint);
          if (!arrowPath) return null;
          return new Path(arrowPath, {
            fill: 'transparent',
            stroke: shapeSettings.strokeColor || '#000000',
            strokeWidth: shapeSettings.strokeWidth || 2,
            opacity: shapeSettings.opacity || 1,
            selectable: false,
            evented: false,
            strokeLineCap: 'round',
            strokeLineJoin: 'round'
          });
          
        default:
          console.warn('Unknown shape type:', shapeType);
          return null;
      }
    } catch (error) {
      console.error('Error creating shape preview:', error);
      return null;
    }
  }, [shapeSettings]);

  const createArrowPath = (start, end) => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    
    const arrowLength = 20;
    const arrowAngle = Math.PI / 6;
    
    const x1 = end.x - arrowLength * Math.cos(angle - arrowAngle);
    const y1 = end.y - arrowLength * Math.sin(angle - arrowAngle);
    const x2 = end.x - arrowLength * Math.cos(angle + arrowAngle);
    const y2 = end.y - arrowLength * Math.sin(angle + arrowAngle);
    
    return `M ${start.x} ${start.y} L ${end.x} ${end.y} M ${end.x} ${end.y} L ${x1} ${y1} M ${end.x} ${end.y} L ${x2} ${y2}`;
  };
  
  // ==================== EXPORT FUNCTIONS ====================
  const exportCanvas = useCallback(async (format = 'png', quality = 1) => {
    if (!fabricCanvas.current) return;
    
    setIsExporting(true);
    
    try {
      let dataUrl;
      
      switch (format) {
        case 'png':
          dataUrl = fabricCanvas.current.toDataURL({
            format: 'png',
            quality: quality,
            multiplier: quality
          });
          break;
          
        case 'jpg':
          dataUrl = fabricCanvas.current.toDataURL({
            format: 'jpeg',
            quality: quality,
            multiplier: quality
          });
          break;
          
        case 'svg':
          const svgData = fabricCanvas.current.toSVG();
          dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgData);
          break;
          
        case 'pdf':
          const pdf = new jsPDF();
          const canvas = fabricCanvas.current.getElement();
          const imgData = canvas.toDataURL('image/png');
          
          const imgWidth = 210;
          const pageHeight = 295;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          let heightLeft = imgHeight;
          
          let position = 0;
          
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
          
          while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
          }
          
          pdf.save(`whiteboard_${Date.now()}.pdf`);
          return;
          
        default:
          throw new Error(`Unsupported format: ${format}`);
      }
      
      // Download the file
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `whiteboard_${Date.now()}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showNotification(`Exported as ${format.toUpperCase()}`, 'success');
    } catch (error) {
      console.error('Export error:', error);
      showNotification(`Export failed: ${error.message}`, 'error');
    } finally {
      setIsExporting(false);
      setExportDialogOpen(false);
    }
  }, []);
  
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
  
  // ==================== ERROR RECOVERY FUNCTIONS ====================
  const retryInitialization = useCallback(() => {
    console.log('🔄 Retrying initialization...');
    setInitializationError(null);
    setIsReady(false);
    
    // Clean up and retry
    if (fabricCanvas.current) {
      try {
        fabricCanvas.current.dispose();
      } catch (e) {
        console.warn('Cleanup warning:', e);
      }
      fabricCanvas.current = null;
    }
    
    // Force page reload as last resort
    setTimeout(() => window.location.reload(), 1000);
  }, []);
  
  // ==================== UTILITY FUNCTIONS ====================
  const clearCanvas = useCallback(() => {
    if (!fabricCanvas.current) return;
    
    fabricCanvas.current.clear();
    fabricCanvas.current.backgroundColor = '#ffffff';
    saveCanvasState();
    
    if (socket && isTeacher) {
      socket.emit('whiteboard:clear', {
        classId,
        userId: user.id
      });
    }
    
    showNotification('Canvas cleared', 'info');
  }, [socket, classId, isTeacher, user.id, saveCanvasState, showNotification]);
  
  // Update the ref to point to the actual implementation
  useEffect(() => {
    showNotificationRef.current = (message, severity = 'info') => {
      setNotification({ open: true, message, severity });
      console.log(`📢 Notification [${severity}]: ${message}`);
    };
  }, []);
  
  const drawGrid = useCallback(() => {
    if (!fabricCanvas.current || !showGrid) return;
    
    const canvas = fabricCanvas.current;
    const width = canvas.getWidth();
    const height = canvas.getHeight();
    
    // Remove existing grid
    const existingGrid = canvas.getObjects().filter(obj => obj.isGrid);
    existingGrid.forEach(obj => canvas.remove(obj));
    
    // Draw vertical lines
    for (let i = 0; i <= width; i += gridSize) {
      const line = new Line([i, 0, i, height], {
        stroke: '#e2e8f0',
        strokeWidth: 1,
        selectable: false,
        evented: false,
        isGrid: true
      });
      canvas.add(line);
      canvas.sendToBack(line);
    }
    
    // Draw horizontal lines
    for (let i = 0; i <= height; i += gridSize) {
      const line = new Line([0, i, width, i], {
        stroke: '#e2e8f0',
        strokeWidth: 1,
        selectable: false,
        evented: false,
        isGrid: true
      });
      canvas.add(line);
      canvas.sendToBack(line);
    }
    
    canvas.renderAll();
  }, [showGrid, gridSize]);
  
  // Update the ref to point to the actual implementation
  useEffect(() => {
    updateLayersFromCanvasRef.current = () => {
      if (!fabricCanvas.current) return;
      
      const objects = fabricCanvas.current.getObjects();
      const layerMap = {};
      
      objects.forEach(obj => {
        const layer = obj.layer || 'main';
        if (!layerMap[layer]) {
          layerMap[layer] = [];
        }
        layerMap[layer].push(obj);
      });
      
      // Update layers state based on canvas objects
      const updatedLayers = Object.keys(layerMap).map(layerId => {
        const existingLayer = layers.find(l => l.id === layerId);
        return existingLayer || {
          id: layerId,
          name: layerId.charAt(0).toUpperCase() + layerId.slice(1),
          visible: true,
          locked: false,
          opacity: 1
        };
      });
      
      setLayers(updatedLayers);
    };
  }, [layers]);
  
  const loadCanvasData = useCallback((data) => {
    if (!fabricCanvas.current) return;
    
    fabricCanvas.current.loadFromJSON(data, () => {
      fabricCanvas.current.renderAll();
      updateLayersFromCanvas();
      saveCanvasState();
    });
  }, [updateLayersFromCanvas, saveCanvasState]);
  
  // ==================== FILE HANDLING FUNCTIONS ====================
  

  const handleImageUpload = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    console.log('🖼️ Image upload started:', file.name, 'Size:', Math.round(file.size / 1024), 'KB');
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/svg+xml', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showNotification('Please select a valid image file (PNG, JPG, GIF, SVG, WebP)', 'error');
      return;
    }
    
    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      showNotification('Image file is too large. Please select a file smaller than 10MB', 'error');
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    showNotification('Loading image...', 'info');
    
    console.log('📤 Upload state initialized: uploading=true, progress=0');
    
    const reader = new FileReader();
    
    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        const progress = Math.round((e.loaded / e.total) * 100);
        setUploadProgress(progress);
      }
    };
    
    reader.onload = (e) => {
      console.log('📤 Image data loaded, preparing to create Fabric image...');
      
      if (!FabricImage) {
        console.error('❌ FabricImage is not available');
        setIsUploading(false);
        setUploadProgress(0);
        showNotification('Fabric.js not loaded properly. Please refresh the page.', 'error');
        return;
      }
      
      try {
        console.log('🎨 Calling FabricImage.fromURL with data URL...');
        console.log('📝 Data URL info:', {
          length: e.target.result.length,
          type: e.target.result.split(',')[0],
          preview: e.target.result.substring(0, 100) + '...'
        });
        
        // Set up timeout for the entire image loading process
        const globalTimeoutId = setTimeout(() => {
          console.error('⏰ Image loading timeout - trying fallback method after 10 seconds');
          setIsUploading(false);
          setUploadProgress(0);
          showNotification('Primary method timed out, trying alternative method...', 'warning');
          
          // Try fallback approach
          setTimeout(() => {
            try {
              handleImageUploadFallback(e.target.result, file.name);
            } catch (fallbackError) {
              console.error('❌ Fallback method also failed:', fallbackError);
              showNotification('Failed to load image. Please try a different file.', 'error');
            }
          }, 100);
        }, 10000); // 10 second timeout for faster fallback
        
        // First, test if the image loads with native Image element
        // Use document.createElement to avoid webpack module conflicts
        const testImg = document.createElement('img');
        testImg.onload = () => {
          console.log('✅ Native image loaded successfully, proceeding with Fabric.js');
          
          // Add timeout to catch hanging FabricImage calls
          const timeoutId = setTimeout(() => {
            console.error('⏰ FabricImage.fromURL timeout - callback not called within 15 seconds');
            // Don't set uploading to false here, let the global timeout handle it
            clearTimeout(globalTimeoutId);
            setTimeout(() => {
              try {
                handleImageUploadFallback(e.target.result, file.name);
              } catch (fallbackError) {
                console.error('❌ Fallback method also failed:', fallbackError);
                showNotification('Failed to load image. Please try a different file.', 'error');
              }
            }, 100);
          }, 15000); // 15 seconds for FabricImage timeout
          
          FabricImage.fromURL(e.target.result, (img, isError) => {
            clearTimeout(timeoutId); // Cancel FabricImage timeout since callback was called
            clearTimeout(globalTimeoutId); // Cancel global timeout since we got a response
          console.log('🔄 FabricImage callback executed!');
          console.log('🖼️ Image result:', { img: !!img, isError, imgType: img ? img.constructor.name : 'null' });
          
          if (isError) {
            console.error('❌ FabricImage creation failed with error:', isError);
            setIsUploading(false);
            setUploadProgress(0);
            showNotification('Failed to create image from file', 'error');
            return;
          }
          console.log('🖼️ FabricImage.fromURL callback triggered with img:', !!img);
          console.log('🖼️ Image type:', typeof img, img ? img.constructor.name : 'null');
          
          if (!fabricCanvas.current) {
            console.error('❌ Canvas not available in fromURL callback');
            setIsUploading(false);
            setUploadProgress(0);
            showNotification('Canvas not available', 'error');
            return;
          }
          
          if (!img) {
            console.error('❌ Image object is null/undefined');
            setIsUploading(false);
            setUploadProgress(0);
            showNotification('Failed to create image object', 'error');
            return;
          }
          
          // Set high-quality rendering for the image element
          if (img._element) {
            img._element.style.imageRendering = 'high-quality';
            img._element.style.imageRendering = '-webkit-optimize-contrast';
            img._element.style.imageRendering = 'crisp-edges';
            console.log('🎨 Applied high-quality image rendering to element');
          }
          
          // Get actual image dimensions - handle both img.width/height and img.getOriginalSize()
          const imgWidth = img.width || img.getOriginalSize?.()?.width || img.naturalWidth || 300;
          const imgHeight = img.height || img.getOriginalSize?.()?.height || img.naturalHeight || 200;
          
          console.log('📐 Image dimensions:', {
            width: imgWidth,
            height: imgHeight,
            imgWidth: img.width,
            imgHeight: img.height,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
            getOriginalSize: img.getOriginalSize?.(),
            scaleX: img.scaleX,
            scaleY: img.scaleY
          });
          
          // Scale image to fit canvas with better sizing
          const canvasWidth = fabricCanvas.current.getWidth();
          const canvasHeight = fabricCanvas.current.getHeight();
          // Improved: allow larger images up to 90% of canvas without arbitrary 600/400 caps
          const maxWidth = canvasWidth * 0.9;
          const maxHeight = canvasHeight * 0.9;
          
          console.log('📏 Canvas dimensions:', canvasWidth, 'x', canvasHeight);
          console.log('📏 Max dimensions:', maxWidth, 'x', maxHeight);
          
          let scale = Math.min(
            maxWidth / imgWidth,
            maxHeight / imgHeight,
            1 // never upscale small images (retain native pixel density for clarity)
          );
          
          // Ensure reasonable scale bounds
          if (scale < 0.05) scale = 0.05; // allow slightly smaller minimum for very large panoramas
          // Do not clamp upper scale below 1 to preserve full resolution; we already prevent >1 by design
          
          console.log('📏 Calculated scale:', scale);
          
          const finalLeft = Math.max(10, (canvasWidth - imgWidth * scale) / 2);
          const finalTop = Math.max(10, (canvasHeight - imgHeight * scale) / 2);
          
          console.log('📍 Final position:', finalLeft, ',', finalTop, 'Scale:', scale);
          
          // Ensure position is within canvas bounds
          const adjustedLeft = Math.max(10, Math.min(finalLeft, canvasWidth - (imgWidth * scale) - 10));
          const adjustedTop = Math.max(10, Math.min(finalTop, canvasHeight - (imgHeight * scale) - 10));
          
          console.log('📍 Position calculation:', {
            finalLeft,
            finalTop,
            adjustedLeft,
            adjustedTop,
            canvasWidth,
            canvasHeight,
            scaledWidth: imgWidth * scale,
            scaledHeight: imgHeight * scale
          });
          
          img.set({
            left: adjustedLeft,
            top: adjustedTop,
            scaleX: scale,
            scaleY: scale,
            layer: currentLayer,
            userId: user.id,
            selectable: true,
            evented: true,
            hasControls: true,
            hasBorders: true,
            cornerStyle: 'circle',
            cornerSize: 10,
            transparentCorners: false,
            borderColor: '#3b82f6',
            cornerColor: '#3b82f6',
            visible: true,
            opacity: 1.0, // Force full opacity
            globalAlpha: 1.0, // Additional opacity enforcement
            fill: 'transparent',
            stroke: null,
            strokeWidth: 0,
            // High-quality image rendering
            objectCaching: false, // Disable caching for crisp images
            statefullCache: false,
            noScaleCache: true, // Always re-render at current scale
            strokeUniform: true,
            // Enable image smoothing for better quality
            imageSmoothing: true,
            filters: [] // Ensure no filters reducing opacity
          });
          
          console.log('🎨 Image properties set:', {
            left: img.left,
            top: img.top,
            scaleX: img.scaleX,
            scaleY: img.scaleY,
            width: img.width,
            height: img.height,
            visible: img.visible,
            opacity: img.opacity
          });
          
          console.log('➕ Adding image to canvas...', {
            canvasExists: !!fabricCanvas.current,
            imageExists: !!img,
            canvasObjectsBeforeAdd: fabricCanvas.current ? fabricCanvas.current.getObjects().length : 'N/A',
            imagePosition: { left: img.left, top: img.top },
            imageScale: { scaleX: img.scaleX, scaleY: img.scaleY },
            imageDimensions: { width: img.width, height: img.height }
          });
          
          // Clear any existing selection first
          fabricCanvas.current.discardActiveObject();
          
          fabricCanvas.current.add(img);
          console.log('✅ Image added to canvas, objects count:', fabricCanvas.current.getObjects().length);
          
          // Immediate render to ensure image appears
          fabricCanvas.current.renderAll();
          
          console.log('🎯 Setting as active object...');
          fabricCanvas.current.setActiveObject(img);
          
          console.log('🎨 Rendering canvas again...');
          fabricCanvas.current.renderAll();
          
          // Force immediate visibility check
          const canvasElement = fabricCanvas.current.getElement();
          if (canvasElement) {
            console.log('🔍 Canvas element info:', {
              width: canvasElement.width,
              height: canvasElement.height,
              style: {
                width: canvasElement.style.width,
                height: canvasElement.style.height,
                display: canvasElement.style.display,
                visibility: canvasElement.style.visibility
              }
            });
          }
          
          // Validate image is actually visible
          console.log('🔍 Validating image visibility...');
          const addedObjects = fabricCanvas.current.getObjects();
          const lastObject = addedObjects[addedObjects.length - 1];
          const imageObject = addedObjects.find(obj => obj === img);
          
          console.log('📋 Object validation:', {
            totalObjects: addedObjects.length,
            lastObjectType: lastObject ? lastObject.type : 'none',
            imageFoundInObjects: !!imageObject,
            imageObjectDetails: imageObject ? {
              type: imageObject.type,
              left: imageObject.left,
              top: imageObject.top,
              width: imageObject.width,
              height: imageObject.height,
              scaleX: imageObject.scaleX,
              scaleY: imageObject.scaleY,
              visible: imageObject.visible,
              opacity: imageObject.opacity,
              isOnScreen: imageObject.isOnScreen?.() || 'unknown'
            } : 'not found'
          });
          
          // Force image to front and ensure visibility
          if (imageObject) {
            fabricCanvas.current.bringToFront(imageObject);
            imageObject.visible = true;
            imageObject.opacity = 1;
            console.log('🚀 Image brought to front and visibility ensured');
          }
          
          // Force multiple renders to ensure visibility
          setTimeout(() => {
            if (fabricCanvas.current) {
              fabricCanvas.current.renderAll();
              console.log('🔄 Canvas re-rendered after timeout');
              
              // Check canvas bounds and try to center view on objects
              try {
                const canvasBounds = fabricCanvas.current.getSelectionElement().getBoundingClientRect();
                console.log('🖼️ Canvas bounds:', canvasBounds);
                
                // Try to fit all objects in view
                const objects = fabricCanvas.current.getObjects();
                if (objects.length > 0) {
                  console.log('👀 Attempting to fit objects in view...');
                  // Reset zoom and pan to ensure object is visible
                  fabricCanvas.current.setZoom(1);
                  fabricCanvas.current.absolutePan({ x: 0, y: 0 });
                  fabricCanvas.current.renderAll();
                  console.log('🎯 Canvas view reset to origin with zoom 1');
                }
              } catch (viewError) {
                console.error('❌ Error adjusting canvas view:', viewError);
              }
            }
          }, 100);
          
          console.log('💾 Saving canvas state...');
          saveCanvasState();
          
          // Ensure image is visible and positioned correctly
          console.log('🎯 Final positioning and visibility check...');
          
          // Don't center - keep calculated position
          // fabricCanvas.current.centerObject(img);
          fabricCanvas.current.bringToFront(img);
          
          // Multiple render attempts with different methods
          fabricCanvas.current.renderAll();
          fabricCanvas.current.requestRenderAll();
          
          // Verify the image is actually rendered
          setTimeout(() => {
            if (fabricCanvas.current && img) {
              const bounds = img.getBoundingRect();
              console.log('📏 Image bounding rect:', bounds);
              
              const canvasBounds = {
                width: fabricCanvas.current.getWidth(),
                height: fabricCanvas.current.getHeight()
              };
              
              console.log('🖼️ Canvas vs Image bounds check:', {
                canvas: canvasBounds,
                image: bounds,
                isVisible: bounds.left < canvasBounds.width && 
                          bounds.top < canvasBounds.height &&
                          bounds.left + bounds.width > 0 &&
                          bounds.top + bounds.height > 0
              });
            }
          }, 50);
          
          // Multiple render attempts to ensure visibility
          setTimeout(() => {
            if (fabricCanvas.current) {
              console.log('🎨 Force rendering canvas...');
              fabricCanvas.current.renderAll();
              fabricCanvas.current.requestRenderAll();
              
              // Force canvas refresh
              const canvasEl = fabricCanvas.current.getElement();
              if (canvasEl) {
                canvasEl.style.display = 'none';
                canvasEl.offsetHeight; // Trigger reflow
                canvasEl.style.display = 'block';
                console.log('🔄 Canvas element refreshed');
              }
            }
          }, 50);
          
          // Show completion state and then hide after shorter delay
          setUploadProgress(100);
          console.log('🎉 Upload marked as 100% complete');
          setTimeout(() => {
            console.log('🔚 Hiding upload overlay...');
            setIsUploading(false);
            setUploadProgress(0);
            console.log('✅ Upload process fully complete');
          }, 1500); // Reduced to 1.5 seconds
          
          showNotification(`Image "${file.name}" loaded successfully!`, 'success');
          
          // Verify the image was added correctly
          const canvasObjects = fabricCanvas.current.getObjects();
          console.log('📊 Canvas objects after adding image:', canvasObjects.length);
          console.log('🔍 Canvas viewport transform:', fabricCanvas.current.viewportTransform);
          console.log('🔍 Canvas zoom level:', fabricCanvas.current.getZoom());
          
          // Final verification - check if the image is actually on the canvas
          const finalCanvasObjects = fabricCanvas.current.getObjects();
          const imageInCanvas = finalCanvasObjects.find(obj => obj === img);
          
          if (finalCanvasObjects.length === 0) {
            console.error('❌ ERROR: No objects found on canvas after adding image!');
            setIsUploading(false);
            setUploadProgress(0);
            showNotification('Failed to add image to canvas', 'error');
            return;
          } else if (!imageInCanvas) {
            console.error('❌ ERROR: Image not found in canvas objects!');
            setIsUploading(false);
            setUploadProgress(0);
            showNotification('Image was not properly added to canvas', 'error');
            return;
          } else {
            console.log('✅ SUCCESS: Image successfully added to canvas!');
            console.log('🎯 Final image state:', {
              position: { left: imageInCanvas.left, top: imageInCanvas.top },
              dimensions: { 
                width: imageInCanvas.width, 
                height: imageInCanvas.height,
                scaledWidth: imageInCanvas.width * imageInCanvas.scaleX,
                scaledHeight: imageInCanvas.height * imageInCanvas.scaleY
              },
              scale: { scaleX: imageInCanvas.scaleX, scaleY: imageInCanvas.scaleY },
              visibility: { visible: imageInCanvas.visible, opacity: imageInCanvas.opacity },
              canvasObjectsCount: finalCanvasObjects.length
            });
          }
          
          console.log('✅ Image loaded successfully:', {
            originalSize: `${img.width}x${img.height}`,
            scaledSize: `${Math.round(img.width * scale)}x${Math.round(img.height * scale)}`,
            scale: Math.round(scale * 100) + '%',
            position: `(${finalLeft}, ${finalTop})`,
            canvasObjects: canvasObjects.length,
            imageId: img.id || 'no-id'
          });
          
          if (socket && isTeacher) {
            socket.emit('whiteboard:image-added', {
              classId,
              imageData: img.toObject(['layer', 'userId']),
              userId: user.id,
              layer: currentLayer,
              fileName: file.name
            });
          }
        }, {
          // Add crossOrigin to handle CORS issues
          crossOrigin: 'anonymous'
        }, (error) => {
          // Error callback for FabricImage.fromURL
          console.error('❌ FabricImage.fromURL error:', error);
          setIsUploading(false);
          setUploadProgress(0);
          showNotification('Failed to load image into canvas', 'error');
        });
        };
        
        testImg.onerror = () => {
          console.error('❌ Native image failed to load, trying fallback immediately');
          clearTimeout(globalTimeoutId);
          
          setTimeout(() => {
            try {
              handleImageUploadFallback(e.target.result, file.name);
            } catch (fallbackError) {
              console.error('❌ Fallback method also failed:', fallbackError);
              setIsUploading(false);
              setUploadProgress(0);
              showNotification('Failed to load image file', 'error');
            }
          }, 100);
        };
        
        testImg.src = e.target.result;
        
      } catch (error) {
        console.error('Image loading error:', error);
        setIsUploading(false);
        setUploadProgress(0);
        showNotification('Failed to load image: ' + error.message, 'error');
      }
    };
    
    reader.onerror = () => {
      setIsUploading(false);
      setUploadProgress(0);
      showNotification('Failed to read image file', 'error');
    };
    
    reader.readAsDataURL(file);
    
    // Clear the input so the same file can be uploaded again
    event.target.value = '';
  }, [currentLayer, user.id, socket, classId, isTeacher, saveCanvasState, showNotification]);

  // Fallback method for image loading when FabricImage.fromURL fails
  const handleImageUploadFallback = useCallback((dataUrl, fileName) => {
    console.log('🔄 Using fallback image loading method...');
    
    if (!fabricCanvas.current) {
      console.error('❌ Canvas not available for fallback');
      return;
    }

    const img = document.createElement('img');
    img.onload = () => {
      try {
        console.log('✅ Fallback: Image loaded, creating Fabric object manually...');
        
        // Create a new fabric Image object manually
        const fabricImg = new fabric.Image(img, {
          left: 50,
          top: 50,
          layer: currentLayer,
          userId: user.id,
          selectable: true,
          evented: true,
          hasControls: true,
          hasBorders: true,
          cornerStyle: 'circle',
          cornerSize: 10,
          transparentCorners: false,
          borderColor: '#3b82f6',
          cornerColor: '#3b82f6'
        });

        // Scale to fit canvas
        const canvasWidth = fabricCanvas.current.getWidth();
        const canvasHeight = fabricCanvas.current.getHeight();
        const scale = Math.min((canvasWidth * 0.8) / img.width, (canvasHeight * 0.8) / img.height, 1);
        
        fabricImg.scale(scale);
        
        // Center the image manually
        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;
        fabricImg.set({
          left: (canvasWidth - scaledWidth) / 2,
          top: (canvasHeight - scaledHeight) / 2
        });

        fabricCanvas.current.add(fabricImg);
        fabricCanvas.current.setActiveObject(fabricImg);
        fabricCanvas.current.renderAll();

        saveCanvasState();
        
        setUploadProgress(100);
        setTimeout(() => {
          setIsUploading(false);
          setUploadProgress(0);
        }, 1500);

        showNotification(`Image "${fileName}" loaded successfully using fallback method!`, 'success');
        
        if (socket && isTeacher) {
          socket.emit('whiteboard:image-added', {
            classId,
            imageData: fabricImg.toObject(['layer', 'userId']),
            userId: user.id,
            layer: currentLayer,
            fileName: fileName
          });
        }
      } catch (error) {
        console.error('❌ Fallback method error:', error);
        setIsUploading(false);
        setUploadProgress(0);
        showNotification('Fallback image loading failed', 'error');
      }
    };
    
    img.onerror = () => {
      console.error('❌ Fallback: Image failed to load');
      setIsUploading(false);
      setUploadProgress(0);
      showNotification('Failed to load image data', 'error');
    };
    
    img.src = dataUrl;
  }, [currentLayer, user.id, socket, classId, isTeacher, saveCanvasState, showNotification]);
  
  // ==================== PDF PAGE NAVIGATION ====================
  const loadPdfPage = useCallback(async (pdfObject, pageNumber) => {
    if (!pdfObject || !pdfObject.pdfTotalPages || pageNumber < 1 || pageNumber > pdfObject.pdfTotalPages) {
      return;
    }
    
    try {
      setIsUploading(true);
      setUploadProgress(30);
      showNotification(`📄 Loading page ${pageNumber}/${pdfObject.pdfTotalPages}...`, 'info');
      
      // Get the PDF file data (this would need to be stored with the object)
      // For now, we'll prompt user to re-upload for page changes
      showNotification(`To change pages, please re-upload the PDF and select page ${pageNumber}`, 'warning');
      setIsUploading(false);
      setUploadProgress(0);
      
    } catch (error) {
      console.error('❌ Error loading PDF page:', error);
      showNotification('Failed to load PDF page: ' + error.message, 'error');
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [showNotification]);

  const handlePdfUpload = useCallback(async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    console.log('📄 🚀 REAL PDF processing for:', file.name, 'Size:', Math.round(file.size / 1024), 'KB');
    
    // Validate file type
    if (file.type !== 'application/pdf') {
      showNotification('Please select a valid PDF file', 'error');
      return;
    }
    
    // Validate file size (20MB limit)  
    if (file.size > 20 * 1024 * 1024) {
      showNotification('PDF file is too large. Please select a file smaller than 20MB', 'error');
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);
    showNotification('📄 Loading PDF content...', 'info');
    
    try {
      // Load PDF.js library dynamically if not available
      if (!window.pdfjsLib) {
        console.log('� Loading PDF.js library...');
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        document.head.appendChild(script);
        
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
        });
        
        // Set worker path
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      }
      
      setUploadProgress(30);
      
      // Read PDF file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      setUploadProgress(50);
      
      console.log('📄 ✅ Rendering actual PDF content...');
      showNotification('📄 Rendering PDF pages...', 'info');
      
      // Load PDF document
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      setUploadProgress(70);
      
      // Get total number of pages
      const totalPages = pdf.numPages;
      console.log(`📄 PDF has ${totalPages} pages`);
      
      // For now, render first page (will add page selector later)
      const currentPageNum = 1;
      const page = await pdf.getPage(currentPageNum);
      
      // Calculate high-quality scale for crisp PDF rendering
      const dpr = window.devicePixelRatio || 1;
  // Dynamically choose a target render width based on current canvas (or fallback)
  const canvasTargetWidth = fabricCanvas.current ? fabricCanvas.current.getWidth() * 0.9 : 1000;
  const targetWidth = Math.max(800, Math.min(canvasTargetWidth, 1800)); // allow wider high-res renders but cap to 1800px
      const originalViewport = page.getViewport({ scale: 1.0 });
      
      // Scale for canvas size (fit to target width) multiplied by DPI
  let baseScale = targetWidth / originalViewport.width;
  // Apply device pixel ratio for high-DPI displays with an extra sharpness multiplier
  const scale = baseScale * dpr * 2; // boost to 2x for crisper text (was 1.5)
      
      console.log('📐 PDF Scale calculation:', {
        dpr,
        targetWidth,
        originalWidth: originalViewport.width,
        baseScale,
        finalScale: scale
      });
      
      // Create viewport with high-quality scale
      const viewport = page.getViewport({ scale: scale });
      
      // Create high-resolution canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Set canvas to high resolution
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      
      // CRITICAL: Fill with WHITE background first (PDFs render on transparent by default!)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      console.log('📄 PDF canvas filled with white background for clarity');
      
      // Set full opacity for rendering
      ctx.globalAlpha = 1.0;
      
      // Enable HIGH-QUALITY rendering for PDFs
      ctx.imageSmoothingEnabled = true; // ENABLE for smooth, crisp text
      ctx.imageSmoothingQuality = 'high'; // Use highest quality
      
      // Additional text quality settings
      if (ctx.textRendering) {
        ctx.textRendering = 'optimizeLegibility';
      }
      if (ctx.mozImageSmoothingEnabled !== undefined) {
        ctx.mozImageSmoothingEnabled = true;
      }
      if (ctx.webkitImageSmoothingEnabled !== undefined) {
        ctx.webkitImageSmoothingEnabled = true;
      }
      if (ctx.msImageSmoothingEnabled !== undefined) {
        ctx.msImageSmoothingEnabled = true;
      }
      
      console.log('📐 PDF rendering settings:', {
        pageNumber: currentPageNum,
        totalPages: totalPages,
        originalSize: `${originalViewport.width}x${originalViewport.height}`,
        scale: scale,
        finalSize: `${viewport.width}x${viewport.height}`
      });
      
      // Render PDF page to canvas
      await page.render({
        canvasContext: ctx,
        viewport: viewport
      }).promise;
      
      setUploadProgress(90);
      
  // Use PNG for lossless quality (we already filled white background so no transparency issues)
  const dataUrl = canvas.toDataURL('image/png');
  console.log('✅ PDF rendered to high-resolution PNG (lossless)');
      
      console.log('🎨 Creating PDF image from high-quality rendered content...');
      const img = new Image();
      
      img.onload = () => {
        console.log('✅ PDF content loaded, creating Fabric object...');
        
        if (!fabricCanvas.current) {
          console.error('❌ Canvas not available');
          setIsUploading(false);
          setUploadProgress(0);
          showNotification('Canvas not available for PDF', 'error');
          return;
        }
        
          try {
            // Create fabric Image object with HIGH-QUALITY rendering settings
            const fabricImg = new fabric.Image(img, {
              left: 0,
              top: 0,
              selectable: true,
              evented: true,
              hasControls: true,
              hasBorders: true,
              layer: currentLayer,
              userId: user.id,
              isPdfPage: true,
              pdfFileName: file.name,
              cornerStyle: 'circle',
              cornerSize: 8,
              transparentCorners: false,
              borderColor: '#e53935',
              cornerColor: '#e53935',
              // CRITICAL: Force FULL OPACITY for PDF
              opacity: 1.0, // Force 100% opacity
              globalAlpha: 1.0, // Additional opacity enforcement
              // ENABLE high-quality rendering for crisp PDFs
              objectCaching: false, // Disable caching for maximum quality
              statefullCache: false,
              noScaleCache: true, // Always render at current scale
              strokeUniform: true,
              imageSmoothing: true, // ENABLE smoothing for crisp text
              // Ensure no filters that might reduce opacity
              filters: []
            });          const canvasWidth = fabricCanvas.current.getWidth();
          const canvasHeight = fabricCanvas.current.getHeight();
          
          // Calculate scale to fit canvas while maintaining sharpness
          const maxWidth = canvasWidth * 0.80; // Use 80% of canvas width
          const maxHeight = canvasHeight * 0.80; // Use 80% of canvas height
          const scaleX = maxWidth / img.width;
          const scaleY = maxHeight / img.height;
          const finalScale = Math.min(scaleX, scaleY, 1.0); // Never upscale to prevent blur
          
          console.log('📐 PDF canvas placement:', { 
            imageSize: `${img.width}x${img.height}`,
            canvasSize: `${canvasWidth}x${canvasHeight}`,
            scale: finalScale,
            finalSize: `${Math.round(img.width * finalScale)}x${Math.round(img.height * finalScale)}`
          });
          
          // Apply scaling and centering
          fabricImg.set({
            left: (canvasWidth - img.width * finalScale) / 2,
            top: (canvasHeight - img.height * finalScale) / 2,
            scaleX: finalScale,
            scaleY: finalScale
          });
          
          // Add PDF metadata for multi-page support
          fabricImg.set({
            pdfCurrentPage: currentPageNum,
            pdfTotalPages: totalPages,
            pdfOriginalName: file.name
          });
          
          fabricCanvas.current.add(fabricImg);
          fabricCanvas.current.setActiveObject(fabricImg);
          fabricCanvas.current.sendObjectToBack(fabricImg);
          fabricCanvas.current.renderAll();
          saveCanvasState();
          
          setUploadProgress(100);
          setTimeout(() => {
            setIsUploading(false);
            setUploadProgress(0);
          }, 1000);
          
            console.log('✅ PDF content rendered successfully on whiteboard');
            const pageInfo = totalPages > 1 ? ` (Page ${currentPageNum}/${totalPages})` : '';
            showNotification(`📄 "${file.name}"${pageInfo} loaded! ${totalPages > 1 ? 'Right-click PDF to navigate pages. ' : ''}You can now annotate on it.`, 'success');          if (socket && isTeacher) {
            socket.emit('whiteboard:pdf-loaded', {
              classId,
              pdfData: { name: file.name, hasContent: true },
              userId: user.id,
              layer: currentLayer
            });
          }
        } catch (fabricError) {
          console.error('❌ Error creating Fabric image:', fabricError);
          setIsUploading(false);
          setUploadProgress(0);
          showNotification('Failed to create PDF object: ' + fabricError.message, 'error');
        }
      };
      
      img.onerror = () => {
        console.error('❌ Failed to load rendered PDF content');
        setIsUploading(false);
        setUploadProgress(0);
        showNotification('Failed to load rendered PDF content', 'error');
      };
      
      // Set crossOrigin before src
      img.crossOrigin = 'anonymous';
      img.src = dataUrl;
      
    } catch (error) {
      console.error('❌ PDF rendering failed:', error);
      setIsUploading(false);
      setUploadProgress(0);
      showNotification('PDF rendering failed: ' + error.message + '. Try converting PDF to image first.', 'error');
    }
    
    // Clear the input so the same file can be uploaded again
    event.target.value = '';
  }, [currentLayer, user.id, socket, classId, isTeacher, saveCanvasState, showNotification]);

  // Auto-save functionality
  useEffect(() => {
    if (!fabricCanvas.current || !isTeacher) return;
    
    const saveInterval = setInterval(() => {
      saveCanvasState();
    }, 30000); // Auto-save every 30 seconds
    
    return () => clearInterval(saveInterval);
  }, [saveCanvasState, isTeacher]);

  // === Selection listeners to keep sliders synced ===
  useEffect(() => {
    if (!fabricCanvas.current) return;
    const c = fabricCanvas.current;
    const handleUpdate = () => {
      const active = c.getActiveObject();
      if (active && (active.type === 'image' || active.isPdfPage)) {
        setSelectedTransform({ scale: active.scaleX, angle: active.angle || 0 });
        setActiveImageId(active.__uid || active.cacheKey || active.toObject?.().id || null);
      }
    };
    c.on('selection:created', handleUpdate);
    c.on('selection:updated', handleUpdate);
    c.on('selection:cleared', () => { setActiveImageId(null); setSelectedTransform({ scale: 1, angle: 0 }); });
    c.on('object:modified', handleUpdate);
    return () => {
      c.off('selection:created', handleUpdate);
      c.off('selection:updated', handleUpdate);
      c.off('selection:cleared');
      c.off('object:modified', handleUpdate);
    };
  }, [fabricCanvas.current]);
  
  const startRecording = useCallback(() => {
    setIsRecording(true);
    setRecordingData([{
      timestamp: Date.now(),
      action: 'recording-start',
      data: { canvasState: fabricCanvas.current.toJSON() },
      userId: user.id
    }]);
    showNotification('Recording started', 'info');
  }, [user.id, showNotification]);
  
  const stopRecording = useCallback(() => {
    setIsRecording(false);
    recordAction('recording-end', { canvasState: fabricCanvas.current.toJSON() });
    showNotification('Recording stopped', 'info');
  }, [recordAction, showNotification]);
  
  const playbackRecording = useCallback(async () => {
    if (recordingData.length === 0) return;
    
    setIsPlaying(true);
    
    // Clear canvas first
    fabricCanvas.current.clear();
    
    const startTime = recordingData[0].timestamp;
    
    for (let i = 0; i < recordingData.length; i++) {
      const action = recordingData[i];
      const delay = (action.timestamp - startTime) / playbackSpeed;
      
      await new Promise(resolve => setTimeout(resolve, delay));
      
      if (!isPlaying) break; // Stop if user cancelled
      
      // Apply the action to canvas
      switch (action.action) {
        case 'path-created':
          // Reconstruct and add path
          if (action.data.pathData) {
            util.enlivenObjects([action.data.pathData], (objects) => {
              objects.forEach(obj => fabricCanvas.current.add(obj));
              fabricCanvas.current.renderAll();
            });
          }
          break;
          
        case 'object-added':
          // Add object
          if (action.data.objectData) {
            util.enlivenObjects([action.data.objectData], (objects) => {
              objects.forEach(obj => fabricCanvas.current.add(obj));
              fabricCanvas.current.renderAll();
            });
          }
          break;
          
        // Add more action types as needed
      }
    }
    
    setIsPlaying(false);
    showNotification('Playback completed', 'success');
  }, [recordingData, playbackSpeed, isPlaying, showNotification]);
  
  const stopPlayback = useCallback(() => {
    setIsPlaying(false);
    showNotification('Playback stopped', 'info');
  }, [showNotification]);

  // ==================== SOCKET EVENT HANDLERS ====================
  useEffect(() => {
    if (!socket) return;
    
    const handleRemotePathCreated = (data) => {
      if (data.userId === user.id) return;
      
      fabricCanvas.current.loadFromJSON(data.pathData, () => {
        fabricCanvas.current.renderAll();
      });
    };
    
    const handleRemoteObjectModified = (data) => {
      if (data.userId === user.id) return;
      
      const objects = fabricCanvas.current.getObjects();
      const targetObject = objects.find(obj => obj.id === data.objectData.id);
      
      if (targetObject) {
        targetObject.set(data.objectData);
        fabricCanvas.current.renderAll();
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
    
    const handleRemoteClear = () => {
      fabricCanvas.current.clear();
      fabricCanvas.current.backgroundColor = '#ffffff';
      showNotification('Canvas cleared by instructor', 'info');
    };
    
    const handleRemotePointer = (data) => {
      if (data.userId === user.id) return;
      
      setRemotePointers(prev => ({
        ...prev,
        [data.userId]: data.pointer ? {
          x: data.pointer.x,
          y: data.pointer.y,
          action: data.action,
          timestamp: Date.now()
        } : null
      }));
    };
    
    socket.on('whiteboard:path-created', handleRemotePathCreated);
    socket.on('whiteboard:object-modified', handleRemoteObjectModified);
    socket.on('whiteboard:lock', handleRemoteLock);
    socket.on('whiteboard:unlock', handleRemoteUnlock);
    socket.on('whiteboard:clear', handleRemoteClear);
    socket.on('whiteboard:pointer-move', handleRemotePointer);
    
    return () => {
      socket.off('whiteboard:path-created', handleRemotePathCreated);
      socket.off('whiteboard:object-modified', handleRemoteObjectModified);
      socket.off('whiteboard:lock', handleRemoteLock);
      socket.off('whiteboard:unlock', handleRemoteUnlock);
      socket.off('whiteboard:clear', handleRemoteClear);
      socket.off('whiteboard:pointer-move', handleRemotePointer);
    };
  }, [socket, user.id, showNotification]);
  
  // ==================== WINDOW RESIZE HANDLER ====================
  useEffect(() => {
    let resizeTimeout;
    
    const handleResize = () => {
      // Debounce resize events to prevent excessive re-renders
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      
      resizeTimeout = setTimeout(() => {
        if (fabricCanvas.current && canvasRef.current && isReady) {
          const container = canvasRef.current.parentElement;
          if (container) {
            const containerRect = container.getBoundingClientRect();
            const containerWidth = Math.max(containerRect.width || 800, 300);
            const containerHeight = Math.max(containerRect.height || 600, 200);
            
            if (containerWidth > 100 && containerHeight > 100) {
              // Calculate responsive canvas size
              const canvasWidth = Math.min(Math.max(containerWidth - 40, 400), fullscreen ? window.innerWidth - 100 : 1400);
              const canvasHeight = Math.min(Math.max(containerHeight - 40, 300), fullscreen ? window.innerHeight - 200 : 900);
              
              const currentZoom = fabricCanvas.current.getZoom();
              const vpt = fabricCanvas.current.viewportTransform.slice();
              
              console.log('🔄 Resizing canvas:', canvasWidth, 'x', canvasHeight);
              
              // Force canvas element dimensions to prevent blur
              const canvasElement = canvasRef.current;
              canvasElement.style.width = canvasWidth + 'px';
              canvasElement.style.height = canvasHeight + 'px';
              canvasElement.width = canvasWidth;
              canvasElement.height = canvasHeight;
              
              // Update Fabric canvas dimensions
              fabricCanvas.current.setDimensions({
                width: canvasWidth,
                height: canvasHeight
              });
              
              // Restore zoom and viewport
              fabricCanvas.current.setZoom(currentZoom);
              fabricCanvas.current.setViewportTransform(vpt);
              fabricCanvas.current.renderAll();
              
              console.log('✅ Canvas resized with exact dimensions');
            }
          }
        }
      }, 150); // Debounce delay
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
    };
  }, [isReady, fullscreen]);
  
  // ==================== RENDER MAIN TOOLBAR ====================
  const renderMainToolbar = () => (
    <MainToolbar position="static">
      <Toolbar>
        {/* Basic Tools */}
        <ButtonGroup size="small" variant="outlined" sx={{ '& .MuiButton-root': { minWidth: 36 } }}>
          <Tooltip title="Select Tool (S) - Click to select and move objects" placement="bottom" arrow>
            <Button onClick={() => setTool('select')} variant={currentTool==='select' ? 'contained':'outlined'}>↖</Button>
          </Tooltip>
          <Tooltip title="Pen Tool (P) - Draw precise lines" placement="bottom" arrow>
            <Button onClick={() => setTool('pen')} variant={currentTool==='pen' ? 'contained':'outlined'}>✏️</Button>
          </Tooltip>
          <Tooltip title="Brush Tool (B) - Draw with thicker strokes" placement="bottom" arrow>
            <Button onClick={() => setTool('brush')} variant={currentTool==='brush' ? 'contained':'outlined'}>🖌️</Button>
          </Tooltip>
          <Tooltip title="Marker Tool - Bold marker strokes" placement="bottom" arrow>
            <Button onClick={() => setTool('marker')} variant={currentTool==='marker' ? 'contained':'outlined'}>🖊️</Button>
          </Tooltip>
          <Tooltip title="Highlighter Tool - Semi-transparent highlighting" placement="bottom" arrow>
            <Button onClick={() => setTool('highlighter')} variant={currentTool==='highlighter' ? 'contained':'outlined'}>🖍</Button>
          </Tooltip>
          <Tooltip title="Eraser Tool (E) - Erase drawings" placement="bottom" arrow>
            <Button onClick={() => setTool('eraser')} variant={currentTool==='eraser' ? 'contained':'outlined'}>⬜</Button>
          </Tooltip>
        </ButtonGroup>
        
        <Divider orientation="vertical" sx={{ mx: 1, height: 30 }} />
        
        {/* Shape Tools */}
        <ButtonGroup size="small" variant="outlined" sx={{ '& .MuiButton-root': { minWidth: 32 } }}>
          <Tooltip title="Rectangle Tool (R) - Draw rectangles and squares" placement="bottom" arrow>
            <Button onClick={() => setTool('rectangle')} variant={currentTool==='rectangle' ? 'contained':'outlined'}>▭</Button>
          </Tooltip>
          <Tooltip title="Circle Tool (C) - Draw circles and ellipses" placement="bottom" arrow>
            <Button onClick={() => setTool('circle')} variant={currentTool==='circle' ? 'contained':'outlined'}>◯</Button>
          </Tooltip>
          <Tooltip title="Line Tool (L) - Draw straight lines" placement="bottom" arrow>
            <Button onClick={() => setTool('line')} variant={currentTool==='line' ? 'contained':'outlined'}>─</Button>
          </Tooltip>
          <Tooltip title="Text Tool (T) - Add editable text" placement="bottom" arrow>
            <Button onClick={() => setTool('text')} variant={currentTool==='text' ? 'contained':'outlined'}>T</Button>
          </Tooltip>
        </ButtonGroup>

        {/* Debug / Force Drawing Button (only shown in dev) */}
        {process.env.NODE_ENV !== 'production' && (
          <Tooltip title="Force enable drawing mode (debug)" placement="bottom" arrow>
            <Button size="small" onClick={forceEnableDrawing} sx={{ ml: 1 }}>Force Pen</Button>
          </Tooltip>
        )}
        
        <Divider orientation="vertical" sx={{ mx: 1, height: 30 }} />
        
        {/* History Controls */}
        <ButtonGroup size="small">
          <Tooltip title="Undo last action (Ctrl+Z)" placement="bottom" arrow>
            <span>
              <Button onClick={undo} disabled={!canUndo}>
                ↶️
              </Button>
            </span>
          </Tooltip>
          <Tooltip title="Redo last action (Ctrl+Shift+Z)" placement="bottom" arrow>
            <span>
              <Button onClick={redo} disabled={!canRedo}>
                ↷️
              </Button>
            </span>
          </Tooltip>
        </ButtonGroup>
        
        <Divider orientation="vertical" sx={{ mx: 1, height: 30 }} />
        
        {/* View Controls */}
        <ButtonGroup size="small">
          <Tooltip title={showGrid ? "Hide Grid" : "Show Grid"} placement="bottom" arrow>
            <Button onClick={() => {
              console.log('🔲 Grid button clicked! Current state:', showGrid);
              setShowGrid(!showGrid);
            }}>
              {showGrid ? "☐" : "☒"}
            </Button>
          </Tooltip>
          <Tooltip title="Zoom In (+25%)" placement="bottom" arrow>
            <span>
              <Button 
                onClick={() => {
                  const newZoom = Math.min(zoom + 0.25, 3);
                  console.log('🔍 Zoom In clicked! From:', zoom, 'to:', newZoom);
                  setZoom(newZoom);
                }}
                disabled={zoom >= 3}
              >
                ➕
              </Button>
            </span>
          </Tooltip>
          <Tooltip title={`Reset Zoom (Current: ${Math.round(zoom * 100)}%)`} placement="bottom" arrow>
            <Button onClick={() => {
              console.log('🔍 Reset Zoom clicked! From:', zoom, 'to: 1');
              setZoom(1);
            }}>
              🎯
            </Button>
          </Tooltip>
          <Tooltip title="Zoom Out (-25%)" placement="bottom" arrow>
            <span>
              <Button 
                onClick={() => {
                  const newZoom = Math.max(zoom - 0.25, 0.25);
                  console.log('🔍 Zoom Out clicked! From:', zoom, 'to:', newZoom);
                  setZoom(newZoom);
                }}
                disabled={zoom <= 0.25}
              >
                ➖
              </Button>
            </span>
          </Tooltip>
          <Tooltip title={fullscreen ? "Exit Fullscreen" : "Enter Fullscreen"} placement="bottom" arrow>
            <Button onClick={() => {
              console.log('📺 Fullscreen button clicked! Current state:', fullscreen);
              setFullscreen(!fullscreen);
            }}>
              {fullscreen ? "🔵" : "⛶️"}
            </Button>
          </Tooltip>
        </ButtonGroup>
        
        <Box sx={{ flexGrow: 1 }} />
        
        {/* Collaboration Controls */}
        {isTeacher && (
          <>
            <Button 
              onClick={isLocked ? unlockCanvas : lockCanvas}
              color={isLocked ? "error" : "primary"}
              size="small"
              startIcon={isLocked ? "🔒" : "🔓"}
            >
              {isLocked ? 'Unlock' : 'Lock'}
            </Button>
            
            <Badge badgeContent={collaborators.length} color="primary">
              <Button size="small" startIcon={<span>👥</span>}>
                Collaborators
              </Button>
            </Badge>
          </>
        )}
        
        {/* Export/Import */}
        <ButtonGroup size="small" variant="outlined">
          <Tooltip title="Export whiteboard as image or PDF" placement="bottom" arrow>
            <Button onClick={() => {
              console.log('📥 Export button clicked!');
              setExportDialogOpen(true);
            }} color="primary">
              💾
            </Button>
          </Tooltip>
          <Tooltip title="Upload and insert image files (PNG, JPG, SVG)" placement="bottom" arrow>
            <span>
              <Button 
                onClick={() => {
                  console.log('🖼️ Image upload button clicked!');
                  if (!isUploading) fileInputRef.current?.click();
                }} 
                color="success" 
                disabled={isUploading}
                sx={{
                  '&:disabled': {
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    color: 'rgba(76, 175, 80, 0.5)'
                  }
                }}
              >
                {isUploading ? <Box sx={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: 16, height: 16, border: '2px solid #4caf50', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div></Box> : "📁"}
              </Button>
            </span>
          </Tooltip>
          <Tooltip title="Upload PDF documents (Note: For best compatibility, convert PDF to image first)" placement="bottom" arrow>
            <span>
              <Button 
                onClick={() => {
                  console.log('📄 PDF upload button clicked!');
                  if (!isUploading) pdfInputRef.current?.click();
                }} 
                color="warning" 
                disabled={isUploading}
                sx={{
                  '&:disabled': {
                    backgroundColor: 'rgba(255, 152, 0, 0.1)',
                    color: 'rgba(255, 152, 0, 0.5)'
                  }
                }}
              >
                {isUploading ? <Box sx={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: 16, height: 16, border: '2px solid #ff9800', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div></Box> : "📄"}
              </Button>
            </span>
          </Tooltip>
        </ButtonGroup>
        
        {/* Clear Canvas */}
        {isTeacher && (
          <Button 
            onClick={clearCanvas} 
            color="error" 
            size="small"
            startIcon={<span>🗑️</span>}
          >
            Clear
          </Button>
        )}
      </Toolbar>
    </MainToolbar>
  );
  
  // ==================== RENDER TOOL PANEL ====================
  const renderToolPanel = () => (
    <ToolPanel collapsed={sidebarCollapsed ? 'true' : 'false'} style={{ display: 'flex' }} data-collapsed={sidebarCollapsed}>
      {!sidebarCollapsed && (
        <Box sx={{ 
          p: 1.5, 
          borderBottom: '1px solid #e2e8f0',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between' 
        }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '14px' }}>
            Drawing Tools
          </Typography>
          <Button 
            size="small" 
            onClick={() => {
              console.log('🔽 Collapsing sidebar...');
              setSidebarCollapsed(true);
            }}
            sx={{ 
              minWidth: 'auto', 
              p: 0.5,
              fontSize: '16px',
              fontWeight: 'bold',
              '&:hover': {
                backgroundColor: 'rgba(0,0,0,0.1)'
              }
            }}
          >
            ‹
          </Button>
        </Box>
      )}
      {sidebarCollapsed && (
        <Box sx={{ 
          p: 0.5, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%'
        }}>
          <Button 
            size="small" 
            onClick={() => {
              console.log('🔼 Expanding sidebar...');
              setSidebarCollapsed(false);
            }}
            sx={{ 
              minWidth: 'auto', 
              p: 1,
              writingMode: 'vertical-lr',
              fontSize: '10px',
              height: '80px',
              '&:hover': {
                backgroundColor: 'rgba(0,0,0,0.1)'
              }
            }}
          >
            ›
          </Button>
        </Box>
      )}
      
      {!sidebarCollapsed && (
        <Box sx={{ 
          p: 1.5, 
          flex: 1, 
          overflow: 'auto',
          maxHeight: 'calc(100vh - 200px)', // Ensure scrollable area fits in viewport
          '&::-webkit-scrollbar': {
            width: '6px'
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: '#f1f1f1',
            borderRadius: '3px'
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: '#c1c1c1',
            borderRadius: '3px',
            '&:hover': {
              backgroundColor: '#a8a8a8'
            }
          }
        }}>
        <Stack spacing={3}>
          {/* Image / PDF Adjustments */}
          <Card>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                Image / PDF Adjustments
              </Typography>
              <Stack spacing={2}>
                <Typography variant="body2" color="text.secondary">
                  Select an image or PDF object on the canvas to enable controls.
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    if (!fabricCanvas.current) return;
                    const active = fabricCanvas.current.getActiveObject();
                    if (!active || (active.type !== 'image' && !active.isPdfPage)) {
                      showNotification('Select an image or PDF first', 'warning');
                      return;
                    }
                    // Reset transforms
                    active.scaleX = 1;
                    active.scaleY = 1;
                    active.angle = 0;
                    active.setCoords();
                    fabricCanvas.current.renderAll();
                    saveCanvasState();
                  }}
                >Reset Transform</Button>
                <Box>
                  <Typography variant="body2" gutterBottom>Scale: {selectedTransform.scale.toFixed(2)}x</Typography>
                  <Slider
                    min={0.05}
                    max={3}
                    step={0.01}
                    value={selectedTransform.scale}
                    onChange={(e, value) => {
                      setSelectedTransform(prev => ({ ...prev, scale: value }));
                      if (!fabricCanvas.current) return;
                      const active = fabricCanvas.current.getActiveObject();
                      if (!active || (active.type !== 'image' && !active.isPdfPage)) return;
                      active.scaleX = value;
                      active.scaleY = value;
                      active.setCoords();
                      fabricCanvas.current.renderAll();
                    }}
                    onChangeCommitted={() => { saveCanvasState(); }}
                  />
                </Box>
                <Box>
                  <Typography variant="body2" gutterBottom>Rotate: {Math.round(selectedTransform.angle)}°</Typography>
                  <Slider
                    min={-180}
                    max={180}
                    step={1}
                    value={selectedTransform.angle}
                    onChange={(e, value) => {
                      setSelectedTransform(prev => ({ ...prev, angle: value }));
                      if (!fabricCanvas.current) return;
                      const active = fabricCanvas.current.getActiveObject();
                      if (!active || (active.type !== 'image' && !active.isPdfPage)) return;
                      active.angle = value;
                      active.setCoords();
                      fabricCanvas.current.renderAll();
                    }}
                    onChangeCommitted={() => { saveCanvasState(); }}
                  />
                </Box>
                <Stack direction="row" spacing={1}>
                  <Button size="small" onClick={() => {
                    if (!fabricCanvas.current) return;
                    const active = fabricCanvas.current.getActiveObject();
                    if (!active || (active.type !== 'image' && !active.isPdfPage)) return;
                    active.scaleX *= 1.1; active.scaleY *= 1.1; active.setCoords(); fabricCanvas.current.renderAll(); saveCanvasState();
                    setSelectedTransform({ scale: active.scaleX, angle: active.angle });
                  }}>Zoom +</Button>
                  <Button size="small" onClick={() => {
                    if (!fabricCanvas.current) return;
                    const active = fabricCanvas.current.getActiveObject();
                    if (!active || (active.type !== 'image' && !active.isPdfPage)) return;
                    active.scaleX *= 0.9; active.scaleY *= 0.9; active.setCoords(); fabricCanvas.current.renderAll(); saveCanvasState();
                    setSelectedTransform({ scale: active.scaleX, angle: active.angle });
                  }}>Zoom -</Button>
                  <Button size="small" onClick={() => {
                    if (!fabricCanvas.current) return;
                    const active = fabricCanvas.current.getActiveObject();
                    if (!active || (active.type !== 'image' && !active.isPdfPage)) return;
                    active.angle = (active.angle + 90) % 360; active.setCoords(); fabricCanvas.current.renderAll(); saveCanvasState();
                    setSelectedTransform({ scale: active.scaleX, angle: active.angle });
                  }}>Rotate 90°</Button>
                </Stack>
                <Stack direction="row" spacing={1}>
                  <Button size="small" variant="text" onClick={() => {
                    if (!fabricCanvas.current) return; const active = fabricCanvas.current.getActiveObject();
                    if (!active || (active.type !== 'image' && !active.isPdfPage)) return;
                    const cw = fabricCanvas.current.getWidth();
                    active.scaleX = (cw * 0.9) / active.width; active.scaleY = active.scaleX; active.left = (cw - active.width * active.scaleX)/2; active.setCoords(); fabricCanvas.current.renderAll(); saveCanvasState();
                    setSelectedTransform({ scale: active.scaleX, angle: active.angle });
                  }}>Fit Width</Button>
                  <Button size="small" variant="text" onClick={() => {
                    if (!fabricCanvas.current) return; const active = fabricCanvas.current.getActiveObject();
                    if (!active || (active.type !== 'image' && !active.isPdfPage)) return;
                    const ch = fabricCanvas.current.getHeight();
                    active.scaleY = (ch * 0.9) / active.height; active.scaleX = active.scaleY; active.top = (ch - active.height * active.scaleY)/2; active.setCoords(); fabricCanvas.current.renderAll(); saveCanvasState();
                    setSelectedTransform({ scale: active.scaleX, angle: active.angle });
                  }}>Fit Height</Button>
                </Stack>
                <Divider />
                <Typography variant="body2" gutterBottom>Crop (Beta)</Typography>
                <Button size="small" variant="outlined" onClick={() => {
                  if (!fabricCanvas.current) return;
                  const active = fabricCanvas.current.getActiveObject();
                  if (!active || (active.type !== 'image' && !active.isPdfPage)) {
                    showNotification('Select an image or PDF to crop', 'info');
                    return;
                  }
                  const bounds = active.getBoundingRect(true);
                  const cropRectWidth = bounds.width * 0.6;
                  const cropRectHeight = bounds.height * 0.6;
                  const cropRect = new fabric.Rect({
                    left: bounds.left + (bounds.width - cropRectWidth)/2,
                    top: bounds.top + (bounds.height - cropRectHeight)/2,
                    width: cropRectWidth,
                    height: cropRectHeight,
                    fill: 'rgba(0,0,0,0.15)',
                    stroke: '#2563eb',
                    strokeDashArray: [6,4],
                    selectable: true,
                    hasBorders: true,
                    hasControls: true,
                    cornerStyle: 'circle'
                  });
                  fabricCanvas.current.add(cropRect);
                  fabricCanvas.current.setActiveObject(cropRect);
                  fabricCanvas.current.renderAll();
                  showNotification('Adjust the crop rectangle, then click Apply Crop', 'info');
                  window.__pendingCrop = { image: active, rect: cropRect };
                }}>Start Crop</Button>
                <Button size="small" color="success" variant="contained" onClick={() => {
                  if (!fabricCanvas.current || !window.__pendingCrop) return;
                  const { image, rect } = window.__pendingCrop;
                  if (!image || !rect) return;
                  const c = fabricCanvas.current;
                  const angle = image.angle || 0;
                  const rectBounds = rect.getBoundingRect();
                  let dataUrl;
                  if (angle !== 0) {
                    // Rotation-aware: snapshot only the image portion by hiding others then sampling canvas pixels
                    const all = c.getObjects();
                    const hidden = [];
                    all.forEach(o => { if (o !== image && o !== rect) { hidden.push(o); o.visible = false; } });
                    c.renderAll();
                    const canvasEl = c.getElement();
                    const off = document.createElement('canvas');
                    off.width = rectBounds.width; off.height = rectBounds.height;
                    const octx = off.getContext('2d');
                    octx.drawImage(canvasEl, rectBounds.left, rectBounds.top, rectBounds.width, rectBounds.height, 0, 0, rectBounds.width, rectBounds.height);
                    dataUrl = off.toDataURL('image/png');
                    // restore
                    hidden.forEach(o => o.visible = true);
                    c.renderAll();
                  } else {
                    // Non-rotated precise crop using intrinsic image element
                    const imgBounds = image.getBoundingRect();
                    const cropX = (rectBounds.left - imgBounds.left) / image.scaleX;
                    const cropY = (rectBounds.top - imgBounds.top) / image.scaleY;
                    const cropW = rectBounds.width / image.scaleX;
                    const cropH = rectBounds.height / image.scaleY;
                    const off = document.createElement('canvas');
                    off.width = cropW; off.height = cropH;
                    const octx = off.getContext('2d');
                    octx.drawImage(image._element, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
                    dataUrl = off.toDataURL('image/png');
                  }
                  // History tracking
                  const key = image.__uid || image.cacheKey || image.toObject?.().id || (image.__originalKey) || Math.random().toString(36).slice(2);
                  image.__originalKey = key;
                  if (!originalImageSourcesRef.current.has(key)) {
                    originalImageSourcesRef.current.set(key, [{ src: image._element.currentSrc || image._element.src, angle }]);
                  }
                  const arr = originalImageSourcesRef.current.get(key);
                  arr.push({ src: dataUrl, angle });
                  try {
                    const newImgEl = new Image();
                    newImgEl.onload = () => {
                      image.setElement(newImgEl);
                      image.scaleX = 1; image.scaleY = 1;
                      image.left = rectBounds.left; image.top = rectBounds.top;
                      image.setCoords();
                      c.remove(rect);
                      delete window.__pendingCrop;
                      c.setActiveObject(image);
                      c.renderAll();
                      saveCanvasState();
                      setCropVersionTick(t => t+1);
                      showNotification('Crop applied', 'success');
                    };
                    newImgEl.src = dataUrl;
                  } catch (e) {
                    showNotification('Failed to apply crop', 'error');
                  }
                }}>Apply Crop</Button>
                <Button size="small" color="error" variant="text" onClick={() => {
                  if (!fabricCanvas.current || !window.__pendingCrop) return;
                  const { rect } = window.__pendingCrop;
                  fabricCanvas.current.remove(rect);
                  delete window.__pendingCrop;
                  fabricCanvas.current.renderAll();
                  showNotification('Crop cancelled', 'info');
                }}>Cancel Crop</Button>
                <Button size="small" variant="text" onClick={() => {
                  if (!fabricCanvas.current) return; const active = fabricCanvas.current.getActiveObject();
                  if (!active || !active.__originalKey) { showNotification('No crop history', 'info'); return; }
                  const arr = originalImageSourcesRef.current.get(active.__originalKey);
                  if (!arr || arr.length <= 1) { showNotification('Nothing to undo', 'info'); return; }
                  // Remove last state
                  arr.pop();
                  const prev = arr[arr.length - 1];
                  const imgEl = new Image(); imgEl.onload = () => { active.setElement(imgEl); active.scaleX=1; active.scaleY=1; active.angle = prev.angle; active.setCoords(); fabricCanvas.current.renderAll(); saveCanvasState(); showNotification('Undid last crop', 'success'); setCropVersionTick(t=>t+1); }; imgEl.src = prev.src;
                }}>Undo Crop Step</Button>
                <Button size="small" variant="text" onClick={() => {
                  if (!fabricCanvas.current) return; const active = fabricCanvas.current.getActiveObject();
                  if (!active || !active.__originalKey) { showNotification('No original stored', 'info'); return; }
                  const arr = originalImageSourcesRef.current.get(active.__originalKey);
                  if (!arr || arr.length === 0) { showNotification('Original not found', 'warning'); return; }
                  const first = arr[0];
                  const imgEl = new Image(); imgEl.onload = () => { active.setElement(imgEl); active.scaleX=1; active.scaleY=1; active.angle = first.angle; active.setCoords(); fabricCanvas.current.renderAll(); saveCanvasState(); showNotification('Original restored', 'success'); setCropVersionTick(t=>t+1); }; imgEl.src = first.src;
                  // Trim history to original only
                  originalImageSourcesRef.current.set(active.__originalKey, [first]);
                }}>Restore Original</Button>
              </Stack>
            </CardContent>
          </Card>
          {/* Brush Settings */}
          <Card>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                Brush Settings
              </Typography>
              

              
              <Stack spacing={2}>
                <Box>
                  <Typography variant="body2" gutterBottom>Color</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                    {['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500'].map(color => (
                      <Box
                        key={color}
                        onClick={() => {
                          console.log('🎨 Color clicked:', color);
                          setBrushSettings(prev => ({ ...prev, color }));
                        }}
                        sx={{
                          width: 24,
                          height: 24,
                          backgroundColor: color,
                          border: brushSettings.color === color ? '3px solid #2196F3' : '1px solid #ccc',
                          borderRadius: '50%',
                          cursor: 'pointer',
                          '&:hover': { transform: 'scale(1.2)', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' },
                          transition: 'all 0.2s ease'
                        }}
                      />
                    ))}
                  </Box>
                  <input
                    type="color"
                    value={brushSettings.color}
                    onChange={(e) => setBrushSettings(prev => ({ 
                      ...prev, 
                      color: e.target.value 
                    }))}
                    style={{ 
                      width: '100%', 
                      height: 32, 
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
                  <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                    {[2, 5, 10, 20, 30].map(size => (
                      <Button
                        key={size}
                        size="small"
                        variant={brushSettings.width === size ? "contained" : "outlined"}
                        onClick={() => {
                          console.log('📏 Width clicked:', size);
                          setBrushSettings(prev => ({ ...prev, width: size }));
                        }}
                        sx={{ 
                          minWidth: 40, 
                          fontSize: '0.75rem',
                          '&:hover': { transform: 'scale(1.05)' },
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {size}
                      </Button>
                    ))}
                  </Box>
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
          
          {/* Shape Settings */}
          <Card>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                Shape Settings
              </Typography>
              
              <Stack spacing={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={shapeSettings.fill}
                      onChange={(e) => setShapeSettings(prev => ({ 
                        ...prev, 
                        fill: e.target.checked 
                      }))}
                    />
                  }
                  label="Fill Shape"
                />
                
                {shapeSettings.fill && (
                  <Box>
                    <Typography variant="body2" gutterBottom>Fill Color</Typography>
                    <input
                      type="color"
                      value={shapeSettings.fillColor}
                      onChange={(e) => setShapeSettings(prev => ({ 
                        ...prev, 
                        fillColor: e.target.value 
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
                )}
                
                <Box>
                  <Typography variant="body2" gutterBottom>Stroke Color</Typography>
                  <input
                    type="color"
                    value={shapeSettings.strokeColor}
                    onChange={(e) => setShapeSettings(prev => ({ 
                      ...prev, 
                      strokeColor: e.target.value 
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
                    Stroke Width: {shapeSettings.strokeWidth}px
                  </Typography>
                  <Slider
                    value={shapeSettings.strokeWidth}
                    onChange={(e, value) => setShapeSettings(prev => ({ 
                      ...prev, 
                      strokeWidth: value 
                    }))}
                    min={1}
                    max={20}
                    step={1}
                    marks
                    valueLabelDisplay="auto"
                  />
                </Box>
              </Stack>
            </CardContent>
          </Card>
          
          {/* Text Settings */}
          <Card>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                Text Settings
              </Typography>
              
              <Stack spacing={2}>
                <Box>
                  <Typography variant="body2" gutterBottom>Font Size</Typography>
                  <Slider
                    value={textSettings.fontSize}
                    onChange={(e, value) => setTextSettings(prev => ({ 
                      ...prev, 
                      fontSize: value 
                    }))}
                    min={8}
                    max={72}
                    step={1}
                    marks
                    valueLabelDisplay="auto"
                  />
                </Box>
                
                <FormControl fullWidth>
                  <InputLabel>Font Family</InputLabel>
                  <Select
                    value={textSettings.fontFamily}
                    onChange={(e) => setTextSettings(prev => ({ 
                      ...prev, 
                      fontFamily: e.target.value 
                    }))}
                    size="small"
                  >
                    <MenuItem value="Arial">Arial</MenuItem>
                    <MenuItem value="Helvetica">Helvetica</MenuItem>
                    <MenuItem value="Times New Roman">Times New Roman</MenuItem>
                    <MenuItem value="Courier New">Courier New</MenuItem>
                    <MenuItem value="Georgia">Georgia</MenuItem>
                  </Select>
                </FormControl>
                
                <Box>
                  <Typography variant="body2" gutterBottom>Text Color</Typography>
                  <input
                    type="color"
                    value={textSettings.color}
                    onChange={(e) => setTextSettings(prev => ({ 
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
                
                <Stack direction="row" spacing={1}>
                  <Button
                    variant={textSettings.bold ? "contained" : "outlined"}
                    size="small"
                    onClick={() => setTextSettings(prev => ({ 
                      ...prev, 
                      bold: !prev.bold 
                    }))}
                  >
                    <strong>B</strong>
                  </Button>
                  <Button
                    variant={textSettings.italic ? "contained" : "outlined"}
                    size="small"
                    onClick={() => setTextSettings(prev => ({ 
                      ...prev, 
                      italic: !prev.italic 
                    }))}
                  >
                    <em>I</em>
                  </Button>
                  <Button
                    variant={textSettings.underline ? "contained" : "outlined"}
                    size="small"
                    onClick={() => setTextSettings(prev => ({ 
                      ...prev, 
                      underline: !prev.underline 
                    }))}
                  >
                    <u>U</u>
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
        </Box>
      )}
    </ToolPanel>
  );
  
  // ==================== RENDER FLOATING TOOLBAR ====================
  const renderFloatingToolbar = () => (
    <>
      <Fade in={isReady && currentTool !== 'select'}>
        <FloatingToolbar sx={{ 
          opacity: currentTool !== 'select' ? 1 : 0,
          visibility: currentTool !== 'select' ? 'visible' : 'hidden',
          transform: currentTool !== 'select' ? 'translateX(-50%) scale(1)' : 'translateX(-50%) scale(0.9)',
          transition: 'all 0.3s ease-in-out'
        }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              px: 1.5,
              py: 0.5,
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              borderRadius: '12px',
              border: '1px solid rgba(59, 130, 246, 0.2)'
            }}>
              {currentTool === 'pen' && <span style={{ fontSize: 16, color: '#3b82f6' }}>✏️</span>}
              {currentTool === 'brush' && <span style={{ fontSize: 16, color: '#3b82f6' }}>🖌️</span>}
              {currentTool === 'marker' && <span style={{ fontSize: 16, color: '#3b82f6' }}>🎨</span>}
              {currentTool === 'highlighter' && <span style={{ fontSize: 16, color: '#3b82f6' }}>🖍️</span>}
              {currentTool === 'eraser' && <span style={{ fontSize: 16, color: '#3b82f6' }}>🧽</span>}
              {currentTool === 'text' && <span style={{ fontSize: 16, color: '#3b82f6' }}>📝</span>}
              {currentTool === 'rectangle' && <span style={{ fontSize: 16, color: '#3b82f6' }}>▭</span>}
              {currentTool === 'circle' && <span style={{ fontSize: 16, color: '#3b82f6' }}>⭕</span>}
              {currentTool === 'line' && <span style={{ fontSize: 16, color: '#3b82f6' }}>📈</span>}
              
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#3b82f6', fontSize: '0.8rem' }}>
                {currentTool.charAt(0).toUpperCase() + currentTool.slice(1)}
              </Typography>
            </Box>
            
            <Divider orientation="vertical" sx={{ mx: 1, height: 24 }} />
            
            <Tooltip title="Switch to Select Tool">
              <IconButton 
                aria-label="switch to select tool"
                size="small" 
                onClick={() => setTool('select')}
                sx={{ 
                  '&:hover': { 
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    transform: 'scale(1.1)'
                  },
                  transition: 'all 0.2s ease'
                }}
              >
                <span>🖱️</span>
              </IconButton>
            </Tooltip>
        
        {(currentTool === 'pen' || currentTool === 'brush' || currentTool === 'marker' || currentTool === 'highlighter') && (
          <>
            <input
              type="color"
              value={brushSettings.color}
              onChange={(e) => {
                console.log('🎨 Color changed to:', e.target.value);
                setBrushSettings(prev => ({ 
                  ...prev, 
                  color: e.target.value 
                }));
              }}
              style={{ 
                width: 32, 
                height: 32, 
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                marginLeft: 8
              }}
            />
            
            <Box sx={{ width: 100, ml: 2 }}>
              <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                {brushSettings.width}px
              </Typography>
              <Slider
                value={brushSettings.width}
                onChange={(e, value) => setBrushSettings(prev => ({ 
                  ...prev, 
                  width: value 
                }))}
                min={1}
                max={currentTool === 'highlighter' ? 15 : currentTool === 'marker' ? 25 : 20}
                step={1}
                size="small"
              />
            </Box>
          </>
        )}
        
        {(currentTool === 'rectangle' || currentTool === 'circle' || currentTool === 'line') && (
          <>
            <input
              type="color"
              value={shapeSettings.strokeColor}
              onChange={(e) => setShapeSettings(prev => ({ 
                ...prev, 
                strokeColor: e.target.value 
              }))}
              style={{ 
                width: 32, 
                height: 32, 
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                marginLeft: 8
              }}
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={shapeSettings.fill}
                  onChange={(e) => setShapeSettings(prev => ({ 
                    ...prev, 
                    fill: e.target.checked 
                  }))}
                  size="small"
                />
              }
              label="Fill"
              sx={{ ml: 1, mr: 0 }}
            />
          </>
        )}
        </FloatingToolbar>
      </Fade>
      
      {/* PDF Pagination */}
      {currentPdf && pdfPages.length > 1 && (
        <Paper
          sx={{
            position: 'absolute',
            bottom: 80,
            right: 20,
            p: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            borderRadius: 2
          }}
        >
          <IconButton 
            aria-label="previous pdf page"
            size="small"
            onClick={() => {
              if (currentPdfPage > 0) {
                setCurrentPdfPage(prev => prev - 1);
                loadPdfPage(currentPdfPage - 1);
              }
            }}
            disabled={currentPdfPage === 0}
          >
            <span>⏮️</span>
          </IconButton>
          
          <Typography variant="body2" sx={{ minWidth: 60, textAlign: 'center' }}>
            {currentPdfPage + 1} / {pdfPages.length}
          </Typography>
          
          <IconButton 
            aria-label="next pdf page"
            size="small"
            onClick={() => {
              if (currentPdfPage < pdfPages.length - 1) {
                setCurrentPdfPage(prev => prev + 1);
                loadPdfPage(currentPdfPage + 1);
              }
            }}
            disabled={currentPdfPage === pdfPages.length - 1}
          >
            <span>⏭️</span>
          </IconButton>
        </Paper>
      )}
    </>
  );
  

  
  // ==================== MAIN RENDER ====================
  
  // Lightweight inline fallback while Fabric libraries are still loading (removed legacy FallbackWhiteboard component)
  if (fabricLoading || !fabric || !Canvas) {
    return (
      <WhiteboardContainer data-testid="whiteboard-container">
        <Box sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 2,
          p: 4
        }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {fabricLoading ? 'Loading Whiteboard Engine…' : 'Whiteboard Engine Unavailable'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420, textAlign: 'center' }}>
            {fabricLoading
              ? 'Initializing drawing libraries (Fabric.js). If this takes unusually long, check your network.'
              : 'Fabric.js failed to load. Please refresh. If the problem persists, contact support.'}
          </Typography>
          {fabricLoading && <LinearProgress aria-label="loading whiteboard engine" sx={{ width: 300, maxWidth: '90%', mt: 1 }} />}
          <Button variant="contained" size="small" onClick={() => window.location.reload()} sx={{ mt: 2 }}>
            Refresh
          </Button>
        </Box>
      </WhiteboardContainer>
    );
  }
  
  return (
    <WhiteboardContainer data-fullscreen={fullscreen ? 'true' : 'false'} data-testid="whiteboard-container">
      {isReady && renderMainToolbar()}
      
      <Box sx={{ 
        position: 'relative', 
        flex: 1, 
        display: 'flex', 
        gap: 0.5, 
        padding: 0,
        height: 'calc(100vh - 64px)', // assume toolbar height ~64px
        maxHeight: 'calc(100vh - 64px)',
        width: '100%',
        overflow: 'hidden'
      }}>
        {renderToolPanel()}
        
        <CanvasContainer fullscreen={fullscreen ? 'true' : 'false'} sx={{ flex: 1, minWidth: 0 }}>
          {/* Canvas with improved responsive design */}
          <Box 
            sx={{ 
              position: 'relative',
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'auto',
              '&::-webkit-scrollbar': { width: 8, height: 8 },
              '&::-webkit-scrollbar-thumb': { background: '#94a3b8', borderRadius: 4 }
            }}
          >
            <canvas 
              ref={canvasCallbackRef} 
              data-testid="whiteboard-canvas"
              onClick={() => console.log('🖱️ Canvas clicked! Tool:', currentTool, 'Ready:', !!fabricCanvas.current)}
              style={{ 
                display: 'block',
                border: isReady ? '2px solid #3b82f6' : '2px dashed #cbd5e1',
                borderRadius: '12px',
                backgroundColor: '#ffffff',
                // Force full opacity even while initializing to prevent user perceiving a faded board
                opacity: 1,
                // Removed debug magenta outline
                outline: 'none',
                zIndex: 10,
                position: 'relative',
                transition: 'all 0.3s ease-in-out',
                cursor: 
                  !isReady ? 'wait' :
                  ['pen', 'brush', 'marker', 'highlighter', 'eraser'].includes(currentTool) ? 'crosshair' : 
                  currentTool === 'text' ? 'text' :
                  ['rectangle', 'circle', 'line', 'arrow'].includes(currentTool) ? 'crosshair' : 
                  currentTool === 'select' ? 'default' : 'crosshair',
                boxShadow: isReady 
                  ? (fullscreen ? 'none' : '0 8px 32px rgba(59, 130, 246, 0.15)')
                  : '0 4px 12px rgba(0, 0, 0, 0.1)'
              }}
            />
            {activeImageId && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  zIndex: 50,
                  background: 'rgba(255,255,255,0.85)',
                  backdropFilter: 'blur(4px)',
                  border: '1px solid #cbd5e1',
                  borderRadius: 2,
                  p: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 600 }}>Transform</Typography>
                <Button size="small" onClick={() => {
                  if (!fabricCanvas.current) return; const active = fabricCanvas.current.getActiveObject();
                  if (!active) return; active.scaleX *= 1.1; active.scaleY *= 1.1; active.setCoords(); fabricCanvas.current.renderAll(); setSelectedTransform({ scale: active.scaleX, angle: active.angle||0 }); saveCanvasState();
                }}>+</Button>
                <Button size="small" onClick={() => {
                  if (!fabricCanvas.current) return; const active = fabricCanvas.current.getActiveObject();
                  if (!active) return; active.scaleX *= 0.9; active.scaleY *= 0.9; active.setCoords(); fabricCanvas.current.renderAll(); setSelectedTransform({ scale: active.scaleX, angle: active.angle||0 }); saveCanvasState();
                }}>-</Button>
                <Button size="small" onClick={() => {
                  if (!fabricCanvas.current) return; const active = fabricCanvas.current.getActiveObject();
                  if (!active) return; active.angle = (active.angle + 15) % 360; active.setCoords(); fabricCanvas.current.renderAll(); setSelectedTransform({ scale: active.scaleX, angle: active.angle||0 }); saveCanvasState();
                }}>↻15°</Button>
                <Button size="small" onClick={() => {
                  if (!fabricCanvas.current) return; const active = fabricCanvas.current.getActiveObject();
                  if (!active) return; active.scaleX=1; active.scaleY=1; active.angle=0; active.setCoords(); fabricCanvas.current.renderAll(); setSelectedTransform({ scale:1, angle:0 }); saveCanvasState();
                }}>Reset</Button>
              </Box>
            )}
          </Box>
          
          {/* Enhanced loading overlay */}
          {!isReady && !initializationError && (
            <Fade in={!isReady}>
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(248, 250, 252, 0.95)',
                  backdropFilter: 'blur(8px)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 2000,
                  gap: 3
                }}
              >
                <Box sx={{ textAlign: 'center', maxWidth: 400 }}>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h4" sx={{ mb: 1, color: '#1e293b', fontWeight: 600 }}>
                      🎨 Advanced Whiteboard
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                      Initializing canvas and drawing tools...
                    </Typography>
                  </Box>
                  
                  <Box sx={{ width: '100%', mb: 3 }}>
                    <LinearProgress aria-label="initializing advanced whiteboard" 
                      sx={{ 
                        height: 10, 
                        borderRadius: 5,
                        backgroundColor: '#e2e8f0',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: '#3b82f6'
                        }
                      }} 
                    />
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    📐 Setting up drawing tools and collaboration features...
                  </Typography>
                  
                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 1 }}>
                    <Chip icon={<span>✏️</span>} label="Pen" size="small" />
                    <Chip icon={<span>🖌️</span>} label="Brush" size="small" />
                    <Chip icon={<span>▭</span>} label="Shapes" size="small" />
                    <Chip icon={<span>📝</span>} label="Text" size="small" />
                  </Box>
                </Box>
              </Box>
            </Fade>
          )}
          
          {/* Error State */}
          {initializationError && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2000,
                gap: 3
              }}
            >
              <Box sx={{ textAlign: 'center', maxWidth: 400 }}>
                <Typography variant="h6" color="error" gutterBottom>
                  ⚠️ Whiteboard Initialization Failed
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  The whiteboard canvas failed to initialize properly. This might be due to browser compatibility or resource loading issues.
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', mb: 2 }}>
                  Error: {initializationError}
                </Typography>
                <Button 
                  variant="contained" 
                  onClick={retryInitialization}
                  startIcon={<span>↷️</span>}
                  sx={{ mr: 1 }}
                >
                  Retry Initialization
                </Button>
                <Button 
                  variant="outlined" 
                  onClick={() => window.location.reload()}
                >
                  Refresh Page
                </Button>
              </Box>
            </Box>
          )}
          
          {/* Loading Overlay */}
          {!isReady && !initializationError && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2000,
                gap: 2
              }}
            >
              <LinearProgress aria-label="whiteboard initialization progress" sx={{ width: '300px' }} />
              <Typography variant="h6" color="primary">
                Initializing Advanced Whiteboard...
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Loading drawing tools and collaboration features
              </Typography>
            </Box>
          )}
          
          {/* Remote Pointers */}
          {Object.entries(remotePointers).map(([userId, pointer]) => (
            pointer && (
              <Box
                key={userId}
                sx={{
                  position: 'absolute',
                  left: pointer.x - 10,
                  top: pointer.y - 10,
                  width: 20,
                  height: 20,
                  backgroundColor: '#ff4444',
                  borderRadius: '50%',
                  pointerEvents: 'none',
                  zIndex: 1000,
                  transition: 'all 0.1s ease-out'
                }}
              />
            )
          ))}
          
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
                <span style={{ fontSize: 48, display: 'inline-block', marginBottom: 8 }}>🔒</span>
                <Typography variant="h6" gutterBottom>
                  Canvas Locked
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {lockUser ? `Locked by ${lockUser.name}` : 'Canvas is currently locked for editing'}
                </Typography>
              </Paper>
            </Box>
          )}
          
          {/* Upload Progress Overlay */}
          {isUploading && (
            <Fade in={isUploading}>
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 2001,
                  backdropFilter: 'blur(4px)'
                }}
              >
                <Paper sx={{ 
                  p: 4, 
                  textAlign: 'center', 
                  minWidth: 300,
                  borderRadius: 3,
                  boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
                }}>
                  {uploadProgress === 100 ? (
                    <Box sx={{ color: '#4caf50' }}>
                      <Box sx={{ fontSize: 48, mb: 2, display: 'flex', justifyContent: 'center' }}>
                        ✅
                      </Box>
                      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#4caf50' }}>
                        Upload Complete!
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        File has been successfully loaded to the whiteboard
                      </Typography>
                    </Box>
                  ) : (
                    <>
                      <Box sx={{ fontSize: 48, color: '#3b82f6', mb: 2 }}>📁</Box>
                      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                        Uploading File...
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Please wait while we process your file
                      </Typography>
                      
                      <Box sx={{ width: '100%', mb: 2 }}>
                        <LinearProgress aria-label="file upload progress" 
                          variant={uploadProgress > 0 ? "determinate" : "indeterminate"}
                          value={uploadProgress}
                          sx={{ 
                            height: 8, 
                            borderRadius: 4,
                            backgroundColor: '#e3f2fd',
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: uploadProgress === 100 ? '#4caf50' : '#3b82f6',
                              borderRadius: 4
                            }
                          }} 
                        />
                      </Box>
                      
                      {uploadProgress > 0 && (
                        <Typography variant="body2" color="primary" sx={{ fontWeight: 600 }}>
                          {uploadProgress}% Complete
                        </Typography>
                      )}
                    </>
                  )}
                </Paper>
              </Box>
            </Fade>
          )}
        </CanvasContainer>

        {/* Debug Overlay: shows count & sample of objects to diagnose invisibility */}
        {process.env.NODE_ENV !== 'production' && isReady && (
          <Box sx={{
            position: 'absolute',
            top: 4,
            right: 4,
            background: 'rgba(0,0,0,0.55)',
            color: 'white',
            fontSize: 11,
            px: 1.2,
            py: 0.6,
            borderRadius: 1,
            maxWidth: 260,
            zIndex: 4000,
            fontFamily: 'monospace'
          }}>
            {(() => {
              try {
                const objs = (fabricCanvas.current?.getObjects?.() || []).filter(o => !o.isGrid);
                const summary = objs.slice(0,5).map(o => `${o.type}${o.text ? ':'+o.text.slice(0,6) : ''}[op=${o.opacity}]`).join(', ');
                return <span>objs: {objs.length} {summary && `| ${summary}`}</span>;
              } catch(e) {
                return <span>debug err</span>;
              }
            })()}
          </Box>
        )}
        
        {renderFloatingToolbar()}
        
        {/* Tool Panel Toggle */}
        <IconButton
          aria-label={leftPanelOpen ? 'collapse tool panel' : 'expand tool panel'}
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
          {leftPanelOpen ? <span>◀</span> : <span>▶</span>}
        </IconButton>
      </Box>
      
      <StatusBar>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Chip 
            icon={<span>🎯</span>} 
            label={`${Math.round(zoom * 100)}%`} 
            size="small" 
            variant="outlined"
          />
          <Chip 
            icon={
              currentTool === 'pen' ? <span>✏️</span> :
              currentTool === 'brush' ? <span>🖌️</span> :
              currentTool === 'marker' ? <span>🎨</span> :
              currentTool === 'highlighter' ? <span>🖍️</span> :
              currentTool === 'eraser' ? <span>🧽</span> :
              currentTool === 'text' ? <span>📝</span> :
              currentTool === 'rectangle' ? <span>▭</span> :
              currentTool === 'circle' ? <span>⭕</span> :
              currentTool === 'line' ? <span>📈</span> :
              currentTool === 'select' ? <span>👆</span> : <span>✋</span>
            }
            label={currentTool.charAt(0).toUpperCase() + currentTool.slice(1)}
            size="small"
            color={isReady ? 'primary' : 'default'}
          />
          {isLocked && (
            <Chip
              icon={<span>🔒</span>}
              label={lockUser ? `Locked by ${lockUser.name}` : 'Locked'}
              size="small"
              color="warning"
            />
          )}
          {!isReady && (
            <Chip
              label="Initializing..."
              size="small"
              color="info"
            />
          )}
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {collaborators.length > 0 && (
            <Chip 
              icon={<span>👥</span>}
              label={`${collaborators.length} user${collaborators.length > 1 ? 's' : ''}`}
              size="small"
              variant="outlined"
              color="success"
            />
          )}
          <Chip
            icon={<span>📄</span>}
            label={`${fabricCanvas.current?.getObjects().filter(obj => !obj.isGrid).length || 0} objects`}
            size="small"
            variant="outlined"
          />
          {isTeacher && (
            <Chip
              label="Teacher"
              size="small"
              color="primary"
            />
          )}
        </Box>
      </StatusBar>
      
      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onClose={() => setExportDialogOpen(false)}>
        <DialogTitle>Export Whiteboard</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Format</InputLabel>
              <Select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
              >
                <MenuItem value="png">PNG</MenuItem>
                <MenuItem value="jpg">JPEG</MenuItem>
                <MenuItem value="svg">SVG</MenuItem>
                <MenuItem value="pdf">PDF</MenuItem>
              </Select>
            </FormControl>
            
            {exportFormat !== 'svg' && (
              <Box>
                <Typography gutterBottom>Quality: {Math.round(exportQuality * 100)}%</Typography>
                <Slider
                  value={exportQuality}
                  onChange={(e, value) => setExportQuality(value)}
                  min={0.1}
                  max={3}
                  step={0.1}
                  marks
                  valueLabelDisplay="auto"
                />
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={() => exportCanvas(exportFormat, exportQuality)}
            variant="contained"
            disabled={isExporting}
          >
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/svg+xml,image/webp,.jpg,.jpeg,.png,.gif,.svg,.webp"
        style={{ display: 'none' }}
        onChange={handleImageUpload}
        title="Select image file to upload to whiteboard"
      />
      
      <input
        ref={pdfInputRef}
        type="file"
        accept="application/pdf,.pdf"
        style={{ display: 'none' }}
        onChange={handlePdfUpload}
        title="Select PDF file to display on whiteboard"
      />
      
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

export default AdvancedWhiteboard;
