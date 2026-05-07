
import React, { useState, useCallback } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { useLinks } from '../contexts/LinkContext';
import Spinner from './common/Spinner';
import { cn } from '../utils/cn';

interface RenderItem {
    id: number;
    title: string;
    date: string;
    url: string;
    base64?: string; // Added for editing capability
    mimeType?: string;
}

const RenderLinkIcon: React.FC<{ href: string; name: string; colorClass: string; children: React.ReactNode }> = ({ href, name, colorClass, children }) => {
    return (
        <a 
            href={href} 
            target="_blank" 
            rel="noopener noreferrer" 
            className={cn(
                "group relative flex flex-col items-center justify-center w-16 h-16 rounded-lg bg-gray-800 hover:bg-gray-700 transition-all duration-200 border border-gray-700 hover:border-gray-500",
                colorClass
            )}
            title={name}
        >
            {children}
            <span className="mt-1 text-[10px] font-medium text-gray-400 group-hover:text-white">{name}</span>
        </a>
    );
};

const Renders: React.FC = () => {
  const { googleApiConfig } = useLinks();
  // State for renders
  const [renders, setRenders] = useState<RenderItem[]>([
    { id: 1, title: "Sunset City", date: "2023-10-27", url: "https://picsum.photos/seed/city/400/300" },
    { id: 2, title: "Abstract Shape", date: "2023-10-26", url: "https://picsum.photos/seed/abstract/400/300" },
    { id: 3, title: "Neon Character", date: "2023-10-25", url: "https://picsum.photos/seed/neon/400/300" },
    { id: 4, title: "Mountain View", date: "2023-10-24", url: "https://picsum.photos/seed/mountain/400/300" },
  ]);

  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [activeRender, setActiveRender] = useState<RenderItem | null>(null);
  
  // Editing State
  const [editPrompt, setEditPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const url = event.target?.result as string;
          const base64 = url.split(',')[1];
          
          const newRender: RenderItem = {
            id: Date.now(),
            title: file.name.split('.')[0] || "Uploaded Render",
            date: new Date().toISOString().split('T')[0],
            url: url,
            base64: base64,
            mimeType: file.type
          };
          setRenders(prev => [newRender, ...prev]);
          setActiveRender(newRender); // Open large view immediately
        };
        reader.readAsDataURL(file);
      }
    }
  }, []);
  
  const handleGenerateChange = async () => {
      if (!activeRender || !editPrompt.trim()) return;
      if (!activeRender.base64) {
          setError("Esta imagen no se puede editar (es una URL externa). Por favor sube una imagen desde tu dispositivo.");
          return;
      }
      
      setIsGenerating(true);
      setError(null);
      
      try {
          const apiKey = googleApiConfig?.apiKey || process.env.API_KEY || process.env.GEMINI_API_KEY;
          if (!apiKey) throw new Error("No se ha configurado la API Key de Gemini. Configúrala en los ajustes.");

          const ai = new GoogleGenAI({ 
              apiKey,
              httpOptions: {
                  baseUrl: `${window.location.origin}/api/proxy/google`
              }
          });
          
          const prompt = `Edita esta imagen. ${editPrompt}. Mantén la estructura y el estilo visual original lo más posible, solo aplica el cambio solicitado.`;
          
          const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash-image',
              contents: {
                  parts: [
                      {
                          inlineData: {
                              mimeType: activeRender.mimeType || 'image/png',
                              data: activeRender.base64
                          }
                      },
                      { text: prompt }
                  ]
              },
              config: { responseModalities: [Modality.IMAGE] }
          });
          
          const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
          
          if (imagePart && imagePart.inlineData) {
              const newUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
              const newRender: RenderItem = {
                  id: Date.now(),
                  title: `${activeRender.title} (Editado)`,
                  date: new Date().toISOString().split('T')[0],
                  url: newUrl,
                  base64: imagePart.inlineData.data,
                  mimeType: imagePart.inlineData.mimeType
              };
              
              setRenders(prev => [newRender, ...prev]);
              setActiveRender(newRender);
              setEditPrompt('');
          } else {
              throw new Error("No se generó imagen.");
          }
          
      } catch (e: any) {
          console.error(e);
          setError("Error al generar el cambio. Intenta de nuevo.");
      } finally {
          setIsGenerating(false);
      }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-800 rounded-lg shadow-xl min-h-[70vh]">
      
      {/* Top Icons Bar */}
      <div className="flex flex-wrap justify-center gap-6 mb-8 pb-6 border-b border-gray-700">
          <RenderLinkIcon href="https://app.rendair.ai/generate/image" name="Rendair" colorClass="text-teal-400 hover:border-teal-400">
              <svg className="h-8 w-8" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="32" cy="32" r="28" fill="currentColor"/>
                  <text x="32" y="42" fontFamily="Arial, sans-serif" fontSize="28" fontWeight="bold" fill="black" textAnchor="middle">r</text>
              </svg>
          </RenderLinkIcon>
          
          <RenderLinkIcon href="https://www.krea.ai/app" name="Krea" colorClass="text-blue-500 hover:border-blue-500">
               <svg className="h-8 w-8" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">
                 <path d="M22 12 L22 52 M22 32 L42 12 M22 32 L42 52" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
          </RenderLinkIcon>
          
          <RenderLinkIcon href="https://www.upscale.media/es/upload" name="Upscale" colorClass="text-cyan-400 hover:border-cyan-400">
              <svg className="h-8 w-8" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
                  <rect x="16" y="16" width="40" height="40" rx="4" fill="currentColor" fillOpacity="0.5"/>
                  <rect x="8" y="8" width="28" height="28" rx="4" fill="currentColor"/>
              </svg>
          </RenderLinkIcon>

          <RenderLinkIcon href="https://app.reve.com/home" name="Reve" colorClass="text-rose-500 hover:border-rose-500">
              <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
          </RenderLinkIcon>
          
          <RenderLinkIcon href="https://aistudio.google.com/prompts/new_chat?model=gemini-2.5-flash-image" name="NanoBanana" colorClass="text-yellow-400 hover:border-yellow-400">
              <svg className="h-8 w-8" viewBox="0 0 100 100" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M 85,15 C 70,10 50,25 35,40 C 20,55 10,70 15,85 C 20,100 40,95 55,80 C 70,65 90,50 95,35 C 100,20 95,18 85,15 Z" />
              </svg>
          </RenderLinkIcon>

          <RenderLinkIcon href="https://aistudio.google.com/apps/drive/1MqPBVGYa3rBl2lGs5-8DhKUIltCigjmI?showAssistant=true&showPreview=true&resourceKey=" name="Vectorizar" colorClass="text-pink-500 hover:border-pink-500">
              <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 19l7-7 3 3-7 7-3-3z" />
                  <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                  <path d="M2 2l7.586 7.586" />
                  <circle cx="11" cy="11" r="2" />
              </svg>
          </RenderLinkIcon>
      </div>

      <h2 className="text-3xl font-bold text-white mb-6">Galería de Renders</h2>

      {!activeRender ? (
        <>
          {/* Drop Zone */}
          <div 
            onDragOver={handleDragOver} 
            onDragLeave={handleDragLeave} 
            onDrop={handleDrop}
            className={`mb-8 border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center transition-colors cursor-pointer ${isDraggingOver ? 'border-purple-500 bg-gray-700/50' : 'border-gray-600 hover:border-gray-500 hover:bg-gray-900/30'}`}
            onClick={() => document.getElementById('render-upload')?.click()}
          >
             <input 
                type="file" 
                id="render-upload" 
                className="hidden" 
                accept="image/*" 
                onChange={(e) => {
                    if(e.target.files && e.target.files[0]) {
                        const dt = new DataTransfer();
                        dt.items.add(e.target.files[0]);
                        handleDrop({ dataTransfer: dt, preventDefault: () => {}, stopPropagation: () => {} } as any);
                    }
                }}
             />
             <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
             <p className="text-gray-300 font-medium">Arrastra y suelta tu render aquí para editarlo</p>
             <p className="text-gray-500 text-sm">o haz clic para seleccionar</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {renders.map((render) => (
              <div 
                key={render.id} 
                className="group relative bg-gray-900 rounded-lg overflow-hidden shadow-lg transition-transform hover:-translate-y-1 hover:shadow-2xl cursor-pointer"
                onClick={() => setActiveRender(render)}
              >
                <div className="aspect-w-4 aspect-h-3 w-full h-48 overflow-hidden">
                  <img 
                    src={render.url} 
                    alt={render.title} 
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110 opacity-80 group-hover:opacity-100"
                  />
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-white truncate">{render.title}</h3>
                  <p className="text-sm text-gray-500">{render.date}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
          /* Large View Mode */
          <div className="animate-fade-in">
              <button 
                onClick={() => setActiveRender(null)}
                className="mb-4 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
                  Volver a Galería
              </button>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 bg-black/40 rounded-lg p-2 flex items-center justify-center border border-gray-700">
                      <img 
                        src={activeRender.url} 
                        alt={activeRender.title} 
                        className="max-w-full max-h-[70vh] object-contain rounded shadow-lg" 
                      />
                  </div>
                  
                  <div className="bg-gray-900 p-6 rounded-lg border border-gray-700 flex flex-col h-fit">
                      <h3 className="text-xl font-bold text-white mb-2">{activeRender.title}</h3>
                      <p className="text-sm text-gray-500 mb-6">Generado el: {activeRender.date}</p>
                      
                      <div className="space-y-4">
                          <label className="block text-sm font-medium text-gray-300">Editar / Transformar Imagen</label>
                          <textarea
                            value={editPrompt}
                            onChange={(e) => setEditPrompt(e.target.value)}
                            placeholder="Describe el cambio que quieres realizar en esta imagen (Ej: 'Cambia el cielo a atardecer', 'Añade nieve', 'Hazlo estilo cyberpunk')..."
                            className="w-full p-3 bg-gray-800 rounded-md border border-gray-600 focus:ring-2 focus:ring-purple-500 text-gray-200 h-32 resize-none"
                          />
                          
                          <button 
                            onClick={handleGenerateChange}
                            disabled={isGenerating || !editPrompt.trim()}
                            className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-md text-white font-bold shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                              {isGenerating ? <Spinner size="5" /> : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>}
                              {isGenerating ? 'Generando Cambio...' : 'Generar Cambio'}
                          </button>
                          
                          {error && <p className="text-red-400 text-sm mt-2 p-2 bg-red-900/20 rounded">{error}</p>}
                          
                          <div className="pt-4 border-t border-gray-800 flex gap-2">
                              <button 
                                className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm text-white transition-colors"
                                onClick={() => {
                                    const a = document.createElement('a');
                                    a.href = activeRender.url;
                                    a.download = activeRender.title;
                                    a.click();
                                }}
                              >
                                  Descargar
                              </button>
                              <button 
                                className="flex-1 py-2 bg-red-900/50 hover:bg-red-900 rounded text-sm text-red-200 transition-colors"
                                onClick={() => {
                                    if(confirm('¿Estás seguro de eliminar este render?')) {
                                        setRenders(prev => prev.filter(r => r.id !== activeRender.id));
                                        setActiveRender(null);
                                    }
                                }}
                              >
                                  Eliminar
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Renders;
