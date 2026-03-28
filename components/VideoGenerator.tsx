
import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import CollapsibleSection from './common/CollapsibleSection';
import IconButton from './common/IconButton';
import Spinner from './common/Spinner';

type Platform = 'Grok' | 'Meta' | 'Veo 3.1';

const VideoGenerator: React.FC = () => {
    // Generator State
    const [platform, setPlatform] = useState<Platform>('Veo 3.1');
    const [idea, setIdea] = useState('');
    
    // Veo Specifics
    const [narrator, setNarrator] = useState('');
    const [textOverlay, setTextOverlay] = useState('');

    // Output State
    const [generatedPrompt, setGeneratedPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isTranslating, setIsTranslating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isBuilderOpen, setIsBuilderOpen] = useState(true);

    const handleGeneratePrompt = async () => {
        if (!idea.trim()) {
            setError("Por favor describe tu idea para el video.");
            return;
        }
        
        setIsGenerating(true);
        setError(null);

        try {
            if (!process.env.API_KEY) throw new Error("API_KEY no configurada.");
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

            let promptRequest = `Actúa como un Ingeniero de Prompts experto en generación de video con IA.
            Tu objetivo es escribir un prompt altamente detallado y optimizado para la plataforma: ${platform}.
            
            Detalles de la idea del usuario: "${idea}".
            `;

            if (platform === 'Veo 3.1') {
                promptRequest += `
                Especificaciones para Veo 3.1 (Google):
                - Enfócate en términos cinematográficos (iluminación, tipo de lente, movimiento de cámara).
                - Estilo visual: Fotorealista, 4k, HDR.
                `;
                if (narrator) promptRequest += `- Incluye en la descripción una nota sobre la narración deseada: "${narrator}".`;
                if (textOverlay) promptRequest += `- Incluye instrucciones para texto en pantalla (overlay): "${textOverlay}".`;
            } else if (platform === 'Grok') {
                promptRequest += `
                Especificaciones para Grok (xAI):
                - Sé extremadamente descriptivo y visual.
                - Usa un tono moderno y vanguardista.
                `;
            } else if (platform === 'Meta') {
                promptRequest += `
                Especificaciones para Meta (Make-A-Video / Emu):
                - Enfócate en la fluidez del movimiento y la claridad del sujeto.
                - Usa palabras clave cortas y potentes.
                `;
            }

            promptRequest += `\nResponde SOLAMENTE con el texto del prompt final en español, sin introducciones ni explicaciones.`;

            const response = await ai.models.generateContent({
                // Using gemini-3.1-flash-lite-preview for fast generation
                model: 'gemini-3.1-flash-lite-preview',
                contents: { parts: [{ text: promptRequest }] },
            });

            setGeneratedPrompt(response.text.trim());

        } catch (e: any) {
            console.error(e);
            setError("Error al generar el prompt.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleTranslate = async () => {
        if (!generatedPrompt) return;
        setIsTranslating(true);
        try {
            if (!process.env.API_KEY) throw new Error("API_KEY no configurada.");
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const response = await ai.models.generateContent({
                // Using gemini-3.1-flash-lite-preview for translation.
                model: 'gemini-3.1-flash-lite-preview',
                contents: { parts: [{ text: `Translate the following video generation prompt to English. Maintain all technical camera terms and style keywords. Return ONLY the translated text:\n\n${generatedPrompt}` }] },
            });
            
            setGeneratedPrompt(response.text.trim());
        } catch (e) {
            setError("Error al traducir.");
        } finally {
            setIsTranslating(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(generatedPrompt);
        // Visual feedback could be added here
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 py-8">
            
            {/* AI Prompt Generator Section */}
            <div className="bg-gray-800 p-6 rounded-lg shadow-xl border border-gray-700">
                 <CollapsibleSection title="Generador de Prompts con IA" isOpen={isBuilderOpen} onToggle={() => setIsBuilderOpen(prev => !prev)}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        
                        {/* Left Column: Inputs */}
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Plataforma Destino</label>
                                <div className="flex bg-gray-700 rounded-lg p-1">
                                    {(['Grok', 'Meta', 'Veo 3.1'] as Platform[]).map((p) => (
                                        <button
                                            key={p}
                                            onClick={() => setPlatform(p)}
                                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                                                platform === p 
                                                ? 'bg-purple-600 text-white shadow-lg' 
                                                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-600'
                                            }`}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Describe tu idea para el video</label>
                                <textarea 
                                    value={idea} 
                                    onChange={e => setIdea(e.target.value)} 
                                    placeholder="Ej. Un astronauta caminando por un mercado cyberpunk bajo la lluvia..." 
                                    className="w-full p-3 bg-gray-700 rounded-md border border-gray-600 focus:ring-2 focus:ring-purple-500 text-gray-100 h-32 resize-none"
                                />
                            </div>

                            {platform === 'Veo 3.1' && (
                                <div className="space-y-4 animate-fade-in bg-gray-700/30 p-4 rounded-lg border border-gray-600/50">
                                    <h4 className="text-sm font-semibold text-purple-400 uppercase tracking-wider">Opciones Veo 3.1</h4>
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-1">Narrador / Audio (Descripción)</label>
                                        <input 
                                            type="text" 
                                            value={narrator} 
                                            onChange={e => setNarrator(e.target.value)} 
                                            placeholder="Ej. Voz en off profunda y misteriosa" 
                                            className="w-full p-2 bg-gray-700 rounded-md border border-gray-600 focus:ring-1 focus:ring-purple-500 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-1">Texto en Pantalla (Overlay)</label>
                                        <input 
                                            type="text" 
                                            value={textOverlay} 
                                            onChange={e => setTextOverlay(e.target.value)} 
                                            placeholder="Ej. 'AÑO 2099'" 
                                            className="w-full p-2 bg-gray-700 rounded-md border border-gray-600 focus:ring-1 focus:ring-purple-500 text-sm"
                                        />
                                    </div>
                                </div>
                            )}

                            <button 
                                onClick={handleGeneratePrompt} 
                                disabled={isGenerating}
                                className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-md text-white font-bold shadow-lg transition-all flex items-center justify-center gap-2"
                            >
                                {isGenerating ? <Spinner size="5" /> : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>}
                                {isGenerating ? 'Creando Magia...' : 'Generar Prompt Experto'}
                            </button>
                        </div>

                        {/* Right Column: Output */}
                        <div className="flex flex-col h-full">
                            <label className="block text-sm font-medium text-gray-300 mb-2 flex justify-between items-center">
                                <span>Prompt Generado</span>
                                {generatedPrompt && (
                                    <span className="text-xs text-green-400 animate-pulse">¡Listo para copiar!</span>
                                )}
                            </label>
                            <div className="relative flex-grow">
                                <textarea 
                                    readOnly
                                    value={generatedPrompt}
                                    placeholder="El prompt generado aparecerá aquí..."
                                    className="w-full h-full min-h-[300px] p-4 bg-gray-900 rounded-lg border border-gray-700 text-gray-300 font-mono text-sm leading-relaxed focus:ring-2 focus:ring-purple-500 resize-none"
                                />
                                {generatedPrompt && (
                                    <div className="absolute top-2 right-2 flex gap-2">
                                        <IconButton onClick={handleCopy} tooltip="Copiar al Portapapeles">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                        </IconButton>
                                    </div>
                                )}
                            </div>
                            
                            <div className="mt-4 flex gap-3">
                                <button 
                                    onClick={handleTranslate}
                                    disabled={!generatedPrompt || isTranslating}
                                    className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-md font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isTranslating ? <Spinner size="4"/> : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>}
                                    Traducir a Inglés
                                </button>
                                <button 
                                    onClick={handleCopy}
                                    disabled={!generatedPrompt}
                                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Copiar Prompt
                                </button>
                            </div>
                            {error && <p className="text-red-400 text-sm mt-2 text-center">{error}</p>}
                        </div>

                    </div>
                </CollapsibleSection>
            </div>
        </div>
    );
};

export default VideoGenerator;
