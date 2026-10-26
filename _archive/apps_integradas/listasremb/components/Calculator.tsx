import React, { useState, useEffect } from 'react';
import { X, Calculator as CalcIcon } from 'lucide-react';

interface CalculatorProps {
  onClose: () => void;
}

const Calculator: React.FC<CalculatorProps> = ({ onClose }) => {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  
  // Dragging State
  const [position, setPosition] = useState({ x: 20, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const handleNum = (num: string) => {
    setDisplay(display === '0' ? num : display + num);
  };

  const handleOp = (op: string) => {
    setEquation(display + ' ' + op + ' ');
    setDisplay('0');
  };

  const handleEqual = () => {
    try {
      const result = eval(equation + display);
      setDisplay(String(result));
      setEquation('');
    } catch (e) {
      setDisplay('Error');
    }
  };

  const handleClear = () => {
    setDisplay('0');
    setEquation('');
  };

  const btns = [
    { label: 'C', onClick: handleClear, cls: 'bg-red-50 text-red-600' },
    { label: '/', onClick: () => handleOp('/'), cls: 'bg-brand-50 text-brand-600' },
    { label: '*', onClick: () => handleOp('*'), cls: 'bg-brand-50 text-brand-600' },
    { label: '-', onClick: () => handleOp('-'), cls: 'bg-brand-50 text-brand-600' },
    { label: '7', onClick: () => handleNum('7'), cls: 'bg-white hover:bg-slate-50' },
    { label: '8', onClick: () => handleNum('8'), cls: 'bg-white hover:bg-slate-50' },
    { label: '9', onClick: () => handleNum('9'), cls: 'bg-white hover:bg-slate-50' },
    { label: '+', onClick: () => handleOp('+'), cls: 'bg-brand-50 text-brand-600' },
    { label: '4', onClick: () => handleNum('4'), cls: 'bg-white hover:bg-slate-50' },
    { label: '5', onClick: () => handleNum('5'), cls: 'bg-white hover:bg-slate-50' },
    { label: '6', onClick: () => handleNum('6'), cls: 'bg-white hover:bg-slate-50' },
    { label: '=', onClick: handleEqual, cls: 'bg-brand-600 text-white row-span-2' },
    { label: '1', onClick: () => handleNum('1'), cls: 'bg-white hover:bg-slate-50' },
    { label: '2', onClick: () => handleNum('2'), cls: 'bg-white hover:bg-slate-50' },
    { label: '3', onClick: () => handleNum('3'), cls: 'bg-white hover:bg-slate-50' },
    { label: '0', onClick: () => handleNum('0'), cls: 'bg-white hover:bg-slate-50 col-span-2' },
    { label: '.', onClick: () => handleNum('.'), cls: 'bg-white hover:bg-slate-50' },
  ];

  return (
    <div 
        style={{ left: position.x, top: position.y }}
        className="fixed w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 animate-in fade-in duration-300 overflow-hidden"
    >
      <div 
        className="bg-slate-800 p-3 flex items-center justify-between text-white cursor-move select-none"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <CalcIcon className="w-4 h-4" />
          <span className="font-bold text-sm">Calculadora</span>
        </div>
        <button onClick={onClose} className="hover:bg-slate-700 p-1 rounded-full" onMouseDown={(e) => e.stopPropagation()}>
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-4 bg-slate-100">
        <div className="bg-white p-3 rounded-lg text-right mb-3 shadow-inner h-16 flex flex-col justify-center">
            <span className="text-xs text-slate-400 h-4">{equation}</span>
            <span className="text-2xl font-mono text-slate-800 truncate">{display}</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {btns.map((btn, i) => (
            <button 
              key={i} 
              onClick={btn.onClick}
              className={`h-10 rounded-lg text-sm font-bold shadow-sm active:scale-95 transition-all ${btn.cls} ${btn.label === '=' ? 'h-full' : ''}`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Calculator;