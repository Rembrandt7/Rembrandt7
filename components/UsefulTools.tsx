import React, { useState } from 'react';
import { useLinks } from '../contexts/LinkContext';
import { LinkItem } from '../types';
import { LinkEditorModal } from './common/LinkEditorModal';
import { Edit, Trash2, Plus } from 'lucide-react';
import { SortableLinkList } from './common/SortableLinkList';
import { rectSortingStrategy } from '@dnd-kit/sortable';
import { toast } from 'sonner';

const ToolCard: React.FC<{ 
    item: LinkItem; 
    isEditing: boolean;
    onEdit: (item: LinkItem) => void;
    onDelete: (id: string) => void;
    count: number;
}> = ({ item, isEditing, onEdit, onDelete, count }) => {
    const isSmall = count > 6;
    const isVerySmall = count > 8;
    return (
        <div className="relative group h-full">
            <a 
                href={item.href} 
                target="_blank" 
                rel="noopener noreferrer" 
                className={`group relative flex flex-col items-center justify-center p-2 bg-gray-800 rounded-xl hover:bg-gray-700 transition-all duration-300 border border-gray-700 hover:border-gray-500 hover:shadow-2xl hover:-translate-y-1 w-full h-full ${isSmall ? 'min-h-[80px]' : 'min-h-[120px]'} ${item.colorClass} ${isEditing ? 'opacity-50 pointer-events-none' : ''}`}
            >
                <div 
                    className={`mb-2 transform transition-transform group-hover:scale-110 duration-300 ${isVerySmall ? 'w-8 h-8' : isSmall ? 'w-10 h-10' : 'w-14 h-14'} flex items-center justify-center [&>svg]:w-full [&>svg]:h-full`} 
                    style={{
                        filter: item.outlineColor && item.outlineWidth ? `drop-shadow(0 0 ${item.outlineWidth}px ${item.outlineColor})` : undefined
                    }}
                    dangerouslySetInnerHTML={{ __html: item.iconSvg }} 
                />
                <h3 className={`mt-1 ${isVerySmall ? 'text-[10px]' : isSmall ? 'text-xs' : 'text-sm'} font-bold text-white text-center leading-tight truncate w-full`}>{item.name}</h3>
            </a>
            <div className="absolute top-1 right-1 flex gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(item); }}
                    className="p-1 bg-blue-600 rounded-full text-white hover:bg-blue-500 shadow-md"
                >
                    <Edit size={10} />
                </button>
                <button 
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(item.id); }}
                    className="p-1 bg-red-600 rounded-full text-white hover:bg-red-500 shadow-md"
                >
                    <Trash2 size={10} />
                </button>
            </div>
        </div>
    );
};

const UsefulTools: React.FC = () => {
    const { config, updateConfig, isEditing } = useLinks();
    const [modalOpen, setModalOpen] = useState(false);
    const [currentLink, setCurrentLink] = useState<LinkItem | null>(null);
    const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

    const handleSaveLink = (item: LinkItem, targetSection?: string) => {
        updateConfig((prev) => {
            const newConfig = JSON.parse(JSON.stringify(prev));
            
            // Find current section if we're editing
            const currentSectionIndex = newConfig.usefulTools.findIndex((s: any) => s.id === activeSectionId);
            const currentSecPath = currentSectionIndex !== -1 ? `usefulTools.${currentSectionIndex}` : null;
            
            // Determine where to add/update
            const finalTarget = targetSection || currentSecPath || 'linksBar';
            
            let isNew = false;
            let targetName = '';

            // If moving or adding to a different panel
            if (currentSecPath && finalTarget !== currentSecPath) {
                // Remove from current
                newConfig.usefulTools[currentSectionIndex].items = newConfig.usefulTools[currentSectionIndex].items.filter((l: LinkItem) => l.id !== item.id);
            }
            
            // Add/Update in target
            if (finalTarget === 'linksBar') {
                targetName = 'Barra Central';
                const idx = newConfig.linksBar.findIndex((l: any) => l.id === item.id);
                if (idx !== -1) newConfig.linksBar[idx] = item;
                else { newConfig.linksBar.push({ ...item, id: item.id || `link-${Date.now()}` }); isNew = true; }
            } else if (finalTarget === 'googleDock') {
                targetName = 'Google Dock';
                const idx = newConfig.googleDock.findIndex((l: any) => l.id === item.id);
                if (idx !== -1) newConfig.googleDock[idx] = item;
                else { newConfig.googleDock.push({ ...item, id: item.id || `gd-${Date.now()}` }); isNew = true; }
            } else if (finalTarget.startsWith('aiSidebar')) {
                const sub = finalTarget.split('.')[1] as 'models' | 'quickAccess';
                targetName = sub === 'models' ? 'Modelos IA' : 'Acceso Rápido';
                const idx = newConfig.aiSidebar[sub].findIndex((l: any) => l.id === item.id);
                if (idx !== -1) newConfig.aiSidebar[sub][idx] = item;
                else { newConfig.aiSidebar[sub].push({ ...item, id: item.id || `ai-${Date.now()}` }); isNew = true; }
            } else if (finalTarget.startsWith('rightSidebar')) {
                const idx = parseInt(finalTarget.split('.')[1]);
                if (newConfig.rightSidebar[idx]) {
                    targetName = newConfig.rightSidebar[idx].title;
                    const itemIdx = newConfig.rightSidebar[idx].items.findIndex((l: any) => l.id === item.id);
                    if (itemIdx !== -1) newConfig.rightSidebar[idx].items[itemIdx] = item;
                    else { newConfig.rightSidebar[idx].items.push({ ...item, id: item.id || `rs-${Date.now()}` }); isNew = true; }
                }
            } else if (finalTarget.startsWith('usefulTools.')) {
                const idx = parseInt(finalTarget.split('.')[1]);
                if (newConfig.usefulTools[idx]) {
                    targetName = newConfig.usefulTools[idx].title;
                    const itemIdx = newConfig.usefulTools[idx].items.findIndex((l: any) => l.id === item.id);
                    
                    if (itemIdx !== -1) {
                        newConfig.usefulTools[idx].items[itemIdx] = item;
                    } else {
                        // Check for limit of 9
                        if (newConfig.usefulTools[idx].items.length >= 9) {
                            alert(`La sección "${targetName}" ya tiene el máximo de 9 herramientas.`);
                            return prev; // Cancel update
                        }
                        newConfig.usefulTools[idx].items.push({ ...item, id: item.id || `ut-item-${Date.now()}` }); 
                        isNew = true; 
                    }
                }
            } else if (finalTarget.startsWith('tab:')) {
                const tabId = finalTarget.split(':')[1];
                const tabIdx = newConfig.tabs.findIndex((t: any) => t.id === tabId);
                if (tabIdx !== -1) {
                    targetName = `Pestaña ${newConfig.tabs[tabIdx].label}`;
                    if (!newConfig.tabs[tabIdx].items) newConfig.tabs[tabIdx].items = [];
                    const itemIdx = newConfig.tabs[tabIdx].items.findIndex((l: any) => l.id === item.id);
                    if (itemIdx !== -1) newConfig.tabs[tabIdx].items[itemIdx] = item;
                    else { newConfig.tabs[tabIdx].items.push({ ...item, id: item.id || `tab-item-${Date.now()}` }); isNew = true; }
                }
            }
            
            if (isNew) {
                toast.success(`¡Herramienta "${item.name}" añadida a ${targetName}!`);
            }

            return newConfig;
        });
        
        setModalOpen(false);
        setCurrentLink(null);
    };

    const handleDeleteLink = (itemId: string, sectionId: string) => {
        updateConfig((prev) => {
            const newConfig = JSON.parse(JSON.stringify(prev));
            const sectionIndex = newConfig.usefulTools.findIndex((s: any) => s.id === sectionId);
            if (sectionIndex !== -1) {
                newConfig.usefulTools[sectionIndex].items = newConfig.usefulTools[sectionIndex].items.filter((l: any) => l.id !== itemId);
            }
            return newConfig;
        });
    };

    const openModal = (sectionId: string, item?: LinkItem) => {
        setActiveSectionId(sectionId);
        setCurrentLink(item || null);
        setModalOpen(true);
    };

    const handleAddSection = () => {
        try {
            console.log("Attempting to add section...");
            const title = window.prompt('Título de la nueva sección:');
            if (title === null) {
                console.log("Add section cancelled by user.");
                return;
            }
            
            const finalTitle = title.trim() || 'Nueva Sección';
            console.log("Adding section with title:", finalTitle);
            
            updateConfig((prev) => {
                const currentUsefulTools = Array.isArray(prev.usefulTools) ? [...prev.usefulTools] : [];
                const newSection = {
                    id: `ut-${Date.now()}`,
                    title: finalTitle,
                    gradient: 'from-blue-400 to-indigo-600',
                    iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>',
                    items: []
                };
                
                const updatedConfig = {
                    ...prev,
                    usefulTools: [...currentUsefulTools, newSection]
                };
                
                return updatedConfig;
            });

            // Feedback to user
            toast.success(`¡Sección "${finalTitle}" añadida!`);

        } catch (error) {
            console.error("Error adding section:", error);
            toast.error("Hubo un error al intentar añadir la sección. Revisa la consola para más detalles.");
        }
    };

    const handleEditSection = (sectionId: string) => {
        const section = config.usefulTools.find(s => s.id === sectionId);
        if (!section) return;
        
        const newTitle = window.prompt('Nuevo título:', section.title);
        if (newTitle === null) return;
        
        updateConfig((prev) => ({
            ...prev,
            usefulTools: prev.usefulTools.map(s => 
                s.id === sectionId ? { ...s, title: newTitle.trim() || s.title } : s
            )
        }));
    };

    const handleDeleteSection = (sectionId: string) => {
        updateConfig((prev) => ({
            ...prev,
            usefulTools: prev.usefulTools.filter(s => s.id !== sectionId)
        }));
    };

    const handleReorder = (sectionId: string, newItems: LinkItem[]) => {
        updateConfig((prev) => ({
            ...prev,
            usefulTools: prev.usefulTools.map(s => 
                s.id === sectionId ? { ...s, items: newItems } : s
            )
        }));
    };

    const sectionIndex = config.usefulTools.findIndex(s => s.id === activeSectionId);
    const modalCurrentSection = sectionIndex !== -1 ? `usefulTools.${sectionIndex}` : undefined;

    return (
        <div className="w-full p-4 overflow-y-auto min-h-full">
            {isEditing && (
                <div className="mb-6 flex justify-center">
                    <button 
                        onClick={handleAddSection}
                        className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl shadow-lg transition-all transform hover:scale-105 active:scale-95"
                    >
                        <Plus size={20} />
                        Nueva Sección de Herramientas
                    </button>
                </div>
            )}
            {/* Grid: 3 columns on desktop (3x3 if there are 9 sections) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
                {config.usefulTools.map((section, idx) => (
                    <div 
                        key={section.id} 
                        className="bg-gray-900/40 border border-gray-800 hover:border-gray-600 rounded-2xl p-5 flex flex-col shadow-xl transition-colors duration-300 min-h-[380px]"
                    >
                        {/* Header de la Sección */}
                        <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-800">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <span className="text-white opacity-80 p-2 bg-gray-800 rounded-lg flex-shrink-0" dangerouslySetInnerHTML={{ __html: section.iconSvg || '' }} />
                                <h2 className={`text-xl font-black text-transparent bg-clip-text bg-gradient-to-r ${section.gradient} truncate`}>
                                    {section.title}
                                </h2>
                            </div>
                            <div className="flex items-center gap-1">
                                {isEditing && (
                                    <>
                                        <button onClick={() => handleEditSection(section.id)} className="text-blue-500 hover:text-blue-400 p-1 transition-colors" title="Editar Título">
                                            <Edit size={16} />
                                        </button>
                                        <button onClick={() => handleDeleteSection(section.id)} className="text-red-500 hover:text-red-400 p-1 transition-colors" title="Eliminar Sección">
                                            <Trash2 size={16} />
                                        </button>
                                        <button 
                                            onClick={() => openModal(section.id)} 
                                            className={`p-1 transition-colors ${section.items.length >= 9 ? 'text-gray-600 cursor-not-allowed' : 'text-green-500 hover:text-green-400'}`} 
                                            title={section.items.length >= 9 ? "Límite de 9 herramientas alcanzado" : "Agregar Herramienta"}
                                            disabled={section.items.length >= 9}
                                        >
                                            <Plus size={20} />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Grid de Herramientas dentro de la tarjeta */}
                        <div className="flex-grow flex flex-col">
                            {(() => {
                                const count = section.items.length;
                                const gridCols = count <= 1 ? 'grid-cols-1' : count === 2 ? 'grid-cols-2' : count === 4 ? 'grid-cols-2' : 'grid-cols-3';
                                return (
                                    <SortableLinkList 
                                        id={`usefulTools.${idx}`}
                                        items={section.items}
                                        isEditing={isEditing}
                                        onReorder={(newItems) => handleReorder(section.id, newItems)}
                                        strategy={rectSortingStrategy}
                                        className={`grid ${gridCols} gap-3 content-start min-h-[100px]`}
                                        renderItem={(tool) => (
                                            <ToolCard 
                                                key={tool.id} 
                                                item={tool} 
                                                isEditing={isEditing}
                                                count={count}
                                                onEdit={(i) => openModal(section.id, i)}
                                                onDelete={(id) => handleDeleteLink(id, section.id)}
                                            />
                                        )}
                                    >
                                    </SortableLinkList>
                                );
                            })()}
                            
                            {section.items.length === 0 && !isEditing && (
                                <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-xs italic pointer-events-none">
                                    Sección vacía
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <LinkEditorModal 
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSave={handleSaveLink}
                initialItem={currentLink}
                currentSection={modalCurrentSection}
            />
        </div>
    );
};

export default UsefulTools;
