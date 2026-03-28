import React from 'react';
import { motion } from 'motion/react';

interface WaterBottleProps {
  current: number;
  max: number;
}

const WaterBottle: React.FC<WaterBottleProps> = ({ current, max }) => {
  const percentage = Math.min((current / max) * 100, 100);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-40 bg-zinc-800 rounded-b-2xl border-4 border-zinc-700 overflow-hidden">
        <motion.div 
          className="absolute bottom-0 left-0 w-full bg-blue-500"
          initial={{ height: 0 }}
          animate={{ height: `${percentage}%` }}
          transition={{ duration: 0.5 }}
        />
        <div className="absolute inset-0 flex items-center justify-center font-bold text-white z-10">
          {current} / {max} L
        </div>
      </div>
    </div>
  );
};

export default WaterBottle;
