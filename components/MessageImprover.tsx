
import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import Spinner from './common/Spinner';
import IconButton from './common/IconButton';
import { Sparkles, Copy, Check, History, Trash2 } from 'lucide-react';
import { useLinks } from '../contexts/LinkContext';
import { motion, AnimatePresence } from 'motion/react';

const MessageImprover: React.FC = () => {
    const { config, updateConfig } = useLinks();
    const [text, setText] = useState('');
    const [improvedText, setImprovedText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    const history = config.aiHistory?.filter(h => h.type === 'improvement') || [];

    const handleImprove = async () => {
        if (!text.trim()) {
            setError('Por favor, pega el texto que deseas mejorar.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setImprovedText('');

        try {
            if (!process.env.API_KEY) {
                throw new Error("API_KEY environment variable is not set.");
            }
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const systemInstruction = `Eres un experto en redacción y comunicación clara. 
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

            const response = await ai.models.generateContent({
                model: 'gemini-3.1-flash-lite-preview',
                contents: [{ parts: [{ text: `Mejora este texto manteniendo la idea original: "${text}"` }] }],
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
            setError(e.message || 'Ocurrió un error al mejorar el mensaje.');
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
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Texto Original</label>
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Pega aquí el texto que quieres mejorar..."
                        className="w-full h-64 p-4 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 outline-none resize-none text-sm leading-relaxed"
                    />
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
                <p className="text-red-400 mt-4 text-center bg-red-900/20 p-2 rounded-md font-medium text-sm">
                    {error}
                </p>
            )}

            <button
                onClick={handleImprove}
                disabled={isLoading || !text.trim()}
                className="w-full mt-6 px-6 py-3 font-semibold text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-900/20"
            >
                {isLoading ? <Spinner size="5" /> : <Sparkles size={18} />}
                {isLoading ? 'Mejorando...' : 'Mejorar Claridad'}
            </button>
        </div>
    );
};

export default MessageImprover;
