import React, { useState } from 'react';
import { useLinks } from '../contexts/LinkContext';
import { LinkItem } from '../types';
import { LinkEditorModal } from './common/LinkEditorModal';
import { Edit, Trash2, Plus } from 'lucide-react';
import { SortableLinkList } from './common/SortableLinkList';
import { verticalListSortingStrategy } from '@dnd-kit/sortable';

const AiSidebarItem: React.FC<{ 
    item: LinkItem; 
    isEditing: boolean;
    onEdit: (item: LinkItem) => void;
    onDelete: (id: string) => void;
}> = ({ item, isEditing, onEdit, onDelete }) => {
    return (
        <div className="relative group">
            <a 
                href={item.href} 
                target="_blank" 
                rel="noopener noreferrer" 
                onClick={(e) => isEditing && e.preventDefault()}
                className={`flex items-center gap-3 p-3 rounded-2xl transition-all duration-300 hover:bg-white/10 border border-transparent hover:border-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] group ${item.colorClass} ${isEditing ? 'opacity-50 cursor-default' : ''}`}
            >
                <div 
                    className="w-8 h-8 flex-shrink-0 flex items-center justify-center transition-transform group-hover:scale-110" 
                    style={{
                        filter: item.outlineColor && item.outlineWidth ? `drop-shadow(0 0 ${item.outlineWidth}px ${item.outlineColor})` : undefined
                    }}
                    dangerouslySetInnerHTML={{ __html: item.iconSvg }} 
                />
                <span className="font-semibold text-gray-400 group-hover:text-white">{item.name}</span>
            </a>
            {isEditing && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 z-30">
                    <button 
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); onEdit(item); }}
                        className="p-1.5 bg-blue-600 rounded-full text-white hover:bg-blue-500 shadow-md pointer-events-auto"
                        title="Editar"
                    >
                        <Edit size={14} />
                    </button>
                    <button 
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); onDelete(item.id); }}
                        className="p-1.5 bg-red-600 rounded-full text-white hover:bg-red-500 shadow-md pointer-events-auto"
                        title="Eliminar"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            )}
        </div>
    );
};

interface AiSidebarProps {
    isOpen: boolean;
}

const AiSidebar: React.FC<AiSidebarProps> = ({ isOpen }) => {
    const { config, updateConfig, isEditing } = useLinks();
    const [modalOpen, setModalOpen] = useState(false);
    const [currentLink, setCurrentLink] = useState<LinkItem | null>(null);
    const [activeSection, setActiveSection] = useState<'models' | 'quickAccess'>('models');

    const handleSaveLink = (item: LinkItem, targetSection?: string) => {
        let newConfig = JSON.parse(JSON.stringify(config)); // Deep clone
        const currentSec = `aiSidebar.${activeSection}`;
        
        // If moving to a different section
        if (targetSection && targetSection !== currentSec) {
            // Remove from current
            newConfig.aiSidebar[activeSection] = newConfig.aiSidebar[activeSection].filter((l: LinkItem) => l.id !== item.id);
            
            // Add to target
            if (targetSection === 'linksBar') {
                newConfig.linksBar.push(item);
            } else if (targetSection === 'googleDock') {
                newConfig.googleDock.push(item);
            } else if (targetSection.startsWith('aiSidebar')) {
                const sub = targetSection.split('.')[1] as 'models' | 'quickAccess';
                newConfig.aiSidebar[sub].push(item);
            } else if (targetSection.startsWith('rightSidebar')) {
                const idx = parseInt(targetSection.split('.')[1]);
                newConfig.rightSidebar[idx].items.push(item);
            } else if (targetSection.startsWith('tab:')) {
                const tabId = targetSection.split(':')[1];
                const tabIndex = newConfig.tabs.findIndex((t: any) => t.id === tabId);
                if (tabIndex >= 0) {
                    if (!newConfig.tabs[tabIndex].items) {
                        newConfig.tabs[tabIndex].items = [];
                    }
                    newConfig.tabs[tabIndex].items.push(item);
                }
            } else if (targetSection.startsWith('usefulTools.')) {
                const idx = parseInt(targetSection.split('.')[1]);
                if (newConfig.usefulTools[idx]) {
                    newConfig.usefulTools[idx].items.push(item);
                }
            }
        } else {
            // Standard update or add within same section
            let list = [...newConfig.aiSidebar[activeSection]];
            if (currentLink) {
                list = list.map(l => l.id === item.id ? item : l);
            } else {
                list.push({ ...item, id: item.id || Date.now().toString() });
            }
            newConfig.aiSidebar[activeSection] = list;
        }
        
        updateConfig(newConfig);
        setModalOpen(false);
        setCurrentLink(null);
    };

    const handleDeleteLink = (id: string, section: 'models' | 'quickAccess') => {
        const newConfig = { ...config };
        newConfig.aiSidebar = {
            ...newConfig.aiSidebar,
            [section]: newConfig.aiSidebar[section].filter(l => l.id !== id)
        };
        updateConfig(newConfig);
    };

    const openModal = (section: 'models' | 'quickAccess', item?: LinkItem) => {
        setActiveSection(section);
        setCurrentLink(item || null);
        setModalOpen(true);
    };

    return (
        <aside className={`w-64 glass-panel-heavy border-r border-white/5 flex-col shrink-0 overflow-hidden relative z-40 transition-all duration-300 flex shadow-2xl`}>
            <div className="overflow-y-auto custom-scrollbar h-full flex flex-col">
                
                {/* Sección IAS */}
                <div className="sticky top-0 z-10 bg-black/40 backdrop-blur-xl border-b border-white/5 p-4 mb-2 flex justify-between items-center">
                    <h2 className="text-xs font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">
                        Modelos IA
                    </h2>
                    {isEditing && (
                        <button onClick={() => openModal('models')} className="text-green-500 hover:text-green-400">
                            <Plus size={16} />
                        </button>
                    )}
                </div>
                
                <nav className="flex flex-col gap-1 px-3 pb-4">
                    <SortableLinkList 
                        id="aiSidebar.models"
                        items={config.aiSidebar.models}
                        isEditing={isEditing}
                        onReorder={(newItems) => updateConfig({ ...config, aiSidebar: { ...config.aiSidebar, models: newItems } })}
                        strategy={verticalListSortingStrategy}
                        className="flex flex-col gap-1"
                        renderItem={(item) => (
                            <AiSidebarItem 
                                key={item.id} 
                                item={item} 
                                isEditing={isEditing}
                                onEdit={(i) => openModal('models', i)}
                                onDelete={(id) => handleDeleteLink(id, 'models')}
                            />
                        )}
                    />
                </nav>

                {/* Sección Más Útiles */}
                <div className="sticky top-0 z-10 bg-black/40 backdrop-blur-xl border-y border-white/5 p-4 mt-2 mb-2 flex justify-between items-center">
                    <h2 className="text-xs font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500">
                        Accesos Rápidos
                    </h2>
                    {isEditing && (
                        <button onClick={() => openModal('quickAccess')} className="text-green-500 hover:text-green-400">
                            <Plus size={16} />
                        </button>
                    )}
                </div>

                <nav className="flex flex-col gap-1 px-3 pb-6">
                    <SortableLinkList 
                        id="aiSidebar.quickAccess"
                        items={config.aiSidebar.quickAccess}
                        isEditing={isEditing}
                        onReorder={(newItems) => updateConfig({ ...config, aiSidebar: { ...config.aiSidebar, quickAccess: newItems } })}
                        strategy={verticalListSortingStrategy}
                        className="flex flex-col gap-1"
                        renderItem={(item) => (
                            <AiSidebarItem 
                                key={item.id} 
                                item={item} 
                                isEditing={isEditing}
                                onEdit={(i) => openModal('quickAccess', i)}
                                onDelete={(id) => handleDeleteLink(id, 'quickAccess')}
                            />
                        )}
                    />
                </nav>
            </div>

            <LinkEditorModal 
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSave={handleSaveLink}
                initialItem={currentLink}
                currentSection={`aiSidebar.${activeSection}`}
            />
        </aside>
    );
};

export default AiSidebar;
