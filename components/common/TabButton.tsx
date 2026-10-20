
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
      whileHover={{ scale: 1.04, y: -1 }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className={cn(
        "px-4 py-2 text-xs sm:text-sm font-semibold rounded-2xl focus:outline-none transition-all duration-200 flex items-center gap-2 group relative backdrop-blur-md select-none",
        onDelete && "pr-[34px]",
        isActive 
          ? "bg-gradient-to-r from-purple-600/90 via-pink-600/85 to-indigo-600/90 text-white shadow-[0_4px_22px_rgba(168,85,247,0.45)] border border-purple-400/50 ring-1 ring-white/20"
          : "bg-white/[0.04] text-gray-300 hover:bg-white/[0.09] hover:text-white border border-white/5 hover:border-white/15 shadow-sm",
        className
      )}
    >
      {/* Active Top Specular Shimmer */}
      {isActive && (
        <span className="absolute inset-x-2 -top-px h-[2px] bg-gradient-to-r from-transparent via-white/80 to-transparent rounded-full pointer-events-none" />
      )}

      {icon && <span className={cn("w-4 h-4 transition-transform group-hover:scale-110", isActive ? "text-white" : "text-gray-400 group-hover:text-purple-300")}>{icon}</span>}
      <span className="tracking-wide">{label}</span>

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

export default React.memo(TabButton);
