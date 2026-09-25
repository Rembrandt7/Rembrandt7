import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import Spinner from './common/Spinner';
import { ReferenceImage } from './common/ReferenceImageManager';
import { SUPABASE_CONFIG } from '../utils/constants';
import { useLinks } from '../contexts/LinkContext';
import { cleanJsonResponse } from '../utils/jsonUtils';
import { 
  Trash2, Mail, MessageSquare, Star, Sparkles, Send, 
  RefreshCw, Pencil, Save, Copy, AlertTriangle, Mic, MicOff, RotateCcw, 
  Bot, Newspaper, ExternalLink, Bookmark, Building2, CheckCircle2, 
  Clock, Zap, Search, Image as ImageIcon, Users, ChevronDown, ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { getFriendlyAiErrorMessage, isQuotaError, isUnavailableError } from '../utils/aiError';

async function generateContentWithFallback(ai: GoogleGenAI, params: any) {
  const primaryModel = params.model || 'gemini-3.1-flash-lite';
  const fallbackModel = 'gemini-3.1-flash-preview';

  try {
    return await ai.models.generateContent(params);
  } catch (err: any) {
    if (isUnavailableError(err)) {
      console.warn(`[AI] Primary model ${primaryModel} unavailable (503 / high demand). Falling back to ${fallbackModel}...`);
      return await ai.models.generateContent({
        ...params,
        model: fallbackModel
      });
    }
    throw err;
  }
}

type Tone = 'Profesional' | 'Casual';
type MessageLength = 'Reducido' | 'Medio' | 'Detallado';
type Gender = 'M' | 'F';
type CopiedState = 'email' | 'whatsapp' | 'preset-email' | 'preset-wa' | null;

interface GeneratedContent {
  emailSubject: string;
  emailBody: string;
  whatsappMessage: string;
  improvedIdea?: string;
  alternativeSubjects?: string[];
}

export type DeliverableType = 
  | 'Planos en AutoCAD' 
  | 'Planos en PDF' 
  | 'Renders' 
  | 'Recorrido' 
  | 'Presentación' 
  | 'Fotomontaje' 
  | 'Cálculo Estructural';

export type DeliveryMethod = 'Revisión' | 'Entrega' | 'Proyecto' | 'Anteproyecto';

const DELIVERABLE_OPTIONS: DeliverableType[] = [
  'Planos en AutoCAD',
  'Planos en PDF',
  'Renders',
  'Recorrido',
  'Presentación',
  'Fotomontaje',
  'Cálculo Estructural'
];

const METHOD_OPTIONS: DeliveryMethod[] = [
  'Revisión',
  'Entrega',
  'Proyecto',
  'Anteproyecto'
];

const DEFAULT_VOCABULARY = [
  'planos', 'planos en autocad', 'planos en pdf', 'renders', 'recorrido virtual',
  'anteproyecto', 'proyecto ejecutivo', 'cálculo estructural', 'fotomontaje',
  'revisión', 'entrega formal', 'visto bueno', 'observaciones', 'comentarios',
  'modificaciones', 'actualización', 'fraccionamiento', 'arquitectura',
  'coordinación', 'especificaciones', 'acabados', 'obra', 'fecha compromiso',
  'archivo compartido', 'enlace de descarga', 'atentamente', 'seguimiento',
  'autorización', 'presupuesto', 'catálogo de conceptos', 'volumetría'
];

interface QuickPreset {
  id: string;
  name: string;
  deliverables: DeliverableType[];
  method: DeliveryMethod;
}

const QUICK_PRESETS: QuickPreset[] = [
  {
    id: 'qp-1',
    name: 'Planos AutoCAD (Revisión)',
    deliverables: ['Planos en AutoCAD'],
    method: 'Revisión'
  },
  {
    id: 'qp-2',
    name: 'Planos PDF (Revisión)',
    deliverables: ['Planos en PDF'],
    method: 'Revisión'
  },
  {
    id: 'qp-3',
    name: 'Planos AutoCAD + PDF (Entrega)',
    deliverables: ['Planos en AutoCAD', 'Planos en PDF'],
    method: 'Entrega'
  },
  {
    id: 'qp-4',
    name: 'Renders y Fotomontaje',
    deliverables: ['Renders', 'Fotomontaje'],
    method: 'Revisión'
  },
  {
    id: 'qp-5',
    name: 'Anteproyecto y Presentación',
    deliverables: ['Presentación', 'Renders'],
    method: 'Anteproyecto'
  },
  {
    id: 'qp-6',
    name: 'Recorrido Virtual',
    deliverables: ['Recorrido'],
    method: 'Revisión'
  },
  {
    id: 'qp-7',
    name: 'Cálculo Estructural (Entrega)',
    deliverables: ['Cálculo Estructural'],
    method: 'Entrega'
  }
];

interface PresetOptions {
  cloudLink?: string;
  deadline?: string;
  toneStyle?: 'colaborativo' | 'formal';
}

const buildPresetMessage = (
  deliverables: DeliverableType[],
  method: DeliveryMethod,
  greeting: string,
  projectName: string,
  options?: PresetOptions
) => {
  const { cloudLink = '', deadline = '', toneStyle = 'colaborativo' } = options || {};

  const formatList = (items: string[]) => {
    if (items.length === 0) return '';
    if (items.length === 1) return items[0];
    if (items.length === 2) return `${items[0]} y ${items[1]}`;
    return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
  };

  const deliverableText = deliverables.length > 0 
    ? formatList(deliverables)
    : 'la información correspondiente';

  const deliverableTitle = deliverables.length > 0
    ? formatList(deliverables)
    : 'Información';

  const projClean = projectName.trim();
  const projText = projClean ? ` de ${projClean}` : '';
  const projSubject = projClean ? ` - ${projClean}` : '';

  let subject = '';
  let actionText = '';
  let closingText = 'Quedo a la espera de tus observaciones o visto bueno para continuar.';

  if (method === 'Revisión') {
    subject = `Envío de ${deliverableTitle} para Revisión${projSubject}`;
    if (toneStyle === 'formal') {
      actionText = `por medio del presente correo, me permito remitir a usted los archivos correspondientes a ${deliverableText} para su debida revisión y comentarios${projText}.`;
      closingText = 'Quedo a su disposición para cualquier duda o retroalimentación respectiva.';
    } else {
      actionText = `te hago llegar los archivos de ${deliverableText} para su debida revisión y comentarios${projText}.`;
      closingText = 'Quedo a la espera de tus observaciones o visto bueno para continuar.';
    }
  } else if (method === 'Entrega') {
    subject = `Entrega de ${deliverableTitle}${projSubject}`;
    if (toneStyle === 'formal') {
      actionText = `por medio de la presente, se hace entrega formal de ${deliverableText}${projText}.`;
      closingText = 'Quedo a su entera disposición para cualquier aclaración o seguimiento.';
    } else {
      actionText = `te hago entrega formal de ${deliverableText}${projText}.`;
      closingText = 'Quedo a tu disposición para cualquier duda o consulta.';
    }
  } else if (method === 'Proyecto') {
    subject = `Envío de Proyecto (${deliverableTitle})${projSubject}`;
    if (toneStyle === 'formal') {
      actionText = `se comparten los archivos correspondientes al proyecto (${deliverableText})${projText}.`;
      closingText = 'Quedo a sus órdenes ante cualquier inquietud o seguimiento requerido.';
    } else {
      actionText = `te comparto los archivos del proyecto (${deliverableText})${projText}.`;
      closingText = 'Quedo a tus órdenes ante cualquier duda o seguimiento.';
    }
  } else if (method === 'Anteproyecto') {
    subject = `Envío de Anteproyecto (${deliverableTitle})${projSubject}`;
    if (toneStyle === 'formal') {
      actionText = `por medio del presente, se remite la propuesta de anteproyecto (${deliverableText})${projText}.`;
      closingText = 'Quedo atento a sus observaciones y comentarios para dar continuidad.';
    } else {
      actionText = `te hago entrega del anteproyecto (${deliverableText})${projText}.`;
      closingText = 'Quedo al pendiente de tus notas o visto bueno para avanzar.';
    }
  }

  const cleanLink = cloudLink.trim();
  const linkSection = cleanLink 
    ? `\n\nPuedes consultar o descargar los archivos completos en el siguiente enlace:\n${cleanLink}`
    : '';

  const cleanDeadline = deadline.trim();
  const deadlineSection = cleanDeadline
    ? `\n\nAgradeceré contar con tus comentarios o visto bueno a más tardar el ${cleanDeadline} para dar continuidad al programa.`
    : '';

  const emailBody = `${greeting},\n\n${actionText}${linkSection}\n\n${closingText}${deadlineSection}\n\nAtte.\n\nArq. Rembrandt Blanco Arrambide`;
  
  const whatsappLink = cleanLink ? ` Enlace: ${cleanLink}` : '';
  const whatsappDeadline = cleanDeadline ? ` (Meta: ${cleanDeadline})` : '';
  const whatsappMessage = `${greeting}, te acabo de enviar por correo ${deliverableText} (${method.toLowerCase()})${projClean ? ` de ${projClean}` : ''}.${whatsappLink}${whatsappDeadline} ${closingText} ¡Saludos!`;

  const idea = `Envío de ${deliverableText} para ${method.toLowerCase()}${projText}.${cleanLink ? ` Descarga: ${cleanLink}` : ''}${cleanDeadline ? ` Plazo: ${cleanDeadline}` : ''}`;

  return {
    emailSubject: subject,
    emailBody,
    whatsappMessage,
    idea,
    improvedIdea: `Envío estándar de ${deliverableText} para ${method.toLowerCase()}${projText}.`
  };
};

const getDBValue = (obj: any, keysToCheck: string[] | string): any => {
    if (!obj) return undefined;
    const keys = Array.isArray(keysToCheck) ? keysToCheck : [keysToCheck];
    
    for (const keyName of keys) {
        const target = keyName.trim().toLowerCase();
        const foundKey = Object.keys(obj).find(k => k.trim().toLowerCase() === target);
        if (foundKey && obj[foundKey] !== undefined && obj[foundKey] !== null) {
            return obj[foundKey];
        }
    }
    
    for (const keyName of keys) {
        const target = keyName.trim().toLowerCase();
        const foundKey = Object.keys(obj).find(k => {
            const normalizedK = k.trim().toLowerCase();
            return normalizedK.includes(target) || target.includes(normalizedK);
        });
        if (foundKey && obj[foundKey] !== undefined && obj[foundKey] !== null) {
            return obj[foundKey];
        }
    }
    return undefined;
};

const stripHtml = (html: string): string => {
    try {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        doc.querySelectorAll('li').forEach(li => { li.innerHTML = `\n• ${li.innerHTML}`; });
        doc.querySelectorAll('br, p, div').forEach(el => {
            const newline = doc.createTextNode('\n');
            el.parentNode?.replaceChild(newline, el);
        });
        return (doc.body.textContent || "").replace(/\n\s*\n/g, '\n').trim();
    } catch (e) {
        return html;
    }
};

interface EmailGeneratorProps {
    attachedImages: ReferenceImage[];
    onAttachmentsChange: (images: ReferenceImage[]) => void;
}

interface Contact {
    id: string | number;
    [key: string]: any;
}

const DEFAULT_TITLES = ['', 'Sr.', 'Sra.', 'Lic.', 'Arq.', 'Ing.', 'Dr.', 'Dra.', 'C.P.'];
const emailDomains = ['@javer', '@gmail', '@outlook', '@hotmail', 'Personalizado'];
const emailTlds = ['.com.mx', '.com', '.es', '.mx'];
const predefinedProjects = ['Valle de Los Encinos', 'Cumbre del Norte', 'Xandora'];

const EmailGenerator: React.FC<EmailGeneratorProps> = ({ attachedImages, onAttachmentsChange }) => {
    const { config, updateConfig, googleApiConfig } = useLinks();
    
    // Modo de trabajo: 'ai' = Redactor Libre con IA (primero por defecto), 'quick' = Entregas y Formatos (0s)
    const [activeMode, setActiveMode] = useState<'ai' | 'quick'>('ai');
    const [isAiSectionOpen, setIsAiSectionOpen] = useState(true);
    const [isQuickSectionOpen, setIsQuickSectionOpen] = useState(true);

    const [idea, setIdea] = useState('');
    const [previousEmail, setPreviousEmail] = useState('');
    const [project, setProject] = useState('');
    const [tone, setTone] = useState<Tone>('Profesional');
    const [messageLength, setMessageLength] = useState<MessageLength>('Reducido');
    const [showHistory, setShowHistory] = useState(false);
    const [showPreviousContext, setShowPreviousContext] = useState(false);
    const history = config.aiHistory?.filter(h => h.type === 'email') || [];
    
    // Contactos con caché inicial instantáneo
    const [contacts, setContacts] = useState<Contact[]>(() => {
        try {
            const cached = localStorage.getItem('cached-contacts');
            return cached ? JSON.parse(cached) : [];
        } catch { return []; }
    });

    const [fraccionamientosList, setFraccionamientosList] = useState<string[]>(() => {
        try {
            const cached = localStorage.getItem('cached-fraccionamientos');
            return cached ? JSON.parse(cached) : predefinedProjects;
        } catch { return predefinedProjects; }
    });

    const [favorites, setFavorites] = useState<string[]>(() => {
        try { 
            const saved = localStorage.getItem('contact-favorites');
            return saved ? JSON.parse(saved) : []; 
        } catch { return []; }
    });

    const [contactSearchQuery, setContactSearchQuery] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);

    const toggleFavorite = (e: React.MouseEvent, contactName: string) => {
        e.stopPropagation();
        if (!contactName) return;
        const targetName = contactName.trim();
        setFavorites(prev => {
            const isFav = prev.some(f => f.trim() === targetName);
            const newFavs = isFav ? prev.filter(f => f.trim() !== targetName) : [...prev, targetName];
            localStorage.setItem('contact-favorites', JSON.stringify(newFavs));
            return newFavs;
        });
    };

    const [selectedContactIndex, setSelectedContactIndex] = useState<string>('');
    const [isContactsLoading, setIsContactsLoading] = useState(false);
    const [isSavingContact, setIsSavingContact] = useState(false);
    const [recipientTitle, setRecipientTitle] = useState('Arq.');
    const [titlesList] = useState<string[]>(DEFAULT_TITLES);
    const [recipientName, setRecipientName] = useState('Erik Gabino');
    const [recipientGender, setRecipientGender] = useState<Gender>('M');
    const [recipientEmailUser, setRecipientEmailUser] = useState('egabino');
    const [recipientEmailDomain, setRecipientEmailDomain] = useState('@javer');
    const [customDomain, setCustomDomain] = useState('');
    const [recipientEmailTld, setRecipientEmailTld] = useState('.com.mx');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
    const [originalContent, setOriginalContent] = useState<GeneratedContent | null>(null);
    const [alternativeSubjects, setAlternativeSubjects] = useState<string[]>([]);
    const [copied, setCopied] = useState<CopiedState>(null);
    
    // Opciones de entregables
    const [selectedDeliverables, setSelectedDeliverables] = useState<DeliverableType[]>(['Planos en AutoCAD', 'Planos en PDF']);
    const [selectedMethod, setSelectedMethod] = useState<DeliveryMethod>('Revisión');
    const [activePresetId, setActivePresetId] = useState<string | null>('qp-3');
    const [cloudLink, setCloudLink] = useState('');
    const [deadline, setDeadline] = useState('');
    const [templateTone, setTemplateTone] = useState<'colaborativo' | 'formal'>('colaborativo');
    const [customPresets, setCustomPresets] = useState<QuickPreset[]>(() => {
        try {
            const saved = localStorage.getItem('custom-quick-presets');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [useNickname, setUseNickname] = useState(true);
    const [isAdjusting, setIsAdjusting] = useState<'email' | 'whatsapp' | null>(null);

    const [contextMenu, setContextMenu] = useState<{
        visible: boolean;
        x: number;
        y: number;
        selectedText: string;
        targetType: 'email' | 'whatsapp' | 'improvedIdea';
        field: 'emailBody' | 'emailSubject' | 'whatsappMessage' | 'improvedIdea';
    }>({ visible: false, x: 0, y: 0, selectedText: '', targetType: 'email', field: 'emailBody' });

    const [isProcessingSelection, setIsProcessingSelection] = useState(false);
    const [dictionary, setDictionary] = useState<string[]>([]);
    const [suggestion, setSuggestion] = useState('');
    const ideaRef = useRef<HTMLTextAreaElement>(null);

    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);
    const baseIdeaRef = useRef<string>('');

    const toggleListening = useCallback(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            toast.error("Tu navegador no soporta dictado por voz (Web Speech API). Intenta en Chrome o Edge.");
            return;
        }

        if (isListening) {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
            setIsListening(false);
            toast.info("Dictado pausado.");
            return;
        }

        try {
            baseIdeaRef.current = idea;
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'es-MX';

            recognition.onstart = () => {
                setIsListening(true);
                toast.success("Escuchando... Puedes dictar tu mensaje.");
            };

            recognition.onresult = (event: any) => {
                const transcript = Array.from(event.results)
                    .map((res: any) => res[0].transcript)
                    .join('');
                const prefix = baseIdeaRef.current ? (baseIdeaRef.current.trim() + ' ') : '';
                setIdea(prefix + transcript);
            };

            recognition.onerror = (event: any) => {
                console.error("Error dictado:", event.error);
                if (event.error !== 'no-speech') {
                    toast.error(`Error en micrófono: ${event.error}`);
                }
                setIsListening(false);
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            recognitionRef.current = recognition;
            recognition.start();
        } catch (e) {
            console.error("Speech recognition error:", e);
            toast.error("No se pudo acceder al micrófono.");
            setIsListening(false);
        }
    }, [isListening, idea]);

    useEffect(() => {
        return () => {
            if (recognitionRef.current) recognitionRef.current.stop();
            if (aiRecognitionRef.current) aiRecognitionRef.current.stop();
        };
    }, []);

    // IA Consejera
    const [showAiConsultant, setShowAiConsultant] = useState(false);
    const [aiConsultantMessages, setAiConsultantMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string; suggestedIdea?: string }>>([
        {
            role: 'assistant',
            text: '¡Hola! Soy tu IA Consejera de Redacción. Puedes preguntarme orientación sobre el tono, pedirme ajustar la intención, o hablarme por micrófono. Cuando estemos de acuerdo con una sugerencia, pulsa "Aplicar a la Idea y Regenerar".'
        }
    ]);
    const [aiInput, setAiInput] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [isAiListening, setIsAiListening] = useState(false);
    const aiRecognitionRef = useRef<any>(null);
    const baseAiInputRef = useRef<string>('');

    const toggleAiListening = useCallback(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            toast.error("Tu navegador no soporta dictado por voz (Web Speech API).");
            return;
        }

        if (isAiListening) {
            if (aiRecognitionRef.current) aiRecognitionRef.current.stop();
            setIsAiListening(false);
            return;
        }

        try {
            baseAiInputRef.current = aiInput;
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'es-MX';

            recognition.onstart = () => {
                setIsAiListening(true);
                toast.success("Escuchando para la IA Consejera...");
            };

            recognition.onresult = (event: any) => {
                const transcript = Array.from(event.results)
                    .map((res: any) => res[0].transcript)
                    .join('');
                const prefix = baseAiInputRef.current ? (baseAiInputRef.current.trim() + ' ') : '';
                setAiInput(prefix + transcript);
            };

            recognition.onerror = (event: any) => {
                console.error("Error dictado IA:", event.error);
                setIsAiListening(false);
            };

            recognition.onend = () => {
                setIsAiListening(false);
            };

            aiRecognitionRef.current = recognition;
            recognition.start();
        } catch (e) {
            console.error(e);
            toast.error("No se pudo activar el micrófono para la IA.");
            setIsAiListening(false);
        }
    }, [isAiListening, aiInput]);

    const fetchDictionary = useCallback(async () => {
        try {
            if (!SUPABASE_CONFIG.URL || !SUPABASE_CONFIG.KEY) return;
            const response = await fetch(`${SUPABASE_CONFIG.URL}/rest/v1/Diccionario?select=word`, {
                headers: { 'apikey': SUPABASE_CONFIG.KEY, 'Authorization': `Bearer ${SUPABASE_CONFIG.KEY}`, 'Content-Type': 'application/json' }
            });
            if (response.ok) {
                const data = await response.json();
                setDictionary(data.map((d: any) => d.word));
            }
        } catch (err) { console.warn(err); }
    }, []);

    const saveToDictionary = async (text: string) => {
        const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 3 && !['este', 'esta', 'para', 'como', 'todo'].includes(w));
        const uniqueWords = Array.from(new Set(words));
        if (uniqueWords.length === 0 || !SUPABASE_CONFIG.URL) return;
        try {
            await fetch(`${SUPABASE_CONFIG.URL}/rest/v1/Diccionario`, {
                method: 'POST',
                headers: { 'apikey': SUPABASE_CONFIG.KEY, 'Authorization': `Bearer ${SUPABASE_CONFIG.KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(uniqueWords.map(w => ({ word: w })))
            });
            fetchDictionary();
        } catch (e) { console.warn(e); }
    };

    const fetchContacts = useCallback(async () => {
        setIsContactsLoading(true);
        try {
            if (!SUPABASE_CONFIG.URL || !SUPABASE_CONFIG.KEY) return;
            const response = await fetch(`${SUPABASE_CONFIG.URL}/rest/v1/Contactos?select=*`, {
                headers: { 'apikey': SUPABASE_CONFIG.KEY, 'Authorization': `Bearer ${SUPABASE_CONFIG.KEY}`, 'Content-Type': 'application/json' }
            });
            if (response.ok) {
                const data = await response.json();
                setContacts(data);
                try { localStorage.setItem('cached-contacts', JSON.stringify(data)); } catch {}
            }
        } catch (err) { console.warn(err); } finally { setIsContactsLoading(false); }
    }, []);

    const fetchFraccionamientos = useCallback(async () => {
        try {
            if (!SUPABASE_CONFIG.URL || !SUPABASE_CONFIG.KEY) { setFraccionamientosList(predefinedProjects); return; }
            const response = await fetch(`${SUPABASE_CONFIG.URL}/rest/v1/Fraccionamientos?select=*`, {
                headers: { 'apikey': SUPABASE_CONFIG.KEY, 'Authorization': `Bearer ${SUPABASE_CONFIG.KEY}`, 'Content-Type': 'application/json' }
            });
            if (response.ok) {
                const data = await response.json();
                const uniqueProjects = Array.from(new Set(data.map((item: any) => {
                    const name = getDBValue(item, 'fraccionamiento');
                    const sector = getDBValue(item, 'sector');
                    return sector ? `${name} - ${sector}` : name;
                }).filter(Boolean))) as string[];
                uniqueProjects.sort();
                setFraccionamientosList(uniqueProjects);
                try { localStorage.setItem('cached-fraccionamientos', JSON.stringify(uniqueProjects)); } catch {}
            }
        } catch (err) { setFraccionamientosList(predefinedProjects); }
    }, []);

    useEffect(() => { 
        fetchContacts(); 
        fetchFraccionamientos(); 
        fetchDictionary(); 
    }, [fetchContacts, fetchFraccionamientos, fetchDictionary]);

    const sortedContacts = useMemo(() => {
        return [...contacts].sort((a, b) => {
            const nameA = String(getDBValue(a, 'cliente') || '').trim();
            const nameB = String(getDBValue(b, 'cliente') || '').trim();
            const isFavA = favorites.some(f => f.trim() === nameA);
            const isFavB = favorites.some(f => f.trim() === nameB);
            
            if (isFavA && !isFavB) return -1;
            if (!isFavA && isFavB) return 1;
            return nameA.localeCompare(nameB);
        });
    }, [contacts, favorites]);

    // Filtrado predictivo en tiempo real
    const filteredSearchContacts = useMemo(() => {
        if (!contactSearchQuery.trim()) return [];
        const q = contactSearchQuery.toLowerCase().trim();
        return sortedContacts.filter(c => {
            const name = String(getDBValue(c, ['cliente', 'nombre']) || '').toLowerCase();
            const email = String(getDBValue(c, 'correo') || '').toLowerCase();
            const title = String(getDBValue(c, ['lic', 'titulo']) || '').toLowerCase();
            return name.includes(q) || email.includes(q) || title.includes(q);
        }).slice(0, 8);
    }, [sortedContacts, contactSearchQuery]);

    const selectContactByIndex = useCallback((idx: number, list: Contact[]) => {
        const contact = list[idx];
        if (!contact) return;
        setSelectedContactIndex(String(idx));
        setRecipientName(String(getDBValue(contact, ['cliente', 'nombre']) || ''));
        const dbTitle = getDBValue(contact, ['lic', 'titulo']) || '';
        setRecipientTitle(dbTitle);
        const gen = String(getDBValue(contact, 'genero') || '').toLowerCase();
        setRecipientGender(gen.startsWith('m') || gen.includes('fem') || gen.includes('femenino') ? 'F' : 'M');
        const email = getDBValue(contact, 'correo') || '';
        if (email && email.includes('@')) {
            const [u, dFull] = email.split('@');
            setRecipientEmailUser(u);
            if (dFull.includes('javer')) setRecipientEmailDomain('@javer');
            else if (dFull.includes('gmail')) setRecipientEmailDomain('@gmail');
            else if (dFull.includes('outlook')) setRecipientEmailDomain('@outlook');
            else if (dFull.includes('hotmail')) setRecipientEmailDomain('@hotmail');
            else { setRecipientEmailDomain('Personalizado'); setCustomDomain(dFull.split('.')[0]); }
            if (dFull.endsWith('.com.mx')) setRecipientEmailTld('.com.mx');
            else if (dFull.endsWith('.com')) setRecipientEmailTld('.com');
        }
        setContactSearchQuery('');
        setIsSearchFocused(false);
    }, []);

    const handleContactSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const idxVal = e.target.value;
        if (idxVal === '') {
            setSelectedContactIndex('');
            setRecipientName('');
            setRecipientTitle('');
            setRecipientEmailUser('');
            return;
        }
        const idx = parseInt(idxVal, 10);
        selectContactByIndex(idx, sortedContacts);
    };

    // Seleccionar a Erik automáticamente por defecto al cargar contactos
    const hasAutoSelectedErikRef = useRef(false);
    useEffect(() => {
        if (sortedContacts.length > 0 && !hasAutoSelectedErikRef.current) {
            const erikIdx = sortedContacts.findIndex(c => {
                const name = String(getDBValue(c, ['cliente', 'nombre']) || '').toLowerCase();
                return name.includes('erik') || name.includes('eric');
            });
            if (erikIdx !== -1) {
                hasAutoSelectedErikRef.current = true;
                selectContactByIndex(erikIdx, sortedContacts);
            }
        }
    }, [sortedContacts, selectContactByIndex]);

    const handleResetAll = useCallback(() => {
        setIdea('');
        setPreviousEmail('');
        setProject('');
        setCloudLink('');
        setDeadline('');
        setTemplateTone('colaborativo');
        setGeneratedContent(null);
        setOriginalContent(null);
        setAlternativeSubjects([]);
        setError(null);
        setSuggestion('');
        setSelectedDeliverables(['Planos en AutoCAD', 'Planos en PDF']);
        setSelectedMethod('Revisión');
        setActivePresetId('qp-3');
        onAttachmentsChange([]);

        // Restablecer a Erik por defecto
        const erikIdx = sortedContacts.findIndex(c => {
            const name = String(getDBValue(c, ['cliente', 'nombre']) || '').toLowerCase();
            return name.includes('erik') || name.includes('eric');
        });
        if (erikIdx !== -1) {
            selectContactByIndex(erikIdx, sortedContacts);
        } else {
            setSelectedContactIndex('');
            setRecipientName('Erik Gabino');
            setRecipientTitle('Arq.');
            setRecipientGender('M');
            setRecipientEmailUser('egabino');
            setRecipientEmailDomain('@javer');
            setRecipientEmailTld('.com.mx');
        }

        toast.info("Campos reiniciados (Erik seleccionado por defecto)");
    }, [onAttachmentsChange, sortedContacts, selectContactByIndex]);

    const fullRecipientEmail = useMemo(() => {
        if (!recipientEmailUser) return '';
        const domainPart = recipientEmailDomain === 'Personalizado' ? `@${customDomain}` : recipientEmailDomain;
        return `${recipientEmailUser}${domainPart}${recipientEmailTld}`;
    }, [recipientEmailUser, recipientEmailDomain, customDomain, recipientEmailTld]);

    const quickContacts = useMemo(() => {
        const list: { name: string; index: number; isErik: boolean }[] = [];
        const seenNames = new Set<string>();

        // 1. Siempre incluir a Erik primero
        const erikIdx = sortedContacts.findIndex(c => {
            const n = String(getDBValue(c, ['cliente', 'nombre']) || '').toLowerCase();
            return n.includes('erik') || n.includes('eric');
        });
        if (erikIdx !== -1) {
            const name = String(getDBValue(sortedContacts[erikIdx], ['cliente', 'nombre']) || 'Erik Gabino');
            seenNames.add(name.toLowerCase());
            list.push({ name, index: erikIdx, isErik: true });
        }

        // 2. Favoritos marcados con estrella
        favorites.forEach(favName => {
            if (seenNames.has(favName.toLowerCase())) return;
            const idx = sortedContacts.findIndex(c => String(getDBValue(c, ['cliente', 'nombre']) || '').trim() === favName.trim());
            if (idx !== -1 && list.length < 5) {
                seenNames.add(favName.toLowerCase());
                list.push({ name: favName, index: idx, isErik: false });
            }
        });

        // 3. Primeros de la lista si hay espacio
        sortedContacts.forEach((c, idx) => {
            if (list.length >= 5) return;
            const name = String(getDBValue(c, ['cliente', 'nombre']) || '').trim();
            if (name && !seenNames.has(name.toLowerCase())) {
                seenNames.add(name.toLowerCase());
                list.push({ name, index: idx, isErik: false });
            }
        });

        return list;
    }, [sortedContacts, favorites]);

    const getPresetGreeting = useCallback(() => {
        const hour = new Date().getHours();
        const timeGreeting = hour < 12 ? 'Buen día' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';
        
        const idx = parseInt(selectedContactIndex, 10);
        const contact = !isNaN(idx) ? sortedContacts[idx] : null;
        const dataApodo = contact ? getDBValue(contact, ['apodo', 'alias']) : null;
        
        const finalRecipient = (useNickname && dataApodo) 
            ? dataApodo 
            : (recipientName ? (recipientTitle ? `${recipientTitle} ${recipientName}` : recipientName) : '');
        return finalRecipient ? `${timeGreeting} ${finalRecipient}` : timeGreeting;
    }, [selectedContactIndex, sortedContacts, useNickname, recipientName, recipientTitle]);

    const toggleDeliverable = useCallback((item: DeliverableType) => {
        setActivePresetId(null);
        setSelectedDeliverables(prev => 
            prev.includes(item) 
                ? (prev.length > 1 ? prev.filter(x => x !== item) : prev) 
                : [...prev, item]
        );
    }, []);

    const handleSelectMethod = useCallback((m: DeliveryMethod) => {
        setActivePresetId(null);
        setSelectedMethod(m);
    }, []);

    // Vista previa en vivo del formato rápido
    const livePreview = useMemo(() => {
        const greeting = getPresetGreeting();
        return buildPresetMessage(selectedDeliverables, selectedMethod, greeting, project, {
            cloudLink,
            deadline,
            toneStyle: templateTone
        });
    }, [getPresetGreeting, selectedDeliverables, selectedMethod, project, cloudLink, deadline, templateTone]);

    // Transferir formato estándar al Redactor IA para personalizarlo
    const handleTransferToAi = useCallback(() => {
        setIdea(livePreview.idea);
        const generated: GeneratedContent = {
            emailSubject: livePreview.emailSubject,
            emailBody: livePreview.emailBody,
            whatsappMessage: livePreview.whatsappMessage,
            improvedIdea: livePreview.improvedIdea
        };
        setGeneratedContent(generated);
        setOriginalContent(generated);
        setActiveMode('ai');
        toast.success('Formato transferido al Redactor IA para afinarlo');
    }, [livePreview]);

    const handleSelectQuickPreset = useCallback((qp: QuickPreset) => {
        setActivePresetId(qp.id);
        setSelectedDeliverables(qp.deliverables);
        setSelectedMethod(qp.method);
        toast.success(`Plantilla "${qp.name}" aplicada`);
    }, []);

    const handleSaveCustomPreset = useCallback(() => {
        const name = window.prompt("Nombre para tu nueva plantilla rápida (ej. Planos DWG + PDF a Obra):");
        if (!name || !name.trim()) return;
        const newPreset: QuickPreset = {
            id: 'custom-' + Date.now(),
            name: name.trim(),
            deliverables: [...selectedDeliverables],
            method: selectedMethod
        };
        const updated = [...customPresets, newPreset];
        setCustomPresets(updated);
        localStorage.setItem('custom-quick-presets', JSON.stringify(updated));
        setActivePresetId(newPreset.id);
        toast.success(`Plantilla "${newPreset.name}" guardada en favoritas`);
    }, [selectedDeliverables, selectedMethod, customPresets]);

    const handleDeleteCustomPreset = useCallback((e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const updated = customPresets.filter(p => p.id !== id);
        setCustomPresets(updated);
        localStorage.setItem('custom-quick-presets', JSON.stringify(updated));
        if (activePresetId === id) setActivePresetId(null);
        toast.info("Plantilla personalizada eliminada");
    }, [customPresets, activePresetId]);

    // Apertura en Outlook Web
    const handleOpenOutlookWeb = useCallback((customSubject?: string, customBody?: string) => {
        const subjectText = customSubject || (generatedContent ? generatedContent.emailSubject : livePreview.emailSubject);
        const bodyText = customBody || (generatedContent ? generatedContent.emailBody : livePreview.emailBody);
        
        const subject = encodeURIComponent(subjectText);
        const body = encodeURIComponent(stripHtml(bodyText));
        const to = encodeURIComponent(fullRecipientEmail);
        const url = `https://outlook.office.com/mail/deeplink/compose?to=${to}&subject=${subject}&body=${body}`;
        window.open(url, '_blank');
    }, [generatedContent, livePreview, fullRecipientEmail]);

    // Copiado enriquecido (HTML + texto plano)
    const handleCopyToClipboard = async (text: string, type: CopiedState) => {
        const plainText = stripHtml(text);
        const htmlFormatted = `<div style="font-family: Calibri, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 11pt; color: #111827; line-height: 1.6;">${
            plainText
                .split('\n\n')
                .map(p => `<p style="margin: 0 0 10pt 0;">${p.replace(/\n/g, '<br>')}</p>`)
                .join('')
        }</div>`;

        try {
            if (navigator.clipboard && window.ClipboardItem) {
                const blobHtml = new Blob([htmlFormatted], { type: 'text/html' });
                const blobText = new Blob([plainText], { type: 'text/plain' });
                await navigator.clipboard.write([
                    new ClipboardItem({
                        'text/html': blobHtml,
                        'text/plain': blobText
                    })
                ]);
            } else {
                await navigator.clipboard.writeText(plainText);
            }
        } catch (e) {
            await navigator.clipboard.writeText(plainText);
        }
        setCopied(type);
        setTimeout(() => setCopied(null), 2000);
        toast.success(type?.includes('email') ? "Copiado con formato enriquecido (listo para Outlook)" : "Copiado al portapapeles");
    };

    // Generador con IA (incluyendo imágenes adjuntas y micro-ajustes)
    const handleGenerate = useCallback(async (overrideIdea?: string, adjustInstruction?: string) => {
        const targetIdea = typeof overrideIdea === 'string' ? overrideIdea : idea;
        if (!targetIdea.trim() && !previousEmail.trim() && attachedImages.length === 0) { 
            toast.error('Introduce una idea o adjunta una imagen de referencia.'); 
            return; 
        }
        setIsLoading(true); setError(null);
        try {
            const apiKey = googleApiConfig?.apiKey || process.env.GEMINI_API_KEY;
            const ai = new GoogleGenAI({ apiKey, baseUrl: `${window.location.origin}/api/proxy/google` });
            
            const hour = new Date().getHours();
            const timeGreeting = hour < 12 ? 'Buen día' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';
            
            const idx = parseInt(selectedContactIndex, 10);
            const contact = !isNaN(idx) ? sortedContacts[idx] : null;
            const dataApodo = contact ? getDBValue(contact, ['apodo', 'alias']) : null;
            
            const finalRecipient = (useNickname && dataApodo) ? dataApodo : recipientName;
            const greeting = finalRecipient ? `${timeGreeting} ${finalRecipient}` : timeGreeting;
            
            const systemInstruction = `Eres un experto en comunicación ejecutiva y estratégica para el sector inmobiliario y de arquitectura.
            Debes generar respuestas en formato JSON siguiendo estrictamente las reglas de estilo y tono del Arq. Rembrandt Blanco Arrambide.`;
            
            const userPrompt = `INSTRUCCIONES CRÍTICAS:
            1. SALUDO: Comienza exactamente con "${greeting}".
            2. FORMATO: Usa DOBLE SALTO DE LÍNEA (\\n\\n) después del saludo y entre CADA párrafo.
            3. ESTRUCTURA: Usa listas numeradas o viñetas claras para puntos importantes. No amontones el texto.
            4. FIRMA: Termina SIEMPRE con: "Atte.\\n\\nArq. Rembrandt Blanco Arrambide".
            5. CONTEXTO: Proyecto: "${project}". Destinatario (nombre/apodo a usar): "${finalRecipient}".
               IMPORTANTE: Si está activo el uso de apodo o nombre corto, refiérete al destinatario siempre por su apodo ("${finalRecipient}") en lugar de su nombre formal completo.
            6. IDEA A DESARROLLAR: "${targetIdea}". 
            7. CONTEXTO ANTERIOR: "${previousEmail}".
            ${adjustInstruction ? `8. AJUSTE DE ESTILO SOLICITADO: "${adjustInstruction}".` : ''}
            ${attachedImages.length > 0 ? `9. IMÁGENES ADJUNTAS: Se proporcionan ${attachedImages.length} imágenes (planos, renders o capturas). Analízalas e incorpora detalles relevantes en el mensaje.` : ''}
            10. TONO: ${tone}. LONGITUD: ${messageLength}.

            Genera un objeto JSON con:
            - emailSubject: Asunto principal del correo claro y profesional
            - emailBody: Cuerpo del correo (con doble salto de línea y firma)
            - whatsappMessage: Versión ejecutiva y ágil para WhatsApp
            - improvedIdea: Resumen sintético de la idea
            - alternativeSubjects: Array de 2 asuntos alternativos (uno más directo y otro formal)`;

            const contentsParts: any[] = [{ text: userPrompt }];

            if (attachedImages && attachedImages.length > 0) {
                attachedImages.forEach(img => {
                    if (img.base64) {
                        contentsParts.push({
                            inlineData: {
                                mimeType: img.mimeType || 'image/jpeg',
                                data: img.base64
                            }
                        });
                    }
                });
            }

            const response = await generateContentWithFallback(ai, {
                model: 'gemini-3.1-flash-lite',
                contents: [{ role: 'user', parts: contentsParts }],
                config: {
                    systemInstruction,
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            emailSubject: { type: Type.STRING },
                            emailBody: { type: Type.STRING },
                            whatsappMessage: { type: Type.STRING },
                            improvedIdea: { type: Type.STRING },
                            alternativeSubjects: {
                                type: Type.ARRAY,
                                items: { type: Type.STRING }
                            }
                        },
                        required: ["emailSubject", "emailBody", "whatsappMessage", "improvedIdea"]
                    }
                }
            });

            const textResponse = response.text || '';
            if (!textResponse) throw new Error("La IA no devolvió respuesta.");

            const parsed = JSON.parse(cleanJsonResponse(textResponse.trim()));
            setGeneratedContent(parsed);
            setOriginalContent(parsed);
            if (parsed.alternativeSubjects && Array.isArray(parsed.alternativeSubjects)) {
                setAlternativeSubjects(parsed.alternativeSubjects);
            } else {
                setAlternativeSubjects([]);
            }
            saveToDictionary(targetIdea);
            
            updateConfig(prev => ({ ...prev, aiHistory: [{ id: Date.now().toString(), type: 'email' as const, original: targetIdea, result: JSON.stringify(parsed), timestamp: Date.now() }, ...(prev.aiHistory || [])].slice(0, 50) }));
            toast.success("Mensajes generados con éxito");
        } catch (e: any) { 
            console.error(e);
            const friendlyMsg = getFriendlyAiErrorMessage(e, !!googleApiConfig?.apiKey);
            setError(friendlyMsg); 
            toast.error("Error al generar: " + friendlyMsg);
        } finally { setIsLoading(false); }
    }, [idea, previousEmail, tone, messageLength, recipientName, project, useNickname, selectedContactIndex, sortedContacts, googleApiConfig, updateConfig, attachedImages]);

    // Micro-ajustes rápidos con IA
    const handleQuickAdjust = (type: 'shorter' | 'formal' | 'urgent' | 'reminder') => {
        if (!generatedContent) return;
        const instructions = {
            shorter: 'Haz el mensaje más sintético, directo y breve, sin perder los datos clave.',
            formal: 'Ajusta el texto a un tono estrictamente formal e institucional de alta dirección.',
            urgent: 'Añade un sentido de prioridad respetuoso pero claro solicitando visto bueno o respuesta oportuna.',
            reminder: 'Agrega un recordatorio amable para solicitar confirmación de recepción y seguimiento.'
        };
        handleGenerate(idea || generatedContent.emailBody, instructions[type]);
    };

    const handleSendAiConsultantMessage = async (userPromptText?: string) => {
        const messageText = userPromptText || aiInput;
        if (!messageText.trim()) return;

        const newMessages = [...aiConsultantMessages, { role: 'user' as const, text: messageText }];
        setAiConsultantMessages(newMessages);
        setAiInput('');
        setIsAiLoading(true);

        try {
            const apiKey = googleApiConfig?.apiKey || process.env.GEMINI_API_KEY;
            const ai = new GoogleGenAI({ apiKey, baseUrl: `${window.location.origin}/api/proxy/google` });

            const systemInstruction = `Eres una IA consejera y asesora estratégica de comunicación ejecutiva. 
            Tu objetivo es orientar al usuario para definir el tono exacto, intención y sugerencias para redactar un correo o mensaje perfecto.
            
            CONTEXTO ACTUAL DEL REDACTOR:
            - Destinatario: "${recipientName}" (${recipientTitle})
            - Proyecto: "${project}"
            - Idea principal actual: "${idea}"
            - Contexto previo: "${previousEmail}"
            - Tono seleccionado: "${tone}"
            
            Responde en formato JSON con:
            1. adviceText: Tu consejo estratégico breve (máximo 2 párrafos).
            2. refinedIdea: La sugerencia pulida y explícita de la idea o instrucción para colocar en el redactor y generar el correo en ese tono específico.`;

            const response = await generateContentWithFallback(ai, {
                model: 'gemini-3.1-flash-lite',
                contents: [{ role: 'user', parts: [{ text: `Mensaje del usuario: "${messageText}". Conversación previa: ${JSON.stringify(newMessages.slice(-3))}` }] }],
                config: {
                    systemInstruction,
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            adviceText: { type: Type.STRING },
                            refinedIdea: { type: Type.STRING }
                        },
                        required: ["adviceText", "refinedIdea"]
                    }
                }
            });

            const textRes = response.text || '';
            const parsed = JSON.parse(cleanJsonResponse(textRes.trim()));

            setAiConsultantMessages(prev => [
                ...prev,
                {
                    role: 'assistant',
                    text: parsed.adviceText,
                    suggestedIdea: parsed.refinedIdea
                }
            ]);
        } catch (e: any) {
            console.error(e);
            toast.error("Error al consultar la IA Consejera");
        } finally {
            setIsAiLoading(false);
        }
    };

    const handleApplyIdeaAndRegenerate = (suggestedIdea: string) => {
        setIdea(suggestedIdea);
        toast.success("Sugerencia aplicada. Regenerando mensajes...");
        setActiveMode('ai');
        handleGenerate(suggestedIdea);
    };

    const handleSendEmail = () => {
        const bodyContent = generatedContent ? generatedContent.emailBody : livePreview.emailBody;
        const subjectContent = generatedContent ? generatedContent.emailSubject : livePreview.emailSubject;
        window.location.href = `mailto:${fullRecipientEmail}?subject=${encodeURIComponent(subjectContent)}&body=${encodeURIComponent(stripHtml(bodyContent))}`;
    };

    const handleSendWhatsApp = (customMsg?: string) => {
        const msg = customMsg || (generatedContent ? generatedContent.whatsappMessage : livePreview.whatsappMessage);
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); setIsDraggingOver(false);
        const file = e.dataTransfer.files[0];
        if (file?.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                onAttachmentsChange([...attachedImages, { 
                    name: file.name, 
                    base64: (ev.target?.result as string).split(',')[1], 
                    mimeType: file.type, 
                    preview: ev.target?.result as string 
                }]);
                toast.success(`Imagen "${file.name}" adjuntada para análisis con IA`);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveNewContact = async () => {
        if (!recipientName) { toast.error("Ingresa un nombre"); return; }
        setIsSavingContact(true);
        try {
            await fetch(`${SUPABASE_CONFIG.URL}/rest/v1/Contactos`, {
                method: 'POST',
                headers: { 'apikey': SUPABASE_CONFIG.KEY, 'Authorization': `Bearer ${SUPABASE_CONFIG.KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ cliente: recipientName, lic: recipientTitle, genero: recipientGender === 'M' ? 'Hombre' : 'Mujer', correo: fullRecipientEmail })
            });
            fetchContacts();
            toast.success("Contacto guardado");
        } catch (e) { console.error(e); toast.error("Error al guardar contacto"); } finally { setIsSavingContact(false); }
    };

    const deleteHistoryItem = (id: string) => updateConfig(prev => ({ ...prev, aiHistory: prev.aiHistory?.filter(h => h.id !== id) }));

    const handleContextMenu = (e: React.MouseEvent, type: 'email' | 'whatsapp', field: 'emailBody' | 'emailSubject' | 'whatsappMessage') => {
        e.preventDefault();
        const sel = window.getSelection()?.toString().trim() || '';
        setContextMenu({ visible: true, x: e.clientX, y: e.clientY, selectedText: sel, targetType: type, field: field });
    };

    const handleSelectionAction = async (action: string, payload?: string) => {
        if (!generatedContent) return;
        if (action === 'adjust') setIsAdjusting(contextMenu.targetType as any);
        else setIsProcessingSelection(true);
        setContextMenu(prev => ({ ...prev, visible: false }));
        try {
            const apiKey = googleApiConfig?.apiKey || process.env.GEMINI_API_KEY;
            const ai = new GoogleGenAI({ apiKey, baseUrl: `${window.location.origin}/api/proxy/google` });
            const prompt = `Contexto: "${generatedContent[contextMenu.field]}". Acción: ${action} sobre "${contextMenu.selectedText}". ${payload ? `Usar: ${payload}` : ''}. Responde solo el texto completo ajustado.`;
            const response = await generateContentWithFallback(ai, {
                model: "gemini-3.1-flash-lite",
                contents: [{ role: 'user', parts: [{ text: prompt }] }]
            });
            const resultText = response.text || '';
            setGeneratedContent(prev => prev ? ({ ...prev, [contextMenu.field]: resultText }) : null);
        } catch (e: any) { 
            const friendlyMsg = getFriendlyAiErrorMessage(e, !!googleApiConfig?.apiKey);
            setError(friendlyMsg); 
            toast.error("Error al pulir: " + friendlyMsg); 
        } finally { setIsProcessingSelection(false); setIsAdjusting(null); }
    };

    const handlePolishWithEdits = async () => {
        if (!generatedContent || !originalContent) return;
        setIsProcessingSelection(true);
        setContextMenu(prev => ({ ...prev, visible: false }));
        try {
            const apiKey = googleApiConfig?.apiKey || process.env.GEMINI_API_KEY;
            const ai = new GoogleGenAI({ apiKey, baseUrl: `${window.location.origin}/api/proxy/google` });
            
            const field = contextMenu.field === 'emailSubject' ? 'emailBody' : contextMenu.field;
            const originalText = originalContent[field];
            const modifiedText = generatedContent[field];
            
            const prompt = `El usuario ha redactado y modificado un mensaje generado previamente de forma manual.
            Tu tarea es actuar como un experto en redacción y pulir de manera profesional y natural el mensaje, combinando las ideas, palabras añadidas, cambiadas o eliminadas de manera fluida y con perfecta gramática, manteniendo el estilo y tono original de la comunicación.
            
            MENSAJE ORIGINAL GENERADO:
            "${originalText}"
            
            MENSAJE MODIFICADO POR EL USUARIO:
            "${modifiedText}"
            
            Entrega ÚNICAMENTE el texto final completamente pulido y limpio, sin introducciones ni explicaciones.`;

            const response = await generateContentWithFallback(ai, {
                model: "gemini-3.1-flash-lite",
                contents: [{ role: 'user', parts: [{ text: prompt }] }]
            });
            
            const resultText = response.text || '';
            setGeneratedContent(prev => prev ? ({ ...prev, [field]: resultText.trim() }) : null);
            setOriginalContent(prev => prev ? ({ ...prev, [field]: resultText.trim() }) : null);
            toast.success("Mensaje pulido con éxito de acuerdo a tus cambios");
        } catch (e: any) { 
            const friendlyMsg = getFriendlyAiErrorMessage(e, !!googleApiConfig?.apiKey);
            setError(friendlyMsg); 
            toast.error("Error al pulir cambios: " + friendlyMsg); 
        } finally { setIsProcessingSelection(false); }
    };

    useEffect(() => {
        const cb = () => setContextMenu(prev => ({ ...prev, visible: false }));
        window.addEventListener('click', cb);
        return () => window.removeEventListener('click', cb);
    }, []);

    const clearHistory = () => { if (window.confirm('¿Borrar historial?')) updateConfig(prev => ({ ...prev, aiHistory: prev.aiHistory?.filter(h => h.type !== 'email') })); };

    // Autocompletado con sugerencia fantasma
    const onIdeaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setIdea(val);
        const words = val.split(/\s+/);
        const lastWord = words[words.length - 1]?.toLowerCase() || '';
        
        if (lastWord.length >= 2) {
            const fullDict = Array.from(new Set([...DEFAULT_VOCABULARY, ...dictionary]));
            const match = fullDict.find(w => w.toLowerCase().startsWith(lastWord) && w.toLowerCase() !== lastWord);
            if (match) {
                setSuggestion(match.slice(lastWord.length));
            } else {
                setSuggestion('');
            }
        } else {
            setSuggestion('');
        }
    };

    // Al presionar Control o Tab se autocompleta la sugerencia fantasma
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if ((e.key === 'Control' || e.key === 'Tab') && suggestion) {
            e.preventDefault();
            setIdea(prev => prev + suggestion + ' ');
            setSuggestion('');
            toast.success("Sugerencia autocompletada");
        }
    };

    const handleApplyAlternativeSubject = (newSubject: string) => {
        setGeneratedContent(prev => prev ? ({ ...prev, emailSubject: newSubject }) : null);
        toast.success("Asunto aplicado");
    };

    const acceptSuggestion = () => {
        if (suggestion) {
            setIdea(prev => prev + suggestion + ' ');
            setSuggestion('');
        }
    };

    return (
        <div onDrop={handleDrop} onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }} className={`p-4 transition-all ${isDraggingOver ? 'bg-purple-500/10' : ''}`}>
            
            {/* ENCABEZADO SUPERIOR */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="p-2.5 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl shadow-md text-white">
                        <Mail size={22} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-white uppercase tracking-tighter">Generador de Mensajes</h2>
                        <p className="text-[11px] text-gray-400">Entregas de planos, renders y redacción ejecutiva para Javer</p>
                    </div>
                    <a 
                        href="https://academiartificial.com/noticias-ia/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="ml-1 sm:ml-2 flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600/30 to-indigo-600/30 hover:from-blue-600/50 hover:to-indigo-600/50 text-blue-300 hover:text-white rounded-lg border border-blue-500/30 text-[11px] font-bold uppercase tracking-wider transition-all shadow-sm group hover:scale-105"
                        title="Ver noticias de IA en Academia Artificial"
                    >
                        <Newspaper size={13} className="text-blue-400 group-hover:text-blue-200" />
                        <span>alejavi noticias</span>
                        <ExternalLink size={11} className="opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                    </a>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <button 
                        onClick={() => setShowAiConsultant(!showAiConsultant)} 
                        className={`px-3 py-2 rounded-lg text-xs font-black uppercase border transition-all flex items-center gap-1.5 cursor-pointer ${
                            showAiConsultant 
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-amber-500/20' 
                                : 'bg-gray-800 hover:bg-purple-600/30 text-purple-300 border-gray-700 hover:border-purple-500/50'
                        }`}
                    >
                        <Bot size={14} />
                        <span>IA Consejera</span>
                    </button>
                    <button 
                        onClick={() => setShowHistory(!showHistory)} 
                        className="px-3.5 py-2 bg-gray-800 rounded-lg text-xs font-black uppercase text-gray-400 border border-gray-700 hover:bg-gray-700 transition-colors cursor-pointer"
                    >
                        Historial
                    </button>
                    <button 
                        onClick={handleResetAll} 
                        title="Reiniciar todos los campos (Erik por defecto)" 
                        className="px-3 py-2 bg-gray-800 hover:bg-red-600/20 text-gray-400 hover:text-red-400 rounded-lg text-xs font-black uppercase border border-gray-700 hover:border-red-500/40 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                        <RotateCcw size={14} />
                        <span>Reset</span>
                    </button>
                </div>
            </div>

            {/* BARRA SEGMENTADA DE MODOS: 1. REDACTOR LIBRE CON IA PRIMERO, 2. ENTREGAS Y FORMATOS */}
            <div className="flex items-center gap-2 p-1.5 bg-gray-900/90 rounded-2xl border border-gray-800 mb-5 shadow-lg max-w-xl">
                <button
                    type="button"
                    onClick={() => setActiveMode('ai')}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        activeMode === 'ai'
                            ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25'
                            : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
                    }`}
                >
                    <Sparkles size={15} className={activeMode === 'ai' ? 'text-purple-300' : ''} />
                    <span>1. Redactor Libre con IA</span>
                </button>
                <button
                    type="button"
                    onClick={() => setActiveMode('quick')}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        activeMode === 'quick'
                            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/25'
                            : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
                    }`}
                >
                    <Zap size={15} className={activeMode === 'quick' ? 'text-amber-300' : ''} />
                    <span>2. Entregas y Formatos (0s)</span>
                </button>
            </div>

            {/* GESTIÓN DE ERROR DE IA */}
            {error && (
                <div className="mb-4 bg-red-950/20 border border-red-500/20 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-red-200 text-sm">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="shrink-0 text-red-400 mt-0.5" size={18} />
                        <div>
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

            {/* IA CONSEJERA MODAL */}
            <AnimatePresence>{showAiConsultant && (
                <motion.div 
                    initial={{ height: 0, opacity: 0 }} 
                    animate={{ height: 'auto', opacity: 1 }} 
                    exit={{ height: 0, opacity: 0 }} 
                    className="overflow-hidden mb-4"
                >
                    <div className="bg-slate-900/90 backdrop-blur-xl p-4 rounded-2xl border-2 border-amber-500/30 shadow-2xl space-y-4">
                        <div className="flex justify-between items-center border-b border-white/10 pb-3">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                                    <Bot size={20} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-white uppercase tracking-wider">IA Consejera de Tono y Estrategia</h3>
                                    <p className="text-[11px] text-gray-400">Pídele sugerencias de tono, orientación o dictale tus intenciones por voz.</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setShowAiConsultant(false)} 
                                className="p-1.5 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-xs font-bold cursor-pointer"
                            >
                                ✕ Cerrar
                            </button>
                        </div>

                        <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                            {aiConsultantMessages.map((msg, idx) => (
                                <div 
                                    key={idx} 
                                    className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                                >
                                    <div className={`p-3 rounded-2xl max-w-[85%] text-xs leading-relaxed ${
                                        msg.role === 'user' 
                                            ? 'bg-purple-600 text-white rounded-br-none shadow-md' 
                                            : 'bg-slate-800 text-slate-100 border border-slate-700 rounded-bl-none shadow-inner'
                                    }`}>
                                        <p className="whitespace-pre-wrap">{msg.text}</p>
                                    </div>
                                    {msg.suggestedIdea && (
                                        <div className="mt-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs space-y-2 max-w-[85%]">
                                            <div className="flex items-center gap-1.5 text-amber-300 font-black uppercase text-[10px]">
                                                <Sparkles size={14} />
                                                <span>Tono y Propuesta Sugerida por la IA</span>
                                            </div>
                                            <p className="text-amber-100/90 italic font-medium">"{msg.suggestedIdea}"</p>
                                            <button
                                                onClick={() => handleApplyIdeaAndRegenerate(msg.suggestedIdea!)}
                                                disabled={isLoading}
                                                className="w-full py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-lg shadow-md flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                                            >
                                                {isLoading ? <RefreshCw className="animate-spin" size={14} /> : <Sparkles size={14} />}
                                                <span>Aplicar a la Idea y Regenerar Mensajes</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                            <div className="relative flex-grow">
                                <input
                                    type="text"
                                    value={aiInput}
                                    onChange={(e) => setAiInput(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleSendAiConsultantMessage(); }}
                                    placeholder="Ej. 'Sugiéreme un tono más ejecutivo para cobro', o habla por el micrófono..."
                                    className="w-full p-3 pr-12 bg-slate-950/80 border border-slate-700 rounded-xl text-xs text-white placeholder-gray-500 outline-none focus:border-amber-500/60"
                                />
                                <button
                                    type="button"
                                    onClick={toggleAiListening}
                                    title={isAiListening ? "Detener micrófono IA" : "Hablarle a la IA"}
                                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all cursor-pointer ${
                                        isAiListening 
                                            ? 'bg-red-600 text-white animate-pulse' 
                                            : 'text-gray-400 hover:text-amber-400 hover:bg-white/5'
                                    }`}
                                >
                                    {isAiListening ? <MicOff size={16} className="animate-spin" /> : <Mic size={16} />}
                                </button>
                            </div>
                            <button
                                onClick={() => handleSendAiConsultantMessage()}
                                disabled={isAiLoading || !aiInput.trim()}
                                className="px-4 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md disabled:opacity-50 transition-all cursor-pointer"
                            >
                                {isAiLoading ? <RefreshCw className="animate-spin" size={16} /> : <Send size={16} />}
                                <span>Consultar</span>
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}</AnimatePresence>

            {/* HISTORIAL */}
            <AnimatePresence>{showHistory && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-4">
                    <div className="bg-gray-900 p-4 rounded-xl border border-gray-800">
                        <div className="flex justify-between mb-2">
                            <h3 className="text-xs font-black text-gray-500 uppercase">Registros Anteriores</h3>
                            <button onClick={clearHistory} className="text-xs text-red-500 hover:text-red-400 cursor-pointer">Limpiar</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2">
                            {history.map(item => (
                                <div key={item.id} className="p-3 bg-gray-800/30 rounded-lg border border-white/5 relative group">
                                    <button onClick={() => deleteHistoryItem(item.id)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 cursor-pointer"><Trash2 size={14} className="text-gray-500 hover:text-red-400"/></button>
                                    <p className="text-[10px] text-gray-300 line-clamp-2">{item.original}</p>
                                    <button onClick={() => { setGeneratedContent(JSON.parse(item.result)); setIdea(item.original); setShowHistory(false); setActiveMode('ai'); }} className="mt-2 w-full py-1 bg-white/5 hover:bg-white/10 text-[9px] uppercase font-black rounded-md transition-colors cursor-pointer">Cargar</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            )}</AnimatePresence>

            {/* CONTENEDOR PRINCIPAL: 2 COLUMNAS EN DESKTOP */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                
                {/* COLUMNA IZQUIERDA: 1. REDACTOR LIBRE (ARRIBA) + 2. ENTREGAS Y FORMATOS (ABAJO) */}
                <div className="lg:col-span-7 xl:col-span-8 space-y-6">
                    
                    {/* ========================================================================= */}
                    {/* SECCIÓN 1: REDACTOR LIBRE CON IA (ARRIBA) */}
                    {/* ========================================================================= */}
                    <div id="section-redactor-libre" className="bg-gray-900/60 rounded-2xl border border-purple-500/30 p-4 sm:p-5 shadow-xl space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-800/80">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl text-white shadow-md">
                                    <Sparkles size={16} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                                        <span>1. Redactor Libre con IA</span>
                                        <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">Ctrl Autocompletar</span>
                                    </h3>
                                    <p className="text-[11px] text-gray-400">Escribe o dicta tu idea; la IA redactará correo y WhatsApp ejecutivos</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={toggleListening}
                                    title={isListening ? "Detener dictado" : "Dictar con micrófono"}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
                                        isListening 
                                            ? 'bg-red-600 text-white animate-pulse shadow-red-500/30' 
                                            : 'bg-gray-800 hover:bg-purple-600/30 hover:border-purple-500/50 text-purple-400 border border-gray-700'
                                    }`}
                                >
                                    {isListening ? (
                                        <>
                                            <MicOff size={14} className="animate-spin" />
                                            <span>Escuchando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Mic size={14} />
                                            <span>Dictar</span>
                                        </>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsAiSectionOpen(!isAiSectionOpen)}
                                    className="p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg border border-gray-700 transition-colors text-xs font-bold cursor-pointer"
                                    title={isAiSectionOpen ? "Minimizar sección" : "Expandir sección"}
                                >
                                    {isAiSectionOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </button>
                            </div>
                        </div>

                        {isAiSectionOpen && (
                            <div className="space-y-4 animate-in fade-in duration-200">
                                {/* Contenedor de Textarea con Texto Fantasma */}
                                <div className="relative group rounded-xl border border-gray-700 bg-gray-800/90 focus-within:border-purple-500 transition-all overflow-hidden min-h-[120px]">
                                    {/* Capa de texto fantasma sincronizada detrás */}
                                    <div 
                                        aria-hidden="true"
                                        className="absolute inset-0 p-4 pr-14 text-sm font-medium font-sans leading-relaxed pointer-events-none whitespace-pre-wrap break-words overflow-hidden select-none"
                                    >
                                        <span className="opacity-0">{idea}</span>
                                        {suggestion && (
                                            <span className="text-purple-400/80 bg-purple-500/10 px-1 py-0.5 rounded border border-purple-500/20 italic font-semibold inline-flex items-center gap-1 shadow-sm">
                                                <span>{suggestion}</span>
                                                <kbd className="not-italic text-[10px] font-mono px-1 py-0.2 bg-purple-600/40 text-purple-200 rounded border border-purple-400/30 uppercase">Ctrl</kbd>
                                            </span>
                                        )}
                                    </div>

                                    {/* Textarea interactivo */}
                                    <textarea 
                                        ref={ideaRef}
                                        value={idea} 
                                        onChange={onIdeaChange}
                                        onKeyDown={handleKeyDown}
                                        className="w-full p-4 pr-14 bg-transparent text-sm text-white font-medium font-sans min-h-[120px] resize-none outline-none leading-relaxed relative z-10 placeholder-gray-500" 
                                        placeholder="¿Qué deseas comunicar? Escribe o dicta. (Aparecerán sugerencias en fantasma que puedes autocompletar presionando la tecla [Ctrl] o [Tab])."
                                    />

                                    {/* Botón micrófono integrado */}
                                    <button
                                        type="button"
                                        onClick={toggleListening}
                                        title={isListening ? "Detener dictado" : "Dictar con micrófono"}
                                        className={`absolute right-3 bottom-3 p-2.5 rounded-full transition-all shadow-lg border z-20 flex items-center justify-center cursor-pointer ${
                                            isListening
                                                ? 'bg-red-600 border-red-400 text-white animate-pulse shadow-red-500/50 scale-110'
                                                : 'bg-purple-600/30 border-purple-500/50 text-purple-300 hover:bg-purple-600 hover:text-white hover:scale-105'
                                        }`}
                                    >
                                        {isListening ? <MicOff size={16} className="animate-spin" /> : <Mic size={16} />}
                                    </button>
                                </div>

                                {/* Badge de sugerencia fantasma disponible */}
                                {suggestion && (
                                    <div 
                                        onClick={acceptSuggestion}
                                        className="p-2 bg-purple-950/50 border border-purple-500/30 rounded-xl flex items-center justify-between text-xs text-purple-200 cursor-pointer hover:bg-purple-900/40 transition-colors"
                                        title="Haz clic o presiona Ctrl para autocompletar"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Sparkles size={13} className="text-purple-400" />
                                            <span>Autocompletar con: <strong className="text-white italic">"{suggestion.trim()}"</strong></span>
                                        </div>
                                        <span className="text-[10px] font-mono font-bold bg-purple-600/40 px-2 py-0.5 rounded border border-purple-400/40 text-purple-200">
                                            Presiona [Ctrl]
                                        </span>
                                    </div>
                                )}

                                {/* Badge de imágenes adjuntas */}
                                {attachedImages.length > 0 && (
                                    <div className="p-2.5 bg-purple-950/40 border border-purple-500/30 rounded-xl flex items-center justify-between text-xs text-purple-200">
                                        <div className="flex items-center gap-2 truncate">
                                            <ImageIcon size={15} className="text-purple-400 shrink-0" />
                                            <span className="font-bold truncate">
                                                {attachedImages.length} imagen(es) adjunta(s) listas para análisis con IA
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => onAttachmentsChange([])}
                                            className="text-[10px] text-red-400 hover:text-red-300 font-bold ml-2 cursor-pointer"
                                        >
                                            Quitar
                                        </button>
                                    </div>
                                )}

                                {/* Contexto anterior colapsable */}
                                <div className="border border-gray-700/60 rounded-xl overflow-hidden">
                                    <button 
                                        onClick={() => setShowPreviousContext(!showPreviousContext)} 
                                        className="w-full p-2.5 bg-gray-800/60 text-xs text-left text-gray-400 hover:bg-gray-800 transition-colors flex justify-between items-center font-bold cursor-pointer"
                                    >
                                        <span>Contexto anterior / Correo al que respondes (opcional)</span>
                                        <span>{showPreviousContext ? '▲' : '▼'}</span>
                                    </button>
                                    {showPreviousContext && (
                                        <textarea 
                                            value={previousEmail} 
                                            onChange={e => setPreviousEmail(e.target.value)} 
                                            className="w-full p-3 bg-gray-900 border-t border-gray-700/60 text-xs text-gray-300 outline-none min-h-[70px] italic resize-none" 
                                            placeholder="Pega aquí el correo o mensaje al que estás respondiendo..."
                                        />
                                    )}
                                </div>

                                {/* Parámetros: Proyecto, Tono, Longitud */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                    <div>
                                        <input 
                                            list="project-list-ai" 
                                            value={project} 
                                            onChange={e => setProject(e.target.value)} 
                                            className="w-full p-2.5 bg-gray-800 border border-gray-700 rounded-xl text-xs text-white font-bold outline-none focus:border-purple-500" 
                                            placeholder="Proyecto / Fraccionamiento..."
                                        />
                                        <datalist id="project-list-ai">
                                            {fraccionamientosList.map(f => <option key={f} value={f} />)}
                                        </datalist>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <select 
                                            value={tone} 
                                            onChange={e => setTone(e.target.value as any)} 
                                            className="p-2.5 bg-gray-800 border border-gray-700 rounded-xl text-xs font-black text-purple-400 outline-none cursor-pointer"
                                        >
                                            {['Profesional', 'Casual'].map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                        <select 
                                            value={messageLength} 
                                            onChange={e => setMessageLength(e.target.value as any)} 
                                            className="p-2.5 bg-gray-800 border border-gray-700 rounded-xl text-xs font-black text-white outline-none cursor-pointer"
                                        >
                                            {['Reducido', 'Medio', 'Detallado'].map(l => <option key={l} value={l}>{l}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Botón principal Generar */}
                                <button 
                                    onClick={() => handleGenerate()} 
                                    disabled={isLoading} 
                                    className="w-full py-3.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-xl flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
                                >
                                    {isLoading ? <RefreshCw className="animate-spin" size={16}/> : <><Sparkles size={16}/> <span>Generar Mensajes con IA</span></>}
                                </button>

                                {/* RESULTADOS GENERADOS DE IA */}
                                {isLoading && (
                                    <div className="py-8 flex flex-col items-center justify-center bg-gray-950/60 rounded-xl border border-purple-500/30">
                                        <RefreshCw size={36} className="animate-spin text-purple-400 mb-3" />
                                        <h4 className="text-sm font-black text-white uppercase tracking-widest">El Estratega está redactando...</h4>
                                        <p className="text-[11px] text-purple-300/80 mt-1">Estructurando doble salto de línea, saludo y firma ejecutiva</p>
                                    </div>
                                )}

                                {generatedContent && !isLoading && (
                                    <div className="space-y-4 pt-2 border-t border-gray-800">
                                        {/* TARJETA DE CORREO */}
                                        <div className="bg-gray-900/90 rounded-2xl border border-gray-800 overflow-hidden shadow-xl">
                                            <div className="bg-gray-800/80 px-4 py-2.5 border-b border-gray-800 flex justify-between items-center">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 bg-purple-600/20 text-purple-400 rounded-lg border border-purple-500/30">
                                                        <Mail size={14} />
                                                    </div>
                                                    <span className="text-xs font-black uppercase text-purple-300">Correo Electrónico</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button 
                                                        onClick={() => handleCopyToClipboard(generatedContent.emailBody, 'email')} 
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                                                            copied === 'email' ? 'bg-green-600 text-white border-green-500' : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700'
                                                        }`}
                                                    >
                                                        <Copy size={13} />
                                                        <span>{copied === 'email' ? 'Copiado!' : 'Copiar'}</span>
                                                    </button>
                                                    <button 
                                                        onClick={() => handleOpenOutlookWeb(generatedContent.emailSubject, generatedContent.emailBody)} 
                                                        className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-black uppercase flex items-center gap-1.5 shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
                                                        title="Abrir Outlook Web Javer 365 con este correo y destinatario"
                                                    >
                                                        <ExternalLink size={13} />
                                                        <span>Outlook Web</span>
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="p-4 space-y-3">
                                                {/* ASUNTO */}
                                                <div>
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Asunto</span>
                                                        {generatedContent.alternativeSubjects && generatedContent.alternativeSubjects.length > 0 && (
                                                            <div className="flex gap-1">
                                                                {generatedContent.alternativeSubjects.map((s, i) => (
                                                                    <button 
                                                                        key={i} 
                                                                        onClick={() => handleApplyAlternativeSubject(s)} 
                                                                        className="text-[9px] bg-purple-600/10 text-purple-400 hover:bg-purple-600 hover:text-white px-2 py-0.5 rounded border border-purple-500/20 transition-colors cursor-pointer"
                                                                        title="Usar esta alternativa"
                                                                    >
                                                                        Opción {i + 1}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <input 
                                                        value={generatedContent.emailSubject} 
                                                        onChange={e => setGeneratedContent({ ...generatedContent, emailSubject: e.target.value })} 
                                                        onContextMenu={e => handleContextMenu(e, 'email', 'emailSubject')} 
                                                        className="w-full bg-gray-800/60 border border-gray-700/80 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-purple-500 shadow-inner" 
                                                    />
                                                </div>

                                                {/* CUERPO DEL CORREO */}
                                                <div>
                                                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block mb-1">Cuerpo del Correo</span>
                                                    <textarea 
                                                        value={generatedContent.emailBody} 
                                                        onChange={e => setGeneratedContent({ ...generatedContent, emailBody: e.target.value })} 
                                                        onContextMenu={e => handleContextMenu(e, 'email', 'emailBody')} 
                                                        className="w-full h-44 bg-gray-800/40 border border-gray-700/80 rounded-xl p-3.5 text-xs text-gray-200 font-sans resize-none outline-none focus:border-purple-500 leading-relaxed shadow-inner" 
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* TARJETA DE WHATSAPP */}
                                        <div className="bg-gray-900/90 rounded-2xl border border-gray-800 overflow-hidden shadow-xl">
                                            <div className="bg-gray-800/80 px-4 py-2.5 border-b border-gray-800 flex justify-between items-center">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 bg-green-600/20 text-green-400 rounded-lg border border-green-500/30">
                                                        <MessageSquare size={14} />
                                                    </div>
                                                    <span className="text-xs font-black uppercase text-green-400">WhatsApp</span>
                                                </div>
                                                <button 
                                                    onClick={() => handleCopyToClipboard(generatedContent.whatsappMessage, 'whatsapp')} 
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                                                        copied === 'whatsapp' ? 'bg-green-600 text-white border-green-500' : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700'
                                                    }`}
                                                >
                                                    <Copy size={13} />
                                                    <span>{copied === 'whatsapp' ? 'Copiado!' : 'Copiar'}</span>
                                                </button>
                                            </div>
                                            <div className="p-4 space-y-3">
                                                <textarea 
                                                    value={generatedContent.whatsappMessage} 
                                                    onChange={e => setGeneratedContent({ ...generatedContent, whatsappMessage: e.target.value })} 
                                                    onContextMenu={e => handleContextMenu(e, 'whatsapp', 'whatsappMessage')} 
                                                    className="w-full h-24 bg-gray-800/40 border border-gray-700/80 rounded-xl p-3 text-xs text-gray-200 font-sans resize-none outline-none focus:border-green-500 leading-relaxed shadow-inner" 
                                                />
                                                <button 
                                                    onClick={() => handleSendWhatsApp(generatedContent.whatsappMessage)} 
                                                    className="w-full py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-md flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
                                                >
                                                    <MessageSquare size={14}/> 
                                                    <span>Lanzar por WhatsApp</span>
                                                </button>
                                            </div>
                                        </div>

                                        {/* IDEA MEJORADA */}
                                        {generatedContent.improvedIdea && (
                                            <div className="bg-gradient-to-br from-purple-900/20 to-indigo-900/10 rounded-2xl border border-purple-500/20 p-3 shadow-md flex items-center justify-between gap-3">
                                                <p className="text-xs text-purple-200 font-medium italic truncate">
                                                    "{generatedContent.improvedIdea}"
                                                </p>
                                                <button 
                                                    onClick={() => { setIdea(generatedContent.improvedIdea || ''); toast.success("Idea cargada"); }} 
                                                    className="text-[10px] font-black uppercase px-2.5 py-1 bg-purple-600/20 text-purple-200 hover:text-white rounded-lg border border-purple-500/30 hover:bg-purple-600 transition-all shrink-0 cursor-pointer"
                                                >
                                                    Usar como Base
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ========================================================================= */}
                    {/* SECCIÓN 2: ENTREGAS Y FORMATOS (0s) (ABAJO) */}
                    {/* ========================================================================= */}
                    <div id="section-entregas-formatos" className="bg-gray-900/60 rounded-2xl border border-amber-500/30 p-4 sm:p-5 shadow-xl space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-800/80">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-gradient-to-r from-amber-600 to-indigo-600 rounded-xl text-white shadow-md">
                                    <Zap size={16} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                                        <span>2. Entregas y Formatos (0s de espera)</span>
                                        <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">Instantáneo</span>
                                    </h3>
                                    <p className="text-[11px] text-gray-400">Planos, renders y documentos con plantilla estándar automática y enlaces</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleSaveCustomPreset}
                                    className="text-[11px] font-bold text-amber-300 hover:text-white bg-amber-500/10 hover:bg-amber-500/25 border border-amber-500/30 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                                    title="Guardar los entregables y método actuales como tu plantilla personalizada"
                                >
                                    <Star size={12} fill="currentColor" />
                                    <span>⭐ Guardar favorita</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsQuickSectionOpen(!isQuickSectionOpen)}
                                    className="p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg border border-gray-700 transition-colors text-xs font-bold cursor-pointer"
                                    title={isQuickSectionOpen ? "Minimizar sección" : "Expandir sección"}
                                >
                                    {isQuickSectionOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </button>
                            </div>
                        </div>

                        {isQuickSectionOpen && (
                            <div className="space-y-4 animate-in fade-in duration-200">
                                {/* Plantillas Rápidas y Favoritas */}
                                <div className="space-y-1.5">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-purple-300 block">
                                        Plantillas Rápidas (1 Clic):
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {/* Plantillas personalizadas del usuario */}
                                        {customPresets.map(cp => {
                                            const isSelected = activePresetId === cp.id;
                                            return (
                                                <div key={cp.id} className="inline-flex items-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSelectQuickPreset(cp)}
                                                        className={`px-3 py-1.5 rounded-l-xl text-xs font-bold border-y border-l transition-all cursor-pointer flex items-center gap-1.5 ${
                                                            isSelected
                                                                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-black'
                                                                : 'bg-gray-800/90 text-amber-300 border-gray-700/80 hover:border-amber-500/40 hover:bg-gray-800'
                                                        }`}
                                                    >
                                                        <Star size={11} fill="currentColor" />
                                                        <span>{cp.name}</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleDeleteCustomPreset(e, cp.id)}
                                                        className={`px-2 py-1.5 rounded-r-xl text-xs font-bold border-y border-r border-l-0 transition-all cursor-pointer ${
                                                            isSelected
                                                                ? 'bg-amber-600 text-white border-amber-400 hover:bg-red-600'
                                                                : 'bg-gray-800/90 text-gray-500 hover:text-red-400 border-gray-700/80 hover:bg-gray-700'
                                                        }`}
                                                        title="Eliminar plantilla favorita"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            );
                                        })}

                                        {/* Plantillas estándar del sistema */}
                                        {QUICK_PRESETS.map(qp => {
                                            const isSelected = activePresetId === qp.id;
                                            return (
                                                <button
                                                    key={qp.id}
                                                    type="button"
                                                    onClick={() => handleSelectQuickPreset(qp)}
                                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                                                        isSelected
                                                            ? 'bg-purple-600 text-white border-purple-400 shadow-md scale-[1.02]'
                                                            : 'bg-gray-800/70 text-gray-300 border-gray-700/80 hover:border-purple-500/40 hover:bg-gray-800 hover:text-white'
                                                    }`}
                                                >
                                                    {isSelected && <CheckCircle2 size={12} />}
                                                    <span>{qp.name}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* CUADRÍCULA DE 4 COLUMNAS EN EL MISMO RENGLÓN */}
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-stretch">
                                    {/* Columna 1: Entregables */}
                                    <div className="md:col-span-3 bg-gray-950/60 p-3 rounded-xl border border-gray-800 flex flex-col space-y-2">
                                        <div className="flex items-center justify-between pb-1.5 border-b border-gray-800/60">
                                            <span className="text-[11px] font-black uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                                                <span className="w-4 h-4 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-[9px] font-bold">1</span>
                                                <span>Entregable(s)</span>
                                            </span>
                                            <span className="text-[9px] text-blue-300/80 bg-blue-500/10 px-1.5 py-0.2 rounded font-bold">Varios</span>
                                        </div>
                                        <div className="flex flex-col gap-1.5 flex-grow">
                                            {DELIVERABLE_OPTIONS.map(d => {
                                                const isSelected = selectedDeliverables.includes(d);
                                                return (
                                                    <button
                                                        key={d}
                                                        type="button"
                                                        onClick={() => toggleDeliverable(d)}
                                                        className={`w-full px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer flex items-center justify-between gap-2 text-left ${
                                                            isSelected
                                                                ? 'bg-blue-600/20 text-blue-100 border-blue-500 shadow-sm ring-1 ring-blue-500/40'
                                                                : 'bg-gray-900/60 text-gray-400 border-gray-800 hover:border-gray-700 hover:bg-gray-800/60 hover:text-gray-200'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2 truncate">
                                                            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[9px] shrink-0 transition-colors ${
                                                                isSelected ? 'bg-blue-500 border-blue-400 text-white shadow' : 'border-gray-600 bg-gray-800/80'
                                                            }`}>
                                                                {isSelected && '✓'}
                                                            </div>
                                                            <span className="truncate">{d}</span>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Columna 2: Método de entrega */}
                                    <div className="md:col-span-3 bg-gray-950/60 p-3 rounded-xl border border-gray-800 flex flex-col space-y-2">
                                        <div className="flex items-center justify-between pb-1.5 border-b border-gray-800/60">
                                            <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                                                <span className="w-4 h-4 rounded-full bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-[9px] font-bold">2</span>
                                                <span>Método</span>
                                            </span>
                                            <span className="text-[9px] text-amber-300/80 bg-amber-500/10 px-1.5 py-0.2 rounded font-bold">Uno</span>
                                        </div>
                                        <div className="flex flex-col gap-1.5 flex-grow">
                                            {METHOD_OPTIONS.map(m => {
                                                const isSelected = selectedMethod === m;
                                                const descriptions: Record<DeliveryMethod, string> = {
                                                    'Revisión': 'Observaciones / visto bueno',
                                                    'Entrega': 'Envío formal definitivo',
                                                    'Proyecto': 'Archivos generales',
                                                    'Anteproyecto': 'Propuesta conceptual'
                                                };
                                                return (
                                                    <button
                                                        key={m}
                                                        type="button"
                                                        onClick={() => handleSelectMethod(m)}
                                                        className={`w-full px-2.5 py-2 rounded-lg text-left border transition-all cursor-pointer ${
                                                            isSelected
                                                                ? 'bg-amber-500/20 text-amber-100 border-amber-500 shadow-sm ring-1 ring-amber-500/40'
                                                                : 'bg-gray-900/60 text-gray-400 border-gray-800 hover:border-gray-700 hover:bg-gray-800/60 hover:text-gray-200'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[8px] shrink-0 transition-colors ${
                                                                isSelected ? 'border-amber-400 bg-amber-500 text-slate-950 font-black' : 'border-gray-600 bg-gray-800/80'
                                                            }`}>
                                                                {isSelected && '●'}
                                                            </div>
                                                            <div className="truncate">
                                                                <div className="text-[11px] font-bold">{m}</div>
                                                                <div className="text-[9px] text-gray-500 truncate">{descriptions[m]}</div>
                                                            </div>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Columna 3: Proyecto */}
                                    <div className="md:col-span-3 bg-gray-950/60 p-3 rounded-xl border border-gray-800 flex flex-col space-y-2">
                                        <div className="flex items-center justify-between pb-1.5 border-b border-gray-800/60">
                                            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                                                <Building2 size={13} />
                                                <span>3. Proyecto</span>
                                            </span>
                                            <span className="text-[9px] text-emerald-300/80 bg-emerald-500/10 px-1.5 py-0.2 rounded font-bold">Opcional</span>
                                        </div>
                                        <div className="flex flex-col gap-2 flex-grow">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">De la lista:</label>
                                                <select
                                                    value={project}
                                                    onChange={e => setProject(e.target.value)}
                                                    className="w-full p-2 bg-gray-900 border border-gray-700 rounded-lg text-xs font-bold text-white outline-none focus:border-emerald-500 cursor-pointer"
                                                >
                                                    <option value="">Selecciona fracc...</option>
                                                    {fraccionamientosList.map(f => (
                                                        <option key={f} value={f}>{f}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center justify-between">
                                                    <span>O escribirlo:</span>
                                                    {project && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setProject('')}
                                                            className="text-[9px] text-red-400 hover:text-red-300 font-bold cursor-pointer"
                                                        >
                                                            Limpiar
                                                        </button>
                                                    )}
                                                </label>
                                                <input
                                                    value={project}
                                                    onChange={e => setProject(e.target.value)}
                                                    placeholder="Ej. Bosques..."
                                                    className="w-full p-2 bg-gray-900 border border-gray-700 rounded-lg text-xs font-bold text-white outline-none focus:border-emerald-500 placeholder-gray-500"
                                                />
                                            </div>
                                            <div className="p-2 bg-gray-900/80 rounded-lg border border-gray-800 flex items-center justify-between gap-1.5 mt-auto">
                                                <div className="truncate">
                                                    <span className="text-[9px] font-bold uppercase text-gray-500 block">Activo:</span>
                                                    <span className={`text-[11px] font-bold truncate block ${project ? 'text-emerald-300' : 'text-gray-500 italic'}`}>
                                                        {project || 'Ninguno'}
                                                    </span>
                                                </div>
                                                {project && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setProject('')}
                                                        className="w-4 h-4 rounded-full bg-gray-800 hover:bg-red-500/20 text-gray-400 hover:text-red-300 flex items-center justify-center text-[10px] shrink-0 cursor-pointer"
                                                    >
                                                        ✕
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Columna 4: Opciones Adicionales de Entrega */}
                                    <div className="md:col-span-3 bg-gray-950/60 p-3 rounded-xl border border-gray-800 flex flex-col space-y-2">
                                        <div className="flex items-center justify-between pb-1.5 border-b border-gray-800/60">
                                            <span className="text-[11px] font-black uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                                                <span className="w-4 h-4 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-[9px] font-bold">4</span>
                                                <span>Opciones</span>
                                            </span>
                                            <div className="flex bg-gray-900 rounded p-0.5 border border-gray-800 text-[10px]">
                                                <button
                                                    type="button"
                                                    onClick={() => setTemplateTone('colaborativo')}
                                                    className={`px-1.5 py-0.5 rounded font-bold transition-all cursor-pointer ${
                                                        templateTone === 'colaborativo' ? 'bg-purple-600 text-white' : 'text-gray-400'
                                                    }`}
                                                    title="Tono colaborativo interno"
                                                >
                                                    Colab.
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setTemplateTone('formal')}
                                                    className={`px-1.5 py-0.5 rounded font-bold transition-all cursor-pointer ${
                                                        templateTone === 'formal' ? 'bg-purple-600 text-white' : 'text-gray-400'
                                                    }`}
                                                    title="Tono formal institucional"
                                                >
                                                    Formal
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2 flex-grow justify-between">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-gray-300 flex items-center gap-1">
                                                    <ExternalLink size={11} className="text-blue-400" />
                                                    <span>Enlace OneDrive / SharePoint:</span>
                                                </label>
                                                <input
                                                    type="url"
                                                    value={cloudLink}
                                                    onChange={e => setCloudLink(e.target.value)}
                                                    placeholder="https://javer-my.sharepoint.com/..."
                                                    className="w-full p-2 bg-gray-900 border border-gray-700 rounded-lg text-xs font-medium text-white outline-none focus:border-purple-500 placeholder-gray-500"
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[10px] font-bold text-gray-300 flex items-center gap-1">
                                                        <Clock size={11} className="text-amber-400" />
                                                        <span>Plazo límite:</span>
                                                    </label>
                                                    <div className="flex items-center gap-1">
                                                        {['este viernes', '3 días'].map(d => (
                                                            <button
                                                                key={d}
                                                                type="button"
                                                                onClick={() => setDeadline(d)}
                                                                className="text-[8px] px-1 py-0.2 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold cursor-pointer"
                                                            >
                                                                {d}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <input
                                                    type="text"
                                                    value={deadline}
                                                    onChange={e => setDeadline(e.target.value)}
                                                    placeholder="Ej. este viernes antes de las 2 PM..."
                                                    className="w-full p-2 bg-gray-900 border border-gray-700 rounded-lg text-xs font-medium text-white outline-none focus:border-purple-500 placeholder-gray-500"
                                                />
                                            </div>

                                            <div className="p-1.5 bg-purple-950/20 rounded-lg border border-purple-500/20 text-[10px] text-purple-300/80 leading-tight">
                                                {cloudLink ? '✓ Enlace incluido' : 'Sin enlace adjunto'}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* VISTA PREVIA EN VIVO ESTILO OUTLOOK */}
                                <div className="bg-gray-950 rounded-2xl border border-gray-800 overflow-hidden shadow-2xl">
                                    <div className="bg-gray-900/90 px-4 py-2.5 border-b border-gray-800 flex items-center justify-between text-xs text-gray-400">
                                        <div className="flex items-center gap-2">
                                            <Mail size={14} className="text-purple-400" />
                                            <span className="font-bold text-gray-200">Vista Previa Inmediata (0s de espera)</span>
                                        </div>
                                        <span className="text-[11px] font-medium text-gray-400">
                                            Para: <strong className="text-white">{fullRecipientEmail || recipientName || 'Destinatario'}</strong>
                                        </span>
                                    </div>

                                    <div className="p-4 space-y-3">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 bg-purple-500/15 px-2 py-0.5 rounded border border-purple-500/30">
                                                Asunto
                                            </span>
                                            <span className="font-bold text-sm text-white">
                                                {livePreview.emailSubject}
                                            </span>
                                        </div>
                                        <div className="p-4 bg-gray-900/50 rounded-xl border border-gray-800 text-xs text-gray-200 whitespace-pre-line leading-relaxed max-h-52 overflow-y-auto font-sans shadow-inner">
                                            {livePreview.emailBody}
                                        </div>
                                    </div>

                                    {/* Barra de acciones de entrega inmediata */}
                                    <div className="bg-gray-900/70 px-4 py-3 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                                        <button
                                            type="button"
                                            onClick={handleTransferToAi}
                                            className="w-full sm:w-auto px-4 py-2 bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 hover:text-white rounded-xl text-xs font-bold border border-purple-500/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                            title="Pasar este texto al redactor libre de IA para expandirlo o pedirle cambios"
                                        >
                                            <Sparkles size={13} />
                                            <span>🪄 Personalizar con IA</span>
                                        </button>

                                        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap">
                                            <button
                                                type="button"
                                                onClick={() => handleCopyToClipboard(livePreview.emailBody, 'preset-email')}
                                                className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                                    copied === 'preset-email' ? 'bg-green-600 text-white border-green-500' : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700'
                                                }`}
                                            >
                                                <Copy size={13} />
                                                <span>{copied === 'preset-email' ? 'Copiado!' : 'Copiar'}</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleSendWhatsApp(livePreview.whatsappMessage)}
                                                className="px-3.5 py-2 bg-green-600/20 hover:bg-green-600 text-green-300 hover:text-white rounded-xl text-xs font-bold border border-green-500/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                            >
                                                <MessageSquare size={13} />
                                                <span>WhatsApp</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleOpenOutlookWeb(livePreview.emailSubject, livePreview.emailBody)}
                                                className="flex-1 sm:flex-initial px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                                            >
                                                <ExternalLink size={14} />
                                                <span>Outlook Web (Javer 365)</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ========================================================================= */}
                {/* COLUMNA DERECHA: TODO LO DEL BUSCADOR DE CONTACTOS (STICKY) */}
                {/* ========================================================================= */}
                <aside className="lg:col-span-5 xl:col-span-4 space-y-4 lg:sticky lg:top-4">
                    <div className="bg-gray-900/80 backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-purple-500/30 shadow-2xl space-y-4">
                        {/* Encabezado del panel de contactos */}
                        <div className="flex items-center justify-between pb-3 border-b border-gray-800">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-purple-600/20 text-purple-400 rounded-xl border border-purple-500/30">
                                    <Users size={18} />
                                </div>
                                <div>
                                    <h3 className="text-xs font-black text-white uppercase tracking-wider">Destinatario y Contactos</h3>
                                    <p className="text-[10px] text-gray-400">Búsqueda predictiva y selección</p>
                                </div>
                            </div>
                            <span className="text-[10px] font-bold text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                                {sortedContacts.length} contactos
                            </span>
                        </div>

                        {/* Input de Búsqueda Rápida Predictiva */}
                        <div className="relative">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                                Buscar contacto o correo:
                            </label>
                            <div className="flex items-center bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 focus-within:border-purple-500 transition-colors">
                                <Search size={15} className="text-gray-400 mr-2 shrink-0" />
                                <input 
                                    type="text"
                                    value={contactSearchQuery}
                                    onChange={(e) => setContactSearchQuery(e.target.value)}
                                    onFocus={() => setIsSearchFocused(true)}
                                    placeholder="Nombre, iniciales o correo..."
                                    className="w-full bg-transparent text-xs text-white font-medium outline-none placeholder-gray-500"
                                />
                                {contactSearchQuery && (
                                    <button 
                                        type="button"
                                        onClick={() => setContactSearchQuery('')}
                                        className="text-gray-400 hover:text-white text-xs px-1 cursor-pointer"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>

                            {/* Dropdown flotante con resultados predictivos */}
                            {isSearchFocused && filteredSearchContacts.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-purple-500/40 rounded-xl shadow-2xl z-50 overflow-hidden divide-y divide-gray-800 max-h-56 overflow-y-auto">
                                    {filteredSearchContacts.map((c) => {
                                        const cName = String(getDBValue(c, ['cliente', 'nombre']) || '');
                                        const cEmail = String(getDBValue(c, 'correo') || '');
                                        const cTitle = String(getDBValue(c, ['lic', 'titulo']) || '');
                                        const originalIndex = sortedContacts.findIndex(x => x === c);
                                        const isFav = favorites.some(f => f.trim() === cName.trim());

                                        return (
                                            <div 
                                                key={c.id || cName}
                                                onClick={() => selectContactByIndex(originalIndex, sortedContacts)}
                                                className="p-2.5 hover:bg-purple-600/20 cursor-pointer flex items-center justify-between transition-colors"
                                            >
                                                <div className="truncate">
                                                    <div className="flex items-center gap-1.5">
                                                        {cTitle && <span className="text-[10px] font-bold text-purple-400">{cTitle}</span>}
                                                        <span className="text-xs font-bold text-white">{cName}</span>
                                                    </div>
                                                    <span className="text-[10px] text-gray-400 truncate block">{cEmail}</span>
                                                </div>
                                                {isFav && <Star size={12} className="text-yellow-400 shrink-0" fill="currentColor" />}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Selector desplegable tradicional + Botón Apodo */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                                O seleccionar de lista:
                            </label>
                            <div className="flex gap-2">
                                <div className="relative flex-grow">
                                    <select 
                                        value={selectedContactIndex} 
                                        onChange={handleContactSelect} 
                                        className="w-full p-2.5 bg-gray-800 border border-gray-700 rounded-xl text-xs text-white font-bold appearance-none pr-8 outline-none focus:border-purple-500/50 cursor-pointer"
                                    >
                                        <option value="">Seleccionar de lista...</option>
                                        {sortedContacts.map((c, i) => (
                                            <option key={i} value={i}>
                                                {favorites.some(f => f.trim() === String(getDBValue(c, 'cliente') || '').trim()) ? '★ ' : ''}
                                                {getDBValue(c, 'cliente')}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-xs">
                                        ▼
                                    </div>
                                </div>
                                <button 
                                    type="button"
                                    onClick={() => setUseNickname(!useNickname)} 
                                    className={`px-3 rounded-xl border transition-all font-black text-xs uppercase cursor-pointer shrink-0 ${
                                        useNickname ? 'border-yellow-500 text-yellow-400 bg-yellow-500/10' : 'border-gray-700 text-gray-400 hover:text-gray-300'
                                    }`}
                                    title={useNickname ? "Usando apodo en el saludo (si existe)" : "Usando nombre formal"}
                                >
                                    {useNickname ? 'Apodo' : 'Formal'}
                                </button>
                            </div>
                        </div>

                        {/* Píldoras de Contactos Frecuentes (1 Clic) */}
                        {quickContacts.length > 0 && (
                            <div className="space-y-1.5 pt-1">
                                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Accesos Rápidos (1 clic):</span>
                                <div className="flex flex-wrap gap-1.5">
                                    {quickContacts.map(qc => {
                                        const isSelected = selectedContactIndex !== '' && parseInt(selectedContactIndex, 10) === qc.index;
                                        return (
                                            <button
                                                key={qc.name}
                                                type="button"
                                                onClick={() => selectContactByIndex(qc.index, sortedContacts)}
                                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                                    isSelected 
                                                        ? 'bg-purple-600 text-white shadow-sm ring-2 ring-purple-400' 
                                                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white border border-gray-700/80'
                                                }`}
                                            >
                                                {qc.isErik ? <span>⭐</span> : (favorites.some(f => f.trim() === qc.name.trim()) && <Star size={11} className="text-yellow-400" fill="currentColor"/>)}
                                                <span className="truncate max-w-[130px]">{qc.name}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Ficha editable del Destinatario Seleccionado */}
                        <div className="p-3.5 bg-gray-950/60 rounded-xl border border-gray-800 space-y-2.5">
                            <div className="flex items-center justify-between pb-1 border-b border-gray-800/80">
                                <span className="text-[10px] font-black uppercase tracking-wider text-purple-400">Datos del Destinatario</span>
                                <button 
                                    type="button"
                                    onClick={handleSaveNewContact} 
                                    disabled={isSavingContact} 
                                    title="Guardar contacto en base de datos"
                                    className="px-2 py-1 bg-gray-800 hover:bg-purple-600/30 text-purple-400 hover:text-purple-300 border border-gray-700 hover:border-purple-500/40 rounded-lg text-[10px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                    {isSavingContact ? <Spinner size="3" /> : <Save size={12} />}
                                    <span>Guardar en BD</span>
                                </button>
                            </div>

                            {/* Título y Género */}
                            <div className="grid grid-cols-12 gap-2">
                                <div className="col-span-7">
                                    <label className="text-[9px] text-gray-500 font-bold uppercase block mb-0.5">Título</label>
                                    <select 
                                        value={recipientTitle} 
                                        onChange={e => setRecipientTitle(e.target.value)} 
                                        className="w-full p-2 bg-gray-800 border border-gray-700 rounded-lg text-xs text-purple-400 font-black outline-none focus:border-purple-500 cursor-pointer"
                                    >
                                        {titlesList.map(t => <option key={t} value={t}>{t || 'Sin Título'}</option>)}
                                    </select>
                                </div>
                                <div className="col-span-5">
                                    <label className="text-[9px] text-gray-500 font-bold uppercase block mb-0.5">Género</label>
                                    <div className="flex bg-gray-800 rounded-lg border border-gray-700 p-0.5 h-[34px]">
                                        <button 
                                            type="button"
                                            onClick={() => setRecipientGender('M')} 
                                            className={`flex-1 rounded text-[11px] font-black transition-all cursor-pointer ${recipientGender === 'M' ? 'bg-blue-600 text-white shadow' : 'text-gray-400'}`}
                                        >
                                            M
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => setRecipientGender('F')} 
                                            className={`flex-1 rounded text-[11px] font-black transition-all cursor-pointer ${recipientGender === 'F' ? 'bg-pink-600 text-white shadow' : 'text-gray-400'}`}
                                        >
                                            F
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Nombre completo */}
                            <div>
                                <label className="text-[9px] text-gray-500 font-bold uppercase block mb-0.5">Nombre Completo</label>
                                <input 
                                    value={recipientName} 
                                    onChange={e => setRecipientName(e.target.value)} 
                                    className="w-full p-2 bg-gray-800 border border-gray-700 rounded-lg text-xs text-white font-bold outline-none focus:border-purple-500" 
                                    placeholder="Nombre del destinatario..."
                                />
                            </div>

                            {/* Correo Institucional */}
                            <div>
                                <label className="text-[9px] text-gray-500 font-bold uppercase block mb-0.5">Correo Institucional</label>
                                <div className="flex gap-1 bg-gray-800/80 p-1 rounded-lg border border-gray-700">
                                    <input 
                                        value={recipientEmailUser} 
                                        onChange={e => setRecipientEmailUser(e.target.value)} 
                                        className="flex-grow bg-transparent p-1 text-xs font-bold text-white outline-none min-w-0" 
                                        placeholder="usuario"
                                    />
                                    <select 
                                        value={recipientEmailDomain} 
                                        onChange={e => setRecipientEmailDomain(e.target.value)} 
                                        className="bg-gray-900 p-1 rounded text-[11px] font-black text-purple-400 outline-none cursor-pointer"
                                    >
                                        {emailDomains.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                    <select 
                                        value={recipientEmailTld} 
                                        onChange={e => setRecipientEmailTld(e.target.value)} 
                                        className="bg-gray-900 p-1 rounded text-[11px] font-bold text-gray-400 outline-none cursor-pointer"
                                    >
                                        {emailTlds.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Tarjeta de Saludo Activo en Tiempo Real */}
                        <div className="p-3 bg-purple-950/20 border border-purple-500/20 rounded-xl space-y-1.5">
                            <span className="text-[10px] font-bold uppercase text-purple-300 block">Saludo en tiempo real:</span>
                            <p className="text-xs text-white font-black italic">
                                "{getPresetGreeting()}:"
                            </p>
                            <div className="flex items-center justify-between pt-1 border-t border-purple-500/10 text-[11px] text-gray-400">
                                <span className="truncate">{fullRecipientEmail || 'Sin correo asignado'}</span>
                                {fullRecipientEmail && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            navigator.clipboard.writeText(fullRecipientEmail);
                                            toast.success("Correo copiado");
                                        }}
                                        className="text-purple-400 hover:text-purple-300 text-[10px] font-bold ml-2 shrink-0 cursor-pointer"
                                        title="Copiar correo"
                                    >
                                        Copiar
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Botón directo para abrir correo en blanco a este contacto */}
                        <button
                            type="button"
                            onClick={() => handleOpenOutlookWeb('', '')}
                            className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white rounded-xl text-xs font-bold border border-gray-700 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                            title="Abrir Outlook Web Javer 365 con este destinatario"
                        >
                            <Mail size={14} className="text-blue-400" />
                            <span>Abrir Outlook con este contacto</span>
                            <ExternalLink size={12} className="opacity-70" />
                        </button>
                    </div>
                </aside>
            </div>

            {/* MENÚ CONTEXTUAL (CLIC DERECHO PARA PULIR TEXTO) */}
            <AnimatePresence>{contextMenu.visible && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} style={{ top: contextMenu.y, left: contextMenu.x }} className="fixed z-[1000] min-w-[280px] bg-gray-900/95 backdrop-blur-3xl border-2 border-white/10 rounded-[28px] shadow-2xl py-3 overflow-hidden" onClick={e => e.stopPropagation()}>
                    {contextMenu.selectedText ? (
                        <>
                            <div className="px-5 py-3 border-b-2 border-white/5 mb-2 bg-white/5"><div className="flex items-center gap-2 mb-1"><Sparkles size={12} className="text-purple-500" /><p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">IA Sugerencia</p></div><p className="text-[13px] text-purple-300 truncate italic font-medium">"{contextMenu.selectedText}"</p></div>
                            <div className="px-2 space-y-1">
                                <button onClick={() => handleSelectionAction('variation')} className="w-full flex items-center gap-4 px-4 py-3 text-xs font-black text-gray-200 hover:bg-purple-600 hover:text-white rounded-[18px] transition-all group cursor-pointer"><RefreshCw size={18} className="text-purple-500 group-hover:text-white group-hover:rotate-180 transition-all duration-500"/><div className="text-left"><span>Variación</span><p className="text-[8px] text-gray-500 group-hover:text-purple-200 uppercase tracking-tighter">Otra forma de decirlo</p></div></button>
                                <button onClick={() => { const n = prompt('¿Qué integrar?'); if(n) handleSelectionAction('replace', n); }} className="w-full flex items-center gap-4 px-4 py-3 text-xs font-black text-gray-200 hover:bg-blue-600 hover:text-white rounded-[18px] transition-all group cursor-pointer"><Pencil size={18} className="text-blue-500 group-hover:text-white"/><div className="text-left"><span>Ajuste</span><p className="text-[8px] text-gray-500 group-hover:text-blue-200 uppercase tracking-tighter">Inyectar palabra</p></div></button>
                                <button onClick={() => handleSelectionAction('delete')} className="w-full flex items-center gap-4 px-4 py-3 text-xs font-black text-red-400 hover:bg-red-600 hover:text-white rounded-[18px] transition-all group cursor-pointer"><Trash2 size={18} className="text-red-500 group-hover:text-white"/><div className="text-left"><span>Remover</span><p className="text-[8px] text-gray-500 group-hover:text-red-200 uppercase tracking-tighter">Borrar y corregir</p></div></button>
                            </div>
                            <div className="h-px bg-white/5 my-2 mx-4" />
                        </>
                    ) : (
                        <div className="px-5 py-2 border-b border-white/5 mb-2"><div className="flex items-center gap-2"><Sparkles size={12} className="text-purple-400" /><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Opciones de Mensaje</p></div></div>
                    )}
                    
                    <div className="px-2 space-y-1">
                        {(() => {
                            const fieldToPolish = contextMenu.field === 'emailSubject' ? 'emailBody' : contextMenu.field;
                            const hasChanges = generatedContent && originalContent && 
                                generatedContent[fieldToPolish] !== originalContent[fieldToPolish];
                            if (!hasChanges) return null;
                            
                            return (
                                <button onClick={handlePolishWithEdits} className="w-full flex items-center gap-4 px-4 py-3 text-xs font-black text-purple-300 hover:bg-purple-600 hover:text-white rounded-[18px] transition-all group bg-purple-500/5 border border-purple-500/10 cursor-pointer">
                                    <Sparkles size={18} className="text-purple-400 group-hover:text-white animate-pulse"/>
                                    <div className="text-left">
                                        <span>Pulir con mis cambios</span>
                                        <p className="text-[8px] text-purple-400 group-hover:text-purple-200 uppercase tracking-tighter">Regenerar con mis edits</p>
                                    </div>
                                </button>
                            );
                        })()}

                        <button onClick={() => { 
                            if (generatedContent) {
                                const field = contextMenu.field === 'emailSubject' ? 'emailBody' : contextMenu.field;
                                handleCopyToClipboard(generatedContent[field], contextMenu.targetType as any); 
                            }
                            setContextMenu(prev => ({ ...prev, visible: false })); 
                        }} className="w-full flex items-center gap-4 px-4 py-3 text-xs font-black text-gray-200 hover:bg-emerald-600 hover:text-white rounded-[18px] transition-all group cursor-pointer">
                            <Copy size={18} className="text-emerald-500 group-hover:text-white"/>
                            <div className="text-left">
                                <span>Copiar Mensaje</span>
                                <p className="text-[8px] text-gray-500 group-hover:text-emerald-200 uppercase tracking-tighter">Copiar con formato enriquecido</p>
                            </div>
                        </button>

                        {contextMenu.targetType === 'email' && (
                            <button onClick={() => { 
                                if (generatedContent) {
                                    handleCopyToClipboard(generatedContent.emailSubject, 'email'); 
                                }
                                setContextMenu(prev => ({ ...prev, visible: false })); 
                            }} className="w-full flex items-center gap-4 px-4 py-3 text-xs font-black text-gray-200 hover:bg-blue-600 hover:text-white rounded-[18px] transition-all group cursor-pointer">
                                <Copy size={18} className="text-blue-500 group-hover:text-white"/>
                                <div className="text-left">
                                    <span>Copiar Asunto</span>
                                    <p className="text-[8px] text-gray-500 group-hover:text-blue-200 uppercase tracking-tighter">Copiar asunto del correo</p>
                                </div>
                            </button>
                        )}
                    </div>
                </motion.div>
            )}</AnimatePresence>

            {/* OVERLAY DE CARGA PARA REFINAR SELECCIÓN */}
            {isProcessingSelection && (
                <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-2xl flex items-center justify-center z-[1100]">
                    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-gray-900/90 p-12 rounded-[50px] border-2 border-purple-500/30 flex flex-col items-center gap-8 shadow-2xl">
                        <div className="relative"><div className="w-24 h-24 rounded-full border-4 border-purple-500/20 border-t-purple-500 animate-spin" /><Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-purple-400" size={32} /></div>
                        <h4 className="text-xl font-black text-white uppercase tracking-[0.3em]">IA Refinando...</h4>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default EmailGenerator;
