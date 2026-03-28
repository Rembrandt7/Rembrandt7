
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Bell, Sparkles, Brain } from 'lucide-react';
import { AppNotification } from '../types';

interface NotificationOverlayProps {
  notifications: AppNotification[];
  onClose: (id: string) => void;
}

const NotificationOverlay: React.FC<NotificationOverlayProps> = ({ notifications, onClose }) => {
  const unreadNotifications = notifications.filter(n => !n.isRead);

  if (unreadNotifications.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none flex flex-col items-center justify-center p-4 gap-4">
      <AnimatePresence>
        {unreadNotifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            className="pointer-events-auto w-full max-w-md bg-gray-900/95 backdrop-blur-xl border border-purple-500/50 rounded-2xl shadow-2xl shadow-purple-500/20 overflow-hidden"
          >
            <div className="p-1 bg-gradient-to-r from-purple-600 to-blue-600" />
            
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-600/20 rounded-lg">
                    {notification.type === 'ai_advice' ? (
                      <Brain className="text-purple-400" size={24} />
                    ) : (
                      <Bell className="text-blue-400" size={24} />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white leading-tight">
                      {notification.title}
                    </h3>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">
                      {notification.type === 'ai_advice' ? 'Consejo del Estratega' : 'Alerta de Calendario'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => onClose(notification.id)}
                  className="p-2 hover:bg-gray-800 rounded-xl text-gray-500 hover:text-white transition-colors border border-transparent hover:border-gray-700"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                <p className="text-gray-200 text-sm leading-relaxed font-medium italic">
                  "{notification.content}"
                </p>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => onClose(notification.id)}
                  className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-purple-600/20 flex items-center gap-2"
                >
                  <Sparkles size={16} />
                  Entendido, Rembrandt
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default NotificationOverlay;
