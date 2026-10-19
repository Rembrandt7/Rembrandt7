import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, Calendar as CalIcon, Plus, Clock } from 'lucide-react';
import { Task } from './types';

interface FloatingCalendarProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  onAddTask: (title: string, date: string) => void;
  onEditTask: (task: Task) => void;
}

const FloatingCalendar: React.FC<FloatingCalendarProps> = ({ isOpen, onClose, tasks, onAddTask, onEditTask }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  const [position, setPosition] = useState({ x: Math.max(20, window.innerWidth - 350), y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  if (!isOpen) return null;

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  
  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const getTasksForDate = (date: Date) => {
    return tasks.filter(t => {
      const d = new Date(t.dueDate);
      return d.getDate() === date.getDate() && d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear();
    });
  };

  const handleDateClick = (day: number) => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDate(newDate);
  };

  const handleQuickAddInAgenda = (e: React.FormEvent) => {
    e.preventDefault();
    const input = (e.target as HTMLFormElement).elements.namedItem('agendaTask') as HTMLInputElement;
    if (input.value.trim() && selectedDate) {
      onAddTask(input.value.trim(), selectedDate.toISOString());
      input.value = '';
    }
  };

  if (selectedDate) {
    const dailyTasks = getTasksForDate(selectedDate);
    return (
      <div 
        style={{ left: position.x, top: position.y }}
        className="fixed w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 animate-in zoom-in-95 duration-200 font-sans flex flex-col h-[500px]"
      >
        <div 
            className="bg-brand-600 p-4 rounded-t-2xl flex items-center justify-between text-white shrink-0 cursor-move select-none"
            onMouseDown={handleMouseDown}
        >
          <button onClick={() => setSelectedDate(null)} className="hover:bg-brand-500 p-1 rounded-full text-brand-100 hover:text-white flex items-center gap-1" onMouseDown={(e) => e.stopPropagation()}>
            <ChevronLeft className="w-4 h-4" /> Volver
          </button>
          <span className="font-bold text-sm">
             {selectedDate.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
          </span>
          <button onClick={onClose} className="hover:bg-brand-500 p-1 rounded-full" onMouseDown={(e) => e.stopPropagation()}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
          {dailyTasks.length > 0 ? (
            <div className="space-y-2">
              {dailyTasks.map(task => (
                <div 
                  key={task.id} 
                  onClick={() => onEditTask(task)}
                  className={`p-3 rounded-xl border bg-white shadow-sm cursor-pointer hover:border-brand-300 transition-all ${task.completed ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start gap-2">
                     <div className={`w-3 h-3 rounded-full mt-1 ${task.completed ? 'bg-green-400' : 'bg-brand-400'}`}></div>
                     <div>
                       <p className={`text-sm font-medium ${task.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>{task.title}</p>
                       <p className="text-xs text-slate-400 mt-1 flex items-center gap-1"><Clock className="w-3 h-3"/> {task.category}</p>
                     </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
               <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-2">
                 <CalIcon className="w-6 h-6 text-slate-300" />
               </div>
               <p className="text-sm">Sin planes para este día.</p>
            </div>
          )}
        </div>

        <div className="p-3 bg-white border-t border-slate-100 shrink-0">
           <form onSubmit={handleQuickAddInAgenda} className="flex items-center gap-2">
             <input name="agendaTask" type="text" placeholder="Añadir pendiente..." className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500" autoFocus />
             <button type="submit" className="p-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700"><Plus className="w-4 h-4" /></button>
           </form>
        </div>
      </div>
    );
  }

  return (
    <div 
        style={{ left: position.x, top: position.y }}
        className="fixed w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 animate-in fade-in duration-300 font-sans"
    >
      <div 
        className="bg-brand-600 p-4 rounded-t-2xl flex items-center justify-between text-white cursor-move select-none"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <CalIcon className="w-5 h-5" />
          <span className="font-bold">Calendario</span>
        </div>
        <button onClick={onClose} className="hover:bg-brand-500 p-1 rounded-full" onMouseDown={(e) => e.stopPropagation()}>
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <button onClick={prevMonth} className="p-1 hover:bg-slate-100 rounded-full"><ChevronLeft className="w-5 h-5 text-slate-600" /></button>
          <span className="font-semibold text-slate-800">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
          <button onClick={nextMonth} className="p-1 hover:bg-slate-100 rounded-full"><ChevronRight className="w-5 h-5 text-slate-600" /></button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2 text-slate-400 font-medium">
          <div>D</div><div>L</div><div>M</div><div>M</div><div>J</div><div>V</div><div>S</div>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
            const dayTasks = getTasksForDate(dateObj);
            const hasTasks = dayTasks.length > 0;
            const isToday = new Date().toDateString() === dateObj.toDateString();

            return (
              <button 
                key={day} 
                onClick={() => handleDateClick(day)}
                className={`h-10 rounded-lg flex flex-col items-center justify-center relative border transition-colors
                  ${isToday ? 'border-brand-500 bg-brand-50 font-bold text-brand-700' : 'border-transparent hover:bg-slate-100 text-slate-700'}`}
              >
                <span>{day}</span>
                {hasTasks && (
                  <div className="flex gap-0.5 mt-0.5">
                    {dayTasks.slice(0, 3).map((_, idx) => (
                      <div key={idx} className={`w-1 h-1 rounded-full ${dayTasks[idx].completed ? 'bg-green-400' : 'bg-orange-400'}`}></div>
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
        
        <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500 flex justify-between">
           <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-400"></div> Pendiente</div>
           <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-400"></div> Completado</div>
        </div>
      </div>
    </div>
  );
};

export default FloatingCalendar;
