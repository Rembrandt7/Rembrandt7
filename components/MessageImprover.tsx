
import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import Spinner from './common/Spinner';
import IconButton from './common/IconButton';
import { Sparkles, Copy, Check, History, Trash2, AlertTriangle } from 'lucide-react';
import { useLinks } from '../contexts/LinkContext';
import { motion, AnimatePresence } from 'motion/react';
import SmartTextarea from './common/SmartTextarea';
import { getFriendlyAiErrorMessage, isQuotaError } from '../utils/aiError';

const MessageImprover: React.FC = () => {
    const { config, updateConfig, googleApiConfig } = useLinks();
    const [text, setText] = useState('');
    const [previousMessage, setPreviousMessage] = useState('');
    const [improvedText, setImprovedText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    const history = config.aiHistory?.filter(h => h.type === 'improvement') || [];

    const handleImprove = async () => {
        if (!text.trim() && !previousMessage.trim()) {
            setError('Por favor, ingresa el texto a mejorar o el mensaje al que quieres responder.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setImprovedText('');

        try {
            const apiKey = googleApiConfig?.apiKey || process.env.API_KEY || process.env.GEMINI_API_KEY;
            
            if (!apiKey) {
                throw new Error("No se ha configurado la API Key de Gemini. Configúrala en los ajustes (icono de engrane).");
            }

            const ai = new GoogleGenAI({ 
                apiKey,
                baseUrl: `${window.location.origin}/api/proxy/google`
            });
            
            const isReplying = previousMessage.trim().length > 0;
            const hasDraft = text.trim().length > 0;

            let systemInstruction = "";
            let userContent = "";

            const memoryContext = `
            ${config.memoria_ia?.estilo || config.memoria_ia?.laboral ? '**ADN DEL USUARIO:**' : ''}
            ${config.memoria_ia?.estilo ? `- ESTILO DE REDACCIÓN: ${config.memoria_ia.estilo}` : ''}
            ${config.memoria_ia?.laboral ? `- CONTEXTO LABORAL: ${config.memoria_ia.laboral}` : ''}`;

            if (isReplying && hasDraft) {
                systemInstruction = `Eres un experto en redacción corporativa.${memoryContext}
                El usuario ha recibido este mensaje:
                """
                ${previousMessage}
                """
                Su borrador de respuesta o ideas son: "${text}"
                
                Tu tarea es TOMAR la idea/borrador del usuario y MEJORARLO reescribiendo una respuesta profesional, impecable, directa y coherente al mensaje recibido.
                Responde ÚNICAMENTE con el texto final.`;
                userContent = `Mejora y escribe esta respuesta: "${text}"`;
            } else if (isReplying && !hasDraft) {
                systemInstruction = `Eres un experto en redacción corporativa.${memoryContext}
                El usuario ha recibido este mensaje:
                """
                ${previousMessage}
                """
                
                Tu tarea es INFERIR la mejor respuesta profesional, amable y clara a este mensaje basándote solo en el contexto. Te darán propinas altísimas si resuelves el problema.
                Responde ÚNICAMENTE con el texto final generado.`;
                userContent = `Sugiéreme la mejor respuesta a este correo.`;
            } else {
                systemInstruction = `Eres un experto en redacción y comunicación clara.${memoryContext}
                Tu tarea es MEJORAR el texto proporcionado por el usuario.
                
                REGLAS:
                1. NO cambies la idea original.
                2. Ordena las ideas para que sean más coherentes y fáciles de leer.
                3. Corrige TODA la ortografía, gramática y puntuación.
                4. Asegura el uso correcto de mayúsculas y minúsculas.
                5. Haz que el lenguaje sea más claro y fluido.
                6. Mantén un tono profesional pero directo.
                7. Responde ÚNICAMENTE con el texto mejorado, sin introducciones ni explicaciones.
                8. Genera la respuesta lo más rápido posible.`;
                userContent = `Mejora este texto manteniendo la idea original: "${text}"`;
            }

            const response = await ai.models.generateContent({
                model: 'gemini-3.1-flash-preview',
                contents: [{ parts: [{ text: userContent }] }],
                config: {
                    systemInstruction,
                    temperature: 0.3, // Lower temperature for more consistent/clear results
                },
            });

            const result = response.text.trim();
            setImprovedText(result);

            // Save to history
            const historyItem = {
                id: Date.now().toString(),
                type: 'improvement' as const,
                original: text,
                result: result,
                timestamp: Date.now()
            };

            updateConfig(prev => ({
                ...prev,
                aiHistory: [historyItem, ...(prev.aiHistory || [])].slice(0, 50) // Keep last 50
            }));
        } catch (e: any) {
            console.error(e);
            setError(getFriendlyAiErrorMessage(e, !!googleApiConfig?.apiKey));
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = (content?: string) => {
        navigator.clipboard.writeText(content || improvedText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const deleteHistoryItem = (id: string) => {
        updateConfig(prev => ({
            ...prev,
            aiHistory: (prev.aiHistory || []).filter(h => h.id !== id)
        }));
    };

    const clearHistory = () => {
        if (window.confirm('¿Estás seguro de borrar todo el historial de mejoras?')) {
            updateConfig(prev => ({
                ...prev,
                aiHistory: (prev.aiHistory || []).filter(h => h.type !== 'improvement')
            }));
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-600/20 rounded-lg">
                        <Sparkles className="text-purple-400" size={24} />
                    </div>
                    <h2 className="text-2xl font-bold text-white">Mejorador de Mensaje</h2>
                </div>
                <button
                    onClick={() => setShowHistory(!showHistory)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
                        showHistory ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                    }`}
                >
                    <History size={18} />
                    <span className="text-sm font-medium">Historial</span>
                </button>
            </div>

            <AnimatePresence>
                {showHistory && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden mb-6"
                    >
                        <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Últimas Mejoras</h3>
                                {history.length > 0 && (
                                    <button onClick={clearHistory} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
                                        <Trash2 size={12} /> Borrar todo
                                    </button>
                                )}
                            </div>
                            
                            <div className="space-y-3 max-h-64 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-700">
                                {history.length === 0 ? (
                                    <p className="text-center text-gray-600 py-4 italic text-sm">No hay historial todavía</p>
                                ) : (
                                    history.map(item => (
                                        <div key={item.id} className="bg-gray-800/50 rounded-lg p-3 border border-gray-700 group relative">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-[10px] text-gray-500">
                                                    {new Date(item.timestamp).toLocaleString()}
                                                </span>
                                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handleCopy(item.result)} className="text-gray-400 hover:text-blue-400">
                                                        <Copy size={14} />
                                                    </button>
                                                    <button onClick={() => deleteHistoryItem(item.id)} className="text-gray-400 hover:text-red-400">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                            <p className="text-xs text-gray-300 line-clamp-2 mb-1"><span className="text-gray-500 font-bold">Original:</span> {item.original}</p>
                                            <p className="text-xs text-purple-300 line-clamp-2"><span className="text-gray-500 font-bold">Mejorado:</span> {item.result}</p>
                                            <button 
                                                onClick={() => {
                                                    setText(item.original || '');
                                                    setImprovedText(item.result);
                                                    setShowHistory(false);
                                                }}
                                                className="mt-2 text-[10px] text-purple-400 hover:underline"
                                            >
                                                Cargar de nuevo
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex flex-col gap-6">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">
                            {previousMessage.trim() ? "Tu borrador o ideas (Opcional)" : "Texto Original / Idea"}
                        </label>
                        <SmartTextarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder={previousMessage.trim() ? "Escribe lo que le quieres responder..." : "Pega aquí el texto que quieres mejorar..."}
                            className="w-full h-36 p-4 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 outline-none resize-none text-sm leading-relaxed"
                        />
                    </div>

                    <details className="group border border-gray-700 rounded-lg bg-gray-900/50">
                        <summary className="cursor-pointer font-medium text-sm text-purple-300 p-3 select-none flex items-center justify-between">
                            Mensaje a Responder (RE:)
                            <span className="text-purple-400 group-open:rotate-180 transition-transform">▼</span>
                        </summary>
                        <div className="p-3 pt-0">
                            <SmartTextarea
                                value={previousMessage}
                                onChange={(e) => setPreviousMessage(e.target.value)}
                                placeholder="Pega aquí el mensaje corporativo que recibiste (Opcional)..."
                                className="w-full h-28 p-4 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 outline-none resize-none text-sm leading-relaxed"
                            />
                        </div>
                    </details>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-medium text-gray-300">Texto Mejorado</label>
                        {improvedText && (
                            <IconButton onClick={() => handleCopy()} tooltip={copied ? '¡Copiado!' : 'Copiar'}>
                                {copied ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
                            </IconButton>
                        )}
                    </div>
                    <div className="w-full h-64 p-4 bg-gray-900/50 border border-gray-700 rounded-lg text-gray-200 overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap relative">
                        {isLoading ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/40 backdrop-blur-sm rounded-lg">
                                <Spinner size="8" />
                                <p className="mt-2 text-gray-400 text-xs">Mejorando claridad...</p>
                            </div>
                        ) : improvedText ? (
                            improvedText
                        ) : (
                            <p className="text-gray-600 italic">El texto mejorado aparecerá aquí...</p>
                        )}
                    </div>
                </div>
            </div>

            {error && (
                <div className="mt-4 bg-red-950/20 border border-red-500/20 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-red-200 text-sm">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="shrink-0 text-red-400 mt-0.5" size={18} />
                        <div className="text-left">
                            <p className="font-semibold text-white">Error en el asistente de IA</p>
                            <p className="text-xs text-red-300/95 mt-1 leading-relaxed">{error}</p>
                        </div>
                    </div>
                    {isQuotaError(error) && (
                        <button 
                            onClick={() => window.dispatchEvent(new Event('open-google-config'))}
                            className="shrink-0 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-lg font-black text-xs uppercase tracking-wider transition-colors shadow-md shadow-amber-500/10 cursor-pointer"
                        >
                            Configurar mi API Key
                        </button>
                    )}
                </div>
            )}

            <button
                onClick={handleImprove}
                disabled={isLoading || (!text.trim() && !previousMessage.trim())}
                className="w-full mt-6 px-6 py-3 font-semibold text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-900/20"
            >
                {isLoading ? (
                    <>
                        <Spinner size="5" />
                        <span>Generando...</span>
                    </>
                ) : (
                    <>
                        <Sparkles size={18} />
                        <span>{previousMessage.trim() && !text.trim() ? 'Sugerir Respuesta' : 'Mejorar Claridad'}</span>
                    </>
                )}
            </button>
        </div>
    );
};

export default MessageImprover;
