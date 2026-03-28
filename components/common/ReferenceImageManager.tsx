
import React from 'react';

export interface ReferenceImage {
  name: string;
  base64: string;
  mimeType: string;
  preview: string;
}

interface ReferenceImageManagerProps {
  images: ReferenceImage[];
  onImagesChange: (images: ReferenceImage[]) => void;
}

const ReferenceImageUploader: React.FC<{ onImageUpload: (file: File) => void }> = ({ onImageUpload }) => {
  const processFile = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      onImageUpload(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };
  
  const inputId = `ref-image-upload-${Math.random()}`;

  return (
    <div
        onClick={() => document.getElementById(inputId)?.click()}
        className="relative w-full h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors border-gray-600 hover:border-gray-500"
    >
        <input type="file" id={inputId} accept="image/*" onChange={handleFileChange} className="hidden" />
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" /></svg>
        <p className="mt-1 text-xs text-gray-500">Añadir Archivo</p>
    </div>
  );
};


const ReferenceImageManager: React.FC<ReferenceImageManagerProps> = ({ images, onImagesChange }) => {

  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const base64 = dataUrl.split(',')[1];
      const newImage: ReferenceImage = {
        name: `archivo ${images.length + 1}`,
        base64,
        mimeType: file.type,
        preview: dataUrl,
      };
      onImagesChange([...images, newImage]);
    };
    reader.readAsDataURL(file);
  };
  
  const handleRemoveImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index)
      .map((img, i) => ({ ...img, name: `archivo ${i + 1}` })); // Re-index names
    onImagesChange(newImages);
  };

  return (
    <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-400">Archivos Adjuntos</label>
        <p className="text-xs text-gray-500">
            Arrastra archivos aquí o haz clic para añadir. La IA los mencionará en el email.
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {images.map((image, index) => (
                <div key={index} className="relative group w-full h-24 bg-gray-900 rounded-md overflow-hidden">
                    <img src={image.preview} alt={image.name} className="w-full h-full object-contain" />
                     <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-white font-bold text-sm">{image.name}</span>
                    </div>
                    <button onClick={() => handleRemoveImage(index)} className="absolute top-1 right-1 p-1 bg-gray-900/70 rounded-full text-white hover:bg-red-600 transition-all opacity-0 group-hover:opacity-100" aria-label="Remove image">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            ))}
             <ReferenceImageUploader onImageUpload={handleImageUpload} />
        </div>
    </div>
  );
};

export default ReferenceImageManager;
