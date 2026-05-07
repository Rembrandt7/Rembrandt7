
import React from 'react';
import { X } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../utils/cn';

interface TabButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  className?: string;
  icon?: React.ReactNode;
  onDelete?: () => void;
}

const TabButton: React.FC<TabButtonProps> = ({ label, isActive, onClick, className, icon, onDelete }) => {
  return (
    <motion.button
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        "px-4 py-2 text-sm md:text-base font-medium rounded-xl focus:outline-none transition-all duration-300 flex items-center gap-2 group relative backdrop-blur-md",
        onDelete && "pr-[34px]",
        isActive 
          ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-[0_4px_20px_rgba(147,51,234,0.4)] border border-purple-400/30"
          : "bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white border border-white/5 shadow-sm",
        className
      )}
    >
      {icon && <span className="w-4 h-4">{icon}</span>}
      {label}
      {onDelete && (
        <span 
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:text-white hover:bg-red-500/80 opacity-0 group-hover:opacity-100 transition-all"
        >
          <X size={14} />
        </span>
      )}
    </motion.button>
  );
};

export default TabButton;
