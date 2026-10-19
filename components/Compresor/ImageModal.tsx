import React, { useEffect, useRef, useState } from 'react';
import { X, FileVideo, ExternalLink, Loader2, Edit2, FileText } from 'lucide-react';
import { PreviewFile } from './types';
import { formatBytes, ensureCompresorLibsLoaded } from './utils/fileHelpers';

interface ImageModalProps {
  file: PreviewFile | null;
  onClose: () => void;
  onRename: (id: string, newName: string) => void;
}

const ImageModal: React.FC<ImageModalProps> = ({ file, onClose, onRename }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState(false);
  const [pageCount, setPageCount] = useState<number>(0);
  
  // Local state for editing name to prevent excessive re-renders
  const [editingName, setEditingName] = useState("");

  // Update local name when file changes
  useEffect(() => {
      if (file) setEditingName(file.name);
  }, [file]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (file) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [file, onClose]);

  // Handle PDF Rendering via PDF.js
  useEffect(() => {
    setPageCount(0); // Reset page count
    if (!file || file.type !== 'pdf' || !file.previewUrl) return;

    const renderPdf = async () => {
      setPdfLoading(true);
      setPdfError(false);
      try {
        await ensureCompresorLibsLoaded();
        const pdfjsLib = (window as any).pdfjsLib;
        if (!pdfjsLib) {
          throw new Error("PDF.js library not loaded");
        }

        // Set worker
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

        const loadingTask = pdfjsLib.getDocument(file.previewUrl);
        const pdf = await loadingTask.promise;
        
        // SET PAGE COUNT
        setPageCount(pdf.numPages);

        // Render first page
        const page = await pdf.getPage(1);
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        const viewport = page.getViewport({ scale: 1.5 });

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };
        await page.render(renderContext).promise;
        setPdfLoading(false);
      } catch (error) {
        console.error("Error rendering PDF:", error);
        setPdfError(true);
        setPdfLoading(false);
      }
    };

    renderPdf();
  }, [file]);

  if (!file) return null;

  const handleBlur = () => {
      if (file && editingName.trim() !== "") {
          onRename(file.id, editingName);
      } else {
          setEditingName(file.name); // Revert if empty
      }
  };

  const handleKeyDownInput = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
          (e.target as HTMLInputElement).blur();
      }
      e.stopPropagation(); // Stop ESC from closing modal while editing
  };

  const renderContent = () => {
    if (file.type === 'video') {
      return (
        <div className="flex flex-col items-center text-zinc-500 gap-4">
          <FileVideo size={64} />
          <p>Vista previa no disponible para video</p>
        </div>
      );
    }

    if (file.type === 'pdf') {
      return (
        <div className="w-full h-full relative bg-zinc-900 rounded-lg overflow-auto flex items-center justify-center p-4">
            {pdfLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 z-10">
                    <Loader2 className="animate-spin text-indigo-500" size={32} />
                </div>
            )}
            
            {!pdfError ? (
                <canvas 
                    ref={canvasRef} 
                    className="max-w-full shadow-2xl rounded bg-white"
                />
            ) : (
                <div className="flex flex-col items-center justify-center h-full w-full text-zinc-400 gap-4 p-8 text-center">
                  <p className="text-lg font-medium">No se pudo previsualizar el PDF.</p>
                  <a 
                    href={file.previewUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-900/20 font-medium text-sm"
                  >
                    <ExternalLink size={16} />
                    Abrir en nueva pestaña
                  </a>
                </div>
            )}
            
            {/* Overlay button if rendering succeeds but user wants to open externally */}
            {!pdfError && !pdfLoading && (
                 <a 
                    href={file.previewUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    title="Abrir en pestaña nueva"
                    className="absolute top-4 right-4 p-2 bg-zinc-800/80 backdrop-blur text-white rounded-lg hover:bg-indigo-600 transition-colors shadow-lg"
                  >
                    <ExternalLink size={16} />
                  </a>
            )}
        </div>
      );
    }

    // Default: Image
    return (
      <img 
        src={file.previewUrl} 
        alt={file.name} 
        className="max-w-full max-h-full object-contain shadow-lg"
      />
    );
  };

  return (
    <div 
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200 outline-none"
        tabIndex={-1}
        onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
        }}
    >
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 p-2 bg-zinc-800 text-zinc-400 hover:text-white rounded-full transition-colors z-50"
      >
        <X size={24} />
      </button>

      <div className="max-w-6xl w-full h-[90vh] flex flex-col bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl">
        <div className="flex-1 overflow-hidden bg-zinc-950 flex items-center justify-center relative h-full">
          {renderContent()}
        </div>

        <div className="p-4 border-t border-zinc-800 bg-zinc-900 flex justify-between items-center shrink-0">
           <div className="min-w-0 pr-4 flex-1">
             <div className="flex items-center gap-2 mb-1">
                 {/* Editable Title Input */}
                 <div className="relative group max-w-md w-full">
                    <input 
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={handleBlur}
                        onKeyDown={handleKeyDownInput}
                        className="bg-transparent text-lg font-bold text-white w-full border-b border-transparent hover:border-zinc-600 focus:border-indigo-500 outline-none transition-all py-0.5 px-1 rounded-sm"
                        placeholder="Nombre de archivo"
                    />
                    <Edit2 size={12} className="absolute right-0 top-1.5 text-zinc-600 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity" />
                 </div>
             </div>

             {file.originalName && (
                <p className="text-xs text-zinc-400 font-mono truncate px-1">{file.originalName}</p>
             )}
           </div>
           
           <div className="flex gap-4 md:gap-6 text-xs shrink-0 items-center">
              <div>
                <span className="block text-zinc-500 uppercase tracking-wider text-[10px]">Tamaño</span>
                <span className="text-zinc-200 font-medium">{formatBytes(file.size)}</span>
              </div>
              
              {/* PDF PAGE COUNT BADGE */}
              {file.type === 'pdf' && pageCount > 1 && (
                 <div>
                    <span className="block text-zinc-500 uppercase tracking-wider text-[10px]">Páginas</span>
                    <span className="text-orange-400 font-bold flex items-center gap-1">
                        <FileText size={10} /> {pageCount}
                    </span>
                 </div>
              )}

              {file.newSize && (
                <div>
                  <span className="block text-zinc-500 uppercase tracking-wider text-[10px]">Final</span>
                  <span className="text-green-400 font-medium">{formatBytes(file.newSize)}</span>
                </div>
              )}
              {file.format && (
                 <div>
                    <span className="block text-zinc-500 uppercase tracking-wider text-[10px]">Formato</span>
                    <span className="text-indigo-400 font-medium uppercase">
                    {file.format}
                    </span>
                 </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default ImageModal;
