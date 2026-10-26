import React, { useRef, useMemo, useState } from 'react';
import { Paperclip, Trash2, File as FileIcon, UploadCloud, CopyPlus, PenTool, FileText, Image as ImageIcon, Video, ArrowLeftRight, ChevronDown, ChevronRight, Eye, ExternalLink } from 'lucide-react';
import { AttachmentFile, AttachmentCategory } from '../types';
import { formatBytes } from '../utils/fileHelpers';

interface AttachmentsPanelProps {
  attachments: AttachmentFile[];
  onAddFiles: (files: File[]) => void;
  onRemove: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  onClear: () => void;
  onClearCategory: (category: AttachmentCategory) => void;
  onImportConverted: () => void;
  onPreview: (file: AttachmentFile) => void;
  hasConvertedFiles: boolean;
  onDropAction?: () => void;
  onLoadJson?: (file: File) => void;
}

const AttachmentsPanel: React.FC<AttachmentsPanelProps> = ({ 
  attachments, 
  onAddFiles, 
  onRemove,
  onRename,
  onClear,
  onClearCategory,
  onImportConverted,
  onPreview,
  hasConvertedFiles,
  onDropAction,
  onLoadJson
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const toggleCategory = (key: string) => {
    setCollapsedCategories(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Notify parent to reset global drag state
    if (onDropAction) onDropAction();

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const allFiles = Array.from(e.dataTransfer.files);
      
      const jsonFile = allFiles.find(f => f.name.toLowerCase().endsWith('.json') || f.type === 'application/json');
      if (jsonFile && onLoadJson) {
        onLoadJson(jsonFile);
      }

      const otherFiles = allFiles.filter(f => !(f.name.toLowerCase().endsWith('.json') || f.type === 'application/json'));
      if (otherFiles.length > 0) {
        onAddFiles(otherFiles);
      }
    }
  };

  const preventDefault = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleItemClick = (e: React.MouseEvent, att: AttachmentFile) => {
      // Avoid triggering preview when clicking input or delete button
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'BUTTON' || (e.target as HTMLElement).closest('button')) {
        return;
      }

      // Preview logic
      if (att.category === 'RENDER' || att.file.type.startsWith('image/')) {
          onPreview(att);
      } 
      else if (att.category === 'PDF' || att.file.type === 'application/pdf') {
          onPreview(att); // Now opens in modal
      }
  };

  // Group attachments by category
  const grouped = useMemo(() => {
    const groups: Record<AttachmentCategory, AttachmentFile[]> = {
      RENDER: [],
      VIDEO: [],
      CAD: [],
      PDF: [],
      DOC: []
    };
    attachments.forEach(att => {
      groups[att.category].push(att);
    });
    return groups;
  }, [attachments]);

  // Configuration for category styling
  const getCategoryConfig = (key: AttachmentCategory) => {
    switch (key) {
      case 'CAD':
        return {
          label: 'Planos y CAD',
          icon: <PenTool size={14} />,
          iconColor: 'text-yellow-400',
          bgHeader: 'bg-blue-900/30',
          borderColor: 'border-blue-500/30',
          containerBg: 'bg-blue-950/10'
        };
      case 'PDF':
        return {
          label: 'Documentos PDF',
          icon: <FileText size={14} />,
          iconColor: 'text-red-500',
          bgHeader: 'bg-red-900/20',
          borderColor: 'border-red-500/30',
          containerBg: 'bg-red-950/10'
        };
      case 'DOC':
        return {
          label: 'Otros Documentos',
          icon: <FileIcon size={14} />,
          iconColor: 'text-emerald-400',
          bgHeader: 'bg-emerald-900/20',
          borderColor: 'border-emerald-500/30',
          containerBg: 'bg-emerald-950/10'
        };
      case 'VIDEO':
        return {
          label: 'Videos',
          icon: <Video size={14} />,
          iconColor: 'text-purple-400',
          bgHeader: 'bg-purple-900/20',
          borderColor: 'border-purple-500/30',
          containerBg: 'bg-purple-950/10'
        };
      default: // RENDER
        return {
          label: 'Imágenes / Renders',
          icon: <ImageIcon size={14} />,
          iconColor: 'text-indigo-400',
          bgHeader: 'bg-indigo-900/20',
          borderColor: 'border-indigo-500/30',
          containerBg: 'bg-indigo-950/10'
        };
    }
  };

  // Prepare categories list and SORT by count descending
  const sortedCategories = useMemo(() => {
    const keys: AttachmentCategory[] = ['CAD', 'PDF', 'RENDER', 'VIDEO', 'DOC'];
    
    return keys
      .map(key => ({
        key,
        files: grouped[key],
        config: getCategoryConfig(key)
      }))
      .filter(cat => cat.files.length > 0) // Only show categories with files
      .sort((a, b) => b.files.length - a.files.length); // Sort by file count desc
  }, [grouped]);

  const hasFiles = attachments.length > 0;
  const activeFoldersCount = sortedCategories.length;

  return (
    <div 
      className="bg-zinc-900/50 border border-zinc-800 rounded-xl flex flex-col h-full sticky top-24 max-h-[calc(100vh-8rem)] transition-colors"
      onDragOver={preventDefault}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 flex flex-col gap-3 bg-zinc-900 backdrop-blur rounded-t-xl">
        <div className="flex justify-between items-center">
            <h3 className="font-semibold text-zinc-100 flex items-center gap-2">
              <Paperclip size={18} className="text-zinc-400" />
              Adjuntos (ZIP)
            </h3>
            {hasFiles && (
            <button onClick={onClear} className="text-xs text-red-400 hover:text-red-300 underline">
                Borrar todo
            </button>
            )}
        </div>
        
        {hasFiles && (
           <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-medium bg-zinc-950/50 px-2 py-1.5 rounded border border-zinc-800/50">
             <span className="text-indigo-400">{attachments.length}</span> archivos
             <span className="w-px h-3 bg-zinc-700"></span>
             <span className="text-green-400">{activeFoldersCount}</span> carpetas generadas
           </div>
        )}

        {/* Import Button */}
        <button 
            onClick={onImportConverted}
            disabled={!hasConvertedFiles}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-xs font-medium text-indigo-300 hover:bg-indigo-500/20 hover:text-indigo-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Copiar todas las imágenes del área principal aquí"
        >
            <ArrowLeftRight size={14} />
            Importar Renders Convertidos
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
        {!hasFiles ? (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="h-full flex flex-col items-center justify-center text-center cursor-pointer min-h-[200px] border-2 border-dashed border-zinc-700 rounded-lg hover:bg-zinc-800/50 hover:border-zinc-500 transition-all"
          >
            <UploadCloud className="text-zinc-500 mb-3" size={40} />
            <p className="text-sm text-zinc-300 font-medium">
              Zona de Adjuntos
            </p>
            <p className="text-xs text-zinc-500 mt-2 px-6">
              Arrastra aquí cualquier archivo.
              <br/>Se crearán las carpetas automáticamente.
            </p>
          </div>
        ) : (
          sortedCategories.map(cat => (
              <div key={cat.key} className={`rounded-lg border ${cat.config.borderColor} overflow-hidden ${cat.config.containerBg} animate-in fade-in slide-in-from-right-4 duration-300 transition-all`}>
                
                {/* Category Header */}
                <div 
                  onClick={() => toggleCategory(cat.key)}
                  className={`px-3 py-2 flex items-center justify-between ${cat.config.bgHeader} cursor-pointer hover:brightness-110 transition-all select-none group`}
                >
                    <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${cat.config.iconColor}`}>
                      <div className={`transition-transform duration-300 ${collapsedCategories[cat.key] ? '-rotate-90' : 'rotate-0'}`}>
                        <ChevronDown size={14} />
                      </div>
                      {cat.config.icon}
                      {cat.config.label}
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-zinc-900/50 px-1.5 py-0.5 rounded text-zinc-400 font-mono">
                            {cat.files.length}
                        </span>
                        {/* Delete Category Button */}
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                onClearCategory(cat.key);
                            }}
                            title={`Borrar todos los ${cat.key}`}
                            className="p-1 rounded hover:bg-red-500/20 text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                        >
                            <Trash2 size={12} />
                        </button>
                    </div>
                </div>
                
                {/* Files Grid/List - Animated Container */}
                <div 
                  className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                    collapsedCategories[cat.key] ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="p-2 space-y-1">
                      {cat.files.map(att => {
                         const fileExt = att.file.name.split('.').pop() || '';
                         return (
                        <div 
                          key={att.id} 
                          onClick={(e) => handleItemClick(e, att)}
                          className={`
                            group flex items-center gap-3 bg-zinc-950/80 p-2 rounded border border-zinc-800/50 
                            hover:border-zinc-600 hover:bg-zinc-800/50 transition-all
                            ${(att.category === 'RENDER' || att.category === 'PDF') ? 'cursor-zoom-in' : 'cursor-default'}
                          `}
                        >
                          
                          {/* Thumbnail/Icon */}
                          <div className="w-8 h-8 shrink-0 bg-zinc-900 rounded overflow-hidden flex items-center justify-center border border-zinc-800">
                            {att.previewUrl && att.category === 'RENDER' ? (
                              <img src={att.previewUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className={cat.config.iconColor}>{cat.config.icon}</span>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            {/* Renaming Input */}
                            <div className="flex items-center gap-0.5 w-full">
                                <input 
                                    type="text"
                                    value={att.customName}
                                    onChange={(e) => onRename(att.id, e.target.value)}
                                    className="bg-transparent text-xs text-zinc-200 font-medium focus:outline-none focus:border-b focus:border-indigo-500 hover:border-b hover:border-zinc-700 border-b border-transparent w-full min-w-0 truncate"
                                    placeholder="Nombre de archivo"
                                    onClick={(e) => e.stopPropagation()} // Stop click triggering preview
                                />
                                <span className="text-[10px] text-zinc-500 font-mono flex-shrink-0">.{fileExt}</span>
                            </div>
                            
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-[10px] text-zinc-500">{formatBytes(att.size)}</p>
                              {att.category === 'PDF' && <span className="text-[9px] text-zinc-400 flex items-center gap-0.5"><Eye size={8}/> Ver PDF</span>}
                              {att.category === 'RENDER' && <span className="text-[9px] text-zinc-400 flex items-center gap-0.5"><Eye size={8}/> Ver</span>}
                            </div>
                          </div>
                          
                          <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                onRemove(att.id);
                            }}
                            className="p-1.5 text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      );
                      })}
                    </div>
                  </div>
                </div>
              </div>
          ))
        )}
      </div>

      {/* Footer / Add Button */}
      <div className="p-3 border-t border-zinc-800 bg-zinc-900 rounded-b-xl flex flex-col gap-2">
         <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-zinc-700 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
         >
            <CopyPlus size={14} /> Añadir archivo manual
         </button>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
          if (e.target.files) onAddFiles(Array.from(e.target.files));
          e.target.value = '';
        }}
        multiple
        className="hidden"
      />
    </div>
  );
};

export default AttachmentsPanel;