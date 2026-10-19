import React, { useRef, useState } from 'react';
import { Upload, FileImage, FileVideo, FileText } from 'lucide-react';

interface UploadAreaProps {
  onFilesSelected: (files: File[]) => void;
  onDropAction?: () => void;
  onLoadJson?: (file: File) => void;
}

const UploadArea: React.FC<UploadAreaProps> = ({ onFilesSelected, onDropAction, onLoadJson }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    // Notify parent to clear global drag state
    if (onDropAction) onDropAction();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
    }
    // Reset input so same file can be selected again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFiles = (files: File[]) => {
    // Check for JSON first
    const jsonFile = files.find(f => f.name.toLowerCase().endsWith('.json') || f.type === 'application/json');
    if (jsonFile && onLoadJson) {
      onLoadJson(jsonFile);
    }

    // Filter for images, videos, PDFs and CAD (and EXCLUDE JSON)
    const validMediaFiles = files.filter(f => 
      (f.type.startsWith('image/') || 
      f.type.startsWith('video/') || 
      f.type === 'application/pdf' ||
      /\.(dwg|dxf|skp|rvt)$/i.test(f.name)) &&
      !(f.name.toLowerCase().endsWith('.json') || f.type === 'application/json')
    );
    
    if (validMediaFiles.length > 0) {
      onFilesSelected(validMediaFiles);
    } else if (!jsonFile) {
      alert("Por favor sube solo archivos de imagen, video, PDF o CAD.");
    }
  };

  return (
    <div
      onClick={() => fileInputRef.current?.click()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative group cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300
        ${isDragging 
          ? 'border-indigo-500 bg-indigo-500/10' 
          : 'border-zinc-700 hover:border-indigo-400 hover:bg-zinc-800/50 bg-zinc-900/50'
        }
        h-64 w-full flex flex-col items-center justify-center text-center p-6 outline-none
      `}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInput}
        multiple
        accept="image/*,video/*,application/pdf,.dwg,.dxf,.skp,.rvt"
        className="hidden"
      />
      
      <div className={`
        mb-4 p-5 rounded-full bg-zinc-800 flex items-center justify-center transition-all duration-300 ease-out
        group-hover:scale-110 group-hover:bg-indigo-500/20
        ${isDragging ? 'scale-125 bg-indigo-500/20 ring-4 ring-indigo-500/10' : ''}
      `}>
        <Upload 
          className={`
            w-10 h-10 transition-colors duration-300 
            ${isDragging ? 'text-indigo-400' : 'text-zinc-400 group-hover:text-indigo-400'}
          `} 
        />
      </div>

      <h3 className="text-xl font-semibold text-zinc-200 mb-2">
        Arrastra tus archivos aquí
      </h3>
      <p className="text-zinc-400 text-sm max-w-sm">
        Soporta lotes de imágenes, videos y PDFs. Convertiremos tus archivos al formato que elijas (PDF, JPG, PNG) y optimizaremos el peso.
      </p>
      
      <div className="flex gap-4 mt-6 text-xs text-zinc-500 uppercase tracking-wider font-medium">
        <span className="flex items-center gap-1"><FileImage className="w-4 h-4" /> Imgs</span>
        <span className="flex items-center gap-1"><FileVideo className="w-4 h-4" /> Videos</span>
        <span className="flex items-center gap-1"><FileText className="w-4 h-4" /> PDFs / CAD</span>
      </div>
    </div>
  );
};

export default UploadArea;
