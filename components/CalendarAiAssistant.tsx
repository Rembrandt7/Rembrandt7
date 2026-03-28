
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { useLinks } from '../contexts/LinkContext';
import { CalendarEvent, Note } from '../types';
import { loadADN } from '../services/memoriaService';
import { 
  Brain, 
  Send, 
  Loader2, 
  Sparkles, 
  Calendar as CalendarIcon,
  Clock,
  AlertTriangle,
  CheckCircle2,
  User,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import LiveAssistant from './LiveAssistant';

interface CalendarAiAssistantProps {
  onClose?: () => void;
}

const CalendarAiAssistant: React.FC<CalendarAiAssistantProps> = ({ onClose }) => {
  const { config, updateConfig, saveToSupabase } = useLinks();
  const [mode, setMode] = useState<'text' | 'voice'>('text');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; content: string; imageBase64?: string; mimeType?: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [adnData, setAdnData] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const events = config.calendarEvents || [];
  const userRoutine = config.userRoutine || 'No definida aún.';
  const workPending = config.workPending || [];
  const memoria_ia = config.memoria_ia || '';

  useEffect(() => {
    const fetchADN = async () => {
      const data = await loadADN('remy_adn_v2.3.json');
      if (data) setAdnData(data);
    };
    fetchADN();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
      const weatherData = localStorage.getItem('weatherData');
      const grokNews = config.grokEmail || 'No hay noticias de Grok recientes.';

      const systemInstruction = `
Eres el "Estratega de Carga Cognitiva y Chief of Staff" personal de Rembrandt. Tu misión es transformar su calendario en un plan de ejecución de alto rendimiento.

Identidad del Usuario:
- Nombre: Rembrandt
- Rutina Laboral Estricta (Lunes a Viernes):
  * 05:50: Salida de casa.
  * 06:30 - 08:00: Gimnasio (GYM).
  * 08:00 - 18:00: Oficina (Horario laboral central).
  * 13:00 - 14:00: Hora de comida (Único bloque libre garantizado).
  * 18:00 - 19:50: Manejo de regreso a casa (Alta carga por tráfico).

${adnData ? `\nADN del Asistente (Personalidad, Tono y Directrices Adicionales):\n${typeof adnData === 'string' ? adnData : JSON.stringify(adnData, null, 2)}\n` : ''}

CONTEXTO EXTERNO:
- Clima (Monterrey, 7 días): ${weatherData || 'No disponible'}
- Noticias Grok (X.ai): ${grokNews.substring(0, 1000)}...

Tus principios de gestión para Rembrandt:
1. Análisis de Impacto Ambiental: Utiliza el pronóstico del clima para sugerir cambios en el calendario. Por ejemplo, si va a llover, advierte sobre el tráfico pesado en Monterrey que afectará sus traslados de 18:00 a 19:50. Si hace mucho calor, sugiere hidratación extra para el GYM.
2. Protección del "Deep Work": Identifica bloques de al menos 90 minutos para tareas complejas dentro del horario de oficina (08:00-18:00).
3. Análisis de Fatiga: Rembrandt maneja casi 4 horas al día. Considera este agotamiento físico y mental al sugerir tareas nocturnas.
4. Gestión de Pendientes: Rembrandt te comentará pendientes de trabajo. Úsalos para sugerir inserciones en los bloques libres de la oficina.
5. Gestión de Pagos: Rembrandt tiene un tipo de evento "payment" para sus pagos recurrentes. Estos eventos tienen una propiedad "isPaid" (boolean), "amount" (string) y "isVariable" (boolean). Ayúdale a recordar sus pagos, a marcarlos como pagados si te lo pide y a gestionar los montos.
6. Gestión de Trabajos: Rembrandt tiene un tipo de evento "trabajo" para encargos específicos. Estos tienen:
   - jobCategory: 'trabajos mios' (por fuera), 'javer' o 'proyectos personales'.
   - isFinished: boolean.
   - finishedDate: string (fecha de finalización).
   - totalPayment: string (monto total - solo si es 'trabajos mios').
   - advancePayment: string (anticipo - solo si es 'trabajos mios').
   - deliveryDate: string (fecha de entrega).
   - isIndefinite: boolean (si no tiene fecha de entrega fija).
   Si un trabajo no se termina, se recorre automáticamente al día siguiente. Ayúdale a gestionar estos trabajos, sus pagos asociados y sus fechas de entrega.
7. Sugerencias Proactivas: Si ves que el clima o las noticias de Grok pueden beneficiar o afectar sus planes, menciónalo y ofrece soluciones. Analiza si el mal clima (lluvia fuerte, calor extremo) requiere ajustar la rutina o si las noticias de Grok mencionan algo que afecte al usuario (ej. nuevas IAs, tendencias de arquitectura) para sugerir temas de estudio.

Funciones disponibles:
- add_event: Añade un nuevo evento.
- update_event: Modifica un evento existente.
- delete_event: Elimina un evento.
- update_routine: Actualiza la rutina.
- add_pending: Añade un pendiente de trabajo. Parámetro: task (string).
- delete_pending: Elimina un pendiente. Parámetro: index (number).
- add_note: Añade una nota o producto a la lista. Parámetros: content (texto), category ('recientes', 'compras', 'trabajo', 'notas'), quantity (opcional, por defecto '1'), unit (opcional, 'pza', 'litros', 'kilos', por defecto 'pza'), startDate (opcional, para trabajo).
- add_study_topic: Añade un tema formal de estudio a la sección de Estudios. Parámetros: nombre (título del tema), descripcion (breve descripción), enlace (opcional, URL), avance (opcional, número 0-100).
- delete_note: Elimina una nota por su ID.
- generate_image: Genera una imagen basada en una descripción. Parámetro: prompt (string).
- update_ai_memory: Actualiza tu propia memoria a largo plazo (memoria_ia). Parámetro: memory (string). Úsala para información general, curiosidades o "conocimiento para la IA" que Rembrandt quiera que recuerdes pero que NO sea una tarea o nota personal.

REGLAS DE CATEGORIZACIÓN:
1. Usa 'add_note' con categoría 'trabajo' SOLO para tareas o notas relacionadas con el trabajo de Rembrandt.
2. Usa 'add_study_topic' para temas que Rembrandt está estudiando (esto aparecerá en la pestaña de Estudios).
3. Para cualquier información general (como datos sobre perros, historia, etc.) usa 'update_ai_memory'. NUNCA pongas esto en 'trabajo' o 'add_note'.

IMPORTANTE: Siempre dirígete a él como Rembrandt. Si te pide agendar algo que choca con su gimnasio o su manejo, adviértele del conflicto.

Contexto actual:
- Fecha actual: ${new Date().toLocaleDateString('es-MX')}
- Rutina: ${userRoutine}
- Memoria IA: ${memoria_ia || "Vacía"}
- Eventos: ${JSON.stringify(events)}
- Pendientes de Trabajo: ${JSON.stringify(workPending)}
`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          ...messages.map(m => ({ role: m.role, parts: [{ text: m.content }] })),
          { role: 'user', parts: [{ text: userMessage }] }
        ],
        config: {
          systemInstruction,
          tools: [{
            functionDeclarations: [
              {
                name: "add_event",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    date: { type: Type.STRING },
                    time: { type: Type.STRING },
                    description: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ['event', 'holiday', 'vacation', 'mountain', 'party', 'off', 'medical', 'birthday', 'payment', 'trabajo'] },
                    recurrence: { type: Type.STRING, enum: ['none', 'daily', 'weekly', 'monthly', 'yearly'] },
                    isPaid: { type: Type.BOOLEAN },
                    amount: { type: Type.STRING },
                    isVariable: { type: Type.BOOLEAN },
                    jobCategory: { type: Type.STRING, enum: ['trabajos mios', 'javer', 'proyectos personales'] },
                    isFinished: { type: Type.BOOLEAN },
                    totalPayment: { type: Type.STRING },
                    advancePayment: { type: Type.STRING },
                    deliveryDate: { type: Type.STRING },
                    isIndefinite: { type: Type.BOOLEAN }
                  },
                  required: ["title", "date"]
                }
              },
              {
                name: "update_event",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    title: { type: Type.STRING },
                    date: { type: Type.STRING },
                    time: { type: Type.STRING },
                    description: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ['event', 'holiday', 'vacation', 'mountain', 'party', 'off', 'medical', 'birthday', 'payment', 'trabajo'] },
                    recurrence: { type: Type.STRING, enum: ['none', 'daily', 'weekly', 'monthly', 'yearly'] },
                    isPaid: { type: Type.BOOLEAN },
                    amount: { type: Type.STRING },
                    isVariable: { type: Type.BOOLEAN },
                    jobCategory: { type: Type.STRING, enum: ['trabajos mios', 'javer', 'proyectos personales'] },
                    isFinished: { type: Type.BOOLEAN },
                    totalPayment: { type: Type.STRING },
                    advancePayment: { type: Type.STRING },
                    deliveryDate: { type: Type.STRING },
                    isIndefinite: { type: Type.BOOLEAN }
                  },
                  required: ["id"]
                }
              },
              {
                name: "delete_event",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING }
                  },
                  required: ["id"]
                }
              },
              {
                name: "update_routine",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    routine: { type: Type.STRING }
                  },
                  required: ["routine"]
                }
              },
              {
                name: "add_pending",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    task: { type: Type.STRING }
                  },
                  required: ["task"]
                }
              },
              {
                name: "delete_pending",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    index: { type: Type.NUMBER }
                  },
                  required: ["index"]
                }
              },
              {
                name: "add_note",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    content: { type: Type.STRING },
                    category: { type: Type.STRING, enum: ['recientes', 'compras', 'trabajo', 'notas'] },
                    quantity: { type: Type.STRING },
                    unit: { type: Type.STRING, enum: ['pza', 'litros', 'kilos'] },
                    startDate: { type: Type.STRING }
                  },
                  required: ["content"]
                }
              },
              {
                name: "update_ai_memory",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    memory: { type: Type.STRING, description: "Información general o conocimiento que la IA debe recordar pero que NO es una tarea o nota del usuario." }
                  },
                  required: ["memory"]
                }
              },
              {
                name: "delete_note",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING }
                  },
                  required: ["id"]
                }
              },
              {
                name: "add_study_topic",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    nombre: { type: Type.STRING },
                    descripcion: { type: Type.STRING },
                    enlace: { type: Type.STRING },
                    avance: { type: Type.NUMBER }
                  },
                  required: ["nombre", "descripcion"]
                }
              },
              {
                name: "generate_image",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    prompt: { type: Type.STRING }
                  },
                  required: ["prompt"]
                }
              }
            ]
          }]
        }
      });

      const functionCalls = response.functionCalls;
      let imageResult: { data: string; mimeType: string } | null = null;
      
      if (functionCalls) {
        let newConfig = { ...config };
        let updated = false;

        for (const call of functionCalls) {
          if (call.name === 'add_event') {
            const args = call.args as any;
            const newEv: CalendarEvent = {
              id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
              title: args.title,
              date: args.date,
              time: args.time,
              description: args.description,
              type: args.type || 'event',
              recurrence: args.recurrence || 'none',
              isPaid: args.isPaid || false,
              amount: args.amount,
              isVariable: args.isVariable || false,
              jobCategory: args.jobCategory,
              isFinished: args.isFinished || false,
              totalPayment: args.totalPayment,
              advancePayment: args.advancePayment,
              deliveryDate: args.deliveryDate,
              isIndefinite: args.isIndefinite || false,
              color: args.type === 'birthday' ? '#f59e0b' : args.type === 'medical' ? '#ef4444' : args.type === 'payment' ? '#10b981' : args.type === 'trabajo' ? '#eab308' : '#3b82f6'
            };
            newConfig.calendarEvents = [...(newConfig.calendarEvents || []), newEv];
            updated = true;
          } else if (call.name === 'update_event') {
            const args = call.args as any;
            newConfig.calendarEvents = (newConfig.calendarEvents || []).map(e => 
              e.id === args.id ? { ...e, ...args } : e
            );
            updated = true;
          } else if (call.name === 'delete_event') {
            const args = call.args as any;
            newConfig.calendarEvents = (newConfig.calendarEvents || []).filter(e => e.id !== args.id);
            updated = true;
          } else if (call.name === 'update_routine') {
            const args = call.args as any;
            newConfig.userRoutine = args.routine;
            updated = true;
          } else if (call.name === 'add_pending') {
            const args = call.args as any;
            newConfig.workPending = [...(newConfig.workPending || []), args.task];
            updated = true;
          } else if (call.name === 'delete_pending') {
            const args = call.args as any;
            newConfig.workPending = (newConfig.workPending || []).filter((_: any, i: number) => i !== args.index);
            updated = true;
          } else if (call.name === 'add_note') {
            const args = call.args as any;
            const category = args.category || 'recientes';
            const quantity = category === 'compras' ? (args.quantity || '1') : undefined;
            const unit = category === 'compras' ? (args.unit || 'pza') : undefined;
            const finalQuantity = quantity && unit ? `${quantity} ${unit}` : quantity;

            const newNote: Note = {
              id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              text: args.content,
              completed: false,
              category: category,
              quantity: finalQuantity,
              startDate: args.startDate
            };

            newConfig.notes = [...(newConfig.notes || []), newNote];
            updated = true;
          } else if (call.name === 'delete_note') {
            const args = call.args as any;
            if (Array.isArray(newConfig.notes)) {
              newConfig.notes = newConfig.notes.filter(n => n.id !== args.id);
              updated = true;
            }
          } else if (call.name === 'add_study_topic') {
            const args = call.args as any;
            const newEstudio = {
              id: Date.now().toString(),
              nombre: args.nombre,
              descripcion: args.descripcion,
              enlace: args.enlace || '',
              avance: args.avance || 0
            };
            newConfig.estudios = [...(newConfig.estudios || []), newEstudio];
            updated = true;
          } else if (call.name === 'update_ai_memory') {
            const args = call.args as any;
            newConfig.memoria_ia = args.memory;
            updated = true;
          } else if (call.name === 'generate_image') {
            const args = call.args as any;
            const imgResponse = await ai.models.generateContent({
              model: 'gemini-2.5-flash-image',
              contents: { parts: [{ text: args.prompt }] },
            });
            const part = imgResponse.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
            if (part?.inlineData) {
              imageResult = { data: part.inlineData.data, mimeType: part.inlineData.mimeType };
            }
          }
        }

        if (updated) {
          updateConfig(newConfig);
          await saveToSupabase();
        }

        // After function call, we need to get a text response from the model
        const followUp = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [
            ...messages.map(m => ({ role: m.role, parts: [{ text: m.content }] })),
            { role: 'user', parts: [{ text: userMessage }] },
            { role: 'model', parts: response.candidates[0].content.parts },
            { role: 'user', parts: [{ text: "Acción realizada con éxito. Por favor resume lo que hiciste y dame tu análisis estratégico." }] }
          ],
          config: { systemInstruction }
        });
        
        setMessages(prev => [...prev, { 
          role: 'model', 
          content: followUp.text || 'He procesado tu solicitud.',
          imageBase64: imageResult?.data,
          mimeType: imageResult?.mimeType
        }]);
      } else {
        setMessages(prev => [...prev, { role: 'model', content: response.text || 'Lo siento, no pude procesar eso.' }]);
      }
    } catch (error: any) {
      console.error('AI Error:', error);
      const errorMessage = error.status === 429 
        ? 'Lo siento Rembrandt, he excedido mi cuota de análisis por ahora. Por favor, intenta de nuevo en unos momentos.'
        : 'Hubo un error al conectar con el Estratega. Por favor intenta de nuevo.';
      setMessages(prev => [...prev, { role: 'model', content: errorMessage }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900/50 overflow-hidden relative">
      <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-900/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-600/20 rounded-lg">
            <Brain className="text-purple-400" size={20} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-100">Estratega Rembrandt</h2>
            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Chief of Staff</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex bg-gray-800 rounded-lg p-1 border border-gray-700">
            <button 
              onClick={() => setMode('text')} 
              className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${mode === 'text' ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' : 'text-gray-400 hover:text-white'}`}
            >
              TEXTO
            </button>
            <button 
              onClick={() => setMode('voice')} 
              className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${mode === 'voice' ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' : 'text-gray-400 hover:text-white'}`}
            >
              VOZ
            </button>
          </div>

          {onClose && (
            <button 
              onClick={onClose}
              className="p-2 bg-gray-800 hover:bg-red-600 text-gray-400 hover:text-white rounded-lg transition-all border border-gray-700"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {mode === 'voice' ? (
        <div className="flex-1 overflow-hidden">
          <LiveAssistant onClose={onClose} />
        </div>
      ) : (
        <>
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-700"
          >
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
            <div className="p-4 bg-purple-600/10 rounded-full">
              <Sparkles className="text-purple-400" size={32} />
            </div>
            <div>
              <p className="text-sm text-gray-300 font-medium">
                Hola, soy tu Chief of Staff.
              </p>
              <p className="text-xs text-gray-500 mt-1 max-w-[200px]">
                Puedo organizar tus eventos, proteger tu energía y optimizar tu rutina. ¿Qué tenemos para hoy?
              </p>
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {/* Work Pending Items Section */}
          {workPending.length > 0 && (
            <div className="mb-4 p-3 bg-gray-800/50 border border-gray-700 rounded-xl">
              <h4 className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Sparkles size={10} /> Pendientes de Trabajo
              </h4>
              <div className="space-y-1">
                {workPending.map((task: string, i: number) => (
                  <div key={i} className="text-xs text-gray-300 flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-purple-500" />
                    {task}
                  </div>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[90%] p-4 rounded-2xl text-base leading-relaxed ${
                m.role === 'user' 
                  ? 'bg-purple-600 text-white rounded-tr-none' 
                  : 'bg-gray-800 text-gray-200 border border-gray-700 rounded-tl-none'
              }`}>
                <div className="flex items-center gap-2 mb-1 opacity-50">
                  {m.role === 'user' ? <User size={10} /> : <Brain size={10} />}
                  <span className="text-[8px] font-bold uppercase">
                    {m.role === 'user' ? 'Tú' : 'Estratega'}
                  </span>
                </div>
                <div className="whitespace-pre-wrap">
                  {m.content}
                </div>
                {m.imageBase64 && (
                  <div className="mt-2">
                    <img 
                      src={`data:${m.mimeType};base64,${m.imageBase64}`} 
                      alt="Generada por IA" 
                      className="rounded-lg max-w-full h-auto shadow-lg"
                    />
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-gray-800 border border-gray-700 p-3 rounded-2xl rounded-tl-none flex items-center gap-2">
              <Loader2 className="animate-spin text-purple-400" size={14} />
              <span className="text-[10px] text-gray-400 font-medium">Analizando carga cognitiva...</span>
            </div>
          </motion.div>
        )}
        </div>

        <div className="p-4 bg-gray-800/30 border-t border-gray-700">
          <div className="relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Dime tus planes o rutina..."
              className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 pr-12 text-base text-white placeholder-gray-600 focus:ring-2 focus:ring-purple-500 outline-none resize-none h-24"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="absolute right-2 bottom-2 p-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg transition-all"
            >
              <Send size={16} />
            </button>
          </div>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {[
              { label: 'Analizar hoy', icon: <Clock size={10} /> },
              { label: 'Nueva rutina', icon: <User size={10} /> },
              { label: 'Planear semana', icon: <CalendarIcon size={10} /> }
            ].map((chip, i) => (
              <button
                key={i}
                onClick={() => setInput(chip.label)}
                className="flex-shrink-0 flex items-center gap-1.5 px-2 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-full text-[9px] font-bold text-gray-400 transition-colors"
              >
                {chip.icon}
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      </>
    )}
  </div>
);
};

export default CalendarAiAssistant;
