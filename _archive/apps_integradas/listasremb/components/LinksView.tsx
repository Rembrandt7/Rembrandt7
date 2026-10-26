import React, { useState } from 'react';
import { LinkItem } from '../types';
import { Link as LinkIcon, Plus, X, Trash2, ExternalLink, Globe, LayoutGrid, Edit2, GripVertical, Save } from 'lucide-react';

interface LinksViewProps {
  links: LinkItem[];
  onAddLink: (link: LinkItem) => void;
  onDeleteLink: (id: string) => void;
  onUpdateLink: (link: LinkItem) => void;
}

const LinksView: React.FC<LinksViewProps> = ({ links, onAddLink, onDeleteLink, onUpdateLink }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [formData, setFormData] = useState<Partial<LinkItem>>({
    theme: 'General',
    color: '#3b82f6'
  });

  // Drag and Drop State
  const [draggedLinkId, setDraggedLinkId] = useState<string | null>(null);
  const [dragOverTheme, setDragOverTheme] = useState<string | null>(null);

  const availableColors = [
    { name: 'Azul', value: '#3b82f6' },
    { name: 'Verde', value: '#10b981' },
    { name: 'Rojo', value: '#ef4444' },
    { name: 'Amarillo', value: '#f59e0b' },
    { name: 'Morado', value: '#8b5cf6' },
    { name: 'Rosa', value: '#ec4899' },
    { name: 'Gris', value: '#64748b' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.url && formData.title) {
      let finalUrl = formData.url;
      if (!/^https?:\/\//i.test(finalUrl)) {
        finalUrl = 'https://' + finalUrl;
      }

      if (editingId) {
        // Update existing
        onUpdateLink({
            id: editingId,
            url: finalUrl,
            title: formData.title,
            theme: formData.theme || 'General',
            color: formData.color || '#3b82f6'
        });
      } else {
        // Create new
        onAddLink({
            id: Date.now().toString(),
            url: finalUrl,
            title: formData.title,
            theme: formData.theme || 'General',
            color: formData.color || '#3b82f6'
        });
      }
      
      resetForm();
    }
  };

  const resetForm = () => {
    setFormData({ theme: 'General', color: '#3b82f6', title: '', url: '' });
    setIsFormOpen(false);
    setEditingId(null);
  };

  const handleEditClick = (link: LinkItem) => {
      setFormData(link);
      setEditingId(link.id);
      setIsFormOpen(true);
      // Scroll to form if needed
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- Drag and Drop Handlers ---

  const handleDragStart = (e: React.DragEvent, linkId: string) => {
    e.dataTransfer.setData('linkId', linkId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedLinkId(linkId);
  };

  const handleDragOver = (e: React.DragEvent, theme: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverTheme(theme);
  };

  const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      // Only clear if we are leaving the valid drop zone area, handled slightly loosely here for UX
      // setDragOverTheme(null); 
  };

  const handleDrop = (e: React.DragEvent, targetTheme: string) => {
    e.preventDefault();
    const linkId = e.dataTransfer.getData('linkId');
    
    if (linkId) {
        const link = links.find(l => l.id === linkId);
        if (link && link.theme !== targetTheme) {
            onUpdateLink({ ...link, theme: targetTheme });
        }
    }
    setDraggedLinkId(null);
    setDragOverTheme(null);
  };


  // Group links by Theme
  const groupedLinks = links.reduce((groups, link) => {
    const theme = link.theme || 'General';
    if (!groups[theme]) {
      groups[theme] = [];
    }
    groups[theme].push(link);
    return groups;
  }, {} as Record<string, LinkItem[]>);

  return (
    <div className="h-full flex flex-col bg-slate-50 p-6 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <LinkIcon className="w-6 h-6 text-blue-600" />
            Links Rápidos
          </h2>
          <p className="text-slate-500 text-sm">Acceso directo a tus recursos web favoritos.</p>
        </div>
        <button 
            onClick={() => {
                if(isFormOpen && editingId) {
                    resetForm();
                } else {
                    setIsFormOpen(!isFormOpen);
                    setEditingId(null);
                    setFormData({ theme: 'General', color: '#3b82f6', title: '', url: '' });
                }
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${isFormOpen ? 'bg-slate-200 text-slate-600' : 'bg-blue-600 text-white shadow-lg shadow-blue-200'}`}
        >
            {isFormOpen ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {isFormOpen ? 'Cancelar' : 'Nuevo Link'}
        </button>
      </div>

      {/* Add / Edit Form */}
      {isFormOpen && (
        <form onSubmit={handleSubmit} className="mb-8 bg-white p-5 rounded-xl border border-slate-200 shadow-sm animate-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
             <h3 className="font-bold text-slate-700">{editingId ? 'Editar Link' : 'Agregar Nuevo Link'}</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">Título</label>
              <input 
                required
                value={formData.title || ''}
                onChange={e => setFormData({...formData, title: e.target.value})}
                placeholder="Ej: Google Drive"
                className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">URL</label>
              <input 
                required
                value={formData.url || ''}
                onChange={e => setFormData({...formData, url: e.target.value})}
                placeholder="www.google.com"
                className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">Tema (Agrupación)</label>
              <div className="relative">
                <LayoutGrid className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  value={formData.theme || ''}
                  onChange={e => setFormData({...formData, theme: e.target.value})}
                  placeholder="Ej: Trabajo, Ocio..."
                  list="themes-list"
                  className="w-full mt-1 pl-9 bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:border-blue-500"
                />
                <datalist id="themes-list">
                  {Object.keys(groupedLinks).map(theme => (
                    <option key={theme} value={theme} />
                  ))}
                </datalist>
              </div>
            </div>
            
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">Color</label>
              <div className="flex gap-2 mt-2">
                {availableColors.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setFormData({...formData, color: c.value})}
                    className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${formData.color === c.value ? 'border-slate-800 scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
             {editingId && (
                 <button type="button" onClick={resetForm} className="text-slate-500 px-4 py-2 hover:bg-slate-50 rounded-lg text-sm">Cancelar</button>
             )}
            <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2">
              {editingId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {editingId ? 'Guardar Cambios' : 'Añadir Link'}
            </button>
          </div>
        </form>
      )}

      {/* Grid of Links */}
      <div className="flex-1 overflow-y-auto pr-2 pb-10">
        {Object.keys(groupedLinks).length === 0 ? (
           <div className="h-64 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
               <Globe className="w-12 h-12 mb-2 opacity-20" />
               <p>No tienes links guardados.</p>
           </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedLinks).map(([theme, themeLinks]) => (
              <div 
                key={theme} 
                className={`animate-in fade-in duration-500 p-4 rounded-xl transition-colors border ${dragOverTheme === theme ? 'bg-blue-50 border-blue-200 border-dashed' : 'border-transparent'}`}
                onDragOver={(e) => handleDragOver(e, theme)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, theme)}
              >
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                      {theme}
                      {dragOverTheme === theme && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Soltar aquí</span>}
                  </h3>
                  <div className="h-px flex-1 bg-slate-200"></div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {(themeLinks as LinkItem[]).map(link => (
                    <div 
                      key={link.id} 
                      draggable
                      onDragStart={(e) => handleDragStart(e, link.id)}
                      className={`group relative bg-white rounded-xl border shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col cursor-grab active:cursor-grabbing
                        ${draggedLinkId === link.id ? 'opacity-50' : ''} border-slate-200`}
                    >
                      {/* Color Stripe */}
                      <div className="h-1.5 w-full" style={{ backgroundColor: link.color }}></div>
                      
                      <div className="p-4 flex items-start justify-between gap-3">
                         <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${link.color}15` }}>
                               <LinkIcon className="w-5 h-5" style={{ color: link.color }} />
                            </div>
                            <div className="truncate">
                               <h4 className="font-bold text-slate-800 truncate" title={link.title}>{link.title}</h4>
                               <p className="text-xs text-slate-400 truncate">{new URL(link.url).hostname}</p>
                            </div>
                         </div>
                         <div className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300">
                             <GripVertical className="w-4 h-4" />
                         </div>
                      </div>

                      <div className="px-4 pb-4 pt-0 flex gap-2 mt-auto">
                        <a 
                          href={link.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex-1 py-2 rounded-lg text-xs font-bold text-center transition-colors flex items-center justify-center gap-2 border border-slate-100 hover:border-slate-200 bg-slate-50 hover:bg-white text-slate-600"
                        >
                           Abrir <ExternalLink className="w-3 h-3" />
                        </a>
                        <button 
                           onClick={() => handleEditClick(link)}
                           className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                           title="Editar"
                        >
                           <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                           onClick={() => { if(confirm('¿Eliminar link?')) onDeleteLink(link.id) }}
                           className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                           title="Eliminar"
                        >
                           <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LinksView;