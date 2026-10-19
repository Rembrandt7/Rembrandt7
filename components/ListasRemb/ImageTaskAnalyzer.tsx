import React, { useState, useRef, useEffect } from 'react';
import { getGeminiClient } from '../../services/geminiService';
import { X, Upload, Loader2, GripVertical, AlertTriangle, Check, Plus, Image as ImageIcon, ClipboardPaste, List } from 'lucide-react';
import { Task } from './types';

interface ImageTaskAnalyzerProps {
  onClose: () => void;
  existingTasks: Task[];
  lists: string[];
  onAddTasks: (titles: string[], category: string) => void;
  onDragStart: (e: React.DragEvent, title: string) => void;
}

interface DetectedTask {
  id: string;
  title: string;
  isDuplicate: boolean;
  selected: boolean;
}

const ImageTaskAnalyzer: React.FC<ImageTaskAnalyzerProps> = ({ onClose, existingTasks, lists, onAddTasks, onDragStart }) => {
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [detectedTasks, setDetectedTasks] = useState<DetectedTask[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [selectedList, setSelectedList] = useState<string>(lists[0] || 'General');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      processClipboardItems(e.clipboardData?.items);
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const processClipboardItems = (items: DataTransferItemList | undefined) => {
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
              const reader = new FileReader();
              reader.onloadend = () => {
                  const base64String = reader.result as string;
                  setImage(base64String);
                  analyzeImage(base64String.split(',')[1]);
              };
              reader.readAsDataURL(blob);
          }
        }
      }
    }
  };

  const handleManualPaste = async () => {
    try {
        const items = await navigator.clipboard.read();
        for (const item of items) {
            const imageTypes = item.types.filter(type => type.startsWith('image/'));
            for (const type of imageTypes) {
                const blob = await item.getType(type);
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64String = reader.result as string;
                    setImage(base64String);
                    analyzeImage(base64String.split(',')[1]);
                };
                reader.readAsDataURL(blob);
            }
        }
    } catch {
        alert("No se pudo acceder al portapapeles o no hay imágenes.");
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImage(base64String);
        analyzeImage(base64String.split(',')[1]);
      };
      reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        if (e.dataTransfer.files[0].type.startsWith('image/')) {
            processFile(e.dataTransfer.files[0]);
        }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDraggingOver(false);
  };

  const analyzeImage = async (base64Data: string) => {
    setAnalyzing(true);
    try {
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
            { text: 'Analiza esta imagen y extrae una lista de tareas pendientes o elementos "to-do" encontrados. Devuelve SOLAMENTE un array JSON de strings, ejemplo: ["Comprar leche", "Llamar a mamá"]. IMPORTANTE: MANTÉN EL TEXTO EXACTAMENTE COMO ESTÁ EN LA IMAGEN. NO LO TRADUZCAS NI LO MODIFIQUES.' }
          ]
        }
      });

      const text = response.text || '[]';
      const jsonStr = text.replace(/```json|```/g, '').trim();
      const titles: string[] = JSON.parse(jsonStr);

      const tasks: DetectedTask[] = titles.map((title, idx) => {
        const isDup = existingTasks.some(t => t.title.toLowerCase().includes(title.toLowerCase()) || title.toLowerCase().includes(t.title.toLowerCase()));
        return {
          id: `detected-${idx}`,
          title,
          isDuplicate: isDup,
          selected: !isDup
        };
      });

      setDetectedTasks(tasks);
    } catch (error) {
      console.error("Error analyzing image:", error);
      alert("Error analizando la imagen. Intenta de nuevo.");
    } finally {
      setAnalyzing(false);
    }
  };

  const toggleSelection = (id: string) => {
    setDetectedTasks(prev => prev.map(t => t.id === id ? { ...t, selected: !t.selected } : t));
  };

  const handleAddSelected = () => {
    const toAdd = detectedTasks.filter(t => t.selected).map(t => t.title);
    if (toAdd.length > 0) {
      onAddTasks(toAdd, selectedList);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-brand-600 text-white">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            <span className="font-bold">Escanear Pendientes</span>
          </div>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          {!image ? (
            <div className="flex flex-col gap-4">
                <div 
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all h-64
                    ${isDraggingOver 
                        ? 'border-brand-500 bg-brand-50 scale-105 shadow-inner' 
                        : 'border-slate-300 hover:bg-slate-100'}`}
                >
                <Upload className={`w-10 h-10 mb-3 transition-colors ${isDraggingOver ? 'text-brand-500' : 'text-slate-400'}`} />
                <p className={`font-medium transition-colors ${isDraggingOver ? 'text-brand-700' : 'text-slate-600'}`}>
                    {isDraggingOver ? '¡Suelta la imagen aquí!' : 'Sube o arrastra una foto'}
                </p>
                <p className="text-xs text-slate-400 mt-1">El texto se extraerá tal cual (sin traducción)</p>
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                </div>
                
                <button 
                  onClick={handleManualPaste}
                  className="w-full py-3 bg-white border border-slate-200 hover:border-brand-300 hover:bg-brand-50 text-slate-600 rounded-xl font-medium flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                   <ClipboardPaste className="w-5 h-5" />
                   Pegar del Portapapeles
                </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative h-32 w-full rounded-xl overflow-hidden bg-slate-900 shadow-md">
                <img src={image} alt="Upload" className="w-full h-full object-cover opacity-80" />
                {analyzing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white gap-2 backdrop-blur-sm">
                    <Loader2 className="w-6 h-6 animate-spin" /> Analizando...
                  </div>
                )}
                <button onClick={() => { setImage(null); setDetectedTasks([]); }} className="absolute top-2 right-2 bg-black/50 p-1.5 rounded-full text-white hover:bg-black/70 transition-colors"><X className="w-4 h-4"/></button>
              </div>

              {detectedTasks.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">Tareas Detectadas ({detectedTasks.length})</p>
                  {detectedTasks.map(task => (
                    <div 
                      key={task.id} 
                      className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${task.isDuplicate ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-200 shadow-sm'}`}
                      draggable
                      onDragStart={(e) => {
                         e.dataTransfer.setData('newTitle', task.title);
                         onDragStart(e, task.title);
                      }}
                    >
                      <button 
                        onClick={() => toggleSelection(task.id)}
                        className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors ${task.selected ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-slate-300'}`}
                      >
                        {task.selected && <Check className="w-3 h-3" />}
                      </button>
                      
                      <div className="flex-1">
                        <p className={`text-sm ${task.selected ? 'text-slate-800' : 'text-slate-400'}`}>{task.title}</p>
                        {task.isDuplicate && (
                          <p className="text-xs text-orange-600 flex items-center gap-1 mt-1">
                            <AlertTriangle className="w-3 h-3" /> Posible duplicado
                          </p>
                        )}
                      </div>
                      
                      <div className="cursor-grab text-slate-300 hover:text-slate-500" title="Arrastrar a una lista">
                        <GripVertical className="w-4 h-4" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {detectedTasks.length > 0 && (
          <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-between gap-3">
             <div className="flex items-center gap-2 flex-1">
                <List className="w-4 h-4 text-slate-400" />
                <select 
                   value={selectedList}
                   onChange={(e) => setSelectedList(e.target.value)}
                   className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 block w-full p-2 focus:outline-none"
                >
                    {lists.map(list => (
                        <option key={list} value={list}>{list}</option>
                    ))}
                </select>
             </div>
             
             <div className="flex gap-2">
                <button onClick={onClose} className="px-4 py-2 text-slate-500 hover:text-slate-700 text-sm">Cancelar</button>
                <button 
                  onClick={handleAddSelected}
                  className="px-6 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium shadow-md shadow-brand-200 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Añadir ({detectedTasks.filter(t => t.selected).length})
                </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageTaskAnalyzer;
