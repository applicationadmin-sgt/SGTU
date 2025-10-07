const fs = require('fs');
const path = require('path');

const filePath = 'c:\\Users\\Administrator\\Desktop\\test\\Private\\deployment-sgtlms\\frontend\\src\\components\\whiteboard\\AdvancedWhiteboard.js';

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Define the new PDF upload function
const newPdfFunction = `  const handlePdfUpload = useCallback(async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    console.log('📄 Processing PDF:', file.name, 'Size:', Math.round(file.size / 1024), 'KB');
    
    // Validate file type
    if (file.type !== 'application/pdf') {
      showNotification('Please select a valid PDF file', 'error');
      return;
    }
    
    // Validate file size (20MB limit for PDFs)  
    if (file.size > 20 * 1024 * 1024) {
      showNotification('PDF file is too large. Please select a file smaller than 20MB', 'error');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // Convert PDF to image and display on whiteboard
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      console.log('📄 PDF loaded, pages:', pdf.numPages);
      setUploadProgress(30);
      
      // Get first page (can be enhanced to handle multiple pages)
      const page = await pdf.getPage(1);
      setUploadProgress(60);
      
      // Set up canvas for rendering
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      // Render PDF page to canvas
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;
      
      setUploadProgress(80);
      
      // Convert canvas to image and add to whiteboard
      const imageDataURL = canvas.toDataURL('image/png');
      
      if (fabricCanvas.current) {
        fabric.Image.fromURL(imageDataURL, (img) => {
          // Scale image to fit whiteboard nicely
          const canvasWidth = fabricCanvas.current.width;
          const canvasHeight = fabricCanvas.current.height;
          const maxWidth = canvasWidth * 0.8;
          const maxHeight = canvasHeight * 0.8;
          
          const scaleX = maxWidth / img.width;
          const scaleY = maxHeight / img.height;
          const scale = Math.min(scaleX, scaleY, 1); // Don't upscale
          
          img.set({
            left: (canvasWidth - img.width * scale) / 2,
            top: (canvasHeight - img.height * scale) / 2,
            scaleX: scale,
            scaleY: scale,
            selectable: true,
            moveable: true
          });
          
          fabricCanvas.current.add(img);
          fabricCanvas.current.renderAll();
          
          setUploadProgress(100);
          showNotification(\`📄 "\${file.name}" added to whiteboard successfully!\`, 'success');
          
          // Broadcast to other users if in collaborative mode
          if (socket && roomId) {
            const imageData = {
              type: 'pdf-image',
              data: imageDataURL,
              properties: {
                left: img.left,
                top: img.top,
                scaleX: scale,
                scaleY: scale
              },
              timestamp: Date.now()
            };
            socket.emit('canvas-data', { roomId, data: imageData });
          }
        }, {
          crossOrigin: 'anonymous'
        });
      }
      
    } catch (error) {
      console.error('❌ PDF processing failed:', error);
      showNotification('Failed to process PDF. Please try a different file or convert to image format.', 'error');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      event.target.value = '';
    }
  }, [showNotification, socket, roomId]);`;

// Find and replace the old function
const functionStart = content.indexOf('const handlePdfUpload = useCallback(async (event) => {');
if (functionStart === -1) {
  console.error('Could not find handlePdfUpload function');
  process.exit(1);
}

// Find the end of the function by counting braces
let braceCount = 0;
let inString = false;
let inTemplate = false;
let escaped = false;
let functionEnd = functionStart;
let foundStart = false;

for (let i = functionStart; i < content.length; i++) {
  const char = content[i];
  const prevChar = i > 0 ? content[i - 1] : '';
  
  if (escaped) {
    escaped = false;
    continue;
  }
  
  if (char === '\\\\') {
    escaped = true;
    continue;
  }
  
  if (char === '\`' && !inString) {
    inTemplate = !inTemplate;
    continue;
  }
  
  if (char === '"' || char === "'" && !inTemplate) {
    inString = !inString;
    continue;
  }
  
  if (inString || inTemplate) {
    continue;
  }
  
  if (char === '{') {
    braceCount++;
    foundStart = true;
  } else if (char === '}') {
    braceCount--;
    if (foundStart && braceCount === 0) {
      // Found the end of the function, look for the closing of useCallback
      let j = i + 1;
      while (j < content.length && /\\s/.test(content[j])) j++;
      if (content.substring(j, j + 2) === '},') {
        functionEnd = j + 2;
        // Look for the dependency array
        while (j < content.length && content[j] !== ']') j++;
        if (content[j] === ']') {
          j++;
          while (j < content.length && /\\s/.test(content[j])) j++;
          if (content.substring(j, j + 2) === ');') {
            functionEnd = j + 2;
          }
        }
        break;
      }
    }
  }
}

if (functionEnd === functionStart) {
  console.error('Could not find end of handlePdfUpload function');
  process.exit(1);
}

// Replace the function
const beforeFunction = content.substring(0, functionStart);
const afterFunction = content.substring(functionEnd);
const newContent = beforeFunction + newPdfFunction + afterFunction;

// Write the new content
fs.writeFileSync(filePath, newContent, 'utf8');
console.log('✅ PDF upload function has been updated successfully!');
console.log('The function now converts PDFs to images and displays them on the whiteboard.');