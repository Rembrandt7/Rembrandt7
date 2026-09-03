
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import Spinner from './common/Spinner';
import IconButton from './common/IconButton';
import { ReferenceImage } from './common/ReferenceImageManager';
import MarkdownRenderer from './common/MarkdownRenderer';
import SmartTextarea from './common/SmartTextarea';
import { SUPABASE_CONFIG } from '../utils/constants';
import { useLinks } from '../contexts/LinkContext';
import { cleanJsonResponse } from '../utils/jsonUtils';
import { 
  History, Trash2, Mail, MessageSquare, Star, Sparkles, Send, Check, 
  RefreshCw, Pencil, Save, Copy, AlertTriangle, Mic, MicOff, RotateCcw, 
  Bot, Newspaper, ExternalLink, Bookmark, FileCheck, FileCode, Layers, 
  Building2, FileText, CheckCircle2, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { getFriendlyAiErrorMessage, isQuotaError } from '../utils/aiError';

type Tone = 'Profesional' | 'Casual';
type MessageLength = 'Reducido' | 'Medio' | 'Detallado';
type Gender = 'M' | 'F';
type CopiedState = 'email' | 'whatsapp' | null;

interface GeneratedContent {
  emailSubject: string;
  emailBody: string;
  whatsappMessage: string;
  improvedIdea?: string;
}

interface EmailPreset {
  id: string;
  title: string;
  subtitle: string;
  badgeBg: string;
  icon: React.ReactNode;
  generate: (greeting: string, project: string) => {
    emailSubject: string;
    emailBody: string;
    whatsappMessage: string;
    idea: string;
    improvedIdea?: string;
  };
}

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

const EMAIL_PRESETS: EmailPreset[] = [
  {
    id: 'revision',
    title: 'Envío para Revisión',
    subtitle: 'Validación y comentarios',
    badgeBg: 'bg-blue-600/20 text-blue-400 border border-blue-500/30',
    icon: <FileCheck size={18} className="text-blue-400" />,
    generate: (greeting: string, project: string) => {
      const projClean = project.trim();
      const projText = projClean ? ` de ${projClean}` : '';
      const projSubject = projClean ? ` - ${projClean}` : '';
      return {
        emailSubject: `Envío de Proyecto para Revisión${projSubject}`,
        emailBody: `${greeting},\n\nPor medio del presente correo, te hago llegar el proyecto${projText} para su debida revisión y validación correspondiente.\n\nAgradezco de antemano tu tiempo para revisar la información y quedo a la espera de tus observaciones o visto bueno para continuar con las siguientes etapas.\n\nCualquier duda o comentario, quedo a tus órdenes.\n\nAtte.\n\nArq. Rembrandt Blanco Arrambide`,
        whatsappMessage: `${greeting}, te acabo de enviar por correo el proyecto${projText} para su debida revisión. Quedo al pendiente de tus comentarios o visto bueno. ¡Saludos!`,
        idea: `Envío de proyecto${projText} para su debida revisión, validación y visto bueno.`,
        improvedIdea: `Envío formal de proyecto para validación técnica, revisión y visto bueno.`
      };
    }
  },
  {
    id: 'autocad',
    title: 'Proyecto en AutoCAD',
    subtitle: 'Archivos .DWG de AutoCAD',
    badgeBg: 'bg-red-600/20 text-red-400 border border-red-500/30',
    icon: <FileCode size={18} className="text-red-400" />,
    generate: (greeting: string, project: string) => {
      const projClean = project.trim();
      const projText = projClean ? ` correspondientes a ${projClean}` : '';
      const projSubject = projClean ? ` - ${projClean}` : '';
      return {
        emailSubject: `Envío de Proyecto en AutoCAD${projSubject}`,
        emailBody: `${greeting},\n\nAdjunto al presente correo te comparto los archivos del proyecto${projText} en formato AutoCAD (.dwg) para su integración y seguimiento técnico.\n\nPor favor me confirmas de recibido una vez que los hayas podido descargar y abrir correctamente.\n\nQuedo a tu disposición para cualquier duda o consulta técnica.\n\nAtte.\n\nArq. Rembrandt Blanco Arrambide`,
        whatsappMessage: `${greeting}, te compartí por correo los archivos de AutoCAD (.dwg)${projClean ? ` de ${projClean}` : ''}. Por favor me confirmas de recibido cuando los puedas abrir. ¡Gracias!`,
        idea: `Envío de archivos de proyecto en formato AutoCAD (.dwg) para su consulta técnica y seguimiento.`,
        improvedIdea: `Envío de proyecto en formato editable AutoCAD (.dwg) con confirmación de recepción solicitada.`
      };
    }
  },
  {
    id: 'dwg',
    title: 'Archivos en DWG',
    subtitle: 'Planos y editables DWG',
    badgeBg: 'bg-amber-600/20 text-amber-400 border border-amber-500/30',
    icon: <Layers size={18} className="text-amber-400" />,
    generate: (greeting: string, project: string) => {
      const projClean = project.trim();
      const projText = projClean ? ` del proyecto ${projClean}` : '';
      const projSubject = projClean ? ` - ${projClean}` : '';
      return {
        emailSubject: `Envío de Archivos DWG${projSubject}`,
        emailBody: `${greeting},\n\nTe hago entrega de los archivos digitales editables en formato DWG${projText}, actualizados a la fecha y listos para su compatibilización y trabajo.\n\nQuedo al pendiente de cualquier ajuste o requerimiento adicional que se necesite.\n\nAtte.\n\nArq. Rembrandt Blanco Arrambide`,
        whatsappMessage: `${greeting}, te he enviado los archivos DWG actualizados${projText} a tu correo. Quedo atento a cualquier detalle.`,
        idea: `Envío de planos y archivos digitales editables en formato DWG para su compatibilización y seguimiento.`,
        improvedIdea: `Entrega de planos y archivos DWG actualizados para compatibilización interdisciplinaria.`
      };
    }
  },
  {
    id: 'areas-municipales',
    title: 'Áreas Municipales',
    subtitle: 'Cuadros y donaciones',
    badgeBg: 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30',
    icon: <Building2 size={18} className="text-emerald-400" />,
    generate: (greeting: string, project: string) => {
      const projClean = project.trim();
      const projText = projClean ? ` ${projClean}` : '';
      const projSubject = projClean ? ` - ${projClean}` : '';
      return {
        emailSubject: `Envío de Áreas Municipales${projSubject}`,
        emailBody: `${greeting},\n\nPor medio de la presente, te hago entrega del desglose y cuadros de áreas municipales correspondientes al desarrollo${projText}, para su respectiva gestión y trámite correspondiente.\n\nAgradezco me informes si requieres alguna información complementaria o ajuste en la documentación para avanzar con el proceso.\n\nQuedo a tu disposición.\n\nAtte.\n\nArq. Rembrandt Blanco Arrambide`,
        whatsappMessage: `${greeting}, te acabo de mandar por correo los cuadros de áreas municipales${projClean ? ` de ${projClean}` : ''}. Me avisas si requieres algún dato o documento adicional. ¡Saludos!`,
        idea: `Envío de cuadro de áreas municipales, donaciones y superficies correspondientes al desarrollo para su trámite.`,
        improvedIdea: `Entrega formal de cuadros de áreas municipales y donaciones para gestión de trámite institucional.`
      };
    }
  },
  {
    id: 'info-solicitada',
    title: 'Información Solicitada',
    subtitle: 'Documentación requerida',
    badgeBg: 'bg-purple-600/20 text-purple-400 border border-purple-500/30',
    icon: <FileText size={18} className="text-purple-400" />,
    generate: (greeting: string, project: string) => {
      const projClean = project.trim();
      const projText = projClean ? ` al proyecto ${projClean}` : '';
      const projSubject = projClean ? ` - ${projClean}` : '';
      return {
        emailSubject: `Envío de Información Solicitada${projSubject}`,
        emailBody: `${greeting},\n\nEn atención a lo solicitado, te comparto la información y documentación técnica correspondiente${projText} para su debido seguimiento y análisis.\n\nQuedo a tus órdenes en caso de requerir cualquier aclaración o información adicional.\n\nAtte.\n\nArq. Rembrandt Blanco Arrambide`,
        whatsappMessage: `${greeting}, ya te mandé por correo la información técnica que me solicitaste${projClean ? ` de ${projClean}` : ''}. Quedo al pendiente de tus notas o comentarios. ¡Saludos!`,
        idea: `Envío de la información y documentación técnica solicitada para dar seguimiento al proyecto.`,
        improvedIdea: `Atención y entrega formal de la información técnica solicitada para el avance del proyecto.`
      };
    }
  },
  {
    id: 'seguimiento',
    title: 'Seguimiento de Proyecto',
    subtitle: 'Estatus y visto bueno',
    badgeBg: 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/30',
    icon: <Clock size={18} className="text-cyan-400" />,
    generate: (greeting: string, project: string) => {
      const projClean = project.trim();
      const projText = projClean ? ` ${projClean}` : '';
      const projSubject = projClean ? ` - ${projClean}` : '';
      return {
        emailSubject: `Seguimiento a Proyecto${projSubject}`,
        emailBody: `${greeting},\n\nEspero te encuentres muy bien. Te contacto para dar seguimiento cordial al estatus del proyecto${projText} enviado anteriormente, y consultar si cuentas con alguna observación o visto bueno para continuar con el proceso.\n\nAgradezco tu tiempo y atención, quedando a tus órdenes para cualquier duda.\n\nAtte.\n\nArq. Rembrandt Blanco Arrambide`,
        whatsappMessage: `${greeting}, gusto en saludarte. Quería consultar contigo si has tenido oportunidad de revisar el avance de ${projClean || 'el proyecto'}. Quedo a tus órdenes.`,
        idea: `Seguimiento cordial para conocer el estatus y visto bueno del proyecto enviado.`,
        improvedIdea: `Seguimiento ejecutivo cordial sobre el estatus de revisión y visto bueno del proyecto.`
      };
    }
  }
];

const getDBValue = (obj: any, keysToCheck: string[] | string): any => {
    if (!obj) return undefined;
    const keys = Array.isArray(keysToCheck) ? keysToCheck : [keysToCheck];
    
    // First, try exact case-insensitive match
    for (const keyName of keys) {
        const target = keyName.trim().toLowerCase();
        const foundKey = Object.keys(obj).find(k => k.trim().toLowerCase() === target);
        if (foundKey && obj[foundKey] !== undefined && obj[foundKey] !== null) {
            return obj[foundKey];
        }
    }
    
    // Second, try partial match (contains or is contained by)
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

const EmailGenerator: React.FC<EmailGeneratorProps> = ({ attachedImages, onAttachmentsChange }) => {
    const { config, updateConfig, googleApiConfig } = useLinks();
    const [idea, setIdea] = useState('');
    const [previousEmail, setPreviousEmail] = useState('');
    const [project, setProject] = useState('');
    const [tone, setTone] = useState<Tone>('Profesional');
    const [messageLength, setMessageLength] = useState<MessageLength>('Reducido');
    const [showHistory, setShowHistory] = useState(false);
    const [showPreviousContext, setShowPreviousContext] = useState(false);
    const history = config.aiHistory?.filter(h => h.type === 'email') || [];
    
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [fraccionamientosList, setFraccionamientosList] = useState<string[]>([]);
    const [favorites, setFavorites] = useState<string[]>(() => {
        try { 
            const saved = localStorage.getItem('contact-favorites');
            return saved ? JSON.parse(saved) : []; 
        } catch { return []; }
    });

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
    const [recipientTitle, setRecipientTitle] = useState('');
    const [titlesList, setTitlesList] = useState<string[]>(DEFAULT_TITLES);
    const [recipientName, setRecipientName] = useState('');
    const [recipientGender, setRecipientGender] = useState<Gender>('M');
    const [recipientEmailUser, setRecipientEmailUser] = useState('');
    const [recipientEmailDomain, setRecipientEmailDomain] = useState(emailDomains[0]);
    const [customDomain, setCustomDomain] = useState('');
    const [recipientEmailTld, setRecipientEmailTld] = useState(emailTlds[0]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
    const [originalContent, setOriginalContent] = useState<GeneratedContent | null>(null);
    const [copied, setCopied] = useState<CopiedState>(null);
    const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
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
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
            if (aiRecognitionRef.current) {
                aiRecognitionRef.current.stop();
            }
        };
    }, []);

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

    const handleResetAll = useCallback(() => {
        setIdea('');
        setPreviousEmail('');
        setProject('');
        setGeneratedContent(null);
        setOriginalContent(null);
        setError(null);
        setSelectedContactIndex('');
        setRecipientName('');
        setRecipientTitle('');
        setRecipientEmailUser('');
        setCustomDomain('');
        setSuggestion('');
        setSelectedPreset(null);
        onAttachmentsChange([]);
        toast.info("Todos los campos han sido reiniciados");
    }, [onAttachmentsChange]);

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
                headers: { 'apikey': SUPABASE_CONFIG.KEY, 'Authorization': `Bearer ${SUPABASE_CONFIG.KEY}`, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' },
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
            }
        } catch (err) { setFraccionamientosList(predefinedProjects); }
    }, []);

    useEffect(() => { fetchContacts(); fetchFraccionamientos(); fetchDictionary(); }, [fetchContacts, fetchFraccionamientos, fetchDictionary]);

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

    const handleContactSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const idxVal = e.target.value;
        setSelectedContactIndex(idxVal);
        if (idxVal === '') { setRecipientName(''); setRecipientTitle(''); return; }
        const idx = parseInt(idxVal, 10);
        const contact = sortedContacts[idx];
        if (contact) {
            setRecipientName(String(getDBValue(contact, ['cliente', 'nombre']) || ''));
            const dbTitle = getDBValue(contact, ['lic', 'titulo']) || '';
            setRecipientTitle(dbTitle);
            const gen = String(getDBValue(contact, 'genero') || '').toLowerCase();
            setRecipientGender(gen.startsWith('m') || gen.includes('fem') || gen.includes('femenino') ? 'F' : 'M');
            const email = getDBValue(contact, 'correo') || '';
            if (email.includes('@')) {
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
        }
    };

    const fullRecipientEmail = useMemo(() => {
        if (!recipientEmailUser) return '';
        const domainPart = recipientEmailDomain === 'Personalizado' ? `@${customDomain}` : recipientEmailDomain;
        return `${recipientEmailUser}${domainPart}${recipientEmailTld}`;
    }, [recipientEmailUser, recipientEmailDomain, customDomain, recipientEmailTld]);

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

    const handleApplyPreset = (preset: EmailPreset) => {
        setSelectedPreset(preset.id);
        const currentGreeting = getPresetGreeting();
        const content = preset.generate(currentGreeting, project);
        
        setIdea(content.idea);
        const generated: GeneratedContent = {
            emailSubject: content.emailSubject,
            emailBody: content.emailBody,
            whatsappMessage: content.whatsappMessage,
            improvedIdea: content.improvedIdea
        };
        setGeneratedContent(generated);
        setOriginalContent(generated);
        toast.success(`Plantilla "${preset.title}" cargada en formato estándar`);
    };

    const handleClearPreset = () => {
        setSelectedPreset(null);
    };

    const handleGenerate = useCallback(async (overrideIdea?: string) => {
        const targetIdea = typeof overrideIdea === 'string' ? overrideIdea : idea;
        if (!targetIdea.trim() && !previousEmail.trim()) { toast.error('Introduce una idea.'); return; }
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
            
            const systemInstruction = `Eres un experto en comunicación ejecutiva y estratégica. 
            Debes generar respuestas en formato JSON siguiendo strictly las reglas de estilo del usuario.`;
            
            const userPrompt = `INSTRUCCIONES CRÍTICAS:
            1. SALUDO: Comienza exactamente con "${greeting}".
            2. FORMATO: Usa DOBLE SALTO DE LÍNEA (\\n\\n) después del saludo y entre CADA párrafo.
            3. ESTRUCTURA: Usa listas numeradas o viñetas para puntos importantes. No amontones el texto.
            4. FIRMA: Termina SIEMPRE con: "Atte.\\n\\nArq. Rembrandt Blanco Arrambide".
            5. CONTEXTO: Proyecto: "${project}". Destinatario (nombre/apodo a usar): "${finalRecipient}".
               IMPORTANTE: Si está activo el uso de apodo o nombre corto, refiérete al destinatario siempre por su apodo ("${finalRecipient}") en lugar de su nombre formal completo en cualquier mención formal o informal a lo largo del cuerpo del mensaje.
            6. IDEA A DESARROLLAR: "${targetIdea}". 
            7. CONTEXTO ANTERIOR: "${previousEmail}".
            8. TONO: ${tone}. LONGITUD: ${messageLength}.

            Genera un objeto JSON con: emailSubject, emailBody (con doble salto de línea), whatsappMessage, improvedIdea.`;

            const response = await ai.models.generateContent({
                model: 'gemini-3.1-flash-lite',
                contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
                config: {
                    systemInstruction,
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            emailSubject: { type: Type.STRING },
                            emailBody: { type: Type.STRING },
                            whatsappMessage: { type: Type.STRING },
                            improvedIdea: { type: Type.STRING }
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
            saveToDictionary(targetIdea);
            
            updateConfig(prev => ({ ...prev, aiHistory: [{ id: Date.now().toString(), type: 'email' as const, original: targetIdea, result: JSON.stringify(parsed), timestamp: Date.now() }, ...(prev.aiHistory || [])].slice(0, 50) }));
            toast.success("Mensajes generados con éxito");
        } catch (e: any) { 
            console.error(e);
            const friendlyMsg = getFriendlyAiErrorMessage(e, !!googleApiConfig?.apiKey);
            setError(friendlyMsg); 
            toast.error("Error al generar: " + friendlyMsg);
        } finally { setIsLoading(false); }
    }, [idea, previousEmail, tone, messageLength, recipientName, project, useNickname, selectedContactIndex, sortedContacts, googleApiConfig, updateConfig, recipientGender]);

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

            const response = await ai.models.generateContent({
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
        handleGenerate(suggestedIdea);
    };

    const handleCopyToClipboard = async (text: string, type: CopiedState) => {
        const content = type === 'email' ? stripHtml(text) : text;
        await navigator.clipboard.writeText(content);
        setCopied(type); setTimeout(() => setCopied(null), 2000);
        toast.success("Copiado al portapapeles");
    };

    const handleSendEmail = () => {
        if (!generatedContent) return;
        window.location.href = `mailto:${fullRecipientEmail}?subject=${encodeURIComponent(generatedContent.emailSubject)}&body=${encodeURIComponent(stripHtml(generatedContent.emailBody))}`;
    };

    const handleSendWhatsApp = () => {
        if (!generatedContent) return;
        window.open(`https://wa.me/?text=${encodeURIComponent(generatedContent.whatsappMessage)}`, '_blank');
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); setIsDraggingOver(false);
        const file = e.dataTransfer.files[0];
        if (file?.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (ev) => onAttachmentsChange([...attachedImages, { name: file.name, base64: (ev.target?.result as string).split(',')[1], mimeType: file.type, preview: ev.target?.result as string }]);
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
            const response = await ai.models.generateContent({
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
            
            Entrega ÚNICAMENTE el texto final completamente pulido y limpio, sin introducciones, explicaciones ni etiquetas HTML adicionales.`;

            const response = await ai.models.generateContent({
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
        } finally {
            setIsProcessingSelection(false);
        }
    };

    useEffect(() => {
        const cb = () => setContextMenu(prev => ({ ...prev, visible: false }));
        window.addEventListener('click', cb);
        return () => window.removeEventListener('click', cb);
    }, []);

    const clearHistory = () => { if (window.confirm('¿Borrar historial?')) updateConfig(prev => ({ ...prev, aiHistory: prev.aiHistory?.filter(h => h.type !== 'email') })); };

    const onIdeaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setIdea(val);
        const lastWord = val.split(/\s+/).pop()?.toLowerCase() || '';
        if (lastWord.length > 1) {
            const match = dictionary.find(w => w.startsWith(lastWord) && w !== lastWord);
            setSuggestion(match ? match.slice(lastWord.length) : '');
        } else {
            setSuggestion('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Tab' && suggestion) {
            e.preventDefault();
            setIdea(prev => prev + suggestion + ' ');
            setSuggestion('');
        }
    };

    const acceptSuggestion = () => {
        setIdea(prev => prev + suggestion + ' ');
        setSuggestion('');
    };

    return (
        <div onDrop={handleDrop} onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }} className={`p-4 transition-all ${isDraggingOver ? 'bg-purple-500/10' : ''}`}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="p-2 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg shadow-md"><Mail size={20} className="text-white" /></div>
                    <div><h2 className="text-xl font-black text-white uppercase tracking-tighter">Generador de Mensajes</h2></div>
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
                <div className="flex items-center gap-2">
                    <button onClick={() => handleGenerate()} disabled={isLoading} className="px-4 py-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white rounded-lg font-black text-xs uppercase tracking-wider shadow-md flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">
                        {isLoading ? <RefreshCw className="animate-spin" size={16}/> : <><Sparkles size={16}/> <span>Generar</span></>}
                    </button>
                    <button onClick={() => setShowHistory(!showHistory)} className="px-4 py-2 bg-gray-800 rounded-lg text-xs font-black uppercase text-gray-400 border border-gray-700 hover:bg-gray-700 transition-colors">Historial</button>
                    <button onClick={handleResetAll} title="Reiniciar todos los campos" className="px-3 py-2 bg-gray-800 hover:bg-red-600/20 text-gray-400 hover:text-red-400 rounded-lg text-xs font-black uppercase border border-gray-700 hover:border-red-500/40 transition-all flex items-center gap-1.5">
                        <RotateCcw size={14} />
                        <span>Reset</span>
                    </button>
                    <button onClick={() => setShowAiConsultant(!showAiConsultant)} className={`px-3 py-2 rounded-lg text-xs font-black uppercase border transition-all flex items-center gap-1.5 ${showAiConsultant ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-amber-500/20' : 'bg-gray-800 hover:bg-purple-600/30 text-purple-300 border-gray-700 hover:border-purple-500/50'}`}>
                        <Bot size={14} />
                        <span>IA Consejera</span>
                    </button>
                </div>
            </div>

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
                                className="p-1.5 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-xs font-bold"
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
                                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all ${
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

            <AnimatePresence>{showHistory && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-4">
                    <div className="bg-gray-900 p-4 rounded-xl border border-gray-800">
                        <div className="flex justify-between mb-2"><h3 className="text-xs font-black text-gray-500 uppercase">Registros</h3><button onClick={clearHistory} className="text-xs text-red-500 hover:text-red-400">Limpiar</button></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2">
                            {history.map(item => (
                                <div key={item.id} className="p-3 bg-gray-800/30 rounded-lg border border-white/5 relative group">
                                    <button onClick={() => deleteHistoryItem(item.id)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100"><Trash2 size={14} className="text-gray-500 hover:text-red-400"/></button>
                                    <p className="text-[10px] text-gray-300 line-clamp-2">{item.original}</p>
                                    <button onClick={() => { setGeneratedContent(JSON.parse(item.result)); setIdea(item.original); setShowHistory(false); }} className="mt-2 w-full py-1 bg-white/5 hover:bg-white/10 text-[9px] uppercase font-black rounded-md transition-colors">Cargar</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            )}</AnimatePresence>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-4">
                    <div className="bg-gray-900/40 p-4 rounded-xl border border-gray-800/50 space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="relative flex-grow">
                                <select value={selectedContactIndex} onChange={handleContactSelect} className="w-full p-2.5 bg-gray-800 border-gray-700 rounded-lg text-sm text-white font-bold appearance-none pr-10 outline-none focus:border-purple-500/50">
                                    <option value="">Seleccionar contacto...</option>
                                    {sortedContacts.map((c, i) => (
                                        <option key={i} value={i}>
                                            {favorites.some(f => f.trim() === String(getDBValue(c, 'cliente') || '').trim()) ? '★ ' : ''}
                                            {getDBValue(c, 'cliente')}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                    {selectedContactIndex !== '' && (
                                        <button 
                                            onClick={(e) => toggleFavorite(e, getDBValue(sortedContacts[parseInt(selectedContactIndex)], 'cliente'))}
                                            className={`transition-colors ${favorites.some(f => f.trim() === String(getDBValue(sortedContacts[parseInt(selectedContactIndex)], 'cliente') || '').trim()) ? 'text-yellow-500' : 'text-gray-600'}`}
                                        >
                                            <Star size={16} fill={favorites.some(f => f.trim() === String(getDBValue(sortedContacts[parseInt(selectedContactIndex)], 'cliente') || '').trim()) ? "currentColor" : "none"} />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <button onClick={() => setUseNickname(!useNickname)} className={`h-[42px] px-4 rounded-lg border transition-all font-black text-xs uppercase ${useNickname ? 'border-yellow-500 text-yellow-500 bg-yellow-500/10' : 'border-gray-700 text-gray-500 hover:text-gray-300'}`}>{useNickname ? 'Apodo' : 'Nombre'}</button>
                        </div>
                        <div className="flex gap-2 items-center">
                            <button onClick={handleSaveNewContact} disabled={isSavingContact} className="p-2.5 bg-gray-800 border border-gray-700 rounded-lg text-purple-400 hover:text-purple-300 transition-colors">
                                {isSavingContact ? <Spinner size="4" /> : <Save size={18} />}
                            </button>
                            <select value={recipientTitle} onChange={e => setRecipientTitle(e.target.value)} className="w-20 p-2.5 bg-gray-800 border-gray-700 rounded-lg text-sm text-purple-400 font-black outline-none focus:border-purple-500/50">{titlesList.map(t => <option key={t} value={t}>{t || '---'}</option>)}</select>
                            <div className="flex-grow flex gap-2">
                                <input value={recipientName} onChange={e => setRecipientName(e.target.value)} className="flex-grow p-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white font-bold outline-none focus:border-purple-500/50" placeholder="Nombre..."/>
                                <div className="flex bg-gray-800 rounded-lg border border-gray-700 p-1">
                                    <button onClick={() => setRecipientGender('M')} className={`px-3 rounded-md text-xs font-black transition-all ${recipientGender === 'M' ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}>M</button>
                                    <button onClick={() => setRecipientGender('F')} className={`px-3 rounded-md text-xs font-black transition-all ${recipientGender === 'F' ? 'bg-pink-600 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}>F</button>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2 bg-gray-800/50 p-1.5 rounded-lg border border-gray-700">
                            <input value={recipientEmailUser} onChange={e => setRecipientEmailUser(e.target.value)} className="flex-grow bg-transparent p-1.5 text-sm font-bold text-white outline-none" placeholder="usuario"/>
                            <select value={recipientEmailDomain} onChange={e => setRecipientEmailDomain(e.target.value)} className="bg-gray-900 p-1.5 rounded-md text-xs font-black text-purple-400 outline-none">{emailDomains.map(d => <option key={d} value={d}>{d}</option>)}</select>
                            <select value={recipientEmailTld} onChange={e => setRecipientEmailTld(e.target.value)} className="bg-gray-900 p-1.5 rounded-md text-xs font-bold text-gray-400 outline-none">{emailTlds.map(t => <option key={t} value={t}>{t}</option>)}</select>
                        </div>
                    </div>

                    {/* Tablitas de Correos Preestablecidos */}
                    <div className="bg-gray-900/40 p-4 rounded-xl border border-gray-800/50 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-gradient-to-br from-indigo-600/30 to-purple-600/30 text-indigo-400 rounded-lg border border-indigo-500/30">
                                    <Bookmark size={15} />
                                </div>
                                <div>
                                    <h3 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-2">
                                        <span>Plantillas Preestablecidas</span>
                                        <span className="text-[9px] text-purple-300 font-black bg-purple-500/20 px-2 py-0.5 rounded-full border border-purple-500/30">Formatos Estándar</span>
                                    </h3>
                                    <p className="text-[10px] text-gray-400">Pica cualquiera para cargar el formato listo para enviar o editar</p>
                                </div>
                            </div>
                            {selectedPreset && (
                                <button 
                                    type="button"
                                    onClick={handleClearPreset} 
                                    className="text-[10px] font-black uppercase text-gray-400 hover:text-white px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 transition-colors border border-gray-700 cursor-pointer"
                                >
                                    Quitar selección
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {EMAIL_PRESETS.map(preset => {
                                const isSelected = selectedPreset === preset.id;
                                return (
                                    <button
                                        key={preset.id}
                                        type="button"
                                        onClick={() => handleApplyPreset(preset)}
                                        className={`flex flex-col text-left p-2.5 rounded-xl border transition-all duration-200 group relative overflow-hidden cursor-pointer ${
                                            isSelected
                                                ? 'bg-purple-600/20 border-purple-500 shadow-lg shadow-purple-500/20 ring-1 ring-purple-500/50 scale-[1.02]'
                                                : 'bg-gray-800/60 border-gray-700/60 hover:border-purple-500/50 hover:bg-gray-800/90 hover:scale-[1.02]'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-1.5 w-full">
                                            <div className={`p-1.5 rounded-lg ${preset.badgeBg}`}>
                                                {preset.icon}
                                            </div>
                                            {isSelected ? (
                                                <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-purple-500 text-white shadow-sm">
                                                    <CheckCircle2 size={10} />
                                                    <span>Activo</span>
                                                </span>
                                            ) : (
                                                <span className="text-[9px] font-bold text-gray-500 opacity-0 group-hover:opacity-100 uppercase transition-opacity">
                                                    Cargar ⚡
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-xs font-black text-white group-hover:text-purple-300 transition-colors line-clamp-1 leading-tight">
                                            {preset.title}
                                        </span>
                                        <span className="text-[10px] text-gray-400 group-hover:text-gray-300 line-clamp-1 mt-0.5">
                                            {preset.subtitle}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="bg-gray-900/40 p-4 rounded-xl border border-gray-800/50 space-y-3">
                            <div className="flex items-center justify-between px-1">
                                <label className="text-xs font-black uppercase text-gray-400 tracking-wider flex items-center gap-1.5">
                                    <span>Idea / Mensaje principal</span>
                                </label>
                                <button
                                    type="button"
                                    onClick={toggleListening}
                                    title={isListening ? "Detener dictado" : "Dictar con micrófono"}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md ${
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
                                            <span>Dictar por voz</span>
                                        </>
                                    )}
                                </button>
                            </div>
                            <div className="relative group">
                                <textarea 
                                    ref={ideaRef}
                                    value={idea} 
                                    onChange={onIdeaChange}
                                    onKeyDown={handleKeyDown}
                                    className="w-full p-4 pr-14 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white font-medium focus:border-purple-500/50 transition-all min-h-[100px] shadow-inner resize-none" 
                                    placeholder="¿Qué quieres decir? (Escribe o usa el micrófono para dictar)"
                                />
                                <button
                                    type="button"
                                    onClick={toggleListening}
                                    title={isListening ? "Detener dictado por voz" : "Dictar por voz con micrófono"}
                                    className={`absolute right-3 bottom-3 p-2.5 rounded-full transition-all shadow-lg border z-10 flex items-center justify-center ${
                                        isListening
                                            ? 'bg-red-600 border-red-400 text-white animate-pulse shadow-red-500/50 scale-110'
                                            : 'bg-purple-600/30 border-purple-500/50 text-purple-300 hover:bg-purple-600 hover:text-white hover:scale-105'
                                    }`}
                                >
                                    {isListening ? <MicOff size={18} className="animate-spin" /> : <Mic size={18} />}
                                </button>
                                {suggestion && (
                                    <div 
                                        onClick={acceptSuggestion}
                                        className="absolute left-4 top-4 pointer-events-none text-sm font-medium text-white/20 select-none whitespace-pre-wrap"
                                        style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                                    >
                                        <span className="opacity-0">{idea}</span>
                                        <span>{suggestion}</span>
                                    </div>
                                )}
                            </div>
                        <div className="border border-gray-700/50 rounded-lg overflow-hidden">
                            <button onClick={() => setShowPreviousContext(!showPreviousContext)} className="w-full p-2.5 bg-gray-800/40 text-xs text-left text-gray-400 hover:bg-gray-800/60 transition-colors flex justify-between items-center font-bold">
                                <span>Contexto anterior (opcional)</span>
                                <span>{showPreviousContext ? '▲' : '▼'}</span>
                            </button>
                            {showPreviousContext && (
                                <textarea value={previousEmail} onChange={e => setPreviousEmail(e.target.value)} className="w-full p-3 bg-gray-800/20 border-t border-gray-700/20 text-[11px] text-gray-400 outline-none min-h-[60px] italic resize-none" placeholder="Pega aquí el correo o mensaje al que estás respondiendo..."/>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="relative">
                                <input list="project-list" value={project} onChange={e => setProject(e.target.value)} className="w-full p-2.5 bg-gray-800/50 border border-gray-700/30 rounded-lg text-sm text-white font-bold outline-none focus:border-purple-500/50" placeholder="Proyecto..."/>
                                <datalist id="project-list">
                                    {fraccionamientosList.map(f => <option key={f} value={f} />)}
                                </datalist>
                            </div>
                            <div className="grid grid-cols-2 gap-2"><select value={tone} onChange={e => setTone(e.target.value as any)} className="p-2.5 bg-gray-800 border-gray-700 rounded-lg text-xs font-black text-purple-400 outline-none">{['Profesional', 'Casual'].map(t => <option key={t} value={t}>{t}</option>)}</select><select value={messageLength} onChange={e => setMessageLength(e.target.value as any)} className="p-2.5 bg-gray-800 border-gray-700 rounded-lg text-xs font-black text-white outline-none">{['Reducido', 'Medio', 'Detallado'].map(l => <option key={l} value={l}>{l}</option>)}</select></div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    {!generatedContent && !isLoading && (
                         <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-gray-900/20 rounded-xl p-8 text-center border-2 border-dashed border-gray-800/50">
                            <div className="p-6 bg-gray-900/50 rounded-full mb-6 border border-gray-800"><Send size={40} className="text-gray-800" /></div>
                            <h3 className="text-lg font-black text-gray-700 uppercase">Área de Resultados</h3>
                        </div>
                    )}
                    {isLoading && (
                        <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-gray-900/40 rounded-xl p-8 border-2 border-purple-500/10">
                            <RefreshCw size={50} className="animate-spin text-purple-500/30 mb-6" />
                            <h3 className="text-xl font-black text-white uppercase tracking-widest">El Estratega está redactando...</h3>
                        </div>
                    )}
                    {generatedContent && !isLoading && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-8 duration-700">
                            <div className="bg-gray-900/60 rounded-xl border border-gray-800 overflow-hidden shadow-xl">
                                <div className="bg-gray-800/50 px-4 py-3 border-b border-gray-800 flex justify-between items-center">
                                    <div className="flex items-center gap-2"><div className="p-2 bg-purple-600/10 rounded-lg border border-purple-500/30"><Mail size={16} className="text-purple-400" /></div><span className="text-xs font-black uppercase text-purple-300">Correo</span></div>
                                    <div className="flex gap-2"><button onClick={() => { setContextMenu({ ...contextMenu, visible: false, targetType: 'email', field: 'emailBody' }); handleSelectionAction('adjust'); }} className="px-3 py-1.5 bg-blue-600/10 text-blue-400 rounded-lg text-[10px] font-black uppercase border border-blue-500/30 hover:bg-blue-600 hover:text-white transition-all">Pulir</button><button onClick={() => handleCopyToClipboard(generatedContent.emailBody, 'email')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${copied === 'email' ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-300 border border-gray-700'}`}>{copied === 'email' ? 'Copiado' : 'Copiar'}</button></div>
                                </div>
                                <div className="p-4 space-y-3">
                                    <input value={generatedContent.emailSubject} onChange={e => setGeneratedContent({ ...generatedContent, emailSubject: e.target.value })} onContextMenu={e => handleContextMenu(e, 'email', 'emailSubject')} className="w-full bg-gray-800/40 border border-gray-700/50 rounded-lg px-4 py-2 text-sm text-white font-black outline-none focus:border-purple-500" placeholder="Asunto..."/>
                                    <textarea value={generatedContent.emailBody} onChange={e => setGeneratedContent({ ...generatedContent, emailBody: e.target.value })} onContextMenu={e => handleContextMenu(e, 'email', 'emailBody')} className="w-full h-64 bg-gray-800/40 border border-gray-700/50 rounded-lg px-4 py-3 text-[14px] text-gray-200 font-medium resize-none outline-none focus:border-purple-500 leading-relaxed" placeholder="Edita aquí..."/>
                                    <button onClick={handleSendEmail} className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-700 text-white rounded-lg font-black text-xs uppercase tracking-widest shadow-md flex justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-all"><Send size={16}/> Despachar</button>
                                </div>
                            </div>
                            <div className="bg-gray-900/60 rounded-xl border border-gray-800 overflow-hidden shadow-xl">
                                <div className="bg-gray-800/50 px-4 py-3 border-b border-gray-800 flex justify-between items-center">
                                    <div className="flex items-center gap-2"><div className="p-2 bg-green-600/10 rounded-lg border border-green-500/30"><MessageSquare size={16} className="text-green-400" /></div><span className="text-xs font-black uppercase text-green-300">WhatsApp</span></div>
                                    <div className="flex gap-2"><button onClick={() => { setContextMenu({ ...contextMenu, visible: false, targetType: 'whatsapp', field: 'whatsappMessage' }); handleSelectionAction('adjust'); }} className="px-3 py-1.5 bg-blue-600/10 text-blue-400 rounded-lg text-[10px] font-black uppercase border border-blue-500/30 hover:bg-blue-600 hover:text-white transition-all">Pulir</button><button onClick={() => handleCopyToClipboard(generatedContent.whatsappMessage, 'whatsapp')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${copied === 'whatsapp' ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-300 border border-gray-700'}`}>{copied === 'whatsapp' ? 'Copiado' : 'Copiar'}</button></div>
                                </div>
                                <div className="p-4 space-y-3">
                                    <textarea value={generatedContent.whatsappMessage} onChange={e => setGeneratedContent({ ...generatedContent, whatsappMessage: e.target.value })} onContextMenu={e => handleContextMenu(e, 'whatsapp', 'whatsappMessage')} className="w-full h-40 bg-gray-800/40 border border-gray-700/50 rounded-lg px-4 py-3 text-[14px] text-gray-200 font-medium resize-none outline-none focus:border-green-500 leading-relaxed" placeholder="WhatsApp..."/>
                                    <button onClick={handleSendWhatsApp} className="w-full py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-black text-xs uppercase tracking-widest shadow-md flex justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-all"><MessageSquare size={16}/> Lanzar</button>
                                </div>
                            </div>
                            {generatedContent.improvedIdea && (
                                <div className="bg-gradient-to-br from-purple-900/20 to-indigo-900/10 rounded-xl border border-purple-500/20 p-4 shadow-md relative">
                                    <div className="absolute top-2 left-2 opacity-10"><Sparkles size={24}/></div>
                                    <p className="text-[14px] text-purple-200 font-medium italic text-center leading-relaxed">"{generatedContent.improvedIdea}"</p>
                                    <div className="mt-4 flex justify-center"><button onClick={() => { setIdea(generatedContent.improvedIdea || ''); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-[9px] font-black uppercase px-4 py-2 bg-purple-600/20 text-purple-200 rounded-lg border border-purple-500/20 hover:bg-purple-600 transition-all">Usar como base</button></div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <AnimatePresence>{contextMenu.visible && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} style={{ top: contextMenu.y, left: contextMenu.x }} className="fixed z-[1000] min-w-[280px] bg-gray-900/95 backdrop-blur-3xl border-2 border-white/10 rounded-[28px] shadow-2xl py-3 overflow-hidden" onClick={e => e.stopPropagation()}>
                    {contextMenu.selectedText ? (
                        <>
                            <div className="px-5 py-3 border-b-2 border-white/5 mb-2 bg-white/5"><div className="flex items-center gap-2 mb-1"><Sparkles size={12} className="text-purple-500" /><p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">IA Sugerencia</p></div><p className="text-[13px] text-purple-300 truncate italic font-medium">"{contextMenu.selectedText}"</p></div>
                            <div className="px-2 space-y-1">
                                <button onClick={() => handleSelectionAction('variation')} className="w-full flex items-center gap-4 px-4 py-3 text-xs font-black text-gray-200 hover:bg-purple-600 hover:text-white rounded-[18px] transition-all group"><RefreshCw size={18} className="text-purple-500 group-hover:text-white group-hover:rotate-180 transition-all duration-500"/><div className="text-left"><span>Variación</span><p className="text-[8px] text-gray-500 group-hover:text-purple-200 uppercase tracking-tighter">Otra forma de decirlo</p></div></button>
                                <button onClick={() => { const n = prompt('¿Qué integrar?'); if(n) handleSelectionAction('replace', n); }} className="w-full flex items-center gap-4 px-4 py-3 text-xs font-black text-gray-200 hover:bg-blue-600 hover:text-white rounded-[18px] transition-all group"><Pencil size={18} className="text-blue-500 group-hover:text-white"/><div className="text-left"><span>Ajuste</span><p className="text-[8px] text-gray-500 group-hover:text-blue-200 uppercase tracking-tighter">Inyectar palabra</p></div></button>
                                <button onClick={() => handleSelectionAction('delete')} className="w-full flex items-center gap-4 px-4 py-3 text-xs font-black text-red-400 hover:bg-red-600 hover:text-white rounded-[18px] transition-all group"><Trash2 size={18} className="text-red-500 group-hover:text-white"/><div className="text-left"><span>Remover</span><p className="text-[8px] text-gray-500 group-hover:text-red-200 uppercase tracking-tighter">Borrar y corregir</p></div></button>
                            </div>
                            <div className="h-px bg-white/5 my-2 mx-4" />
                        </>
                    ) : (
                        <div className="px-5 py-2 border-b border-white/5 mb-2"><div className="flex items-center gap-2"><Sparkles size={12} className="text-purple-400" /><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Opciones de Mensaje</p></div></div>
                    )}
                    
                    <div className="px-2 space-y-1">
                        {/* Pulir con cambios - only shown if text has changes relative to original baseline */}
                        {(() => {
                            const fieldToPolish = contextMenu.field === 'emailSubject' ? 'emailBody' : contextMenu.field;
                            const hasChanges = generatedContent && originalContent && 
                                generatedContent[fieldToPolish] !== originalContent[fieldToPolish];
                            if (!hasChanges) return null;
                            
                            return (
                                <button onClick={handlePolishWithEdits} className="w-full flex items-center gap-4 px-4 py-3 text-xs font-black text-purple-300 hover:bg-purple-600 hover:text-white rounded-[18px] transition-all group bg-purple-500/5 border border-purple-500/10">
                                    <Sparkles size={18} className="text-purple-400 group-hover:text-white animate-pulse"/>
                                    <div className="text-left">
                                        <span>Pulir con mis cambios</span>
                                        <p className="text-[8px] text-purple-400 group-hover:text-purple-200 uppercase tracking-tighter">Regenerar con mis edits</p>
                                    </div>
                                </button>
                            );
                        })()}

                        {/* Copiar mensaje (cuerpo) */}
                        <button onClick={() => { 
                            if (generatedContent) {
                                const field = contextMenu.field === 'emailSubject' ? 'emailBody' : contextMenu.field;
                                handleCopyToClipboard(generatedContent[field], contextMenu.targetType as any); 
                            }
                            setContextMenu(prev => ({ ...prev, visible: false })); 
                        }} className="w-full flex items-center gap-4 px-4 py-3 text-xs font-black text-gray-200 hover:bg-emerald-600 hover:text-white rounded-[18px] transition-all group">
                            <Copy size={18} className="text-emerald-500 group-hover:text-white"/>
                            <div className="text-left">
                                <span>Copiar Mensaje</span>
                                <p className="text-[8px] text-gray-500 group-hover:text-emerald-200 uppercase tracking-tighter">Copiar todo el cuerpo</p>
                            </div>
                        </button>

                        {/* Copiar asunto (only if right-clicked item is email related) */}
                        {contextMenu.targetType === 'email' && (
                            <button onClick={() => { 
                                if (generatedContent) {
                                    handleCopyToClipboard(generatedContent.emailSubject, 'email'); 
                                }
                                setContextMenu(prev => ({ ...prev, visible: false })); 
                            }} className="w-full flex items-center gap-4 px-4 py-3 text-xs font-black text-gray-200 hover:bg-blue-600 hover:text-white rounded-[18px] transition-all group">
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
