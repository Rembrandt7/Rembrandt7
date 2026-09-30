import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PanchoRobotAvatar, PanchoState } from './PanchoRobotAvatar';

interface PanchoFloatingButtonProps {
  activeTabId: string;
  panchoState: PanchoState;
  isOpen: boolean;
  onClick: () => void;
  statusMessage?: string;
  leftSidebarOpen?: boolean;
}

export const getPanchoRole = (activeTabId: string): { title: string; subtitle: string; icon: string; color: string } => {
  switch (activeTabId) {
    case 'calendar':
      return {
        title: 'Pancho Estratega',
        subtitle: 'Agenda, Rutina & Notas',
        icon: '📅',
        color: 'from-blue-500 to-indigo-600',
      };
    case 'useful-tools':
      return {
        title: 'Pancho Herramientas',
        subtitle: 'Examinar, Añadir & Editar',
        icon: '🛠️',
        color: 'from-amber-500 to-orange-600',
      };
    case 'email-gen':
      return {
        title: 'Pancho Redactor',
        subtitle: 'Platicar & Redactar Correos',
        icon: '✉️',
        color: 'from-rose-500 to-pink-600',
      };
    case '3d-print':
      return {
        title: 'Pancho 3D Maker',
        subtitle: 'Piezas, Filamentos & Costos',
        icon: '🧊',
        color: 'from-cyan-500 to-teal-600',
      };
    case 'personal':
    case 'finanzas':
    case 'nutricion':
    case 'boveda':
      return {
        title: 'Pancho Coach Personal',
        subtitle: 'Nutrición & Finanzas',
        icon: '🥗',
        color: 'from-emerald-500 to-green-600',
      };
    default:
      return {
        title: 'Pancho IA',
        subtitle: 'Asistente Rembrandt',
        icon: '🐶',
        color: 'from-purple-500 to-pink-600',
      };
  }
};

export const PanchoFloatingButton: React.FC<PanchoFloatingButtonProps> = ({
  activeTabId,
  panchoState,
  isOpen,
  onClick,
  statusMessage,
  leftSidebarOpen = true,
}) => {
  const role = getPanchoRole(activeTabId);

  // Aura glow style based on state
  const getGlowShadow = () => {
    switch (panchoState) {
      case 'working':
        return '0 0 25px rgba(245, 158, 11, 0.75), 0 0 50px rgba(245, 158, 11, 0.35)';
      case 'success':
        return '0 0 25px rgba(16, 185, 129, 0.8), 0 0 50px rgba(16, 185, 129, 0.4)';
      case 'error':
        return '0 0 25px rgba(239, 68, 68, 0.75), 0 0 50px rgba(239, 68, 68, 0.35)';
      case 'attention':
        return '0 0 25px rgba(217, 70, 239, 0.8), 0 0 50px rgba(56, 189, 248, 0.5)';
      case 'idle':
      default:
        return '0 0 20px rgba(147, 51, 234, 0.5), 0 4px 20px rgba(0, 0, 0, 0.6)';
    }
  };

  const getBorderColor = () => {
    switch (panchoState) {
      case 'working':
        return 'border-amber-400/70';
      case 'success':
        return 'border-emerald-400/80';
      case 'error':
        return 'border-red-400/80';
      case 'attention':
        return 'border-pink-400/80';
      case 'idle':
      default:
        return 'border-purple-500/50';
    }
  };

  if (isOpen) return null;

  return (
    <div 
      className={`fixed top-3 z-50 pointer-events-auto flex items-center gap-2 transition-all duration-300 ${
        leftSidebarOpen ? 'left-14 sm:left-16 lg:left-[345px]' : 'left-14 sm:left-16 lg:left-6'
      }`}
    >
      {/* Main Avatar Button */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={onClick}
        style={{ boxShadow: getGlowShadow() }}
        className={`relative p-1.5 sm:p-2 rounded-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-950 border-2 ${getBorderColor()} shadow-2xl flex items-center justify-center transition-all group`}
        title={`Abrir ${role.title}`}
      >
        {/* State Ping Indicator Ring */}
        {panchoState === 'working' && (
          <span className="absolute inset-0 rounded-full bg-amber-400/30 animate-ping" />
        )}
        {panchoState === 'attention' && (
          <span className="absolute inset-0 rounded-full bg-pink-500/40 animate-ping" />
        )}

        {/* Pancho Dog Avatar */}
        <PanchoRobotAvatar state={panchoState} size={38} showTail={false} />

        {/* Small floating status badge dot on mobile */}
        <span
          className={`sm:hidden absolute top-0 right-0 w-3 h-3 rounded-full border-2 border-gray-900 ${
            panchoState === 'working'
              ? 'bg-amber-400'
              : panchoState === 'success'
              ? 'bg-emerald-400'
              : panchoState === 'error'
              ? 'bg-red-500'
              : panchoState === 'attention'
              ? 'bg-pink-500'
              : 'bg-cyan-400'
          }`}
        />
      </motion.button>

      {/* Dynamic pill badge indicating active tab role (to the right of avatar in top-left) */}
      <motion.div
        initial={{ opacity: 0, x: -15 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -15 }}
        className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-900/90 backdrop-blur-md border border-white/10 shadow-xl cursor-pointer hover:border-white/20 transition-all"
        onClick={onClick}
      >
        <span className="text-sm">{role.icon}</span>
        <div className="flex flex-col text-left">
          <span className="text-xs font-bold text-white leading-tight flex items-center gap-1.5">
            {role.title}
            {panchoState === 'working' && (
              <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            )}
            {panchoState === 'attention' && (
              <span className="inline-block w-2 h-2 rounded-full bg-pink-400 animate-bounce" />
            )}
          </span>
          <span className="text-[10px] text-gray-400 leading-tight">
            {statusMessage || role.subtitle}
          </span>
        </div>
      </motion.div>
    </div>
  );
};

export default PanchoFloatingButton;
