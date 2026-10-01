import React, { useState } from 'react';
import { useLinks } from '../contexts/LinkContext';
import { LinkItem } from '../types';
import { LinkEditorModal } from './common/LinkEditorModal';
import { Edit, Trash2, Plus, RotateCcw } from 'lucide-react';
import { SortableLinkList } from './common/SortableLinkList';
import { verticalListSortingStrategy } from '@dnd-kit/sortable';
import { recordQuickAccessClick, sortQuickAccessByUsage, resetQuickAccessCounters } from '../utils/quickAccessUtils';
import { toast } from 'sonner';

const AiSidebarItem: React.FC<{ 
    item: LinkItem; 
    isEditing: boolean;
    onEdit: (item: LinkItem) => void;
    onDelete: (id: string) => void;
    onClick?: () => void;
    showClickBadge?: boolean;
}> = ({ item, isEditing, onEdit, onDelete, onClick, showClickBadge }) => {
    return (
        <div className="relative group w-full">
            <a 
                href={item.href} 
                target="_blank" 
                rel="noopener noreferrer" 
                onClick={(e) => {
                    if (isEditing) {
                        e.preventDefault();
                    } else {
                        if (item.id === 'qa-renders-remb' || (item.name || '').toLowerCase().includes('renders remb')) {
                            const localPath = "C:\\Users\\rblanco\\OneDrive - Servicios Administrativos Javer, S.A. DE C.V\\Renders Remb";
                            try {
                                if (navigator.clipboard && navigator.clipboard.writeText) {
                                    navigator.clipboard.writeText(localPath);
                                    toast.success("Abriendo Renders Remb... ¡Ruta local copiada al portapapeles!");
                                }
                            } catch (err) {}
                        }
                        onClick?.();
                    }
                }}
                onAuxClick={(e) => {
                    if (!isEditing && e.button === 1) {
                        onClick?.();
                    }
                }}
                className={`flex items-center gap-3 p-2.5 rounded-2xl transition-all duration-300 hover:bg-white/10 border border-transparent hover:border-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] group w-full ${item.colorClass || ''} ${isEditing ? 'opacity-50 cursor-default' : ''}`}
            >
                <div 
                    className="w-8 h-8 flex-shrink-0 flex items-center justify-center transition-transform group-hover:scale-110" 
                    style={{
                        filter: item.outlineColor && item.outlineWidth ? `drop-shadow(0 0 ${item.outlineWidth}px ${item.outlineColor})` : undefined
                    }}
                    dangerouslySetInnerHTML={{ __html: item.iconSvg }} 
                />
                <span className="font-semibold text-gray-400 group-hover:text-white truncate flex-1 text-left">
                    {item.name}
                </span>

                {showClickBadge && !isEditing && typeof item.clickCount === 'number' && item.clickCount > 0 && (
                    <span 
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-gray-400 group-hover:text-emerald-400 group-hover:bg-emerald-500/10 border border-white/5 transition-colors shrink-0 tabular-nums"
                        title={`Usado ${item.clickCount} ${item.clickCount === 1 ? 'vez' : 'veces'}`}
                    >
                        {item.clickCount}
                    </span>
                )}
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

const GEMINI_PREMIUM_ICON_SVG = '<svg viewBox="0 0 28 28" class="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="gemini-vivid-spark" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#00d2ff"/><stop offset="22%" stop-color="#3b82f6"/><stop offset="52%" stop-color="#8b5cf6"/><stop offset="78%" stop-color="#ec4899"/><stop offset="100%" stop-color="#ff4b4b"/></linearGradient><linearGradient id="gemini-secondary-spark" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#38bdf8"/><stop offset="100%" stop-color="#c084fc"/></linearGradient><radialGradient id="gemini-inner-light" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#ffffff" stop-opacity="0.85"/><stop offset="100%" stop-color="#ffffff" stop-opacity="0"/></radialGradient></defs><path d="M14 2C14 8.627 8.627 14 2 14C8.627 14 14 19.373 14 26C14 19.373 19.373 14 26 14C19.373 14 14 8.627 14 2Z" fill="url(#gemini-vivid-spark)"/><circle cx="14" cy="14" r="2.2" fill="url(#gemini-inner-light)"/><circle cx="14" cy="14" r="0.8" fill="#ffffff"/><path d="M22.5 2C22.5 4.2 20.7 6 18.5 6C20.7 6 22.5 7.8 22.5 10C22.5 7.8 24.3 6 26.5 6C24.3 6 22.5 4.2 22.5 2Z" fill="url(#gemini-secondary-spark)"/><circle cx="22.5" cy="6" r="0.6" fill="#ffffff"/></svg>';

const CHATGPT_PREMIUM_ICON_SVG = '<svg viewBox="0 0 24 24" class="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="chatgpt-emerald-grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#34d399"/><stop offset="50%" stop-color="#10b981"/><stop offset="100%" stop-color="#059669"/></linearGradient></defs><path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.168a.071.071 0 0 1 .038.052v5.5826a4.5045 4.5045 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.168a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.8956zm16.0993 3.8558L12.5973 8.3829l2.02-1.168a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.4023-.6813zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.163a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813v6.7227zm1.1449-1.9213l2.5484-1.4721 2.5484 1.4721v2.9442l-2.5484 1.4721-2.5484-1.4721z" fill="url(#chatgpt-emerald-grad)"/></svg>';

const CLAUDE_PREMIUM_ICON_SVG = '<svg viewBox="0 0 24 24" class="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="claude-vivid-terracotta" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ffedd5"/><stop offset="22%" stop-color="#fb923c"/><stop offset="60%" stop-color="#ea580c"/><stop offset="100%" stop-color="#c2410c"/></linearGradient><radialGradient id="claude-core-glow" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#ffffff" stop-opacity="0.95"/><stop offset="100%" stop-color="#ffffff" stop-opacity="0"/></radialGradient></defs><path d="m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z" fill="url(#claude-vivid-terracotta)"/><circle cx="12" cy="12" r="3.2" fill="url(#claude-core-glow)"/><circle cx="12" cy="12" r="1.2" fill="#ffffff"/></svg>';

const AiCompactTrioItem: React.FC<{
    item: LinkItem;
    isEditing: boolean;
    onEdit: (item: LinkItem) => void;
    onDelete: (id: string) => void;
}> = ({ item, isEditing, onEdit, onDelete }) => {
    const isGemini = item.id === 'ai-gemini' || item.id === 'gd-1' || item.name?.toLowerCase().includes('gemini');
    const isChatGPT = item.id === 'ai-1' || item.name?.toLowerCase().includes('chatgpt');
    const isClaude = item.id === 'ai-5' || item.name?.toLowerCase().includes('claude');

    let iconSvg = item.iconSvg;
    let cardStyle = '';
    let iconGlow = '';
    let dotColor = '';

    if (isGemini) {
        iconSvg = GEMINI_PREMIUM_ICON_SVG;
        cardStyle = 'bg-gradient-to-br from-blue-600/30 via-indigo-600/25 to-pink-600/30 hover:from-blue-600/45 hover:via-purple-600/40 hover:to-pink-600/45 border-blue-400/40 hover:border-purple-300/80 shadow-[0_0_15px_rgba(78,135,245,0.25)] hover:shadow-[0_0_28px_rgba(168,85,247,0.65),0_0_12px_rgba(56,189,248,0.4)] scale-[1.03]';
        iconGlow = 'drop-shadow(0 0 6px rgba(168,85,247,0.85)) drop-shadow(0 0 14px rgba(56,189,248,0.6))';
        dotColor = 'bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]';
    } else if (isChatGPT) {
        iconSvg = CHATGPT_PREMIUM_ICON_SVG;
        cardStyle = 'bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-emerald-600/20 hover:from-emerald-500/30 hover:via-teal-500/25 hover:to-emerald-600/35 border-emerald-500/30 hover:border-teal-300 shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5),0_0_10px_rgba(45,212,191,0.35)]';
        iconGlow = 'drop-shadow(0 0 6px rgba(16,185,129,0.8)) drop-shadow(0 0 12px rgba(45,212,191,0.5))';
        dotColor = 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]';
    } else if (isClaude) {
        iconSvg = CLAUDE_PREMIUM_ICON_SVG;
        cardStyle = 'bg-gradient-to-br from-amber-500/20 via-orange-500/15 to-amber-600/25 hover:from-amber-500/35 hover:via-orange-500/30 hover:to-amber-600/40 border-amber-500/40 hover:border-orange-300/80 shadow-[0_0_15px_rgba(249,115,22,0.25)] hover:shadow-[0_0_28px_rgba(249,115,22,0.65),0_0_12px_rgba(251,146,60,0.4)] scale-[1.02]';
        iconGlow = 'drop-shadow(0 0 6px rgba(249,115,22,0.85)) drop-shadow(0 0 14px rgba(251,146,60,0.6))';
        dotColor = 'bg-gradient-to-r from-amber-400 to-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]';
    } else {
        cardStyle = 'bg-white/[0.04] hover:bg-white/12 border-white/5 hover:border-white/20 hover:shadow-[0_0_15px_rgba(255,255,255,0.08)]';
        dotColor = 'bg-gray-400';
    }

    return (
        <div className="relative group flex items-center justify-center flex-1 min-w-0">
            <a 
                href={item.href} 
                target="_blank" 
                rel="noopener noreferrer" 
                onClick={(e) => {
                    if (isEditing) e.preventDefault();
                }}
                className={`relative flex items-center justify-center w-full h-12 rounded-xl transition-all duration-300 group overflow-hidden border backdrop-blur-sm hover:-translate-y-0.5 active:translate-y-0 active:scale-95 ${cardStyle} ${item.colorClass || ''} ${isEditing ? 'opacity-50 cursor-default' : ''}`}
                title={item.name}
            >
                {/* Reflejo specular / shimmer al hacer hover */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.12] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                <div 
                    className={`${isGemini ? 'w-7 h-7' : isClaude ? 'w-7 h-7' : 'w-6 h-6'} flex-shrink-0 flex items-center justify-center transition-transform duration-200 group-hover:scale-115 relative z-10`} 
                    style={{
                        filter: item.outlineColor && item.outlineWidth 
                            ? `drop-shadow(0 0 ${item.outlineWidth}px ${item.outlineColor})` 
                            : (iconGlow || undefined)
                    }}
                    dangerouslySetInnerHTML={{ __html: iconSvg }} 
                />

                {/* Tooltip elegante con el nombre y dot indicador */}
                {!isEditing && (
                    <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-gray-950/90 backdrop-blur-xl border border-white/15 text-white text-[11px] font-bold rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 shadow-[0_8px_25px_rgba(0,0,0,0.6)] scale-95 group-hover:scale-100 flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
                        <span>{item.name}</span>
                        <div className="absolute left-1/2 bottom-full -translate-x-1/2 translate-y-1 w-2 h-2 bg-gray-950/90 border-l border-t border-white/15 transform rotate-45" />
                    </div>
                )}
            </a>

            {isEditing && (
                <div className="absolute -top-1.5 -right-1 flex gap-0.5 z-30 pointer-events-auto">
                    <button 
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); onEdit(item); }}
                        className="p-1 bg-blue-600 rounded-full text-white hover:bg-blue-500 shadow-md"
                        title="Editar"
                    >
                        <Edit size={10} />
                    </button>
                    <button 
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); onDelete(item.id); }}
                        className="p-1 bg-red-600 rounded-full text-white hover:bg-red-500 shadow-md"
                        title="Eliminar"
                    >
                        <Trash2 size={10} />
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
                list = list.map(l => l.id === item.id ? { ...l, ...item } : l);
            } else {
                list.push({ ...item, id: item.id || Date.now().toString(), clickCount: 0 });
            }
            if (activeSection === 'quickAccess') {
                list = sortQuickAccessByUsage(list);
            }
            newConfig.aiSidebar[activeSection] = list;
        }
        
        updateConfig(newConfig);
        setModalOpen(false);
        setCurrentLink(null);
    };

    const handleQuickAccessClick = (id: string) => {
        if (isEditing) return;
        updateConfig((prev) => {
            const currentList = prev.aiSidebar?.quickAccess || [];
            const sorted = recordQuickAccessClick(currentList, id);
            return {
                ...prev,
                aiSidebar: {
                    ...prev.aiSidebar,
                    quickAccess: sorted
                }
            };
        });
    };

    const handleResetQuickAccessCounters = () => {
        if (window.confirm('¿Deseas reiniciar los contadores de clics de los Accesos Rápidos?')) {
            updateConfig((prev) => ({
                ...prev,
                aiSidebar: {
                    ...prev.aiSidebar,
                    quickAccess: resetQuickAccessCounters(prev.aiSidebar?.quickAccess || [])
                }
            }));
        }
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

    const allModels = config.aiSidebar?.models || [];

    const defaultGemini: LinkItem = {
        id: 'ai-gemini',
        name: 'Gemini',
        href: 'https://gemini.google.com/app',
        colorClass: 'text-blue-400 hover:text-blue-300',
        iconSvg: GEMINI_PREMIUM_ICON_SVG
    };

    const defaultChatGPT: LinkItem = {
        id: 'ai-1',
        name: 'ChatGPT',
        href: 'https://chatgpt.com/',
        colorClass: 'text-teal-400 hover:text-teal-300',
        iconSvg: '<svg class="w-full h-full fill-current" viewBox="0 0 24 24"><path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.168a.071.071 0 0 1 .038.052v5.5826a4.5045 4.5045 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.168a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.8956zm16.0993 3.8558L12.5973 8.3829l2.02-1.168a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.4023-.6813zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.163a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813v6.7227zm1.1449-1.9213l2.5484-1.4721 2.5484 1.4721v2.9442l-2.5484 1.4721-2.5484-1.4721z"/></svg>'
    };

    const defaultClaude: LinkItem = {
        id: 'ai-5',
        name: 'Claude',
        href: 'https://claude.ai/new',
        colorClass: 'text-orange-400 hover:text-orange-300',
        iconSvg: '<svg class="w-full h-full fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" /></svg>'
    };

    let geminiItem = allModels.find(m => {
        const name = (m.name || '').toLowerCase();
        const href = (m.href || '').toLowerCase();
        return name.includes('gemini') || href.includes('gemini.google.com') || m.id === 'ai-gemini' || m.id === 'gd-1';
    }) || defaultGemini;
    geminiItem = { ...defaultGemini, ...geminiItem, id: geminiItem.id || 'ai-gemini', iconSvg: GEMINI_PREMIUM_ICON_SVG };

    let chatGptItem = allModels.find(m => {
        const name = (m.name || '').toLowerCase();
        const href = (m.href || '').toLowerCase();
        return name.includes('chatgpt') || href.includes('chatgpt.com') || m.id === 'ai-1';
    }) || defaultChatGPT;
    chatGptItem = { ...defaultChatGPT, ...chatGptItem, id: chatGptItem.id || 'ai-1' };

    let claudeItem = allModels.find(m => {
        const name = (m.name || '').toLowerCase();
        const href = (m.href || '').toLowerCase();
        return name.includes('claude') || href.includes('claude.ai') || m.id === 'ai-5';
    }) || defaultClaude;
    claudeItem = { ...defaultClaude, ...claudeItem, id: claudeItem.id || 'ai-5' };

    const topTrio = [geminiItem, chatGptItem, claudeItem];

    const otherModels = allModels.filter(m => {
        const name = (m.name || '').toLowerCase();
        const href = (m.href || '').toLowerCase();
        const isGem = name.includes('gemini') || href.includes('gemini.google.com') || m.id === 'ai-gemini' || m.id === 'gd-1' || m.id === geminiItem.id;
        const isGpt = name.includes('chatgpt') || href.includes('chatgpt.com') || m.id === 'ai-1' || m.id === chatGptItem.id;
        const isCld = name.includes('claude') || href.includes('claude.ai') || m.id === 'ai-5' || m.id === claudeItem.id;
        return !isGem && !isGpt && !isCld;
    });

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
                    {/* Renglón principal con 3 IAs: Gemini | ChatGPT | Claude (solo icono, nombre en hover) */}
                    <div className="grid grid-cols-3 gap-2 p-1.5 bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/10 rounded-2xl mb-2 shadow-[0_4px_20px_rgba(0,0,0,0.3)] backdrop-blur-md">
                        {topTrio.map((item) => (
                            <AiCompactTrioItem 
                                key={item.id}
                                item={item}
                                isEditing={isEditing}
                                onEdit={(i) => openModal('models', i)}
                                onDelete={(id) => handleDeleteLink(id, 'models')}
                            />
                        ))}
                    </div>

                    <SortableLinkList 
                        id="aiSidebar.models"
                        items={otherModels}
                        isEditing={isEditing}
                        onReorder={(newItems) => updateConfig({ ...config, aiSidebar: { ...config.aiSidebar, models: [geminiItem, chatGptItem, claudeItem, ...newItems] } })}
                        strategy={verticalListSortingStrategy}
                        className="flex flex-col gap-1"
                        itemClassName="w-full"
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
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={handleResetQuickAccessCounters} 
                                className="text-gray-400 hover:text-amber-400 transition-colors p-1"
                                title="Reiniciar contadores de clics"
                            >
                                <RotateCcw size={14} />
                            </button>
                            <button onClick={() => openModal('quickAccess')} className="text-green-500 hover:text-green-400 p-1">
                                <Plus size={16} />
                            </button>
                        </div>
                    )}
                </div>

                <nav className="flex flex-col gap-1 px-3 pb-6">
                    <SortableLinkList 
                        id="aiSidebar.quickAccess"
                        items={(config.aiSidebar.quickAccess || []).filter(l => l.id !== 'qa-renders-remb' && !(l.name || '').toLowerCase().includes('renders remb') && !(l.href || '').toLowerCase().includes('renders%20remb'))}
                        isEditing={isEditing}
                        onReorder={(newItems) => updateConfig({ ...config, aiSidebar: { ...config.aiSidebar, quickAccess: newItems } })}
                        strategy={verticalListSortingStrategy}
                        className="flex flex-col gap-1"
                        itemClassName="w-full"
                        renderItem={(item) => (
                            <AiSidebarItem 
                                key={item.id} 
                                item={item} 
                                isEditing={isEditing}
                                showClickBadge={true}
                                onClick={() => handleQuickAccessClick(item.id)}
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
