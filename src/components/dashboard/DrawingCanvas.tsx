import React, { useRef, useState, useEffect } from 'react';
import { Eraser, Pen, Trash2, CheckCircle, XCircle, Square, Circle, Minus } from 'lucide-react';

interface DrawingCanvasProps {
  onCapture: (dataUrl: string) => void;
  onCancel: () => void;
}

export default function DrawingCanvas({ onCapture, onCancel }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [mode, setMode] = useState<'draw' | 'erase' | 'rect' | 'circle' | 'line'>('draw');
  const [color, setColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [startPos, setStartPos] = useState<{ x: number, y: number } | null>(null);
  const [savedImageData, setSavedImageData] = useState<ImageData | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Fill white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getCoordinates = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return null;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    if ('touches' in event) {
      return {
        x: event.touches[0].clientX - rect.left,
        y: event.touches[0].clientY - rect.top
      };
    } else {
      return {
        x: event.nativeEvent.offsetX,
        y: event.nativeEvent.offsetY
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const coords = getCoordinates(e);
    if (!coords) return;
    
    setIsDrawing(true);
    setStartPos(coords);
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) {
      if (mode !== 'draw' && mode !== 'erase') {
        setSavedImageData(ctx.getImageData(0, 0, canvas.width, canvas.height));
      } else {
        ctx.beginPath();
        ctx.moveTo(coords.x, coords.y);
        ctx.strokeStyle = mode === 'erase' ? '#ffffff' : color;
        ctx.lineWidth = mode === 'erase' ? strokeWidth * 4 : strokeWidth;
      }
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing || !startPos) return;
    const coords = getCoordinates(e);
    if (!coords) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) {
      if (mode === 'draw' || mode === 'erase') {
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
      } else {
        if (savedImageData) {
          ctx.putImageData(savedImageData, 0, 0);
        }
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = strokeWidth;
        if (mode === 'rect') {
          ctx.rect(startPos.x, startPos.y, coords.x - startPos.x, coords.y - startPos.y);
        } else if (mode === 'circle') {
          const radius = Math.sqrt(Math.pow(coords.x - startPos.x, 2) + Math.pow(coords.y - startPos.y, 2));
          ctx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
        } else if (mode === 'line') {
          ctx.moveTo(startPos.x, startPos.y);
          ctx.lineTo(coords.x, coords.y);
        }
        ctx.stroke();
      }
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    setStartPos(null);
    setSavedImageData(null);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.closePath();
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const handleCapture = () => {
    if (canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      onCapture(dataUrl);
    }
  };

  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
          <button 
            onClick={() => setMode('draw')}
            className={`p-2 rounded-lg transition-all ${mode === 'draw' ? 'bg-white shadow-sm text-brand-600' : 'text-slate-500'}`}
          >
            <Pen className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setMode('erase')}
            className={`p-2 rounded-lg transition-all ${mode === 'erase' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}
          >
            <Eraser className="w-5 h-5" />
          </button>
          
          <div className="w-px h-6 bg-slate-300 mx-1" />
          
          <button 
            onClick={() => setMode('line')}
            className={`p-2 rounded-lg transition-all ${mode === 'line' ? 'bg-white shadow-sm text-brand-600' : 'text-slate-500'}`}
          >
            <Minus className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setMode('rect')}
            className={`p-2 rounded-lg transition-all ${mode === 'rect' ? 'bg-white shadow-sm text-brand-600' : 'text-slate-500'}`}
          >
            <Square className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setMode('circle')}
            className={`p-2 rounded-lg transition-all ${mode === 'circle' ? 'bg-white shadow-sm text-brand-600' : 'text-slate-500'}`}
          >
            <Circle className="w-5 h-5" />
          </button>

          <div className="w-px h-6 bg-slate-300 mx-1" />
          
          <input 
            type="color" 
            value={color} 
            onChange={(e) => setColor(e.target.value)}
            disabled={mode === 'erase'}
            className="w-8 h-8 rounded cursor-pointer border-0 p-0 disabled:opacity-50"
          />
        </div>
        
        <button onClick={handleClear} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Xóa toàn bộ">
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Canvas */}
      <div className="border-2 border-slate-200 border-dashed rounded-xl overflow-hidden bg-white touch-none">
        <canvas
          ref={canvasRef}
          width={600}
          height={300}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseOut={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full cursor-crosshair touch-none"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end mt-2">
        <button 
          onClick={onCancel}
          className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2"
        >
          <XCircle className="w-5 h-5" /> Hủy
        </button>
        <button 
          onClick={handleCapture}
          className="px-6 py-2 bg-brand-600 text-white font-bold rounded-lg shadow-md hover:bg-brand-700 transition-colors flex items-center gap-2"
        >
          <CheckCircle className="w-5 h-5" /> Đính kèm
        </button>
      </div>
    </div>
  );
}
