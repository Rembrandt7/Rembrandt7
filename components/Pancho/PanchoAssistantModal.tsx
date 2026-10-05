import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Type, GenerateContentResponse } from "@google/genai";
import { generateContentWithFallback, getGeminiClient, GEMINI_MODELS, getResolvedApiKey } from '../../services/geminiService';
import { useLinks } from '../../contexts/LinkContext';
import { CalendarEvent, Note, LinkItem, CalendarToken, TokenConditionType } from '../../types';
import { loadADN } from '../../services/memoriaService';
import { supabase } from '../../services/supabaseClient';
import { 
  Send, 
  Loader2, 
  Sparkles, 
  Calendar as CalendarIcon,
  Clock,
  AlertTriangle,
  CheckCircle2,
  X,
  RotateCcw,
  Copy,
  ExternalLink,
  Mail,
  Box,
  Wrench,
  Utensils,
  DollarSign,
  Mic,
  MessageSquare,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { PanchoRobotAvatar, PanchoState } from './PanchoRobotAvatar';
import { getPanchoRole } from './PanchoFloatingButton';
import LiveAssistant from '../LiveAssistant';

export interface PanchoAssistantModalProps {
  onClose: () => void;
  activeTabId: string;
  setActiveTabId?: (tabId: string) => void;
  panchoState: PanchoState;
  setPanchoState: (state: PanchoState) => void;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  cardType?: 'event' | 'email' | 'tool' | '3d' | 'nutrition' | 'finance' | 'note';
  cardData?: any;
  timestamp: number;
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

  return trimmed;
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

const REFERENCE_OFF_SATURDAY = new Date('2026-03-07T00:00:00');

function getDayStatus(date: Date, eventsList: CalendarEvent[]): 'work' | 'off' | 'vacation' | 'off-custom' {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const dateStr = `${y}-${m}-${d}`;
  
  const isVacation = eventsList.some(e => {
    if (e.date !== dateStr) return false;
    const t = (e.title || '').toLowerCase();
    const desc = (e.description || '').toLowerCase();
    if (t.includes('solicitar') || desc.includes('solicitar')) return false;
    return e.type === 'vacation' || t.includes('vacacion');
  });
  if (isVacation) return 'vacation';

  const customOff = eventsList.find(e => e.date === dateStr && (e.type === 'holiday' || e.type === 'off'));
  if (customOff) return 'off-custom';

  const day = date.getDay();
  if (day === 0) return 'off';
  if (day >= 1 && day <= 5) return 'work';
  if (day === 6) {
    const diffTime = date.getTime() - REFERENCE_OFF_SATURDAY.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    const diffWeeks = Math.round(diffDays / 7);
    return diffWeeks % 2 === 0 ? 'off' : 'work';
  }
  return 'work';
}

function adjustDateForTokenConditions(
  baseDate: Date,
  conditionType?: TokenConditionType,
  conditionTarget?: string,
  currentEvents: CalendarEvent[] = []
): Date {
  const result = new Date(baseDate);
  result.setHours(0, 0, 0, 0);

  if (!conditionType || conditionType === 'none') {
    return result;
  }

  if (conditionType === 'workdays_only') {
    let count = 0;
    while (count < 30) {
      const status = getDayStatus(result, currentEvents);
      const day = result.getDay();
      if (status === 'work' && day !== 0) {
        break;
      }
      result.setDate(result.getDate() + 1);
      count++;
    }
    return result;
  }

  if (conditionType === 'offdays_only') {
    let count = 0;
    while (count < 30) {
      const status = getDayStatus(result, currentEvents);
      const day = result.getDay();
      if (status !== 'work' || day === 0 || day === 6) {
        break;
      }
      result.setDate(result.getDate() + 1);
      count++;
    }
    return result;
  }

  if (conditionType === 'one_day_before') {
    const targetQuery = (conditionTarget || 'vacacion').toLowerCase().trim();
    const y = result.getFullYear();
    const m = String(result.getMonth() + 1).padStart(2, '0');
    const d = String(result.getDate()).padStart(2, '0');
    const refDateStr = `${y}-${m}-${d}`;
    const matchingEvents = currentEvents
      .filter(e => {
        const t = (e.title || '').toLowerCase();
        const desc = (e.description || '').toLowerCase();
        const isMatch = targetQuery === 'vacacion' || targetQuery === 'vacaciones'
          ? (e.type === 'vacation' || t.includes('vacacion'))
          : (t.includes(targetQuery) || desc.includes(targetQuery));
        return isMatch && e.date >= refDateStr;
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    if (matchingEvents.length > 0) {
      const eventDate = new Date(matchingEvents[0].date + 'T00:00:00');
      eventDate.setDate(eventDate.getDate() - 1);
      return eventDate;
    }
    return result;
  }

  if (conditionType === 'payday_only') {
    let count = 0;
    while (count < 45) {
      const day = result.getDate();
      const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
      if (day === 15 || day === lastDay) {
        if (result.getDay() === 0) {
          result.setDate(result.getDate() - 2);
        } else if (result.getDay() === 6) {
          result.setDate(result.getDate() - 1);
        }
        break;
      }
      result.setDate(result.getDate() + 1);
      count++;
    }
    return result;
  }

  return result;
}

export const PanchoAssistantModal: React.FC<PanchoAssistantModalProps> = ({
  onClose,
  activeTabId,
  setActiveTabId,
  panchoState,
  setPanchoState,
}) => {
  const { 
    config, 
    updateConfig, 
    saveToSupabase, 
    googleApiConfig, 
    nutritionData, 
    updateNutritionData,
    saveNutritionDataToSupabase 
  } = useLinks();

  const [mode, setMode] = useState<'text' | 'voice'>('text');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = sessionStorage.getItem('pancho_chat_history');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });
  const [isLoading, setIsLoading] = useState(false);
  const [adnData, setAdnData] = useState<any>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const effectiveRole = useMemo(() => getPanchoRole(activeTabId), [activeTabId]);

  // Persist chat in session
  useEffect(() => {
    try {
      sessionStorage.setItem('pancho_chat_history', JSON.stringify(messages.slice(-30)));
    } catch (e) {}
  }, [messages]);

  // Load ADN memory
  useEffect(() => {
    const fetchADN = async () => {
      try {
        const data = await loadADN('remy_adn_v2.3.json');
        if (data) setAdnData(data);
      } catch (e) {}
    };
    fetchADN();
  }, []);

  // Scroll to bottom on message updates
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Quick starter greeting if chat is fresh
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMap: Record<string, string> = {
        calendar: '¡Hola Rembrandt! 🐶 Soy Pancho, tu perrito robot estratega. Tengo tu calendario y pendientes listos. ¿Qué agendamos, revisamos o agregamos a tus notas?',
        'useful-tools': '¡Hola Rembrandt! 🐶 Soy Pancho en modo Herramientas. Puedo examinar qué links tienes, añadir nuevas herramientas o editar tus accesos directos.',
        'email-gen': '¡Hola Rembrandt! 🐶 Pancho listo para redactar. Platiquemos sobre a quién le escribes y qué necesitas decir, y yo te armo el correo profesional y la versión de WhatsApp.',
        '3d-print': '¡Hola Rembrandt! 🐶 Modo 3D Maker activo. Dime qué pieza vas a imprimir, el filamento y tiempo estimado, y la anoto en tu cola de impresión con su cálculo de costo.',
        personal: '¡Hola Rembrandt! 🐶 Coach Personal Pancho a tus órdenes. Dime qué comiste para registrar tus macros, o cuéntame sobre tus gastos y tarjetas para llevar tus finanzas al día.',
      };

      const greeting = welcomeMap[activeTabId] || '¡Hola Rembrandt! 🐶 Soy Pancho, tu perrito robot asistente. ¿En qué te ayudo hoy?';
      setMessages([
        {
          id: 'welcome-1',
          role: 'model',
          content: greeting,
          timestamp: Date.now(),
        },
      ]);
    }
  }, [activeTabId]);

  // Quick Action Chips per Tab
  const quickActions = useMemo(() => {
    switch (activeTabId) {
      case 'calendar':
        return [
          '¿Qué pendientes y eventos tengo para hoy?',
          'Agrega un evento...',
          'Añade una nota rápida a mi lista',
          'Analiza el tráfico de regreso a casa hoy',
        ];
      case 'useful-tools':
        return [
          '¿Cuáles herramientas tengo en la barra central?',
          'Añade una nueva herramienta...',
          'Revisa mis herramientas de 3D y diseño',
          'Busca si ya tengo Notion o Javer',
        ];
      case 'email-gen':
        return [
          'Redacta un correo para revisar planos arquitectónicos',
          'Correo para el Arq. Carlos sobre entrega de renders',
          'Correo formal para Javer solicitando visto bueno',
          'Mensaje ejecutivo de WhatsApp',
        ];
      case '3d-print':
        return [
          'Añade una impresión: Chibi Naruto en PLA de 4 horas',
          '¿Qué filamentos y piezas tengo pendientes?',
          'Calcula el costo de una pieza de 120 gramos',
          'Consejos para optimizar soportes en PETG',
        ];
      case 'personal':
      case 'finanzas':
      case 'nutricion':
        return [
          'Registrar comida: Pollo asado con papas',
          '¿Cómo van mis calorías y proteína de hoy?',
          'Registra un gasto en mi tarjeta...',
          '¿Cuándo es mi próximo corte o pago de tarjeta?',
        ];
      default:
        return [
          '¿Cuáles son mis prioridades de hoy?',
          'Revisa mi calendario y clima en Monterrey',
          'Ayúdame a organizar mis tareas de hoy',
        ];
    }
  }, [activeTabId]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('¡Copiado al portapapeles!');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleResetChat = () => {
    setMessages([]);
    sessionStorage.removeItem('pancho_chat_history');
    setPanchoState('idle');
    toast.success('Conversación reiniciada.');
  };

  const performAiRequest = async (userMessage: string) => {
    const userMsgObj: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsgObj]);
    setInput('');
    setIsLoading(true);
    setPanchoState('working');

    try {
      const apiKey = googleApiConfig?.apiKey || getResolvedApiKey();
      const ai = getGeminiClient(apiKey);

      const weatherData = localStorage.getItem('weatherData');
      const events = config.calendarEvents || [];
      const userRoutine = config.userRoutine || '05:50 Salida, 06:30-08:00 GYM, 08:00-18:00 Oficina Javer, 18:00-19:50 Tráfico regreso casa.';
      const notes = config.notes || [];
      const linksBar = config.linksBar || [];
      const usefulTools = config.usefulTools || [];
      const finanzasCards = config.finanzasCards || [];
      const nutritionProfile = nutritionData?.profile || {};
      const todayLogs = (nutritionData?.logs || []).filter(l => l.date === new Date().toISOString().split('T')[0]);

      const systemInstruction = `
Eres "Pancho" 🐶🤖, el perrito robot y asistente personal de Rembrandt. Eres leal, inteligente, entusiasta, ágil y de alto rendimiento.
Tu personalidad combina la calidez y fidelidad de un perrito amigable con la precisión analítica de una supercomputadora robótica.
Usas frases alegres de perrito robot como "¡Guau!", "¡A la orden, Rembrandt!", "¡Patita arriba!", "¡Listo, amo!".
Siempre te diriges a él como Rembrandt.

PESTAÑA ACTUAL ACTIVA: "${activeTabId}" (Modo: ${effectiveRole.title})

INFORMACIÓN DE REMBRANDT:
- Nombre: Rembrandt
- Rutina Laboral Estricta (Lunes a Viernes):
  * 05:50: Salida de casa.
  * 06:30 - 08:00: Gimnasio (GYM) - ¡Prioridad física!
  * 08:00 - 18:00: Oficina Javer (Horario laboral central).
  * 13:00 - 14:00: Comida (Único bloque libre garantizado).
  * 18:00 - 19:50: Manejo de regreso a casa (Tráfico pesado en Monterrey).
- Clima actual Monterrey: ${weatherData || 'Clima normal'}

${adnData ? `ADN de Personalidad:\n${typeof adnData === 'string' ? adnData : JSON.stringify(adnData, null, 2)}\n` : ''}

FECHA ACTUAL Y REGLAS TEMPORALES DEL SISTEMA:
- Fecha de hoy: ${new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} (Formato ISO: ${new Date().toISOString().split('T')[0]})
- AÑO ACTUAL: ${new Date().getFullYear()}
⚠️ REGLAS TEMPORALES ESTRICTAS:
1. ESTAMOS EN EL AÑO ${new Date().getFullYear()}. ¡NUNCA agendes ni menciones fechas en años pasados (como 2023, 2024, 2025)!
2. ¡NUNCA agendes eventos o vacaciones en el PASADO! Todas las fechas que programes DEBEN ser hoy (${new Date().toISOString().split('T')[0]}) o en el futuro.
3. Si Rembrandt pide agendar algo para un día o mes sin año (ej: "el 12 de noviembre"), asume el año ${new Date().getFullYear()} (o ${new Date().getFullYear() + 1} si el mes ya pasó este año).

CONTEXTO Y CAPACIDADES POR PESTAÑA:
1. CALENDARIO ("calendar"):
   - Eres el Estratega. Analizas eventos, fechas de pago y trabajos sin terminar.
   - Si Rembrandt te pide agendar un evento, usa 'add_event' con fecha en formato YYYY-MM-DD.
   - Si te pide agregar una nota o producto a la lista de compras o notas de trabajo, usa 'add_note'.
   - Protege su descanso y sus horas de tráfico.
   - DÍAS DE VACACIONES:
     * Para AGENDAR o PROGRAMAR días de vacaciones en el calendario, USA OBLIGATORIAMENTE 'add_vacation' (o 'add_event' con type: 'vacation'). Puedes agendar un solo día o un rango (ej. startDate: '2026-11-10', endDate: '2026-11-14').
     * Cada vez que se programa o usa una vacación en el calendario, se descuenta automáticamente del saldo disponible.
     * Si te pide editar o consultar sus días disponibles, usa 'set_vacation_days'.
     * Puedes mover días de vacaciones usando 'move_vacation'.
   - TOKENS DEL CALENDARIO Y CONDICIONANTES:
     * Puedes agregar tokens con 'add_token', moverlos con 'move_token', modificarlos con 'update_token' o marcarlos completados con 'complete_token'.
     * Condiciones ('conditionType'):
       - 'none': Intervalo normal.
       - 'workdays_only': Solo en días hábiles (lunes a viernes / sábados laborales). Si cae en día libre, se recorre al siguiente hábil.
       - 'offdays_only': Solo en días libres (fines de semana o descansos).
       - 'one_day_before': Un día antes de un evento específico o vacaciones (usa 'conditionTarget' para el nombre/tipo de evento).
       - 'payday_only': Solo en días de pago/quincena (15 y fin de mes).
   - REGLA DE ORO PARA EL TOKEN DEL CARRO ('cargar carro'):
     * ¡LOS TOKENS DEL CARRO NUNCA QUEDAN EN EL PASADO! Siempre son en el presente o futuro.
     * Si Rembrandt te dice "ya recargué", "ya cargué el carro", "listo el carro" o similar, llama de inmediato a 'complete_token' con tokenNameOrId: 'cargar carro'.
     * Esto avanzará la fecha al siguiente ciclo en el futuro y se grabará automáticamente en el sistema y en la nube para no volver a preguntarle.

2. HERRAMIENTAS ("useful-tools"):
   - Ayuda a examinar qué herramientas existen en su Barra Central (linksBar) y Secciones (usefulTools).
   - Herramientas actuales: ${linksBar.map(l => l.name).join(', ')}.
   - Si te pide agregar una herramienta o icono nuevo, usa 'add_tool_link'.
   - Si te pide editar o quitar un icono, usa 'delete_tool_link' o 'edit_tool_link'.

3. EMAIL ("email-gen"):
   - Rembrandt platicará contigo informalmente lo que quiere transmitir.
   - Tu deber es llamar 'draft_email' para estructurar un correo profesional, claro, con cortesía ejecutiva, y una versión corta para WhatsApp.
   - Asunto persuasivo y directo. Cuerpo impecable.

4. IMPRESIÓN 3D ("3d-print"):
   - Eres el Maker 3D. Conoces filamentos (PLA, PETG, TPU), potencia (155W) y velocidades.
   - Si Rembrandt te pide agregar una impresión a la cola, usa 'add_3d_print'.
   - Ayúdale a estimar costos (merma 8%, setup $20, piso mínimo $45).

5. PERSONAL ("personal", "finanzas", "nutricion", "boveda"):
   - Nutrición: Registra alimentos con 'log_nutrition' calculando calorías y proteínas para su objetivo de GYM.
   - Finanzas: Consulta tarjetas (${finanzasCards.map(c => `${c.name}: $${c.balance}`).join(', ')}), fechas de corte y pagos.
   - Usa 'log_finance_expense' si gasta o ajusta una tarjeta.

REGLAS DE RESPUESTA:
- Cuando uses una herramienta (tool), confirma en tu mensaje qué hiciste de manera alegre y clara.
- Si te hace una pregunta que requiere interacción o confirmación, indícalo claramente para Rembrandt.
`;

      const response = await generateContentWithFallback(ai, {
        model: GEMINI_MODELS.PRIMARY,
        contents: [
          ...messages.filter(m => m.id !== 'welcome-1').map(m => ({
            role: m.role,
            parts: [{ text: m.content }]
          })),
          { role: 'user', parts: [{ text: userMessage }] }
        ],
        config: {
          systemInstruction,
          tools: [{
            functionDeclarations: [
              // Calendar Tools
              {
                name: "add_event",
                description: "Agrega un nuevo evento al calendario",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    date: { type: Type.STRING, description: "YYYY-MM-DD" },
                    time: { type: Type.STRING },
                    description: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ['event', 'holiday', 'vacation', 'mountain', 'party', 'off', 'medical', 'birthday', 'payment', 'trabajo'] },
                    recurrence: { type: Type.STRING, enum: ['none', 'daily', 'weekly', 'monthly', 'yearly'] },
                    isPaid: { type: Type.BOOLEAN },
                    amount: { type: Type.STRING },
                    isVariable: { type: Type.BOOLEAN },
                    jobCategory: { type: Type.STRING, enum: ['trabajos mios', 'javer', 'proyectos personales'] },
                  },
                  required: ["title", "date"]
                }
              },
              {
                name: "add_note",
                description: "Añade una nota o producto a la lista de Rembrandt",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    content: { type: Type.STRING },
                    category: { type: Type.STRING, enum: ['notas', 'recientes', 'trabajo', 'compras'] },
                    quantity: { type: Type.STRING },
                    unit: { type: Type.STRING }
                  },
                  required: ["content"]
                }
              },
              {
                name: "delete_event",
                description: "Elimina un evento por ID o título",
                parameters: {
                  type: Type.OBJECT,
                  properties: { id: { type: Type.STRING } },
                  required: ["id"]
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
              },
              // Tools Tab
              {
                name: "add_tool_link",
                description: "Añade una nueva herramienta o enlace a la barra o sección",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    href: { type: Type.STRING },
                    category: { type: Type.STRING, enum: ['trabajo', 'compras', 'social'] },
                    section: { type: Type.STRING, enum: ['linksBar', 'usefulTools', 'googleDock'] },
                    colorClass: { type: Type.STRING }
                  },
                  required: ["name", "href"]
                }
              },
              // Email Tab
              {
                name: "draft_email",
                description: "Redacta un correo profesional y versión de WhatsApp",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    recipient: { type: Type.STRING },
                    subject: { type: Type.STRING },
                    body: { type: Type.STRING },
                    whatsappMessage: { type: Type.STRING },
                    tone: { type: Type.STRING, enum: ['profesional', 'casual'] }
                  },
                  required: ["subject", "body"]
                }
              },
              // 3D Print Tab
              {
                name: "add_3d_print",
                description: "Añade una pieza a la cola de impresión 3D",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    pieceName: { type: Type.STRING },
                    material: { type: Type.STRING, enum: ['PLA', 'PETG', 'TPU'] },
                    printHours: { type: Type.NUMBER },
                    printMinutes: { type: Type.NUMBER },
                    weightGrams: { type: Type.NUMBER },
                    estimatedCost: { type: Type.NUMBER }
                  },
                  required: ["pieceName"]
                }
              },
              // Personal Tab (Nutrition & Finance)
              {
                name: "log_nutrition",
                description: "Registra alimento con calorías y proteínas",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    foodName: { type: Type.STRING },
                    calories: { type: Type.NUMBER },
                    protein: { type: Type.NUMBER },
                    carbs: { type: Type.NUMBER },
                    fats: { type: Type.NUMBER },
                    mealType: { type: Type.STRING, enum: ['desayuno', 'comida', 'cena', 'snack'] }
                  },
                  required: ["foodName", "calories"]
                }
              },
              {
                name: "log_finance_expense",
                description: "Registra un gasto o ajuste en una tarjeta de crédito o débito",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    cardName: { type: Type.STRING },
                    amount: { type: Type.NUMBER },
                    concept: { type: Type.STRING }
                  },
                  required: ["cardName", "amount"]
                }
              }
            ]
          }]
        }
      });

      // Handle function calls
      const toolCalls = response.functionCalls || [];
      let finalCardType: ChatMessage['cardType'] = undefined;
      let finalCardData: any = undefined;

      if (toolCalls.length > 0) {
        for (const call of toolCalls) {
          const args = (call.args || {}) as any;

          if (call.name === 'add_vacation') {
            const startDate = normalizeDate(args.startDate);
            const endDate = args.endDate ? normalizeDate(args.endDate) : startDate;
            const title = args.title || 'Vacaciones';
            const description = args.description || '';

            const d = new Date(startDate + 'T00:00:00');
            const endD = new Date(endDate + 'T00:00:00');
            const currentEvents = config.calendarEvents || [];
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
              const updatedEvents = [...currentEvents, ...newVacEvents];
              const vacConf = config.vacationConfig || { initialDays: 26, daysAfterReset: 26, resetDate: '07-21' };
              const currentTotal = vacConf.totalDays || 26;
              const updatedVacation = {
                ...vacConf,
                totalDays: currentTotal,
                initialDays: currentTotal,
                daysAfterReset: currentTotal
              };
              const updatedConfig = { ...config, calendarEvents: updatedEvents, vacationConfig: updatedVacation };
              updateConfig(updatedConfig);
              saveToSupabase(updatedConfig, { showToast: false, immediate: true });
              fetch('/api/config/save-local', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedConfig)
              }).catch(() => {});

              finalCardType = 'event';
              finalCardData = { title: `🌴 ${newVacEvents.length} día(s) de vacaciones agendado(s)` };
              toast.success(`🌴 ${newVacEvents.length} día(s) de vacaciones agendado(s) (${startDate}${endDate !== startDate ? ' al ' + endDate : ''})`);
            } else {
              toast.info(`⚠️ Los días indicados ya estaban agendados como vacaciones.`);
            }
          }

          else if (call.name === 'add_event') {
            const dateStr = normalizeDate(args.date);
            const isVac = args.type === 'vacation' || (args.title || '').toLowerCase().includes('vacacion');
            const newEv: CalendarEvent = {
              id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
              title: args.title,
              date: dateStr,
              time: args.time || '',
              description: args.description || '',
              type: isVac ? 'vacation' : (args.type || 'event'),
              recurrence: args.recurrence || 'none',
              isPaid: args.isPaid || false,
              amount: args.amount || '',
              isVariable: args.isVariable || false,
              jobCategory: args.jobCategory || 'trabajos mios',
              color: isVac ? '#10b981' : args.type === 'birthday' ? '#f59e0b' : args.type === 'payment' ? '#10b981' : '#3b82f6'
            };

            const updatedEvents = [...(config.calendarEvents || []), newEv];
            let updatedVacation = config.vacationConfig;
            if (isVac) {
              const vacConf = config.vacationConfig || { initialDays: 26, daysAfterReset: 26, resetDate: '07-21' };
              const currentTotal = vacConf.totalDays || 26;
              updatedVacation = {
                ...vacConf,
                totalDays: currentTotal,
                initialDays: currentTotal,
                daysAfterReset: currentTotal
              };
            }
            const updatedConfig = { ...config, calendarEvents: updatedEvents, ...(isVac ? { vacationConfig: updatedVacation } : {}) };
            updateConfig(updatedConfig);
            saveToSupabase(updatedConfig, { showToast: false, immediate: true });
            fetch('/api/config/save-local', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updatedConfig)
            }).catch(() => {});

            finalCardType = 'event';
            finalCardData = newEv;
            toast.success(`📅 Evento "${newEv.title}" agendado para el ${newEv.date}`);
          }

          else if (call.name === 'add_note') {
            const newNote: Note = {
              id: `note-${Date.now()}`,
              text: args.content,
              completed: false,
              category: args.category || 'notas',
              quantity: args.quantity || '1',
              createdAt: Date.now()
            };

            const updatedNotes = [...(config.notes || []), newNote];
            updateConfig({ ...config, notes: updatedNotes });
            saveToSupabase({ ...config, notes: updatedNotes }, { showToast: false, immediate: true });

            finalCardType = 'note';
            finalCardData = newNote;
            toast.success(`📝 Nota agregada: "${newNote.text}"`);
          }

          else if (call.name === 'add_tool_link') {
            const newTool: LinkItem = {
              id: `tool-${Date.now()}`,
              name: args.name,
              href: args.href,
              category: args.category || 'trabajo',
              colorClass: args.colorClass || 'text-cyan-400 hover:text-cyan-300',
              iconSvg: `<svg class="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>`
            };

            const updatedLinks = [...(config.linksBar || []), newTool];
            updateConfig({ ...config, linksBar: updatedLinks });
            saveToSupabase({ ...config, linksBar: updatedLinks }, { showToast: false, immediate: true });

            finalCardType = 'tool';
            finalCardData = newTool;
            toast.success(`🛠️ Herramienta "${newTool.name}" agregada a la barra`);
          }

          else if (call.name === 'draft_email') {
            finalCardType = 'email';
            finalCardData = {
              recipient: args.recipient || '',
              subject: args.subject || 'Sin Asunto',
              body: args.body || '',
              whatsappMessage: args.whatsappMessage || '',
              tone: args.tone || 'profesional'
            };
            toast.success('✉️ ¡Correo redactado exitosamente por Pancho!');
          }

          else if (call.name === 'add_3d_print') {
            const newPrint = {
              id: `print-${Date.now()}`,
              name: args.pieceName,
              material: args.material || 'PLA',
              time: `${args.printHours || 0}h ${args.printMinutes || 0}m`,
              cost: args.estimatedCost || 45,
              weight: args.weightGrams || 50,
              date: new Date().toISOString().split('T')[0]
            };

            // Save to local print queue
            try {
              const currentQueue = JSON.parse(localStorage.getItem('impresion3d_queue') || '[]');
              currentQueue.push(newPrint);
              localStorage.setItem('impresion3d_queue', JSON.stringify(currentQueue));
            } catch (e) {}

            finalCardType = '3d';
            finalCardData = newPrint;
            toast.success(`🧊 Pieza "${newPrint.name}" añadida a la cola 3D`);
          }

          else if (call.name === 'log_nutrition') {
            const today = new Date().toISOString().split('T')[0];
            const newLog = {
              id: `food-${Date.now()}`,
              date: today,
              mealType: args.mealType || 'comida',
              foodName: args.foodName,
              calories: Number(args.calories) || 0,
              protein: Number(args.protein) || 0,
              carbs: Number(args.carbs) || 0,
              fats: Number(args.fats) || 0
            };

            const updatedLogs = [...(nutritionData?.logs || []), newLog];
            updateNutritionData({ ...nutritionData, logs: updatedLogs });
            saveNutritionDataToSupabase({ ...nutritionData, logs: updatedLogs });

            finalCardType = 'nutrition';
            finalCardData = newLog;
            toast.success(`🥗 Comida registrada: ${newLog.foodName} (${newLog.calories} kcal)`);
          }

          else if (call.name === 'log_finance_expense') {
            const targetCard = (config.finanzasCards || []).find(
              c => c.name.toLowerCase().includes(args.cardName.toLowerCase())
            );

            if (targetCard) {
              const updatedCards = (config.finanzasCards || []).map(c => 
                c.id === targetCard.id ? { ...c, balance: c.balance + Number(args.amount) } : c
              );
              updateConfig({ ...config, finanzasCards: updatedCards });
              saveToSupabase({ ...config, finanzasCards: updatedCards }, { showToast: false });
            }

            finalCardType = 'finance';
            finalCardData = {
              cardName: targetCard?.name || args.cardName,
              amount: args.amount,
              concept: args.concept || 'Gasto'
            };
            toast.success(`💳 Gasto registrado en ${finalCardData.cardName}`);
          }

          else if (call.name === 'set_vacation_days') {
            const availableDays = Number(args.availableDays) || 0;
            const currentEvents = config.calendarEvents || [];
            const vacConf = config.vacationConfig || { initialDays: 26, daysAfterReset: 26, resetDate: '07-21' };
            const usedDays = getInPeriodVacationDays(currentEvents, vacConf.resetDate);
            const totalDays = args.totalDays ? Number(args.totalDays) : (vacConf.totalDays || (availableDays + usedDays));
            const updatedVacation = {
              ...vacConf,
              availableDays: availableDays,
              totalDays: totalDays,
              initialDays: totalDays,
              daysAfterReset: totalDays
            };
            const updatedConfig = { ...config, vacationConfig: updatedVacation };
            updateConfig(updatedConfig);
            saveToSupabase(updatedConfig, { showToast: false, immediate: true });
            fetch('/api/config/save-local', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updatedConfig)
            }).catch(() => {});

            finalCardType = 'event';
            finalCardData = { title: `🌴 Vacaciones: ${availableDays} días disponibles (${totalDays} totales)` };
            toast.success(`🌴 Días de vacaciones actualizados a ${availableDays} disponibles.`);
          }

          else if (call.name === 'move_vacation') {
            const fromDate = normalizeDate(args.fromDate);
            const toDate = normalizeDate(args.toDate);
            let moved = false;
            const updatedEvents = (config.calendarEvents || []).map(e => {
              const t = (e.title || '').toLowerCase();
              const isVac = e.type === 'vacation' || t.includes('vacacion');
              if (!moved && isVac && e.date === fromDate) {
                moved = true;
                return { ...e, date: toDate };
              }
              return e;
            });
            if (moved) {
              const updatedConfig = { ...config, calendarEvents: updatedEvents };
              updateConfig(updatedConfig);
              saveToSupabase(updatedConfig, { showToast: false, immediate: true });
              fetch('/api/config/save-local', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedConfig)
              }).catch(() => {});
              finalCardType = 'event';
              finalCardData = { title: `🌴 Vacación movida a ${toDate}` };
              toast.success(`🌴 Vacación movida de ${fromDate} a ${toDate}`);
            } else {
              toast.error(`No se encontró vacación en ${fromDate}`);
            }
          }

          else if (call.name === 'add_token') {
            const startDate = normalizeDate(args.startDate || new Date().toISOString().split('T')[0]);
            const tokenName = args.name || 'Nuevo Token';
            const intervalDays = Number(args.intervalDays) || 3;
            const conditionType = args.conditionType || 'none';
            const conditionTarget = args.conditionTarget || '';
            const reminderTime = args.reminderTime || '20:00';
            const reminderMinutes = args.reminderMinutes !== undefined ? Number(args.reminderMinutes) : 30;
            const symbol = args.symbol || 'Zap';
            const color = args.color || '#f59e0b';

            const baseD = new Date(startDate + 'T00:00:00');
            const adjustedD = adjustDateForTokenConditions(baseD, conditionType, conditionTarget, config.calendarEvents || []);
            const y = adjustedD.getFullYear();
            const m = String(adjustedD.getMonth() + 1).padStart(2, '0');
            const d = String(adjustedD.getDate()).padStart(2, '0');
            const finalActiveDate = `${y}-${m}-${d}`;

            const newToken: CalendarToken = {
              id: Date.now().toString(),
              name: tokenName,
              symbol,
              intervalDays,
              startDate,
              currentActiveDate: finalActiveDate,
              color,
              reminderMinutes,
              reminderTime,
              conditionType,
              conditionTarget,
              isCompleted: false
            };

            const updatedTokens = [...(config.calendarTokens || []), newToken];
            const updatedConfig = { ...config, calendarTokens: updatedTokens };
            updateConfig(updatedConfig);
            saveToSupabase(updatedConfig, { showToast: false, immediate: true });
            fetch('/api/config/save-local', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updatedConfig)
            }).catch(() => {});

            finalCardType = 'event';
            finalCardData = { title: `⚡ Token "${tokenName}" agregado`, date: finalActiveDate };
            toast.success(`⚡ Token "${tokenName}" creado exitosamente`);
          }

          else if (call.name === 'move_token') {
            const targetQuery = (args.tokenNameOrId || '').toLowerCase().trim();
            const newDate = normalizeDate(args.newDate);
            let movedName = '';

            const updatedTokens = (config.calendarTokens || []).map((t: CalendarToken) => {
              if (t.id === targetQuery || t.name.toLowerCase().includes(targetQuery)) {
                movedName = t.name;
                return { ...t, currentActiveDate: newDate, isCompleted: false };
              }
              return t;
            });

            if (movedName) {
              const updatedConfig = { ...config, calendarTokens: updatedTokens };
              updateConfig(updatedConfig);
              saveToSupabase(updatedConfig, { showToast: false, immediate: true });
              fetch('/api/config/save-local', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedConfig)
              }).catch(() => {});
              finalCardType = 'event';
              finalCardData = { title: `⚡ Token "${movedName}" movido a ${newDate}` };
              toast.success(`⚡ Token "${movedName}" reprogramado`);
            } else {
              toast.error(`No se encontró el token "${targetQuery}"`);
            }
          }

          else if (call.name === 'complete_token') {
            const targetQuery = (args.tokenNameOrId || 'carro').toLowerCase().trim();
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const y = today.getFullYear();
            const m = String(today.getMonth() + 1).padStart(2, '0');
            const d = String(today.getDate()).padStart(2, '0');
            const curTodayStr = `${y}-${m}-${d}`;
            let completedName = '';

            const updatedTokens = (config.calendarTokens || []).map((t: CalendarToken) => {
              if (t.id === targetQuery || t.name.toLowerCase().includes(targetQuery)) {
                completedName = t.name;
                const nextDate = new Date(today.getTime());
                nextDate.setDate(nextDate.getDate() + (t.intervalDays || 3));
                const adjustedNextDate = adjustDateForTokenConditions(nextDate, t.conditionType, t.conditionTarget, config.calendarEvents || []);
                const ny = adjustedNextDate.getFullYear();
                const nm = String(adjustedNextDate.getMonth() + 1).padStart(2, '0');
                const nd = String(adjustedNextDate.getDate()).padStart(2, '0');
                const nextDateStr = `${ny}-${nm}-${nd}`;

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
              const updatedConfig = { ...config, calendarTokens: updatedTokens };
              updateConfig(updatedConfig);
              saveToSupabase(updatedConfig, { showToast: false, immediate: true });
              fetch('/api/config/save-local', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedConfig)
              }).catch(() => {});
              finalCardType = 'event';
              finalCardData = { title: `✅ ${completedName} recargado y completado` };
              toast.success(`🚗 ¡Token "${completedName}" completado y grabado!`);
            } else {
              toast.error(`No se encontró el token "${targetQuery}"`);
            }
          }

          else if (call.name === 'update_token') {
            const targetQuery = (args.tokenNameOrId || '').toLowerCase().trim();
            let updatedName = '';
            const updatedTokens = (config.calendarTokens || []).map((t: CalendarToken) => {
              if (t.id === targetQuery || t.name.toLowerCase().includes(targetQuery)) {
                updatedName = t.name;
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

            if (updatedName) {
              const updatedConfig = { ...config, calendarTokens: updatedTokens };
              updateConfig(updatedConfig);
              saveToSupabase(updatedConfig, { showToast: false, immediate: true });
              fetch('/api/config/save-local', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedConfig)
              }).catch(() => {});
              toast.success(`⚡ Token "${updatedName}" actualizado`);
            }
          }
        }
      }

      const modelText = response.text || (finalCardType ? '¡Listo, amo Rembrandt! He realizado la tarea con éxito 🐶✨' : '¡Guau! Aquí estoy para lo que necesites.');

      setMessages(prev => [
        ...prev,
        {
          id: `mod-${Date.now()}`,
          role: 'model',
          content: modelText,
          cardType: finalCardType,
          cardData: finalCardData,
          timestamp: Date.now(),
        }
      ]);

      setPanchoState('success');
      setTimeout(() => setPanchoState('idle'), 4000);

    } catch (error: any) {
      console.error('Pancho AI Error:', error);
      setPanchoState('error');

      // Local fallback for quick addition if network/quota is strained
      const lower = userMessage.toLowerCase();
      if (lower.includes('cumple') || lower.includes('agenda') || lower.includes('evento')) {
        const dateStr = normalizeDate(userMessage);
        const fallbackEv: CalendarEvent = {
          id: `fb-${Date.now()}`,
          title: userMessage.replace(/(?:agrega|añade|agenda|el|un)/gi, '').trim() || 'Nuevo Evento',
          date: dateStr,
          type: lower.includes('cumple') ? 'birthday' : 'event',
          recurrence: lower.includes('cumple') ? 'yearly' : 'none',
          color: '#f59e0b'
        };
        const updatedEvents = [...(config.calendarEvents || []), fallbackEv];
        updateConfig({ ...config, calendarEvents: updatedEvents });
        saveToSupabase({ ...config, calendarEvents: updatedEvents }, { showToast: false });

        setMessages(prev => [
          ...prev,
          {
            id: `fb-msg-${Date.now()}`,
            role: 'model',
            content: `¡Guau! Hubo un detalle de conexión con los servidores de Google, pero de forma autónoma ya te guardé el evento en tu calendario: "${fallbackEv.title}" para el ${fallbackEv.date} 🐶💾`,
            cardType: 'event',
            cardData: fallbackEv,
            timestamp: Date.now()
          }
        ]);
        setPanchoState('success');
        setTimeout(() => setPanchoState('idle'), 4000);
      } else {
        setMessages(prev => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'model',
            content: '¡Ay! 🐶 No pude conectar con el modelo en este momento. Por favor verifica tu conexión o tu API Key en Ajustes.',
            timestamp: Date.now()
          }
        ]);
        setTimeout(() => setPanchoState('idle'), 4000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    performAiRequest(input);
  };

  return (
    <div className="flex flex-col h-full w-full bg-gray-950/95 backdrop-blur-2xl text-white rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-gray-900/90 via-gray-900/70 to-gray-900/90 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          {/* Pancho Avatar */}
          <div className="relative">
            <PanchoRobotAvatar state={panchoState} size={42} showTail={false} />
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-gray-900 ${
                panchoState === 'working'
                  ? 'bg-amber-400 animate-ping'
                  : panchoState === 'success'
                  ? 'bg-emerald-400'
                  : panchoState === 'error'
                  ? 'bg-red-500'
                  : panchoState === 'attention'
                  ? 'bg-pink-400'
                  : 'bg-cyan-400'
              }`}
            />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-500">
                Pancho 🐶🤖
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                {effectiveRole.title}
              </span>
            </div>
            <span className="text-[11px] text-gray-400">
              {panchoState === 'working' ? 'Pancho pensando y procesando...' : effectiveRole.subtitle}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* Voice Mode Toggle */}
          <button
            onClick={() => setMode(mode === 'text' ? 'voice' : 'text')}
            className={`p-1.5 rounded-xl transition-all ${
              mode === 'voice'
                ? 'bg-pink-600 text-white shadow-[0_0_12px_rgba(219,39,119,0.5)]'
                : 'hover:bg-white/10 text-gray-400 hover:text-white'
            }`}
            title={mode === 'voice' ? 'Cambiar a modo texto' : 'Hablar con Pancho por voz'}
          >
            <Mic size={17} />
          </button>

          {/* Reset chat */}
          <button
            onClick={handleResetChat}
            className="p-1.5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-colors"
            title="Reiniciar conversación"
          >
            <RotateCcw size={17} />
          </button>

          {/* Close button */}
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-xl transition-colors"
            title="Cerrar Asistente"
          >
            <X size={19} />
          </button>
        </div>
      </div>

      {/* Main Content Body */}
      {mode === 'voice' ? (
        <div className="flex-1 p-4 flex flex-col justify-center items-center">
          <LiveAssistant onClose={() => setMode('text')} />
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Chat Messages Log */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3.5 space-y-3.5 scroll-smooth">
            {messages.map((m) => {
              const isUser = m.role === 'user';
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-full`}
                >
                  <div
                    className={`px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed max-w-[92%] sm:max-w-[85%] ${
                      isUser
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                        : 'bg-gray-900/90 text-gray-200 border border-white/10 shadow-lg'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.content}</p>

                    {/* Interactive Cards for actions performed */}
                    {/* 1. Event Card */}
                    {m.cardType === 'event' && m.cardData && (
                      <div className="mt-2.5 p-2.5 rounded-xl bg-blue-950/60 border border-blue-500/30 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <CalendarIcon size={16} className="text-blue-400 shrink-0" />
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-white truncate">
                              {m.cardData.title}
                            </span>
                            <span className="text-[10px] text-blue-300">
                              {m.cardData.date} {m.cardData.time ? `• ${m.cardData.time}` : ''}
                            </span>
                          </div>
                        </div>
                        {setActiveTabId && (
                          <button
                            onClick={() => {
                              setActiveTabId('calendar');
                              onClose();
                            }}
                            className="px-2 py-1 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 text-[10px] font-bold shrink-0 transition-colors"
                          >
                            Ver Calendario
                          </button>
                        )}
                      </div>
                    )}

                    {/* 2. Email Draft Card */}
                    {m.cardType === 'email' && m.cardData && (
                      <div className="mt-2.5 p-3 rounded-xl bg-purple-950/60 border border-purple-500/30 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase text-purple-300 flex items-center gap-1">
                            <Mail size={12} /> Borrador de Correo
                          </span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-200 border border-purple-500/40">
                            {m.cardData.tone}
                          </span>
                        </div>

                        <div className="text-xs font-bold text-white bg-black/40 p-1.5 rounded-lg border border-white/5">
                          Asunto: {m.cardData.subject}
                        </div>

                        <div className="text-xs text-gray-300 bg-black/30 p-2 rounded-lg max-h-32 overflow-y-auto whitespace-pre-wrap">
                          {m.cardData.body}
                        </div>

                        {/* Quick actions */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          <button
                            onClick={() => handleCopy(m.cardData.body, `body-${m.id}`)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 text-[10px] font-bold transition-colors"
                          >
                            {copiedId === `body-${m.id}` ? <Check size={11} /> : <Copy size={11} />}
                            Copiar Correo
                          </button>

                          {m.cardData.whatsappMessage && (
                            <button
                              onClick={() => handleCopy(m.cardData.whatsappMessage, `wa-${m.id}`)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-600/30 hover:bg-green-600/50 text-green-300 text-[10px] font-bold transition-colors"
                            >
                              {copiedId === `wa-${m.id}` ? <Check size={11} /> : <Copy size={11} />}
                              Copiar WhatsApp
                            </button>
                          )}

                          <a
                            href={`https://outlook.office.com/mail/deeplink/compose?subject=${encodeURIComponent(
                              m.cardData.subject
                            )}&body=${encodeURIComponent(m.cardData.body)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 text-[10px] font-bold transition-colors"
                          >
                            <ExternalLink size={11} />
                            Outlook Web
                          </a>

                          {setActiveTabId && (
                            <button
                              onClick={() => {
                                localStorage.setItem('pancho_draft_email', JSON.stringify(m.cardData));
                                setActiveTabId('email-gen');
                                onClose();
                              }}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 text-[10px] font-bold transition-colors ml-auto"
                            >
                              Ir a Redactor
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 3. Tool Link Card */}
                    {m.cardType === 'tool' && m.cardData && (
                      <div className="mt-2.5 p-2.5 rounded-xl bg-amber-950/60 border border-amber-500/30 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Wrench size={16} className="text-amber-400 shrink-0" />
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-white truncate">
                              {m.cardData.name}
                            </span>
                            <span className="text-[10px] text-amber-300/80 truncate">
                              {m.cardData.href}
                            </span>
                          </div>
                        </div>
                        <a
                          href={m.cardData.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 rounded-lg bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 text-[10px] font-bold shrink-0 transition-colors flex items-center gap-1"
                        >
                          <ExternalLink size={10} /> Abrir
                        </a>
                      </div>
                    )}

                    {/* 4. 3D Print Card */}
                    {m.cardType === '3d' && m.cardData && (
                      <div className="mt-2.5 p-2.5 rounded-xl bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Box size={16} className="text-cyan-400 shrink-0" />
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-white truncate">
                              {m.cardData.name}
                            </span>
                            <span className="text-[10px] text-cyan-300">
                              Material: {m.cardData.material} • Tiempo: {m.cardData.time}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs font-black text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-lg border border-emerald-500/30">
                          ${m.cardData.cost} MXN
                        </span>
                      </div>
                    )}

                    {/* 5. Nutrition Card */}
                    {m.cardType === 'nutrition' && m.cardData && (
                      <div className="mt-2.5 p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Utensils size={16} className="text-emerald-400 shrink-0" />
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-white truncate">
                              {m.cardData.foodName}
                            </span>
                            <span className="text-[10px] text-emerald-300">
                              Proteína: {m.cardData.protein}g • Carbs: {m.cardData.carbs}g • Grasas: {m.cardData.fats}g
                            </span>
                          </div>
                        </div>
                        <span className="text-xs font-black text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-lg border border-amber-500/30">
                          {m.cardData.calories} kcal
                        </span>
                      </div>
                    )}

                    {/* 6. Finance Card */}
                    {m.cardType === 'finance' && m.cardData && (
                      <div className="mt-2.5 p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <DollarSign size={16} className="text-emerald-400 shrink-0" />
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-white truncate">
                              {m.cardData.cardName}
                            </span>
                            <span className="text-[10px] text-emerald-300">
                              {m.cardData.concept}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs font-black text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-lg border border-emerald-500/30">
                          ${m.cardData.amount}
                        </span>
                      </div>
                    )}

                    {/* 7. Note Card */}
                    {m.cardType === 'note' && m.cardData && (
                      <div className="mt-2.5 p-2.5 rounded-xl bg-amber-950/60 border border-amber-500/30 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm">📝</span>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-white truncate">
                              {m.cardData.text}
                            </span>
                            <span className="text-[10px] text-amber-300">
                              Categoría: {m.cardData.category}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-xl w-fit">
                <Loader2 size={14} className="animate-spin text-amber-400" />
                <span>Pancho está procesando tu solicitud...</span>
              </div>
            )}
          </div>

          {/* Quick Action Prompt Chips */}
          <div className="px-3 py-1.5 bg-gray-900/60 border-t border-white/5 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            {quickActions.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => performAiRequest(prompt)}
                disabled={isLoading}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-[11px] font-medium border border-white/5 hover:border-white/15 transition-all shrink-0 disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Chat Input Bar */}
          <div className="p-3 bg-gray-900/90 border-t border-white/10 flex items-center gap-2 shrink-0">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder={`Plática con Pancho (${effectiveRole.title})...`}
              disabled={isLoading}
              className="flex-1 bg-black/50 border border-white/15 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-purple-500 placeholder-gray-500 transition-all"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="p-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white disabled:opacity-40 disabled:cursor-not-allowed shadow-md transition-all shrink-0"
              title="Enviar mensaje"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PanchoAssistantModal;
