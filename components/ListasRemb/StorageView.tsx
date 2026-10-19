import React, { useRef, useState } from 'react';
import { StoredImage } from './types';
import { Archive, Upload, Trash2, Maximize2, X, Image as ImageIcon } from 'lucide-react';

interface StorageViewProps {
  images: StoredImage[];
  onAddImage: (img: StoredImage) => void;
  onDeleteImage: (id: string) => void;
}

const StorageView: React.FC<StorageViewProps> = ({ images, onAddImage, onDeleteImage }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewImage, setPreviewImage] = useState<StoredImage | null>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
          alert("La imagen es muy grande. Intenta con archivos menores a 2MB.");
          return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        onAddImage({
            id: Date.now().toString(),
            name: file.name,
            data: base64String,
            date: new Date().toLocaleDateString()
        });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 p-6 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Archive className="w-6 h-6 text-indigo-600" />
            Almacén
          </h2>
          <p className="text-slate-500 text-sm">Guarda fotos, capturas y recuerdos importantes.</p>
        </div>
        <button 
            onClick={() => fileInputRef.current?.click()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-lg shadow-indigo-200"
        >
            <Upload className="w-4 h-4" /> Subir Imagen
        </button>
        <input type="file" ref={fileInputRef} onChange={handleUpload} className="hidden" accept="image/*" />
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto pr-2">
         {images.length === 0 ? (
             <div className="h-64 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => fileInputRef.current?.click()}>
                 <ImageIcon className="w-12 h-12 mb-2 opacity-20" />
                 <p>El almacén está vacío.</p>
                 <p className="text-xs mt-1">Sube tu primera foto aquí</p>
             </div>
         ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {images.map(img => (
                    <div key={img.id} className="group relative bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden aspect-square flex flex-col">
                        <div className="flex-1 overflow-hidden relative cursor-pointer" onClick={() => setPreviewImage(img)}>
                             <img src={img.data} alt={img.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                             <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                 <Maximize2 className="text-white w-6 h-6 drop-shadow-md" />
                             </div>
                        </div>
                        <div className="p-2 bg-white flex items-center justify-between text-xs border-t border-slate-100 z-10">
                            <div className="truncate pr-2">
                                <p className="font-medium text-slate-700 truncate" title={img.name}>{img.name}</p>
                                <p className="text-slate-400">{img.date}</p>
                            </div>
                            <button 
                                onClick={() => { if(confirm('¿Borrar imagen permanentemente?')) onDeleteImage(img.id) }}
                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
         )}
      </div>

      {/* Modal Preview */}
      {previewImage && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setPreviewImage(null)}>
              <button className="absolute top-4 right-4 text-white/50 hover:text-white p-2">
                  <X className="w-8 h-8" />
              </button>
              <img 
                src={previewImage.data} 
                alt={previewImage.name} 
                className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                onClick={(e) => e.stopPropagation()} 
              />
              <div className="absolute bottom-4 left-0 right-0 text-center text-white/70 pointer-events-none">
                  <p className="font-bold">{previewImage.name}</p>
              </div>
          </div>
      )}
    </div>
  );
};

export default StorageView;
