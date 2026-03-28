import React from 'react';

interface BatteryProps {
  current: number;
  max: number;
}

const Battery: React.FC<BatteryProps> = ({ current, max }) => {
  const percentage = Math.min((current / max) * 100, 100);
  
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-40 border-4 border-zinc-700 rounded-md p-1 flex flex-col justify-end overflow-hidden bg-zinc-900/50">
        {/* Battery Tip */}
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-2 bg-zinc-700 rounded-t-sm"></div>
        
        {/* Fill Level */}
        <div 
          className="w-full bg-yellow-400 transition-all duration-500 ease-out rounded-sm shadow-[0_0_15px_rgba(250,204,21,0.4)]"
          style={{ height: `${percentage}%` }}
        ></div>
        
        {/* Percentage Text Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
          <span className="text-sm font-bold text-white drop-shadow-md">
            {Math.round(percentage)}%
          </span>
          <span className="text-[10px] text-white/70 uppercase font-bold tracking-tighter">Kcal</span>
        </div>
      </div>
    </div>
  );
};

export default Battery;
