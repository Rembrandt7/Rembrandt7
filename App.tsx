
import React, { useState, useCallback, useEffect } from 'react';
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
import VideoGenerator from './components/VideoGenerator';
import EmailGenerator from './components/EmailGenerator';
import MessageImprover from './components/MessageImprover';
import TextToSpeech from './components/TextToSpeech';
import Whiteboard from './components/Whiteboard';
import Renders from './components/Renders';
import Prompts from './components/Prompts';
import Engineer from './components/Engineer';
import CommandsTab from './components/CommandsTab';
import UsefulTools from './components/UsefulTools';
import Credenciales from './components/Credenciales';
import Dashboard from './components/Dashboard';
import Finanzas from './components/Finanzas';
import LinksBar from './components/LinksBar';
import AiSidebar from './components/AiSidebar';
import CalculatorWidget from './components/CalculatorWidget';
import GoogleDock from './components/GoogleDock'; 
import DatabaseViewer from './components/DatabaseViewer'; 
import Clock from './components/common/Clock';
import ReminderDisplay from './components/common/ReminderDisplay';
import ShortcutListener from './components/ShortcutListener';
import { EditModeBanner } from './components/common/EditModeBanner';
import { ReferenceImage } from './components/common/ReferenceImageManager';
import CustomTabContent from './components/CustomTabContent';
import CalendarTab from './components/CalendarTab';
import NotesTab from './components/NotesTab';
import Nutricion from './components/Nutricion';
import CalendarAiAssistant from './components/CalendarAiAssistant';
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

const MainLayout: React.FC = () => {
  const { config, updateConfig, isEditing, toggleEditing, saveToSupabase, fetchConfigFromSupabaseManual, updateNotifications } = useLinks();
  const [activeTabId, setActiveTabId] = useState<string>('email-gen');
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
      const currentTabExists = config.tabs.some(t => t.id === activeTabId);
      if (!currentTabExists) {
        setActiveTabId(config.tabs[0].id);
      }
      
      // Auto-rename Dashboard tab to Noticias if it's still named Dashboard
      const dashboardTab = config.tabs.find(t => t.componentKey === 'Dashboard' && t.label === 'Dashboard');
      if (dashboardTab) {
        const newTabs = config.tabs.map(t => 
          t.id === dashboardTab.id ? { ...t, label: 'Noticias' } : t
        );
        updateConfig({ ...config, tabs: newTabs });
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
    const activeTab = config.tabs.find(t => t.id === activeTabId);
    if (!activeTab) return null;

    if (activeTab.type === 'custom') {
      return <CustomTabContent tab={activeTab} />;
    }

    // System tabs mapping
    switch (activeTab.componentKey) {
      case 'Generador de Email':
        return (
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full flex flex-col lg:flex-row items-stretch gap-0 mt-8">
            <div className="flex-1 min-w-0 pr-6">
              <EmailGenerator attachedImages={imagesForEmail} onAttachmentsChange={setImagesForEmail} />
            </div>
            <div className="w-full lg:w-[450px] shrink-0 border-l border-gray-700 pl-6">
              <MessageImprover />
            </div>
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
      default:
        return (
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full flex flex-col lg:flex-row items-stretch gap-0 mt-8">
            <div className="flex-1 min-w-0 pr-6">
              <EmailGenerator attachedImages={imagesForEmail} onAttachmentsChange={setImagesForEmail} />
            </div>
            <div className="w-full lg:w-[450px] shrink-0 border-l border-gray-700 pl-6">
              <MessageImprover />
            </div>
          </div>
        );
    }
  };

  const tabIcons: Record<string, React.ReactNode> = {
    'Generador de Email': <Mail />,
    'Generador de Imagen': <ImageIcon />,
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
      <div className="flex h-screen bg-gray-900 text-gray-100 font-sans overflow-hidden">
        <EditModeBanner />
        
        {/* Mobile overlay */}
        {leftSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
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
                    <button onClick={() => setLeftSidebarOpen(!leftSidebarOpen)} className={`hidden lg:block p-1 rounded transition-colors ${leftSidebarOpen ? 'bg-purple-600 text-white' : 'hover:bg-gray-700'}`} title="Modo Zen (Colapsar Barras)">
                      <LayoutDashboard size={16} />
                    </button>
                    <button onClick={toggleEditing} className="p-1 hover:bg-gray-700 rounded transition-colors" title="Personalizar">
                      <Settings size={16} />
                    </button>
                    <button onClick={() => saveToSupabase()} className="p-1 hover:bg-gray-700 rounded transition-colors" title="Guardar Cambios">
                      <Save size={16} />
                    </button>
                    <button onClick={fetchConfigFromSupabaseManual} className="p-1 hover:bg-gray-700 rounded transition-colors" title="Actualizar">
                      <RefreshCw size={16} />
                    </button>
                  </div>
              </header>
              
              <div className="w-full max-w-screen-2xl flex-grow">
                  <main className="w-full pb-8">
                      <nav className="w-full mb-4 flex flex-wrap justify-center gap-2 items-center">
                          <SortableContext 
                            items={config.tabs.filter(t => t.isVisible).map(t => t.id)} 
                            strategy={horizontalListSortingStrategy}
                          >
                            {config.tabs.filter(t => t.isVisible).map((tab, index) => (
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
                            {renderContent()}
                          </motion.div>
                        </AnimatePresence>
                      </div>
                  </main>
              </div>
          </div>
        </div>

        <CalculatorWidget />
        
        {/* Floating Assistant Button */}
        {!isAssistantOpen && (
          <button
            onClick={() => setIsAssistantOpen(true)}
            className="fixed bottom-6 right-6 p-4 bg-purple-600 hover:bg-purple-500 text-white rounded-full shadow-2xl z-50 transition-transform hover:scale-110"
            title="Abrir Asistente IA"
          >
            <MessageSquare size={24} />
          </button>
        )}

        {/* Assistant Component */}
        {isAssistantOpen && (
          <div className="fixed bottom-4 right-4 w-[450px] h-[650px] bg-gray-800 rounded-2xl shadow-2xl flex flex-col border border-gray-700 z-50 animate-fade-in overflow-hidden ring-1 ring-white/10">
            <CalendarAiAssistant onClose={() => setIsAssistantOpen(false)} />
          </div>
        )}

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
