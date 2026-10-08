
import React, { useState, useRef, useEffect } from 'react';
import { Type, GenerateContentResponse } from "@google/genai";
import { generateContentWithFallback, getGeminiClient, GEMINI_MODELS, getResolvedApiKey } from '../services/geminiService';
import { useLinks } from '../contexts/LinkContext';
import { CalendarEvent, Note, CalendarToken, TokenConditionType } from '../types';
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
  X,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import LiveAssistant from './LiveAssistant';

interface CalendarAiAssistantProps {
  onClose?: () => void;
}

function normalizeDate(rawDate: string): string {
  const today = new Date();
  const currentYear = today.getFullYear();
  const todayStr = today.toISOString().split('T')[0];
  if (!rawDate) return todayStr;

  const trimmed = rawDate.trim();

  const monthsMap: Record<string, string> = {
    enero: '01', febrero: '02', marzo: '03', abril: '04',
    mayo: '05', junio: '06', julio: '07', agosto: '08',
    septiembre: '09', setiembre: '09', octubre: '10', noviembre: '11', diciembre: '12'
  };

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    let year = parseInt(isoMatch[1], 10);
    const month = isoMatch[2];
    const day = isoMatch[3];
    if (year < currentYear) {
      year = currentYear;
      const testDate = `${year}-${month}-${day}`;
      if (testDate < todayStr) {
        year = currentYear + 1;
      }
    }
    return `${year}-${month}-${day}`;
  }

  const match = trimmed.toLowerCase().match(/(\d{1,2})\s*(?:de\s*)?([a-zñ]+)(?:\s*(?:de\s*)?(\d{4}))?/i);
  if (match) {
    const day = match[1].padStart(2, '0');
    const monthName = match[2].toLowerCase();
    let year = match[3] ? parseInt(match[3], 10) : currentYear;
    if (year < currentYear) year = currentYear;
    const month = monthsMap[monthName];
    if (month) {
      let testDate = `${year}-${month}-${day}`;
      if (!match[3] && testDate < todayStr) {
        year = currentYear + 1;
        testDate = `${year}-${month}-${day}`;
      }
      return testDate;
    }
  }

  const slashMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (slashMatch) {
    const day = slashMatch[1].padStart(2, '0');
    const month = slashMatch[2].padStart(2, '0');
    let year = slashMatch[3];
    if (year.length === 2) year = `20${year}`;
    let parsedYear = parseInt(year, 10);
    if (parsedYear < currentYear) parsedYear = currentYear;
    let testDate = `${parsedYear}-${month}-${day}`;
    if (testDate < todayStr) {
      parsedYear = currentYear + 1;
      testDate = `${parsedYear}-${month}-${day}`;
    }
    return testDate;
  }

function getInPeriodVacationDays(eventsList: CalendarEvent[], resetDateStr: string = '07-21'): number {
  const now = new Date();
  const currentYear = now.getFullYear();
  let resetMonth = 6;
  let resetDay = 21;
  if (resetDateStr) {
    const parts = resetDateStr.split('-');
    if (parts.length === 2) {
      resetMonth = parseInt(parts[0], 10) - 1;
      resetDay = parseInt(parts[1], 10);
    }
  }
  const resetDateThisYear = new Date(currentYear, resetMonth, resetDay);
  const periodStart = now < resetDateThisYear 
    ? new Date(currentYear - 1, resetMonth, resetDay) 
    : new Date(currentYear, resetMonth, resetDay);
  const periodEnd = now < resetDateThisYear 
    ? new Date(currentYear, resetMonth, resetDay - 1, 23, 59, 59) 
    : new Date(currentYear + 1, resetMonth, resetDay - 1, 23, 59, 59);

  const dates = new Set(
    eventsList.filter(e => {
      if (!e) return false;
      const t = (e.title || '').toLowerCase();
      const d = (e.description || '').toLowerCase();
      if (t.includes('solicitar') || d.includes('solicitar')) return false;
      if (e.type !== 'vacation' && !t.includes('vacacion') && !d.includes('vacacion')) return false;
      const eventDate = new Date(e.date + 'T00:00:00');
      return eventDate >= periodStart && eventDate <= periodEnd;
    }).map(e => e.date)
  );
  return dates.size;
}

function tryLocalFallback(userMessage: string): { event?: CalendarEvent; description?: string } | null {
  const lower = userMessage.toLowerCase();
  const isBirthday = lower.includes('cumpleaños') || lower.includes('cumple');
  const isAddEvent = lower.includes('agrega') || lower.includes('añadir') || lower.includes('añade') || lower.includes('agenda') || lower.includes('guarda') || lower.includes('crea');

  if (isBirthday || isAddEvent) {
    const dateStr = normalizeDate(userMessage);
    if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      let title = userMessage;
      title = title.replace(/^(?:puedes\s+)?(?:por\s+favor\s+)?(?:agrega(?:r)?|añade|añadir|agenda(?:r)?|crea(?:r)?)\s+(?:un\s+|el\s+)?/i, '');
      title = title.replace(/\s+(?:el\s+)?(?:\d{1,2}\s+(?:de\s+)?[a-zñ]+(?:\s+(?:de\s+)?\d{4})?|\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)/i, '');
      title = title.trim();
      if (!title || title.length < 2) {
        title = isBirthday ? 'Cumpleaños' : 'Nuevo evento';
      } else {
        title = title.charAt(0).toUpperCase() + title.slice(1);
      }

      const eventType = isBirthday ? 'birthday' : 'event';
      const newEv: CalendarEvent = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        title,
        date: dateStr,
        type: eventType,
        recurrence: isBirthday ? 'yearly' : 'none',
        color: isBirthday ? '#f59e0b' : '#3b82f6'
      };

      return {
        event: newEv,
        description: `📅 Evento añadido: "${title}" el ${dateStr}.`
      };
    }
  }
  return null;
}

const CalendarAiAssistant: React.FC<CalendarAiAssistantProps> = ({ onClose }) => {
  const { config, updateConfig, saveToSupabase, googleApiConfig } = useLinks();
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
  const effectiveApiKey = googleApiConfig?.apiKey || getResolvedApiKey();

  useEffect(() => {
    const fetchADN = async () => {
      const data = await loadADN('remy_adn_v2.3.json');
      if (data) setAdnData(data);
    };
    fetchADN();
  }, []);

  // Proactive strategic greeting
  useEffect(() => {
    if (messages.length === 0 && effectiveApiKey) {
      const triggerInitialAnalysis = async () => {
        // We don't want to show the internal prompt to the user
        const internalPrompt = "Hola. Por favor analiza mi calendario, pendientes de trabajo, pagos y el clima. Dame un resumen estratégico de mis prioridades para hoy. Si no hay nada urgente, dame el clima detallado y un consejo de estudio basado en mis intereses.";
        
        setIsLoading(true);
        try {
          await performAiRequest(internalPrompt, true);
        } catch (error) {
          console.error("Error generating initial analysis:", error);
        } finally {
          setIsLoading(false);
        }
      };
      
      // Delay slightly to allow ADN data to load if possible
      const timer = setTimeout(triggerInitialAnalysis, 1000);
      return () => clearTimeout(timer);
    }
  }, [effectiveApiKey]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const performAiRequest = async (userMessage: string, isAutoGenerated: boolean = false) => {
    if (!isAutoGenerated) {
      setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    }
    
    setIsLoading(true);

    try {
      const apiKey = effectiveApiKey;
      if (!apiKey) {
        setMessages(prev => [...prev, { 
          role: 'model', 
          content: '⚠️ No se ha detectado una API Key de Gemini configurada. Por favor ve al panel de configuración de Google APIs o asegúrate de que esté configurada en Ajustes.' 
        }]);
        return;
      }
      const ai = getGeminiClient(apiKey);
      
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
1. Análisis de Impacto Ambiental: Utiliza el pronóstico del clima para sugerir cambios en el calendario. Por ejemplo, si va a llover, advierte sobre el tráfico pesado en Monterrey que afectará sus traslados de 18:00 a 19:50. Si hace mucho calor, sugiere optimizar el horario del GYM o actividades al aire libre.
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
7. Sugerencias Proactivas y Jerarquía de Mensajes: 
   Tu prioridad número 1 es siempre recordar a Rembrandt sus tareas pendientes del calendario, trabajos sin terminar y pagos próximos o vencidos.
   Si NO hay tareas o pagos urgentes para hoy o mañana, tu prioridad número 2 es informar sobre el clima y cómo afectará su rutina (tráfico, GYM, etc.).
   Si todo está en orden y el día está tranquilo, tu prioridad número 3 es dar un consejo de estudio útil basado en sus temas de estudio actuales o sugerir temas nuevos basados en tendencias (Grok).
   Evita mensajes banales o genéricos. Sé específico con sus datos.
8. Gestión Proactiva: Si ves que el clima o las noticias de Grok pueden beneficiar o afectar sus planes, menciónalo y ofrece soluciones. Analiza si el mal clima (lluvia fuerte, calor extremo) requiere ajustar la rutina.
9. Gestión de Vacaciones:
   - Rembrandt puede pedirte que consultes, configures o agregues días de vacaciones.
   - Para AGENDAR o PROGRAMAR días de vacaciones en el calendario, USA OBLIGATORIAMENTE 'add_vacation' (o 'add_event' con type: 'vacation'). Puedes agendar un solo día o un rango (ej. startDate: '2026-11-10', endDate: '2026-11-14').
   - Estos días aparecen en verde (#10b981) y se descuentan de forma automática del total disponible de vacaciones.
   - Si Rembrandt solo te dice cuántos días le quedan (ej: "actualmente me quedan 22 días de vacaciones" o "pon que tengo 22 días"), usa 'set_vacation_days'.
   - Puedes mover días de vacaciones usando 'move_vacation'.
10. Tokens del Calendario y Condicionantes:
   - Rembrandt utiliza tokens cíclicos o recurrentes (ej: 'cargar carro').
   - Puedes agregar tokens con 'add_token', moverlos de fecha con 'move_token', o marcarlos como completados con 'complete_token'.
   - Los tokens soportan CONDICIONANTES ('conditionType'):
     * 'none': Se repite según los días de intervalo.
     * 'workdays_only': Solo en días hábiles (Lunes a Viernes o Sábados laborales). Si cae en fin de semana/descanso, se ajusta al siguiente día hábil.
     * 'offdays_only': Solo en días libres (fines de semana / descanso).
     * 'one_day_before': Un día antes de un evento específico o vacaciones (usa 'conditionTarget' para el nombre/tipo de evento).
     * 'payday_only': Solo en días de quincena (15 y fin de mes).
11. Regla de Oro para el Token del Carro ('cargar carro'):
   - ¡LOS TOKENS DEL CARRO NUNCA QUEDAN EN EL PASADO! Siempre deben mantenerse en el presente (hoy) o en el futuro.
   - Si Rembrandt te dice "ya cargué el carro", "ya recargué", "listo el carro" o similar, llama INMEDIATAMENTE a 'complete_token' con tokenNameOrId: 'cargar carro'.
   - Esto avanzará la fecha al próximo ciclo en el futuro y se grabará automáticamente en el sistema y en la nube para no volver a preguntarle.

Funciones disponibles:
- add_vacation: Programa y agenda uno o varios días de vacaciones en el calendario (tipo 'vacation', color verde #10b981) y los descuenta del saldo disponible. Parámetros: startDate (YYYY-MM-DD), endDate (opcional, YYYY-MM-DD), title (opcional), description (opcional).
- add_event: Añade un nuevo evento.
- update_event: Modifica un evento existente.
- delete_event: Elimina un evento.
- update_routine: Actualiza la rutina.
- add_pending: Añade un pendiente de trabajo. Parámetro: task (string).
- delete_pending: Elimina un pendiente. Parámetro: index (number).
- add_note: Añade una nota o producto a la lista.
- add_study_topic: Añade un tema formal de estudio a la sección de Estudios.
- delete_note: Elimina una nota por su ID.
- generate_image: Genera una imagen basada en una descripción.
- update_ai_memory: Actualiza la memoria a largo plazo.
- set_vacation_days: Establece/actualiza los días disponibles de vacaciones restantes de Rembrandt (ej: 22). Parámetros: availableDays (number), totalDays (opcional, number).
- move_vacation: Mueve un día de vacaciones a otra fecha. Parámetros: fromDate (YYYY-MM-DD), toDate (YYYY-MM-DD).
- add_token: Crea un nuevo token recurrente. Parámetros: name (string), intervalDays (number), startDate (YYYY-MM-DD), reminderTime (opcional, '20:00'), conditionType ('none' | 'workdays_only' | 'offdays_only' | 'one_day_before' | 'payday_only'), conditionTarget (opcional).
- move_token: Mueve la fecha de un token. Parámetros: tokenNameOrId (string), newDate (YYYY-MM-DD).
- complete_token: Marca un token como realizado/cargado (ej. carro) avanzando su fecha a futuro y grabando automáticamente. Parámetro: tokenNameOrId (string).
- update_token: Modifica un token existente. Parámetros: tokenNameOrId (string), intervalDays (opcional), conditionType (opcional), conditionTarget (opcional).

REGLAS DE CATEGORIZACIÓN:
1. Usa 'add_note' con categoría 'trabajo' SOLO para tareas o notas relacionadas con el trabajo de Rembrandt.
2. Usa 'add_study_topic' para temas que Rembrandt está estudiando (esto aparecerá en la pestaña de Estudios).
3. Para cualquier información general (como datos sobre perros, historia, etc.) usa 'update_ai_memory'. NUNCA pongas esto en 'trabajo' o 'add_note'.

IMPORTANTE: Siempre dirígete a él como Rembrandt. Si te pide agendar algo que choca con su gimnasio o su manejo, adviértele del conflicto.

FECHA ACTUAL Y REGLAS TEMPORALES DEL SISTEMA:
- Fecha de hoy: ${new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} (Formato ISO: ${new Date().toISOString().split('T')[0]})
- AÑO ACTUAL: ${new Date().getFullYear()}
⚠️ REGLAS TEMPORALES ESTRICTAS:
1. ESTAMOS EN EL AÑO ${new Date().getFullYear()}. ¡NUNCA agendes ni menciones fechas en años anteriores (como 2023, 2024, 2025)!
2. ¡NUNCA agendes eventos o vacaciones en el PASADO! Todas las fechas que programes DEBEN ser hoy (${new Date().toISOString().split('T')[0]}) o en el futuro.
3. Si el usuario pide agendar algo para un día o mes sin especificar año (ej: "el 12 de noviembre"), asume el año ${new Date().getFullYear()} (o ${new Date().getFullYear() + 1} si el mes ya pasó este año).

Contexto actual:
- Rutina: ${userRoutine}
- Memoria IA (Contexto Híbrido):
    ${config.memoria_ia?.perfil ? `* Perfil: ${config.memoria_ia.perfil}` : ''}
    ${config.memoria_ia?.laboral ? `* Laboral: ${config.memoria_ia.laboral}` : ''}
    ${config.memoria_ia?.personal ? `* Personal: ${config.memoria_ia.personal}` : ''}
- Eventos: ${JSON.stringify((events || []).slice(-50).map(e => ({ title: e.title, date: e.date, time: e.time, type: e.type })))}
- Tokens del Calendario: ${JSON.stringify(config.calendarTokens || [])}
- Vacaciones Configuradas: ${JSON.stringify(config.vacationConfig || {})}
- Pendientes de Trabajo: ${JSON.stringify(workPending)}
`;

      // Prepare sanitized history for Gemini (must start with 'user' and alternate roles)
      const validMessages = messages.filter(m => 
        m.content && 
        !m.content.startsWith('Hubo un error') && 
        !m.content.startsWith('⚠️') &&
        !m.content.toLowerCase().includes('excedido la cuota') &&
        !m.content.toLowerCase().includes('límite de cuota') &&
        !m.content.toLowerCase().includes('error al conectar') &&
        !m.content.toLowerCase().includes('hubo un detalle')
      );
      
      const contents: any[] = [];
      for (const m of validMessages) {
        if (contents.length === 0 && m.role === 'model') {
          contents.push({ role: 'user', parts: [{ text: 'Hola Estratega' }] });
        }
        const lastTurn = contents[contents.length - 1];
        if (lastTurn && lastTurn.role === m.role) {
          lastTurn.parts.push({ text: m.content });
        } else {
          contents.push({ role: m.role, parts: [{ text: m.content }] });
        }
      }
      
      if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
        contents[contents.length - 1].parts.push({ text: userMessage });
      } else {
        contents.push({ role: 'user', parts: [{ text: userMessage }] });
      }

      const response = await generateContentWithFallback({
        model: GEMINI_MODELS.PRIMARY,
        contents,
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
                    date: { 
                      type: Type.STRING, 
                      description: "Fecha del evento en formato AAAA-MM-DD (ej: 2026-08-19). Si el usuario no menciona el año, asume el año 2026." 
                    },
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
              },
              {
                name: "add_vacation",
                description: "Programa y agenda uno o varios días de vacaciones en el calendario de Rembrandt, descontándolos de su saldo disponible de vacaciones.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    startDate: { type: Type.STRING, description: "Fecha de inicio o día único en formato YYYY-MM-DD" },
                    endDate: { type: Type.STRING, description: "Fecha de fin en formato YYYY-MM-DD (opcional si es solo un día)" },
                    title: { type: Type.STRING, description: "Título de la vacación (opcional, por defecto 'Vacaciones')" },
                    description: { type: Type.STRING, description: "Notas o detalles de las vacaciones (opcional)" }
                  },
                  required: ["startDate"]
                }
              },
              {
                name: "set_vacation_days",
                description: "Actualiza los días disponibles de vacaciones restantes de Rembrandt (ej. 22 días disponibles).",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    availableDays: { type: Type.NUMBER, description: "Número de días disponibles restantes" },
                    totalDays: { type: Type.NUMBER, description: "Total de días del periodo (opcional)" }
                  },
                  required: ["availableDays"]
                }
              },
              {
                name: "move_vacation",
                description: "Mueve un día de vacaciones de una fecha a otra.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    fromDate: { type: Type.STRING, description: "Fecha actual en formato YYYY-MM-DD" },
                    toDate: { type: Type.STRING, description: "Nueva fecha en formato YYYY-MM-DD" }
                  },
                  required: ["fromDate", "toDate"]
                }
              },
              {
                name: "add_token",
                description: "Crea un nuevo token recurrente en el calendario con condicionantes de fecha.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING, description: "Nombre del token (ej: Cargar Carro)" },
                    intervalDays: { type: Type.NUMBER, description: "Intervalo de repetición en días (ej: 3)" },
                    startDate: { type: Type.STRING, description: "Fecha de inicio en formato YYYY-MM-DD" },
                    reminderTime: { type: Type.STRING, description: "Hora del recordatorio (ej: '20:00')" },
                    conditionType: { 
                      type: Type.STRING, 
                      enum: ['none', 'workdays_only', 'offdays_only', 'one_day_before', 'payday_only'],
                      description: "Condición: workdays_only (solo días hábiles), offdays_only (solo libres), one_day_before (un día antes de evento), payday_only (quincenas)" 
                    },
                    conditionTarget: { type: Type.STRING, description: "Nombre o tipo del evento para la condición (ej: 'vacaciones')" },
                    symbol: { type: Type.STRING, description: "Icono: Zap, Clock, CheckCircle2, Brain, etc." },
                    color: { type: Type.STRING, description: "Color hex (ej: #f59e0b)" }
                  },
                  required: ["name", "intervalDays"]
                }
              },
              {
                name: "move_token",
                description: "Mueve o reprograma la fecha de un token.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    tokenNameOrId: { type: Type.STRING, description: "Nombre o ID del token a mover (ej: 'cargar carro')" },
                    newDate: { type: Type.STRING, description: "Nueva fecha en formato YYYY-MM-DD" }
                  },
                  required: ["tokenNameOrId", "newDate"]
                }
              },
              {
                name: "complete_token",
                description: "Marca un token (como cargar carro) como realizado/recargado, avanzando la fecha al próximo ciclo futuro y guardando automáticamente para que no vuelva a preguntar.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    tokenNameOrId: { type: Type.STRING, description: "Nombre o ID del token (ej: 'cargar carro')" }
                  },
                  required: ["tokenNameOrId"]
                }
              },
              {
                name: "update_token",
                description: "Modifica propiedades de un token existente.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    tokenNameOrId: { type: Type.STRING, description: "Nombre o ID del token" },
                    intervalDays: { type: Type.NUMBER },
                    conditionType: { type: Type.STRING, enum: ['none', 'workdays_only', 'offdays_only', 'one_day_before', 'payday_only'] },
                    conditionTarget: { type: Type.STRING },
                    reminderTime: { type: Type.STRING }
                  },
                  required: ["tokenNameOrId"]
                }
              }
            ]
          }]
        }
      }, { apiKey });

      const functionCalls = response.functionCalls;
      let imageResult: { data: string; mimeType: string } | null = null;
      
      if (functionCalls && functionCalls.length > 0) {
        let newConfig = { ...config };
        let updated = false;
        const executedDescriptions: string[] = [];

        for (const call of functionCalls) {
          if (call.name === 'add_vacation') {
            const args = call.args as any;
            const startDate = normalizeDate(args.startDate);
            const endDate = args.endDate ? normalizeDate(args.endDate) : startDate;
            const title = args.title || 'Vacaciones';
            const description = args.description || '';

            const d = new Date(startDate + 'T00:00:00');
            const endD = new Date(endDate + 'T00:00:00');
            const currentEvents = newConfig.calendarEvents || [];
            const newVacEvents: CalendarEvent[] = [];

            while (d <= endD) {
              const curStr = d.toISOString().split('T')[0];
              const exists = currentEvents.some(e => e.date === curStr && (e.type === 'vacation' || (e.title || '').toLowerCase().includes('vacacion')));
              if (!exists) {
                newVacEvents.push({
                  id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                  title: title,
                  date: curStr,
                  type: 'vacation',
                  color: '#10b981',
                  description: description,
                  recurrence: 'none'
                });
              }
              d.setDate(d.getDate() + 1);
            }

            if (newVacEvents.length > 0) {
              newConfig.calendarEvents = [...currentEvents, ...newVacEvents];
              const vacConf = newConfig.vacationConfig || { initialDays: 26, daysAfterReset: 26, resetDate: '07-21' };
              const currentTotal = vacConf.totalDays || 26;
              newConfig.vacationConfig = {
                ...vacConf,
                totalDays: currentTotal,
                initialDays: currentTotal,
                daysAfterReset: currentTotal
              };
              executedDescriptions.push(`🌴 ${newVacEvents.length} día(s) de vacaciones agendado(s) (${startDate}${endDate !== startDate ? ' al ' + endDate : ''}) en verde. Saldo restante actualizado.`);
              updated = true;
            } else {
              executedDescriptions.push(`⚠️ Los días indicados ya estaban agendados como vacaciones.`);
            }
          } else if (call.name === 'add_event') {
            const args = call.args as any;
            const validDate = normalizeDate(args.date);
            const isVac = args.type === 'vacation' || (args.title || '').toLowerCase().includes('vacacion');
            const newEv: CalendarEvent = {
              id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
              title: args.title,
              date: validDate,
              time: args.time,
              description: args.description,
              type: isVac ? 'vacation' : (args.type || 'event'),
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
              color: isVac ? '#10b981' : args.type === 'birthday' ? '#f59e0b' : args.type === 'medical' ? '#ef4444' : args.type === 'payment' ? '#10b981' : args.type === 'trabajo' ? '#eab308' : '#3b82f6'
            };
            newConfig.calendarEvents = [...(newConfig.calendarEvents || []), newEv];
            if (isVac) {
              const vacConf = newConfig.vacationConfig || { initialDays: 26, daysAfterReset: 26, resetDate: '07-21' };
              const currentTotal = vacConf.totalDays || 26;
              newConfig.vacationConfig = {
                ...vacConf,
                totalDays: currentTotal,
                initialDays: currentTotal,
                daysAfterReset: currentTotal
              };
            }
            executedDescriptions.push(`📅 Evento añadido: "${args.title}" el ${validDate}${args.time ? ' a las ' + args.time : ''}.`);
            updated = true;
          } else if (call.name === 'update_event') {
            const args = call.args as any;
            newConfig.calendarEvents = (newConfig.calendarEvents || []).map(e => 
              e.id === args.id ? { ...e, ...args } : e
            );
            executedDescriptions.push(`✏️ Evento actualizado.`);
            updated = true;
          } else if (call.name === 'delete_event') {
            const args = call.args as any;
            newConfig.calendarEvents = (newConfig.calendarEvents || []).filter(e => e.id !== args.id);
            executedDescriptions.push(`🗑️ Evento eliminado.`);
            updated = true;
          } else if (call.name === 'update_routine') {
            const args = call.args as any;
            newConfig.userRoutine = args.routine;
            executedDescriptions.push(`⏰ Rutina actualizada.`);
            updated = true;
          } else if (call.name === 'add_pending') {
            const args = call.args as any;
            newConfig.workPending = [...(newConfig.workPending || []), args.task];
            executedDescriptions.push(`📌 Pendiente agregado: "${args.task}".`);
            updated = true;
          } else if (call.name === 'delete_pending') {
            const args = call.args as any;
            newConfig.workPending = (newConfig.workPending || []).filter((_: any, i: number) => i !== args.index);
            executedDescriptions.push(`✅ Pendiente completado/eliminado.`);
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
            executedDescriptions.push(`📝 Nota agregada: "${args.content}".`);
            updated = true;
          } else if (call.name === 'delete_note') {
            const args = call.args as any;
            if (Array.isArray(newConfig.notes)) {
              newConfig.notes = newConfig.notes.filter(n => n.id !== args.id);
              executedDescriptions.push(`🗑️ Nota eliminada.`);
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
            executedDescriptions.push(`📚 Tema de estudio agregado: "${args.nombre}".`);
            updated = true;
          } else if (call.name === 'update_ai_memory') {
            const args = call.args as any;
            if (typeof newConfig.memoria_ia === 'object' && newConfig.memoria_ia !== null) {
              newConfig.memoria_ia = {
                ...newConfig.memoria_ia,
                personal: (newConfig.memoria_ia.personal ? newConfig.memoria_ia.personal + '\n' : '') + args.memory
              };
            } else {
              newConfig.memoria_ia = { perfil: '', estilo: '', laboral: '', personal: args.memory };
            }
            executedDescriptions.push(`🧠 Memoria IA actualizada.`);
            updated = true;
          } else if (call.name === 'generate_image') {
            const args = call.args as any;
            try {
              const imgResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [{ text: args.prompt }] },
              });
              const part = imgResponse.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
              if (part?.inlineData) {
                imageResult = { data: part.inlineData.data, mimeType: part.inlineData.mimeType };
              }
            } catch (imgErr) {
              console.warn("Error generando imagen con Gemini:", imgErr);
            }
          } else if (call.name === 'set_vacation_days') {
            const args = call.args as any;
            const availableDays = Number(args.availableDays) || 0;
            const currentEvents = newConfig.calendarEvents || [];
            const vacConf = newConfig.vacationConfig || { initialDays: 26, daysAfterReset: 26, resetDate: '07-21' };
            const totalDays = 26; // Fijo e inmutable en 26
            newConfig.vacationConfig = {
              ...vacConf,
              availableDays: availableDays,
              totalDays: 26,
              initialDays: 26,
              daysAfterReset: 26
            };
            executedDescriptions.push(`🌴 Días de vacaciones actualizados: ${availableDays} días disponibles (26 totales inmutables).`);
            updated = true;
          } else if (call.name === 'move_vacation') {
            const args = call.args as any;
            const fromDate = normalizeDate(args.fromDate);
            const toDate = normalizeDate(args.toDate);
            const currentEvents = newConfig.calendarEvents || [];
            let moved = false;
            newConfig.calendarEvents = currentEvents.map(e => {
              const t = (e.title || '').toLowerCase();
              const isVac = e.type === 'vacation' || t.includes('vacacion');
              if (!moved && isVac && e.date === fromDate) {
                moved = true;
                return { ...e, date: toDate };
              }
              return e;
            });
            if (moved) {
              executedDescriptions.push(`🌴 Día de vacaciones movido de ${fromDate} a ${toDate}.`);
              updated = true;
            } else {
              executedDescriptions.push(`⚠️ No se encontró vacación en la fecha ${fromDate} para mover.`);
            }
          } else if (call.name === 'add_token') {
            const args = call.args as any;
            const startDate = normalizeDate(args.startDate || new Date().toISOString().split('T')[0]);
            const tokenName = args.name || 'Nuevo Token';
            const intervalDays = Number(args.intervalDays) || 3;
            const conditionType = args.conditionType || 'none';
            const conditionTarget = args.conditionTarget || '';
            const reminderTime = args.reminderTime || '20:00';
            const reminderMinutes = args.reminderMinutes !== undefined ? Number(args.reminderMinutes) : 30;
            const symbol = args.symbol || 'Zap';
            const color = args.color || '#f59e0b';

            const newToken: CalendarToken = {
              id: Date.now().toString(),
              name: tokenName,
              symbol,
              intervalDays,
              startDate,
              currentActiveDate: startDate,
              color,
              reminderMinutes,
              reminderTime,
              conditionType,
              conditionTarget,
              isCompleted: false
            };

            newConfig.calendarTokens = [...(newConfig.calendarTokens || []), newToken];
            executedDescriptions.push(`⚡ Token "${tokenName}" agregado (cada ${intervalDays} días${conditionType !== 'none' ? ` con condición: ${conditionType}` : ''}).`);
            updated = true;
          } else if (call.name === 'move_token') {
            const args = call.args as any;
            const targetQuery = (args.tokenNameOrId || '').toLowerCase().trim();
            const newDate = normalizeDate(args.newDate);
            let movedTokenName = '';

            newConfig.calendarTokens = (newConfig.calendarTokens || []).map((t: CalendarToken) => {
              if (t.id === targetQuery || t.name.toLowerCase().includes(targetQuery)) {
                movedTokenName = t.name;
                return { ...t, currentActiveDate: newDate, isCompleted: false };
              }
              return t;
            });

            if (movedTokenName) {
              executedDescriptions.push(`⚡ Token "${movedTokenName}" movido a la fecha ${newDate}.`);
              updated = true;
            } else {
              executedDescriptions.push(`⚠️ No se encontró el token "${targetQuery}" para mover.`);
            }
          } else if (call.name === 'complete_token') {
            const args = call.args as any;
            const targetQuery = (args.tokenNameOrId || 'carro').toLowerCase().trim();
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const curTodayStr = today.toISOString().split('T')[0];
            let completedName = '';

            newConfig.calendarTokens = (newConfig.calendarTokens || []).map((t: CalendarToken) => {
              if (t.id === targetQuery || t.name.toLowerCase().includes(targetQuery)) {
                completedName = t.name;
                const nextDate = new Date(today.getTime());
                nextDate.setDate(nextDate.getDate() + (t.intervalDays || 3));
                const nextDateStr = nextDate.toISOString().split('T')[0];

                try {
                  localStorage.setItem(`token_completed_${t.id}`, curTodayStr);
                  localStorage.removeItem(`token_snoozed_${t.id}`);
                } catch (_) {}

                return {
                  ...t,
                  currentActiveDate: nextDateStr,
                  lastCompletedDate: curTodayStr,
                  isCompleted: true,
                  snoozedUntil: undefined
                };
              }
              return t;
            });

            if (completedName) {
              executedDescriptions.push(`✅ ¡Excelente! El token "${completedName}" se marcó como completado hoy y se reprogramó para su próxima fecha en el futuro. Grabado automáticamente.`);
              updated = true;
            } else {
              executedDescriptions.push(`⚠️ No se encontró ningún token que coincida con "${targetQuery}".`);
            }
          } else if (call.name === 'update_token') {
            const args = call.args as any;
            const targetQuery = (args.tokenNameOrId || '').toLowerCase().trim();
            newConfig.calendarTokens = (newConfig.calendarTokens || []).map((t: CalendarToken) => {
              if (t.id === targetQuery || t.name.toLowerCase().includes(targetQuery)) {
                return {
                  ...t,
                  ...(args.intervalDays ? { intervalDays: Number(args.intervalDays) } : {}),
                  ...(args.conditionType ? { conditionType: args.conditionType } : {}),
                  ...(args.conditionTarget !== undefined ? { conditionTarget: args.conditionTarget } : {}),
                  ...(args.reminderTime ? { reminderTime: args.reminderTime } : {})
                };
              }
              return t;
            });
            executedDescriptions.push(`⚡ Token actualizado.`);
            updated = true;
          }
        }

        if (updated) {
          updateConfig(newConfig);
          saveToSupabase(newConfig, { showToast: false, immediate: true }).catch(sbErr => 
            console.warn("Supabase background save notice:", sbErr)
          );
          try {
            fetch('/api/config/save-local', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(newConfig)
            }).catch(() => {});
          } catch (_) {}
        }

        // Generate follow up response explaining what was done and providing strategic analysis
        let followUpText = '';
        try {
          const functionResponses = functionCalls.map(call => ({
            functionResponse: {
              name: call.name,
              id: (call as any).id,
              response: { result: "success", executed: true }
            }
          }));

          const followUp = await generateContentWithFallback({
            model: GEMINI_MODELS.PRIMARY,
            contents: [
              ...contents,
              { role: 'model', parts: response.candidates?.[0]?.content?.parts || [] },
              { role: 'user', parts: functionResponses }
            ],
            config: { systemInstruction }
          }, { apiKey });

          followUpText = followUp.text || '';
        } catch (followUpErr) {
          console.warn("Follow-up generation notice, using structured fallback:", followUpErr);
        }

        const fallbackSummary = executedDescriptions.length > 0 
          ? `Listo Rembrandt. He realizado las siguientes acciones:\n\n${executedDescriptions.join('\n')}\n\n¿Deseas que analicemos o agendemos algo más?` 
          : 'He procesado tu solicitud exitosamente.';

        setMessages(prev => [...prev, { 
          role: 'model', 
          content: followUpText || fallbackSummary,
          imageBase64: imageResult?.data,
          mimeType: imageResult?.mimeType
        }]);
      } else {
        setMessages(prev => [...prev, { role: 'model', content: response.text || 'Lo siento, no pude procesar eso.' }]);
      }
    } catch (error: any) {
      console.error('AI Error:', error);

      // Attempt smart local fallback if user was asking to add an event or note
      const fallbackResult = tryLocalFallback(userMessage);
      if (fallbackResult?.event) {
        const newEv = fallbackResult.event;
        const newConfig = {
          ...config,
          calendarEvents: [...(config.calendarEvents || []), newEv]
        };
        updateConfig(newConfig);
        saveToSupabase(newConfig, { showToast: false, immediate: true }).catch(err => 
          console.warn("Error guardando fallback en Supabase:", err)
        );

        setMessages(prev => [...prev, {
          role: 'model',
          content: `Listo Rembrandt. He procesado tu solicitud de forma local:\n\n${fallbackResult.description}\n\n*(Nota: Conexión con IA restableciéndose).*`
        }]);
        return;
      }

      const isQuota = error?.status === 429 || error?.message?.includes('429') || error?.message?.toLowerCase().includes('quota') || error?.message?.includes('RESOURCE_EXHAUSTED');
      const errorMessage = isQuota 
        ? 'Lo siento Rembrandt, he excedido la cuota de consultas de Gemini por ahora. Las claves gratuitas tienen un límite por minuto. Por favor, intenta de nuevo en unos momentos.'
        : `Hubo un detalle al conectar con el Estratega (${error?.message || 'Error de conexión'}). Por favor intenta de nuevo.`;
      setMessages(prev => [...prev, { role: 'model', content: errorMessage }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage = input.trim();
    setInput('');
    await performAiRequest(userMessage);
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

          <button
            onClick={() => {
              setMessages([]);
              performAiRequest("Hola. Por favor analiza mi calendario, pendientes de trabajo, pagos y el clima. Dame un resumen estratégico de mis prioridades para hoy.", true);
            }}
            className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-purple-400 rounded-lg transition-all border border-gray-700"
            title="Reiniciar conversación y actualizar análisis"
          >
            <RotateCcw size={15} />
          </button>

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
        {messages.length === 0 && isLoading && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
            <div className="p-4 bg-purple-600/10 rounded-full animate-pulse">
              <Brain className="text-purple-400" size={32} />
            </div>
            <div>
              <p className="text-sm text-gray-300 font-medium italic">
                Generando análisis estratégico proactivo...
              </p>
              <p className="text-[10px] text-gray-500 mt-2">
                Revisando calendario, pendientes, pagos y clima de Monterrey.
              </p>
            </div>
          </div>
        )}

        {messages.length === 0 && !isLoading && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
            <div className="p-4 bg-purple-600/10 rounded-full">
              <Sparkles className="text-purple-400" size={32} />
            </div>
            <div>
              <p className="text-sm text-gray-300 font-medium">
                Hola, soy tu Chief of Staff.
              </p>
              <p className="text-xs text-gray-500 mt-1 max-w-[200px]">
                Presiona el botón "Analizar hoy" o escribe algo para comenzar tu planeación de alto rendimiento.
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
