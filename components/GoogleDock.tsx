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
    const isGemini = item.id === 'gd-1';

    return (
        <div className={`relative group flex items-center w-full py-2 ${isEditing ? 'px-2 justify-start' : 'justify-center'}`}>
            <a 
                href={item.href} 
                target="_blank" 
                rel="noopener noreferrer" 
                onClick={(e) => isEditing && e.preventDefault()}
                className={`relative flex items-center justify-center w-12 h-12 rounded-[1.25rem] transition-all duration-300 hover:scale-[1.15] hover:-translate-y-1 group ${item.colorClass} ${isEditing ? 'opacity-100 cursor-default' : ''} ${isGemini ? 'bg-gradient-to-br from-[#6366f1] via-[#a855f7] to-[#ec4899] shadow-[0_4px_20px_rgba(168,85,247,0.5)] border border-white/30' : 'bg-white/5 hover:bg-white/10 hover:shadow-[0_4px_15px_rgba(255,255,255,0.05)] border border-white/5'}`}
                title={item.name}
            >
                {isGemini && (
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/0 via-white/30 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-shimmer pointer-events-none" />
                )}
                
                <div 
                    className={`${isGemini ? 'w-8 h-8' : 'w-6 h-6'} flex items-center justify-center relative z-10`} 
                    style={{
                        filter: item.outlineColor && item.outlineWidth ? `drop-shadow(0 0 ${item.outlineWidth}px ${item.outlineColor})` : (isGemini ? 'drop-shadow(0 0 8px rgba(255,255,255,0.5))' : undefined)
                    }}
                    dangerouslySetInnerHTML={{ __html: item.iconSvg }} 
                />
                
                {/* Tooltip - Positioned above to avoid horizontal clipping */}
                {!isEditing && (
                    <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/80 backdrop-blur border border-white/10 text-white text-xs font-bold rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap z-[100] shadow-[0_10px_30px_rgba(0,0,0,0.5)] translate-y-2 group-hover:-translate-y-1">
                        {item.name}
                        <div className="absolute left-1/2 top-full -translate-x-1/2 -translate-y-1 w-2 h-2 bg-black/80 border-r border-b border-white/10 transform rotate-45"></div>
                    </div>
                )}
            </a>
            {isEditing && (
                <div className="ml-2 flex gap-1 z-30">
                    <button 
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); onEdit(item); }}
                        className="p-2 bg-blue-600 rounded-full text-white hover:bg-blue-500 shadow-lg pointer-events-auto"
                        title="Editar"
                    >
                        <Edit size={14} />
                    </button>
                    <button 
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); onDelete(item.id); }}
                        className="p-2 bg-red-600 rounded-full text-white hover:bg-red-500 shadow-lg pointer-events-auto"
                        title="Eliminar"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            )}
        </div>
    );
};

const GoogleDock: React.FC = () => {
    const { config, updateConfig, isEditing } = useLinks();
    const [modalOpen, setModalOpen] = useState(false);
    const [currentLink, setCurrentLink] = useState<LinkItem | null>(null);

    const handleSaveLink = (item: LinkItem, targetSection?: string) => {
        let newConfig = JSON.parse(JSON.stringify(config)); // Deep clone
        const currentSec = 'googleDock';
        
        // If moving to a different section
        if (targetSection && targetSection !== currentSec) {
            // Remove from current
            newConfig.googleDock = newConfig.googleDock.filter((l: LinkItem) => l.id !== item.id);
            
            // Add to target
            if (targetSection === 'linksBar') {
                newConfig.linksBar.push(item);
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
            let newLinks = [...newConfig.googleDock];
            if (currentLink) {
                newLinks = newLinks.map(l => l.id === item.id ? item : l);
            } else {
                newLinks.push({ ...item, id: item.id || Date.now().toString() });
            }
            newConfig.googleDock = newLinks;
        }
        
        updateConfig(newConfig);
        setModalOpen(false);
        setCurrentLink(null);
    };

    const handleDeleteLink = (id: string) => {
        const newLinks = config.googleDock.filter(l => l.id !== id);
        updateConfig({ ...config, googleDock: newLinks });
    };

    return (
        <aside className={`glass-panel-heavy border-r border-white/5 flex flex-col items-center py-5 h-full shrink-0 z-50 relative transition-all duration-500 shadow-2xl ${isEditing ? 'w-32' : 'w-20'}`}>
            {/* Logo or Header - Google G Link */}
            <div className="relative group mb-6 flex justify-center w-full">
                <a 
                    href="https://www.google.com" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="w-10 h-10 flex items-center justify-center hover:scale-110 transition-transform duration-200"
                    title="Google"
                >
                     <svg viewBox="0 0 24 24" className="w-8 h-8">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                     </svg>
                </a>
                {/* Tooltip */}
                <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/80 backdrop-blur border border-white/10 text-white text-xs font-bold rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap z-[100] shadow-[0_10px_30px_rgba(0,0,0,0.5)] translate-y-2 group-hover:-translate-y-1">
                    Google
                    <div className="absolute left-1/2 top-full -translate-x-1/2 -translate-y-1 w-2 h-2 bg-black/80 border-r border-b border-white/10 transform rotate-45"></div>
                </div>
            </div>

            {isEditing && (
                <button 
                    onClick={() => { setCurrentLink(null); setModalOpen(true); }}
                    className="mb-4 p-2 bg-green-600 rounded-full text-white hover:bg-green-500 shadow-lg"
                    title="Agregar Nuevo"
                >
                    <Plus size={16} />
                </button>
            )}

            <div className="flex-1 w-full overflow-y-auto custom-scrollbar flex flex-col items-center gap-1 scroll-smooth pb-4">
                <SortableLinkList 
                    id="googleDock"
                    items={config.googleDock}
                    isEditing={isEditing}
                    onReorder={(newItems) => updateConfig({ ...config, googleDock: newItems })}
                    strategy={verticalListSortingStrategy}
                    className="flex flex-col items-center w-full gap-1"
                    renderItem={(item) => (
                        <ToolItem 
                            key={item.id} 
                            item={item} 
                            isEditing={isEditing}
                            onEdit={(i) => { setCurrentLink(i); setModalOpen(true); }}
                            onDelete={handleDeleteLink}
                        />
                    )}
                />
            </div>

            <LinkEditorModal 
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSave={handleSaveLink}
                initialItem={currentLink}
                currentSection="googleDock"
            />
        </aside>
    );
};

export default GoogleDock;
