import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Edit3, Lock, Terminal, Sparkles } from 'lucide-react';
import { useLinks } from '../contexts/LinkContext';
import NotesTab from './NotesTab';
import Credenciales from './Credenciales';
import CommandsTab from './CommandsTab';

export type WorkspaceSubTab = 'notas' | 'credenciales' | 'comandos';

interface WorkspaceHubProps {
  initialSubTab?: WorkspaceSubTab;
}

export const WorkspaceHub: React.FC<WorkspaceHubProps> = ({ initialSubTab }) => {
  const { config } = useLinks();

  const [activeSubTab, setActiveSubTab] = useState<WorkspaceSubTab>(() => {
    if (initialSubTab) return initialSubTab;
    const saved = localStorage.getItem('rembrandt_workspace_subtab');
    if (saved === 'notas' || saved === 'credenciales' || saved === 'comandos') {
      return saved;
    }
    return 'notas';
  });

  // Sync if initialSubTab prop changes externally
  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Listen to custom window events for subtab switching (e.g. from GlobalSearch)
  useEffect(() => {
    const handleSubTabSwitch = (e: CustomEvent<WorkspaceSubTab>) => {
      if (e.detail && ['notas', 'credenciales', 'comandos'].includes(e.detail)) {
        setActiveSubTab(e.detail);
        localStorage.setItem('rembrandt_workspace_subtab', e.detail);
      }
    };

    window.addEventListener('switch-workspace-subtab' as any, handleSubTabSwitch);
    return () => {
      window.removeEventListener('switch-workspace-subtab' as any, handleSubTabSwitch);
    };
  }, []);

  const handleSelectSubTab = (tab: WorkspaceSubTab) => {
    setActiveSubTab(tab);
    localStorage.setItem('rembrandt_workspace_subtab', tab);
  };

  const notesCount = React.useMemo(() => {
    const seen = new Set<string>();
    return (config.notes || []).filter(n => {
      if (!n || !n.id) return false;
      if (seen.has(n.id)) return false;
      seen.add(n.id);
      return true;
    }).length;
  }, [config.notes]);
  const credsCount = config.credenciales?.length || 0;
  const commandsCount = config.commands?.length || 0;

  const subTabs = [
    {
      id: 'notas' as WorkspaceSubTab,
      label: 'Notas',
      icon: <Edit3 size={18} />,
      count: notesCount,
      color: 'from-amber-500 to-yellow-600',
      activeBorder: 'border-amber-400/40',
      badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
    },
    {
      id: 'credenciales' as WorkspaceSubTab,
      label: 'Credenciales',
      icon: <Lock size={18} />,
      count: credsCount,
      color: 'from-rose-500 to-pink-600',
      activeBorder: 'border-rose-400/40',
      badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/30'
    },
    {
      id: 'comandos' as WorkspaceSubTab,
      label: 'Comandos',
      icon: <Terminal size={18} />,
      count: commandsCount,
      color: 'from-purple-500 to-indigo-600',
      activeBorder: 'border-purple-400/40',
      badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/30'
    }
  ];

  return (
    <div className="w-full flex flex-col space-y-4">
      {/* SUB-NAVIGATION BAR (Segmented Control) */}
      <div className="w-full flex items-center justify-center pt-1 pb-2">
        <div className="w-full max-w-2xl bg-gray-900/80 backdrop-blur-xl p-1.5 rounded-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          <div className="grid grid-cols-3 gap-1.5">
            {subTabs.map(tab => {
              const isActive = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleSelectSubTab(tab.id)}
                  className={`relative flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-medium text-xs sm:text-sm transition-all duration-200 select-none ${
                    isActive
                      ? 'text-white shadow-lg'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                  }`}
                >
                  {/* Active highlight background pill */}
                  {isActive && (
                    <motion.div
                      layoutId="workspace-active-subtab-pill"
                      className={`absolute inset-0 rounded-xl bg-gradient-to-r ${tab.color} border ${tab.activeBorder} shadow-[0_0_20px_rgba(147,51,234,0.3)]`}
                      transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                    />
                  )}

                  {/* Icon & Label */}
                  <span className="relative z-10 flex items-center gap-1.5 truncate font-semibold">
                    {tab.icon}
                    <span className="truncate">{tab.label}</span>
                  </span>

                  {/* Count badge */}
                  <span
                    className={`relative z-10 hidden sm:inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold rounded-full border ${
                      isActive ? 'bg-black/30 text-white border-white/20' : tab.badgeBg
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* SUB-TAB CONTENT */}
      <div className="w-full flex-grow">
        <AnimatePresence mode="wait">
          {activeSubTab === 'notas' && (
            <motion.div
              key="subtab-notas"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="w-full"
            >
              <NotesTab />
            </motion.div>
          )}

          {activeSubTab === 'credenciales' && (
            <motion.div
              key="subtab-credenciales"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="w-full"
            >
              <Credenciales />
            </motion.div>
          )}

          {activeSubTab === 'comandos' && (
            <motion.div
              key="subtab-comandos"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="w-full"
            >
              <CommandsTab />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default WorkspaceHub;
