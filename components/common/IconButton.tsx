
import React from 'react';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  tooltip?: string;
  isActive?: boolean;
}

const IconButton: React.FC<IconButtonProps> = ({ children, tooltip, isActive = false, ...props }) => {
  const activeClasses = 'bg-purple-600 text-white';
  const inactiveClasses = 'bg-gray-700 text-gray-300 hover:bg-gray-600';

  return (
    <div className="relative group">
      <button
        {...props}
        className={`p-2 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 ${isActive ? activeClasses : inactiveClasses} ${props.className}`}
      >
        {children}
      </button>
      {tooltip && (
        <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-max px-2 py-1 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          {tooltip}
        </span>
      )}
    </div>
  );
};

export default IconButton;
