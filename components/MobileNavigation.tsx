import React, { useState, useRef, useEffect } from 'react';
import { useLinks } from '../contexts/LinkContext';
import { useDeviceLayout } from '../hooks/useDeviceLayout';
import { 
  Menu, 
  Search, 
  Save, 
  Settings, 
  Database, 
  RefreshCw, 
  LayoutDashboard, 
  X, 
  ChevronRight, 
  Smartphone, 
  Maximize2,
  Calendar,
  Mail,
  TrendingUp,
  FileText,
  Grid
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TabConfig } from '../types';

interface MobileNavigationProps {
  onToggleSidebar: () => void;
  tabIcons: Record<string, React.ReactNode>;
  isDatabaseActive: boolean;
  onToggleDatabase: () => void;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  onToggleSidebar,
  tabIcons,
  isDatabaseActive,
  onToggleDatabase
}) => {
  const { 
    config, 
    activeTabId, 
    setActiveTabId, 
    isEditing, 
    toggleEditing, 
    saveToSupabase, 
    fetchConfigFromSupabaseManual, 
    syncStatus 
  } = useLinks();

  const { isDesktop, isFoldCover, isFoldUnfolded } = useDeviceLayout();
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [isMoreTabsOpen, setIsMoreTabsOpen] = useState(false);
  const tabsScrollRef = useRef<HTMLDivElement>(null);

  // If on Desktop / Computer, DO NOT RENDER MOBILE NAVIGATION
  // This guarantees PC view stays 100% identical as requested
  if (isDesktop) {
    return null;
  }

  const visibleTabs = config.tabs.filter(t => t.isVisible && t.id !== 'database' && t.id !== 'db');

  // Auto-scroll active tab into view in the top horizontal bar
  useEffect(() => {
    if (tabsScrollRef.current) {
      const activeEl = tabsScrollRef.current.querySelector('[data-active="true"]') as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeTabId]);

  const handleOpenSearch = () => {
    window.dispatchEvent(new CustomEvent('open-global-search'));
  };

  const getTabIcon = (tab: TabConfig) => {
    if (tab.componentKey && tabIcons[tab.componentKey]) {
      return tabIcons[tab.componentKey];
    }
    return <Grid size={18} />;
  };

  // Primary bottom dock shortcuts
  const primaryDockTabs = [
    { id: 'email-gen', label: 'Email', icon: <Mail size={20} /> },
    { id: 'calendar', label: 'Calendario', icon: <Calendar size={20} /> },
    { id: 'finanzas', label: 'Finanzas', icon: <TrendingUp size={20} /> },
    { id: 'notas', label: 'Notas', icon: <FileText size={20} /> },
  ];

  return (
    <>
      {/* 1. MOBILE TOP HEADER */}
      <header className="w-full pt-3 pb-2 px-3 flex items-center justify-between gap-2 border-b border-white/10 bg-black/40 backdrop-blur-xl sticky top-0 z-30">
        <div className="flex items-center gap-2">
          {/* Hamburger Drawer Button */}
          <button 
            onClick={onToggleSidebar}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors active:scale-95"
            aria-label="Abrir menú lateral"
          >
            <Menu size={22} />
          </button>

          {/* Logo Title & Fold Status */}
          <div className="flex flex-col">
            <h1 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-indigo-400 tracking-tight leading-tight">
              Rembrandt IA
            </h1>
            {isFoldUnfolded && (
              <span className="text-[10px] text-cyan-400/90 font-mono flex items-center gap-1 font-semibold">
                <Maximize2 size={10} /> Fold Desplegado
              </span>
            )}
            {isFoldCover && (
              <span className="text-[9px] text-purple-400/70 font-mono">
                Modo Celular
              </span>
            )}
          </div>
        </div>

        {/* Right Header Action Buttons */}
        <div className="flex items-center gap-1.5">
          {/* Quick Search Button (opens Ctrl+K) */}
          <button
            onClick={handleOpenSearch}
            className="p-2 text-purple-300 hover:text-white bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-xl transition-all active:scale-95"
            title="Búsqueda Global"
          >
            <Search size={18} />
          </button>

          {/* Cloud Save Button with Sync Status Indicator */}
          <button 
            onClick={() => saveToSupabase(undefined, { showToast: true, immediate: true })} 
            className="relative p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-xl transition-all active:scale-95" 
            title={
              syncStatus === 'saving' 
                ? 'Sincronizando con Supabase...' 
                : syncStatus === 'error' 
                ? 'Error al guardar' 
                : 'Guardar Cambios en la Nube'
            }
          >
            <Save size={18} className={
              syncStatus === 'saving' 
                ? 'animate-pulse text-amber-400' 
                : syncStatus === 'error' 
                ? 'text-rose-400' 
                : 'text-gray-300'
            } />
            {syncStatus === 'saving' && (
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
            )}
            {syncStatus === 'synced' && (
              <span className="absolute top-1.5 right-1.5 flex h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"></span>
            )}
            {syncStatus === 'error' && (
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)]"></span>
            )}
          </button>

          {/* Mobile Actions Drawer Trigger */}
          <button
            onClick={() => setIsActionsOpen(true)}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors active:scale-95"
            title="Acciones del Sistema"
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      {/* 2. MOBILE TOP HORIZONTAL SWIPEABLE TABS */}
      <div 
        ref={tabsScrollRef}
        className={`w-full overflow-x-auto no-scrollbar py-2.5 px-3 flex items-center gap-2 border-b border-white/5 bg-black/20 ${
          isFoldUnfolded ? 'justify-center flex-wrap' : ''
        }`}
      >
        {visibleTabs.map((tab) => {
          const isActive = activeTabId === tab.id;
          return (
            <button
              key={tab.id}
              data-active={isActive ? 'true' : 'false'}
              onClick={() => setActiveTabId(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 active:scale-95 flex-shrink-0 ${
                isActive
                  ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white shadow-[0_0_20px_rgba(147,51,234,0.4)] border border-purple-400/40'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/5'
              }`}
            >
              <span className={isActive ? 'text-white' : 'text-purple-400'}>
                {getTabIcon(tab)}
              </span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. MOBILE BOTTOM DOCK (Navigation Bar for thumbs) */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-black/85 backdrop-blur-2xl border-t border-white/10 px-2 py-1.5 flex items-center justify-around shadow-[0_-5px_25px_rgba(0,0,0,0.5)]">
        {primaryDockTabs.map((item) => {
          const isActive = activeTabId === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTabId(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-200 active:scale-95 ${
                isActive ? 'text-purple-400' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <div className={`p-1 rounded-lg ${isActive ? 'bg-purple-600/20 text-purple-300' : ''}`}>
                {item.icon}
              </div>
              <span className="text-[10px] font-medium mt-0.5">{item.label}</span>
            </button>
          );
        })}

        {/* More Tabs button */}
        <button
          onClick={() => setIsMoreTabsOpen(true)}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-200 active:scale-95 ${
            isMoreTabsOpen ? 'text-purple-400' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <div className="p-1 rounded-lg">
            <Grid size={20} />
          </div>
          <span className="text-[10px] font-medium mt-0.5">Más</span>
        </button>
      </nav>

      {/* 4. "MÁS PESTAÑAS" BOTTOM SHEET */}
      <AnimatePresence>
        {isMoreTabsOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
              onClick={() => setIsMoreTabsOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 inset-x-0 bg-slate-900/95 backdrop-blur-2xl rounded-t-3xl border-t border-white/15 p-5 z-50 max-h-[75vh] overflow-y-auto"
            >
              <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Grid size={18} className="text-purple-400" /> Todas las Pestañas
                </h3>
                <button
                  onClick={() => setIsMoreTabsOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {visibleTabs.map((tab) => {
                  const isActive = activeTabId === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTabId(tab.id);
                        setIsMoreTabsOpen(false);
                      }}
                      className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition-all active:scale-95 ${
                        isActive
                          ? 'bg-purple-600/30 border-purple-400/50 text-white shadow-lg'
                          : 'bg-white/5 border-white/5 text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      <div className={`p-2 rounded-xl ${isActive ? 'bg-purple-500/30 text-purple-200' : 'bg-white/5 text-gray-400'}`}>
                        {getTabIcon(tab)}
                      </div>
                      <span className="text-xs font-semibold truncate">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 5. MOBILE ACTIONS QUICK SHEET */}
      <AnimatePresence>
        {isActionsOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
              onClick={() => setIsActionsOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 inset-x-0 bg-slate-900/95 backdrop-blur-2xl rounded-t-3xl border-t border-white/15 p-5 z-50"
            >
              <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Settings size={18} className="text-purple-400" /> Acciones Rápidas
                </h3>
                <button
                  onClick={() => setIsActionsOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    toggleEditing();
                    setIsActionsOpen(false);
                  }}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300">
                      <Settings size={18} />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-semibold text-white">
                        {isEditing ? 'Desactivar Modo Edición' : 'Activar Modo Edición'}
                      </div>
                      <div className="text-xs text-gray-400">Reorganizar o personalizar widgets</div>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-gray-500" />
                </button>

                <button
                  onClick={() => {
                    onToggleDatabase();
                    setIsActionsOpen(false);
                  }}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-blue-500/20 text-blue-300">
                      <Database size={18} />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-semibold text-white">
                        {isDatabaseActive ? 'Cerrar Base de Datos' : 'Base de Datos y Cloud'}
                      </div>
                      <div className="text-xs text-gray-400">Ver tablas de Supabase y APIs</div>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-gray-500" />
                </button>

                <button
                  onClick={() => {
                    fetchConfigFromSupabaseManual();
                    setIsActionsOpen(false);
                  }}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-sky-500/20 text-sky-300">
                      <RefreshCw size={18} />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-semibold text-white">Recargar desde Nube</div>
                      <div className="text-xs text-gray-400">Descargar última versión de Supabase</div>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-gray-500" />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
