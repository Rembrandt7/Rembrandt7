
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { useLinks } from '../contexts/LinkContext';
import MarkdownRenderer from './common/MarkdownRenderer';
import Spinner from './common/Spinner';
import IconButton from './common/IconButton';

interface ChatMessage {
    role: 'user' | 'model';
    text?: string;
    imageBase64?: string;
    mimeType?: string;
}

const Engineer: React.FC = () => {
    const { googleApiConfig } = useLinks();
    const [query, setQuery] = useState('');
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatHistory, isLoading, isGeneratingImage]);

    const handleAsk = async () => {
        if (!query.trim()) return;

        const userMsg: ChatMessage = { role: 'user', text: query };
        setChatHistory(prev => [...prev, userMsg]);
        setQuery('');
        setIsLoading(true);
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

            // System instruction to act as an Engineer
            const systemInstruction = `Eres un Ingeniero Estructural Senior experto y consultor técnico. 
            Tu objetivo es resolver dudas sobre estructuras, cálculos, materiales (concreto, acero, madera), 
            normativas de construcción y análisis de cargas. 
            
            Responde con precisión técnica, usando terminología adecuada, fórmulas si es necesario, 
            y siempre priorizando la seguridad estructural. Si una consulta requiere un cálculo complejo 
            o inspección física, advierte al usuario que consulte a un especialista in situ.`;

            const historyForApi = chatHistory
                .filter(msg => msg.text) // Filter out image-only messages if any (though strict typing handles it)
                .map(msg => ({
                    role: msg.role,
                    parts: [{ text: msg.text || '' }]
                }));

            const chat = ai.chats.create({
                model: 'gemini-3.1-flash-preview',
                config: {
                    systemInstruction: systemInstruction,
                },
                history: historyForApi
            });

            const result = await chat.sendMessage({ message: userMsg.text || '' });
            const responseText = result.text;

            setChatHistory(prev => [...prev, { role: 'model', text: responseText }]);

        } catch (e: any) {
            console.error(e);
            setError("Ocurrió un error al consultar al ingeniero. Por favor intenta de nuevo.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateVisual = async () => {
        // Find the last response from the model to use as context
        const lastModelMessage = [...chatHistory].reverse().find(m => m.role === 'model' && m.text);
        
        if (!lastModelMessage || !lastModelMessage.text) {
            setError("No hay contexto suficiente para generar una imagen. Haz una consulta primero.");
            return;
        }

        setIsGeneratingImage(true);
        setError(null);

        try {
            if (!process.env.API_KEY) throw new Error("API_KEY no configurada.");
            const ai = new GoogleGenAI({ 
                apiKey: googleApiConfig?.apiKey || process.env.API_KEY || process.env.GEMINI_API_KEY || '',
                baseUrl: `${window.location.origin}/api/proxy/google`
            });

            const prompt = `Genera un diagrama técnico estructural, esquema o visualización realista que explique el siguiente concepto o solución de ingeniería: "${lastModelMessage.text.substring(0, 500)}...". La imagen debe ser clara, profesional y educativa.`;

            const response = await ai.models.generateContent({
                model: 'gemini-3.1-flash-preview-image',
                contents: { parts: [{ text: prompt }] },
                config: { responseModalities: [Modality.IMAGE] },
            });

            const imagePartData = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData;

            if (imagePartData?.data) {
                const visualMsg: ChatMessage = {
                    role: 'model',
                    imageBase64: imagePartData.data,
                    mimeType: imagePartData.mimeType
                };
                setChatHistory(prev => [...prev, visualMsg]);
            } else {
                setError("No se pudo generar la visualización.");
            }

        } catch (e: any) {
            console.error("Error generating visual:", e);
            setError("Error al generar la imagen técnica.");
        } finally {
            setIsGeneratingImage(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleAsk();
        }
    };

    return (
        <div className="max-w-5xl mx-auto p-6 bg-gray-800 rounded-lg shadow-xl min-h-[80vh] flex flex-col border border-gray-700">
            <header className="mb-6 border-b border-gray-700 pb-4 flex items-center gap-4">
                <div className="p-3 bg-blue-900/50 rounded-lg text-blue-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white">Ingeniero Estructural IA</h2>
                    <p className="text-gray-400 text-sm">Consultas sobre cálculo, materiales y normativas.</p>
                </div>
            </header>

            <div 
                ref={chatContainerRef}
                className="flex-grow overflow-y-auto space-y-6 p-4 bg-gray-900/50 rounded-lg mb-4 border border-gray-700/50 scrollbar-thin scrollbar-thumb-gray-600"
            >
                {chatHistory.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-60">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p>Escribe tu consulta estructural aquí...</p>
                    </div>
                )}

                {chatHistory.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-lg p-4 ${
                            msg.role === 'user' 
                            ? 'bg-blue-600 text-white rounded-tr-none' 
                            : 'bg-gray-700 text-gray-100 rounded-tl-none border border-gray-600'
                        }`}>
                            {msg.role === 'model' ? (
                                <div className="prose prose-invert prose-sm max-w-none">
                                    {msg.text && <MarkdownRenderer content={msg.text} />}
                                    {msg.imageBase64 && (
                                        <div className="mt-4">
                                            <p className="text-xs text-gray-400 mb-2 font-semibold uppercase">Diagrama / Visualización Generada:</p>
                                            <img 
                                                src={`data:${msg.mimeType};base64,${msg.imageBase64}`} 
                                                alt="Visualización Estructural" 
                                                className="rounded-lg border border-gray-600 shadow-md max-w-full"
                                            />
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="whitespace-pre-wrap">{msg.text}</p>
                            )}
                        </div>
                    </div>
                ))}
                
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-gray-700 rounded-lg p-4 rounded-tl-none border border-gray-600 flex items-center gap-3">
                            <Spinner size="5" />
                            <span className="text-gray-300 text-sm">Analizando estructura...</span>
                        </div>
                    </div>
                )}

                 {isGeneratingImage && (
                    <div className="flex justify-start">
                        <div className="bg-gray-700 rounded-lg p-4 rounded-tl-none border border-gray-600 flex items-center gap-3">
                            <Spinner size="5" />
                            <span className="text-gray-300 text-sm">Generando visualización técnica...</span>
                        </div>
                    </div>
                )}
                
                {error && (
                    <div className="bg-red-900/20 border border-red-800/50 text-red-400 p-3 rounded-lg text-center text-sm">
                        {error}
                    </div>
                )}
            </div>

            <div className="relative flex gap-2">
                <div className="relative flex-grow">
                    <textarea
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="Ej. ¿Cuál es la resistencia a compresión requerida para una columna de 30x30 en zona sísmica?"
                        className="w-full p-4 pr-14 bg-gray-700 rounded-lg border border-gray-600 focus:ring-2 focus:ring-blue-500 text-gray-100 resize-none shadow-lg"
                        rows={3}
                        disabled={isLoading || isGeneratingImage}
                    />
                    <div className="absolute bottom-3 right-3">
                        <IconButton 
                            onClick={handleAsk} 
                            disabled={isLoading || isGeneratingImage || !query.trim()}
                            className={`!bg-blue-600 hover:!bg-blue-700 ${isLoading || isGeneratingImage || !query.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
                            tooltip="Enviar Consulta"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        </IconButton>
                    </div>
                </div>
                
                <div className="flex flex-col justify-end">
                     <IconButton 
                        onClick={handleGenerateVisual} 
                        disabled={isLoading || isGeneratingImage || chatHistory.length === 0}
                        className={`!bg-purple-600 hover:!bg-purple-700 h-12 w-12 ${isLoading || isGeneratingImage || chatHistory.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                        tooltip="Generar Diagrama/Visualización"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </IconButton>
                </div>
            </div>
        </div>
    );
};

export default Engineer;
