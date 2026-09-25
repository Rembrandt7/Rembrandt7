import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLinks } from '../contexts/LinkContext';
import { LinkItem } from '../types';
import { LinkEditorModal } from './common/LinkEditorModal';
import { Edit, Trash2, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { SortableLinkList } from './common/SortableLinkList';
import { horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { toast } from 'sonner';

const ToolCard: React.FC<{ 
    item: LinkItem; 
    isEditing: boolean;
    onEdit: (item: LinkItem) => void;
    onDelete: (id: string) => void;
    count?: number;
}> = ({ item, isEditing, onEdit, onDelete }) => {
    return (
        <div className="relative group w-[68px] h-[68px] sm:w-[74px] sm:h-[74px] flex-shrink-0">
            <a 
                href={item.href} 
                target="_blank" 
                rel="noopener noreferrer" 
                className={`group relative flex flex-col items-center justify-center p-1 bg-gray-800/80 hover:bg-gray-700/90 rounded-lg transition-all duration-200 border border-gray-700/70 hover:border-gray-500 hover:shadow-md hover:-translate-y-0.5 w-full h-full ${item.colorClass || ''} ${isEditing ? 'opacity-50 pointer-events-none' : ''}`}
            >
                <div 
                    className="w-6 h-6 sm:w-7 sm:h-7 mb-0.5 transform transition-transform group-hover:scale-110 duration-200 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full flex-shrink-0" 
                    style={{
                        filter: item.outlineColor && item.outlineWidth ? `drop-shadow(0 0 ${item.outlineWidth}px ${item.outlineColor})` : undefined
                    }}
                    dangerouslySetInnerHTML={{ __html: item.iconSvg }} 
                />
                <h3 className="text-[9.5px] sm:text-[10.5px] font-semibold text-white text-center leading-tight truncate w-full px-0.5">{item.name}</h3>
            </a>
            <div className="absolute top-0.5 right-0.5 flex gap-0.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(item); }}
                    className="p-0.5 bg-blue-600 rounded-full text-white hover:bg-blue-500 shadow-md"
                    title="Editar"
                >
                    <Edit size={8} />
                </button>
                <button 
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(item.id); }}
                    className="p-0.5 bg-red-600 rounded-full text-white hover:bg-red-500 shadow-md"
                    title="Eliminar"
                >
                    <Trash2 size={8} />
                </button>
            </div>
        </div>
    );
};

interface ToolSectionPanelProps {
    section: {
        id: string;
        title: string;
        gradient?: string;
        iconSvg?: string;
        items: LinkItem[];
    };
    idx: number;
    isEditing: boolean;
    onEditSection: (id: string) => void;
    onDeleteSection: (id: string) => void;
    onOpenModal: (sectionId: string, item?: LinkItem) => void;
    onDeleteLink: (itemId: string, sectionId: string) => void;
    onReorder: (sectionId: string, newItems: LinkItem[]) => void;
}

const ToolSectionPanel: React.FC<ToolSectionPanelProps> = ({
    section,
    idx,
    isEditing,
    onEditSection,
    onDeleteSection,
    onOpenModal,
    onDeleteLink,
    onReorder,
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const isDownRef = useRef(false);
    const startXRef = useRef(0);
    const scrollLeftRef = useRef(0);
    const hasMovedRef = useRef(false);

    const checkScroll = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        const { scrollLeft, scrollWidth, clientWidth } = el;
        setCanScrollLeft(scrollLeft > 4);
        setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4);
    }, []);

    useEffect(() => {
        checkScroll();
        const el = scrollRef.current;
        if (!el) return;
        el.addEventListener('scroll', checkScroll, { passive: true });
        window.addEventListener('resize', checkScroll);
        return () => {
            el.removeEventListener('scroll', checkScroll);
            window.removeEventListener('resize', checkScroll);
        };
    }, [checkScroll, section.items]);

    const scroll = (direction: 'left' | 'right') => {
        if (!scrollRef.current) return;
        const amount = 200;
        scrollRef.current.scrollBy({
            left: direction === 'left' ? -amount : amount,
            behavior: 'smooth'
        });
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (isEditing) return;
        if (e.button !== 0) return;
        isDownRef.current = true;
        hasMovedRef.current = false;
        startXRef.current = e.pageX - (scrollRef.current?.offsetLeft || 0);
        scrollLeftRef.current = scrollRef.current?.scrollLeft || 0;
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDownRef.current || isEditing || !scrollRef.current) return;
        const x = e.pageX - (scrollRef.current.offsetLeft || 0);
        const walk = x - startXRef.current;
        if (Math.abs(walk) > 4) {
            hasMovedRef.current = true;
        }
        scrollRef.current.scrollLeft = scrollLeftRef.current - walk;
    };

    const handleMouseUpOrLeave = () => {
        isDownRef.current = false;
    };

    const handleClickCapture = (e: React.MouseEvent) => {
        if (hasMovedRef.current) {
            e.preventDefault();
            e.stopPropagation();
            hasMovedRef.current = false;
        }
    };

    return (
        <div className="bg-gray-900/50 border border-gray-800/80 hover:border-gray-700/80 rounded-xl p-2.5 flex flex-col shadow-md transition-all duration-200 w-full min-w-0">
            {/* Header: Título, contador, botones de carrusel y botones de edición */}
            <div className="flex items-center justify-between mb-1.5 pb-1.5 border-b border-gray-800/70">
                <div className="flex items-center gap-2 overflow-hidden min-w-0">
                    <span 
                        className="text-white opacity-85 p-1 bg-gray-800/90 rounded-md flex-shrink-0 [&>svg]:w-4 [&>svg]:h-4" 
                        dangerouslySetInnerHTML={{ __html: section.iconSvg || '' }} 
                    />
                    <h2 className={`text-xs sm:text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r ${section.gradient} truncate`}>
                        {section.title}
                    </h2>
                    <span className="text-[10px] text-gray-400 font-semibold px-1.5 py-0.5 rounded-full bg-gray-800/80 border border-gray-700/60 flex-shrink-0">
                        {section.items.length}
                    </span>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Botones carrusel en encabezado */}
                    {(canScrollLeft || canScrollRight) && (
                        <div className="flex items-center gap-0.5 bg-gray-800/80 rounded p-0.5 border border-gray-700/60">
                            <button 
                                type="button"
                                onClick={() => scroll('left')}
                                disabled={!canScrollLeft}
                                className="p-0.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-20 disabled:pointer-events-none transition-all"
                                title="Anterior"
                            >
                                <ChevronLeft size={13} />
                            </button>
                            <button 
                                type="button"
                                onClick={() => scroll('right')}
                                disabled={!canScrollRight}
                                className="p-0.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-20 disabled:pointer-events-none transition-all"
                                title="Siguiente"
                            >
                                <ChevronRight size={13} />
                            </button>
                        </div>
                    )}

                    {isEditing && (
                        <div className="flex items-center gap-1 ml-1">
                            <button onClick={() => onEditSection(section.id)} className="text-blue-400 hover:text-blue-300 p-1 rounded hover:bg-gray-800 transition-colors" title="Editar Título">
                                <Edit size={13} />
                            </button>
                            <button onClick={() => onDeleteSection(section.id)} className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-gray-800 transition-colors" title="Eliminar Sección">
                                <Trash2 size={13} />
                            </button>
                            <button 
                                onClick={() => onOpenModal(section.id)} 
                                className="text-green-400 hover:text-green-300 p-1 rounded hover:bg-gray-800 transition-colors" 
                                title="Agregar Herramienta"
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Pista horizontal con soporte de carrusel y arrastre */}
            <div className="relative group/track w-full min-w-0">
                {/* Flecha flotante izquierda */}
                {canScrollLeft && (
                    <button
                        type="button"
                        onClick={() => scroll('left')}
                        className="absolute left-0 top-0 bottom-0 z-20 px-1 flex items-center justify-center bg-gradient-to-r from-gray-900/90 via-gray-900/60 to-transparent text-white hover:text-blue-300 transition-all rounded-l-lg opacity-85 hover:opacity-100"
                        title="Desplazar a la izquierda"
                    >
                        <ChevronLeft size={18} />
                    </button>
                )}

                {/* Contenedor desplazable */}
                <div 
                    ref={scrollRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUpOrLeave}
                    onMouseLeave={handleMouseUpOrLeave}
                    onClickCapture={handleClickCapture}
                    className={`w-full overflow-x-auto scroll-smooth py-1 px-0.5 select-none ${!isEditing ? 'cursor-grab active:cursor-grabbing' : ''}`}
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    <SortableLinkList 
                        id={`usefulTools.${idx}`}
                        items={section.items}
                        isEditing={isEditing}
                        onReorder={(newItems) => onReorder(section.id, newItems)}
                        strategy={horizontalListSortingStrategy}
                        className="flex flex-nowrap gap-2 items-center min-w-max"
                        itemClassName="flex-shrink-0"
                        renderItem={(tool) => (
                            <ToolCard 
                                key={tool.id} 
                                item={tool} 
                                isEditing={isEditing}
                                onEdit={(i) => onOpenModal(section.id, i)}
                                onDelete={(id) => onDeleteLink(id, section.id)}
                            />
                        )}
                    />
                    
                    {section.items.length === 0 && (
                        <div className="py-2.5 flex items-center justify-center text-gray-500 text-xs italic w-full">
                            {isEditing ? "Haz clic en '+' para agregar herramientas" : "Sección vacía"}
                        </div>
                    )}
                </div>

                {/* Flecha flotante derecha */}
                {canScrollRight && (
                    <button
                        type="button"
                        onClick={() => scroll('right')}
                        className="absolute right-0 top-0 bottom-0 z-20 px-1 flex items-center justify-center bg-gradient-to-l from-gray-900/90 via-gray-900/60 to-transparent text-white hover:text-blue-300 transition-all rounded-r-lg opacity-85 hover:opacity-100"
                        title="Desplazar a la derecha"
                    >
                        <ChevronRight size={18} />
                    </button>
                )}
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
        <div className="w-full px-2 py-2 sm:px-3 sm:py-2.5 overflow-y-auto min-h-full">
            {isEditing && (
                <div className="mb-3 flex justify-center">
                    <button 
                        onClick={handleAddSection}
                        className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-bold rounded-lg shadow-md transition-all transform hover:scale-105 active:scale-95"
                    >
                        <Plus size={16} />
                        Nueva Sección de Herramientas
                    </button>
                </div>
            )}
            {/* Grilla de 2 paneles por renglón con carrusel y desplazamiento por arrastre */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3 pb-8 w-full">
                {config.usefulTools.map((section, idx) => (
                    <ToolSectionPanel
                        key={section.id}
                        section={section}
                        idx={idx}
                        isEditing={isEditing}
                        onEditSection={handleEditSection}
                        onDeleteSection={handleDeleteSection}
                        onOpenModal={openModal}
                        onDeleteLink={handleDeleteLink}
                        onReorder={handleReorder}
                    />
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
