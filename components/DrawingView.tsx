import React, { useRef, useEffect, useState, useCallback, useLayoutEffect } from 'react';
import { Plan } from '../types';
import { SaveIcon, BackIcon, TrashIcon, SparklesIcon } from './icons';

interface DrawingViewProps {
  onSave: (plan: Omit<Plan, 'id' | 'createdAt'>) => void;
  onBack: () => void;
}

const COLORS = ["#111827", "#ef4444", "#3b82f6", "#22c55e", "#f97316", "#eab308", "#a855f7"];

const DrawingView: React.FC<DrawingViewProps> = ({ onSave, onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [title, setTitle] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [brushSize, setBrushSize] = useState(5);

  // This effect handles setting up the canvas and resizing. It runs only once on mount.
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    contextRef.current = context;

    const handleResize = () => {
      const scale = window.devicePixelRatio;
      const rect = canvas.getBoundingClientRect();

      canvas.width = rect.width * scale;
      canvas.height = rect.height * scale;

      context.scale(scale, scale);
      
      // Properties are reset on resize, so we re-apply them.
      context.lineCap = 'round';
      context.strokeStyle = color;
      context.lineWidth = brushSize;
    };

    handleResize(); // Initial setup

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []); // Run only once

  // This effect updates the context when color or brush size changes, without resizing.
  useEffect(() => {
    if (contextRef.current) {
      contextRef.current.strokeStyle = color;
      contextRef.current.lineWidth = brushSize;
    }
  }, [color, brushSize]);

  const getEventPosition = useCallback((event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;

    if ('touches' in event.nativeEvent) {
      if (event.nativeEvent.touches.length === 0) return null;
      clientX = event.nativeEvent.touches[0].clientX;
      clientY = event.nativeEvent.touches[0].clientY;
    } else {
      clientX = (event as React.MouseEvent).nativeEvent.clientX;
      clientY = (event as React.MouseEvent).nativeEvent.clientY;
    }
    
    // The returned coordinates are in CSS pixels, which is correct because the context is scaled.
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }, []);

  const startDrawing = useCallback((event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const context = contextRef.current;
    if (!context) return;
    
    const pos = getEventPosition(event);
    if (!pos) return;

    context.beginPath();
    context.moveTo(pos.x, pos.y);
    setIsDrawing(true);
  }, [getEventPosition]);

  const finishDrawing = useCallback(() => {
    if (!contextRef.current) return;
    contextRef.current.closePath();
    setIsDrawing(false);
  }, []);

  const draw = useCallback((event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !contextRef.current) return;

    // Prevent scrolling on touch devices while drawing
    if (event.cancelable) event.preventDefault();

    const pos = getEventPosition(event);
    if (!pos) return;
    
    contextRef.current.lineTo(pos.x, pos.y);
    contextRef.current.stroke();
  }, [isDrawing, getEventPosition]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (canvas && context) {
      // The coordinate system is scaled, so we clear using the CSS dimensions.
      context.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
    }
  };

  const handleSave = () => {
    if (!title.trim()) {
      alert('홍보 계획의 제목을 입력해주세요!');
      return;
    }
    const canvas = canvasRef.current;
    if (canvas) {
      const image = canvas.toDataURL('image/png');
      onSave({ type: 'drawing', title, content: image });
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-amber-200">
      <h2 className="text-2xl font-bold text-center text-emerald-700 mb-4">그림으로 홍보 계획 세우기</h2>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="홍보 계획 제목 (예: 경복궁 야간개장 포스터)"
        className="w-full p-3 mb-4 border-2 border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
      />
      <div className="flex flex-col md:flex-row gap-4 items-start">
        <div className="w-full md:w-auto flex md:flex-col items-center gap-4 bg-gray-100 p-4 rounded-lg">
          <div className="flex flex-row md:flex-col gap-2">
            {COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)} className={`w-8 h-8 rounded-full transition-transform transform hover:scale-110 ${color === c ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`} style={{backgroundColor: c}} />
            ))}
          </div>
           <div className="flex items-center gap-2">
            <label htmlFor="brushSize" className="text-sm font-medium">굵기:</label>
            <input type="range" id="brushSize" min="1" max="50" value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} className="w-24"/>
          </div>
          <button onClick={() => setColor('#FFFFFF')} className="p-2 bg-white rounded-lg border-2 border-gray-300 hover:bg-gray-200 transition">
             <SparklesIcon /> <span className="hidden md:inline">지우개</span>
          </button>
          <button onClick={clearCanvas} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition">
            <TrashIcon /> <span className="hidden md:inline">모두 지우기</span>
          </button>
        </div>
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseUp={finishDrawing}
          onMouseMove={draw}
          onMouseLeave={finishDrawing}
          onTouchStart={startDrawing}
          onTouchEnd={finishDrawing}
          onTouchMove={draw}
          className="w-full h-96 md:h-[500px] bg-white rounded-lg shadow-inner border-2 border-gray-200 cursor-crosshair touch-none"
        />
      </div>
      <div className="mt-6 flex justify-between">
        <button onClick={onBack} className="flex items-center px-6 py-2 bg-gray-200 text-gray-800 font-semibold rounded-full hover:bg-gray-300 transition-all duration-300">
          <BackIcon />
          <span className="ml-2">뒤로가기</span>
        </button>
        <button onClick={handleSave} className="flex items-center px-6 py-2 bg-green-500 text-white font-semibold rounded-full hover:bg-green-600 transition-all duration-300 transform hover:scale-105 shadow-md">
          <SaveIcon />
          <span className="ml-2">저장하기</span>
        </button>
      </div>
    </div>
  );
};

export default DrawingView;