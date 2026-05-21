import React from 'react';

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, children, isOpen, onToggle }) => {
  return (
    <div className="bg-gray-900/50 rounded-lg border border-gray-700/50">
      <button
        onClick={onToggle}
        className="w-full flex justify-between items-center text-left text-lg font-semibold text-gray-200 p-4 hover:bg-gray-800/50 rounded-t-lg transition-colors"
        aria-expanded={isOpen}
      >
        <span>{title}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-5 w-5 transform transition-transform duration-200 ${isOpen ? '' : '-rotate-90'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="p-4 border-t border-gray-700/50 space-y-4 animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );
};

export default CollapsibleSection;
