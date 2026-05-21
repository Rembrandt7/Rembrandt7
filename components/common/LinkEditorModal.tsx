import React, { useState, useEffect, useCallback } from 'react';
import { LinkItem } from '../../types';
import { X, Save, ArrowLeft, Layout, Type, Link as LinkIcon, Palette, Image as ImageIcon, Box } from 'lucide-react';
import { useLinks } from '../../contexts/LinkContext';
import { motion, AnimatePresence } from 'motion/react';

interface LinkEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (item: LinkItem, targetSection?: string) => void;
    initialItem: LinkItem | null;
    currentSection?: string;
    showSectionSelector?: boolean;
}

export const LinkEditorModal: React.FC<LinkEditorModalProps> = ({ isOpen, onClose, onSave, initialItem, currentSection, showSectionSelector = true }) => {
    const { config } = useLinks();
    const [targetSection, setTargetSection] = useState<string>(currentSection || 'linksBar');
    const [formData, setFormData] = useState<LinkItem>(initialItem || {
        id: '',
        name: '',
        href: '',
        description: '',
        colorClass: 'text-gray-400 hover:text-white',
        iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>'
    });

    useEffect(() => {
        if (isOpen) {
            setTargetSection(currentSection || 'linksBar');
            if (initialItem) {
                setFormData(initialItem);
            } else {
                setFormData({
                    id: Date.now().toString(),
                    href: '',
                    name: '',
                    description: '',
                    colorClass: 'text-gray-400 hover:text-white',
                    iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>'
                });
            }
        }
    }, [initialItem, isOpen, currentSection]);

    const sections = [
        { id: 'linksBar', name: 'Barra Central' },
        { id: 'googleDock', name: 'Dock Google (Izquierda)' },
        { id: 'aiSidebar.models', name: 'Modelos IA (Sidebar)' },
        { id: 'aiSidebar.quickAccess', name: 'Acceso Rápido (Sidebar)' },
        { id: 'rightSidebar.0', name: 'Imágenes (Derecha)' },
        { id: 'rightSidebar.1', name: 'Video (Derecha)' },
        { id: 'rightSidebar.2', name: 'Audio (Derecha)' },
        { id: 'rightSidebar.3', name: 'Herramientas (Derecha)' },
        ...config.usefulTools.map((s, idx) => ({ id: `usefulTools.${idx}`, name: `Herramientas: ${s.title}` })),
        ...config.tabs.filter(t => t.type === 'custom').map(t => ({ id: `tab:${t.id}`, name: `Pestaña: ${t.label}` }))
    ];

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) {
            if (file.type === 'image/svg+xml') {
                 const textReader = new FileReader();
                 textReader.onload = (e) => {
                     setFormData(prev => ({ ...prev, iconSvg: e.target?.result as string }));
                 };
                 textReader.readAsText(file);
            } else if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const result = event.target?.result as string;
                    setFormData(prev => ({ ...prev, iconSvg: `<img src="${result}" class="w-full h-full object-contain" />` }));
                };
                reader.readAsDataURL(file);
            }
        }
    }, []);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop / Overlay */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] cursor-pointer"
                    />

                    {/* Right Side Panel (Drawer) */}
                    <motion.div 
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 h-full w-full max-w-[480px] glass-panel-heavy z-[100] shadow-[0_0_50px_rgba(0,0,0,0.5)] border-l border-white/10 flex flex-col overflow-hidden"
                    >
                        {/* Header Panel */}
                        <div className="p-6 border-b border-white/5 bg-white/2 flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-600/20 rounded-xl text-blue-400">
                                    <Layout size={20} />
                                </div>
                                <h2 className="text-xl font-bold text-white tracking-tight">
                                    {initialItem ? 'Editar Acceso' : 'Nuevo Acceso'}
                                </h2>
                            </div>
                            <button 
                                onClick={onClose} 
                                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        
                        {/* Form Body */}
                        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar space-y-8 pb-32">
                            {/* Section Selector */}
                            {showSectionSelector && (
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest px-1">
                                        <ArrowLeft size={12} className="text-blue-500" />
                                        Destino del Acceso
                                    </label>
                                    <select 
                                        value={targetSection}
                                        onChange={e => setTargetSection(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all appearance-none cursor-pointer"
                                    >
                                        {sections.map(s => (
                                            <option key={s.id} value={s.id} className="bg-gray-900">{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Nombre y URL */}
                            <div className="grid grid-cols-1 gap-6">
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest px-1">
                                        <Type size={12} className="text-purple-500" />
                                        Nombre del Acceso
                                    </label>
                                    <input 
                                        type="text" 
                                        value={formData.name}
                                        onChange={e => setFormData({...formData, name: e.target.value})}
                                        placeholder="Ej: Google Drive"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all placeholder:text-gray-600"
                                    />
                                </div>
                                
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest px-1">
                                        <LinkIcon size={12} className="text-pink-500" />
                                        URL de Destino
                                    </label>
                                    <input 
                                        type="text" 
                                        value={formData.href}
                                        onChange={e => setFormData({...formData, href: e.target.value})}
                                        placeholder="https://..."
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/50 transition-all placeholder:text-gray-600 font-mono text-sm"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest px-1">
                                    Descripción
                                </label>
                                <textarea 
                                    value={formData.description || ''}
                                    onChange={e => setFormData({...formData, description: e.target.value})}
                                    placeholder="Opcional..."
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all min-h-[80px] resize-y"
                                />
                            </div>

                            {/* Estilos */}
                            <div className="space-y-6 pt-4 border-t border-white/5">
                                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                    <Palette size={16} className="text-yellow-500" />
                                    Personalización Visual
                                </h3>
                                
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] px-1">
                                        Clases de Color (Tailwind)
                                    </label>
                                    <input 
                                        type="text" 
                                        value={formData.colorClass || ''}
                                        onChange={e => setFormData({...formData, colorClass: e.target.value})}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 transition-all font-mono text-xs"
                                        placeholder="Ej: text-blue-500 hover:text-blue-400"
                                    />
                                </div>

                                <div className="flex items-center gap-3 p-4 bg-white/2 rounded-2xl border border-white/5">
                                    <input 
                                        type="checkbox" 
                                        id="hasBackground"
                                        checked={formData.hasBackground !== false}
                                        onChange={e => setFormData({...formData, hasBackground: e.target.checked})}
                                        className="w-5 h-5 rounded-lg border-white/20 bg-gray-800 text-blue-600 focus:ring-blue-500/50"
                                    />
                                    <label htmlFor="hasBackground" className="text-sm text-gray-300 font-medium cursor-pointer">
                                        Mostrar contenedor de fondo
                                    </label>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] px-1">Color Contorno</label>
                                        <div className="flex gap-2">
                                            <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-white/10">
                                                <input 
                                                    type="color" 
                                                    value={formData.outlineColor || '#ffffff'}
                                                    onChange={e => setFormData({...formData, outlineColor: e.target.value})}
                                                    className="absolute inset-0 w-full h-full scale-[2] cursor-pointer"
                                                />
                                            </div>
                                            <input 
                                                type="text" 
                                                value={formData.outlineColor || ''}
                                                onChange={e => setFormData({...formData, outlineColor: e.target.value})}
                                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none text-xs font-mono"
                                                placeholder="#ffffff"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] px-1">Ancho (px)</label>
                                        <input 
                                            type="number" 
                                            min="0"
                                            max="20"
                                            value={formData.outlineWidth || 0}
                                            onChange={e => setFormData({...formData, outlineWidth: parseInt(e.target.value) || 0})}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Icono */}
                            <div className="space-y-4 pt-4 border-t border-white/5">
                                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                    <ImageIcon size={16} className="text-emerald-500" />
                                    Iconografía o Imagen
                                </h3>
                                
                                <div 
                                    onDrop={handleDrop}
                                    onDragOver={e => e.preventDefault()}
                                    className="w-full bg-white/2 border-2 border-dashed border-white/10 rounded-3xl p-8 text-center cursor-pointer hover:border-blue-500/50 hover:bg-blue-500/5 transition-all flex flex-col items-center justify-center gap-4 group"
                                >
                                    <div className="w-16 h-16 p-2 bg-gray-900 rounded-2xl shadow-xl transition-transform group-hover:scale-110 flex items-center justify-center" dangerouslySetInnerHTML={{ __html: formData.iconSvg }} />
                                    <div className="space-y-1">
                                        <p className="text-sm font-bold text-gray-300">Arrastra archivos aquí</p>
                                        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">SVG / PNG / JPG</p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] px-1 flex items-center gap-2">
                                        <Box size={10} /> Código SVG
                                    </label>
                                    <textarea 
                                        value={formData.iconSvg}
                                        onChange={e => setFormData({...formData, iconSvg: e.target.value})}
                                        className="w-full bg-gray-950/50 border border-white/10 rounded-xl px-4 py-4 text-white font-mono text-xs h-64 min-h-[250px] resize-y focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                                        placeholder="<svg>...</svg>"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Footer Panel */}
                        <div className="p-6 bg-black/40 backdrop-blur-3xl border-t border-white/5 flex gap-4 shrink-0">
                            <button 
                                onClick={onClose}
                                className="flex-1 px-4 py-4 rounded-2xl bg-white/5 text-gray-300 font-bold hover:bg-white/10 transition-all border border-white/5"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={() => onSave(formData, targetSection)}
                                className="flex-[2] flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold hover:from-blue-500 hover:to-indigo-500 shadow-[0_10px_25px_rgba(37,99,235,0.4)] transition-all active:scale-[0.98]"
                            >
                                <Save size={18} />
                                Guardar Cambios
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
