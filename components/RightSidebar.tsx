import React, { useState } from 'react';
import { useLinks } from '../contexts/LinkContext';
import { LinkItem } from '../types';
import { LinkEditorModal } from './common/LinkEditorModal';
import { Edit, Trash2, Plus } from 'lucide-react';
import { SortableLinkList } from './common/SortableLinkList';
import { verticalListSortingStrategy } from '@dnd-kit/sortable';

const ToolItem: React.FC<{ 
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
                className={`flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800 transition-colors group ${item.colorClass} ${isEditing ? 'opacity-50 cursor-default' : ''}`}
            >
                <div 
                    className="w-8 h-8 flex-shrink-0" 
                    style={{
                        filter: item.outlineColor && item.outlineWidth ? `drop-shadow(0 0 ${item.outlineWidth}px ${item.outlineColor})` : undefined
                    }}
                    dangerouslySetInnerHTML={{ __html: item.iconSvg }} 
                />
                <div className="flex flex-col overflow-hidden">
                    <span className="text-sm font-medium text-gray-200 group-hover:text-white truncate">{item.name}</span>
                    <span className="text-xs text-gray-500 truncate">{item.description}</span>
                </div>
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

const RightSidebar: React.FC = () => {
    const { config, updateConfig, isEditing } = useLinks();
    const [modalOpen, setModalOpen] = useState(false);
    const [currentLink, setCurrentLink] = useState<LinkItem | null>(null);
    const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

    const handleSaveLink = (item: LinkItem, targetSection?: string) => {
        let newConfig = JSON.parse(JSON.stringify(config)); // Deep clone
        const sectionIndex = newConfig.rightSidebar.findIndex((s: any) => s.id === activeSectionId);
        const currentSec = `rightSidebar.${sectionIndex}`;
        
        // If moving to a different section
        if (targetSection && targetSection !== currentSec) {
            // Remove from current
            if (sectionIndex !== -1) {
                newConfig.rightSidebar[sectionIndex].items = newConfig.rightSidebar[sectionIndex].items.filter((l: LinkItem) => l.id !== item.id);
            }
            
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
                if (newConfig.rightSidebar[idx]) {
                    newConfig.rightSidebar[idx].items.push(item);
                }
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
            if (sectionIndex !== -1) {
                let items = [...newConfig.rightSidebar[sectionIndex].items];
                if (currentLink) {
                    items = items.map((l: LinkItem) => l.id === item.id ? item : l);
                } else {
                    items.push({ ...item, id: item.id || Date.now().toString() });
                }
                newConfig.rightSidebar[sectionIndex].items = items;
            }
        }
        
        updateConfig(newConfig);
        setModalOpen(false);
        setCurrentLink(null);
    };

    const handleDeleteLink = (itemId: string, sectionId: string) => {
        const newConfig = { ...config };
        const sectionIndex = newConfig.rightSidebar.findIndex(s => s.id === sectionId);
        if (sectionIndex !== -1) {
            newConfig.rightSidebar[sectionIndex] = {
                ...newConfig.rightSidebar[sectionIndex],
                items: newConfig.rightSidebar[sectionIndex].items.filter(l => l.id !== itemId)
            };
            updateConfig(newConfig);
        }
    };

    const openModal = (sectionId: string, item?: LinkItem) => {
        setActiveSectionId(sectionId);
        setCurrentLink(item || null);
        setModalOpen(true);
    };

    const handleReorder = (sectionId: string, newItems: LinkItem[]) => {
        const newRightSidebar = config.rightSidebar.map(s => 
            s.id === sectionId ? { ...s, items: newItems } : s
        );
        updateConfig({ ...config, rightSidebar: newRightSidebar });
    };

    return (
        <aside className="w-64 bg-gray-900 border-l border-gray-800 flex flex-col hidden xl:flex h-full shrink-0 overflow-hidden relative z-40">
            <div className="overflow-y-auto custom-scrollbar h-full flex flex-col p-3 gap-6">
                {config.rightSidebar.map(section => (
                    <div key={section.id}>
                        <div className="flex justify-between items-center mb-2 px-2">
                            <div>
                                <h2 className={`text-sm font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r ${section.gradient}`}>
                                    {section.title}
                                </h2>
                                <span className="text-[10px] text-gray-500 font-medium tracking-wider uppercase block mt-0.5">
                                    {section.subtitle}
                                </span>
                            </div>
                            {isEditing && (
                                <button onClick={() => openModal(section.id)} className="text-green-500 hover:text-green-400">
                                    <Plus size={16} />
                                </button>
                            )}
                        </div>
                        <SortableLinkList 
                            id={`rightSidebar.${config.rightSidebar.findIndex(s => s.id === section.id)}`}
                            items={section.items}
                            isEditing={isEditing}
                            onReorder={(newItems) => handleReorder(section.id, newItems)}
                            strategy={verticalListSortingStrategy}
                            className="flex flex-col gap-1"
                            renderItem={(item) => (
                                <ToolItem 
                                    key={item.id} 
                                    item={item} 
                                    isEditing={isEditing}
                                    onEdit={(i) => openModal(section.id, i)}
                                    onDelete={(id) => handleDeleteLink(id, section.id)}
                                />
                            )}
                        />
                    </div>
                ))}
            </div>

            <LinkEditorModal 
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSave={handleSaveLink}
                initialItem={currentLink}
                currentSection={`rightSidebar.${config.rightSidebar.findIndex(s => s.id === activeSectionId)}`}
            />
        </aside>
    );
};

export default RightSidebar;
