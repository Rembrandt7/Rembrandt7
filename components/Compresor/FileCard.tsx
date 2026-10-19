import React from 'react';
import { FileType, X, Wand2, CheckCircle, AlertCircle, Loader2, Download, Paperclip, FileText } from 'lucide-react';
import { MediaFile, FileStatus, TargetFormat } from './types';
import { formatBytes, getExtensionFromMime } from './utils/fileHelpers';

interface FileCardProps {
  file: MediaFile;
  projectTitle: string;
  onRemove: (id: string) => void;
  onRenameChange: (id: string, newName: string) => void;
  onFormatChange: (id: string, format: TargetFormat) => void;
  onSmartRename: (id: string) => void;
  onDownload: (id: string) => void;
  onPreview: (file: MediaFile) => void;
  onCopyToAttachments: (file: MediaFile) => void;
  isProcessing: boolean;
  isAttached?: boolean;
}

const FileCard: React.FC<FileCardProps> = ({
  file,
  projectTitle,
  onRemove,
  onRenameChange,
  onFormatChange,
  onSmartRename,
  onDownload,
  onPreview,
  onCopyToAttachments,
  isProcessing,
  isAttached = false
}) => {
  const isVideo = file.type === 'video';
  const isPdf = file.type === 'pdf';
  const currentExt = getExtensionFromMime(file.targetFormat, file.originalFile.name);
  const compressionRatio = file.newSize && file.originalSize 
    ? Math.round((1 - file.newSize / file.originalSize) * 100)
    : 0;

  return (
    <div className={`
      relative group flex flex-col rounded-xl overflow-hidden transition-all duration-300 border
      hover:shadow-xl hover:shadow-black/50 hover:scale-[1.01] hover:z-10
      ${isAttached 
        ? 'bg-indigo-950/20 border-indigo-500/50 shadow-[0_0_10px_rgba(99,102,241,0.1)]' 
        : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600'
      }
    `}>
      
      {/* --- TOP: LARGE PREVIEW AREA --- */}
      <div 
        onClick={() => onPreview(file)}
        className="relative h-44 w-full bg-zinc-950 cursor-zoom-in group-image overflow-hidden"
      >
        {/* Render Content */}
        {isVideo ? (
            <div className="w-full h-full flex items-center justify-center text-zinc-700 bg-zinc-900">
              <FileType size={48} />
            </div>
        ) : file.type === 'cad' ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 bg-zinc-900 gap-2">
               <FileText size={40} className="text-indigo-400" />
               <span className="text-[10px] font-bold text-zinc-500 uppercase">PLANO CAD</span>
            </div>
        ) : isPdf ? (
            file.previewUrl && !file.previewUrl.endsWith('.pdf') ? (
               <img src={file.previewUrl} alt="PDF" className="w-full h-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-105" />
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 bg-zinc-900 gap-2">
                   <FileText size={40} className="text-red-900" />
                   <span className="text-[10px] font-bold text-zinc-500">PDF DOCUMENT</span>
                </div>
            )
        ) : (
            <img 
              src={file.previewUrl} 
              alt="preview" 
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
            />
        )}

        {/* Overlays / Floating Buttons */}
        <div className="absolute top-0 left-0 w-full p-2 flex justify-between items-start pointer-events-none">
            {/* Left: Attached Indicator */}
            <div className="pointer-events-auto">
                {isAttached && (
                    <div className="bg-indigo-600 text-white p-1.5 rounded-md shadow-lg" title="Adjunto al ZIP">
                        <Paperclip size={12} />
                    </div>
                )}
            </div>

            {/* Right: Remove Button */}
            <button 
                onClick={(e) => {
                e.stopPropagation();
                onRemove(file.id);
                }}
                disabled={isProcessing}
                className="pointer-events-auto p-1.5 bg-black/40 hover:bg-red-500 text-white rounded-md backdrop-blur-sm transition-colors opacity-0 group-hover:opacity-100"
            >
                <X size={14} />
            </button>
        </div>

        {/* Status Overlays */}
        {file.status === FileStatus.COMPLETED && (
            <div className="absolute inset-0 bg-green-500/10 flex items-center justify-center pointer-events-none backdrop-blur-[1px]">
              <div className="bg-green-500 text-white p-2 rounded-full shadow-lg scale-in-center animate-in fade-in zoom-in duration-300">
                  <CheckCircle size={24} />
              </div>
            </div>
        )}
        {file.status === FileStatus.PROCESSING && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-none z-20">
              <Loader2 className="text-indigo-400 w-8 h-8 animate-spin" />
            </div>
        )}
         {file.type === 'pdf' && (
             <div className="absolute bottom-2 right-2 bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                PDF
             </div>
         )}
      </div>

      {/* --- BOTTOM: DATA & CONTROLS --- */}
      <div className="flex flex-col gap-2 p-3 bg-zinc-900/50 flex-1">
          
          {/* Filename Row */}
          <div className={`
            flex items-center gap-0.5 border rounded px-2 py-1.5 transition-colors
            ${isAttached ? 'bg-indigo-950/30 border-indigo-500/20' : 'bg-zinc-950 border-zinc-800 focus-within:border-indigo-500'}
          `}>
            <span className="text-[10px] text-zinc-500 shrink-0 select-none max-w-[50px] truncate" title={projectTitle}>
              {projectTitle}_
            </span>
            <input
              type="text"
              value={file.newName}
              onChange={(e) => onRenameChange(file.id, e.target.value)}
              disabled={file.status === FileStatus.PROCESSING}
              className="flex-1 bg-transparent text-xs font-medium text-zinc-200 focus:outline-none min-w-0"
              placeholder="Nombre..."
            />
            <span className="text-[10px] text-zinc-600 font-mono shrink-0">.{currentExt}</span>
          </div>

          {/* Controls Row */}
          <div className="flex items-center justify-between gap-2 mt-auto">
             
             {/* Action Buttons */}
             <div className="flex items-center gap-1">
                {(!isVideo && !isPdf) && file.status === FileStatus.IDLE && (
                    <button
                    onClick={() => onSmartRename(file.id)}
                    title="IA Rename"
                    className="p-1.5 bg-zinc-800 hover:bg-indigo-500/20 text-zinc-400 hover:text-indigo-400 rounded border border-zinc-700 hover:border-indigo-500/30 transition-colors"
                    >
                    <Wand2 size={12} />
                    </button>
                )}

                <button
                    onClick={() => onCopyToAttachments(file)}
                    title={isAttached ? "Ya adjuntado" : "Copiar a adjuntos"}
                    className={`p-1.5 rounded border transition-colors ${
                    isAttached 
                    ? 'bg-indigo-600 text-white border-indigo-500' 
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 border-zinc-700'
                    }`}
                >
                    <Paperclip size={12} />
                </button>

                {file.status === FileStatus.COMPLETED && (
                    <button
                    onClick={() => onDownload(file.id)}
                    className="p-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded border border-green-500/30 transition-colors"
                    >
                    <Download size={12} />
                    </button>
                )}
             </div>

             {/* Format Selector */}
             <select
              value={file.targetFormat}
              onChange={(e) => onFormatChange(file.id, e.target.value as TargetFormat)}
              disabled={file.status !== FileStatus.IDLE || isVideo}
              className={`
                bg-zinc-950 border border-zinc-700 text-[10px] rounded px-1 py-1 
                focus:outline-none focus:border-indigo-500 text-zinc-300 font-medium w-20 text-right
                ${isVideo ? 'opacity-50 cursor-not-allowed' : 'hover:border-zinc-500'}
              `}
            >
              {isVideo ? (
                 <option value={TargetFormat.ORIGINAL}>Original</option>
              ) : (
                <>
                  <option value={TargetFormat.JPG}>JPG</option>
                  <option value={TargetFormat.PNG}>PNG</option>
                  <option value={TargetFormat.WEBP}>WebP</option>
                  <option value={TargetFormat.PDF}>PDF</option>
                  <option value={TargetFormat.ORIGINAL}>Original</option>
                </>
              )}
            </select>
          </div>

          {/* Stats Footer */}
          <div className="flex items-center justify-between text-[10px] pt-1 border-t border-zinc-800/50 mt-1">
             <div className="flex gap-1 text-zinc-500">
               <span>{formatBytes(file.originalSize)}</span>
               {file.newSize && (
                 <span className="text-green-400 font-mono">
                   → {formatBytes(file.newSize)} 
                 </span>
               )}
             </div>
             {compressionRatio !== 0 && file.newSize && (
                <span className={compressionRatio > 0 ? "text-green-500" : "text-red-400"}>
                    {compressionRatio > 0 ? '-' : '+'}{Math.abs(compressionRatio)}%
                </span>
             )}
             {file.status === FileStatus.ERROR && (
                <span className="text-red-400 flex items-center gap-1" title={file.statusMessage}>
                  <AlertCircle size={10} /> Err
                </span>
             )}
          </div>

      </div>
    </div>
  );
};

export default FileCard;
