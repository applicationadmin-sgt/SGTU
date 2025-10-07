import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { 
  Pen, 
  Eraser, 
  Square, 
  Circle, 
  Type, 
  Undo, 
  Redo, 
  Trash2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface InteractiveWhiteboardProps {
  isTeacher?: boolean;
}

interface DrawingTool {
  type: 'pen' | 'eraser' | 'rectangle' | 'circle' | 'text';
  color: string;
  size: number;
}

export function InteractiveWhiteboard({ isTeacher = true }: InteractiveWhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState<DrawingTool>({
    type: 'pen',
    color: '#000000',
    size: 2
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(3);

  const colors = ['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];
  const sizes = [1, 2, 4, 8];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Initialize canvas
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add some mock content for demonstration
    if (isTeacher) {
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.font = '24px Arial';
      ctx.fillStyle = '#000000';
      ctx.fillText('React Hooks', 50, 50);
      
      ctx.beginPath();
      ctx.moveTo(50, 80);
      ctx.lineTo(200, 80);
      ctx.stroke();
      
      ctx.fillText('• useState', 70, 120);
      ctx.fillText('• useEffect', 70, 150);
      ctx.fillText('• useContext', 70, 180);
    }
  }, [currentPage, isTeacher]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isTeacher) return; // Students can't draw unless allowed
    
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isTeacher) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (currentTool.type === 'pen') {
      ctx.strokeStyle = currentTool.color;
      ctx.lineWidth = currentTool.size;
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (currentTool.type === 'eraser') {
      ctx.clearRect(x - currentTool.size, y - currentTool.size, currentTool.size * 2, currentTool.size * 2);
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  if (!isTeacher) {
    return (
      <div className="w-full h-full relative">
        <canvas
          ref={canvasRef}
          width={800}
          height={400}
          className="border rounded-lg cursor-default w-full h-full"
        />
        
        {/* Page Navigation */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-white rounded-lg shadow-lg px-4 py-2">
          <Button variant="ghost" size="sm" disabled>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">Page {currentPage} of {totalPages}</span>
          <Button variant="ghost" size="sm" disabled>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 border-b bg-muted/30 rounded-t-lg">
        {/* Drawing Tools */}
        <div className="flex items-center gap-1">
          <Button
            variant={currentTool.type === 'pen' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setCurrentTool({ ...currentTool, type: 'pen' })}
          >
            <Pen className="h-4 w-4" />
          </Button>
          <Button
            variant={currentTool.type === 'eraser' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setCurrentTool({ ...currentTool, type: 'eraser' })}
          >
            <Eraser className="h-4 w-4" />
          </Button>
          <Button
            variant={currentTool.type === 'rectangle' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setCurrentTool({ ...currentTool, type: 'rectangle' })}
          >
            <Square className="h-4 w-4" />
          </Button>
          <Button
            variant={currentTool.type === 'circle' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setCurrentTool({ ...currentTool, type: 'circle' })}
          >
            <Circle className="h-4 w-4" />
          </Button>
          <Button
            variant={currentTool.type === 'text' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setCurrentTool({ ...currentTool, type: 'text' })}
          >
            <Type className="h-4 w-4" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Colors */}
        <div className="flex items-center gap-1">
          {colors.map((color) => (
            <button
              key={color}
              className={`w-6 h-6 rounded border-2 ${
                currentTool.color === color ? 'border-gray-800' : 'border-gray-300'
              }`}
              style={{ backgroundColor: color }}
              onClick={() => setCurrentTool({ ...currentTool, color })}
            />
          ))}
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Sizes */}
        <div className="flex items-center gap-1">
          {sizes.map((size) => (
            <Button
              key={size}
              variant={currentTool.size === size ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentTool({ ...currentTool, size })}
            >
              {size}px
            </Button>
          ))}
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm">
            <Undo className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Redo className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={clearCanvas}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1" />

        {/* Page Navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">Page {currentPage} of {totalPages}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (currentPage === totalPages) {
                setTotalPages(totalPages + 1);
              }
              setCurrentPage(currentPage + 1);
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        <canvas
          ref={canvasRef}
          width={800}
          height={400}
          className="border-0 cursor-crosshair w-full h-full"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        />
      </div>
    </div>
  );
}