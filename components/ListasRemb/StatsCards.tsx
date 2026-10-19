import React from 'react';
import { Task } from './types';
import { PieChart, Clock, CheckCircle } from 'lucide-react';

interface StatsCardsProps {
  tasks: Task[];
}

const StatsCards: React.FC<StatsCardsProps> = ({ tasks }) => {
  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const pending = total - completed;
  const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {/* Card 1: Pending */}
      <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-start justify-between">
        <div>
          <p className="text-slate-500 text-sm font-medium mb-1">Pendientes</p>
          <h4 className="text-2xl font-bold text-slate-800">{pending}</h4>
          <p className="text-xs text-slate-400 mt-1">Tareas por hacer</p>
        </div>
        <div className="p-3 bg-orange-50 rounded-lg">
          <Clock className="w-6 h-6 text-orange-500" />
        </div>
      </div>

      {/* Card 2: Completed */}
      <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-start justify-between">
        <div>
          <p className="text-slate-500 text-sm font-medium mb-1">Completadas</p>
          <h4 className="text-2xl font-bold text-slate-800">{completed}</h4>
          <p className="text-xs text-slate-400 mt-1">Gran trabajo hoy</p>
        </div>
        <div className="p-3 bg-green-50 rounded-lg">
          <CheckCircle className="w-6 h-6 text-green-500" />
        </div>
      </div>

       {/* Card 3: Progress */}
       <div className="bg-brand-600 p-5 rounded-xl border border-brand-500 shadow-sm text-white flex flex-col justify-between relative overflow-hidden">
        <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
        
        <div className="flex items-start justify-between relative z-10">
          <div>
            <p className="text-brand-100 text-sm font-medium mb-1">Progreso Total</p>
            <h4 className="text-2xl font-bold">{progress}%</h4>
          </div>
          <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
            <PieChart className="w-5 h-5 text-white" />
          </div>
        </div>
        
        <div className="w-full bg-brand-800/50 rounded-full h-1.5 mt-4 relative z-10">
          <div 
            className="bg-white h-1.5 rounded-full transition-all duration-1000 ease-out" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default StatsCards;
