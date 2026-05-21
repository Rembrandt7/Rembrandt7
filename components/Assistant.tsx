
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality, Type, FunctionDeclaration } from '@google/genai';
import { Message } from '../types';
import Spinner from './common/Spinner';
import IconButton from './common/IconButton';
import MarkdownRenderer from './common/MarkdownRenderer';
import { useLinks } from '../contexts/LinkContext';
import LiveAssistant from './LiveAssistant';

interface AssistantProps {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  onAttachImage: (base64: string, mimeType: string) => void;
  onClose: () => void; // Added for floating behavior
}

const Assistant: React.FC<AssistantProps> = ({ messages, setMessages, onAttachImage, onClose }) => {
  const [mode, setMode] = useState<'text' | 'voice'>('text');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { config, updateConfig, googleApiConfig } = useLinks();

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const sendMessage = async () => {
    if (!input.trim()) return;

    const newUserMessage: Message = { role: 'user', parts: [{ text: input }] };
    setMessages(prev => [...prev, newUserMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
        const apiKey = googleApiConfig?.apiKey || process.env.API_KEY || process.env.GEMINI_API_KEY;
        
        if (!apiKey) {
            throw new Error("No se ha configurado la API Key de Gemini. Configúrala en los ajustes.");
        }

        const ai = new GoogleGenAI({ 
            apiKey,
            baseUrl: `${window.location.origin}/api/proxy/google`
        });

        const imageRequestKeywords = [
            // Spanish
            'genera una imagen', 'crea una imagen', 'dibuja', 'haz un dibujo', 'ilustra', 'una foto de', 'una imagen de',
            // English
            'generate an image', 'create an image', 'draw', 'make a drawing', 'illustrate', 'a photo of', 'an image of', 'picture of'
        ];
        
        const isImageRequest = imageRequestKeywords.some(keyword => input.toLowerCase().includes(keyword));
        
        let modelResponse: Message;

        if (isImageRequest) {
            const response = await ai.models.generateContent({
                model: 'gemini-3.1-flash-preview-image',
                contents: { parts: [{ text: input }] },
                config: { responseModalities: [Modality.IMAGE] },
            });
            const imagePartData = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData;
            if (imagePartData?.data) {
                modelResponse = {
                    role: 'model',
                    parts: [
                        { text: "Aquí tienes la imagen que pediste." },
                        { imageBase64: imagePartData.data, mimeType: imagePartData.mimeType }
                    ]
                };
            } else {
                 throw new Error(response.text?.trim() || "No se pudo generar la imagen.");
            }
        } else {
            const addNoteFunction: FunctionDeclaration = {
                name: "addNote",
                description: "Add a new note to the user's notes.",
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING, description: "Title of the note." },
                        content: { type: Type.STRING, description: "Content of the note." },
                        category: { type: Type.STRING, description: "Category of the note (e.g., 'General', 'Trabajo', 'Personal')." },
                    },
                    required: ["title", "content", "category"],
                },
            };

            const addCalendarEventFunction: FunctionDeclaration = {
                name: "addCalendarEvent",
                description: "Add a new event to the user's calendar.",
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING, description: "Title of the event." },
                        date: { type: Type.STRING, description: "Date of the event in YYYY-MM-DD format." },
                        description: { type: Type.STRING, description: "Description of the event." },
                        type: { type: Type.STRING, description: "Type of the event (e.g., 'event', 'task', 'reminder')." },
                    },
                    required: ["title", "date", "type"],
                },
            };

            const addLinkFunction: FunctionDeclaration = {
                name: "addLink",
                description: "Add a new link to the user's quick access or models sidebar.",
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING, description: "Name of the link." },
                        href: { type: Type.STRING, description: "URL of the link." },
                        section: { type: Type.STRING, description: "Section to add the link to ('models' or 'quickAccess')." },
                    },
                    required: ["name", "href", "section"],
                },
            };

            const updateFinanceBalanceFunction: FunctionDeclaration = {
                name: "updateFinanceBalance",
                description: "Actualiza el balance de una tarjeta de finanzas (débito o crédito) sumando o restando una cantidad. Útil para aplicar sugerencias de ahorro o pago.",
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        cardId: { type: Type.STRING, description: "El ID de la tarjeta a actualizar" },
                        amount: { type: Type.NUMBER, description: "La cantidad a sumar (positivo para ingresos/pagos) o restar (negativo para gastos)" },
                        reason: { type: Type.STRING, description: "Razón del movimiento" }
                    },
                    required: ["cardId", "amount", "reason"],
                },
            };

            const updateADNFunction: FunctionDeclaration = {
                name: "updateADN",
                description: "Actualiza la memoria a largo plazo (ADN) del usuario. Úsalo cuando el usuario te pida explícitamente que recuerdes algo ('acuérdate de esto', 'guarda esto', 'recuerda que...').",
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        pilar: { type: Type.STRING, description: "En qué pilar guardar la info: 'perfil' (quién es, gustos generales), 'estilo' (cómo escribe, tono), 'laboral' (su trabajo, profesión, entorno laboral), 'personal' (vida personal, familia, objetivos).", enum: ["perfil", "estilo", "laboral", "personal"] },
                        content: { type: Type.STRING, description: "El texto exacto o resumen para recordar." }
                    },
                    required: ["pilar", "content"],
                },
            };

            const systemInstruction = `
Eres Rembrandt, un asistente de IA avanzado integrado en la aplicación "Rembrandt IA Studio".
Tienes acceso a toda la información de la aplicación del usuario.
Aquí está la configuración actual de la aplicación (incluye notas, finanzas, noticias, calendario, etc.):
${JSON.stringify(config, null, 2)}

Puedes usar esta información para evaluar tus criterios, dar sugerencias de ahorro o pago, recordar eventos, y hacer recomendaciones personalizadas.
El usuario quiere que le hagas recomendaciones de socializar con su familia (padre, hija, esposa).
Puedes usar las herramientas proporcionadas para añadir notas, eventos al calendario, o enlaces.
            `;

            const history = messages.map(msg => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: msg.parts.map(p => ({ text: p.text || '' }))
            }));

            // Send previous history to chat if any (excluding the current input which is sent below)
            // Actually, the chat object doesn't have an easy way to set history after creation in this SDK version unless passed in create.
            // Let's use generateContent with full history instead.
            const contents = [
                ...history,
                { role: 'user', parts: [{ text: input }] }
            ];

            const response = await ai.models.generateContent({
                model: 'gemini-3.1-flash-preview',
                contents: contents as any,
                config: {
                    systemInstruction,
                    tools: [{ functionDeclarations: [addNoteFunction, addCalendarEventFunction, addLinkFunction, updateFinanceBalanceFunction, updateADNFunction] }],
                }
            });
            
            let responseText = response.text || '';

            // Handle function calls
            if (response.functionCalls && response.functionCalls.length > 0) {
                const newConfig = { ...config };
                for (const call of response.functionCalls) {
                    if (call.name === 'addNote') {
                        const args = call.args as any;
                        const newNote = {
                            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                            text: args.title + (args.content ? '\n' + args.content : ''),
                            completed: false,
                            category: args.category || 'notas'
                        };
                        newConfig.notes = [...(newConfig.notes || []), newNote];
                        responseText += `\n\n*He añadido la nota "${args.title}" a tus notas.*`;
                    } else if (call.name === 'addCalendarEvent') {
                        const args = call.args as any;
                        const newEvent = {
                            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                            title: args.title,
                            date: args.date,
                            description: args.description || '',
                            type: args.type as any
                        };
                        newConfig.calendarEvents = [...(newConfig.calendarEvents || []), newEvent];
                        responseText += `\n\n*He añadido el evento "${args.title}" a tu calendario para el ${args.date}.*`;
                    } else if (call.name === 'addLink') {
                        const args = call.args as any;
                        const newLink = {
                            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                            name: args.name,
                            href: args.href,
                            colorClass: 'text-blue-400 hover:text-blue-300',
                            iconSvg: '<svg class="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>'
                        };
                        if (args.section === 'models' || args.section === 'quickAccess') {
                            newConfig.aiSidebar[args.section].push(newLink);
                            responseText += `\n\n*He añadido el enlace "${args.name}" a tu barra lateral (${args.section}).*`;
                        }
                    } else if (call.name === 'updateFinanceBalance') {
                        const args = call.args as any;
                        if (newConfig.finanzasCards) {
                            const cardIndex = newConfig.finanzasCards.findIndex(c => c.id === args.cardId);
                            if (cardIndex !== -1) {
                                newConfig.finanzasCards[cardIndex].balance += args.amount;
                                responseText += `\n\n*He actualizado el balance de la tarjeta "${newConfig.finanzasCards[cardIndex].name}" por ${args.amount > 0 ? '+' : ''}${args.amount} (${args.reason}).*`;
                            } else {
                                responseText += `\n\n*No pude encontrar la tarjeta con ID ${args.cardId} para actualizar el balance.*`;
                            }
                        }
                    } else if (call.name === 'updateADN') {
                        const args = call.args as any;
                        const pilar = args.pilar as 'perfil' | 'estilo' | 'laboral' | 'personal';
                        
                        if (!newConfig.memoria_ia || typeof newConfig.memoria_ia !== 'object') {
                            newConfig.memoria_ia = { perfil: '', estilo: '', laboral: '', personal: '' };
                        }
                        
                        const existingContent = newConfig.memoria_ia[pilar] || '';
                        newConfig.memoria_ia[pilar] = existingContent ? `${existingContent}\n- ${args.content}` : `- ${args.content}`;
                        
                        responseText += `\n\n*He guardado esa información en tu ADN (Pilar: ${pilar}).*`;
                    }
                }
                updateConfig(newConfig);
            }

            const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
            if (groundingChunks && Array.isArray(groundingChunks)) {
                const urls = groundingChunks
                    .map(chunk => chunk.web?.uri)
                    .filter(uri => !!uri);
                if (urls.length > 0) {
                    responseText += '\n\n**Fuentes:**\n' + urls.map(url => `- [${url}](${url})`).join('\n');
                }
            }

            modelResponse = { role: 'model', parts: [{ text: responseText }] };
        }

        setMessages(prev => [...prev, modelResponse]);

    } catch (e: any) {
        console.error(e);
        const errorMessage = e.message || String(e);
        let friendlyMessage = `Error: ${errorMessage}`;
        if (errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
            friendlyMessage = "You have exceeded your request quota. Please check your plan and billing details or try again later.";
        } else if (errorMessage.includes('503') || errorMessage.includes('overloaded')) {
            friendlyMessage = "The AI model is currently busy. Please try again in a moment.";
        }
        setError(friendlyMessage);
    } finally {
        setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
  
  const handleImageDragStart = (e: React.DragEvent<HTMLImageElement>, base64: string, mimeType: string) => {
    const payload = JSON.stringify({ base64, mimeType });
    e.dataTransfer.setData('application/json+rembrandt-ia-image', payload);
  };

  return (
    <div className="fixed bottom-4 right-4 w-[400px] h-[600px] bg-gray-800 rounded-lg shadow-2xl flex flex-col border border-gray-700 z-50 animate-fade-in">
      <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-900 rounded-t-lg">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-100">Asistente IA</h2>
          <div className="flex bg-gray-800 rounded-lg p-1 border border-gray-700">
            <button 
              onClick={() => setMode('text')} 
              className={`px-3 py-1 text-xs rounded-md transition-colors ${mode === 'text' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Texto
            </button>
            <button 
              onClick={() => setMode('voice')} 
              className={`px-3 py-1 text-xs rounded-md transition-colors ${mode === 'voice' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Voz
            </button>
          </div>
        </div>
        <div className="flex gap-2">
             <IconButton onClick={onClose} tooltip="Cerrar" className="hover:bg-red-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            </IconButton>
        </div>
      </div>
      
      {mode === 'voice' ? (
        <div className="flex-grow overflow-hidden bg-gray-800/95 rounded-b-lg">
          <LiveAssistant onClose={onClose} />
        </div>
      ) : (
        <>
          <div className="flex-grow overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-600 bg-gray-800/95">
            {messages.length === 0 && (
                 <div className="flex flex-col items-center justify-center h-full text-gray-500 opacity-50">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                     <p className="text-sm">¿En qué puedo ayudarte?</p>
                 </div>
            )}
            {messages.map((msg, index) => (
              <div key={index} className={`flex flex-col gap-1 max-w-[85%] w-fit ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-model'}`}>
                {msg.parts.map((part, partIndex) => (
                  <div key={partIndex} className="p-3 text-sm">
                    {part.text && <MarkdownRenderer content={part.text} />}
                    {part.imageBase64 && (
                        <div className="mt-2 space-y-2">
                            <img 
                                src={`data:${part.mimeType};base64,${part.imageBase64}`}
                                alt="Generated by AI" 
                                className="rounded-lg max-w-full cursor-grab max-h-[200px] object-contain"
                                draggable="true"
                                onDragStart={(e) => handleImageDragStart(e, part.imageBase64!, part.mimeType!)}
                            />
                            <button
                                onClick={() => onAttachImage(part.imageBase64!, part.mimeType!)}
                                className="w-full text-xs px-2 py-2 bg-purple-600 hover:bg-purple-700 rounded-md transition-colors"
                            >
                                Adjuntar
                            </button>
                        </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
             {isLoading && (
                <div className="chat-bubble-model p-3 flex items-center justify-center w-fit">
                    <Spinner size="4"/>
                </div>
            )}
            <div ref={chatEndRef}></div>
          </div>
           {error && <p className="text-red-400 text-xs mx-4 mb-2 bg-red-900/20 p-2 rounded border border-red-800/50">{error}</p>}
          <div className="flex items-center gap-2 border-t border-gray-700 p-3 bg-gray-900 rounded-b-lg">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Mensaje..."
              className="w-full p-3 bg-gray-700 rounded-lg border border-gray-600 focus:ring-2 focus:ring-purple-500 resize-none shadow-inner text-sm"
              rows={1}
              style={{ minHeight: '2.5rem', maxHeight: '6rem' }}
              disabled={isLoading}
            />
            <IconButton onClick={sendMessage} disabled={isLoading} tooltip="Enviar" className="bg-purple-600 hover:bg-purple-700 !p-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </IconButton>
          </div>
        </>
      )}
    </div>
  );
};

export default Assistant;
