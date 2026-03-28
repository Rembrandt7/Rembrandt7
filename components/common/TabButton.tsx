
import React from 'react';
import { X } from 'lucide-react';
import { motion } from 'motion/react';

interface TabButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  className?: string;
  icon?: React.ReactNode;
  onDelete?: () => void;
}

const TabButton: React.FC<TabButtonProps> = ({ label, isActive, onClick, className, icon, onDelete }) => {
  const baseClasses =
    `px-4 py-2 text-sm md:text-base font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all duration-200 flex items-center gap-2 group relative ${onDelete ? 'pr-8' : ''}`;
  
  // Default styles
  const activeClasses = 'bg-purple-600 text-white shadow-lg';
  const inactiveClasses = 'bg-gray-700 text-gray-300 hover:bg-gray-600';

  // If a custom className is provided, use it. Otherwise, toggle between active/inactive.
  // We apply baseClasses regardless.
  const appliedClasses = className 
    ? className 
    : (isActive ? activeClasses : inactiveClasses);

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`${baseClasses} ${appliedClasses}`}
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
