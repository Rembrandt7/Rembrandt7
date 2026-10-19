import React, { useRef } from 'react';
import { FileText, Plus, Trash2, ArrowUp, ArrowDown, FileDown, Layers, Loader2 } from 'lucide-react';
import { PdfPageFile } from './types';

interface PdfMergePanelProps {
  pages: PdfPageFile[];
  onAddPages: (files: File[]) => void;
  onRemovePage: (id: string) => void;
  onMovePage: (id: string, direction: 'up' | 'down') => void;
  onDownloadPdf: () => void;
  isProcessing: boolean;
  onLoadJson?: (file: File) => void;
}

const PdfMergePanel: React.FC<PdfMergePanelProps> = ({
  pages,
  onAddPages,
  onRemovePage,
  onMovePage,
  onDownloadPdf,
  isProcessing,
  onLoadJson
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const allFiles = Array.from(e.dataTransfer.files);
      
      const jsonFile = allFiles.find(f => f.name.toLowerCase().endsWith('.json') || f.type === 'application/json');
      if (jsonFile && onLoadJson) {
        onLoadJson(jsonFile);
      }

      const allowedFiles = allFiles.filter((f: File) => 
        f.type.startsWith('image/') && 
        !(f.name.toLowerCase().endsWith('.json') || f.type === 'application/json')
      );
      
      if (allowedFiles.length > 0) {
        onAddPages(allowedFiles);
      }
    }
  };

  const preventDefault = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div 
      className="bg-zinc-900/50 border border-zinc-800 rounded-xl flex flex-col h-full overflow-hidden"
      onDragOver={preventDefault}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 bg-zinc-900 backdrop-blur rounded-t-xl">
        <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-zinc-100 flex items-center gap-2">
              <FileText size={18} className="text-red-500" />
              Juntar PDF
            </h3>
            <span className="text-[10px] bg-red-900/20 text-red-400 px-2 py-0.5 rounded border border-red-900/30">
                {pages.length} páginas
            </span>
        </div>
        
        <button
            onClick={onDownloadPdf}
            disabled={pages.length === 0 || isProcessing}
            className="w-full h-[38px] flex items-center justify-center gap-2 py-2 rounded-lg bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white text-xs font-bold shadow-lg shadow-red-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
            GENERAR PDF
        </button>
      </div>

      {/* Content List */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2 min-h-[150px]">
        {pages.length === 0 ? (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="h-full flex flex-col items-center justify-center text-center cursor-pointer border-2 border-dashed border-zinc-700/50 rounded-lg hover:bg-zinc-800/50 hover:border-zinc-500 transition-all py-8"
          >
            <Layers className="text-zinc-600 mb-2" size={32} />
            <p className="text-xs text-zinc-400 font-medium">
              Arrastra imágenes aquí
            </p>
            <p className="text-[10px] text-zinc-500 mt-1">
              para unirlas en un PDF
            </p>
          </div>
        ) : (
          pages.map((page, index) => (
            <div 
              key={page.id} 
              className="group flex items-center gap-3 bg-zinc-950/80 p-2 rounded border border-zinc-800 hover:border-zinc-600 transition-all"
            >
              {/* Thumbnail */}
              <div className="w-10 h-10 shrink-0 bg-zinc-900 rounded overflow-hidden flex items-center justify-center border border-zinc-800 relative">
                <img src={page.previewUrl} alt="" className="w-full h-full object-cover" />
                <div className="absolute bottom-0 right-0 bg-black/70 text-white text-[8px] px-1">
                    {index + 1}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs text-zinc-300 truncate" title={page.name}>
                    {page.name}
                </p>
              </div>

              {/* Controls */}
              <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                 <button 
                    onClick={() => onMovePage(page.id, 'up')}
                    disabled={index === 0}
                    className="p-0.5 hover:bg-zinc-700 rounded disabled:opacity-30 text-zinc-400"
                 >
                    <ArrowUp size={10} />
                 </button>
                 <button 
                    onClick={() => onMovePage(page.id, 'down')}
                    disabled={index === pages.length - 1}
                    className="p-0.5 hover:bg-zinc-700 rounded disabled:opacity-30 text-zinc-400"
                 >
                    <ArrowDown size={10} />
                 </button>
              </div>

              <button 
                onClick={() => onRemovePage(page.id)}
                className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-900/10 rounded transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="p-2 border-t border-zinc-800 bg-zinc-900 rounded-b-xl">
         <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 py-1.5 rounded border border-dashed border-zinc-700 text-[10px] text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
         >
            <Plus size={12} /> Agregar imágenes
         </button>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
          if (e.target.files) onAddPages(Array.from(e.target.files));
          e.target.value = '';
        }}
        multiple
        accept="image/*"
        className="hidden"
      />
    </div>
  );
};

export default PdfMergePanel;
