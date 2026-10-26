
import React, { useState, useCallback, useEffect, useRef, lazy, Suspense } from 'react';
import { 
  Mail, 
  Image as ImageIcon, 
  Edit, 
  Video, 
  Clapperboard, 
  Mic, 
  Box, 
  Wrench, 
  Database, 
  Terminal, 
  Code, 
  Briefcase, 
  Music, 
  FolderKanban, 
  MessageSquare,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Zap,
  Calendar,
  Lock,
  Bell,
  BookOpen,
  Newspaper,
  Settings,
  Save,
  RefreshCw,
  LayoutDashboard,
  Menu,
  TrendingUp,
  Heart,
  Search,
  Maximize2,
  ShieldCheck,
  Folder,
  Sparkles,
  Calculator,
  CheckSquare,
  Minimize2,
  UploadCloud,
  Archive,
  Sliders
} from 'lucide-react';
import { Tab, TabConfig, LinkItem } from './types';
import { AnimatePresence, motion } from 'motion/react';
import TabButton from './components/common/TabButton';
import { useDeviceLayout } from './hooks/useDeviceLayout';

// Resilient dynamic import helper to recover from stale chunks across deployments
function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (error: any) {
      const isChunkError =
        error?.message?.includes('dynamically imported module') ||
        error?.message?.includes('Failed to fetch dynamically') ||
        error?.message?.includes('Failed to fetch') ||
        error?.name === 'TypeError';

      const lastReload = parseInt(sessionStorage.getItem('last-chunk-reload') || '0', 10);
      if (isChunkError && Date.now() - lastReload > 8000) {
        sessionStorage.setItem('last-chunk-reload', Date.now().toString());
        if ('caches' in window) {
          try {
            const keys = await caches.keys();
            await Promise.all(keys.map(k => caches.delete(k)));
          } catch (_) {}
        }
        window.location.reload();
        return { default: (() => null) as unknown as T };
      }
      throw error;
    }
  });
}

// Lazy-loaded tab components for optimized startup performance and reduced memory footprint
const EmailGenerator = lazyWithRetry(() => import('./components/EmailGenerator'));
const UsefulTools = lazyWithRetry(() => import('./components/UsefulTools'));
const DatabaseViewer = lazyWithRetry(() => import('./components/DatabaseViewer'));
const CustomTabContent = lazyWithRetry(() => import('./components/CustomTabContent'));
const CalendarTab = lazyWithRetry(() => import('./components/CalendarTab'));
const ThreeDPrinting = lazyWithRetry(() => import('./components/ThreeDPrinting'));
const PanchoAssistantModal = lazyWithRetry(() => import('./components/Pancho/PanchoAssistantModal'));
const WorkspaceHub = lazyWithRetry(() => import('./components/WorkspaceHub'));
const TeleprompterTab = lazyWithRetry(() => import('./components/TeleprompterTab'));
const CotizadorTab = lazyWithRetry(() => import('./components/CotizadorTab'));
const ListasTab = lazyWithRetry(() => import('./components/ListasTab'));
const CompresorTab = lazyWithRetry(() => import('./components/CompresorTab'));
const PersonalTab = lazyWithRetry(() => import('./components/PersonalTab'));
const BodegaTab = lazyWithRetry(() => import('./components/BodegaTab'));
const EdicionTab = lazyWithRetry(() => import('./components/EdicionTab'));
const WhatsAppTab = lazyWithRetry(() => import('./components/WhatsAppTab'));

import { PanchoState } from './components/Pancho/PanchoRobotAvatar';
import { GlobalQuickIdeaModal } from './components/ListasRemb/GlobalQuickIdeaModal';

import LinksBar from './components/LinksBar';
import { 
  GEMINI_PREMIUM_ICON_SVG, 
  CHATGPT_PREMIUM_ICON_SVG, 
  CLAUDE_PREMIUM_ICON_SVG 
} from './components/AiSidebar';
import CalculatorWidget from './components/CalculatorWidget';
import GoogleDock from './components/GoogleDock'; 
import Clock from './components/common/Clock';
import ReminderDisplay from './components/common/ReminderDisplay';
import ShortcutListener from './components/ShortcutListener';
import { EditModeBanner } from './components/common/EditModeBanner';
import { ReferenceImage } from './components/common/ReferenceImageManager';
import { GoogleApiConfigModal } from './components/common/GoogleApiConfigModal';
import NotificationManager from './components/NotificationManager';
import NotificationOverlay from './components/NotificationOverlay';
import { Message } from './types';

import { LinkProvider, useLinks } from './contexts/LinkContext';
import { Toaster, toast } from 'sonner';
import { GlobalSearch } from './components/GlobalSearch';
import { PwaInstallPrompt } from './components/PwaInstallPrompt';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  defaultDropAnimationSideEffects,
  DropAnimation,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  SortableContext,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.5',
      },
    },
  }),
};

const SortableTab: React.FC<{ 
    tab: TabConfig; 
    index: number;
    activeTabId: string;
    setActiveTabId: (id: string) => void;
    isEditing: boolean;
    handleMoveTab: (index: number, direction: 'left' | 'right') => void;
    editingTabId: string | null;
    tempTabName: string;
    setTempTabName: (name: string) => void;
    saveTabName: () => void;
    startEditingTab: (tab: TabConfig) => void;
    handleDeleteTab: (id: string) => void;
    tabIcons: Record<string, React.ReactNode>;
}> = ({ 
    tab, 
    index, 
    activeTabId, 
    setActiveTabId, 
    isEditing, 
    handleMoveTab, 
    editingTabId, 
    tempTabName, 
    setTempTabName, 
    saveTabName, 
    startEditingTab, 
    handleDeleteTab,
    tabIcons 
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: tab.id });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 100 : 1,
    };

    return (
        <div 
            ref={setNodeRef}
            style={style}
            className={`relative group flex items-center transition-all duration-200 ${isDragging ? 'scale-105' : ''}`}
            {...(isEditing ? { ...attributes, ...listeners } : {})}
        >
            {isEditing && (
                <div className="flex items-center mr-1">
                    <button 
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => handleMoveTab(index, 'left')}
                        disabled={index === 0}
                        className="p-1 text-gray-500 hover:text-white disabled:opacity-30"
                    >
                        <ChevronLeft size={14} />
                    </button>
                </div>
            )}
            
            {editingTabId === tab.id ? (
                <div className="flex items-center bg-gray-800 rounded px-2 py-1" onPointerDown={(e) => e.stopPropagation()}>
                    <input 
                        type="text" 
                        value={tempTabName}
                        onChange={(e) => setTempTabName(e.target.value)}
                        className="bg-transparent border-none text-white focus:ring-0 w-32"
                        autoFocus
                        onBlur={saveTabName}
                        onKeyDown={(e) => e.key === 'Enter' && saveTabName()}
                    />
                </div>
            ) : (
                <TabButton
                    label={tab.label}
                    isActive={activeTabId === tab.id}
                    icon={tab.type === 'system' ? tabIcons[tab.componentKey || ''] : <FolderKanban />}
                    onClick={() => setActiveTabId(tab.id)}
                    onDelete={isEditing ? () => handleDeleteTab(tab.id) : undefined}
                />
            )}

            {isEditing && (
                <div className="flex items-center ml-1 gap-1">
                    <button 
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => startEditingTab(tab)}
                        className="p-1 text-gray-500 hover:text-blue-400"
                    >
                        <Pencil size={14} />
                    </button>
                    <button 
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => handleDeleteTab(tab.id)}
                        className="p-1 text-gray-500 hover:text-red-500"
                    >
                        <X size={14} />
                    </button>
                    <button 
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => handleMoveTab(index, 'right')}
                        className="p-1 text-gray-500 hover:text-white disabled:opacity-30"
                    >
                        <ChevronRight size={14} />
                    </button>
                </div>
            )}
        </div>
    );
};

const TabLoadingFallback: React.FC<{ message?: string }> = ({ message = 'Cargando módulo...' }) => (
  <div className="flex flex-col items-center justify-center min-h-[350px] w-full p-12 text-gray-400 gap-3">
    <div className="w-10 h-10 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
    <span className="text-sm font-medium text-purple-300/80 tracking-wide animate-pulse">{message}</span>
  </div>
);

const MainLayout: React.FC = () => {
  const { config, updateConfig, isEditing, toggleEditing, saveToSupabase, fetchConfigFromSupabaseManual, updateNotifications, activeTabId, setActiveTabId, syncStatus } = useLinks();
  const { isMobile, isFoldUnfolded } = useDeviceLayout();
  const [previousActiveTabId, setPreviousActiveTabId] = useState<string>('email-gen');

  const isLocalHost = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '::1');
  const [isDeploying, setIsDeploying] = useState(false);

  const handleDeployToVercel = async () => {
    if (isDeploying) return;
    const confirmed = window.confirm("¿Deseas publicar todos los cambios locales a Producción (Vercel)?");
    if (!confirmed) return;

    setIsDeploying(true);
    const toastId = toast.loading("Subiendo cambios locales a Vercel...");
    try {
      const res = await fetch('/api/dev/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: "feat: despliegue desde panel local" })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al desplegar");
      }
      toast.success(data.message || "¡Despliegue enviado a Vercel!", { id: toastId, duration: 6000 });
    } catch (err: any) {
      toast.error(`Error al subir a Vercel: ${err.message}`, { id: toastId, duration: 6000 });
    } finally {
      setIsDeploying(false);
    }
  };

  const allAiModels = config.aiSidebar?.models || [];
  const geminiItem = allAiModels.find(m => {
    const name = (m.name || '').toLowerCase();
    const href = (m.href || '').toLowerCase();
    return name.includes('gemini') || href.includes('gemini.google.com') || m.id === 'ai-gemini' || m.id === 'gd-1';
  }) || { id: 'ai-gemini', name: 'Gemini', href: 'https://gemini.google.com/app' };

  const chatGptItem = allAiModels.find(m => {
    const name = (m.name || '').toLowerCase();
    const href = (m.href || '').toLowerCase();
    return name.includes('chatgpt') || href.includes('chatgpt.com') || m.id === 'ai-1';
  }) || { id: 'ai-1', name: 'ChatGPT', href: 'https://chatgpt.com/' };

  const claudeItem = allAiModels.find(m => {
    const name = (m.name || '').toLowerCase();
    const href = (m.href || '').toLowerCase();
    return name.includes('claude') || href.includes('claude.ai') || m.id === 'ai-5';
  }) || { id: 'ai-5', name: 'Claude', href: 'https://claude.ai/new' };

  const headerAiModels = [
    {
      id: geminiItem.id || 'ai-gemini',
      name: geminiItem.name || 'Gemini',
      href: geminiItem.href || 'https://gemini.google.com/app',
      iconSvg: GEMINI_PREMIUM_ICON_SVG,
      cardStyle: 'bg-gradient-to-br from-blue-600/30 via-indigo-600/25 to-pink-600/30 hover:from-blue-600/45 hover:via-purple-600/40 hover:to-pink-600/45 border-blue-400/40 hover:border-purple-300/80 shadow-[0_0_15px_rgba(78,135,245,0.25)] hover:shadow-[0_0_28px_rgba(168,85,247,0.65),0_0_12px_rgba(56,189,248,0.4)]',
      iconGlow: 'drop-shadow(0 0 6px rgba(168,85,247,0.85)) drop-shadow(0 0 14px rgba(56,189,248,0.6))',
      dotColor: 'bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]'
    },
    {
      id: chatGptItem.id || 'ai-1',
      name: chatGptItem.name || 'ChatGPT',
      href: chatGptItem.href || 'https://chatgpt.com/',
      iconSvg: CHATGPT_PREMIUM_ICON_SVG,
      cardStyle: 'bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-emerald-600/20 hover:from-emerald-500/30 hover:via-teal-500/25 hover:to-emerald-600/35 border-emerald-500/30 hover:border-teal-300 shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5),0_0_10px_rgba(45,212,191,0.35)]',
      iconGlow: 'drop-shadow(0 0 6px rgba(16,185,129,0.8)) drop-shadow(0 0 12px rgba(45,212,191,0.5))',
      dotColor: 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
    },
    {
      id: claudeItem.id || 'ai-5',
      name: claudeItem.name || 'Claude',
      href: claudeItem.href || 'https://claude.ai/new',
      iconSvg: CLAUDE_PREMIUM_ICON_SVG,
      cardStyle: 'bg-gradient-to-br from-amber-500/20 via-orange-500/15 to-amber-600/25 hover:from-amber-500/35 hover:via-orange-500/30 hover:to-amber-600/40 border-amber-500/40 hover:border-orange-300/80 shadow-[0_0_15px_rgba(249,115,22,0.25)] hover:shadow-[0_0_28px_rgba(249,115,22,0.65),0_0_12px_rgba(251,146,60,0.4)]',
      iconGlow: 'drop-shadow(0 0 6px rgba(249,115,22,0.85)) drop-shadow(0 0 14px rgba(251,146,60,0.6))',
      dotColor: 'bg-gradient-to-r from-amber-400 to-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]'
    },
    {
      id: 'header-whatsapp',
      name: 'WhatsApp',
      href: 'https://web.whatsapp.com/',
      iconSvg: '<svg viewBox="0 0 24 24" class="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill="#22c55e" d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.196 8.196 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24m-3.53 3.63c-.19 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.47 1.07 2.89 1.21 3.09.15.2 2.1 3.2 5.08 4.49 2.49 1.07 2.99.86 3.53.81.54-.05 1.74-.71 1.99-1.4.24-.68.24-1.27.17-1.4-.07-.12-.27-.2-.56-.34-.3-.15-1.74-.86-2.01-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.34.22-.64.07-.3-.15-1.26-.46-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.14-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.6-.49-.51-.67-.52h-.57z"/></svg>',
      cardStyle: 'bg-gradient-to-br from-emerald-500/20 via-green-600/15 to-emerald-700/25 hover:from-emerald-500/35 hover:via-green-600/30 hover:to-emerald-700/40 border-emerald-500/40 hover:border-green-300/80 shadow-[0_0_15px_rgba(34,197,94,0.25)] hover:shadow-[0_0_28px_rgba(34,197,94,0.65),0_0_12px_rgba(74,222,128,0.4)]',
      iconGlow: 'drop-shadow(0 0 6px rgba(34,197,94,0.85)) drop-shadow(0 0 14px rgba(74,222,128,0.6))',
      dotColor: 'bg-gradient-to-r from-emerald-400 to-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]'
    }
  ];

  const isDbTab = (t: { id?: string; label?: string; componentKey?: string }) => {
    if (!t) return false;
    const id = (t.id || '').toLowerCase();
    const label = (t.label || '').toLowerCase();
    const componentKey = (t.componentKey || '').toLowerCase();
    return (
      id === 'database' ||
      id === 'datos' ||
      id.includes('database') ||
      id.includes('dato') ||
      label === 'datos' ||
      label === 'base de datos' ||
      label.includes('dato') ||
      componentKey === 'base de datos' ||
      componentKey.includes('database') ||
      componentKey.includes('dato')
    );
  };

  const isRenderTab = (t: { id?: string; label?: string; componentKey?: string }) => {
    if (!t) return false;
    const id = (t.id || '').toLowerCase();
    const label = (t.label || '').toLowerCase();
    const componentKey = (t.componentKey || '').toLowerCase();
    return id.includes('render') || label.includes('render') || componentKey.includes('render');
  };

  const isDatabaseActive = isDbTab({ id: activeTabId });

  const handleToggleDatabaseTab = () => {
    if (isDatabaseActive) {
      const fallbackTab = config.tabs.find(t => t.isVisible && !isDbTab(t))?.id || 'email-gen';
      setActiveTabId(previousActiveTabId && !isDbTab({ id: previousActiveTabId }) ? previousActiveTabId : fallbackTab);
    } else {
      setPreviousActiveTabId(activeTabId);
      const existingDbTab = config.tabs.find(isDbTab);
      setActiveTabId(existingDbTab?.id || 'database');
    }
  };
  const [imagesForEmail, setImagesForEmail] = useState<ReferenceImage[]>([]);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [tempTabName, setTempTabName] = useState('');
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(window.innerWidth >= 1024);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isQuickIdeaOpen, setIsQuickIdeaOpen] = useState(false);
  const [quickIdeaAutoStart, setQuickIdeaAutoStart] = useState(false);
  const hasAutoOpenedMobileRef = useRef(false);
  const [visitedTabIds, setVisitedTabIds] = useState<string[]>(() => [activeTabId]);

  useEffect(() => {
    if (activeTabId) {
      setVisitedTabIds(prev => prev.includes(activeTabId) ? prev : [...prev, activeTabId]);
    }
  }, [activeTabId]);

  // When on mobile (celular), auto-deploy audio apuntes recorder on initial load as requested
  useEffect(() => {
    if (isMobile && !hasAutoOpenedMobileRef.current) {
      hasAutoOpenedMobileRef.current = true;
      const timer = setTimeout(() => {
        setIsQuickIdeaOpen(true);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isMobile]);
  const [panchoState, setPanchoState] = useState<PanchoState>('idle');
  const [assistantMessages, setAssistantMessages] = useState<Message[]>([]);

  useEffect(() => {
    const handleOpenPancho = () => setIsAssistantOpen(true);
    const handleOpenQuickIdea = () => setIsQuickIdeaOpen(true);
    const handleNav = (e: any) => {
      if (e.detail) setActiveTabId(e.detail);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'i' || e.key === 'I')) {
        e.preventDefault();
        setIsQuickIdeaOpen(prev => !prev);
      }
    };

    window.addEventListener('open-pancho', handleOpenPancho);
    window.addEventListener('open-quick-idea', handleOpenQuickIdea);
    window.addEventListener('navigate-to-tab', handleNav);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('open-pancho', handleOpenPancho);
      window.removeEventListener('open-quick-idea', handleOpenQuickIdea);
      window.removeEventListener('navigate-to-tab', handleNav);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [setActiveTabId]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setLeftSidebarOpen(true);
      } else {
        setLeftSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const findContainer = (id: string) => {
    if (id === 'linksBar' || id === 'googleDock' || id === 'aiSidebar.models' || id === 'aiSidebar.quickAccess') return id;
    if (id.startsWith('rightSidebar.') || id.startsWith('usefulTools.') || id.startsWith('tab:')) return id;
    
    // Check if it's a tab ID directly
    if (config.tabs.find(t => t.id === id)) return 'tabs';

    if (config.linksBar.find(i => i.id === id)) return 'linksBar';
    if (config.googleDock.find(i => i.id === id)) return 'googleDock';
    if (config.aiSidebar.models.find(i => i.id === id)) return 'aiSidebar.models';
    if (config.aiSidebar.quickAccess.find(i => i.id === id)) return 'aiSidebar.quickAccess';
    
    for (let i = 0; i < config.rightSidebar.length; i++) {
        if (config.rightSidebar[i].items.find(item => item.id === id)) return `rightSidebar.${i}`;
    }
    
    for (let i = 0; i < config.usefulTools.length; i++) {
        if (config.usefulTools[i].items.find(item => item.id === id)) return `usefulTools.${i}`;
    }
    
    for (const tab of config.tabs) {
        if (tab.items?.find(i => i.id === id)) return `tab:${tab.id}`;
    }
    
    return null;
  };

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeContainer = findContainer(activeId);
    const overContainer = over.data?.current?.sortable?.containerId || findContainer(overId);

    if (!activeContainer || !overContainer || activeContainer === overContainer) {
      return;
    }

    // Moving between containers
    const newConfig = JSON.parse(JSON.stringify(config));
    let activeItem: LinkItem | undefined;

    // Helper to get item and remove it
    const removeItem = (container: string, id: string) => {
        if (container === 'linksBar') {
            const idx = newConfig.linksBar.findIndex((i: any) => i.id === id);
            activeItem = newConfig.linksBar.splice(idx, 1)[0];
        } else if (container === 'googleDock') {
            const idx = newConfig.googleDock.findIndex((i: any) => i.id === id);
            activeItem = newConfig.googleDock.splice(idx, 1)[0];
        } else if (container.startsWith('aiSidebar.')) {
            const sub = container.split('.')[1] as 'models' | 'quickAccess';
            const idx = newConfig.aiSidebar[sub].findIndex((i: any) => i.id === id);
            activeItem = newConfig.aiSidebar[sub].splice(idx, 1)[0];
        } else if (container.startsWith('rightSidebar.')) {
            const idx = parseInt(container.split('.')[1]);
            const itemIdx = newConfig.rightSidebar[idx].items.findIndex((i: any) => i.id === id);
            activeItem = newConfig.rightSidebar[idx].items.splice(itemIdx, 1)[0];
        } else if (container.startsWith('usefulTools.')) {
            const idx = parseInt(container.split('.')[1]);
            const itemIdx = newConfig.usefulTools[idx].items.findIndex((i: any) => i.id === id);
            activeItem = newConfig.usefulTools[idx].items.splice(itemIdx, 1)[0];
        } else if (container.startsWith('tab:')) {
            const tabId = container.split(':')[1];
            const tabIdx = newConfig.tabs.findIndex((t: any) => t.id === tabId);
            const itemIdx = newConfig.tabs[tabIdx].items.findIndex((i: any) => i.id === id);
            activeItem = newConfig.tabs[tabIdx].items.splice(itemIdx, 1)[0];
        }
    };

    removeItem(activeContainer, activeId);

    if (activeItem) {
        // Add to new container
        if (overContainer === 'linksBar') {
            newConfig.linksBar.push(activeItem);
        } else if (overContainer === 'googleDock') {
            newConfig.googleDock.push(activeItem);
        } else if (overContainer.startsWith('aiSidebar.')) {
            const sub = overContainer.split('.')[1] as 'models' | 'quickAccess';
            newConfig.aiSidebar[sub].push(activeItem);
        } else if (overContainer.startsWith('rightSidebar.')) {
            const idx = parseInt(overContainer.split('.')[1]);
            newConfig.rightSidebar[idx].items.push(activeItem);
        } else if (overContainer.startsWith('usefulTools.')) {
            const idx = parseInt(overContainer.split('.')[1]);
            // Enforce limit of 9 items
            if (newConfig.usefulTools[idx].items.length >= 9) {
                return; // Don't allow move if limit reached
            }
            newConfig.usefulTools[idx].items.push(activeItem);
        } else if (overContainer.startsWith('tab:')) {
            const tabId = overContainer.split(':')[1];
            const tabIdx = newConfig.tabs.findIndex((t: any) => t.id === tabId);
            if (!newConfig.tabs[tabIdx].items) newConfig.tabs[tabIdx].items = [];
            newConfig.tabs[tabIdx].items.push(activeItem);
        }
        updateConfig(newConfig);
    }
  }, [config, updateConfig]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeContainer = findContainer(activeId);
    const overContainer = over.data?.current?.sortable?.containerId || findContainer(overId);

    if (!activeContainer || !overContainer || activeContainer !== overContainer) {
      return;
    }

    // Reordering within same container
    const newConfig = JSON.parse(JSON.stringify(config));
    
    const reorder = (list: LinkItem[]) => {
        const oldIndex = list.findIndex(i => i.id === activeId);
        const newIndex = list.findIndex(i => i.id === overId);
        return arrayMove(list, oldIndex, newIndex);
    };

    if (activeContainer === 'linksBar') {
        newConfig.linksBar = reorder(newConfig.linksBar);
    } else if (activeContainer === 'googleDock') {
        newConfig.googleDock = reorder(newConfig.googleDock);
    } else if (activeContainer.startsWith('aiSidebar.')) {
        const sub = activeContainer.split('.')[1] as 'models' | 'quickAccess';
        newConfig.aiSidebar[sub] = reorder(newConfig.aiSidebar[sub]);
    } else if (activeContainer.startsWith('rightSidebar.')) {
        const idx = parseInt(activeContainer.split('.')[1]);
        newConfig.rightSidebar[idx].items = reorder(newConfig.rightSidebar[idx].items);
    } else if (activeContainer.startsWith('usefulTools.')) {
        const idx = parseInt(activeContainer.split('.')[1]);
        newConfig.usefulTools[idx].items = reorder(newConfig.usefulTools[idx].items);
    } else if (activeContainer.startsWith('tab:')) {
        const tabId = activeContainer.split(':')[1];
        const tabIdx = newConfig.tabs.findIndex((t: any) => t.id === tabId);
        newConfig.tabs[tabIdx].items = reorder(newConfig.tabs[tabIdx].items);
    } else if (activeContainer === 'tabs') {
        const oldIndex = newConfig.tabs.findIndex((t: any) => t.id === activeId);
        const newIndex = newConfig.tabs.findIndex((t: any) => t.id === overId);
        if (oldIndex !== -1 && newIndex !== -1) {
            newConfig.tabs = arrayMove(newConfig.tabs, oldIndex, newIndex);
        }
    }

    updateConfig(newConfig);
  }, [config, updateConfig]);

  // Ensure activeTabId is valid
  useEffect(() => {
    if (config.tabs.length > 0) {
      const isCurrentDb = isDbTab({ id: activeTabId });
      const currentTabExists = config.tabs.some(t => t.id === activeTabId);
      if (!currentTabExists && !isCurrentDb) {
        setActiveTabId(config.tabs[0].id);
      }
      
      // Auto-hide any database / datos tab from the horizontal tabs bar
      const hasVisibleDbTab = config.tabs.some(t => t.isVisible && isDbTab(t));
      if (hasVisibleDbTab) {
        const newTabs = config.tabs.map(t => isDbTab(t) ? { ...t, isVisible: false } : t);
        updateConfig({ ...config, tabs: newTabs });
      }
      
      // Auto-rename Dashboard tab to Noticias if it's still named Dashboard
      const dashboardTab = config.tabs.find(t => t.componentKey === 'Dashboard' && t.label === 'Dashboard');
      if (dashboardTab) {
        const newTabs = config.tabs.map(t => 
          t.id === dashboardTab.id ? { ...t, label: 'Noticias' } : t
        );
        updateConfig({ ...config, tabs: newTabs });
      }

      // Auto-add Impresión 3D tab if missing
      const has3DTab = config.tabs.some(t => t.id === '3d-print' || t.componentKey === 'Impresión 3D');
      if (!has3DTab) {
        const newTab: TabConfig = { id: '3d-print', label: 'Impresión 3D', type: 'system', componentKey: 'Impresión 3D', isVisible: true, icon: 'Box' };
        updateConfig({ ...config, tabs: [...config.tabs, newTab] });
      }

      // Auto-add Cotizador tab right after Teleprompter if missing
      const hasCotizadorTab = config.tabs.some(t => t.id === 'cotizador' || t.componentKey === 'Cotizador');
      if (!hasCotizadorTab) {
        const cotizadorTab: TabConfig = { id: 'cotizador', label: 'Cotizador', type: 'system', componentKey: 'Cotizador', isVisible: true, icon: 'Calculator' };
        const nextTabs = [...config.tabs];
        const teleIdx = nextTabs.findIndex(t => t.id === 'teleprompter' || t.componentKey === 'Teleprompter');
        if (teleIdx !== -1) {
          nextTabs.splice(teleIdx + 1, 0, cotizadorTab);
        } else {
          nextTabs.push(cotizadorTab);
        }
        updateConfig({ ...config, tabs: nextTabs });
      }

      // Auto-add Listas tab right after Cotizador if missing
      const hasListasTab = config.tabs.some(t => t.id === 'listas' || t.componentKey === 'Listas');
      if (!hasListasTab) {
        const listasTab: TabConfig = { id: 'listas', label: 'Listas', type: 'system', componentKey: 'Listas', isVisible: true, icon: 'CheckSquare' };
        const nextTabs = [...config.tabs];
        const cotIdx = nextTabs.findIndex(t => t.id === 'cotizador' || t.componentKey === 'Cotizador');
        if (cotIdx !== -1) {
          nextTabs.splice(cotIdx + 1, 0, listasTab);
        } else {
          nextTabs.push(listasTab);
        }
        updateConfig({ ...config, tabs: nextTabs });
      }

      // Auto-add Bodega tab right after Listas if missing
      const hasBodegaTab = config.tabs.some(t => t.id === 'bodega' || t.componentKey === 'Bodega');
      if (!hasBodegaTab) {
        const bodegaTab: TabConfig = { id: 'bodega', label: 'Bodega', type: 'system', componentKey: 'Bodega', isVisible: true, icon: 'Archive' };
        const nextTabs = [...config.tabs];
        const listasIdx = nextTabs.findIndex(t => t.id === 'listas' || t.componentKey === 'Listas');
        if (listasIdx !== -1) {
          nextTabs.splice(listasIdx + 1, 0, bodegaTab);
        } else {
          nextTabs.push(bodegaTab);
        }
        updateConfig({ ...config, tabs: nextTabs });
      }

      // Auto-add Edición tab right after Bodega (or Listas) if missing
      const brokenEdicion = config.tabs.some(t => (t.id === 'edicion' || (t.label && t.label.startsWith('Edici'))) && (t.label !== 'Edición' || t.componentKey !== 'Edición')); if (brokenEdicion) { updateConfig({ ...config, tabs: config.tabs.map(t => (t.id === 'edicion' || (t.label && t.label.startsWith('Edici'))) ? { ...t, label: 'Edición', componentKey: 'Edición' } : t) }); }
      const hasEdicionTab = config.tabs.some(t => t.id === 'edicion' || t.componentKey === 'Edición');
      if (!hasEdicionTab) {
        const edicionTab: TabConfig = { id: 'edicion', label: 'Edición', type: 'system', componentKey: 'Edición', isVisible: true, icon: 'Sliders' };
        const nextTabs = [...config.tabs];
        const bodIdx = nextTabs.findIndex(t => t.id === 'bodega' || t.componentKey === 'Bodega');
        const lisIdx = nextTabs.findIndex(t => t.id === 'listas' || t.componentKey === 'Listas');
        const insertAfter = bodIdx !== -1 ? bodIdx : lisIdx;
        if (insertAfter !== -1) {
          nextTabs.splice(insertAfter + 1, 0, edicionTab);
        } else {
          nextTabs.push(edicionTab);
        }
        updateConfig({ ...config, tabs: nextTabs });
      }

      // WhatsApp is now unified inside Generador de Mensajes (email-gen)

      // Auto-remove deprecated tabs (Compresor, Renders, Video, Archivos, Dashboard, Ingeniero) from horizontal tabs bar
      const isRemovedTab = (t: { id?: string; label?: string; componentKey?: string }) =>
        isRenderTab(t) || t.id === 'whatsapp' || t.componentKey === 'WhatsApp' ||
        t.id === 'compresor' ||
        t.componentKey === 'Compresor' ||
        (t.label || '').toLowerCase().includes('compresor') ||
        t.id === 'video-gen' ||
        t.componentKey === 'Generador de Video' ||
        t.id === 'archivos' ||
        t.componentKey === 'Archivos' ||
        t.id === 'dashboard' ||
        t.componentKey === 'Dashboard' ||
        t.id === 'engineer' ||
        t.componentKey === 'Ingeniero';

      const hasRemovedTab = config.tabs.some(isRemovedTab);
      if (hasRemovedTab) {
        const newTabs = config.tabs.filter(t => !isRemovedTab(t));
        updateConfig({ ...config, tabs: newTabs });
        if (isRemovedTab({ id: activeTabId, label: activeTabId, componentKey: activeTabId })) {
          setActiveTabId(newTabs[0]?.id || 'email-gen');
        }
      }
    }
  }, [config.tabs, activeTabId, updateConfig]);

  const handleAttachImage = useCallback((base64: string, mimeType: string) => {
    setImagesForEmail(prev => {
        const newImage: ReferenceImage = {
            name: `archivo ${prev.length + 1}`,
            base64,
            mimeType,
            preview: `data:${mimeType};base64,${base64}`,
        };
        // Switch to email tab when an image is attached
        setActiveTabId('email-gen');
        return [...prev, newImage];
    });
  }, []);

  const handleAddTab = () => {
    const newTab: TabConfig = {
      id: `custom-${Date.now()}`,
      label: 'Nueva Pestaña',
      type: 'custom',
      items: [],
      isVisible: true,
      icon: 'FolderKanban'
    };
    updateConfig({ ...config, tabs: [...config.tabs, newTab] });
    setActiveTabId(newTab.id);
  };

  const handleDeleteTab = (tabId: string) => {
    const newTabs = config.tabs.filter(t => t.id !== tabId);
    updateConfig({ ...config, tabs: newTabs });
    if (activeTabId === tabId) {
      setActiveTabId(newTabs[0]?.id || '');
    }
  };

  const handleMoveTab = (index: number, direction: 'left' | 'right') => {
    const newTabs = [...config.tabs];
    if (direction === 'left' && index > 0) {
      [newTabs[index], newTabs[index - 1]] = [newTabs[index - 1], newTabs[index]];
    } else if (direction === 'right' && index < newTabs.length - 1) {
      [newTabs[index], newTabs[index + 1]] = [newTabs[index + 1], newTabs[index]];
    }
    updateConfig({ ...config, tabs: newTabs });
  };

  const startEditingTab = (tab: TabConfig) => {
    setEditingTabId(tab.id);
    setTempTabName(tab.label);
  };

  const saveTabName = () => {
    if (editingTabId) {
      const newTabs = config.tabs.map(t => 
        t.id === editingTabId ? { ...t, label: tempTabName } : t
      );
      updateConfig({ ...config, tabs: newTabs });
      setEditingTabId(null);
    }
  };

  const renderSingleTab = (tabId: string) => {
    if (tabId === 'database' || isDbTab({ id: tabId })) {
      return <DatabaseViewer />;
    }
    if (tabId === 'personal') {
      return <PersonalTab />;
    }
    if (tabId === 'finanzas') {
      return <PersonalTab initialSubTab="finanzas" />;
    }
    if (tabId === 'nutricion') {
      return <PersonalTab initialSubTab="nutricion" />;
    }
    if (tabId === 'boveda') {
      return <PersonalTab initialSubTab="boveda" />;
    }
    if (tabId === 'workspace') {
      return <WorkspaceHub />;
    }
    if (tabId === 'commands') {
      return <WorkspaceHub initialSubTab="comandos" />;
    }
    if (tabId === 'credenciales') {
      return <PersonalTab initialSubTab="boveda" initialBovedaTab="credenciales" />;
    }
    if (tabId === 'notas') {
      return <PersonalTab initialSubTab="boveda" initialBovedaTab="notas" />;
    }
    if (tabId === 'teleprompter') {
      return <TeleprompterTab />;
    }
    if (tabId === 'cotizador') {
      return <CotizadorTab />;
    }
    if (tabId === 'listas') {
      return <ListasTab />;
    }
    if (tabId === 'compresor') {
      return <CompresorTab />;
    }
    if (tabId === 'bodega') {
      return <BodegaTab />;
    }
    if (tabId === 'edicion') {
      return <EdicionTab />;
    }

    if (tabId === 'edicion') { return <EdicionTab />; }
    if (tabId === 'whatsapp') { return <WhatsAppTab isActiveTab={activeTabId === tabId} onReturnToTab={() => setActiveTabId(tabId)} />; }
    const activeTab = config.tabs.find(t => t.id === tabId);
    if (!activeTab) return null;

    if (activeTab.type === 'custom') {
      return <CustomTabContent tab={activeTab} />;
    }

    // System tabs mapping
    switch (activeTab.componentKey) {
      case 'Generador de Email':
        return (
          <div className="glass-panel p-2.5 sm:p-4 md:p-6 rounded-2xl sm:rounded-3xl shadow-2xl w-full mt-2 sm:mt-6">
            <EmailGenerator attachedImages={imagesForEmail} onAttachmentsChange={setImagesForEmail} />
          </div>
        );
      case 'Personal':
        return <PersonalTab />;
      case 'Finanzas':
        return <PersonalTab initialSubTab="finanzas" />;
      case 'Nutricion':
        return <PersonalTab initialSubTab="nutricion" />;
      case 'Bóveda':
      case 'Boveda':
        return <PersonalTab initialSubTab="boveda" />;
      case 'Workspace':
        return <WorkspaceHub />;
      case 'Base de Datos':
        return <DatabaseViewer />;
      case 'Herramientas Útiles':
        return <UsefulTools />;
      case 'Comandos':
        return <WorkspaceHub initialSubTab="comandos" />;
      case 'Calendario':
        return <CalendarTab />;
      case 'Credenciales':
        return <PersonalTab initialSubTab="boveda" initialBovedaTab="credenciales" />;
      case 'Notas':
        return <PersonalTab initialSubTab="boveda" initialBovedaTab="notas" />;
      case 'Impresión 3D':
        return <ThreeDPrinting />;
      case 'Teleprompter':
        return <TeleprompterTab />;
      case 'Cotizador':
        return <CotizadorTab />;
      case 'Listas':
        return <ListasTab />;
      case 'Compresor':
        return <CompresorTab />;
      case 'Bodega':
        return <BodegaTab />;
      case 'Edición':
      case 'Edicion':
        return <EdicionTab />;
      case 'WhatsApp':
      case 'Whatsapp':
        return <WhatsAppTab isActiveTab={activeTabId === tabId} onReturnToTab={() => setActiveTabId(tabId)} />;
      default:
        return (
          <div className="glass-panel p-2.5 sm:p-4 md:p-6 rounded-2xl sm:rounded-3xl shadow-2xl w-full mt-2 sm:mt-6">
            <EmailGenerator attachedImages={imagesForEmail} onAttachmentsChange={setImagesForEmail} />
          </div>
        );
    }
  };

  const tabIcons: Record<string, React.ReactNode> = {
    'Personal': <ShieldCheck />,
    'Archivos': <Folder />,
    'Bóveda': <Lock />,
    'Boveda': <Lock />,
    'Workspace': <FolderKanban />,
    'Generador de Email': <Mail />,
    'Generador de Imagen': <ImageIcon />,
    'Generador de Video': <Video />,
    'Image Editor': <Edit />,
    'Crítico Cineasta': <Clapperboard />,
    'Renders': <Box />,
    'Ingeniero': <Wrench />,
    'Base de Datos': <Database />,
    'Comandos': <Terminal />,
    'Calendario': <Calendar />,
    'Credenciales': <Lock />,
    'Dashboard': <LayoutDashboard />,
    'Finanzas': <TrendingUp />,
    'Notas': <Edit />,
    'Nutricion': <Heart />,
    'Impresión 3D': <Box />,
    'Teleprompter': <Music />,
    'Cotizador': <Calculator />,
    'Listas': <CheckSquare />,
    'Compresor': <Minimize2 />,
    'Bodega': <Archive />,
    'Edición': <Sliders />,
    'Edicion': <Sliders />,
    'WhatsApp': <MessageSquare />,
    'Whatsapp': <MessageSquare />,
  };

  const handleCloseNotification = (id: string) => {
    updateNotifications((config.notifications || []).map(n => 
      n.id === id ? { ...n, isRead: true } : n
    ));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-screen bg-transparent text-gray-100 font-sans overflow-hidden">
        <EditModeBanner />
        
        {/* Mobile overlay */}
        {leftSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setLeftSidebarOpen(false)}
          />
        )}

        {/* Sidebars container */}
        <div className={`fixed lg:static inset-y-0 left-0 z-50 flex h-full transform transition-transform duration-300 ease-in-out ${leftSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:hidden'}`}>
          <GoogleDock />

        </div>

        <div className="flex-1 flex flex-col overflow-y-auto h-full relative w-full lg:w-auto">
          <ShortcutListener />
          <div className="flex flex-col items-center p-2 sm:p-4 min-h-full pb-24 w-full"> 
              {/* DESKTOP HEADER (Large screens >= 1024px) */}
              <header className="hidden lg:flex w-full mb-2.5 pt-1.5 px-2 justify-between items-center gap-3">
                  {/* Floating Glass Capsule Header */}
                  <div className="w-full flex items-center justify-between gap-3 px-4 py-2 bg-gradient-to-r from-gray-950/80 via-gray-900/70 to-gray-950/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.4)] min-h-[66px]">
                    {/* Brand Logo with Renders HDR Studio (Clickable for Zen Mode & Maximum Height) */}
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
                      className="h-14 md:h-16 flex items-center shrink-0 cursor-pointer focus:outline-none group/logo"
                      title={leftSidebarOpen ? "Modo Zen Activo: Clic en el logo para restaurar barras laterales" : "Clic en el logo para Activar Modo Zen (Ocultar barras laterales)"}
                    >
                      <img 
                        src="/logo-rendershdr-studio.png" 
                        alt="Renders HDR Studio - Clic para Modo Zen" 
                        className={`h-full w-auto max-w-[240px] md:max-w-[300px] object-contain drop-shadow-[0_4px_14px_rgba(0,0,0,0.65)] transition-all ${leftSidebarOpen ? 'brightness-125 filter drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]' : 'hover:brightness-110'}`}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = '/logo-rendershdr-transparent.png';
                        }}
                      />
                    </motion.button>

                    {/* Modelos IA Principales (Gemini, ChatGPT, Claude) al lado del Logo Renders HDR */}
                    <div className="flex items-center gap-1.5 p-1 bg-white/[0.04] border border-white/10 rounded-2xl backdrop-blur-md shadow-inner shrink-0 ml-1">
                      {headerAiModels.map((ai) => (
                        <a
                          key={ai.id}
                          href={ai.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`relative flex items-center justify-center w-11 h-11 md:w-12 md:h-12 rounded-xl transition-all duration-300 group overflow-hidden border backdrop-blur-sm hover:-translate-y-0.5 active:translate-y-0 active:scale-95 ${ai.cardStyle}`}
                          title={ai.name}
                        >
                          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.15] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                          <div
                            className="w-6 h-6 md:w-7 md:h-7 flex-shrink-0 flex items-center justify-center transition-transform duration-200 group-hover:scale-115 relative z-10"
                            style={{ filter: ai.iconGlow }}
                            dangerouslySetInnerHTML={{ __html: ai.iconSvg }}
                          />
                          {/* Tooltip con nombre y glow */}
                          <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-gray-950/90 backdrop-blur-xl border border-white/15 text-white text-[11px] font-bold rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 shadow-[0_8px_25px_rgba(0,0,0,0.6)] scale-95 group-hover:scale-100 flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ai.dotColor}`} />
                            <span>{ai.name}</span>
                            <div className="absolute left-1/2 bottom-full -translate-x-1/2 translate-y-1 w-2 h-2 bg-gray-950/90 border-l border-t border-white/15 transform rotate-45" />
                          </div>
                        </a>
                      ))}
                    </div>

                    {/* Right-Shifted Reminder Display (Desplazado a la derecha junto al reloj) */}
                    <div className="hidden md:flex flex-1 max-w-xl ml-auto mr-2 justify-end">
                      <ReminderDisplay />
                    </div>

                    {/* Clock & Status Badge */}
                    <div className="hidden sm:flex items-center gap-2 shrink-0">
                      <div className="px-2.5 py-1.5 bg-white/[0.04] border border-white/10 rounded-xl backdrop-blur-md shadow-inner flex items-center gap-1.5 text-xs">
                        <Clock />
                      </div>
                    </div>

                    {/* Actions Toolbar */}
                    <div className="flex items-center gap-2 pl-2.5 border-l border-white/10 self-stretch">
                      {/* Botón Exclusivo de Entorno Local: Subir a Vercel */}
                      {isLocalHost && (
                        <motion.button
                          whileHover={{ scale: 1.04 }}
                          whileTap={{ scale: 0.96 }}
                          disabled={isDeploying}
                          onClick={handleDeployToVercel}
                          className="self-stretch flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600/35 via-teal-600/30 to-cyan-600/35 hover:from-emerald-600/55 hover:to-cyan-600/50 border border-emerald-500/40 text-emerald-200 hover:text-white transition-all shadow-md shadow-emerald-950/40 disabled:opacity-50"
                          title="Modo Local Activo: Clic para subir todos los cambios probados a Producción (Vercel)"
                        >
                          {isDeploying ? (
                            <>
                              <RefreshCw size={15} className="animate-spin text-emerald-400" />
                              <span className="text-xs sm:text-sm font-bold tracking-wide whitespace-nowrap">Subiendo a Vercel...</span>
                            </>
                          ) : (
                            <>
                              <UploadCloud size={16} className="text-emerald-400" />
                              <span className="text-xs sm:text-sm font-bold tracking-wide whitespace-nowrap">Subir a Vercel</span>
                              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse" />
                            </>
                          )}
                        </motion.button>
                      )}

                      {/* Global Quick Voice & Idea Capture Button - Grande a todo lo alto */}
                      <motion.button 
                        whileHover={{ scale: 1.04 }} 
                        whileTap={{ scale: 0.96 }} 
                        onClick={() => {
                          setQuickIdeaAutoStart(true);
                          setIsQuickIdeaOpen(true);
                        }} 
                        className="self-stretch flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600/35 via-pink-600/30 to-amber-500/25 hover:from-purple-600/55 hover:to-pink-600/45 border border-purple-500/40 text-purple-100 hover:text-white transition-all shadow-md shadow-purple-900/30" 
                        title="Captura Rápida de Ideas y Voz (Alt + I)"
                      >
                        <Mic size={18} className="text-pink-400 animate-pulse" />
                        <span className="text-xs sm:text-sm font-bold tracking-wide whitespace-nowrap">Grabar Idea</span>
                      </motion.button>

                      {/* 2x2 Action Icons Grid: Fila 1 = Configuración + Base de Datos | Fila 2 = Salvar + Actualizar */}
                      <div className="grid grid-cols-2 gap-1 shrink-0">
                        {/* Configuración / Personalizar */}
                        <motion.button 
                          whileHover={{ scale: 1.1 }} 
                          whileTap={{ scale: 0.92 }} 
                          onClick={toggleEditing} 
                          className={`p-1.5 rounded-lg transition-all flex items-center justify-center ${isEditing ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-gray-400 hover:text-white hover:bg-white/10'}`} 
                          title="Personalizar"
                        >
                          <Settings size={15} />
                        </motion.button>

                        {/* Base de Datos */}
                        <motion.button 
                          whileHover={{ scale: 1.1 }} 
                          whileTap={{ scale: 0.92 }} 
                          onClick={handleToggleDatabaseTab} 
                          className={`p-1.5 rounded-lg transition-all flex items-center justify-center ${
                            isDatabaseActive 
                              ? 'bg-blue-600 shadow-[0_0_12px_rgba(37,99,235,0.6)] text-white ring-2 ring-blue-400' 
                              : 'hover:bg-blue-500/20 text-blue-400'
                          }`} 
                          title={isDatabaseActive ? "Cerrar Base de Datos" : "Base de Datos & Cloud"}
                        >
                          <Database size={15} />
                        </motion.button>

                        {/* Guardar en la nube */}
                        <motion.button 
                          whileHover={{ scale: 1.1 }} 
                          whileTap={{ scale: 0.92 }} 
                          onClick={() => saveToSupabase(undefined, { showToast: true, immediate: true })} 
                          className="relative p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all flex items-center justify-center" 
                          title={
                            syncStatus === 'saving' 
                              ? 'Sincronizando con Supabase...' 
                              : syncStatus === 'error' 
                              ? 'Error al sincronizar. Clic para forzar guardado' 
                              : 'Todo guardado en la nube. Clic para forzar guardado'
                          }
                        >
                          <Save size={15} className={
                            syncStatus === 'saving' 
                              ? 'animate-pulse text-amber-400' 
                              : syncStatus === 'error' 
                              ? 'text-rose-400' 
                              : 'text-gray-300'
                          } />
                          {syncStatus === 'saving' && (
                            <span className="absolute top-1 right-1 flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                            </span>
                          )}
                          {syncStatus === 'synced' && (
                            <span className="absolute top-1 right-1 flex h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]"></span>
                          )}
                          {syncStatus === 'error' && (
                            <span className="absolute top-1 right-1 flex h-1.5 w-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.9)]"></span>
                          )}
                        </motion.button>

                        {/* Actualizar / Refresh */}
                        <motion.button 
                          whileHover={{ scale: 1.1 }} 
                          whileTap={{ scale: 0.92 }} 
                          onClick={fetchConfigFromSupabaseManual} 
                          className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all flex items-center justify-center" 
                          title="Actualizar datos desde la nube"
                        >
                          <RefreshCw size={15} />
                        </motion.button>
                      </div>
                    </div>
                  </div>
              </header>

              {/* MOBILE & GALAXY FOLD HEADER (< 1024px) */}
              <header className="flex lg:hidden w-full mb-1.5 pt-1 px-0.5 sm:px-1 justify-between items-center gap-1 sm:gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <button 
                      onClick={() => setLeftSidebarOpen(!leftSidebarOpen)} 
                      className="p-1.5 hover:bg-gray-800 rounded-xl text-gray-400 hover:text-white transition-colors shrink-0"
                      title="Menú lateral"
                    >
                      <Menu size={18} />
                    </button>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <img 
                        src="/logo-rendershdr-studio.png" 
                        alt="Renders HDR Studio" 
                        className="h-7 sm:h-8 w-auto max-w-[140px] object-contain drop-shadow-md"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = '/logo-rendershdr-transparent.png';
                        }}
                      />
                      {isFoldUnfolded && (
                        <span className="text-[8px] text-cyan-400 font-mono font-bold flex items-center gap-0.5">
                          <Maximize2 size={8} /> Fold
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                    {isLocalHost && (
                      <button
                        disabled={isDeploying}
                        onClick={handleDeployToVercel}
                        className="p-1.5 sm:p-2 text-emerald-300 hover:text-white bg-emerald-500/15 border border-emerald-500/30 rounded-xl flex items-center gap-1 text-[11px] font-bold"
                        title="Subir a Vercel"
                      >
                        {isDeploying ? (
                          <RefreshCw size={14} className="animate-spin text-emerald-400" />
                        ) : (
                          <>
                            <UploadCloud size={14} className="text-emerald-400" />
                            <span className="hidden xs:inline">Subir</span>
                          </>
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => window.dispatchEvent(new CustomEvent('open-global-search'))}
                      className="p-1.5 sm:p-2 text-purple-300 hover:text-white bg-purple-500/10 border border-purple-500/20 rounded-xl"
                      title="Buscar (Ctrl+K)"
                    >
                      <Search size={16} />
                    </button>
                    <button 
                      onClick={() => saveToSupabase(undefined, { showToast: true, immediate: true })} 
                      className="relative p-1.5 sm:p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-xl"
                      title="Guardar en la nube"
                    >
                      <Save size={16} className={syncStatus === 'saving' ? 'animate-pulse text-amber-400' : syncStatus === 'error' ? 'text-rose-400' : 'text-gray-300'} />
                      {syncStatus === 'synced' && <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-emerald-400"></span>}
                      {syncStatus === 'saving' && <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping"></span>}
                      {syncStatus === 'error' && <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-rose-500"></span>}
                    </button>
                    <button 
                      onClick={toggleEditing} 
                      className="p-1.5 sm:p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl"
                      title="Personalizar"
                    >
                      <Settings size={16} />
                    </button>
                    <button 
                      onClick={handleToggleDatabaseTab} 
                      className={`p-1.5 sm:p-2 rounded-xl ${isDatabaseActive ? 'bg-blue-600 text-white' : 'text-blue-400 hover:bg-blue-500/20'}`}
                      title="Base de Datos"
                    >
                      <Database size={16} />
                    </button>
                    <button 
                      onClick={fetchConfigFromSupabaseManual} 
                      className="p-1.5 sm:p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl"
                      title="Actualizar"
                    >
                      <RefreshCw size={16} />
                    </button>
                  </div>
              </header>
              
              <div className="w-full flex-grow">
                  <main className="w-full pb-8">
                      {/* DESKTOP NAVIGATION TABS (>= 1024px) */}
                      <nav className="hidden lg:flex w-full mb-2 flex-wrap justify-center gap-1.5 items-center">
                          <SortableContext 
                            items={config.tabs.filter(t => t.isVisible && !isDbTab(t) && !isRenderTab(t)).map(t => t.id)} 
                            strategy={horizontalListSortingStrategy}
                          >
                            {config.tabs.filter(t => t.isVisible && !isDbTab(t) && !isRenderTab(t)).map((tab, index) => (
                              <SortableTab 
                                  key={tab.id}
                                  tab={tab}
                                  index={index}
                                  activeTabId={activeTabId}
                                  setActiveTabId={setActiveTabId}
                                  isEditing={isEditing}
                                  handleMoveTab={handleMoveTab}
                                  editingTabId={editingTabId}
                                  tempTabName={tempTabName}
                                  setTempTabName={setTempTabName}
                                  saveTabName={saveTabName}
                                  startEditingTab={startEditingTab}
                                  handleDeleteTab={handleDeleteTab}
                                  tabIcons={tabIcons}
                              />
                            ))}
                          </SortableContext>
                          
                          {isEditing && (
                              <button
                                  onClick={handleAddTab}
                                  className="flex items-center gap-2 px-4 py-2 bg-green-600/20 hover:bg-green-600/40 text-green-400 rounded-lg transition-colors border border-green-600/30 ml-2"
                              >
                                  <Plus size={18} />
                                  <span>Nueva Pestaña</span>
                              </button>
                          )}
                      </nav>

                      {/* MOBILE FIRST ACTION: Botón de Audio para Apuntes y Dictado Rápido a Listas Remb */}
                      <div className="flex lg:hidden w-full mb-3 px-1">
                        <div className="w-full bg-gradient-to-r from-purple-950/85 via-slate-900/90 to-indigo-950/85 border border-purple-500/40 rounded-2xl p-2.5 sm:p-3 shadow-[0_4px_25px_rgba(168,85,247,0.25)] flex items-center justify-between gap-2.5 backdrop-blur-md">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-pink-600 to-amber-500 p-0.5 shadow-md shadow-pink-500/30 shrink-0">
                              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                                <Mic size={20} className="text-pink-400 animate-pulse" />
                              </div>
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-xs sm:text-sm font-black text-white truncate flex items-center gap-1.5">
                                Dictar Apunte a tus Listas
                                <Sparkles size={13} className="text-amber-400 shrink-0" />
                              </h3>
                              <p className="text-[10px] text-zinc-400 truncate">
                                Habla para organizar en Trabajo, Casa, Compras...
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setQuickIdeaAutoStart(true);
                              setIsQuickIdeaOpen(true);
                            }}
                            className="shrink-0 px-3.5 py-2 bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 active:scale-95 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-600/40 flex items-center gap-1.5 transition-all cursor-pointer border border-purple-400/30"
                            title="Dictar Apunte por Voz"
                          >
                            <Mic size={15} className="text-amber-300 animate-pulse" />
                            <span>Dictar</span>
                          </button>
                        </div>
                      </div>

                      {/* MOBILE & GALAXY FOLD RESPONSIVE TABS BAR (< 1024px) */}
                      <nav className="flex lg:hidden w-full mb-3 px-1">
                        {isFoldUnfolded ? (
                          /* Galaxy Fold Desplegado: Vista en Rejilla optimizada para pantalla casi cuadrada (~4:3) */
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 w-full">
                            {config.tabs.filter(t => t.isVisible && !isDbTab(t) && !isRenderTab(t)).map((tab) => (
                              <TabButton
                                key={tab.id}
                                label={tab.label}
                                isActive={activeTabId === tab.id}
                                icon={tab.type === 'system' ? tabIcons[tab.componentKey || ''] : <FolderKanban size={16} />}
                                onClick={() => setActiveTabId(tab.id)}
                                className="w-full justify-center text-xs py-2 px-2.5 truncate"
                              />
                            ))}
                          </div>
                        ) : (
                          /* Galaxy Fold Plegado & Celulares normales: Cinta deslizable horizontalmente (Swipe ribbon) */
                          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 w-full scroll-smooth">
                            {config.tabs.filter(t => t.isVisible && !isDbTab(t) && !isRenderTab(t)).map((tab) => (
                              <TabButton
                                key={tab.id}
                                label={tab.label}
                                isActive={activeTabId === tab.id}
                                icon={tab.type === 'system' ? tabIcons[tab.componentKey || ''] : <FolderKanban size={16} />}
                                onClick={() => setActiveTabId(tab.id)}
                                className="whitespace-nowrap shrink-0 text-xs py-2 px-3"
                              />
                            ))}
                          </div>
                        )}
                      </nav>
                      
                      <LinksBar />

                      <div className="w-full flex-grow">
                        {/* Keep-Alive Visited Tabs Container */}
                        {(visitedTabIds.includes(activeTabId) ? visitedTabIds : [...visitedTabIds, activeTabId]).map((tabId) => {
                          const isActive = activeTabId === tabId;
                          return (
                            <div
                              key={tabId}
                              className={isActive ? 'w-full h-full block animate-fade-in' : 'hidden'}
                              aria-hidden={!isActive}
                            >
                              <Suspense fallback={<TabLoadingFallback />}>
                                {renderSingleTab(tabId)}
                              </Suspense>
                            </div>
                          );
                        })}

                      </div>
                  </main>
              </div>
          </div>
        </div>

        


        {/* Pancho Assistant Modal */}
        <AnimatePresence>
          {isAssistantOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={`fixed top-14 sm:top-16 ${
                leftSidebarOpen ? 'lg:left-[96px]' : 'lg:left-6'
              } left-2 sm:left-4 w-[calc(100vw-16px)] sm:w-[480px] max-w-[480px] h-[78vh] sm:h-[680px] glass-panel-heavy rounded-3xl shadow-2xl flex flex-col z-50 overflow-hidden ring-1 ring-white/10 pointer-events-auto`}
            >
              <Suspense fallback={<TabLoadingFallback message="Cargando a Pancho 🐶..." />}>
                <PanchoAssistantModal 
                  onClose={() => setIsAssistantOpen(false)}
                  activeTabId={activeTabId}
                  setActiveTabId={setActiveTabId}
                  panchoState={panchoState}
                  setPanchoState={setPanchoState}
                />
              </Suspense>
            </motion.div>
          )}
        </AnimatePresence>

        <CalculatorWidget />

        <GoogleApiConfigModal />
        <NotificationManager />
        <NotificationOverlay 
          notifications={config.notifications || []} 
          onClose={handleCloseNotification} 
        />

        {/* Global Quick Idea Modal */}
        <GlobalQuickIdeaModal 
          isOpen={isQuickIdeaOpen} 
          onClose={() => {
            setIsQuickIdeaOpen(false);
            setQuickIdeaAutoStart(false);
          }}
          autoStart={quickIdeaAutoStart} 
        />

        {/* Mobile Ergonomic Bottom Navigation Bar */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-gray-950/90 backdrop-blur-xl border-t border-white/10 px-2 py-1.5 flex items-center justify-around pb-[max(0.4rem,env(safe-area-inset-bottom))] shadow-[0_-4px_25px_rgba(0,0,0,0.5)]">
          <button
            onClick={() => setActiveTabId('email-gen')}
            className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all ${
              activeTabId === 'email-gen' ? 'text-pink-400' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Mail size={18} />
            <span className="text-[10px] font-medium mt-0.5">Email</span>
          </button>

          <button
            onClick={() => setActiveTabId('personal')}
            className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all ${
              activeTabId === 'personal' || activeTabId === 'finanzas' || activeTabId === 'nutricion' || activeTabId === 'credenciales' || activeTabId === 'notas'
                ? 'text-purple-400' 
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <ShieldCheck size={18} />
            <span className="text-[10px] font-medium mt-0.5">Personal</span>
          </button>

          {/* Central Quick Voice & Idea Capture Button */}
          <button
            onClick={() => {
              setQuickIdeaAutoStart(true);
              setIsQuickIdeaOpen(true);
            }}
            className="flex flex-col items-center justify-center -mt-5 bg-gradient-to-tr from-purple-600 via-pink-600 to-amber-500 text-white p-3.5 rounded-full shadow-[0_0_20px_rgba(236,72,153,0.5)] border-2 border-gray-950 transform active:scale-95 transition-all"
            title="Grabar Idea Rápida"
          >
            <Mic size={20} className="animate-pulse" />
          </button>

          <button
            onClick={() => setActiveTabId('listas')}
            className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all ${
              activeTabId === 'listas' ? 'text-blue-400' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <CheckSquare size={18} />
            <span className="text-[10px] font-medium mt-0.5">Listas</span>
          </button>

          <button
            onClick={() => setActiveTabId('calendar')}
            className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all ${
              activeTabId === 'calendar' ? 'text-amber-400' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Calendar size={18} />
            <span className="text-[10px] font-medium mt-0.5">Agenda</span>
          </button>

          <button
            onClick={() => setActiveTabId('3d-print')}
            className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all ${
              activeTabId === '3d-print' ? 'text-cyan-400' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Box size={18} />
            <span className="text-[10px] font-medium mt-0.5">3D</span>
          </button>
        </div>
      </div>
    </DndContext>
  );
};

const App: React.FC = () => {
  return (
    <LinkProvider>
      <Toaster theme="dark" position="bottom-right" richColors />
      <GlobalSearch />
      <MainLayout />
      <PwaInstallPrompt />
    </LinkProvider>
  );
};

export default App;
