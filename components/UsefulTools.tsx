import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useLinks } from '../contexts/LinkContext';
import { LinkItem } from '../types';
import { LinkEditorModal } from './common/LinkEditorModal';
import { 
    Edit, 
    Trash2, 
    Plus, 
    ChevronDown, 
    ChevronUp, 
    Search, 
    X, 
    Layers, 
    Sparkles, 
    ExternalLink 
} from 'lucide-react';
import { SortableLinkList } from './common/SortableLinkList';
import { rectSortingStrategy } from '@dnd-kit/sortable';
import { toast } from 'sonner';
import { getInternalTabForLink } from '../utils/appLinkUtils';

// Card individual de cada herramienta/acceso directo
const ToolCard: React.FC<{ 
    item: LinkItem; 
    isEditing: boolean;
    onEdit: (item: LinkItem) => void;
    onDelete: (id: string) => void;
    onSelectInternalTab?: (tabId: string) => void;
}> = ({ item, isEditing, onEdit, onDelete, onSelectInternalTab }) => {
    const internalTabId = getInternalTabForLink(item);
    
    return (
        <div className="relative group w-full h-full min-h-[92px] sm:min-h-[100px] flex-shrink-0">
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
                className={`group relative flex flex-col items-center justify-center p-2.5 sm:p-3 bg-gradient-to-b from-gray-800/85 via-gray-850/90 to-gray-900/95 hover:from-gray-750/95 hover:to-gray-850 rounded-2xl transition-all duration-200 border border-white/[0.08] hover:border-white/30 hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1 w-full h-full backdrop-blur-sm ${item.colorClass || ''} ${isEditing ? 'opacity-60 pointer-events-none' : ''}`}
            >
                {/* Icono de la herramienta */}
                <div 
                    className="w-7 h-7 sm:w-8 sm:h-8 mb-1.5 transform transition-transform group-hover:scale-115 duration-200 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full flex-shrink-0 filter drop-shadow-md" 
                    style={{
                        filter: item.outlineColor && item.outlineWidth ? `drop-shadow(0 0 ${item.outlineWidth}px ${item.outlineColor})` : undefined
                    }}
                    dangerouslySetInnerHTML={{ __html: item.iconSvg }} 
                />
                
                {/* Nombre de la herramienta */}
                <h3 className="text-[10.5px] sm:text-[11.5px] font-semibold text-gray-200 group-hover:text-white text-center leading-tight truncate w-full px-0.5">
                    {item.name}
                </h3>
                
                {/* Descripción breve si existe */}
                {item.description && (
                    <p className="text-[8.5px] sm:text-[9.5px] text-gray-400 group-hover:text-gray-300 text-center line-clamp-1 w-full mt-0.5 px-0.5 font-normal">
                        {item.description}
                    </p>
                )}
            </a>

            {/* Botones de acción en modo edición */}
            <div className="absolute top-1 right-1 flex gap-0.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(item); }}
                    className="p-1 bg-blue-600 rounded-full text-white hover:bg-blue-500 shadow-md transition-all hover:scale-110"
                    title="Editar herramienta"
                >
                    <Edit size={10} />
                </button>
                <button 
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(item.id); }}
                    className="p-1 bg-red-600 rounded-full text-white hover:bg-red-500 shadow-md transition-all hover:scale-110"
                    title="Eliminar herramienta"
                >
                    <Trash2 size={10} />
                </button>
            </div>
        </div>
    );
};

// Cuadro principal de categoría con Icono Grande ("cuadro con el icono grande y que si le pico se despliege")
interface CategoryBoxProps {
    section: {
        id: string;
        title: string;
        gradient?: string;
        iconSvg?: string;
        items: LinkItem[];
    };
    isOpen: boolean;
    onClick: () => void;
    isEditing: boolean;
    onEditSection: (id: string) => void;
    onDeleteSection: (id: string) => void;
    onAddTool: (sectionId: string) => void;
}

const CategoryBox: React.FC<CategoryBoxProps> = ({
    section,
    isOpen,
    onClick,
    isEditing,
    onEditSection,
    onDeleteSection,
    onAddTool,
}) => {
    return (
        <div 
            onClick={onClick}
            className={`group relative flex flex-col items-center justify-between p-4 sm:p-5 rounded-2xl cursor-pointer select-none transition-all duration-300 backdrop-blur-md overflow-hidden ${
                isOpen 
                    ? 'bg-gradient-to-b from-gray-800/95 via-gray-850/95 to-gray-900/95 border-2 border-white/50 shadow-[0_0_30px_rgba(255,255,255,0.18)] scale-[1.02]' 
                    : 'bg-gradient-to-b from-gray-900/80 via-gray-850/70 to-gray-950/85 hover:from-gray-800/90 hover:to-gray-900/95 border border-white/[0.09] hover:border-white/35 hover:shadow-xl hover:-translate-y-1'
            }`}
        >
            {/* Halo sutil de fondo según gradiente de categoría */}
            <div className={`absolute -inset-1 opacity-15 group-hover:opacity-30 blur-xl bg-gradient-to-r ${section.gradient || 'from-blue-500 to-indigo-600'} transition-opacity pointer-events-none`} />

            {/* Indicador de edición */}
            {isEditing && (
                <div 
                    onClick={(e) => e.stopPropagation()} 
                    className="absolute top-2 right-2 flex items-center gap-1 z-20 bg-gray-900/90 p-1 rounded-lg border border-white/10"
                >
                    <button 
                        onClick={() => onEditSection(section.id)} 
                        className="text-blue-400 hover:text-blue-300 p-1 rounded hover:bg-gray-800" 
                        title="Editar Título"
                    >
                        <Edit size={12} />
                    </button>
                    <button 
                        onClick={() => onDeleteSection(section.id)} 
                        className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-gray-800" 
                        title="Eliminar Sección"
                    >
                        <Trash2 size={12} />
                    </button>
                    <button 
                        onClick={() => onAddTool(section.id)} 
                        className="text-green-400 hover:text-green-300 p-1 rounded hover:bg-gray-800" 
                        title="Agregar Herramienta"
                    >
                        <Plus size={14} />
                    </button>
                </div>
            )}

            {/* Icono Grande */}
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center p-2.5 rounded-2xl bg-white/[0.06] border border-white/10 group-hover:border-white/25 group-hover:bg-white/[0.1] transition-all duration-300 group-hover:scale-110 shadow-inner drop-shadow-lg [&>svg]:w-full [&>svg]:h-full">
                <div 
                    className="w-full h-full flex items-center justify-center"
                    dangerouslySetInnerHTML={{ __html: section.iconSvg || '' }} 
                />
            </div>

            {/* Título de la categoría */}
            <div className="mt-3 text-center w-full min-w-0">
                <h3 className={`text-xs sm:text-sm font-extrabold tracking-wide text-transparent bg-clip-text bg-gradient-to-r ${section.gradient || 'from-white to-gray-300'} truncate w-full px-1`}>
                    {section.title}
                </h3>
            </div>

            {/* Fila inferior: Contador y estado de despliegue */}
            <div className="mt-2.5 flex items-center justify-between w-full pt-2 border-t border-white/[0.06] text-[10px] text-gray-300">
                <span className="font-mono font-semibold px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/10">
                    {section.items.length} {section.items.length === 1 ? 'herramienta' : 'herramientas'}
                </span>
                
                <span className={`flex items-center gap-1 font-medium transition-colors ${isOpen ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>
                    <span>{isOpen ? 'Desplegado' : 'Abrir'}</span>
                    <ChevronDown size={13} className={`transform transition-transform duration-300 ${isOpen ? 'rotate-180 text-white' : ''}`} />
                </span>
            </div>
        </div>
    );
};

// Panel desplegado para mostrar las herramientas de la categoría seleccionada
interface ExpandedSectionPanelProps {
    section: {
        id: string;
        title: string;
        gradient?: string;
        iconSvg?: string;
        items: LinkItem[];
    };
    idx: number;
    isEditing: boolean;
    onClose: () => void;
    onEditSection: (id: string) => void;
    onDeleteSection: (id: string) => void;
    onOpenModal: (sectionId: string, item?: LinkItem) => void;
    onDeleteLink: (itemId: string, sectionId: string) => void;
    onReorder: (sectionId: string, newItems: LinkItem[]) => void;
    onSelectInternalTab?: (tabId: string) => void;
}

const ExpandedSectionPanel: React.FC<ExpandedSectionPanelProps> = ({
    section,
    idx,
    isEditing,
    onClose,
    onEditSection,
    onDeleteSection,
    onOpenModal,
    onDeleteLink,
    onReorder,
    onSelectInternalTab,
}) => {
    return (
        <div className="w-full bg-gradient-to-b from-gray-900/90 via-gray-900/80 to-gray-950/95 border-2 border-white/20 rounded-3xl p-4 sm:p-5 shadow-2xl backdrop-blur-xl transition-all duration-300 animate-in fade-in-50 zoom-in-95">
            {/* Encabezado del panel desplegado */}
            <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-white/10">
                <div className="flex items-center gap-3 overflow-hidden min-w-0">
                    <div 
                        className="w-10 h-10 p-2 bg-white/[0.08] border border-white/15 rounded-2xl flex-shrink-0 shadow-inner flex items-center justify-center [&>svg]:w-full [&>svg]:h-full drop-shadow"
                        dangerouslySetInnerHTML={{ __html: section.iconSvg || '' }} 
                    />
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h2 className={`text-base sm:text-lg font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r ${section.gradient || 'from-white to-gray-200'} truncate`}>
                                {section.title}
                            </h2>
                            <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-white/[0.08] border border-white/10 text-gray-200 flex-shrink-0">
                                {section.items.length} accesos
                            </span>
                        </div>
                        <p className="text-[11px] text-gray-400 truncate">
                            Haz clic en cualquier herramienta para abrirla en una pestaña nueva o interna.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                    {isEditing && (
                        <div className="flex items-center gap-1.5 mr-2">
                            <button 
                                onClick={() => onEditSection(section.id)} 
                                className="text-blue-400 hover:text-blue-300 p-1.5 rounded-lg hover:bg-gray-800 transition-colors" 
                                title="Editar Título de Sección"
                            >
                                <Edit size={15} />
                            </button>
                            <button 
                                onClick={() => onDeleteSection(section.id)} 
                                className="text-red-400 hover:text-red-300 p-1.5 rounded-lg hover:bg-gray-800 transition-colors" 
                                title="Eliminar Sección"
                            >
                                <Trash2 size={15} />
                            </button>
                            <button 
                                onClick={() => onOpenModal(section.id)} 
                                className="flex items-center gap-1 text-xs font-semibold text-green-400 hover:text-green-300 px-2.5 py-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 transition-colors" 
                                title="Agregar Herramienta"
                            >
                                <Plus size={15} />
                                <span>Agregar</span>
                            </button>
                        </div>
                    )}

                    {/* Botón para contraer/cerrar */}
                    <button
                        onClick={onClose}
                        className="flex items-center gap-1 text-xs font-medium text-gray-300 hover:text-white px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 transition-all hover:scale-105 active:scale-95"
                        title="Contraer panel"
                    >
                        <ChevronUp size={14} />
                        <span>Contraer</span>
                    </button>
                </div>
            </div>

            {/* Cuadrícula de accesos directos / herramientas */}
            {section.items.length > 0 ? (
                <SortableLinkList 
                    id={`usefulTools.${idx}`}
                    items={section.items}
                    isEditing={isEditing}
                    onReorder={(newItems) => onReorder(section.id, newItems)}
                    strategy={rectSortingStrategy}
                    className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-2.5 sm:gap-3 w-full"
                    itemClassName="w-full h-full"
                    renderItem={(tool) => (
                        <ToolCard 
                            key={tool.id} 
                            item={tool} 
                            isEditing={isEditing}
                            onSelectInternalTab={onSelectInternalTab}
                            onEdit={(i) => onOpenModal(section.id, i)}
                            onDelete={(id) => onDeleteLink(id, section.id)}
                        />
                    )}
                />
            ) : (
                <div className="py-8 flex flex-col items-center justify-center text-gray-400 text-xs sm:text-sm text-center">
                    <p className="mb-2 italic">Esta categoría no contiene herramientas por el momento.</p>
                    {isEditing && (
                        <button 
                            onClick={() => onOpenModal(section.id)}
                            className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 px-3 py-1.5 rounded-lg bg-green-600/20 border border-green-500/40"
                        >
                            <Plus size={14} />
                            Agregar la primera herramienta
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export const UsefulTools: React.FC = () => {
    const { config, updateConfig, isEditing, setActiveTabId } = useLinks();
    const [modalOpen, setModalOpen] = useState(false);
    const [currentLink, setCurrentLink] = useState<LinkItem | null>(null);
    const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
    
    // Categoría actualmente desplegada (o null si todas están contraídas)
    const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);
    
    // Modo de vista: 'boxes' (cuadros desplegables individuales) o 'all' (todas abiertas)
    const [viewMode, setViewMode] = useState<'boxes' | 'all'>('boxes');
    
    // Filtro de búsqueda rápida
    const [searchQuery, setSearchQuery] = useState('');

    const handleSaveLink = (item: LinkItem, targetSection?: string) => {
        updateConfig((prev) => {
            const newConfig = JSON.parse(JSON.stringify(prev));
            
            const currentSectionIndex = newConfig.usefulTools.findIndex((s: any) => s.id === activeSectionId);
            const currentSecPath = currentSectionIndex !== -1 ? `usefulTools.${currentSectionIndex}` : null;
            const finalTarget = targetSection || currentSecPath || 'linksBar';
            
            let isNew = false;
            let targetName = '';

            if (currentSecPath && finalTarget !== currentSecPath) {
                newConfig.usefulTools[currentSectionIndex].items = newConfig.usefulTools[currentSectionIndex].items.filter((l: LinkItem) => l.id !== item.id);
            }
            
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
        if (!window.confirm('¿Seguro que deseas eliminar esta sección de herramientas?')) return;
        updateConfig((prev) => ({
            ...prev,
            usefulTools: prev.usefulTools.filter(s => s.id !== sectionId)
        }));
        if (expandedCategoryId === sectionId) {
            setExpandedCategoryId(null);
        }
    };

    const handleReorder = (sectionId: string, newItems: LinkItem[]) => {
        updateConfig((prev) => ({
            ...prev,
            usefulTools: prev.usefulTools.map(s => 
                s.id === sectionId ? { ...s, items: newItems } : s
            )
        }));
    };

    // Alternar el despliegue de una categoría al hacer clic en su cuadro
    const handleToggleCategory = (sectionId: string) => {
        setExpandedCategoryId(prev => prev === sectionId ? null : sectionId);
    };

    // Sección actualmente expandida
    const expandedSection = useMemo(() => {
        if (!expandedCategoryId) return null;
        return config.usefulTools.find(s => s.id === expandedCategoryId) || null;
    }, [config.usefulTools, expandedCategoryId]);

    const expandedSectionIndex = useMemo(() => {
        if (!expandedCategoryId) return -1;
        return config.usefulTools.findIndex(s => s.id === expandedCategoryId);
    }, [config.usefulTools, expandedCategoryId]);

    // Filtrado en búsqueda rápida
    const searchResults = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return null;
        const results: { section: any; item: LinkItem }[] = [];
        config.usefulTools.forEach((sec) => {
            (sec.items || []).forEach((item) => {
                if (
                    (item.name || '').toLowerCase().includes(q) ||
                    (item.description || '').toLowerCase().includes(q) ||
                    (item.href || '').toLowerCase().includes(q)
                ) {
                    results.push({ section: sec, item });
                }
            });
        });
        return results;
    }, [config.usefulTools, searchQuery]);

    const sectionIndex = config.usefulTools.findIndex(s => s.id === activeSectionId);
    const modalCurrentSection = sectionIndex !== -1 ? `usefulTools.${sectionIndex}` : undefined;

    return (
        <div className="w-full px-2 py-3 sm:px-4 sm:py-4 overflow-y-auto min-h-full">
            {/* Barra superior de control y búsqueda */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 mb-4 pb-3 border-b border-white/[0.08]">
                {/* Título de la pestaña / descripción */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="p-2 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/10 rounded-xl text-indigo-400">
                        <Sparkles size={18} />
                    </div>
                    <div>
                        <h1 className="text-sm sm:text-base font-extrabold text-white tracking-wide flex items-center gap-2">
                            <span>Herramientas & Accesos</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-gray-300">
                                {config.usefulTools.length} categorías
                            </span>
                        </h1>
                        <p className="text-[11px] text-gray-400">
                            Toca un cuadro para desplegar sus accesos directos
                        </p>
                    </div>
                </div>

                {/* Acciones: Búsqueda rápida, toggle de vista, y nueva sección */}
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    {/* Input de búsqueda */}
                    <div className="relative w-full sm:w-56">
                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar herramienta..."
                            className="w-full pl-8 pr-7 py-1.5 bg-gray-900/80 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-400/50 transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                            >
                                <X size={13} />
                            </button>
                        )}
                    </div>

                    {/* Botón para alternar Ver Todas / Vista Cuadros */}
                    <button
                        onClick={() => setViewMode(prev => prev === 'boxes' ? 'all' : 'boxes')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
                            viewMode === 'all'
                                ? 'bg-indigo-600 text-white border-indigo-400 shadow-md'
                                : 'bg-gray-900/80 text-gray-300 border-white/10 hover:bg-gray-800 hover:text-white'
                        }`}
                        title={viewMode === 'all' ? "Volver a vista de cuadros" : "Desplegar todas las categorías al mismo tiempo"}
                    >
                        <Layers size={13} />
                        <span className="hidden sm:inline">{viewMode === 'all' ? 'Ver Cuadros' : 'Ver Todas'}</span>
                    </button>

                    {isEditing && (
                        <button 
                            onClick={handleAddSection}
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-xl shadow-md transition-all hover:scale-105"
                        >
                            <Plus size={14} />
                            <span>Nueva Categoría</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Vista de Resultados de Búsqueda si hay query */}
            {searchResults && (
                <div className="mb-6 bg-gray-900/90 border border-indigo-500/30 rounded-2xl p-4 shadow-xl backdrop-blur-md">
                    <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/10">
                        <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
                            <Search size={14} />
                            <span>Resultados de búsqueda ({searchResults.length})</span>
                        </div>
                        <button 
                            onClick={() => setSearchQuery('')}
                            className="text-xs text-gray-400 hover:text-white"
                        >
                            Limpiar
                        </button>
                    </div>

                    {searchResults.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                            {searchResults.map(({ item, section }) => (
                                <ToolCard 
                                    key={item.id} 
                                    item={item} 
                                    isEditing={isEditing}
                                    onSelectInternalTab={setActiveTabId}
                                    onEdit={(i) => openModal(section.id, i)}
                                    onDelete={(id) => handleDeleteLink(id, section.id)}
                                />
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-gray-400 italic text-center py-4">
                            No se encontraron herramientas que coincidan con "{searchQuery}".
                        </p>
                    )}
                </div>
            )}

            {/* GRILLA DE CUADROS CON ICONOS GRANDES (Los 8 principales) */}
            <div className="mb-5">
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-2.5 sm:gap-3 w-full">
                    {config.usefulTools.map((section) => (
                        <CategoryBox
                            key={section.id}
                            section={section}
                            isOpen={viewMode === 'all' || expandedCategoryId === section.id}
                            onClick={() => handleToggleCategory(section.id)}
                            isEditing={isEditing}
                            onEditSection={handleEditSection}
                            onDeleteSection={handleDeleteSection}
                            onAddTool={openModal}
                        />
                    ))}
                </div>
            </div>

            {/* ÁREA DESPLEGABLE:
                Si viewMode es 'boxes': Muestra el panel desplegado de la categoría seleccionada.
                Si viewMode es 'all': Muestra todas las categorías desplegadas una tras otra.
            */}
            {viewMode === 'boxes' && expandedSection && (
                <div className="mt-4 pb-8">
                    <ExpandedSectionPanel
                        section={expandedSection}
                        idx={expandedSectionIndex}
                        isEditing={isEditing}
                        onClose={() => setExpandedCategoryId(null)}
                        onEditSection={handleEditSection}
                        onDeleteSection={handleDeleteSection}
                        onOpenModal={openModal}
                        onDeleteLink={handleDeleteLink}
                        onReorder={handleReorder}
                        onSelectInternalTab={setActiveTabId}
                    />
                </div>
            )}

            {viewMode === 'boxes' && !expandedSection && !searchResults && (
                <div className="mt-2 py-6 text-center text-xs text-gray-500 border border-dashed border-white/[0.08] rounded-2xl bg-white/[0.01]">
                    <p className="font-medium">👆 Haz clic en cualquiera de los cuadros superiores para desplegar sus accesos y herramientas.</p>
                </div>
            )}

            {viewMode === 'all' && (
                <div className="mt-4 flex flex-col gap-4 pb-8">
                    {config.usefulTools.map((section, idx) => (
                        <ExpandedSectionPanel
                            key={section.id}
                            section={section}
                            idx={idx}
                            isEditing={isEditing}
                            onClose={() => {}}
                            onEditSection={handleEditSection}
                            onDeleteSection={handleDeleteSection}
                            onOpenModal={openModal}
                            onDeleteLink={handleDeleteLink}
                            onReorder={handleReorder}
                            onSelectInternalTab={setActiveTabId}
                        />
                    ))}
                </div>
            )}

            {/* Modal para agregar / editar herramientas */}
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
