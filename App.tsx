
import React, { useState, useCallback, useEffect, lazy, Suspense } from 'react';
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
  Heart
} from 'lucide-react';
import { Tab, TabConfig, LinkItem } from './types';
import { AnimatePresence, motion } from 'motion/react';
import TabButton from './components/common/TabButton';

// Lazy-loaded tab components for optimized startup performance and reduced memory footprint
const VideoGenerator = lazy(() => import('./components/VideoGenerator'));
const EmailGenerator = lazy(() => import('./components/EmailGenerator'));
const TextToSpeech = lazy(() => import('./components/TextToSpeech'));
const Whiteboard = lazy(() => import('./components/Whiteboard'));
const Renders = lazy(() => import('./components/Renders'));
const Prompts = lazy(() => import('./components/Prompts'));
const Engineer = lazy(() => import('./components/Engineer'));
const CommandsTab = lazy(() => import('./components/CommandsTab'));
const UsefulTools = lazy(() => import('./components/UsefulTools'));
const Credenciales = lazy(() => import('./components/Credenciales'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const Finanzas = lazy(() => import('./components/Finanzas'));
const DatabaseViewer = lazy(() => import('./components/DatabaseViewer'));
const CustomTabContent = lazy(() => import('./components/CustomTabContent'));
const CalendarTab = lazy(() => import('./components/CalendarTab'));
const NotesTab = lazy(() => import('./components/NotesTab'));
const Nutricion = lazy(() => import('./components/Nutricion'));
const ThreeDPrinting = lazy(() => import('./components/ThreeDPrinting'));
const CalendarAiAssistant = lazy(() => import('./components/CalendarAiAssistant'));

import LinksBar from './components/LinksBar';
import AiSidebar from './components/AiSidebar';
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
import { Toaster } from 'sonner';
import { GlobalSearch } from './components/GlobalSearch';
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
  const [previousActiveTabId, setPreviousActiveTabId] = useState<string>('email-gen');

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
  const [assistantMessages, setAssistantMessages] = useState<Message[]>([]);

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

  const renderContent = () => {
    if (activeTabId === 'database' || isDbTab({ id: activeTabId })) {
      return <DatabaseViewer />;
    }
    const activeTab = config.tabs.find(t => t.id === activeTabId);
    if (!activeTab) return null;

    if (activeTab.type === 'custom') {
      return <CustomTabContent tab={activeTab} />;
    }

    // System tabs mapping
    switch (activeTab.componentKey) {
      case 'Generador de Email':
        return (
          <div className="glass-panel p-6 rounded-3xl shadow-2xl w-full mt-8">
            <EmailGenerator attachedImages={imagesForEmail} onAttachmentsChange={setImagesForEmail} />
          </div>
        );
      case 'Renders':
        return <Renders />;
      case 'Ingeniero':
        return <Engineer />;
      case 'Base de Datos':
        return <DatabaseViewer />;
      case 'Herramientas Útiles':
        return <UsefulTools />;
      case 'Comandos':
        return <CommandsTab />;
      case 'Calendario':
        return <CalendarTab />;
      case 'Credenciales':
        return <Credenciales />;
      case 'Dashboard':
        return <Dashboard />;
      case 'Finanzas':
        return <Finanzas />;
      case 'Notas':
        return <NotesTab />;
      case 'Nutricion':
        return <Nutricion />;
      case 'Generador de Video':
        return <VideoGenerator />;
      case 'Impresión 3D':
        return <ThreeDPrinting />;
      default:
        return (
          <div className="glass-panel p-6 rounded-3xl shadow-2xl w-full mt-8">
            <EmailGenerator attachedImages={imagesForEmail} onAttachmentsChange={setImagesForEmail} />
          </div>
        );
    }
  };

  const tabIcons: Record<string, React.ReactNode> = {
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
          <AiSidebar isOpen={true} /> {/* Always show inside the container when container is visible */}
        </div>

        <div className="flex-1 flex flex-col overflow-y-auto h-full relative w-full lg:w-auto">
          <ShortcutListener />
          <div className="flex flex-col items-center p-4 min-h-full pb-24"> 
              <header className="w-full max-w-screen-2xl mb-6 pt-4 px-2 md:px-6 flex justify-between items-center gap-2">
                  <button 
                    onClick={() => setLeftSidebarOpen(!leftSidebarOpen)} 
                    className="lg:hidden p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
                  >
                    <Menu size={24} />
                  </button>
                  <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 truncate">
                    Rembrandt IA Studio
                  </h1>
                  <div className="hidden md:block flex-1 mx-8">
                    <ReminderDisplay />
                  </div>
                  <div className="hidden sm:block">
                    <Clock />
                  </div>
                  <div className="flex flex-row md:flex-col gap-1 ml-auto">
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setLeftSidebarOpen(!leftSidebarOpen)} className={`hidden lg:block p-1.5 rounded-lg transition-colors ${leftSidebarOpen ? 'bg-purple-600 shadow-[0_0_15px_rgba(147,51,234,0.5)] text-white' : 'hover:bg-white/10'}`} title="Modo Zen (Colapsar Barras)">
                      <LayoutDashboard size={18} />
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={toggleEditing} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" title="Personalizar">
                      <Settings size={18} />
                    </motion.button>
                    <motion.button 
                      whileHover={{ scale: 1.1 }} 
                      whileTap={{ scale: 0.9 }} 
                      onClick={handleToggleDatabaseTab} 
                      className={`p-1.5 rounded-lg transition-all ${
                        isDatabaseActive 
                          ? 'bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.6)] text-white ring-2 ring-blue-400' 
                          : 'hover:bg-blue-500/20 text-blue-400'
                      }`} 
                      title={isDatabaseActive ? "Cerrar Base de Datos" : "Base de Datos & Cloud (Supabase, Google APIs, Vercel, GitHub)"}
                    >
                      <Database size={18} />
                    </motion.button>
                    <motion.button 
                      whileHover={{ scale: 1.1 }} 
                      whileTap={{ scale: 0.9 }} 
                      onClick={() => saveToSupabase(undefined, { showToast: true, immediate: true })} 
                      className="relative p-1.5 hover:bg-white/10 rounded-lg transition-colors" 
                      title={
                        syncStatus === 'saving' 
                          ? 'Sincronizando con Supabase...' 
                          : syncStatus === 'error' 
                          ? 'Error al sincronizar. Clic para forzar guardado' 
                          : 'Todo guardado en la nube. Clic para forzar guardado'
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
                        <span className="absolute top-1 right-1 flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                        </span>
                      )}
                      {syncStatus === 'synced' && (
                        <span className="absolute top-1 right-1 flex h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"></span>
                      )}
                      {syncStatus === 'error' && (
                        <span className="absolute top-1 right-1 flex h-2 w-2 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)]"></span>
                      )}
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={fetchConfigFromSupabaseManual} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" title="Actualizar">
                      <RefreshCw size={18} />
                    </motion.button>
                  </div>
              </header>
              
              <div className="w-full max-w-screen-2xl flex-grow">
                  <main className="w-full pb-8">
                      <nav className="w-full mb-4 flex flex-wrap justify-center gap-2 items-center">
                          <SortableContext 
                            items={config.tabs.filter(t => t.isVisible && !isDbTab(t)).map(t => t.id)} 
                            strategy={horizontalListSortingStrategy}
                          >
                            {config.tabs.filter(t => t.isVisible && !isDbTab(t)).map((tab, index) => (
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
                      
                      <LinksBar />

                      <div className="w-full flex-grow">
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={activeTabId}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="w-full h-full"
                          >
                            <Suspense fallback={<TabLoadingFallback />}>
                              {renderContent()}
                            </Suspense>
                          </motion.div>
                        </AnimatePresence>
                      </div>
                  </main>
              </div>
          </div>
        </div>

        
        {/* Floating Assistant Button */}
        {!isAssistantOpen && (
          <motion.button
            whileHover={{ scale: 1.1, boxShadow: "0px 0px 20px rgba(147, 51, 234, 0.6)" }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsAssistantOpen(true)}
            className="fixed bottom-6 right-6 p-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full shadow-2xl z-50 pointer-events-auto"
            title="Abrir Asistente IA"
          >
            <MessageSquare size={24} />
          </motion.button>
        )}

        {/* Assistant Component */}
        <AnimatePresence>
          {isAssistantOpen && (
            <motion.div 
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.9 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-4 right-4 w-[450px] h-[650px] glass-panel-heavy rounded-3xl shadow-2xl flex flex-col z-40 overflow-hidden ring-1 ring-white/10"
            >
              <Suspense fallback={<TabLoadingFallback message="Cargando asistente..." />}>
                <CalendarAiAssistant onClose={() => setIsAssistantOpen(false)} />
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
    </LinkProvider>
  );
};

export default App;
