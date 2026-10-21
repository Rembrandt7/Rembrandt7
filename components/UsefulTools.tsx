import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useLinks } from '../contexts/LinkContext';
import { LinkItem } from '../types';
import { LinkEditorModal } from './common/LinkEditorModal';
import { 
    Edit, 
    Trash2, 
    Plus, 
    ChevronLeft, 
    ChevronRight, 
    Search, 
    X, 
    LayoutGrid, 
    Columns, 
    Sparkles, 
    ExternalLink, 
    Wrench 
} from 'lucide-react';
import { SortableLinkList } from './common/SortableLinkList';
import { horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { toast } from 'sonner';
import { getInternalTabForLink } from '../utils/appLinkUtils';

interface ToolCardProps {
    item: LinkItem;
    isEditing: boolean;
    onEdit: (item: LinkItem) => void;
    onDelete: (id: string) => void;
    onSelectInternalTab?: (tabId: string) => void;
    viewMode?: 'carousel' | 'grid';
}

const ToolCard: React.FC<ToolCardProps> = ({ 
    item, 
    isEditing, 
    onEdit, 
    onDelete, 
    onSelectInternalTab,
    viewMode = 'carousel'
}) => {
    const internalTabId = getInternalTabForLink(item);
    const sizeClasses = viewMode === 'grid' 
        ? "w-[82px] h-[82px] sm:w-[92px] sm:h-[92px]" 
        : "w-[80px] h-[80px] sm:w-[88px] sm:h-[88px]";

    return (
        <div 
            className={`relative group ${sizeClasses} flex-shrink-0 transition-transform duration-200`}
            title={`${item.name}${item.description ? ` — ${item.description}` : ''}\n${item.href}`}
        >
            <a 
                href={item.href} 
                target={internalTabId ? undefined : "_blank"} 
                rel="noopener noreferrer" 
                onClick={(e) => {
                    if (isEditing) {
                        e.preventDefault();
                        return;
                    }
                    if (internalTabId && onSelectInternalTab) {
                        e.preventDefault();
                        onSelectInternalTab(internalTabId);
                    }
                }}
                className={`group relative flex flex-col items-center justify-center p-2 bg-gradient-to-b from-gray-800/90 via-gray-850/95 to-gray-900/95 hover:from-gray-750 hover:to-gray-800 rounded-2xl transition-all duration-200 border border-white/[0.08] hover:border-white/30 hover:shadow-[0_8px_25px_rgba(0,0,0,0.55)] hover:-translate-y-1 w-full h-full backdrop-blur-md overflow-hidden ${item.colorClass || ''} ${isEditing ? 'opacity-60 pointer-events-none' : ''}`}
            >
                {/* Glow ambiental sutil al hover */}
                <div className="absolute inset-0 bg-white/[0.03] group-hover:bg-white/[0.08] transition-colors rounded-2xl pointer-events-none" />

                {/* Badge indicador de pestaña interna */}
                {internalTabId && (
                    <span 
                        className="absolute top-1.5 left-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_6px_rgba(96,165,250,0.8)]" 
                        title="Pestaña interna de Rembrandt" 
                    />
                )}

                {/* Icono de la herramienta */}
                <div 
                    className="w-7 h-7 sm:w-8 sm:h-8 mb-1.5 transform transition-transform group-hover:scale-110 duration-200 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full flex-shrink-0 drop-shadow-sm" 
                    style={{
                        filter: item.outlineColor && item.outlineWidth ? `drop-shadow(0 0 ${item.outlineWidth}px ${item.outlineColor})` : undefined
                    }}
                    dangerouslySetInnerHTML={{ __html: item.iconSvg }} 
                />

                {/* Nombre de la herramienta */}
                <h3 className="text-[10px] sm:text-[11px] font-semibold text-gray-200 group-hover:text-white text-center leading-tight truncate w-full px-1 tracking-tight">
                    {item.name}
                </h3>
            </a>

            {/* Botones de acción en modo edición */}
            {isEditing && (
                <div className="absolute top-1 right-1 flex gap-0.5 z-20">
                    <button 
                        onPointerDown={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(item); }}
                        className="p-1 bg-blue-600 rounded-full text-white hover:bg-blue-500 shadow-md transition-all hover:scale-110"
                        title="Editar"
                    >
                        <Edit size={9} />
                    </button>
                    <button 
                        onPointerDown={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(item.id); }}
                        className="p-1 bg-red-600 rounded-full text-white hover:bg-red-500 shadow-md transition-all hover:scale-110"
                        title="Eliminar"
                    >
                        <Trash2 size={9} />
                    </button>
                </div>
            )}
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
    viewMode: 'carousel' | 'grid';
    isFiltered: boolean;
    onEditSection: (id: string) => void;
    onDeleteSection: (id: string) => void;
    onOpenModal: (sectionId: string, item?: LinkItem) => void;
    onDeleteLink: (itemId: string, sectionId: string) => void;
    onReorder: (sectionId: string, newItems: LinkItem[]) => void;
    onSelectInternalTab?: (tabId: string) => void;
}

const ToolSectionPanel: React.FC<ToolSectionPanelProps> = ({
    section,
    idx,
    isEditing,
    viewMode,
    isFiltered,
    onEditSection,
    onDeleteSection,
    onOpenModal,
    onDeleteLink,
    onReorder,
    onSelectInternalTab,
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
        if (!el || viewMode === 'grid') return;
        const { scrollLeft, scrollWidth, clientWidth } = el;
        setCanScrollLeft(scrollLeft > 4);
        setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4);
    }, [viewMode]);

    useEffect(() => {
        checkScroll();
        const el = scrollRef.current;
        if (!el || viewMode === 'grid') return;
        el.addEventListener('scroll', checkScroll, { passive: true });
        window.addEventListener('resize', checkScroll);
        return () => {
            el.removeEventListener('scroll', checkScroll);
            window.removeEventListener('resize', checkScroll);
        };
    }, [checkScroll, section.items, viewMode]);

    const scroll = (direction: 'left' | 'right') => {
        if (!scrollRef.current) return;
        const amount = 240;
        scrollRef.current.scrollBy({
            left: direction === 'left' ? -amount : amount,
            behavior: 'smooth'
        });
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (isEditing || viewMode === 'grid') return;
        if (e.button !== 0) return;
        isDownRef.current = true;
        hasMovedRef.current = false;
        startXRef.current = e.pageX - (scrollRef.current?.offsetLeft || 0);
        scrollLeftRef.current = scrollRef.current?.scrollLeft || 0;
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDownRef.current || isEditing || !scrollRef.current || viewMode === 'grid') return;
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

    const isCarouselActive = viewMode === 'carousel' && !isFiltered;

    return (
        <div className="group/panel relative bg-gradient-to-b from-gray-900/80 via-gray-900/60 to-gray-950/80 border border-white/[0.08] hover:border-white/20 rounded-2xl p-3.5 flex flex-col shadow-xl backdrop-blur-md transition-all duration-200 w-full min-w-0 overflow-hidden">
            {/* Línea superior con gradiente acorde a la categoría */}
            <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${section.gradient || 'from-blue-500 to-indigo-600'} opacity-75 group-hover/panel:opacity-100 transition-opacity`} />

            {/* Header: Título, contador y controles */}
            <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-white/[0.06]">
                <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
                    <span 
                        className="text-white opacity-95 p-1.5 bg-white/[0.06] border border-white/10 rounded-xl flex-shrink-0 shadow-inner [&>svg]:w-4 [&>svg]:h-4" 
                        dangerouslySetInnerHTML={{ __html: section.iconSvg || '' }} 
                    />
                    <h2 className={`text-xs sm:text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r ${section.gradient || 'from-white to-gray-300'} truncate tracking-wide`}>
                        {section.title}
                    </h2>
                    <span className="text-[10px] text-gray-300 font-mono font-bold px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/10 flex-shrink-0 shadow-sm">
                        {section.items.length}
                    </span>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* Botones de navegación horizontal en encabezado (solo carrusel) */}
                    {isCarouselActive && (canScrollLeft || canScrollRight) && (
                        <div className="flex items-center gap-0.5 bg-gray-800/80 rounded-lg p-0.5 border border-gray-700/60 shadow-sm">
                            <button 
                                type="button"
                                onClick={() => scroll('left')}
                                disabled={!canScrollLeft}
                                className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-20 disabled:pointer-events-none transition-all"
                                title="Desplazar a la izquierda"
                            >
                                <ChevronLeft size={13} />
                            </button>
                            <button 
                                type="button"
                                onClick={() => scroll('right')}
                                disabled={!canScrollRight}
                                className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-20 disabled:pointer-events-none transition-all"
                                title="Desplazar a la derecha"
                            >
                                <ChevronRight size={13} />
                            </button>
                        </div>
                    )}

                    {isEditing && (
                        <div className="flex items-center gap-1 ml-1 bg-gray-800/90 rounded-lg p-0.5 border border-gray-700/70">
                            <button 
                                onClick={() => onEditSection(section.id)} 
                                className="text-blue-400 hover:text-blue-300 p-1 rounded hover:bg-gray-700 transition-colors" 
                                title="Editar Título"
                            >
                                <Edit size={13} />
                            </button>
                            <button 
                                onClick={() => onDeleteSection(section.id)} 
                                className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-gray-700 transition-colors" 
                                title="Eliminar Sección"
                            >
                                <Trash2 size={13} />
                            </button>
                            <button 
                                onClick={() => onOpenModal(section.id)} 
                                className="text-green-400 hover:text-green-300 p-1 rounded hover:bg-gray-700 transition-colors" 
                                title="Agregar Herramienta"
                            >
                                <Plus size={15} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Contenido: Modo Carrusel o Modo Cuadrícula */}
            {isCarouselActive ? (
                <div className="relative group/track w-full min-w-0">
                    {/* Flecha flotante izquierda con difuminado */}
                    {canScrollLeft && (
                        <button
                            type="button"
                            onClick={() => scroll('left')}
                            className="absolute left-0 top-0 bottom-0 z-20 px-1.5 flex items-center justify-center bg-gradient-to-r from-gray-950 via-gray-950/80 to-transparent text-white hover:text-blue-400 transition-all rounded-l-xl opacity-90 hover:opacity-100"
                            title="Desplazar a la izquierda"
                        >
                            <ChevronLeft size={20} />
                        </button>
                    )}

                    {/* Pista desplazable */}
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
                            className="flex flex-nowrap gap-2.5 items-center min-w-max"
                            itemClassName="flex-shrink-0"
                            renderItem={(tool) => (
                                <ToolCard 
                                    key={tool.id} 
                                    item={tool} 
                                    isEditing={isEditing}
                                    viewMode="carousel"
                                    onSelectInternalTab={onSelectInternalTab}
                                    onEdit={(i) => onOpenModal(section.id, i)}
                                    onDelete={(id) => onDeleteLink(id, section.id)}
                                />
                            )}
                        />
                        
                        {section.items.length === 0 && (
                            <div className="py-4 flex items-center justify-center text-gray-500 text-xs italic w-full">
                                {isEditing ? "Haz clic en '+' para agregar herramientas" : "Sección vacía"}
                            </div>
                        )}
                    </div>

                    {/* Flecha flotante derecha con difuminado */}
                    {canScrollRight && (
                        <button
                            type="button"
                            onClick={() => scroll('right')}
                            className="absolute right-0 top-0 bottom-0 z-20 px-1.5 flex items-center justify-center bg-gradient-to-l from-gray-950 via-gray-950/80 to-transparent text-white hover:text-blue-400 transition-all rounded-r-xl opacity-90 hover:opacity-100"
                            title="Desplazar a la derecha"
                        >
                            <ChevronRight size={20} />
                        </button>
                    )}
                </div>
            ) : (
                /* Modo Cuadrícula / Grid Expandido */
                <div className="w-full py-1">
                    <div className="flex flex-wrap gap-2.5 sm:gap-3 items-center">
                        {section.items.map((tool) => (
                            <ToolCard 
                                key={tool.id} 
                                item={tool} 
                                isEditing={isEditing}
                                viewMode="grid"
                                onSelectInternalTab={onSelectInternalTab}
                                onEdit={(i) => onOpenModal(section.id, i)}
                                onDelete={(id) => onDeleteLink(id, section.id)}
                            />
                        ))}
                    </div>

                    {section.items.length === 0 && (
                        <div className="py-4 flex items-center justify-center text-gray-500 text-xs italic w-full">
                            {isFiltered ? "No se encontraron herramientas en esta sección" : "Sección vacía"}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const UsefulTools: React.FC = () => {
    const { config, updateConfig, isEditing, setActiveTabId } = useLinks();
    const [modalOpen, setModalOpen] = useState(false);
    const [currentLink, setCurrentLink] = useState<LinkItem | null>(null);
    const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

    // Estados de búsqueda, filtrado por chip de categoría y modo de vista
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'carousel' | 'grid'>('carousel');

    // Conteo total de herramientas
    const totalToolsCount = useMemo(() => {
        return (config.usefulTools || []).reduce((acc, sec) => acc + (sec.items?.length || 0), 0);
    }, [config.usefulTools]);

    // Filtrar secciones e ítems según la búsqueda y categoría seleccionada
    const filteredSections = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        let sections = config.usefulTools || [];

        // Filtro por chip de categoría
        if (selectedCategory) {
            sections = sections.filter(sec => sec.id === selectedCategory);
        }

        // Filtro por búsqueda
        if (!query) {
            return sections;
        }

        return sections
            .map(sec => {
                const matchingItems = (sec.items || []).filter(item => {
                    const name = (item.name || '').toLowerCase();
                    const desc = (item.description || '').toLowerCase();
                    const href = (item.href || '').toLowerCase();
                    return name.includes(query) || desc.includes(query) || href.includes(query);
                });
                return {
                    ...sec,
                    items: matchingItems
                };
            })
            .filter(sec => sec.items.length > 0);
    }, [config.usefulTools, searchQuery, selectedCategory]);

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
            const title = window.prompt('Título de la nueva sección:');
            if (title === null) return;
            
            const finalTitle = title.trim() || 'Nueva Sección';
            
            updateConfig((prev) => {
                const currentUsefulTools = Array.isArray(prev.usefulTools) ? [...prev.usefulTools] : [];
                const newSection = {
                    id: `ut-${Date.now()}`,
                    title: finalTitle,
                    gradient: 'from-blue-400 to-indigo-600',
                    iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>',
                    items: []
                };
                
                return {
                    ...prev,
                    usefulTools: [...currentUsefulTools, newSection]
                };
            });

            toast.success(`¡Sección "${finalTitle}" añadida!`);
        } catch (error) {
            console.error("Error adding section:", error);
            toast.error("Hubo un error al intentar añadir la sección.");
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
        <div className="w-full px-2 sm:px-4 py-2 sm:py-3 overflow-y-auto min-h-full">
            {/* Barra de Controles Superior: Título, Buscador, Selector de Vista */}
            <div className="mb-3.5 bg-gradient-to-r from-gray-900/90 via-gray-850/80 to-gray-900/90 border border-white/[0.08] rounded-2xl p-2.5 sm:p-3 shadow-xl backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-2.5">
                {/* Título y badge total */}
                <div className="flex items-center gap-2.5 w-full md:w-auto">
                    <div className="p-2 bg-gradient-to-br from-indigo-500/20 to-blue-600/30 border border-indigo-400/30 rounded-xl text-indigo-300 shadow-inner">
                        <Wrench size={18} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-sm sm:text-base font-bold text-white tracking-wide">
                                Herramientas Útiles
                            </h1>
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-400/30 text-blue-300 shadow-sm">
                                {totalToolsCount} apps
                            </span>
                        </div>
                        <p className="text-[11px] text-gray-400">
                            Accesos rápidos organizados para diseño, video, 3D, desarrollo e IA
                        </p>
                    </div>
                </div>

                {/* Buscador y conmutador de vista */}
                <div className="flex items-center gap-2 w-full md:w-auto">
                    {/* Campo de Búsqueda */}
                    <div className="relative flex-1 md:w-64">
                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar herramienta o función..."
                            className="w-full bg-gray-950/60 border border-white/10 focus:border-blue-500/60 rounded-xl pl-8 pr-7 py-1.5 text-xs text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all shadow-inner"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-0.5"
                                title="Limpiar búsqueda"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>

                    {/* Selector de Vista: Carrusel vs Grid */}
                    <div className="flex items-center bg-gray-950/60 border border-white/10 rounded-xl p-0.5 flex-shrink-0">
                        <button
                            type="button"
                            onClick={() => setViewMode('carousel')}
                            className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition-all ${
                                viewMode === 'carousel'
                                    ? 'bg-blue-600 text-white font-medium shadow-sm'
                                    : 'text-gray-400 hover:text-gray-200'
                            }`}
                            title="Vista Carrusel Horizontal"
                        >
                            <Columns size={14} />
                            <span className="hidden sm:inline text-[11px]">Carrusel</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition-all ${
                                viewMode === 'grid'
                                    ? 'bg-blue-600 text-white font-medium shadow-sm'
                                    : 'text-gray-400 hover:text-gray-200'
                            }`}
                            title="Vista Cuadrícula Completa"
                        >
                            <LayoutGrid size={14} />
                            <span className="hidden sm:inline text-[11px]">Mosaico</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Chips de Categorías */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-none select-none">
                <button
                    type="button"
                    onClick={() => setSelectedCategory(null)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium whitespace-nowrap transition-all border ${
                        selectedCategory === null
                            ? 'bg-blue-600/30 border-blue-400/50 text-blue-200 shadow-[0_0_12px_rgba(59,130,246,0.3)]'
                            : 'bg-gray-900/60 hover:bg-gray-800/80 border-white/[0.08] text-gray-300 hover:text-white'
                    }`}
                >
                    <Sparkles size={12} className={selectedCategory === null ? 'text-blue-300' : 'text-gray-400'} />
                    <span>Todas</span>
                    <span className="text-[10px] opacity-75 font-mono">({totalToolsCount})</span>
                </button>

                {config.usefulTools.map((sec) => {
                    const isSelected = selectedCategory === sec.id;
                    return (
                        <button
                            key={sec.id}
                            type="button"
                            onClick={() => setSelectedCategory(isSelected ? null : sec.id)}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium whitespace-nowrap transition-all border ${
                                isSelected
                                    ? 'bg-gradient-to-r from-blue-600/30 to-indigo-600/30 border-blue-400/50 text-white shadow-[0_0_12px_rgba(99,102,241,0.3)]'
                                    : 'bg-gray-900/60 hover:bg-gray-800/80 border-white/[0.08] text-gray-300 hover:text-white'
                            }`}
                        >
                            <span 
                                className="[&>svg]:w-3.5 [&>svg]:h-3.5 text-gray-300"
                                dangerouslySetInnerHTML={{ __html: sec.iconSvg || '' }}
                            />
                            <span>{sec.title}</span>
                            <span className="text-[10px] opacity-75 font-mono">({sec.items.length})</span>
                        </button>
                    );
                })}
            </div>

            {/* Botón para añadir nueva sección en modo edición */}
            {isEditing && (
                <div className="mb-3.5 flex justify-center">
                    <button 
                        onClick={handleAddSection}
                        className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all transform hover:scale-105 active:scale-95 border border-emerald-400/30"
                    >
                        <Plus size={15} />
                        Nueva Sección de Herramientas
                    </button>
                </div>
            )}

            {/* Grilla de Secciones */}
            <div className={`grid gap-3 sm:gap-3.5 pb-8 w-full ${
                selectedCategory 
                    ? 'grid-cols-1' 
                    : 'grid-cols-1 md:grid-cols-2'
            }`}>
                {filteredSections.map((section, idx) => (
                    <ToolSectionPanel
                        key={section.id}
                        section={section}
                        idx={idx}
                        isEditing={isEditing}
                        viewMode={viewMode}
                        isFiltered={Boolean(searchQuery.trim())}
                        onEditSection={handleEditSection}
                        onDeleteSection={handleDeleteSection}
                        onOpenModal={openModal}
                        onDeleteLink={handleDeleteLink}
                        onReorder={handleReorder}
                        onSelectInternalTab={setActiveTabId}
                    />
                ))}
            </div>

            {/* Estado vacío cuando no hay resultados en la búsqueda */}
            {filteredSections.length === 0 && (
                <div className="py-12 flex flex-col items-center justify-center text-center p-6 bg-gray-900/40 border border-white/[0.06] rounded-2xl">
                    <Search size={32} className="text-gray-500 mb-2 opacity-60" />
                    <p className="text-sm font-medium text-gray-300">
                        No se encontraron herramientas con &ldquo;{searchQuery}&rdquo;
                    </p>
                    <p className="text-xs text-gray-500 mt-1 max-w-sm">
                        Verifica que la palabra esté bien escrita o intenta buscar por una categoría diferente.
                    </p>
                    <button
                        type="button"
                        onClick={() => { setSearchQuery(''); setSelectedCategory(null); }}
                        className="mt-3 px-3 py-1.5 bg-blue-600/40 hover:bg-blue-600/60 border border-blue-400/30 text-blue-200 text-xs rounded-lg transition-colors"
                    >
                        Limpiar filtros
                    </button>
                </div>
            )}

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
