
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality, Type } from '@google/genai';
import Spinner from './common/Spinner';
import IconButton from './common/IconButton';
import MarkdownRenderer from './common/MarkdownRenderer';

interface AnalyzedImage {
    base64: string;
    mimeType: string;
    preview: string;
}

interface CinematicConcept {
    id: string;
    category: 'Lighting' | 'Camera' | 'Atmosphere' | 'Color' | 'Composition';
    label_es: string; 
    value_en: string; 
    description: string;
}

const StickerModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const [image, setImage] = useState<AnalyzedImage | null>(null);
    const [generatedSticker, setGeneratedSticker] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleUpload = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            const base64 = dataUrl.split(',')[1];
            setImage({ base64, mimeType: file.type, preview: dataUrl });
            setGeneratedSticker(null);
            setError(null);
        };
        reader.readAsDataURL(file);
    };

    const generateSticker = async () => {
        if (!image) return;
        setIsGenerating(true);
        setError(null);
        try {
            if (!process.env.API_KEY) throw new Error("API_KEY no configurada.");
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const prompt = "Generate a high-quality die-cut sticker of the main subject in this image. Isolate the subject and add a thick white border contour around it. Place it on a plain solid black background for easy extraction.";
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: {
                    parts: [
                        { inlineData: { mimeType: image.mimeType, data: image.base64 } },
                        { text: prompt }
                    ]
                },
                config: { responseModalities: [Modality.IMAGE] }
            });
            
            const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
            if (imagePart?.inlineData?.data) {
                setGeneratedSticker(`data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`);
            } else {
                throw new Error("No se generó la imagen.");
            }
        } catch (e: any) {
            setError(e.message || "Error al generar sticker");
        } finally {
            setIsGenerating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-gray-800 rounded-xl p-6 max-w-2xl w-full flex flex-col gap-4 shadow-2xl border border-gray-700" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center border-b border-gray-700 pb-3">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        Generador de Stickers
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-400">Imagen Original</label>
                        <div 
                            className="aspect-square rounded-lg border-2 border-dashed border-gray-600 flex items-center justify-center cursor-pointer hover:border-pink-500 transition-all bg-gray-900 overflow-hidden"
                            onClick={() => document.getElementById('sticker-upload')?.click()}
                        >
                            {image ? <img src={image.preview} className="w-full h-full object-contain" alt="Original" /> : <span className="text-gray-500 text-sm">Subir Foto</span>}
                            <input type="file" id="sticker-upload" className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} />
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-400">Resultado</label>
                        <div className="aspect-square rounded-lg bg-gray-900 border border-gray-700 flex items-center justify-center overflow-hidden">
                            {isGenerating ? <Spinner size="8" /> : generatedSticker ? <img src={generatedSticker} className="w-full h-full object-contain" alt="Sticker" /> : <span className="text-gray-700 text-xs text-center px-4">El sticker aparecerá aquí</span>}
                        </div>
                    </div>
                </div>
                <div className="flex gap-4 mt-4">
                    <button onClick={generateSticker} disabled={!image || isGenerating} className="flex-1 py-3 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-lg disabled:opacity-50">Generar Sticker</button>
                    {generatedSticker && <button onClick={() => { const a = document.createElement('a'); a.href = generatedSticker; a.download = 'sticker.png'; a.click(); }} className="px-6 py-3 bg-gray-700 text-white font-bold rounded-lg">Descargar</button>}
                </div>
            </div>
        </div>
    );
};

const FilmCritic: React.FC = () => {
    const [selectedImage, setSelectedImage] = useState<AnalyzedImage | null>(null);
    const [analysisText, setAnalysisText] = useState<string | null>(null);
    const [availableConcepts, setAvailableConcepts] = useState<CinematicConcept[]>([]);
    const [selectedConcepts, setSelectedConcepts] = useState<CinematicConcept[]>([]);
    const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null);
    const [isStickerModalOpen, setIsStickerModalOpen] = useState(false);
    const [status, setStatus] = useState<'idle' | 'analyzing' | 'generating_prompt'>('idle');
    const [error, setError] = useState<string | null>(null);
    const [draggedConcept, setDraggedConcept] = useState<CinematicConcept | null>(null);

    const handleImageUpload = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            const base64 = dataUrl.split(',')[1];
            setSelectedImage({ base64, mimeType: file.type, preview: dataUrl });
            setAnalysisText(null);
            setAvailableConcepts([]);
            setSelectedConcepts([]);
            setGeneratedPrompt(null);
        };
        reader.readAsDataURL(file);
    };

    const analyzeImage = async () => {
        if (!selectedImage) return;
        setStatus('analyzing');
        setError(null);
        try {
            if (!process.env.API_KEY) throw new Error("API_KEY no configurada.");
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

            const analysisRes = await ai.models.generateContent({
                model: 'gemini-3.1-flash-lite-preview',
                contents: {
                    parts: [
                        { inlineData: { mimeType: selectedImage.mimeType, data: selectedImage.base64 } },
                        { text: "Actúa como un Director de Fotografía experto. Analiza la imagen y sugiere mejoras cinematográficas reales. Devuelve una crítica de 100 palabras." }
                    ]
                }
            });
            setAnalysisText(analysisRes.text);

            const conceptsRes = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: {
                    parts: [
                        { inlineData: { mimeType: selectedImage.mimeType, data: selectedImage.base64 } },
                        { text: "Genera 15 conceptos técnicos cinematográficos (iluminación, cámara, atmósfera, color, composición) que mejorarían esta imagen. Incluye términos como Rembrandt lighting, practical lights, anamorphic, volumetric fog, teal & orange grading. Devuelve SOLO un array JSON de objetos: {id, category, label_es, value_en, description}." }
                    ]
                },
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                id: { type: Type.STRING },
                                category: { type: Type.STRING, enum: ['Lighting', 'Camera', 'Atmosphere', 'Color', 'Composition'] },
                                label_es: { type: Type.STRING },
                                value_en: { type: Type.STRING },
                                description: { type: Type.STRING }
                            },
                            required: ["id", "category", "label_es", "value_en", "description"]
                        }
                    }
                }
            });
            setAvailableConcepts(JSON.parse(conceptsRes.text));
        } catch (e: any) {
            setError(e.message);
        } finally {
            setStatus('idle');
        }
    };

    const generateFinalPrompt = async () => {
        if (!selectedImage || selectedConcepts.length === 0) return;
        setStatus('generating_prompt');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const technicalTerms = selectedConcepts.map(c => `${c.category}: ${c.value_en}`).join(', ');
            const instruction = `
                Generate a MASTER CINEMATIC PROMPT in English for "NanoBanana Pro" (high-fidelity image generator).
                Use the visual content of the provided image as the base.
                Integrate these specific technical adjustments: ${technicalTerms}.
                Ensure the prompt describes:
                - COMPOSITION: Specific camera angles and framing.
                - LIGHTING: Soft Rembrandt lighting schemes, practical lights in the scene.
                - LENS: Technical specifics like 50mm anamorphic lens quality.
                - ATMOSPHERE: Presence of volumetric fog, haze, and mood.
                - GRADING: Professional teal and orange color grading.
                Make explicit reference to the original subject. Devuelve SOLO el prompt en inglés.
            `;
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: {
                    parts: [
                        { inlineData: { mimeType: selectedImage.mimeType, data: selectedImage.base64 } },
                        { text: instruction }
                    ]
                }
            });
            setGeneratedPrompt(response.text.trim());
        } catch (e: any) {
            setError(e.message);
        } finally {
            setStatus('idle');
        }
    };

    const toggleConcept = (concept: CinematicConcept) => {
        setSelectedConcepts(prev => prev.find(c => c.id === concept.id) ? prev.filter(c => c.id !== concept.id) : [...prev, concept]);
    };

    // Fix: Implemented handleDragStart to enable dragging of concepts
    const handleDragStart = (e: React.DragEvent, concept: CinematicConcept) => {
        e.dataTransfer.setData('application/json+critic-concept', JSON.stringify(concept));
        setDraggedConcept(concept);
    };

    // Fix: Implemented handleDropToBuilder to receive dragged concepts into the selection
    const handleDropToBuilder = (e: React.DragEvent) => {
        e.preventDefault();
        const data = e.dataTransfer.getData('application/json+critic-concept');
        if (data) {
            try {
                const concept = JSON.parse(data) as CinematicConcept;
                if (!selectedConcepts.find(c => c.id === concept.id)) {
                    setSelectedConcepts(prev => [...prev, concept]);
                }
            } catch (err) {
                console.error("Failed to parse dropped concept", err);
            }
        }
        setDraggedConcept(null);
    };

    const getCategoryColor = (cat: string) => {
        switch(cat) {
            case 'Lighting': return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
            case 'Camera': return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
            case 'Atmosphere': return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
            case 'Color': return 'bg-pink-500/20 text-pink-300 border-pink-500/40';
            case 'Composition': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
            default: return 'bg-gray-700 text-gray-300';
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-4 flex flex-col gap-6 h-[85vh]">
            <StickerModal isOpen={isStickerModalOpen} onClose={() => setIsStickerModalOpen(false)} />
            
            <header className="bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-700 flex flex-col md:flex-row items-center gap-6">
                <div className="flex-1">
                    <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-red-600">Crítico Cineasta</h2>
                    <p className="text-gray-400 text-sm mt-1 font-medium">Sube una foto y construye el prompt perfecto usando bloques interactivos.</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setIsStickerModalOpen(true)} className="px-5 py-2 bg-pink-600/10 text-pink-400 border border-pink-500/30 rounded-full text-xs font-bold hover:bg-pink-600 hover:text-white transition-all">Sticker Maker</button>
                    {!selectedImage ? (
                        <div onClick={() => document.getElementById('critic-upload')?.click()} className="bg-amber-600 hover:bg-amber-700 text-white rounded-full px-6 py-2 cursor-pointer font-bold text-sm transition-colors">+ Subir Foto</div>
                    ) : (
                        <div className="flex items-center gap-4 bg-gray-900/60 p-1 pr-4 rounded-full border border-gray-700">
                            <div className="h-10 w-14 rounded-full overflow-hidden border border-gray-700"><img src={selectedImage.preview} className="w-full h-full object-cover" alt="Thumb" /></div>
                            {availableConcepts.length === 0 && <button onClick={analyzeImage} className="text-amber-400 font-black text-xs hover:text-amber-300">Analizar Ahora</button>}
                            <button onClick={() => setSelectedImage(null)} className="text-gray-500 hover:text-white"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                    )}
                </div>
                <input type="file" id="critic-upload" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])} />
            </header>

            {status === 'analyzing' ? (
                <div className="flex-grow flex flex-col items-center justify-center animate-pulse"><Spinner size="16" /><p className="mt-4 text-amber-500 font-black text-xs tracking-widest uppercase">Análisis Cinematográfico en Proceso...</p></div>
            ) : availableConcepts.length > 0 && (
                <div className="flex-grow flex flex-col lg:flex-row gap-6 overflow-hidden">
                    {/* Concept Inventory */}
                    <div className="lg:w-5/12 flex flex-col gap-4 overflow-hidden">
                        {analysisText && (
                            <div className="bg-gray-800/80 rounded-xl p-4 border border-gray-700 shadow-md">
                                <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2">Crítica del Director</h3>
                                <div className="text-xs text-gray-300 italic font-serif max-h-32 overflow-y-auto custom-scrollbar"><MarkdownRenderer content={analysisText} /></div>
                            </div>
                        )}
                        <div className="bg-gray-900/40 rounded-xl p-5 border border-gray-800 flex-grow flex flex-col overflow-hidden">
                            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Módulos Sugeridos (Haz clic para seleccionar)</h3>
                            <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar space-y-5">
                                {['Lighting', 'Camera', 'Atmosphere', 'Color', 'Composition'].map(cat => {
                                    const concepts = availableConcepts.filter(c => c.category === cat);
                                    if (concepts.length === 0) return null;
                                    return (
                                        <div key={cat}>
                                            <h4 className="text-[10px] font-bold text-gray-600 mb-2 uppercase tracking-tighter">{cat}</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {concepts.map(concept => {
                                                    const isSelected = selectedConcepts.some(s => s.id === concept.id);
                                                    return (
                                                        <div
                                                            key={concept.id}
                                                            draggable={!isSelected}
                                                            onDragStart={(e) => handleDragStart(e, concept)}
                                                            onClick={() => toggleConcept(concept)}
                                                            className={`px-3 py-1.5 rounded-lg border text-xs cursor-pointer transition-all ${getCategoryColor(concept.category)} ${isSelected ? 'opacity-30 scale-90 grayscale' : 'hover:scale-105 active:scale-95 shadow-sm'}`}
                                                            title={concept.description}
                                                        >
                                                            <span className="font-bold">{concept.label_es}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Builder Area */}
                    <div className="lg:w-7/12 flex flex-col gap-6 overflow-hidden">
                        <div 
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleDropToBuilder}
                            className={`flex-grow bg-gray-800 rounded-2xl border-2 border-dashed p-6 flex flex-col gap-4 relative transition-all ${selectedConcepts.length > 0 ? 'border-amber-500/50 shadow-2xl' : 'border-gray-700'}`}
                        >
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-black text-white flex items-center gap-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                    Constructor de Prompt
                                </h3>
                                {selectedConcepts.length > 0 && <button onClick={() => setSelectedConcepts([])} className="text-[10px] text-gray-500 hover:text-red-400 font-bold uppercase underline">Limpiar</button>}
                            </div>

                            {selectedConcepts.length === 0 ? (
                                <div className="flex-grow flex flex-col items-center justify-center text-gray-600 animate-pulse">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4v16m8-8H4" /></svg>
                                    <p className="text-sm font-medium">Arrastra conceptos aquí para esculpir tu visión.</p>
                                </div>
                            ) : (
                                <div className="flex flex-wrap content-start gap-3 overflow-y-auto pr-2 custom-scrollbar">
                                    {selectedConcepts.map(concept => (
                                        <div key={concept.id} className={`px-4 py-2 rounded-xl border text-sm flex items-center gap-3 shadow-sm transition-all ${getCategoryColor(concept.category)} bg-opacity-30`}>
                                            <div className="flex flex-col"><span className="font-black leading-tight">{concept.label_es}</span><span className="text-[10px] opacity-60 font-medium">{concept.category}</span></div>
                                            <button onClick={() => toggleConcept(concept)} className="hover:bg-black/20 p-1 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="mt-auto pt-4 border-t border-gray-700">
                                <button onClick={generateFinalPrompt} disabled={selectedConcepts.length === 0 || status !== 'idle'} className="w-full py-4 bg-gradient-to-r from-amber-600 to-orange-700 text-white font-black rounded-xl shadow-lg hover:brightness-110 transition-all flex items-center justify-center gap-3 disabled:opacity-50">
                                    {status === 'generating_prompt' ? <><Spinner size="5" /><span>Fusionando Estilos...</span></> : <><span>Generar Prompt para NanoBanana Pro</span></>}
                                </button>
                            </div>
                        </div>

                        {generatedPrompt && (
                            <div className="bg-black/70 rounded-2xl p-5 border border-amber-500/40 animate-fade-in shadow-2xl relative">
                                <div className="flex justify-between items-center mb-3">
                                    <label className="text-[10px] text-amber-500 font-black uppercase tracking-widest">Prompt Cinematográfico Maestro:</label>
                                    <button onClick={() => navigator.clipboard.writeText(generatedPrompt)} className="text-[10px] font-bold text-gray-500 hover:text-white uppercase flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>Copiar</button>
                                </div>
                                <p className="text-gray-200 text-sm font-mono leading-relaxed bg-gray-900/50 p-4 rounded-xl border border-gray-800">{generatedPrompt}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {!selectedImage && status === 'idle' && (
                <div className="flex-grow flex flex-col items-center justify-center text-gray-700 opacity-40">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <p className="text-xl font-bold italic">"Cada imagen tiene una historia técnica que contar."</p>
                    <p className="text-sm mt-2 font-medium">Sube una foto para que el director analice su potencial.</p>
                </div>
            )}
        </div>
    );
};

export default FilmCritic;
