import React, { useState, useRef } from 'react';
import { LinkItem } from '../types';
import { Edit, Trash2, Plus, Save, Upload, Check, Settings, Star, RefreshCw, ChevronLeft, ChevronRight, CloudDownload, CloudUpload, LayoutGrid, Briefcase, ShoppingCart, MessageCircle } from 'lucide-react';
import { useLinks } from '../contexts/LinkContext';
import { toast } from 'sonner';
import { LinkEditorModal } from './common/LinkEditorModal';
import { SortableLinkList } from './common/SortableLinkList';
import { rectSortingStrategy } from '@dnd-kit/sortable';
import { getSmartLinkTarget, openSmartMobileApp, getInternalTabForLink } from '../utils/appLinkUtils';
import { inferLinkCategory, LinkCategory, CATEGORY_DEFINITIONS, normalizeAndDeduplicateLinksBar } from '../utils/linkCategoryUtils';
import { isMobileDevice } from '../utils/deviceUtils';
import { PanchoRobotAvatar } from './Pancho/PanchoRobotAvatar';

const DEFAULT_CATEGORIES_STORAGE_KEY = 'rembrandt_active_link_categories_v2';

const getDefaultCategories = (): LinkCategory[] => {
    try {
        const saved = localStorage.getItem(DEFAULT_CATEGORIES_STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
                const valid = parsed.filter((c: any) => c === 'trabajo' || c === 'compras' || c === 'social') as LinkCategory[];
                if (valid.length > 0) {
                    return valid;
                }
            }
        }
    } catch (e) {}
    // Por defecto en la app: todas las categorías activas
    return ['trabajo', 'compras', 'social'];
};

const LinkIcon: React.FC<{ 
    item: LinkItem; 
    isEditing: boolean; 
    onEdit: (item: LinkItem) => void; 
    onDelete: (id: string) => void; 
    onMove: (id: string, direction: 'left' | 'right') => void;
    onSelectInternalTab?: (tabId: string) => void;
    isFirst: boolean;
    isLast: boolean;
}> = ({ item, isEditing, onEdit, onDelete, onMove, onSelectInternalTab, isFirst, isLast }) => {
    const hasBg = item.hasBackground !== false;
    const { href: smartHref, target: smartTarget, isAppScheme, fallbackUrl } = getSmartLinkTarget(item.href, item.name);
    const itemCategory = item.category || inferLinkCategory(item);
    const internalTabId = getInternalTabForLink(item);

    const handleClick = (e: React.MouseEvent) => {
        if (isEditing) {
            e.preventDefault();
            return;
        }
        if (internalTabId && onSelectInternalTab) {
            e.preventDefault();
            onSelectInternalTab(internalTabId);
            return;
        }
        if (item.id === 'renders-remb' || (item.name || '').toLowerCase().includes('renders remb')) {
            const localPath = "C:\\Users\\rblanco\\OneDrive - Servicios Administrativos Javer, S.A. DE C.V\\Renders Remb";
            try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(localPath);
                    toast.success("Abriendo Renders Remb... ¡Ruta local copiada al portapapeles!");
                }
            } catch (err) {}
        }
        if (isAppScheme) {
            e.preventDefault();
            openSmartMobileApp(smartHref, fallbackUrl || item.href);
        }
    };

    return (
        <div className="relative group flex items-center justify-center shrink-0 w-11 h-11 sm:w-14 sm:h-14 md:w-16 md:h-16">
            {isEditing && !isFirst && (
                <button onClick={() => onMove(item.id, 'left')} className="absolute -left-3 z-40 p-1 bg-gray-700 rounded-full text-white hover:bg-gray-600 shadow-md">
                    <ChevronLeft size={12} />
                </button>
            )}
            <a 
                href={smartHref} 
                target={smartTarget} 
                rel="noopener noreferrer" 
                onClick={handleClick}
                className={`flex items-center justify-center w-full h-full rounded-2xl sm:rounded-3xl transition-all duration-300 group ${item.colorClass} hover:scale-[1.12] hover:-translate-y-1.5 active:scale-95 ${isEditing ? 'opacity-100 cursor-default' : ''} ${hasBg ? 'bg-gradient-to-b from-white/[0.08] to-white/[0.02] hover:from-white/[0.14] hover:to-white/[0.05] hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)] border border-white/10 hover:border-white/25 backdrop-blur-md' : ''} [&_svg]:w-[65%] [&_svg]:h-[65%] [&_svg]:max-w-[54px] [&_svg]:max-h-[54px] [&_img]:w-[72%] [&_img]:h-[72%] [&_img]:max-w-[56px] [&_img]:max-h-[56px] [&_img]:object-contain`}
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
            {isEditing && (
                <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-gray-900/90 border border-white/20 rounded-md text-[9px] font-mono text-gray-300 pointer-events-none capitalize shadow-sm whitespace-nowrap z-20">
                    {itemCategory}
                </div>
            )}
        </div>
    );
};

const LinksBar: React.FC = () => {
    const { config, updateConfig, saveConfigToFile, loadConfigFromFile, saveAsDefault, saveToSupabase, resetToDefaults, fetchConfigFromSupabaseManual, isEditing, toggleEditing, configFilename, setConfigFilename, setActiveTabId } = useLinks();
    const [activeCategories, setActiveCategories] = useState<LinkCategory[]>(getDefaultCategories);
    const [modalOpen, setModalOpen] = useState(false);
    const [currentLink, setCurrentLink] = useState<LinkItem | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const toggleCategory = (catId: LinkCategory) => {
        setActiveCategories(prev => {
            let next: LinkCategory[];
            if (prev.includes(catId)) {
                next = prev.filter(c => c !== catId);
            } else {
                next = [...prev, catId];
            }
            try {
                localStorage.setItem(DEFAULT_CATEGORIES_STORAGE_KEY, JSON.stringify(next));
            } catch (e) {}
            return next;
        });
    };

    const handleCreateNew = () => {
        setCurrentLink({
            id: Date.now().toString(),
            name: '',
            href: '',
            category: activeCategories[0] || 'trabajo',
            colorClass: 'text-gray-400 hover:text-white',
            iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>'
        });
        setModalOpen(true);
    };

    const handleSaveLink = (item: LinkItem, targetSection?: string) => {
        let newConfig = JSON.parse(JSON.stringify(config)); // Deep clone
        const currentSec = 'linksBar';
        
        // Ensure item has category inferred if missing
        if (!item.category) {
            item.category = inferLinkCategory(item);
        }

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
            if (currentLink && currentLink.id) {
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

    const isLinkAlwaysVisible = (link: LinkItem) => {
        const name = (link.name || '').toLowerCase();
        const href = (link.href || '').toLowerCase();
        return name.includes('whatsapp') || href.includes('whatsapp') || link.id === '2' || name.includes('javer') || href.includes('javer') || link.id === 'javer';
    };

    const isLinkIncludedInFilter = (link: LinkItem) => {
        const name = (link.name || '').toLowerCase();
        const href = (link.href || '').toLowerCase();
        if (link.id === 'renders-remb' || name.includes('renders remb') || href.includes('renders%20remb')) return false;
        if (isLinkAlwaysVisible(link)) return true; // WhatsApp y Javer siempre visibles
        const cat = link.category || inferLinkCategory(link);
        return activeCategories.includes(cat);
    };

    // Deduplicate on the fly so Javer, Flow, MakerWorld and others never appear duplicated, and exclude renders remb
    const cleanLinksBar = (Array.isArray(normalizeAndDeduplicateLinksBar(config?.linksBar || []))
        ? normalizeAndDeduplicateLinksBar(config?.linksBar || [])
        : []).filter(l => 
            l.id !== 'renders-remb' && !(l.name || '').toLowerCase().includes('renders remb') && !(l.href || '').toLowerCase().includes('renders%20remb')
        );
    
    const filteredLinks = cleanLinksBar.filter(isLinkIncludedInFilter);

    const isJaverLink = (l: LinkItem) => l.id === 'javer' || (l.name || '').toLowerCase() === 'javer' || (l.href || '').toLowerCase().includes('portal.javer.net');

    const javerItem = cleanLinksBar.find(isJaverLink) || {
        id: 'javer',
        name: 'Javer',
        href: 'https://portal.javer.net/Paginas/Index.aspx',
        category: 'trabajo' as LinkCategory,
        colorClass: 'text-blue-400 hover:text-white',
        iconSvg: '<img src="/javer_premium.png" class="w-10 h-10 object-contain" />'
    };

    const otherFilteredLinks = filteredLinks.filter(l => !isJaverLink(l));

    const handleReorder = (newSubset: LinkItem[]) => {
        const newLinks = [...cleanLinksBar];
        const categoryIndices: number[] = [];
        newLinks.forEach((item, idx) => {
            if (isLinkIncludedInFilter(item)) {
                categoryIndices.push(idx);
            }
        });
        newSubset.forEach((item, i) => {
            if (i < categoryIndices.length) {
                newLinks[categoryIndices[i]] = item;
            }
        });
        updateConfig({ ...config, linksBar: normalizeAndDeduplicateLinksBar(newLinks) });
    };

    const handleReorderOther = (newOtherSubset: LinkItem[]) => {
        handleReorder([javerItem, ...newOtherSubset]);
    };

    const handleMoveLink = (id: string, direction: 'left' | 'right') => {
        const list = cleanLinksBar.filter(isLinkIncludedInFilter);
        
        const index = list.findIndex(l => l.id === id);
        if (index === -1) return;
        
        if (direction === 'left' && index > 0) {
            const nextList = [...list];
            [nextList[index - 1], nextList[index]] = [nextList[index], nextList[index - 1]];
            handleReorder(nextList);
        } else if (direction === 'right' && index < list.length - 1) {
            const nextList = [...list];
            [nextList[index], nextList[index + 1]] = [nextList[index + 1], nextList[index]];
            handleReorder(nextList);
        }
    };

    const handleDeleteLink = (id: string) => {
        const newLinks = (config?.linksBar || []).filter(l => l.id !== id);
        updateConfig({ ...config, linksBar: normalizeAndDeduplicateLinksBar(newLinks) });
    };

    const handleImportJson = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            loadConfigFromFile(file);
            event.target.value = '';
        }
    };

    return (
        <div className="w-full bg-black/30 backdrop-blur-xl border border-white/5 px-2.5 py-1.5 sm:px-3 sm:py-2 mb-2 sm:mb-4 relative group/bar shadow-2xl rounded-2xl">
            {/* Edit Controls - Always visible for better discovery */}
            <div className="absolute top-4 right-4 flex flex-col gap-2 z-50">
            </div>

            {isEditing && (
                <div className="absolute top-2 left-2 flex flex-col gap-2 z-20">
                    <div className="flex gap-2 animate-fade-in flex-wrap">
                        <button 
                            onClick={handleCreateNew}
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

            <div className={`flex items-center gap-2 sm:gap-3 max-w-full mx-auto w-full px-0.5 sm:px-1 ${isEditing ? 'mt-14' : 'mt-0'}`}>
                {/* Logo de Javer */}
                <div className="shrink-0 flex items-center">
                    <LinkIcon 
                        item={javerItem} 
                        isEditing={isEditing}
                        onEdit={(item) => { setCurrentLink(item); setModalOpen(true); }}
                        onDelete={handleDeleteLink}
                        onMove={handleMoveLink}
                        isFirst={true}
                        isLast={false}
                        onSelectInternalTab={setActiveTabId}
                    />
                </div>

                {/* Pila Vertical de las 3 Categorías (Trabajo, Compras, Social) acomodadas en columna para coincidir con la altura del icono */}
                <div className="flex flex-col justify-center gap-0.5 sm:gap-1 shrink-0 select-none py-0.5">
                    {CATEGORY_DEFINITIONS.map(cat => {
                        const count = cleanLinksBar.filter(l => (l.category || inferLinkCategory(l)) === cat.id).length;
                        const isActive = activeCategories.includes(cat.id);

                        return (
                            <button
                                key={cat.id}
                                type="button"
                                onClick={() => toggleCategory(cat.id)}
                                className={`group/pill relative flex items-center justify-between gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all duration-200 border whitespace-nowrap cursor-pointer shrink-0 ${
                                    isActive 
                                        ? `${cat.activeClass} shadow-sm scale-[1.01]` 
                                        : `bg-white/[0.03] border-white/10 text-gray-400 opacity-60 hover:opacity-100 ${cat.hoverClass}`
                                }`}
                                title={`Clic para ${isActive ? 'desactivar' : 'activar'} categoría ${cat.label}`}
                            >
                                <div className="flex items-center gap-1">
                                    {cat.iconType === 'trabajo' && <Briefcase size={11} className={isActive ? 'text-blue-400' : 'text-gray-400 group-hover/pill:text-blue-300'} />}
                                    {cat.iconType === 'compras' && <ShoppingCart size={11} className={isActive ? 'text-amber-400' : 'text-gray-400 group-hover/pill:text-amber-300'} />}
                                    {cat.iconType === 'social' && <MessageCircle size={11} className={isActive ? 'text-pink-400' : 'text-gray-400 group-hover/pill:text-pink-300'} />}
                                    
                                    <span className="capitalize text-[10px] sm:text-[11px] leading-tight">{cat.label}</span>
                                </div>
                                
                                <div className="flex items-center gap-1 ml-1.5">
                                    <span className={`text-[9px] font-mono px-1 py-0.2 rounded ${
                                        isActive 
                                            ? 'bg-black/40 text-white font-bold' 
                                            : 'bg-white/5 text-gray-500'
                                    }`}>
                                        {count}
                                    </span>

                                    <div className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
                                        isActive 
                                            ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]' 
                                            : 'bg-gray-600/40'
                                    }`} />
                                </div>
                            </button>
                        );
                    })}
                </div>

                <div className="h-10 w-[1px] bg-white/10 shrink-0 hidden sm:block mx-0.5" />

                {/* Lista de los demás Enlaces interactivos con scroll horizontal suave y siempre centrado */}
                <div className="flex-1 min-w-0 overflow-x-auto no-scrollbar scroll-smooth flex justify-center">
                    <SortableLinkList 
                        key={`links-bar-${activeCategories.slice().sort().join('-')}`}
                        id="linksBar"
                        items={otherFilteredLinks}
                        isEditing={isEditing}
                        onReorder={handleReorderOther}
                        strategy={rectSortingStrategy}
                        className="flex items-center justify-center gap-2 sm:gap-2.5 py-1 min-h-[50px] px-0.5 mx-auto"
                        renderItem={(link, index) => (
                            <LinkIcon 
                                key={link.id} 
                                item={link} 
                                isEditing={isEditing}
                                onEdit={(item) => { setCurrentLink(item); setModalOpen(true); }}
                                onDelete={handleDeleteLink}
                                onMove={handleMoveLink}
                                isFirst={false}
                                isLast={index === otherFilteredLinks.length - 1}
                                onSelectInternalTab={setActiveTabId}
                            />
                        )}
                    />
                    
                    {otherFilteredLinks.length === 0 && (
                        <div className="text-gray-500 text-xs italic py-2 text-center whitespace-nowrap">
                            Ningún otro enlace con los filtros activos.
                        </div>
                    )}
                </div>

                {/* Pancho Assistant Button a la derecha de la barra (Caja roja de la solicitud) */}
                <div className="shrink-0 flex items-center pl-1 sm:pl-2 border-l border-white/10">
                    <button
                        onClick={() => window.dispatchEvent(new CustomEvent('open-pancho'))}
                        className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-2xl bg-gradient-to-r from-purple-950/60 via-purple-900/40 to-pink-950/40 hover:from-purple-900/70 hover:to-pink-900/60 border border-purple-500/40 text-purple-200 hover:text-white transition-all shadow-lg hover:shadow-purple-500/20 group/panchoBar shrink-0 cursor-pointer"
                        title="Abrir a Pancho Asistente"
                    >
                        <div className="relative flex items-center justify-center shrink-0">
                            <PanchoRobotAvatar state="idle" size={28} showTail={false} />
                            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
                        </div>
                        <div className="hidden sm:flex flex-col text-left leading-none">
                            <span className="text-[11px] font-bold text-white group-hover/panchoBar:text-pink-300 transition-colors">Pancho</span>
                            <span className="text-[8px] text-purple-300/80 font-mono">IA Asistente</span>
                        </div>
                    </button>
                </div>
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
