import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { Toast } from '../types';

interface ToastContainerProps {
  toasts: Toast[];
  removeToast: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: Toast; onRemove: () => void }> = ({ toast, onRemove }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onRemove]);

  const styles = {
    success: 'bg-zinc-900 border-green-500/30 text-green-400',
    error: 'bg-zinc-900 border-red-500/30 text-red-400',
    info: 'bg-zinc-900 border-indigo-500/30 text-indigo-400',
  };

  const icons = {
    success: <CheckCircle size={18} />,
    error: <AlertCircle size={18} />,
    info: <Info size={18} />,
  };

  return (
    <div className={`
      pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg border shadow-xl backdrop-blur-md 
      animate-in slide-in-from-right-10 fade-in duration-300 max-w-sm
      ${styles[toast.type]}
    `}>
      <div className="shrink-0">
        {icons[toast.type]}
      </div>
      <p className="text-sm font-medium text-zinc-200">{toast.message}</p>
      <button 
        onClick={onRemove}
        className="ml-auto p-1 hover:bg-white/10 rounded-full transition-colors"
      >
        <X size={14} className="text-zinc-500" />
      </button>
    </div>
  );
};

export default ToastContainer;