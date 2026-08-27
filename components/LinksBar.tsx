import React, { useState, useRef } from 'react';
import { LinkItem } from '../types';
import { Edit, Trash2, Plus, Save, Upload, Check, Settings, Star, RefreshCw, ChevronLeft, ChevronRight, CloudDownload, CloudUpload } from 'lucide-react';
import { useLinks } from '../contexts/LinkContext';
import { LinkEditorModal } from './common/LinkEditorModal';
import { SortableLinkList } from './common/SortableLinkList';
import { rectSortingStrategy } from '@dnd-kit/sortable';

const LinkIcon: React.FC<{ 
    item: LinkItem; 
    isEditing: boolean; 
    onEdit: (item: LinkItem) => void; 
    onDelete: (id: string) => void; 
    onMove: (id: string, direction: 'left' | 'right') => void;
    isFirst: boolean;
    isLast: boolean;
}> = ({ item, isEditing, onEdit, onDelete, onMove, isFirst, isLast }) => {
    const hasBg = item.hasBackground !== false;
    return (
        <div className="relative group flex items-center justify-center flex-1 max-w-[50px] min-w-[24px]">
            {isEditing && !isFirst && (
                <button onClick={() => onMove(item.id, 'left')} className="absolute -left-3 z-40 p-1 bg-gray-700 rounded-full text-white hover:bg-gray-600 shadow-md">
                    <ChevronLeft size={12} />
                </button>
            )}
            <a 
                href={item.href} 
                target="_blank" 
                rel="noopener noreferrer" 
                onClick={(e) => isEditing && e.preventDefault()}
                className={`flex items-center justify-center w-full aspect-square max-w-[48px] max-h-[48px] min-w-[26px] min-h-[26px] rounded-xl sm:rounded-2xl transition-all duration-300 group ${item.colorClass} hover:scale-[1.18] hover:-translate-y-1 ${isEditing ? 'opacity-100 cursor-default' : ''} ${hasBg ? 'bg-white/5 hover:bg-white/10 hover:shadow-[0_4px_15px_rgba(255,255,255,0.08)] border border-white/10' : ''} [&_svg]:w-[58%] [&_svg]:h-[58%] [&_svg]:max-w-[26px] [&_svg]:max-h-[26px] [&_img]:w-[62%] [&_img]:h-[62%] [&_img]:max-w-[28px] [&_img]:max-h-[28px] [&_img]:object-contain`}
                title={item.name}
                style={{
                    filter: item.outlineColor && item.outlineWidth ? `drop-shadow(0 0 ${item.outlineWidth}px ${item.outlineColor})` : undefined
                }}
                dangerouslySetInnerHTML={{ __html: item.iconSvg }}
            />
            {/* Tooltip */}
            {!isEditing && (
                <div className="absolute bottom-full mb-2.5 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-black/90 backdrop-blur border border-white/10 text-white text-[11px] font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-[100] shadow-xl translate-y-1 group-hover:translate-y-0">
                    {item.name}
                    <div className="absolute left-1/2 top-full -translate-x-1/2 -translate-y-1 w-1.5 h-1.5 bg-black/90 border-r border-b border-white/10 transform rotate-45"></div>
                </div>
            )}
            {isEditing && !isLast && (
                <button onClick={() => onMove(item.id, 'right')} className="absolute -right-3 z-40 p-1 bg-gray-700 rounded-full text-white hover:bg-gray-600 shadow-md">
                    <ChevronRight size={12} />
                </button>
            )}
            {isEditing && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex gap-1 z-30">
                    <button 
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); onEdit(item); }}
                        className="p-1.5 bg-blue-600 rounded-full text-white hover:bg-blue-500 shadow-md pointer-events-auto"
                        title="Editar"
                    >
                        <Edit size={12} />
                    </button>
                    <button 
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); onDelete(item.id); }}
                        className="p-1.5 bg-red-600 rounded-full text-white hover:bg-red-500 shadow-md pointer-events-auto"
                        title="Eliminar"
                    >
                        <Trash2 size={12} />
                    </button>
                </div>
            )}
        </div>
    );
};

const LinksBar: React.FC = () => {
    const { config, updateConfig, saveConfigToFile, loadConfigFromFile, saveAsDefault, saveToSupabase, resetToDefaults, fetchConfigFromSupabaseManual, isEditing, toggleEditing, configFilename, setConfigFilename } = useLinks();
    const [modalOpen, setModalOpen] = useState(false);
    const [currentLink, setCurrentLink] = useState<LinkItem | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSaveLink = (item: LinkItem, targetSection?: string) => {
        let newConfig = JSON.parse(JSON.stringify(config)); // Deep clone
        const currentSec = 'linksBar';
        
        // If moving to a different section
        if (targetSection && targetSection !== currentSec) {
            // Remove from current
            newConfig.linksBar = newConfig.linksBar.filter((l: LinkItem) => l.id !== item.id);
            
            // Add to target
            if (targetSection === 'googleDock') {
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
            let newLinks = [...newConfig.linksBar];
            if (currentLink) {
                newLinks = newLinks.map(l => l.id === item.id ? item : l);
            } else {
                newLinks.push({ ...item, id: item.id || Date.now().toString() });
            }
            newConfig.linksBar = newLinks;
        }
        
        updateConfig(newConfig);
        setModalOpen(false);
        setCurrentLink(null);
    };

    const handleMoveLink = (id: string, direction: 'left' | 'right') => {
        const newLinks = [...config.linksBar];
        const index = newLinks.findIndex(l => l.id === id);
        if (index === -1) return;
        
        if (direction === 'left' && index > 0) {
            [newLinks[index - 1], newLinks[index]] = [newLinks[index], newLinks[index - 1]];
        } else if (direction === 'right' && index < newLinks.length - 1) {
            [newLinks[index], newLinks[index + 1]] = [newLinks[index + 1], newLinks[index]];
        }
        updateConfig({ ...config, linksBar: newLinks });
    };

    const handleDeleteLink = (id: string) => {
        const newLinks = config.linksBar.filter(l => l.id !== id);
        updateConfig({ ...config, linksBar: newLinks });
    };

    const handleImportJson = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            loadConfigFromFile(file);
            event.target.value = '';
        }
    };

    return (
        <div className="w-full bg-black/30 backdrop-blur-xl border border-white/5 p-3.5 sm:p-4.5 mb-6 relative group/bar shadow-2xl rounded-2xl">
            {/* Edit Controls - Always visible for better discovery */}
            <div className="absolute top-4 right-4 flex flex-col gap-2 z-50">
            </div>

            {isEditing && (
                <div className="absolute top-2 left-2 flex flex-col gap-2 z-20">
                    <div className="flex gap-2 animate-fade-in">
                        <button 
                            onClick={() => { setCurrentLink(null); setModalOpen(true); }}
                            className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-full shadow-lg"
                        >
                            <Plus size={14} /> Nuevo
                        </button>
                        <button 
                            onClick={saveAsDefault}
                            className="flex items-center gap-1 px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white text-xs rounded-full shadow-lg"
                            title="Guardar esta configuración como predeterminada solo en este navegador"
                        >
                            <Star size={14} /> Fijar Local
                        </button>
                        <button 
                            onClick={resetToDefaults}
                            className="flex items-center gap-1 px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-xs rounded-full shadow-lg"
                            title="Restablecer configuración original"
                        >
                            <RefreshCw size={14} /> Restablecer
                        </button>
                        <button 
                            onClick={saveConfigToFile}
                            className="flex items-center gap-1 px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white text-xs rounded-full shadow-lg"
                        >
                            <Save size={14} /> Descargar JSON
                        </button>
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-1 px-3 py-1 bg-orange-600 hover:bg-orange-500 text-white text-xs rounded-full shadow-lg"
                        >
                            <Upload size={14} /> Cargar JSON
                        </button>
                        <div className="flex items-center gap-1 bg-gray-800 rounded-full px-2 py-1 shadow-lg border border-gray-700">
                            <span className="text-[10px] text-gray-400 font-bold ml-1">NUBE:</span>
                            <input 
                                type="text" 
                                value={configFilename} 
                                onChange={(e) => setConfigFilename(e.target.value)}
                                className="bg-transparent text-white text-xs outline-none w-32 px-1 border-b border-gray-600 focus:border-teal-500 transition-colors"
                                placeholder="rembrandt_config.json"
                            />
                            <button 
                                onClick={() => saveToSupabase()}
                                className="flex items-center gap-1 px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-full"
                                title="Guardar configuración actual en Supabase y fijarla como predeterminada"
                            >
                                <CloudUpload size={12} /> Guardar
                            </button>
                            <button 
                                onClick={() => fetchConfigFromSupabaseManual()}
                                className="flex items-center gap-1 px-2 py-0.5 bg-teal-600 hover:bg-teal-500 text-white text-xs rounded-full"
                                title="Cargar configuración desde Supabase"
                            >
                                <CloudDownload size={12} /> Cargar
                            </button>
                        </div>
                    </div>
                    <p className="text-[10px] text-amber-400 font-medium ml-2">
                        * Usa "Guardar" en la sección NUBE para respaldar en Supabase y que se autocargue al iniciar.
                    </p>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleImportJson} 
                        accept=".json" 
                        className="hidden" 
                    />
                </div>
            )}

            <div className={`flex flex-col items-center gap-4 max-w-full mx-auto w-full px-1 ${isEditing ? 'mt-12' : 'mt-0.5'}`}>
                <SortableLinkList 
                    id="linksBar"
                    items={config.linksBar}
                    isEditing={isEditing}
                    onReorder={(newItems) => updateConfig({ ...config, linksBar: newItems })}
                    strategy={rectSortingStrategy}
                    className="flex flex-nowrap items-center justify-between sm:justify-center gap-1 sm:gap-2 md:gap-2.5 lg:gap-3 xl:gap-3.5 w-full py-1 overflow-x-hidden"
                    renderItem={(link, index) => (
                        <LinkIcon 
                            key={link.id} 
                            item={link} 
                            isEditing={isEditing}
                            onEdit={(item) => { setCurrentLink(item); setModalOpen(true); }}
                            onDelete={handleDeleteLink}
                            onMove={handleMoveLink}
                            isFirst={index === 0}
                            isLast={index === config.linksBar.length - 1}
                        />
                    )}
                />
                
                {config.linksBar.length === 0 && (
                    <div className="text-gray-500 text-sm italic">No hay enlaces configurados.</div>
                )}
            </div>

            <LinkEditorModal 
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSave={handleSaveLink}
                initialItem={currentLink}
                currentSection="linksBar"
            />
        </div>
    );
};

export default LinksBar;
