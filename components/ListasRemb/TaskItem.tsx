import React, { useState } from 'react';
import { Check, Trash2, Calendar as CalendarIcon, GripVertical, Edit2 } from 'lucide-react';
import { Task } from './types';
import { CATEGORY_COLORS, CATEGORY_ICONS } from './constants';

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

const TaskItem: React.FC<TaskItemProps> = ({ task, onToggle, onDelete, onDragStart, onDrop, onEdit, customColor, showNotes }) => {
  const [, setIsHovered] = useState(false);
  const [dropPosition, setDropPosition] = useState<'top' | 'bottom' | null>(null);

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

  const badgeStyle = customColor ? {
      backgroundColor: `${customColor}20`,
      color: customColor,
      borderColor: `${customColor}40`,
      borderWidth: '1px'
  } : {};

  const progress = task.progress || 0;
  const textDarkness = 0.5 + (progress / 200);

  const handleDragStartLocal = (e: React.DragEvent<HTMLDivElement>) => {
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
    e.stopPropagation();
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
      className={`group relative rounded-xl border transition-all duration-200 ease-in-out cursor-grab active:cursor-grabbing
        ${task.completed ? 'border-slate-800/80 bg-slate-900/60 opacity-60' : 'bg-slate-800/90 border-slate-700/80 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-950/20'}
        p-3 flex flex-col gap-2`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Drop Indicators */}
      {dropPosition === 'top' && (
          <div className="absolute -top-1.5 left-0 right-0 h-1.5 bg-purple-500 rounded-full z-50 pointer-events-none shadow-sm ring-2 ring-purple-900"></div>
      )}
      {dropPosition === 'bottom' && (
          <div className="absolute -bottom-1.5 left-0 right-0 h-1.5 bg-purple-500 rounded-full z-50 pointer-events-none shadow-sm ring-2 ring-purple-900"></div>
      )}

      <div className={`flex items-start gap-3 ${dropPosition ? 'opacity-50' : ''}`}>
         {/* Grip for Dragging */}
         <div className="text-slate-500 cursor-grab mt-1 hidden group-hover:block">
          <GripVertical className="w-4 h-4" />
        </div>

        {/* Checkbox */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(task.id); }}
          className={`flex-shrink-0 w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center transition-all duration-300 cursor-pointer
            ${task.completed 
              ? 'bg-purple-600 border-purple-600 scale-100' 
              : 'border-slate-600 hover:border-purple-400 bg-slate-900'}`}
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
            className={`font-semibold text-sm leading-tight mb-2 transition-all duration-300
              ${task.completed ? 'text-slate-500 line-through' : 'text-slate-100'}`}
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
            <div className="flex items-center gap-1 text-slate-400 hover:text-purple-300 transition-colors">
              <CalendarIcon className="w-3 h-3" />
              <span className="text-[10px]">{new Date(task.dueDate).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span>
            </div>

            {/* Impresión 3D Direct Links */}
            {(task.category === 'Impresión 3D' || /3d|stl|impres|filamento/i.test(task.title)) && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: '3d-print' }));
                  }}
                  className="px-2 py-0.5 rounded-full font-bold text-[9px] bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 border border-purple-500/40 inline-flex items-center gap-1 transition-colors shadow-xs cursor-pointer"
                  title="Abrir Módulo de Impresión 3D"
                >
                  <span>🖨️ Módulo 3D</span>
                </button>
                <a
                  href="https://makerworld.com/es"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="px-2 py-0.5 rounded-full font-bold text-[9px] bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/40 inline-flex items-center gap-1 transition-colors shadow-xs"
                  title="Abrir MakerWorld"
                >
                  <span>MakerWorld</span>
                </a>
              </div>
            )}
          </div>
          
           {/* Progress Bar (Visible if progress > 0 and not completed) */}
          {!task.completed && progress > 0 && (
             <div className="mt-2 w-full flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
                    <div 
                        className="h-full bg-purple-500 rounded-full transition-all duration-500" 
                        style={{ width: `${progress}%`, backgroundColor: customColor }} 
                    />
                </div>
                <span className="text-[10px] font-bold text-slate-400">{progress}%</span>
             </div>
          )}

          {/* Notes Preview */}
          {showNotes && task.notes && (
             <div className="mt-2 text-xs text-slate-300 bg-slate-900/80 p-2 rounded-lg border border-slate-700/60 line-clamp-3 leading-relaxed">
                 {task.notes}
             </div>
          )}

        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
           <button 
            onClick={(e) => { e.stopPropagation(); onEdit(task); }}
            className="text-slate-400 hover:text-purple-400 transition-colors cursor-pointer"
            title="Editar"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
            className="text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
            title="Eliminar tarea"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(TaskItem);
