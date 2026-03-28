
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { 
    MousePointer2, 
    Type, 
    Upload, 
    PenTool, 
    FileCode, 
    Trash2, 
    Download, 
    Loader2,
    Wand2,
    Image as ImageIcon
} from 'lucide-react';
import Spinner from './common/Spinner';
import IconButton from './common/IconButton';
import TextToolbar from './common/TextToolbar';
import { Tab } from '../types';

// ... (keep existing interfaces and types)
type Tool = 'select' | 'brush' | 'text' | 'crop' | 'filter';

interface BaseObject {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    scale: number;
}

interface ImageObject extends BaseObject {
    type: 'image';
    img: HTMLImageElement;
    src: string;
}

interface TextObject extends BaseObject {
    type: 'text';
    text: string;
    fontSize: number;
    fontFamily: string;
    color: string;
    fontWeight: 'normal' | 'bold';
    fontStyle: 'normal' | 'italic';
    textDecoration: 'none' | 'underline';
    textAlign: 'left' | 'center' | 'right';
    strokeColor: string;
    strokeWidth: number;
}

type EditorObject = ImageObject | TextObject;

interface ImageEditorProps {
    onAttachToEmail: (base64: string, mimeType: string) => void;
    onSwitchTab: (tab: Tab) => void;
}

const ImageEditor: React.FC<ImageEditorProps> = ({ onAttachToEmail, onSwitchTab }) => {
    // Canvas Refs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const interactionCanvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // State
    const [objects, setObjects] = useState<EditorObject[]>([]);
    const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
    const [tool, setTool] = useState<Tool>('select');
    const [isLoading, setIsLoading] = useState(false);
    const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
    const [canvasDisplaySize, setCanvasDisplaySize] = useState({ width: 800, height: 600 });
    
    // AI & Editing State
    const [prompt, setPrompt] = useState('');
    const [brushSize, setBrushSize] = useState(20);
    const [brushPreviewPos, setBrushPreviewPos] = useState<{x: number, y: number} | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    // Additional state for error compatibility
    const [filterPreviewImage, setFilterPreviewImage] = useState<HTMLImageElement | null>(null);
    const [adjustmentMasks, setAdjustmentMasks] = useState<any[]>([]); // Placeholder for mask logic
    const [cropRect, setCropRect] = useState<{x: number, y: number, w: number, h: number} | null>(null);

    // --- Drawing Logic ---

    const redrawCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw background (white)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        objects.forEach(obj => {
            ctx.save();
            // Transform context to object space
            ctx.translate(obj.x + obj.width / 2, obj.y + obj.height / 2);
            ctx.rotate(obj.rotation);
            ctx.scale(obj.scale, obj.scale);
            ctx.translate(-(obj.x + obj.width / 2), -(obj.y + obj.height / 2));

            if (obj.type === 'image') {
                ctx.drawImage(obj.img, obj.x, obj.y, obj.width, obj.height);
            } else if (obj.type === 'text') {
                ctx.font = `${obj.fontStyle} ${obj.fontWeight} ${obj.fontSize}px ${obj.fontFamily}`;
                ctx.fillStyle = obj.color;
                ctx.textAlign = obj.textAlign;
                ctx.textBaseline = 'top';
                
                // Handle multiline text
                const lines = obj.text.split('\n');
                const lineHeight = obj.fontSize * 1.2;
                lines.forEach((line, i) => {
                     // Outline
                    if (obj.strokeWidth > 0) {
                        ctx.lineWidth = obj.strokeWidth;
                        ctx.strokeStyle = obj.strokeColor;
                        ctx.strokeText(line, obj.x, obj.y + (i * lineHeight));
                    }
                    ctx.fillText(line, obj.x, obj.y + (i * lineHeight));
                    
                    // Underline
                    if (obj.textDecoration === 'underline') {
                        const width = ctx.measureText(line).width;
                        let startX = obj.x;
                        if(obj.textAlign === 'center') startX -= width / 2;
                        if(obj.textAlign === 'right') startX -= width;
                        
                        ctx.fillRect(startX, obj.y + (i * lineHeight) + obj.fontSize, width, obj.fontSize * 0.1);
                    }
                });
            }
            ctx.restore();
        });
        
        // Draw filter preview if active
        if (filterPreviewImage) {
            ctx.drawImage(filterPreviewImage, 0, 0, canvas.width, canvas.height);
        }

    }, [objects, filterPreviewImage]);

    const redrawInteractionCanvas = useCallback(() => {
         const canvas = interactionCanvasRef.current;
         if (!canvas) return;
         const ctx = canvas.getContext('2d');
         if (!ctx) return;
         
         ctx.clearRect(0, 0, canvas.width, canvas.height);

         // Draw Crop Rect
         if (cropRect) {
             ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
             ctx.fillRect(0, 0, canvas.width, canvas.height);
             ctx.clearRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);
             ctx.strokeStyle = '#fff';
             ctx.setLineDash([5, 5]);
             ctx.strokeRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);
             ctx.setLineDash([]);
         }

         // Selection Box
         if (selectedObjectId) {
             const obj = objects.find(o => o.id === selectedObjectId);
             if (obj) {
                 ctx.save();
                 ctx.translate(obj.x + obj.width / 2, obj.y + obj.height / 2);
                 ctx.rotate(obj.rotation);
                 ctx.scale(obj.scale, obj.scale);
                 ctx.translate(-(obj.x + obj.width / 2), -(obj.y + obj.height / 2));
                 
                 ctx.strokeStyle = '#4f46e5'; // Indigo-600
                 ctx.lineWidth = 2;
                 ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
                 
                 // Handles
                 ctx.fillStyle = '#fff';
                 const handleSize = 8;
                 ctx.fillRect(obj.x - handleSize/2, obj.y - handleSize/2, handleSize, handleSize);
                 ctx.fillRect(obj.x + obj.width - handleSize/2, obj.y - handleSize/2, handleSize, handleSize);
                 ctx.fillRect(obj.x + obj.width - handleSize/2, obj.y + obj.height - handleSize/2, handleSize, handleSize);
                 ctx.fillRect(obj.x - handleSize/2, obj.y + obj.height - handleSize/2, handleSize, handleSize);

                 ctx.restore();
             }
         }

         // Brush Preview
         if (tool === 'brush' && brushPreviewPos) {
             ctx.beginPath();
             ctx.arc(brushPreviewPos.x, brushPreviewPos.y, brushSize / 2, 0, Math.PI * 2);
             ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
             ctx.lineWidth = 1;
             ctx.stroke();
             ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
             ctx.fill();
         }

    }, [objects, selectedObjectId, cropRect, tool, brushPreviewPos, brushSize]);

    // This useEffect was causing errors in the truncated file, now it has context
    useEffect(() => {
        redrawCanvas();
        redrawInteractionCanvas();
    }, [objects, selectedObjectId, redrawCanvas, redrawInteractionCanvas, brushPreviewPos, filterPreviewImage, adjustmentMasks, cropRect, canvasDisplaySize]);

    // Handle Window Resize for Canvas display
    useEffect(() => {
        const updateSize = () => {
            if (containerRef.current) {
                const { clientWidth, clientHeight } = containerRef.current;
                setCanvasDisplaySize({ width: clientWidth, height: clientHeight });
            }
        };
        window.addEventListener('resize', updateSize);
        updateSize();
        return () => window.removeEventListener('resize', updateSize);
    }, []);

    // --- Interaction Handlers ---

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!interactionCanvasRef.current) return;
        const rect = interactionCanvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Scale coordinates to match internal canvas size
        const scaleX = canvasSize.width / rect.width;
        const scaleY = canvasSize.height / rect.height;
        const canvasX = x * scaleX;
        const canvasY = y * scaleY;

        if (tool === 'brush') {
            setBrushPreviewPos({ x: canvasX, y: canvasY });
        }
        // ... (Dragging logic would go here)
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!interactionCanvasRef.current) return;
        const rect = interactionCanvasRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvasSize.width / rect.width);
        const y = (e.clientY - rect.top) * (canvasSize.height / rect.height);
        
        if (tool === 'select') {
             // Simple hit detection (reverse order to pick top object)
             const clickedObj = [...objects].reverse().find(obj => {
                 return x >= obj.x && x <= obj.x + obj.width && y >= obj.y && y <= obj.y + obj.height;
             });
             
             setSelectedObjectId(clickedObj ? clickedObj.id : null);
        }
    };

    const handleMouseLeave = () => {
        setBrushPreviewPos(null);
    };

    // --- Logic Helpers ---

    const addText = () => {
        const newText: TextObject = {
            id: Date.now().toString(),
            type: 'text',
            text: 'Texto Nuevo',
            x: 100, y: 100, width: 200, height: 50,
            rotation: 0, scale: 1,
            fontSize: 40, fontFamily: 'Arial', color: '#000000',
            fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left',
            strokeColor: 'transparent', strokeWidth: 0
        };
        setObjects([...objects, newText]);
        setSelectedObjectId(newText.id);
        setTool('select');
    };

    const handleImageUpload = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const newObj: ImageObject = {
                    id: Date.now().toString(),
                    type: 'image',
                    img: img,
                    src: img.src,
                    x: (canvasSize.width - img.width) / 2,
                    y: (canvasSize.height - img.height) / 2,
                    width: img.width,
                    height: img.height,
                    rotation: 0,
                    scale: 1
                };
                // Resize if too big
                if (newObj.width > canvasSize.width * 0.8) {
                    const ratio = (canvasSize.width * 0.8) / newObj.width;
                    newObj.width *= ratio;
                    newObj.height *= ratio;
                    newObj.x = (canvasSize.width - newObj.width) / 2;
                    newObj.y = (canvasSize.height - newObj.height) / 2;
                }
                setObjects([...objects, newObj]);
                setSelectedObjectId(newObj.id);
            };
            img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    const generateImage = async () => {
        if (!prompt) return;
        setIsLoading(true);
        setError(null);
        try {
            if (!process.env.API_KEY) throw new Error("API_KEY not configured");
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [{ text: prompt }] },
                config: { responseModalities: [Modality.IMAGE] },
            });
            
            const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
            if (imagePart?.inlineData?.data) {
                const base64 = imagePart.inlineData.data;
                const imgSrc = `data:${imagePart.inlineData.mimeType};base64,${base64}`;
                const img = new Image();
                img.onload = () => {
                     const newObj: ImageObject = {
                        id: Date.now().toString(),
                        type: 'image',
                        img: img,
                        src: imgSrc,
                        x: 50, y: 50, width: 512, height: 512,
                        rotation: 0, scale: 1
                    };
                    setObjects([...objects, newObj]);
                };
                img.src = imgSrc;
            }
        } catch (e: any) {
            setError(e.message || "Error generating image");
        } finally {
            setIsLoading(false);
        }
    };

    const exportImage = async () => {
        if (!canvasRef.current) return;
        const base64 = canvasRef.current.toDataURL('image/png').split(',')[1];
        onAttachToEmail(base64, 'image/png');
    };
    
    // --- Update Text Object ---
    const updateSelectedObject = (updates: Partial<TextObject>) => {
        if (!selectedObjectId) return;
        setObjects(prev => prev.map(obj => {
            if (obj.id === selectedObjectId && obj.type === 'text') {
                return { ...obj, ...updates };
            }
            return obj;
        }));
    };

    const selectedObject = objects.find(o => o.id === selectedObjectId);

    return (
        <div className="flex flex-col h-full bg-gray-900 text-white">
            {/* Toolbar */}
            <div className="bg-gray-800 p-4 border-b border-gray-700 flex items-center justify-between gap-4">
                <div className="flex gap-2">
                    <IconButton onClick={() => setTool('select')} isActive={tool === 'select'} tooltip="Select">
                        <MousePointer2 className="h-5 w-5" />
                    </IconButton>
                    <IconButton onClick={addText} tooltip="Add Text">
                         <Type className="h-5 w-5" />
                    </IconButton>
                    <div className="relative overflow-hidden">
                        <IconButton onClick={() => document.getElementById('img-upload')?.click()} tooltip="Upload Image">
                             <Upload className="h-5 w-5" />
                        </IconButton>
                        <input type="file" id="img-upload" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0])} />
                    </div>
                </div>

                <div className="flex gap-2 flex-grow max-w-lg">
                    <input 
                        type="text" 
                        value={prompt} 
                        onChange={e => setPrompt(e.target.value)} 
                        placeholder="Generar imagen o editar con IA..." 
                        className="flex-grow bg-gray-700 rounded px-3 py-1 text-sm border border-gray-600"
                    />
                    <button onClick={generateImage} disabled={isLoading} className="bg-purple-600 hover:bg-purple-700 px-4 py-1 rounded text-sm font-bold flex items-center gap-2">
                        {isLoading ? <Spinner size="4" /> : <span>Generar</span>}
                    </button>
                </div>

                <div className="flex gap-2">
                    <a 
                        href="https://aistudio.google.com/apps/drive/1MqPBVGYa3rBl2lGs5-8DhKUIltCigjmI?showAssistant=true&showPreview=true&resourceKey=" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="bg-pink-600 hover:bg-pink-700 px-3 py-2 rounded text-sm font-bold flex items-center gap-1 text-white"
                        title="Vectorizar Imagen"
                    >
                        <PenTool className="h-5 w-5" />
                        <span className="hidden lg:inline">Vectorizar</span>
                    </a>
                    <a 
                        href="https://codebeautify.org/svg-to-base64-converter" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="bg-indigo-600 hover:bg-indigo-700 px-3 py-2 rounded text-sm font-bold flex items-center gap-1 text-white"
                        title="Convertir SVG a Base64"
                    >
                        <FileCode className="h-5 w-5" />
                        <span className="hidden lg:inline">SVG a Base64</span>
                    </a>
                    <button onClick={exportImage} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm font-bold">Adjuntar a Email</button>
                    <button onClick={() => setObjects([])} className="text-red-400 hover:text-red-300 px-2 py-2">
                        <Trash2 className="h-5 w-5" />
                    </button>
                </div>
            </div>
            
            {error && <div className="bg-red-500 text-white p-2 text-center text-xs">{error}</div>}

            {/* Main Canvas Area */}
            <div className="flex-grow relative overflow-hidden bg-gray-700 flex items-center justify-center p-8" ref={containerRef}>
                <div 
                    className="relative shadow-2xl bg-white" 
                    style={{ width: canvasSize.width, height: canvasSize.height }}
                >
                    <canvas 
                        ref={canvasRef} 
                        width={canvasSize.width} 
                        height={canvasSize.height} 
                        className="absolute inset-0 w-full h-full"
                    />
                    <canvas 
                        ref={interactionCanvasRef} 
                        width={canvasSize.width} 
                        height={canvasSize.height}
                        className="absolute inset-0 w-full h-full cursor-crosshair"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseLeave={handleMouseLeave}
                    />
                    
                    {/* Text Toolbar Overlay */}
                    {selectedObject && selectedObject.type === 'text' && (
                        <TextToolbar 
                            object={selectedObject}
                            canvasRef={interactionCanvasRef}
                            onUpdate={updateSelectedObject}
                            onDelete={() => {
                                setObjects(prev => prev.filter(o => o.id !== selectedObjectId));
                                setSelectedObjectId(null);
                            }}
                            onBringForward={() => {}}
                            onSendToBack={() => {}}
                            onEdit={() => {
                                const newText = window.prompt("Editar texto:", selectedObject.text);
                                if (newText !== null) updateSelectedObject({ text: newText });
                            }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default ImageEditor;
