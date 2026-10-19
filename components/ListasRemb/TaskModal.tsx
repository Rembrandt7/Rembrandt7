import React, { useState, useEffect, useRef } from 'react';
import { X, Calendar, Save, Trash2, Tag, Percent, AlignLeft, Sun, Sunrise, CalendarClock } from 'lucide-react';
import { Task } from './types';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onSave: (updatedTask: Task) => void;
  onDelete: (id: string) => void;
  lists: string[];
}

const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, task, onSave, onDelete, lists }) => {
  const [editedTask, setEditedTask] = useState<Task | null>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    setEditedTask(task);
  }, [task]);

  if (!isOpen || !editedTask) return null;

  const handleChange = (field: keyof Task, value: any) => {
    setEditedTask(prev => prev ? { ...prev, [field]: value } : null);
  };

  const getInputValue = (isoDateString: string) => {
      if (!isoDateString) return '';
      const date = new Date(isoDateString);
      if (isNaN(date.getTime())) return '';
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      if (!val) return;
      const [year, month, day] = val.split('-').map(Number);
      const newDate = new Date(year, month - 1, day, 12, 0, 0);
      handleChange('dueDate', newDate.toISOString());
  };

  const handleInputClick = (e: React.MouseEvent<HTMLInputElement>) => {
    try {
      if (typeof e.currentTarget.showPicker === 'function') {
        e.currentTarget.showPicker();
      }
    } catch {
      // Fallback relies on native behavior
    }
  };

  const setQuickDate = (type: 'today' | 'tomorrow' | 'next-week') => {
      const d = new Date();
      d.setHours(12, 0, 0, 0);

      if (type === 'tomorrow') {
          d.setDate(d.getDate() + 1);
      } else if (type === 'next-week') {
          const day = d.getDay();
          const diff = d.getDate() - day + (day === 0 ? -6 : 1) + 7; 
          d.setDate(diff);
      }
      
      handleChange('dueDate', d.toISOString());
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
           <div className="flex items-center gap-2 w-full mr-4">
             <input 
               type="text" 
               value={editedTask.title} 
               onChange={(e) => handleChange('title', e.target.value)}
               className="text-xl font-bold text-slate-800 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-brand-100 rounded px-2 w-full"
               placeholder="Título de la tarea"
             />
           </div>
           <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 flex-shrink-0">
             <X className="w-6 h-6" />
           </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category Select */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Tag className="w-3 h-3" /> Lista
              </label>
              <select 
                value={editedTask.category}
                onChange={(e) => handleChange('category', e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-brand-500 shadow-sm"
              >
                {lists.map(list => (
                  <option key={list} value={list}>{list}</option>
                ))}
              </select>
            </div>

            {/* Date Select */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Fecha Sugerida
              </label>
              
              <div className="relative group">
                <input 
                  ref={dateInputRef}
                  type="date"
                  value={getInputValue(editedTask.dueDate)}
                  onChange={handleDateChange}
                  onClick={handleInputClick}
                  className="w-full p-2.5 pl-10 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-brand-500 shadow-sm cursor-pointer hover:border-brand-300 transition-colors"
                />
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-500 pointer-events-none" />
              </div>

              <div className="flex gap-2 mt-2 overflow-x-auto pb-1 no-scrollbar">
                  <button 
                    onClick={() => setQuickDate('today')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-700 border border-orange-100 rounded-full text-xs font-medium hover:bg-orange-100 transition-colors whitespace-nowrap"
                  >
                      <Sun className="w-3 h-3" /> Hoy
                  </button>
                  <button 
                    onClick={() => setQuickDate('tomorrow')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-full text-xs font-medium hover:bg-blue-100 transition-colors whitespace-nowrap"
                  >
                      <Sunrise className="w-3 h-3" /> Mañana
                  </button>
                  <button 
                    onClick={() => setQuickDate('next-week')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-100 rounded-full text-xs font-medium hover:bg-purple-100 transition-colors whitespace-nowrap"
                  >
                      <CalendarClock className="w-3 h-3" /> Próx. Semana
                  </button>
              </div>
            </div>
          </div>

          {/* Progress Slider */}
          <div className="space-y-2 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
             <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Percent className="w-3 h-3" /> Progreso
                </label>
                <span className={`text-sm font-bold ${
                  (editedTask.progress || 0) === 100 ? 'text-green-600' : 'text-brand-600'
                }`}>
                  {editedTask.progress || 0}%
                </span>
             </div>
             <input 
               type="range" 
               min="0" 
               max="100" 
               step="5"
               value={editedTask.progress || 0} 
               onChange={(e) => handleChange('progress', parseInt(e.target.value))}
               className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-brand-600"
             />
             <div className="flex justify-between text-[10px] text-slate-400 font-medium px-1">
               <span>0%</span>
               <span>50%</span>
               <span>100%</span>
             </div>
          </div>

          {/* Notes */}
          <div className="space-y-2 h-full">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <AlignLeft className="w-3 h-3" /> Notas y Detalles
            </label>
            <textarea 
              value={editedTask.notes || ''}
              onChange={(e) => handleChange('notes', e.target.value)}
              className="w-full h-40 p-4 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-50 resize-none leading-relaxed shadow-sm"
              placeholder="Escribe aquí los detalles, ideas o subtareas..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-white flex justify-between items-center shrink-0">
           <button 
             onClick={() => { onDelete(editedTask.id); onClose(); }}
             className="flex items-center gap-2 px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors"
           >
             <Trash2 className="w-4 h-4" /> Eliminar
           </button>
           <div className="flex gap-3">
             <button onClick={onClose} className="px-4 py-2 text-slate-500 hover:text-slate-700 text-sm font-medium">
               Cancelar
             </button>
             <button 
               onClick={() => { onSave(editedTask); onClose(); }}
               className="flex items-center gap-2 px-6 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium shadow-lg shadow-brand-200 transition-all"
             >
               <Save className="w-4 h-4" /> Guardar Cambios
             </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default TaskModal;
