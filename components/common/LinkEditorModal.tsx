import React, { useState, useEffect, useCallback } from 'react';
import { LinkItem } from '../../types';
import { X } from 'lucide-react';
import { useLinks } from '../../contexts/LinkContext';

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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
            <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md border border-gray-700 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-white">{initialItem ? 'Editar Enlace' : 'Nuevo Enlace'}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
                </div>
                
                <div className="space-y-4">
                    {showSectionSelector && (
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Sección</label>
                            <select 
                                value={targetSection}
                                onChange={e => setTargetSection(e.target.value)}
                                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                            >
                                {sections.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Nombre</label>
                        <input 
                            type="text" 
                            value={formData.name}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">URL</label>
                        <input 
                            type="text" 
                            value={formData.href}
                            onChange={e => setFormData({...formData, href: e.target.value})}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Descripción (Opcional)</label>
                        <input 
                            type="text" 
                            value={formData.description || ''}
                            onChange={e => setFormData({...formData, description: e.target.value})}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Clases de Color (Tailwind)</label>
                        <input 
                            type="text" 
                            value={formData.colorClass || ''}
                            onChange={e => setFormData({...formData, colorClass: e.target.value})}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                            placeholder="Ej: text-red-500 hover:text-red-400"
                        />
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                        <input 
                            type="checkbox" 
                            id="hasBackground"
                            checked={formData.hasBackground !== false}
                            onChange={e => setFormData({...formData, hasBackground: e.target.checked})}
                            className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="hasBackground" className="text-sm font-medium text-gray-400">
                            Mostrar fondo circular/cuadrado (desmarcar para imágenes transparentes)
                        </label>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Color Contorno</label>
                            <div className="flex gap-2">
                                <input 
                                    type="color" 
                                    value={formData.outlineColor || '#ffffff'}
                                    onChange={e => setFormData({...formData, outlineColor: e.target.value})}
                                    className="h-10 w-10 bg-transparent border-0 cursor-pointer"
                                />
                                <input 
                                    type="text" 
                                    value={formData.outlineColor || ''}
                                    onChange={e => setFormData({...formData, outlineColor: e.target.value})}
                                    className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                                    placeholder="#ffffff"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Ancho Contorno (px)</label>
                            <input 
                                type="number" 
                                min="0"
                                max="20"
                                value={formData.outlineWidth || 0}
                                onChange={e => setFormData({...formData, outlineWidth: parseInt(e.target.value) || 0})}
                                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Icono (Arrastra una imagen o SVG aquí)</label>
                        <div 
                            onDrop={handleDrop}
                            onDragOver={e => e.preventDefault()}
                            className="w-full bg-gray-700 border-2 border-dashed border-gray-600 rounded px-3 py-4 text-center cursor-pointer hover:border-blue-500 transition-colors flex flex-col items-center justify-center gap-2"
                        >
                            <div className="w-12 h-12 mb-2" dangerouslySetInnerHTML={{ __html: formData.iconSvg }} />
                            <span className="text-xs text-gray-400">Arrastra y suelta un archivo aquí</span>
                        </div>
                        <textarea 
                            value={formData.iconSvg}
                            onChange={e => setFormData({...formData, iconSvg: e.target.value})}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white font-mono text-xs h-24 focus:outline-none focus:border-blue-500 mt-2"
                            placeholder="O pega el código SVG aquí..."
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 rounded bg-gray-700 text-gray-300 hover:bg-gray-600"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={() => onSave(formData, targetSection)}
                        className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-500"
                    >
                        Guardar
                    </button>
                </div>
            </div>
        </div>
    );
};
