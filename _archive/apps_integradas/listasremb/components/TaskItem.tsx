import React, { useState } from 'react';
import { Check, Trash2, Calendar as CalendarIcon, GripVertical, Edit2 } from 'lucide-react';
import { Task } from '../types';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '../constants';

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, task: Task) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>, targetTask: Task, position: 'top' | 'bottom') => void;
  onDateChange: (id: string, date: string) => void;
  onEdit: (task: Task) => void;
  customColor?: string;
  showNotes?: boolean;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, onToggle, onDelete, onDragStart, onDrop, onDateChange, onEdit, customColor, showNotes }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [dropPosition, setDropPosition] = useState<'top' | 'bottom' | null>(null);

  // Fallback for dynamic categories
  const Icon = CATEGORY_ICONS[task.category] || CATEGORY_ICONS['default'];
  
  const getCategoryColor = (cat: string) => {
    if (CATEGORY_COLORS[cat]) return CATEGORY_COLORS[cat];
    const colors = [
      'bg-pink-100 text-pink-700',
      'bg-indigo-100 text-indigo-700',
      'bg-teal-100 text-teal-700',
      'bg-amber-100 text-amber-700'
    ];
    const index = cat.length % colors.length;
    return colors[index];
  };

  const categoryColorClass = getCategoryColor(task.category);

  // If customColor is provided, we calculate style object, otherwise undefined
  const badgeStyle = customColor ? {
      backgroundColor: `${customColor}20`, // 20 hex = approx 12% opacity
      color: customColor,
      borderColor: `${customColor}40`,
      borderWidth: '1px'
  } : {};

  // Progress Calculations for styling
  const progress = task.progress || 0;
  // Calculate darkness: 0.5 to 1.0 opacity on black base
  const textDarkness = 0.5 + (progress / 200);

  const handleDragStartLocal = (e: React.DragEvent<HTMLDivElement>) => {
    // CRITICAL: Stop propagation so the parent List doesn't think IT is being dragged
    e.stopPropagation();
    onDragStart(e, task);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDropPosition(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Calculate if we are in the top half or bottom half
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    
    if (e.clientY < midY) {
        setDropPosition('top');
    } else {
        setDropPosition('bottom');
    }
  };

  const handleDropLocal = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation(); // Ensure the drop happens HERE and not on the column
    if (dropPosition) {
        onDrop(e, task, dropPosition);
    }
    setDropPosition(null);
  };

  return (
    <div 
      draggable
      onDragStart={handleDragStartLocal}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDropLocal}
      className={`group relative bg-white rounded-xl border transition-all duration-200 ease-in-out cursor-grab active:cursor-grabbing
        ${task.completed ? 'border-slate-100 bg-slate-50 opacity-75' : 'border-slate-200 hover:border-brand-300 hover:shadow-md'}
        p-3 flex flex-col gap-2`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Drop Indicators */}
      {dropPosition === 'top' && (
          <div className="absolute -top-1.5 left-0 right-0 h-1.5 bg-brand-500 rounded-full z-50 pointer-events-none shadow-sm ring-2 ring-brand-100"></div>
      )}
      {dropPosition === 'bottom' && (
          <div className="absolute -bottom-1.5 left-0 right-0 h-1.5 bg-brand-500 rounded-full z-50 pointer-events-none shadow-sm ring-2 ring-brand-100"></div>
      )}

      <div className={`flex items-start gap-3 ${dropPosition ? 'opacity-50' : ''}`}>
         {/* Grip for Dragging */}
         <div className="text-slate-300 cursor-grab mt-1 hidden group-hover:block">
          <GripVertical className="w-4 h-4" />
        </div>

        {/* Checkbox */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(task.id); }}
          className={`flex-shrink-0 w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center transition-all duration-300
            ${task.completed 
              ? 'bg-brand-500 border-brand-500 scale-100' 
              : 'border-slate-300 hover:border-brand-400 bg-white'}`}
          style={task.completed && customColor ? { backgroundColor: customColor, borderColor: customColor } : {}}
        >
          <Check 
            className={`w-3 h-3 text-white transition-transform duration-300 
              ${task.completed ? 'scale-100' : 'scale-0'}`} 
            strokeWidth={3}
          />
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0" onClick={() => onEdit(task)}>
          <h3 
            className={`font-medium text-sm leading-tight mb-2 transition-all duration-300
              ${task.completed ? 'text-slate-400 line-through' : ''}`}
            style={{ color: task.completed ? undefined : `rgba(15, 23, 42, ${textDarkness})` }}
          >
            {task.title}
          </h3>
          
          <div className="flex items-center flex-wrap gap-2 text-xs">
            <span 
              className={`px-2 py-0.5 rounded-full font-medium flex items-center gap-1 text-[10px] ${!customColor ? categoryColorClass : ''}`}
              style={badgeStyle}
            >
              <Icon className="w-3 h-3" />
              {task.category}
            </span>
            
            {/* Date Display */}
            <div className="flex items-center gap-1 text-slate-500 hover:text-brand-600 transition-colors">
              <CalendarIcon className="w-3 h-3" />
              <span className="text-[10px]">{new Date(task.dueDate).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span>
            </div>
          </div>
          
           {/* Progress Bar (Visible if progress > 0 and not completed) */}
          {!task.completed && progress > 0 && (
             <div className="mt-2 w-full flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-brand-500 rounded-full transition-all duration-500" 
                        style={{ width: `${progress}%`, backgroundColor: customColor }} 
                    />
                </div>
                <span className="text-[10px] font-bold text-slate-400">{progress}%</span>
             </div>
          )}

          {/* Notes Preview */}
          {showNotes && task.notes && (
             <div className="mt-2 text-xs text-slate-400 bg-slate-50 p-2 rounded border border-slate-100 line-clamp-3 leading-relaxed">
                 {task.notes}
             </div>
          )}

        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
           <button 
            onClick={(e) => { e.stopPropagation(); onEdit(task); }}
            className="text-slate-300 hover:text-brand-500 transition-colors"
            title="Editar"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
            className="text-slate-300 hover:text-red-500 transition-colors"
            title="Eliminar tarea"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskItem;