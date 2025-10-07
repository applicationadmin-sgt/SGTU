/**
 * Advanced Whiteboard Utilities
 * Comprehensive utility functions for whiteboard functionality
 */

// ==================== CANVAS UTILITIES ====================

/**
 * Initialize canvas with optimal settings
 */
export const initializeCanvas = (canvas, options = {}) => {
  const defaultOptions = {
    width: 1200,
    height: 800,
    backgroundColor: '#ffffff',
    selection: true,
    preserveObjectStacking: true,
    renderOnAddRemove: true,
    imageSmoothingEnabled: true,
    allowTouchScrolling: false,
    enableRetinaScaling: true,
    ...options
  };
  
  Object.keys(defaultOptions).forEach(key => {
    canvas[key] = defaultOptions[key];
  });
  
  // Set up high DPI display support
  const ratio = window.devicePixelRatio || 1;
  if (ratio > 1) {
    canvas.setDimensions({
      width: defaultOptions.width * ratio,
      height: defaultOptions.height * ratio
    }, {
      cssOnly: false,
      backstoreOnly: true
    });
  }
  
  return canvas;
};

/**
 * Create optimized drawing brush
 */
export const createDrawingBrush = (canvas, type, settings) => {
  const { PencilBrush, CircleBrush, SprayBrush, PatternBrush } = require('fabric');
  
  let brush;
  
  switch (type) {
    case 'pencil':
      brush = new PencilBrush(canvas);
      break;
      
    case 'circle':
      brush = new CircleBrush(canvas);
      break;
      
    case 'spray':
      brush = new SprayBrush(canvas);
      if (settings.density) brush.density = settings.density;
      if (settings.dotWidth) brush.dotWidth = settings.dotWidth;
      if (settings.dotWidthVariance) brush.dotWidthVariance = settings.dotWidthVariance;
      if (settings.randomOpacity) brush.randomOpacity = settings.randomOpacity;
      break;
      
    case 'pattern':
      brush = new PatternBrush(canvas);
      if (settings.patternSrc) {
        const patternImg = new Image();
        patternImg.src = settings.patternSrc;
        patternImg.onload = () => {
          brush.source = patternImg;
        };
      }
      break;
      
    default:
      brush = new PencilBrush(canvas);
  }
  
  // Apply common settings
  if (settings.color) brush.color = settings.color;
  if (settings.width) brush.width = settings.width;
  if (settings.strokeLineCap) brush.strokeLineCap = settings.strokeLineCap;
  if (settings.strokeLineJoin) brush.strokeLineJoin = settings.strokeLineJoin;
  if (settings.strokeMiterLimit) brush.strokeMiterLimit = settings.strokeMiterLimit;
  if (settings.strokeDashArray) brush.strokeDashArray = settings.strokeDashArray;
  
  return brush;
};

// ==================== SHAPE UTILITIES ====================

/**
 * Create arrow with customizable head
 */
export const createArrow = (startPoint, endPoint, options = {}) => {
  const { Path } = require('fabric');
  
  const {
    color = '#000000',
    strokeWidth = 2,
    headSize = 15,
    headAngle = Math.PI / 6,
    curved = false,
    curvature = 0.3
  } = options;
  
  const dx = endPoint.x - startPoint.x;
  const dy = endPoint.y - startPoint.y;
  const angle = Math.atan2(dy, dx);
  
  let path;
  
  if (curved) {
    // Create curved arrow using quadratic curve
    const midX = (startPoint.x + endPoint.x) / 2;
    const midY = (startPoint.y + endPoint.y) / 2;
    const perpX = -dy * curvature;
    const perpY = dx * curvature;
    const controlX = midX + perpX;
    const controlY = midY + perpY;
    
    path = `M ${startPoint.x} ${startPoint.y} Q ${controlX} ${controlY} ${endPoint.x} ${endPoint.y}`;
  } else {
    // Straight arrow
    path = `M ${startPoint.x} ${startPoint.y} L ${endPoint.x} ${endPoint.y}`;
  }
  
  // Arrow head
  const headX1 = endPoint.x - headSize * Math.cos(angle - headAngle);
  const headY1 = endPoint.y - headSize * Math.sin(angle - headAngle);
  const headX2 = endPoint.x - headSize * Math.cos(angle + headAngle);
  const headY2 = endPoint.y - headSize * Math.sin(angle + headAngle);
  
  path += ` M ${endPoint.x} ${endPoint.y} L ${headX1} ${headY1} M ${endPoint.x} ${endPoint.y} L ${headX2} ${headY2}`;
  
  return new Path(path, {
    stroke: color,
    strokeWidth: strokeWidth,
    fill: '',
    strokeLineCap: 'round',
    strokeLineJoin: 'round'
  });
};

/**
 * Create mathematical shapes and symbols
 */
export const createMathShape = (type, position, options = {}) => {
  const { fabric } = require('fabric');
  
  const { size = 50, color = '#000000', strokeWidth = 2 } = options;
  
  switch (type) {
    case 'angle':
      return new fabric.Path(
        `M ${position.x} ${position.y + size} L ${position.x} ${position.y} L ${position.x + size} ${position.y}`,
        { stroke: color, strokeWidth, fill: '' }
      );
      
    case 'triangle':
      return new fabric.Triangle({
        left: position.x,
        top: position.y,
        width: size,
        height: size,
        stroke: color,
        strokeWidth,
        fill: 'transparent'
      });
      
    case 'parallelogram':
      const points = [
        { x: position.x + size * 0.2, y: position.y + size },
        { x: position.x, y: position.y },
        { x: position.x + size * 0.8, y: position.y },
        { x: position.x + size, y: position.y + size }
      ];
      return new fabric.Polygon(points, {
        stroke: color,
        strokeWidth,
        fill: 'transparent'
      });
      
    case 'pentagon':
      const pentPoints = [];
      for (let i = 0; i < 5; i++) {
        const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
        pentPoints.push({
          x: position.x + size * 0.5 + (size * 0.4) * Math.cos(angle),
          y: position.y + size * 0.5 + (size * 0.4) * Math.sin(angle)
        });
      }
      return new fabric.Polygon(pentPoints, {
        stroke: color,
        strokeWidth,
        fill: 'transparent'
      });
      
    case 'hexagon':
      const hexPoints = [];
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        hexPoints.push({
          x: position.x + size * 0.5 + (size * 0.4) * Math.cos(angle),
          y: position.y + size * 0.5 + (size * 0.4) * Math.sin(angle)
        });
      }
      return new fabric.Polygon(hexPoints, {
        stroke: color,
        strokeWidth,
        fill: 'transparent'
      });
      
    default:
      return null;
  }
};

// ==================== TEXT UTILITIES ====================

/**
 * Create formatted mathematical equations
 */
export const createMathEquation = (equation, position, options = {}) => {
  const { fabric } = require('fabric');
  
  const {
    fontSize = 20,
    fontFamily = 'Times New Roman',
    color = '#000000'
  } = options;
  
  // Simple equation formatting (for more complex equations, integrate MathJax or KaTeX)
  const formattedEquation = equation
    .replace(/\^(\w+)/g, '<sup>$1</sup>')
    .replace(/_(\w+)/g, '<sub>$1</sub>')
    .replace(/sqrt\(([^)]+)\)/g, '√($1)')
    .replace(/integral/g, '∫')
    .replace(/sum/g, '∑')
    .replace(/infinity/g, '∞')
    .replace(/pi/g, 'π')
    .replace(/alpha/g, 'α')
    .replace(/beta/g, 'β')
    .replace(/gamma/g, 'γ')
    .replace(/delta/g, 'δ')
    .replace(/theta/g, 'θ')
    .replace(/lambda/g, 'λ')
    .replace(/mu/g, 'μ')
    .replace(/sigma/g, 'σ');
  
  return new fabric.Text(formattedEquation, {
    left: position.x,
    top: position.y,
    fontSize,
    fontFamily,
    fill: color
  });
};

/**
 * Create text with advanced formatting
 */
export const createFormattedText = (text, position, styles = {}) => {
  const { fabric } = require('fabric');
  
  const textbox = new fabric.Textbox(text, {
    left: position.x,
    top: position.y,
    width: styles.width || 200,
    fontSize: styles.fontSize || 16,
    fontFamily: styles.fontFamily || 'Arial',
    fill: styles.color || '#000000',
    textAlign: styles.textAlign || 'left',
    fontWeight: styles.bold ? 'bold' : 'normal',
    fontStyle: styles.italic ? 'italic' : 'normal',
    underline: styles.underline || false,
    linethrough: styles.strikethrough || false,
    backgroundColor: styles.backgroundColor || '',
    borderColor: styles.borderColor || '',
    borderWidth: styles.borderWidth || 0
  });
  
  return textbox;
};

// ==================== GRID AND GUIDE UTILITIES ====================

/**
 * Create grid overlay
 */
export const createGrid = (canvas, gridSize = 20, options = {}) => {
  const { fabric } = require('fabric');
  
  const {
    color = '#e2e8f0',
    strokeWidth = 1,
    opacity = 0.5
  } = options;
  
  const width = canvas.getWidth();
  const height = canvas.getHeight();
  const gridGroup = new fabric.Group([], {
    selectable: false,
    evented: false,
    excludeFromExport: true
  });
  
  // Vertical lines
  for (let i = 0; i <= width; i += gridSize) {
    const line = new fabric.Line([i, 0, i, height], {
      stroke: color,
      strokeWidth,
      opacity,
      selectable: false,
      evented: false
    });
    gridGroup.addWithUpdate(line);
  }
  
  // Horizontal lines
  for (let i = 0; i <= height; i += gridSize) {
    const line = new fabric.Line([0, i, width, i], {
      stroke: color,
      strokeWidth,
      opacity,
      selectable: false,
      evented: false
    });
    gridGroup.addWithUpdate(line);
  }
  
  return gridGroup;
};

/**
 * Create ruler overlay
 */
export const createRulers = (canvas, options = {}) => {
  const { fabric } = require('fabric');
  
  const {
    color = '#666666',
    backgroundColor = '#f8f9fa',
    fontSize = 10,
    majorTickSize = 20,
    minorTickSize = 10,
    rulerWidth = 25
  } = options;
  
  const width = canvas.getWidth();
  const height = canvas.getHeight();
  
  // Horizontal ruler
  const horizontalRuler = new fabric.Rect({
    left: 0,
    top: 0,
    width: width,
    height: rulerWidth,
    fill: backgroundColor,
    stroke: color,
    strokeWidth: 1,
    selectable: false,
    evented: false,
    excludeFromExport: true
  });
  
  // Vertical ruler
  const verticalRuler = new fabric.Rect({
    left: 0,
    top: 0,
    width: rulerWidth,
    height: height,
    fill: backgroundColor,
    stroke: color,
    strokeWidth: 1,
    selectable: false,
    evented: false,
    excludeFromExport: true
  });
  
  // Add tick marks and numbers
  const tickGroup = new fabric.Group([], {
    selectable: false,
    evented: false,
    excludeFromExport: true
  });
  
  // Horizontal ruler ticks
  for (let i = 0; i <= width; i += 10) {
    const isMajor = i % 100 === 0;
    const tickHeight = isMajor ? majorTickSize : minorTickSize;
    
    const tick = new fabric.Line([i, rulerWidth - tickHeight, i, rulerWidth], {
      stroke: color,
      strokeWidth: 1,
      selectable: false,
      evented: false
    });
    tickGroup.addWithUpdate(tick);
    
    if (isMajor && i > 0) {
      const label = new fabric.Text(i.toString(), {
        left: i - 10,
        top: 2,
        fontSize,
        fill: color,
        selectable: false,
        evented: false
      });
      tickGroup.addWithUpdate(label);
    }
  }
  
  // Vertical ruler ticks
  for (let i = 0; i <= height; i += 10) {
    const isMajor = i % 100 === 0;
    const tickWidth = isMajor ? majorTickSize : minorTickSize;
    
    const tick = new fabric.Line([rulerWidth - tickWidth, i, rulerWidth, i], {
      stroke: color,
      strokeWidth: 1,
      selectable: false,
      evented: false
    });
    tickGroup.addWithUpdate(tick);
    
    if (isMajor && i > 0) {
      const label = new fabric.Text(i.toString(), {
        left: 2,
        top: i - 5,
        fontSize,
        fill: color,
        selectable: false,
        evented: false
      });
      tickGroup.addWithUpdate(label);
    }
  }
  
  return {
    horizontalRuler,
    verticalRuler,
    tickGroup
  };
};

// ==================== EXPORT/IMPORT UTILITIES ====================

/**
 * Export canvas to various formats with optimization
 */
export const exportCanvas = async (canvas, format = 'png', options = {}) => {
  const {
    quality = 1,
    multiplier = 1,
    backgroundColor = '#ffffff',
    excludeObjects = [],
    includeObjects = null
  } = options;
  
  // Temporarily hide excluded objects
  const hiddenObjects = [];
  if (excludeObjects.length > 0) {
    canvas.getObjects().forEach(obj => {
      if (excludeObjects.includes(obj.type) || obj.excludeFromExport) {
        obj.visible = false;
        hiddenObjects.push(obj);
      }
    });
  }
  
  // Show only included objects if specified
  if (includeObjects) {
    canvas.getObjects().forEach(obj => {
      if (!includeObjects.includes(obj.type)) {
        obj.visible = false;
        hiddenObjects.push(obj);
      }
    });
  }
  
  canvas.renderAll();
  
  let result;
  
  switch (format.toLowerCase()) {
    case 'png':
      result = canvas.toDataURL({
        format: 'png',
        quality,
        multiplier,
        backgroundColor
      });
      break;
      
    case 'jpeg':
    case 'jpg':
      result = canvas.toDataURL({
        format: 'jpeg',
        quality,
        multiplier,
        backgroundColor
      });
      break;
      
    case 'svg':
      result = canvas.toSVG({
        suppressPreamble: options.suppressPreamble || false,
        width: canvas.getWidth(),
        height: canvas.getHeight(),
        viewBox: options.viewBox
      });
      break;
      
    case 'json':
      result = JSON.stringify(canvas.toJSON());
      break;
      
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
  
  // Restore hidden objects
  hiddenObjects.forEach(obj => {
    obj.visible = true;
  });
  canvas.renderAll();
  
  return result;
};

/**
 * Import image with automatic scaling and positioning
 */
export const importImage = (canvas, imageData, options = {}) => {
  const { fabric } = require('fabric');
  
  return new Promise((resolve, reject) => {
    fabric.Image.fromURL(imageData, (img) => {
      try {
        const {
          maxWidth = canvas.getWidth() * 0.8,
          maxHeight = canvas.getHeight() * 0.8,
          position = 'center',
          maintainAspectRatio = true
        } = options;
        
        // Calculate scaling
        let scaleX = maxWidth / img.width;
        let scaleY = maxHeight / img.height;
        
        if (maintainAspectRatio) {
          const scale = Math.min(scaleX, scaleY, 1);
          scaleX = scaleY = scale;
        }
        
        img.set({
          scaleX,
          scaleY
        });
        
        // Position the image
        switch (position) {
          case 'center':
            img.set({
              left: (canvas.getWidth() - img.width * scaleX) / 2,
              top: (canvas.getHeight() - img.height * scaleY) / 2
            });
            break;
            
          case 'top-left':
            img.set({ left: 0, top: 0 });
            break;
            
          case 'top-right':
            img.set({
              left: canvas.getWidth() - img.width * scaleX,
              top: 0
            });
            break;
            
          case 'bottom-left':
            img.set({
              left: 0,
              top: canvas.getHeight() - img.height * scaleY
            });
            break;
            
          case 'bottom-right':
            img.set({
              left: canvas.getWidth() - img.width * scaleX,
              top: canvas.getHeight() - img.height * scaleY
            });
            break;
        }
        
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
        
        resolve(img);
      } catch (error) {
        reject(error);
      }
    }, {
      crossOrigin: 'anonymous'
    });
  });
};

// ==================== COLLABORATION UTILITIES ====================

/**
 * Create collaborative cursor
 */
export const createCollaborativeCursor = (userId, position, options = {}) => {
  const { fabric } = require('fabric');
  
  const {
    color = '#ff4444',
    name = 'User',
    showName = true
  } = options;
  
  const cursor = new fabric.Circle({
    left: position.x - 5,
    top: position.y - 5,
    radius: 5,
    fill: color,
    selectable: false,
    evented: false,
    excludeFromExport: true,
    userId: userId
  });
  
  if (showName) {
    const nameLabel = new fabric.Text(name, {
      left: position.x + 10,
      top: position.y - 20,
      fontSize: 12,
      fill: color,
      backgroundColor: 'rgba(255,255,255,0.8)',
      selectable: false,
      evented: false,
      excludeFromExport: true,
      userId: userId
    });
    
    return new fabric.Group([cursor, nameLabel], {
      selectable: false,
      evented: false,
      excludeFromExport: true,
      userId: userId
    });
  }
  
  return cursor;
};

/**
 * Synchronize canvas state between users
 */
export const syncCanvasState = (canvas, state, options = {}) => {
  const {
    preserveSelection = false,
    animateChanges = false
  } = options;
  
  const currentSelection = preserveSelection ? canvas.getActiveObjects() : null;
  
  return new Promise((resolve) => {
    canvas.loadFromJSON(state, () => {
      if (preserveSelection && currentSelection) {
        canvas.setActiveObject(currentSelection[0]);
        if (currentSelection.length > 1) {
          const selection = new fabric.ActiveSelection(currentSelection, {
            canvas: canvas
          });
          canvas.setActiveObject(selection);
        }
      }
      
      if (animateChanges) {
        canvas.getObjects().forEach(obj => {
          obj.set({ opacity: 0 });
          obj.animate('opacity', 1, {
            duration: 300,
            easing: fabric.util.ease.easeOutCubic
          });
        });
      }
      
      canvas.renderAll();
      resolve();
    });
  });
};

// ==================== PERFORMANCE UTILITIES ====================

/**
 * Optimize canvas for large number of objects
 */
export const optimizeCanvas = (canvas, options = {}) => {
  const {
    renderOnAddRemove = false,
    skipOffscreen = true,
    enableRetinaScaling = false
  } = options;
  
  canvas.renderOnAddRemove = renderOnAddRemove;
  canvas.skipOffscreen = skipOffscreen;
  canvas.enableRetinaScaling = enableRetinaScaling;
  
  // Disable object caching for better performance with many objects
  canvas.getObjects().forEach(obj => {
    obj.objectCaching = false;
  });
  
  // Use requestAnimationFrame for rendering
  let renderRequested = false;
  const requestRender = () => {
    if (!renderRequested) {
      renderRequested = true;
      requestAnimationFrame(() => {
        canvas.renderAll();
        renderRequested = false;
      });
    }
  };
  
  canvas.on('path:created', requestRender);
  canvas.on('object:modified', requestRender);
  canvas.on('object:moving', requestRender);
  
  return canvas;
};

/**
 * Create object pool for better memory management
 */
export const createObjectPool = (ObjectClass, initialSize = 10) => {
  const pool = [];
  const inUse = new Set();
  
  // Pre-populate pool
  for (let i = 0; i < initialSize; i++) {
    pool.push(new ObjectClass());
  }
  
  return {
    get() {
      let obj = pool.pop();
      if (!obj) {
        obj = new ObjectClass();
      }
      inUse.add(obj);
      return obj;
    },
    
    release(obj) {
      if (inUse.has(obj)) {
        inUse.delete(obj);
        // Reset object properties
        obj.set({
          left: 0,
          top: 0,
          angle: 0,
          scaleX: 1,
          scaleY: 1,
          opacity: 1,
          visible: true
        });
        pool.push(obj);
      }
    },
    
    size() {
      return pool.length;
    },
    
    inUseCount() {
      return inUse.size;
    }
  };
};

export default {
  initializeCanvas,
  createDrawingBrush,
  createArrow,
  createMathShape,
  createMathEquation,
  createFormattedText,
  createGrid,
  createRulers,
  exportCanvas,
  importImage,
  createCollaborativeCursor,
  syncCanvasState,
  optimizeCanvas,
  createObjectPool
};