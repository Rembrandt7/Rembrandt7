import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import Spinner from './common/Spinner';
import { ReferenceImage } from './common/ReferenceImageManager';
import { SUPABASE_CONFIG } from '../utils/constants';
import { supabase } from '../services/supabaseClient';
import { useLinks } from '../contexts/LinkContext';
import { cleanJsonResponse } from '../utils/jsonUtils';
import { 
  Trash2, Mail, MessageSquare, Star, Sparkles, Send, 
  RefreshCw, Pencil, Save, Copy, AlertTriangle, Mic, MicOff, RotateCcw, 
  Bot, Newspaper, ExternalLink, Bookmark, Building2, CheckCircle2, Check,
  Clock, Zap, Search, Image as ImageIcon, Users, ChevronDown, ChevronUp,
  FileText, Printer, Reply, UserPlus, X, Paperclip, UploadCloud, Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { getFriendlyAiErrorMessage, isQuotaError, isUnavailableError } from '../utils/aiError';
import { generateContentWithFallback, getGeminiClient, GEMINI_MODELS } from '../services/geminiService';
import { useDeviceLayout } from '../hooks/useDeviceLayout';

export interface RealAttachmentFile {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  base64: string;
  fileObj?: File;
  cloudUrl?: string;
}

type Tone = 'Profesional' | 'Casual';
type MessageLength = 'Reducido' | 'Medio' | 'Detallado';
type Gender = 'M' | 'F';
type CopiedState = 'email' | 'whatsapp' | 'preset-email' | 'preset-wa' | null;
type TemplateCategory = 'javer' | '3d';

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
  | 'Cálculo Estructural'
  | 'Piezas impresas en PLA/PETG'
  | 'Llaveros personalizados 3D'
  | 'Clickers antiestrés 3D'
  | 'Pintado y detallado a mano'
  | 'Archivo 3D (STL / 3MF)'
  | 'Maqueta / Prototipo 3D';

export type DeliveryMethod = 
  | 'Revisión' 
  | 'Entrega' 
  | 'Proyecto' 
  | 'Anteproyecto'
  | 'Cotización 3D'
  | 'Confirmación y Anticipo'
  | 'Pieza Lista para Entrega'
  | 'Avance de Impresión';

const DELIVERABLE_OPTIONS: DeliverableType[] = [
  'Planos en AutoCAD',
  'Planos en PDF',
  'Renders',
  'Recorrido',
  'Presentación',
  'Fotomontaje',
  'Cálculo Estructural'
];

const DELIVERABLE_OPTIONS_3D: DeliverableType[] = [
  'Piezas impresas en PLA/PETG',
  'Llaveros personalizados 3D',
  'Clickers antiestrés 3D',
  'Pintado y detallado a mano',
  'Archivo 3D (STL / 3MF)',
  'Maqueta / Prototipo 3D'
];

const METHOD_OPTIONS: DeliveryMethod[] = [
  'Revisión',
  'Entrega',
  'Proyecto',
  'Anteproyecto'
];

const METHOD_OPTIONS_3D: DeliveryMethod[] = [
  'Cotización 3D',
  'Confirmación y Anticipo',
  'Pieza Lista para Entrega',
  'Avance de Impresión'
];

const QUICK_REPLY_INTENTS = [
  {
    id: 'qr-ack',
    label: '✅ Confirmar de recibido',
    prompt: 'Confirmar de recibido el correo/información, indicar que ya lo estamos revisando y trabajando en ello, y que daremos seguimiento puntual.'
  },
  {
    id: 'qr-meet',
    label: '📅 Agendar revisión',
    prompt: 'Agradecer el correo y proponer agendar una breve sesión o llamada de revisión para alinear detalles y comentarios.'
  },
  {
    id: 'qr-missing',
    label: '⚠️ Solicitar info faltante',
    prompt: 'Comentar amablemente que para poder avanzar con el entregable necesitamos que nos compartan la información, planos base o definiciones pendientes.'
  },
  {
    id: 'qr-fixed',
    label: '🔄 Correcciones aplicadas',
    prompt: 'Informar que ya se atendieron y aplicaron todas las observaciones solicitadas en el correo anterior y se adjunta/comparte la versión actualizada para visto bueno.'
  },
  {
    id: 'qr-deadline',
    label: '⏳ Actualizar fecha entrega',
    prompt: 'Agradecer el seguimiento e informar la fecha compromiso actualizada en la que estaremos enviando los entregables completos.'
  }
];

const getSmartDeadlines = (): { label: string; value: string }[] => {
  const now = new Date();
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  
  // Mañana
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const tomorrowStr = `mañana ${tomorrow.getDate()} de ${months[tomorrow.getMonth()]} antes de las 12:00 PM`;

  // Viernes de esta semana (o próximo viernes)
  const friday = new Date(now);
  const day = now.getDay();
  const diffToFriday = day <= 5 ? (5 - day === 0 ? 7 : 5 - day) : 6;
  friday.setDate(now.getDate() + diffToFriday);
  const fridayStr = `este viernes ${friday.getDate()} de ${months[friday.getMonth()]}`;

  // En 3 días
  const in3Days = new Date(now);
  in3Days.setDate(now.getDate() + 3);
  const in3DaysStr = `el ${in3Days.getDate()} de ${months[in3Days.getMonth()]}`;

  return [
    { label: '⚡ Hoy 6:00 PM', value: 'hoy antes de las 6:00 PM' },
    { label: '🌤️ Mañana 12:00 PM', value: tomorrowStr },
    { label: '📅 Este Viernes', value: fridayStr },
    { label: '⏳ En 3 días', value: in3DaysStr },
    { label: '🚨 Urgente hoy', value: 'el día de hoy a la brevedad posible' }
  ];
};

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
  category?: TemplateCategory;
}

const QUICK_PRESETS: QuickPreset[] = [
  {
    id: 'qp-1',
    name: 'Planos AutoCAD (Revisión)',
    deliverables: ['Planos en AutoCAD'],
    method: 'Revisión',
    category: 'javer'
  },
  {
    id: 'qp-2',
    name: 'Planos PDF (Revisión)',
    deliverables: ['Planos en PDF'],
    method: 'Revisión',
    category: 'javer'
  },
  {
    id: 'qp-3',
    name: 'Planos AutoCAD + PDF (Entrega)',
    deliverables: ['Planos en AutoCAD', 'Planos en PDF'],
    method: 'Entrega',
    category: 'javer'
  },
  {
    id: 'qp-4',
    name: 'Renders y Fotomontaje',
    deliverables: ['Renders', 'Fotomontaje'],
    method: 'Revisión',
    category: 'javer'
  },
  {
    id: 'qp-5',
    name: 'Anteproyecto y Presentación',
    deliverables: ['Presentación', 'Renders'],
    method: 'Anteproyecto',
    category: 'javer'
  },
  {
    id: 'qp-6',
    name: 'Recorrido Virtual',
    deliverables: ['Recorrido'],
    method: 'Revisión',
    category: 'javer'
  },
  {
    id: 'qp-7',
    name: 'Cálculo Estructural (Entrega)',
    deliverables: ['Cálculo Estructural'],
    method: 'Entrega',
    category: 'javer'
  }
];

const QUICK_PRESETS_3D: QuickPreset[] = [
  {
    id: 'qp3d-1',
    name: '💰 Cotización de Impresión 3D',
    deliverables: ['Piezas impresas en PLA/PETG'],
    method: 'Cotización 3D',
    category: '3d'
  },
  {
    id: 'qp3d-2',
    name: '🔑 Cotización Lote Llaveros / Clickers',
    deliverables: ['Llaveros personalizados 3D', 'Clickers antiestrés 3D'],
    method: 'Cotización 3D',
    category: '3d'
  },
  {
    id: 'qp3d-3',
    name: '✅ Confirmar Pedido y Anticipo (50%)',
    deliverables: ['Piezas impresas en PLA/PETG'],
    method: 'Confirmación y Anticipo',
    category: '3d'
  },
  {
    id: 'qp3d-4',
    name: '🎁 Pieza Terminada y Lista para Entrega',
    deliverables: ['Piezas impresas en PLA/PETG', 'Pintado y detallado a mano'],
    method: 'Pieza Lista para Entrega',
    category: '3d'
  },
  {
    id: 'qp3d-5',
    name: '📸 Muestra de Avance de Impresión',
    deliverables: ['Piezas impresas en PLA/PETG'],
    method: 'Avance de Impresión',
    category: '3d'
  }
];

interface PresetOptions {
  cloudLink?: string;
  deadline?: string;
  toneStyle?: 'colaborativo' | 'formal';
  attachedFileNames?: string[];
  category?: TemplateCategory;
}

const buildPresetMessage = (
  deliverables: DeliverableType[],
  method: DeliveryMethod,
  greeting: string,
  projectName: string,
  options?: PresetOptions
) => {
  const { cloudLink = '', deadline = '', toneStyle = 'colaborativo', attachedFileNames = [], category = 'javer' } = options || {};

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

  if (category === '3d' || method === 'Cotización 3D' || method === 'Confirmación y Anticipo' || method === 'Pieza Lista para Entrega' || method === 'Avance de Impresión') {
    if (method === 'Cotización 3D') {
      subject = `Cotización de Impresión 3D: ${deliverableTitle}${projSubject}`;
      actionText = `te comparto la propuesta y cotización correspondiente a ${deliverableText}${projText}, contemplando materiales de alta calidad y acabado detallado.`;
      closingText = 'Para iniciar la producción en fila de impresión se solicita un 50% de anticipo y el resto contra entrega. Quedo atento a tus comentarios para programar tu pedido.';
    } else if (method === 'Confirmación y Anticipo') {
      subject = `Confirmación de Pedido 3D: ${deliverableTitle}${projSubject}`;
      actionText = `confirmo de recibido tu pedido y anticipo para la fabricación de ${deliverableText}${projText}. Tu proyecto ya fue ingresado a la fila de impresión 3D.`;
      closingText = 'Te estaré compartiendo fotos del avance y te avisaré en cuanto tus piezas estén listas para entrega.';
    } else if (method === 'Pieza Lista para Entrega') {
      subject = `¡Pedido 3D Listo para Entrega! (${deliverableTitle})${projSubject}`;
      actionText = `te informo con gusto que tu pedido de ${deliverableText}${projText} ya está completamente terminado, revisado y listo para entrega.`;
      closingText = 'Quedo al pendiente para que me indiques el horario o punto de entrega que mejor te acomode para liquidar el saldo restante.';
    } else {
      subject = `Avance de Impresión 3D: ${deliverableTitle}${projSubject}`;
      actionText = `te comparto el avance actual de fabricación de tu pedido de ${deliverableText}${projText}.`;
      closingText = 'Todo marcha en tiempo y forma; te notificaré en cuanto finalice el proceso y post-procesado.';
    }
  } else if (method === 'Revisión') {
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

  const filesSection = attachedFileNames.length > 0
    ? `\n\nArchivos incluidos en esta entrega (${attachedFileNames.length}):\n${attachedFileNames.map(f => `• ${f}`).join('\n')}`
    : '';

  const cleanLink = cloudLink.trim();
  const linkSection = cleanLink 
    ? `\n\nPuedes consultar o descargar los archivos completos en el siguiente enlace:\n${cleanLink}`
    : '';

  const cleanDeadline = deadline.trim();
  const deadlineSection = cleanDeadline
    ? (category === '3d'
        ? `\n\nFecha estimada de entrega / compromiso: ${cleanDeadline}.`
        : `\n\nAgradeceré contar con tus comentarios o visto bueno a más tardar el ${cleanDeadline} para dar continuidad al programa.`)
    : '';

  const emailBody = `${greeting},\n\n${actionText}${filesSection}${linkSection}\n\n${closingText}${deadlineSection}\n\nAtte.\n\nArq. Rembrandt Blanco Arrambide`;
  
  const whatsappFiles = attachedFileNames.length > 0 ? ` (${attachedFileNames.length} archivo(s): ${attachedFileNames.slice(0, 3).join(', ')}${attachedFileNames.length > 3 ? '...' : ''})` : '';
  const whatsappLink = cleanLink ? ` Enlace: ${cleanLink}` : '';
  const whatsappDeadline = cleanDeadline ? ` (Fecha: ${cleanDeadline})` : '';
  const whatsappMessage = category === '3d'
    ? `${greeting}, ${actionText}${whatsappFiles}${whatsappLink}${whatsappDeadline} ${closingText} ¡Saludos!`
    : `${greeting}, te acabo de enviar por correo ${deliverableText} (${method.toLowerCase()})${projClean ? ` de ${projClean}` : ''}${whatsappFiles}.${whatsappLink}${whatsappDeadline} ${closingText} ¡Saludos!`;

  const idea = `Envío de ${deliverableText} (${method.toLowerCase()})${projText}.${attachedFileNames.length > 0 ? ` Archivos: ${attachedFileNames.join(', ')}.` : ''}${cleanLink ? ` Descarga: ${cleanLink}` : ''}${cleanDeadline ? ` Plazo: ${cleanDeadline}` : ''}`;

  return {
    emailSubject: subject,
    emailBody,
    whatsappMessage,
    idea,
    improvedIdea: `Envío estándar de ${deliverableText} (${method.toLowerCase()})${projText}.`
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
    const { isMobile, isDesktop, isFoldCover, isFoldUnfolded } = useDeviceLayout();
    const isFoldCoverMode = isFoldCover;
    const isFoldUnfoldedMode = isFoldUnfolded;
    const isDesktopMode = !isFoldCover && !isFoldUnfolded;
    
    // Modo de trabajo: 'ai' = Redactor Libre con IA (primero por defecto), 'quick' = Entregas y Formatos (0s)
    const [activeMode, setActiveMode] = useState<'ai' | 'quick'>('ai');
    const [isAiSectionOpen, setIsAiSectionOpen] = useState(true);
    const [isQuickSectionOpen, setIsQuickSectionOpen] = useState(true);
    const [showRecipientDetails, setShowRecipientDetails] = useState(false);

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
    const [recipientNickname, setRecipientNickname] = useState('Arqui');
    const [recipientRelation, setRecipientRelation] = useState('Javer');
    const [recipientGender, setRecipientGender] = useState<Gender>('M');
    const [recipientEmailUser, setRecipientEmailUser] = useState('egabino');
    const [recipientEmailDomain, setRecipientEmailDomain] = useState('@javer');
    const [recipientEmailTld, setRecipientEmailTld] = useState('.com.mx');
    const [isNewContactMode, setIsNewContactMode] = useState(false);
    const [showMobileRecipientEditor, setShowMobileRecipientEditor] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
    const [originalContent, setOriginalContent] = useState<GeneratedContent | null>(null);
    const [alternativeSubjects, setAlternativeSubjects] = useState<string[]>([]);
    const [copied, setCopied] = useState<CopiedState>(null);
    
    // Opciones de entregables y nuevas mejoras
    const [templateCategory, setTemplateCategory] = useState<TemplateCategory>('javer');
    const [selectedDeliverables, setSelectedDeliverables] = useState<DeliverableType[]>(['Planos en AutoCAD', 'Planos en PDF']);
    const [selectedMethod, setSelectedMethod] = useState<DeliveryMethod>('Revisión');
    const [activePresetId, setActivePresetId] = useState<string | null>('qp-3');
    const [cloudLink, setCloudLink] = useState('');
    const [deadline, setDeadline] = useState('');
    const [templateTone, setTemplateTone] = useState<'colaborativo' | 'formal'>('colaborativo');
    const [attachedFileNames, setAttachedFileNames] = useState<string[]>([]);
    const [realAttachments, setRealAttachments] = useState<RealAttachmentFile[]>([]);
    const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
    const [isSendingDirectEmail, setIsSendingDirectEmail] = useState(false);
    const fileListInputRef = useRef<HTMLInputElement>(null);
    const [ccRecipients, setCcRecipients] = useState<{ name: string; email: string }[]>([]);
    const [showCcSelector, setShowCcSelector] = useState(false);
    const smartDeadlines = useMemo(() => getSmartDeadlines(), []);

    const [customPresets, setCustomPresets] = useState<QuickPreset[]>(() => {
        try {
            if (config.customQuickPresets && Array.isArray(config.customQuickPresets) && config.customQuickPresets.length > 0) {
                return config.customQuickPresets;
            }
            const saved = localStorage.getItem('custom-quick-presets');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    // Sincronizar plantillas personalizadas cuando cargue config desde Supabase
    useEffect(() => {
        if (config.customQuickPresets && Array.isArray(config.customQuickPresets)) {
            setCustomPresets(prev => {
                const mergedMap = new Map<string, QuickPreset>();
                prev.forEach(p => mergedMap.set(p.id, p));
                config.customQuickPresets!.forEach((p: QuickPreset) => mergedMap.set(p.id, p));
                const merged = Array.from(mergedMap.values());
                try { localStorage.setItem('custom-quick-presets', JSON.stringify(merged)); } catch {}
                return merged;
            });
        }
    }, [config.customQuickPresets]);

    const handleSwitchCategory = useCallback((cat: TemplateCategory) => {
        setTemplateCategory(cat);
        if (cat === '3d') {
            setSelectedDeliverables(['Piezas impresas en PLA/PETG']);
            setSelectedMethod('Cotización 3D');
            setActivePresetId('qp3d-1');
        } else {
            setSelectedDeliverables(['Planos en AutoCAD', 'Planos en PDF']);
            setSelectedMethod('Revisión');
            setActivePresetId('qp-3');
        }
    }, []);

    const toggleCcContact = useCallback((contact: Contact) => {
        const name = String(getDBValue(contact, ['cliente', 'nombre']) || '').trim();
        const rawEmail = String(getDBValue(contact, 'correo') || '').trim();
        if (!rawEmail) {
            toast.warning(`El contacto "${name}" no tiene correo registrado`);
            return;
        }
        const email = rawEmail.includes('@') ? rawEmail : `${rawEmail}@javer.com.mx`;
        setCcRecipients(prev => {
            const exists = prev.some(c => c.email.toLowerCase() === email.toLowerCase());
            if (exists) {
                return prev.filter(c => c.email.toLowerCase() !== email.toLowerCase());
            }
            return [...prev, { name: name || email, email }];
        });
    }, []);

    const removeAttachedFileByName = useCallback((fileName: string) => {
        setAttachedFileNames(prev => prev.filter(f => f !== fileName));
        setRealAttachments(prev => prev.filter(f => f.name !== fileName));
    }, []);

    const clearAllAttachedFiles = useCallback(() => {
        setAttachedFileNames([]);
        setRealAttachments([]);
    }, []);

    const handleFilesSelectedForListing = useCallback((files: FileList | File[] | null) => {
        if (!files || files.length === 0) return;
        const fileArray = Array.from(files);
        const newNames: string[] = [];

        fileArray.forEach(f => {
            if (f.name && !attachedFileNames.includes(f.name)) {
                newNames.push(f.name);
            }
            const reader = new FileReader();
            reader.onload = (ev) => {
                const resultStr = String(ev.target?.result || '');
                const base64Content = resultStr.includes(',') ? resultStr.split(',')[1] : resultStr;
                setRealAttachments(prev => {
                    const filtered = prev.filter(item => item.name !== f.name);
                    return [
                        ...filtered,
                        {
                            id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                            name: f.name,
                            size: f.size,
                            mimeType: f.type || 'application/octet-stream',
                            base64: base64Content,
                            fileObj: f
                        }
                    ];
                });
            };
            reader.readAsDataURL(f);
        });

        if (newNames.length > 0) {
            setAttachedFileNames(prev => Array.from(new Set([...prev, ...newNames])));
            toast.success(`📎 ${newNames.length} archivo(s) adjuntados y listados en el correo`);
        }
    }, [attachedFileNames]);

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
        const cName = String(getDBValue(contact, ['cliente', 'nombre']) || '');
        setRecipientName(cName);
        const dbTitle = getDBValue(contact, ['lic', 'titulo']) || '';
        setRecipientTitle(dbTitle);
        const gen = String(getDBValue(contact, ['genero', 'Genero']) || '').toLowerCase();
        const isFemale = gen.startsWith('f') || gen.includes('muj') || gen.includes('fem');
        setRecipientGender(isFemale ? 'F' : 'M');
        const email = getDBValue(contact, 'correo') || '';
        if (email) {
            setRecipientEmailUser(email);
        }
        const dbApodo = getDBValue(contact, ['Apodo(manera en que me refiero)', 'apodo', 'alias']) || '';
        setRecipientNickname(dbApodo || cName.split(' ')[0] || '');
        const dbRelacion = getDBValue(contact, ['Relacion', 'relacion']) || 'Javer';
        setRecipientRelation(dbRelacion);

        setContactSearchQuery('');
        setIsSearchFocused(false);
    }, []);

    const handleContactSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const idxVal = e.target.value;
        if (idxVal === '') {
            setSelectedContactIndex('');
            setRecipientName('');
            setRecipientNickname('');
            setRecipientRelation('Javer');
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
        setTemplateCategory('javer');
        setAttachedFileNames([]);
        setCcRecipients([]);
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
            setRecipientNickname('Arqui');
            setRecipientRelation('Javer');
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
        const userTrimmed = recipientEmailUser.trim();
        if (userTrimmed.includes('@')) {
            return userTrimmed;
        }
        return `${userTrimmed}${recipientEmailDomain}${recipientEmailTld}`;
    }, [recipientEmailUser, recipientEmailDomain, recipientEmailTld]);

    const isRecipientInDatabase = useMemo(() => {
        if (!recipientName.trim()) return true;
        const normName = recipientName.trim().toLowerCase();
        const normEmail = fullRecipientEmail.trim().toLowerCase();
        return sortedContacts.some(c => {
            const cName = String(getDBValue(c, ['cliente', 'nombre']) || '').trim().toLowerCase();
            const cEmail = String(getDBValue(c, 'correo') || '').trim().toLowerCase();
            return (cName && cName === normName) || (normEmail && normEmail.length > 3 && cEmail === normEmail);
        });
    }, [recipientName, fullRecipientEmail, sortedContacts]);

    const autoSaveContactIfNew = useCallback(async () => {
        if (!recipientName.trim()) return;
        if (!isRecipientInDatabase) {
            await handleSaveNewContact();
        }
    }, [recipientName, isRecipientInDatabase]);

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
        
        const effectiveNickname = recipientNickname.trim();
        const finalRecipient = (useNickname && effectiveNickname) 
            ? effectiveNickname 
            : (recipientName ? (recipientTitle ? `${recipientTitle} ${recipientName}` : recipientName) : '');
        return finalRecipient ? `${timeGreeting} ${finalRecipient}` : timeGreeting;
    }, [useNickname, recipientNickname, recipientName, recipientTitle]);

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
            toneStyle: templateTone,
            attachedFileNames,
            category: templateCategory
        });
    }, [getPresetGreeting, selectedDeliverables, selectedMethod, project, cloudLink, deadline, templateTone, attachedFileNames, templateCategory]);

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
        if (qp.category) setTemplateCategory(qp.category);
        setSelectedDeliverables(qp.deliverables);
        setSelectedMethod(qp.method);
        toast.success(`Plantilla "${qp.name}" aplicada`);
    }, []);

    const handleSaveCustomPreset = useCallback(() => {
        const name = window.prompt("Nombre para tu nueva plantilla rápida (se sincronizará en Supabase entre tu PC y Celular):");
        if (!name || !name.trim()) return;
        const newPreset: QuickPreset = {
            id: 'custom-' + Date.now(),
            name: name.trim(),
            deliverables: [...selectedDeliverables],
            method: selectedMethod,
            category: templateCategory
        };
        const updated = [...customPresets, newPreset];
        setCustomPresets(updated);
        localStorage.setItem('custom-quick-presets', JSON.stringify(updated));
        updateConfig(prev => ({ ...prev, customQuickPresets: updated }));
        setActivePresetId(newPreset.id);
        toast.success(`Plantilla "${newPreset.name}" guardada y sincronizada en Supabase ☁️`);
    }, [selectedDeliverables, selectedMethod, templateCategory, customPresets, updateConfig]);

    const handleDeleteCustomPreset = useCallback((e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const updated = customPresets.filter(p => p.id !== id);
        setCustomPresets(updated);
        localStorage.setItem('custom-quick-presets', JSON.stringify(updated));
        updateConfig(prev => ({ ...prev, customQuickPresets: updated }));
        if (activePresetId === id) setActivePresetId(null);
        toast.info("Plantilla personalizada eliminada de tus dispositivos");
    }, [customPresets, activePresetId, updateConfig]);

    // Apertura en Outlook Web (con soporte para CC múltiple)
    const handleOpenOutlookWeb = useCallback((customSubject?: string, customBody?: string) => {
        let subjectText = customSubject;
        let bodyText = customBody;

        if (subjectText === undefined || bodyText === undefined) {
            if (activeMode === 'ai') {
                subjectText = generatedContent?.emailSubject || (project ? `Proyecto ${project}` : '');
                bodyText = generatedContent?.emailBody || (idea ? `${getPresetGreeting()},\n\n${idea}\n\nAtte.\n\nArq. Rembrandt Blanco Arrambide` : '');
            } else {
                subjectText = livePreview.emailSubject;
                bodyText = livePreview.emailBody;
            }
        }
        
        const subject = encodeURIComponent(subjectText || '');
        const body = encodeURIComponent(stripHtml(bodyText || ''));
        const to = encodeURIComponent(fullRecipientEmail || '');
        const ccParam = ccRecipients.length > 0 ? `&cc=${encodeURIComponent(ccRecipients.map(c => c.email).join(';'))}` : '';
        const url = `https://outlook.office.com/mail/deeplink/compose?to=${to}${ccParam}&subject=${subject}&body=${body}`;
        window.open(url, '_blank');
    }, [activeMode, generatedContent, livePreview, project, idea, getPresetGreeting, fullRecipientEmail, ccRecipients]);

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

    // Generador con IA (incluyendo imágenes adjuntas, lista de archivos y micro-ajustes)
    const handleGenerate = useCallback(async (overrideIdea?: string, adjustInstruction?: string) => {
        const targetIdea = typeof overrideIdea === 'string' ? overrideIdea : idea;
        if (!targetIdea.trim() && !previousEmail.trim() && attachedImages.length === 0 && attachedFileNames.length === 0) { 
            toast.error('Introduce una idea, pega un correo previo o adjunta archivos.'); 
            return; 
        }
        setIsLoading(true); setError(null);
        try {
            const apiKey = googleApiConfig?.apiKey || process.env.GEMINI_API_KEY;
            const ai = new GoogleGenAI({ apiKey, baseUrl: `${window.location.origin}/api/proxy/google` });
            
            const hour = new Date().getHours();
            const timeGreeting = hour < 12 ? 'Buen día' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';
            
            const effectiveNickname = recipientNickname.trim();
            const finalRecipient = (useNickname && effectiveNickname) 
                ? effectiveNickname 
                : (recipientName ? (recipientTitle ? `${recipientTitle} ${recipientName}` : recipientName) : '');
            const greeting = finalRecipient ? `${timeGreeting} ${finalRecipient}` : timeGreeting;
            
            const systemInstruction = `Eres un experto en comunicación ejecutiva y estratégica para el sector inmobiliario, arquitectura e impresión 3D.
            Debes generar respuestas en formato JSON siguiendo estrictamente las reglas de estilo y tono del Arq. Rembrandt Blanco Arrambide.`;
            
            const userPrompt = `INSTRUCCIONES CRÍTICAS:
            1. SALUDO: Comienza exactamente con "${greeting}".
            2. FORMATO: Usa DOBLE SALTO DE LÍNEA (\\n\\n) después del saludo y entre CADA párrafo.
            3. ESTRUCTURA: Usa listas numeradas o viñetas claras para puntos importantes. No amontones el texto.
            4. FIRMA: Termina SIEMPRE con: "Atte.\\n\\nArq. Rembrandt Blanco Arrambide".
            5. DESTINATARIO: "${recipientName}".
               TRATAMIENTO EN SALUDO: "${finalRecipient}".
               GÉNERO DEL DESTINATARIO: ${recipientGender === 'F' ? 'Mujer / Femenino (debes redactar en femenino: Estimada, Licenciada, Arquitecta, Ingeniera, bienvenida, atenta, agradecida, etc.)' : 'Hombre / Masculino (debes redactar en masculino: Estimado, Licenciado, Arquitecto, Ingeniero, bienvenido, atento, agradecido, etc.)'}. Asegúrate de que toda la redacción, los tratamientos y los saludos hacia el destinatario concuerden exactamente con este género.
               ${useNickname && effectiveNickname ? `IMPORTANTE: Modo apodo activo. Dirígete y refiérete al destinatario por su apodo o trato directo: "${effectiveNickname}" (en el saludo inicial y menciones directas en el cuerpo del mensaje) en lugar de su nombre formal.` : `IMPORTANTE: Dirígete al destinatario formalmente como "${finalRecipient}".`}
            6. CONTEXTO: Proyecto: "${project}".
            7. IDEA A DESARROLLAR: "${targetIdea}". 
            8. CONTEXTO ANTERIOR (Correo al que se responde): "${previousEmail}".
            ${attachedFileNames.length > 0 ? `9. LISTA DE ARCHIVOS A INCLUIR EN EL CUERPO DEL CORREO (en formato de viñetas •): ${attachedFileNames.join(', ')}.` : ''}
            ${deadline.trim() ? `10. FECHA COMPROMISO / PLAZO LÍMITE A MENCIONAR: "${deadline.trim()}".` : ''}
            ${adjustInstruction ? `11. AJUSTE DE ESTILO SOLICITADO: "${adjustInstruction}".` : ''}
            ${attachedImages.length > 0 ? `12. IMÁGENES ADJUNTAS: Se proporcionan ${attachedImages.length} imágenes (planos, renders o capturas). Analízalas e incorpora detalles relevantes en el mensaje.` : ''}
            13. TONO: ${tone}. LONGITUD: ${messageLength}.

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
    }, [idea, previousEmail, tone, messageLength, recipientName, recipientNickname, recipientTitle, project, useNickname, googleApiConfig, updateConfig, attachedImages, attachedFileNames, deadline, recipientGender]);

    // Respuesta rápida en 1 clic sobre un correo recibido
    const handleQuickReplyIntent = useCallback((intentPrompt: string, label: string) => {
        setIdea(intentPrompt);
        toast.info(`Generando respuesta: ${label}...`);
        handleGenerate(intentPrompt);
    }, [handleGenerate]);

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

    const getAllAttachmentPayloads = useCallback(() => {
        const map = new Map<string, { name: string; mimeType: string; base64: string; fileObj?: File }>();
        realAttachments.forEach(att => {
            if (att.name && att.base64) {
                map.set(att.name, {
                    name: att.name,
                    mimeType: att.mimeType || 'application/octet-stream',
                    base64: att.base64,
                    fileObj: att.fileObj
                });
            }
        });
        attachedImages.forEach(img => {
            if (img.name && img.base64 && !map.has(img.name)) {
                map.set(img.name, {
                    name: img.name,
                    mimeType: img.mimeType || 'image/png',
                    base64: img.base64
                });
            }
        });
        return Array.from(map.values());
    }, [realAttachments, attachedImages]);

    // 1. Generar y abrir archivo .EML nativo para Outlook con archivos reales incrustados (X-Unsent: 1)
    const handleDownloadEmlDraft = (customSubject?: string, customBody?: string) => {
        autoSaveContactIfNew();
        const subjectContent = customSubject ?? (generatedContent ? generatedContent.emailSubject : livePreview.emailSubject);
        const bodyContent = stripHtml(customBody ?? (generatedContent ? generatedContent.emailBody : livePreview.emailBody));
        const toEmail = fullRecipientEmail || '';
        const ccList = ccRecipients.map(c => c.email).join(', ');
        const allAttachments = getAllAttachmentPayloads();

        const toBase64Utf8 = (str: string) => window.btoa(unescape(encodeURIComponent(str)));
        const wrap76 = (b64: string) => b64.replace(/([^\r\n]{76})/g, '$1\r\n');

        const boundary = `----=_NextPart_Rembrandt_${Date.now()}`;
        const encodedSubject = `=?UTF-8?B?${toBase64Utf8(subjectContent || 'Sin asunto')}?=`;

        const lines: string[] = [
            `To: ${toEmail}`,
            ...(ccList ? [`Cc: ${ccList}`] : []),
            `Subject: ${encodedSubject}`,
            `X-Unsent: 1`,
            `MIME-Version: 1.0`,
            `Content-Type: multipart/mixed; boundary="${boundary}"`,
            ``,
            `--${boundary}`,
            `Content-Type: text/plain; charset="UTF-8"`,
            `Content-Transfer-Encoding: base64`,
            ``,
            wrap76(toBase64Utf8(bodyContent || ''))
        ];

        for (const att of allAttachments) {
            const safeName = att.name.replace(/["\r\n]/g, '_');
            const cleanB64 = att.base64.includes(',') ? att.base64.split(',')[1] : att.base64;
            lines.push(
                `--${boundary}`,
                `Content-Type: ${att.mimeType}; name="${safeName}"`,
                `Content-Transfer-Encoding: base64`,
                `Content-Disposition: attachment; filename="${safeName}"`,
                ``,
                wrap76(cleanB64)
            );
        }

        lines.push(`--${boundary}--`, ``);
        const emlString = lines.join('\r\n');
        const blob = new Blob([emlString], { type: 'message/rfc822' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const safeTitle = (project || recipientName || 'Correo_Javer').replace(/[^a-zA-Z0-9_-]/g, '_');
        a.href = url;
        a.download = `Correo_${safeTitle}.eml`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast.success(
            allAttachments.length > 0
                ? `📎 Borrador .EML descargado con ${allAttachments.length} archivo(s) adjunto(s). Ábrelo para enviarlo desde tu Outlook.`
                : `📎 Borrador .EML descargado listo para abrir en Outlook.`
        );
    };

    // 2. Subir archivos adjuntos a Supabase Storage e insertar links de descarga directa en Correo y WhatsApp
    const handleUploadAttachmentsToCloud = async () => {
        const allAttachments = getAllAttachmentPayloads();
        if (allAttachments.length === 0) {
            toast.warning('Primero selecciona archivos con el botón "📎 Adjuntar Archivos"');
            fileListInputRef.current?.click();
            return;
        }

        setIsUploadingAttachments(true);
        const uploadedLinks: { name: string; url: string }[] = [];

        try {
            for (const att of allAttachments) {
                const safeFileName = att.name.replace(/[^a-zA-Z0-9._-]/g, '_');
                const storagePath = `adjuntos_correo/${Date.now()}_${safeFileName}`;

                let blobToUpload: Blob;
                if (att.fileObj) {
                    blobToUpload = att.fileObj;
                } else {
                    const byteChars = atob(att.base64.includes(',') ? att.base64.split(',')[1] : att.base64);
                    const byteNumbers = new Array(byteChars.length);
                    for (let i = 0; i < byteChars.length; i++) {
                        byteNumbers[i] = byteChars.charCodeAt(i);
                    }
                    blobToUpload = new Blob([new Uint8Array(byteNumbers)], { type: att.mimeType });
                }

                const { error: upErr } = await supabase.storage
                    .from('savejson')
                    .upload(storagePath, blobToUpload, {
                        upsert: true,
                        contentType: att.mimeType || 'application/octet-stream'
                    });

                if (upErr) throw upErr;

                const { data: signedData } = await supabase.storage
                    .from('savejson')
                    .createSignedUrl(storagePath, 60 * 60 * 24 * 7); // 7 días de validez

                const finalUrl = signedData?.signedUrl || supabase.storage.from('savejson').getPublicUrl(storagePath).data.publicUrl;
                if (finalUrl) {
                    uploadedLinks.push({ name: att.name, url: finalUrl });
                }
            }

            if (uploadedLinks.length > 0) {
                const combinedUrlText = uploadedLinks.length === 1
                    ? uploadedLinks[0].url
                    : uploadedLinks.map(u => `${u.name}: ${u.url}`).join(' | ');

                setCloudLink(uploadedLinks[0].url);

                const linksBlock = `\n\n📎 Enlaces de descarga directa (${uploadedLinks.length} archivo${uploadedLinks.length > 1 ? 's' : ''}):\n` +
                    uploadedLinks.map(u => `• ${u.name}: ${u.url}`).join('\n');

                if (generatedContent) {
                    setGeneratedContent(prev => prev ? ({
                        ...prev,
                        emailBody: prev.emailBody.includes(uploadedLinks[0].url) ? prev.emailBody : `${prev.emailBody}${linksBlock}`,
                        whatsappMessage: prev.whatsappMessage.includes(uploadedLinks[0].url) ? prev.whatsappMessage : `${prev.whatsappMessage}${linksBlock}`
                    }) : null);
                }

                navigator.clipboard.writeText(combinedUrlText).catch(() => {});
                toast.success(`☁️ ${uploadedLinks.length} archivo(s) subidos a la nube y enlaces insertados en el mensaje`);
            }
        } catch (err: any) {
            console.error('Error uploading attachments to Supabase:', err);
            toast.error(`Error al subir adjuntos a la nube: ${err.message || 'Verifica tu conexión'}`);
        } finally {
            setIsUploadingAttachments(false);
        }
    };

    // Helper OAuth para autorizar envío directo por Gmail API si no hay token o falta scope gmail.send
    const authenticateGoogleForEmailSend = async (): Promise<any> => {
        const urlResponse = await fetch('/api/auth/url', {
            headers: {
                'x-client-id': googleApiConfig?.clientId || '',
                'x-client-secret': googleApiConfig?.clientSecret || '',
                'x-redirect-uri': `${window.location.origin}/api/auth/callback`
            }
        });
        if (!urlResponse.ok) {
            throw new Error('Faltan credenciales de Google API o no se pudo iniciar OAuth');
        }
        const { url } = await urlResponse.json();
        const authWindow = window.open(url, 'oauth_email_popup', 'width=600,height=700');
        if (!authWindow) {
            throw new Error('Permite las ventanas emergentes (popups) para vincular el envío directo.');
        }

        const code = await new Promise<string>((resolve, reject) => {
            const handleMessage = (event: MessageEvent) => {
                if (event.data?.type === 'OAUTH_CODE_SUCCESS') {
                    window.removeEventListener('message', handleMessage);
                    clearInterval(checkClosed);
                    resolve(event.data.code);
                }
            };
            window.addEventListener('message', handleMessage);
            const checkClosed = setInterval(() => {
                if (authWindow.closed) {
                    window.removeEventListener('message', handleMessage);
                    clearInterval(checkClosed);
                    reject(new Error('Autenticación cancelada'));
                }
            }, 1000);
        });

        const exchangeResponse = await fetch('/api/auth/exchange', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-client-id': googleApiConfig?.clientId || '',
                'x-client-secret': googleApiConfig?.clientSecret || '',
                'x-redirect-uri': `${window.location.origin}/api/auth/callback`
            },
            body: JSON.stringify({ code })
        });
        if (!exchangeResponse.ok) {
            throw new Error('No se pudo obtener el token de autorización');
        }
        const exchangeData = await exchangeResponse.json();
        const newTokens = exchangeData.tokens || exchangeData;
        updateConfig(prev => ({ ...prev, googleCalendarTokens: newTokens }));
        return newTokens;
    };

    // 3. Envío directo desde Rembrandt7 vía /api/gmail/send con archivos adjuntos reales
    const handleSendDirectApi = async (customSubject?: string, customBody?: string) => {
        autoSaveContactIfNew();
        if (!fullRecipientEmail) {
            toast.error('Selecciona o escribe un correo destinatario (Para:) antes de enviar');
            return;
        }

        const subjectContent = customSubject ?? (generatedContent ? generatedContent.emailSubject : livePreview.emailSubject);
        const bodyContent = stripHtml(customBody ?? (generatedContent ? generatedContent.emailBody : livePreview.emailBody));
        const ccString = ccRecipients.map(c => c.email).join(', ');
        const allAttachments = getAllAttachmentPayloads().map(a => ({
            name: a.name,
            mimeType: a.mimeType,
            base64: a.base64
        }));

        setIsSendingDirectEmail(true);
        try {
            let tokens = config.googleCalendarTokens;
            if (!tokens) {
                toast.info('Vincula tu cuenta de Google en la ventana emergente para activar el envío directo...');
                tokens = await authenticateGoogleForEmailSend();
            }

            const sendReq = async (activeTokens: any) => {
                return fetch('/api/gmail/send', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-client-id': googleApiConfig?.clientId || '',
                        'x-client-secret': googleApiConfig?.clientSecret || ''
                    },
                    body: JSON.stringify({
                        action: 'send',
                        tokens: activeTokens,
                        to: fullRecipientEmail,
                        cc: ccString || undefined,
                        subject: subjectContent,
                        body: bodyContent,
                        attachments: allAttachments
                    })
                });
            };

            let res = await sendReq(tokens);
            if (res.status === 401 || res.status === 403 || res.status === 500) {
                const errJson = await res.json().catch(() => ({}));
                const errMsg = String(errJson.error || '');
                if (
                    res.status === 401 ||
                    res.status === 403 ||
                    errMsg.toLowerCase().includes('insufficient') ||
                    errMsg.toLowerCase().includes('scope') ||
                    errMsg.toLowerCase().includes('invalid_grant') ||
                    errMsg.toLowerCase().includes('credentials')
                ) {
                    toast.info('Autorizando permiso de envío de correo con adjuntos...');
                    tokens = await authenticateGoogleForEmailSend();
                    res = await sendReq(tokens);
                } else {
                    throw new Error(errMsg || 'Error al enviar el correo');
                }
            }

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'No se pudo enviar el correo');
            }

            toast.success(
                allAttachments.length > 0
                    ? `🚀 ¡Correo enviado directamente a ${fullRecipientEmail} con ${allAttachments.length} archivo(s) adjunto(s)!`
                    : `🚀 ¡Correo enviado directamente a ${fullRecipientEmail}!`
            );
        } catch (err: any) {
            console.error('Direct email send error:', err);
            toast.error(`No se pudo enviar por API (${err.message}). Abriendo borrador .EML con tus adjuntos listos para Outlook...`);
            handleDownloadEmlDraft(subjectContent, bodyContent);
        } finally {
            setIsSendingDirectEmail(false);
        }
    };

    const handleSendEmail = () => {
        autoSaveContactIfNew();
        const bodyContent = generatedContent ? generatedContent.emailBody : livePreview.emailBody;
        const subjectContent = generatedContent ? generatedContent.emailSubject : livePreview.emailSubject;
        const ccParam = ccRecipients.length > 0 ? `&cc=${encodeURIComponent(ccRecipients.map(c => c.email).join(';'))}` : '';
        window.location.href = `mailto:${fullRecipientEmail}?subject=${encodeURIComponent(subjectContent)}${ccParam}&body=${encodeURIComponent(stripHtml(bodyContent))}`;
    };

    const handleSendWhatsApp = (customMsg?: string) => {
        autoSaveContactIfNew();
        const msg = customMsg || (generatedContent ? generatedContent.whatsappMessage : livePreview.whatsappMessage);
        const encoded = encodeURIComponent(msg);
        if (isMobile) {
            window.location.href = `https://api.whatsapp.com/send?text=${encoded}`;
        } else {
            window.open(`https://web.whatsapp.com/send?text=${encoded}`, '_blank');
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); setIsDraggingOver(false);
        const files = Array.from(e.dataTransfer.files || []) as File[];
        if (files.length === 0) return;

        const nonImages: File[] = [];
        files.forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    onAttachmentsChange([...attachedImages, { 
                        name: file.name, 
                        base64: (ev.target?.result as string).split(',')[1], 
                        mimeType: file.type, 
                        preview: ev.target?.result as string 
                    }]);
                    toast.success(`Imagen "${file.name}" adjuntada para IA y correo`);
                };
                reader.readAsDataURL(file);
            } else if (file.name) {
                nonImages.push(file);
            }
        });

        if (nonImages.length > 0) {
            handleFilesSelectedForListing(nonImages);
        }
    };

    const handleSaveContactToSupabase = async (customData?: {
        name?: string;
        title?: string;
        gender?: Gender;
        email?: string;
        nickname?: string;
        relation?: string;
    }) => {
        const cleanName = (customData?.name ?? recipientName).trim();
        if (!cleanName) { 
            toast.error("Ingresa un nombre para el contacto antes de guardar en Supabase"); 
            return; 
        }
        setIsSavingContact(true);
        try {
            const emailToSave = (customData?.email ?? fullRecipientEmail).trim();
            const titleToSave = (customData?.title ?? recipientTitle).trim();
            const genderVal = (customData?.gender ?? recipientGender) === 'M' ? 'Hombre' : 'Mujer';
            const nicknameToSave = (customData?.nickname ?? recipientNickname).trim();
            const relationToSave = (customData?.relation ?? recipientRelation).trim() || 'Javer';

            // Buscar si ya existe en Supabase (por nombre o correo)
            const existingContact = sortedContacts.find(c => {
                const cName = String(getDBValue(c, ['cliente', 'nombre']) || '').trim().toLowerCase();
                const cEmail = String(getDBValue(c, 'correo') || '').trim().toLowerCase();
                return (cName && cName === cleanName.toLowerCase()) || 
                       (emailToSave && cEmail && cEmail === emailToSave.toLowerCase());
            });

            const payload: any = { 
                cliente: cleanName, 
                lic: titleToSave || null, 
                Genero: genderVal,
                correo: emailToSave || null,
                "Apodo(manera en que me refiero)": nicknameToSave || null,
                Relacion: relationToSave
            };

            let res: Response;
            if (existingContact) {
                const targetKey = getDBValue(existingContact, ['cliente', 'nombre']) || cleanName;
                res = await fetch(`${SUPABASE_CONFIG.URL}/rest/v1/Contactos?cliente=eq.${encodeURIComponent(targetKey)}`, {
                    method: 'PATCH',
                    headers: { 
                        'apikey': SUPABASE_CONFIG.KEY, 
                        'Authorization': `Bearer ${SUPABASE_CONFIG.KEY}`, 
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify(payload)
                });
            } else {
                res = await fetch(`${SUPABASE_CONFIG.URL}/rest/v1/Contactos`, {
                    method: 'POST',
                    headers: { 
                        'apikey': SUPABASE_CONFIG.KEY, 
                        'Authorization': `Bearer ${SUPABASE_CONFIG.KEY}`, 
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify(payload)
                });
            }

            if (res.ok) {
                await fetchContacts();
                toast.success(`Contacto "${cleanName}" guardado en Supabase con éxito`);
                setIsNewContactMode(false);
            } else {
                const newContact = { 
                    id: Date.now().toString(), 
                    cliente: cleanName, 
                    correo: emailToSave, 
                    lic: titleToSave, 
                    Genero: genderVal,
                    "Apodo(manera en que me refiero)": nicknameToSave,
                    Relacion: relationToSave
                };
                setContacts(prev => [newContact, ...prev.filter(c => String(getDBValue(c, 'cliente')).toLowerCase() !== cleanName.toLowerCase())]);
                try {
                    const cached = localStorage.getItem('cached-contacts');
                    const parsed: any[] = cached ? JSON.parse(cached) : [];
                    localStorage.setItem('cached-contacts', JSON.stringify([newContact, ...parsed.filter(c => String(getDBValue(c, 'cliente')).toLowerCase() !== cleanName.toLowerCase())]));
                } catch {}
                toast.warning(`Guardado localmente (sin sincronizar en Supabase)`);
                setIsNewContactMode(false);
            }
        } catch (e) { 
            console.error(e); 
            toast.error("Error al conectar con Supabase"); 
        } finally { 
            setIsSavingContact(false); 
        }
    };

    const handleSaveNewContact = handleSaveContactToSupabase;

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
        <div onDrop={handleDrop} onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }} onDragLeave={() => setIsDraggingOver(false)} className={`p-4 transition-all ${isDraggingOver ? 'bg-purple-500/10 ring-2 ring-purple-500/40 rounded-2xl' : ''}`}>
            <input
                ref={fileListInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                    handleFilesSelectedForListing(e.target.files);
                    e.target.value = '';
                }}
            />
            
            {/* ENCABEZADO SUPERIOR UNIFICADO EN UN SOLO RENGLÓN (ESCRITORIO) */}
            {isDesktopMode && (
                <div className="flex items-center justify-between gap-2.5 mb-3.5 p-2 bg-gray-900/70 backdrop-blur-md rounded-2xl border border-purple-500/20 shadow-md">
                    {/* IZQUIERDA: ICONO + TÍTULO COMPACTO */}
                    <div className="flex items-center gap-2 shrink-0">
                        <div className="p-2 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl shadow-md text-white shrink-0">
                            <Mail size={18} />
                        </div>
                        <div className="leading-tight">
                            <h2 className="text-sm font-black text-white uppercase tracking-tight whitespace-nowrap">Generador de Mensajes</h2>
                            <p className="text-[10px] text-gray-400 hidden xl:block">Entregas de planos, renders y redacción Javer</p>
                        </div>
                    </div>

                    {/* CENTRO: SELECTOR DE MODOS (REDACTOR LIBRE / ENTREGAS 0S) */}
                    <div className="flex items-center gap-1 p-1 bg-slate-950/80 rounded-xl border border-gray-800 shadow-inner shrink-0">
                        <button
                            type="button"
                            onClick={() => setActiveMode('ai')}
                            className={`py-1.5 px-3 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                                activeMode === 'ai'
                                    ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25'
                                    : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
                            }`}
                        >
                            <Sparkles size={13} className={activeMode === 'ai' ? 'text-purple-300' : ''} />
                            <span>1. Redactor Libre</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveMode('quick')}
                            className={`py-1.5 px-3 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                                activeMode === 'quick'
                                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/25'
                                    : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
                            }`}
                        >
                            <Zap size={13} className={activeMode === 'quick' ? 'text-amber-300' : ''} />
                            <span>2. Entregas (0s)</span>
                        </button>
                    </div>

                    {/* DERECHA: BOTONES DE ACCIÓN (OUTLOOK WEB, ALEJAVI NOTICIAS, HISTORIAL, RESET) */}
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap sm:flex-nowrap">
                        <button
                            type="button"
                            onClick={() => handleOpenOutlookWeb()}
                            className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm flex items-center gap-1.5 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer border border-blue-400/30 whitespace-nowrap"
                            title="Abrir Outlook Web Javer 365 con el destinatario y contenido actual"
                        >
                            <ExternalLink size={12} />
                            <span>Outlook Web</span>
                        </button>

                        <a 
                            href="https://academiartificial.com/noticias-ia/" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="px-2.5 py-1.5 bg-gradient-to-r from-blue-600/30 to-indigo-600/30 hover:from-blue-600/50 hover:to-indigo-600/50 text-blue-300 hover:text-white rounded-xl border border-blue-500/30 text-xs font-bold uppercase tracking-wider transition-all shadow-sm flex items-center gap-1.5 cursor-pointer group whitespace-nowrap"
                            title="Ver noticias de IA en Academia Artificial"
                        >
                            <Newspaper size={12} className="text-blue-400 group-hover:text-blue-200" />
                            <span>alejavi noticias</span>
                            <ExternalLink size={10} className="opacity-70 group-hover:opacity-100 transition-all" />
                        </a>

                        <button 
                            type="button"
                            onClick={() => setShowHistory(!showHistory)} 
                            className="px-2.5 py-1.5 bg-gray-800/90 hover:bg-gray-700/90 rounded-xl text-xs font-black uppercase text-gray-300 border border-gray-700 transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap"
                            title="Ver historial de mensajes"
                        >
                            <Clock size={12} className="text-gray-400" />
                            <span>Historial</span>
                        </button>

                        <button 
                            type="button"
                            onClick={handleResetAll} 
                            title="Reiniciar todos los campos (Erik por defecto)" 
                            className="px-2.5 py-1.5 bg-gray-800/90 hover:bg-red-600/20 text-gray-400 hover:text-red-400 rounded-xl text-xs font-black uppercase border border-gray-700 hover:border-red-500/40 transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap"
                        >
                            <RotateCcw size={12} />
                            <span>Reset</span>
                        </button>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* CELULAR PLEGADO (FOLD COVER / ANCHO ESTRECHO < 580PX)                     */}
            {/* FLUJO LINEAL VERTICAL ULTRA-LIMPIO: CERO CLUTTER, MICRÓFONO PROMINENTE     */}
            {/* ========================================================================= */}
            {isFoldCoverMode && (
                <div className="space-y-4 mb-4">
                    {/* Header Plegado */}
                    <div className="flex items-center justify-between gap-2 p-2.5 bg-gray-900/90 rounded-2xl border border-purple-500/30 shadow-lg">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl shadow-md text-white">
                                <Mail size={16} />
                            </div>
                            <div>
                                <h2 className="text-xs font-black text-white uppercase tracking-tight">Generador Javer</h2>
                                <p className="text-[9px] text-gray-400">Voz, IA y WhatsApp</p>
                            </div>
                        </div>

                        {/* Botón Outlook Web directo */}
                        <button
                            type="button"
                            onClick={() => handleOpenOutlookWeb()}
                            className="px-2.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-1 shadow-md border border-blue-400/30 cursor-pointer shrink-0"
                            title="Abrir Outlook Web Javer 365"
                        >
                            <ExternalLink size={11} />
                            <span>Outlook</span>
                        </button>
                    </div>

                    {/* Selector de Modo en Celular Plegado */}
                    <div className="flex bg-gray-900/90 p-1 rounded-2xl border border-gray-800 shadow-md">
                        <button
                            type="button"
                            onClick={() => setActiveMode('ai')}
                            className={`flex-1 py-2 px-2 rounded-xl text-[10.5px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                activeMode === 'ai'
                                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                                    : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            <Sparkles size={12} className={activeMode === 'ai' ? 'text-purple-200' : ''} />
                            <span>1. Voz & IA</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveMode('quick')}
                            className={`flex-1 py-2 px-2 rounded-xl text-[10.5px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                activeMode === 'quick'
                                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                                    : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            <Zap size={12} className={activeMode === 'quick' ? 'text-amber-300' : ''} />
                            <span>2. Entregas (0s)</span>
                        </button>
                    </div>

                    {/* MODO AI / VOZ EN PLEGADO */}
                    {activeMode === 'ai' && (
                        <div className="space-y-3">
                            {/* Card 1: Destinatario y Género */}
                            <div className="bg-gray-900/90 rounded-2xl border border-purple-500/25 p-3.5 shadow-xl space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                                        <Users size={13} />
                                        <span>Destinatario:</span>
                                    </span>
                                    
                                    {/* Toggle modo: Contacto Guardado vs Alguien no guardado */}
                                    <div className="flex bg-slate-950 rounded-lg p-0.5 border border-purple-500/20">
                                        <button
                                            type="button"
                                            onClick={() => setIsNewContactMode(false)}
                                            className={`px-2 py-1 rounded-md text-[9.5px] font-black transition-all cursor-pointer ${
                                                !isNewContactMode ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'
                                            }`}
                                        >
                                            Guardados
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsNewContactMode(true);
                                                setSelectedContactIndex('');
                                            }}
                                            className={`px-2 py-1 rounded-md text-[9.5px] font-black transition-all cursor-pointer ${
                                                isNewContactMode ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'
                                            }`}
                                        >
                                            ➕ No guardado
                                        </button>
                                    </div>
                                </div>

                                {/* Vista Alguien no guardado */}
                                {isNewContactMode ? (
                                    <div className="space-y-2 pt-0.5">
                                        <div>
                                            <label className="text-[9px] font-bold uppercase text-gray-400 block mb-0.5">Nombre de la persona *</label>
                                            <input
                                                type="text"
                                                value={recipientName}
                                                onChange={(e) => {
                                                    const n = e.target.value;
                                                    setRecipientName(n);
                                                    if (!recipientNickname || recipientNickname === recipientName.split(' ')[0]) {
                                                        setRecipientNickname(n.split(' ')[0]);
                                                    }
                                                }}
                                                placeholder="Ej. Arq. Laura o Carlos Salinas"
                                                className="w-full p-2 bg-slate-950 border border-indigo-500/40 rounded-xl text-xs text-white font-bold outline-none focus:border-indigo-400 shadow-inner"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="text-[9px] font-bold uppercase text-yellow-400 block mb-0.5">🏷️ Apodo / Saludo</label>
                                                <input
                                                    type="text"
                                                    value={recipientNickname}
                                                    onChange={(e) => setRecipientNickname(e.target.value)}
                                                    placeholder="Ej. Laura, Beto..."
                                                    className="w-full p-2 bg-slate-950 border border-yellow-500/40 rounded-xl text-xs text-yellow-300 font-bold outline-none focus:border-yellow-400 shadow-inner"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-bold uppercase text-gray-400 block mb-0.5">Correo</label>
                                                <input
                                                    type="email"
                                                    value={recipientEmailUser}
                                                    onChange={(e) => setRecipientEmailUser(e.target.value)}
                                                    placeholder="correo@ejemplo.com"
                                                    className="w-full p-2 bg-slate-950 border border-indigo-500/40 rounded-xl text-xs text-white font-mono outline-none focus:border-indigo-400 shadow-inner"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 pt-1">
                                            <button
                                                type="button"
                                                onClick={() => handleSaveContactToSupabase()}
                                                disabled={isSavingContact || !recipientName.trim()}
                                                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md disabled:opacity-50"
                                            >
                                                {isSavingContact ? <Spinner size="3" /> : <Save size={12} />}
                                                <span>💾 Guardar en Supabase</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsNewContactMode(false);
                                                    toast.info(`Usando a "${recipientName}" sin guardar`);
                                                }}
                                                disabled={!recipientName.trim()}
                                                className="py-2 px-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                            >
                                                ⚡ Usar
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    /* Vista Contactos Guardados */
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                                            {quickContacts.map(qc => {
                                                const isSelected = selectedContactIndex !== '' && parseInt(selectedContactIndex, 10) === qc.index;
                                                return (
                                                    <button
                                                        key={qc.name}
                                                        type="button"
                                                        onClick={() => selectContactByIndex(qc.index, sortedContacts)}
                                                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                                                            isSelected 
                                                                ? 'bg-purple-600 text-white shadow-sm ring-1 ring-purple-400' 
                                                                : 'bg-slate-950 text-gray-300 border border-gray-800'
                                                        }`}
                                                    >
                                                        {qc.isErik && <span>⭐</span>}
                                                        <span>{qc.name.split(' ')[0]}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <select 
                                            value={selectedContactIndex} 
                                            onChange={handleContactSelect} 
                                            className="w-full p-2 bg-slate-950 border border-gray-800 rounded-xl text-xs text-white font-bold outline-none cursor-pointer"
                                        >
                                            <option value="">Seleccionar otro contacto ({sortedContacts.length})...</option>
                                            {sortedContacts.map((c, i) => (
                                                <option key={i} value={i}>
                                                    {getDBValue(c, 'cliente')} ({getDBValue(c, 'correo')})
                                                </option>
                                            ))}
                                        </select>

                                        {/* Modificar Apodo y Saludo en Plegado */}
                                        <div className="flex items-center gap-2 p-1.5 bg-slate-950/80 rounded-xl border border-yellow-500/30">
                                            <button
                                                type="button"
                                                onClick={() => setUseNickname(!useNickname)}
                                                className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
                                                    useNickname ? 'bg-yellow-500/20 text-yellow-300' : 'bg-gray-800 text-gray-400'
                                                }`}
                                            >
                                                {useNickname ? '🏷️ Apodo' : 'Formal'}
                                            </button>
                                            <input
                                                type="text"
                                                value={recipientNickname}
                                                onChange={(e) => setRecipientNickname(e.target.value)}
                                                placeholder="Modificar apodo..."
                                                disabled={!useNickname}
                                                className={`flex-1 bg-transparent text-xs font-bold outline-none ${
                                                    useNickname ? 'text-yellow-200 placeholder-yellow-500/40' : 'text-gray-500 opacity-50'
                                                }`}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleSaveContactToSupabase()}
                                                disabled={isSavingContact}
                                                className="px-2 py-1 bg-purple-600/80 hover:bg-purple-600 text-white rounded-lg text-[10px] font-black uppercase transition-colors shrink-0 cursor-pointer"
                                                title="Guardar este apodo en Supabase"
                                            >
                                                {isSavingContact ? '...' : '💾 BD'}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* PREGUNTA DE GÉNERO OBLIGATORIA: HOMBRE / MUJER */}
                                <div className="pt-2 border-t border-purple-500/15">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-[10px] font-black uppercase text-purple-200">
                                            ¿Es Hombre o Mujer?
                                        </span>
                                        <span className="text-[9px] text-gray-400">Concordancia exacta</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setRecipientGender('M')}
                                            className={`py-2 px-2.5 rounded-xl text-xs font-black uppercase transition-all flex items-center justify-center gap-1 cursor-pointer ${
                                                recipientGender === 'M'
                                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 ring-2 ring-blue-400'
                                                    : 'bg-slate-950 text-gray-400 hover:text-white border border-gray-800'
                                            }`}
                                        >
                                            <span>👨 H</span>
                                            <span className="text-[9px] opacity-80">(Estimado)</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setRecipientGender('F')}
                                            className={`py-2 px-2.5 rounded-xl text-xs font-black uppercase transition-all flex items-center justify-center gap-1 cursor-pointer ${
                                                recipientGender === 'F'
                                                    ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/30 ring-2 ring-pink-400'
                                                    : 'bg-slate-950 text-gray-400 hover:text-white border border-gray-800'
                                            }`}
                                        >
                                            <span>👩 M</span>
                                            <span className="text-[9px] opacity-80">(Estimada)</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Card 2: Consola de Dictado por Voz y Redacción */}
                            <div className="bg-gradient-to-br from-purple-950/90 via-slate-900/95 to-indigo-950/90 border-2 border-purple-500/40 rounded-3xl p-4 shadow-2xl space-y-4">
                                <div className="text-center space-y-1">
                                    <span className="text-[9px] bg-amber-400 text-black font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                        Paso Principal
                                    </span>
                                    <h3 className="text-sm font-black uppercase text-white tracking-wider">
                                        Dictar Correo por Voz
                                    </h3>
                                    <p className="text-[10px] text-purple-200/80">
                                        Toca el micrófono grande, habla tu idea y la IA redactará todo
                                    </p>
                                </div>

                                {/* Botón Central Grande de Micrófono */}
                                <div className="flex flex-col items-center justify-center py-1 space-y-3">
                                    <button
                                        type="button"
                                        onClick={toggleListening}
                                        className={`group relative flex items-center justify-center rounded-full transition-all duration-300 cursor-pointer ${
                                            isListening
                                                ? 'w-24 h-24 bg-red-600 text-white shadow-[0_0_50px_rgba(239,68,68,0.7)] ring-8 ring-red-500/30 scale-105 animate-pulse'
                                                : 'w-24 h-24 bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 text-white shadow-[0_0_40px_rgba(168,85,247,0.5)] hover:scale-105 active:scale-95 border-2 border-white/30'
                                        }`}
                                        title={isListening ? "Toca para detener dictado" : "Toca para empezar a dictar por voz"}
                                    >
                                        {isListening ? (
                                            <MicOff size={40} className="text-white drop-shadow-md" />
                                        ) : (
                                            <Mic size={40} className="text-white drop-shadow-md group-hover:scale-110 transition-transform" />
                                        )}
                                    </button>

                                    <div className="text-center">
                                        <p className="text-xs font-black uppercase tracking-wider text-white">
                                            {isListening ? '🔴 Escuchando tu voz...' : 'Toca el micrófono para dictar'}
                                        </p>
                                        <p className="text-[9.5px] text-gray-400 mt-0.5">
                                            {isListening 
                                                ? 'Habla con tranquilidad; toca de nuevo para redactar' 
                                                : 'O escribe tu mensaje directamente en el recuadro'}
                                        </p>
                                    </div>

                                    {/* Ondas sonoras animadas al escuchar */}
                                    {isListening && (
                                        <div className="flex items-center justify-center gap-1 h-5 py-0.5">
                                            {[40, 75, 100, 60, 95, 45, 85, 55, 90, 70, 80, 50].map((h, i) => (
                                                <div
                                                    key={i}
                                                    className="w-1 bg-gradient-to-t from-red-500 via-rose-400 to-purple-300 rounded-full animate-pulse"
                                                    style={{ height: `${h}%`, animationDelay: `${i * 60}ms` }}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Textarea de Idea dictada / escrita */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-purple-300">
                                            {idea ? 'Idea o Mensaje dictado:' : 'Mensaje o idea a redactar:'}
                                        </span>
                                        {idea && (
                                            <button
                                                type="button"
                                                onClick={() => { setIdea(''); toast.info('Texto limpiado'); }}
                                                className="text-[10px] font-bold text-gray-400 hover:text-white flex items-center gap-1 cursor-pointer"
                                            >
                                                <RotateCcw size={10} />
                                                <span>Borrar</span>
                                            </button>
                                        )}
                                    </div>

                                    <textarea
                                        value={idea}
                                        onChange={onIdeaChange}
                                        placeholder="Aquí aparecerá lo que dictes por voz, o puedes escribir directamente aquí..."
                                        rows={3}
                                        className="w-full p-3 bg-slate-950/90 border border-purple-500/30 rounded-xl text-xs text-white placeholder-gray-500 outline-none focus:border-purple-400 leading-relaxed font-sans shadow-inner resize-none"
                                    />
                                </div>

                                {/* Opciones de Tono y Longitud compactas */}
                                <div className="grid grid-cols-2 gap-2 pt-1">
                                    <div className="bg-slate-950/70 p-2 rounded-xl border border-purple-500/20">
                                        <span className="text-[9px] font-bold uppercase text-gray-400 block mb-1">Tono</span>
                                        <div className="grid grid-cols-2 gap-1">
                                            <button
                                                type="button"
                                                onClick={() => setTone('Profesional')}
                                                className={`py-1 px-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                                    tone === 'Profesional' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'
                                                }`}
                                            >
                                                Profesional
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setTone('Casual')}
                                                className={`py-1 px-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                                    tone === 'Casual' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'
                                                }`}
                                            >
                                                Casual
                                            </button>
                                        </div>
                                    </div>
                                    <div className="bg-slate-950/70 p-2 rounded-xl border border-purple-500/20">
                                        <span className="text-[9px] font-bold uppercase text-gray-400 block mb-1">Extensión</span>
                                        <div className="grid grid-cols-2 gap-1">
                                            <button
                                                type="button"
                                                onClick={() => setMessageLength('Reducido')}
                                                className={`py-1 px-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                                    messageLength === 'Reducido' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'
                                                }`}
                                            >
                                                Reducido
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setMessageLength('Normal' as any)}
                                                className={`py-1 px-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                                    messageLength !== 'Reducido' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'
                                                }`}
                                            >
                                                Normal
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Botón Principal: Redactar con IA */}
                                <button
                                    type="button"
                                    onClick={() => handleGenerate()}
                                    disabled={isLoading || (!idea.trim() && !previousEmail.trim() && attachedImages.length === 0)}
                                    className="w-full py-3.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-xl shadow-purple-600/30 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 cursor-pointer border border-purple-400/30"
                                >
                                    {isLoading ? (
                                        <>
                                            <RefreshCw className="animate-spin" size={16} />
                                            <span>Redactando Correo con IA...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles size={16} className="text-yellow-300" />
                                            <span>Redactar Correo con IA</span>
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Card 3: Previsualización de Resultados y Envíos Inmediatos */}
                            {generatedContent && !isLoading && (
                                <div className="bg-slate-900/95 border-2 border-emerald-500/40 rounded-3xl p-4 shadow-2xl space-y-3">
                                    <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2.5">
                                        <span className="text-[10.5px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                                            <Check size={14} />
                                            <span>Mensajes Listos para Despachar</span>
                                        </span>
                                        <span className="text-[9.5px] text-gray-400 truncate max-w-[140px] italic">
                                            {generatedContent.emailSubject}
                                        </span>
                                    </div>

                                    {/* BOTÓN PROMINENTE: ENVIAR POR WHATSAPP EN 1 TOQUE */}
                                    <button
                                        type="button"
                                        onClick={() => handleSendWhatsApp(generatedContent.whatsappMessage)}
                                        className="w-full py-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60 active:scale-95 transition-all cursor-pointer border border-emerald-400/30"
                                        title="Enviar mensaje generado directamente por WhatsApp"
                                    >
                                        <MessageSquare size={16} />
                                        <span>Enviar por WhatsApp (1 Toque)</span>
                                    </button>

                                    {/* Caja de WhatsApp */}
                                    <div className="p-3 bg-slate-950/90 rounded-xl border border-emerald-500/30 space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[9.5px] font-black text-emerald-300 uppercase">Mensaje WhatsApp:</span>
                                            <button
                                                type="button"
                                                onClick={() => handleCopyToClipboard(generatedContent.whatsappMessage, 'whatsapp')}
                                                className="text-[10px] text-gray-400 hover:text-white flex items-center gap-1 cursor-pointer"
                                            >
                                                <Copy size={11} />
                                                <span>{copied === 'whatsapp' ? '¡Copiado!' : 'Copiar'}</span>
                                            </button>
                                        </div>
                                        <p className="text-[11px] text-emerald-100/95 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                                            {generatedContent.whatsappMessage}
                                        </p>
                                    </div>

                                    {/* Caja de Correo */}
                                    <div className="p-3 bg-slate-950/90 rounded-xl border border-purple-500/30 space-y-2">
                                        <div className="flex items-center justify-between border-b border-gray-800 pb-1.5">
                                            <span className="text-[9.5px] font-black text-purple-300 uppercase">Correo Formal:</span>
                                            <button
                                                type="button"
                                                onClick={() => handleCopyToClipboard(generatedContent.emailBody, 'email')}
                                                className="text-[10px] text-gray-400 hover:text-white flex items-center gap-1 cursor-pointer"
                                            >
                                                <Copy size={11} />
                                                <span>{copied === 'email' ? '¡Copiado!' : 'Copiar'}</span>
                                            </button>
                                        </div>
                                        <p className="text-[10.5px] font-bold text-white truncate">
                                            Asunto: {generatedContent.emailSubject}
                                        </p>
                                        <p className="text-[10.5px] text-gray-300 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                                            {generatedContent.emailBody}
                                        </p>
                                    </div>

                                    {/* Botones de Adjuntos y Envío en Plegado */}
                                    <div className="space-y-2 pt-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <button
                                                type="button"
                                                onClick={() => fileListInputRef.current?.click()}
                                                className="flex-1 py-2 px-2.5 bg-purple-600/20 hover:bg-purple-600/35 border border-purple-500/40 text-purple-200 rounded-xl text-[10.5px] font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                                            >
                                                <Paperclip size={12} />
                                                <span>📎 Adjuntar ({realAttachments.length + attachedImages.length})</span>
                                            </button>
                                            {realAttachments.length > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={handleUploadAttachmentsToCloud}
                                                    disabled={isUploadingAttachments}
                                                    className="py-2 px-2.5 bg-cyan-600/25 hover:bg-cyan-600/40 border border-cyan-500/40 text-cyan-200 rounded-xl text-[10.5px] font-black uppercase flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                                                >
                                                    {isUploadingAttachments ? <RefreshCw size={12} className="animate-spin" /> : <UploadCloud size={12} />}
                                                    <span>☁️ Nube</span>
                                                </button>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => handleDownloadEmlDraft(generatedContent.emailSubject, generatedContent.emailBody)}
                                                className="py-2 px-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1 shadow-md cursor-pointer border border-indigo-400/30"
                                                title="Descargar borrador .EML para Outlook con adjuntos incrustados"
                                            >
                                                <Paperclip size={11} />
                                                <span>📎 Outlook (.EML)</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleSendDirectApi(generatedContent.emailSubject, generatedContent.emailBody)}
                                                disabled={isSendingDirectEmail}
                                                className="py-2 px-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1 shadow-md cursor-pointer border border-emerald-400/30 disabled:opacity-50"
                                                title="Enviar correo con adjuntos directamente desde aquí"
                                            >
                                                {isSendingDirectEmail ? <RefreshCw size={11} className="animate-spin" /> : <Send size={11} />}
                                                <span>🚀 Enviar Aquí</span>
                                            </button>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleOpenOutlookWeb(generatedContent.emailSubject, generatedContent.emailBody)}
                                            className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2 shadow-md cursor-pointer border border-blue-400/30"
                                            title="Abrir en Outlook Web Javer 365"
                                        >
                                            <ExternalLink size={13} />
                                            <span>Abrir en Outlook Web (Javer 365)</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* MODO ENTREGAS RÁPIDAS (0s) EN PLEGADO */}
                    {activeMode === 'quick' && (
                        <div className="space-y-3">
                            <div className="bg-gray-900/90 rounded-2xl border border-amber-500/30 p-3.5 shadow-xl space-y-3">
                                <div className="flex items-center justify-between gap-2 pb-2 border-b border-gray-800">
                                    <div className="flex items-center gap-2">
                                        <Zap size={15} className="text-amber-400" />
                                        <span className="text-xs font-black uppercase text-white">Entrega Inmediata</span>
                                    </div>
                                    <div className="flex bg-slate-950 rounded-lg p-0.5 border border-gray-800 text-[10px]">
                                        <button
                                            type="button"
                                            onClick={() => handleSwitchCategory('javer')}
                                            className={`px-2 py-0.5 rounded font-black cursor-pointer ${
                                                templateCategory === 'javer' ? 'bg-amber-500 text-slate-950' : 'text-gray-400'
                                            }`}
                                        >
                                            🏗️ Javer
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleSwitchCategory('3d')}
                                            className={`px-2 py-0.5 rounded font-black cursor-pointer ${
                                                templateCategory === '3d' ? 'bg-purple-600 text-white' : 'text-gray-400'
                                            }`}
                                        >
                                            🖨️ 3D
                                        </button>
                                    </div>
                                </div>

                                {/* Plantillas Rápidas */}
                                <div className="space-y-1.5">
                                    <span className="text-[9.5px] font-black uppercase text-amber-300 block">Plantillas:</span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {(templateCategory === '3d' ? QUICK_PRESETS_3D : QUICK_PRESETS).map(qp => (
                                            <button
                                                key={qp.id}
                                                type="button"
                                                onClick={() => handleSelectQuickPreset(qp)}
                                                className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer ${
                                                    activePresetId === qp.id
                                                        ? 'bg-amber-500 text-slate-950 font-black'
                                                        : 'bg-slate-950 text-gray-300 border border-gray-800'
                                                }`}
                                            >
                                                {qp.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Entregables */}
                                <div className="space-y-1.5 pt-1">
                                    <span className="text-[9.5px] font-black uppercase text-purple-300 block">Entregables incluidos:</span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {(templateCategory === '3d' ? DELIVERABLE_OPTIONS_3D : DELIVERABLE_OPTIONS).map(d => {
                                            const isSelected = selectedDeliverables.includes(d);
                                            return (
                                                <button
                                                    key={d}
                                                    type="button"
                                                    onClick={() => toggleDeliverable(d)}
                                                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                                        isSelected
                                                            ? 'bg-purple-600 text-white shadow'
                                                            : 'bg-slate-950 text-gray-400 border border-gray-800'
                                                    }`}
                                                >
                                                    {isSelected ? '✓ ' : ''}{d}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Método */}
                                <div className="space-y-1.5 pt-1">
                                    <span className="text-[9.5px] font-black uppercase text-purple-300 block">Método de entrega:</span>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {(templateCategory === '3d' ? METHOD_OPTIONS_3D : METHOD_OPTIONS).map(m => (
                                            <button
                                                key={m}
                                                type="button"
                                                onClick={() => handleSelectMethod(m)}
                                                className={`py-1.5 px-2 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer ${
                                                    selectedMethod === m
                                                        ? 'bg-indigo-600 text-white font-black shadow'
                                                        : 'bg-slate-950 text-gray-400 border border-gray-800'
                                                }`}
                                            >
                                                {m}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Enlace en la nube */}
                                <div className="pt-1">
                                    <label className="text-[9px] font-bold uppercase text-gray-400 block mb-1">Enlace a Nube / SharePoint</label>
                                    <input
                                        type="url"
                                        value={cloudLink}
                                        onChange={e => setCloudLink(e.target.value)}
                                        placeholder="https://javer365.sharepoint.com/..."
                                        className="w-full p-2 bg-slate-950 border border-gray-800 rounded-xl text-xs text-white outline-none focus:border-amber-400"
                                    />
                                </div>

                                {/* Botón Aplicar Formato a Mensaje */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        const generated: GeneratedContent = {
                                            emailSubject: livePreview.emailSubject,
                                            emailBody: livePreview.emailBody,
                                            whatsappMessage: livePreview.whatsappMessage,
                                            improvedIdea: livePreview.improvedIdea
                                        };
                                        setGeneratedContent(generated);
                                        setOriginalContent(generated);
                                        toast.success("Mensaje de entrega generado al instante");
                                    }}
                                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-2"
                                >
                                    <Zap size={15} />
                                    <span>⚡ Generar Mensaje de Entrega</span>
                                </button>
                            </div>

                            {/* Resultados de Entrega si hay contenido */}
                            {generatedContent && (
                                <div className="bg-slate-900/95 border-2 border-emerald-500/40 rounded-3xl p-4 shadow-2xl space-y-2.5">
                                    <button
                                        type="button"
                                        onClick={() => handleSendWhatsApp(generatedContent.whatsappMessage)}
                                        className="w-full py-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                                    >
                                        <MessageSquare size={16} />
                                        <span>Enviar por WhatsApp (1 Toque)</span>
                                    </button>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => fileListInputRef.current?.click()}
                                            className="flex-1 py-2 px-2 bg-purple-600/20 hover:bg-purple-600/35 border border-purple-500/40 text-purple-200 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1 cursor-pointer"
                                        >
                                            <Paperclip size={11} />
                                            <span>📎 Adjuntar ({realAttachments.length + attachedImages.length})</span>
                                        </button>
                                        {realAttachments.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={handleUploadAttachmentsToCloud}
                                                disabled={isUploadingAttachments}
                                                className="py-2 px-2.5 bg-cyan-600/25 hover:bg-cyan-600/40 border border-cyan-500/40 text-cyan-200 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                                            >
                                                {isUploadingAttachments ? <RefreshCw size={11} className="animate-spin" /> : <UploadCloud size={11} />}
                                                <span>☁️ Nube</span>
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => handleDownloadEmlDraft(generatedContent.emailSubject, generatedContent.emailBody)}
                                            className="py-2 px-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1 shadow-md cursor-pointer"
                                        >
                                            <Paperclip size={11} />
                                            <span>📎 Outlook (.EML)</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleSendDirectApi(generatedContent.emailSubject, generatedContent.emailBody)}
                                            disabled={isSendingDirectEmail}
                                            className="py-2 px-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1 shadow-md cursor-pointer disabled:opacity-50"
                                        >
                                            {isSendingDirectEmail ? <RefreshCw size={11} className="animate-spin" /> : <Send size={11} />}
                                            <span>🚀 Enviar Aquí</span>
                                        </button>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleOpenOutlookWeb(generatedContent.emailSubject, generatedContent.emailBody)}
                                        className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2 shadow-md cursor-pointer"
                                    >
                                        <ExternalLink size={13} />
                                        <span>Abrir en Outlook Web</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* DOCK INFERIOR PLEGADO: BOTONES DE ALEJAVI NOTICIAS, HISTORIAL Y RESET */}
                    <div className="grid grid-cols-3 gap-2 pt-1">
                        <a 
                            href="https://academiartificial.com/noticias-ia/" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-1.5 px-2.5 py-2 bg-gradient-to-r from-blue-600/30 to-indigo-600/30 hover:from-blue-600/50 text-blue-300 rounded-xl border border-blue-500/30 text-[11px] font-black uppercase tracking-wider transition-all shadow-sm truncate"
                            title="Ver noticias de IA en Academia Artificial"
                        >
                            <Newspaper size={13} className="text-blue-400 shrink-0" />
                            <span className="truncate">alejavi noticias</span>
                            <ExternalLink size={10} className="opacity-70 shrink-0" />
                        </a>
                        <button 
                            type="button"
                            onClick={() => setShowHistory(!showHistory)} 
                            className="px-2.5 py-2 bg-gray-900 hover:bg-gray-800 rounded-xl text-[11px] font-black uppercase text-gray-300 border border-gray-800 cursor-pointer flex items-center justify-center gap-1.5"
                        >
                            <Clock size={13} className="shrink-0 text-gray-400" />
                            <span>Historial</span>
                        </button>
                        <button 
                            type="button"
                            onClick={handleResetAll} 
                            title="Reiniciar todos los campos" 
                            className="px-2.5 py-2 bg-gray-900 hover:bg-red-600/20 text-gray-400 hover:text-red-400 rounded-xl text-[11px] font-black uppercase border border-gray-800 transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                            <RotateCcw size={13} className="shrink-0" />
                            <span>Reset</span>
                        </button>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* CELULAR DESPLEGADO (GALAXY FOLD UNFOLDED / 580PX A 1024PX - PANTALLA 4:3) */}
            {/* ESTUDIO BALANCENADO 2 COLUMNAS (IZQUIERDA: ENTRADA/DICTADO, DERECHA: SALIDA) */}
            {/* ========================================================================= */}
            {isFoldUnfoldedMode && (
                <div className="space-y-4 mb-4">
                    {/* Header Estudio Desplegado */}
                    <div className="flex items-center justify-between gap-3 p-3 bg-gray-900/90 rounded-2xl border border-purple-500/30 shadow-lg flex-wrap sm:flex-nowrap">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2.5 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl shadow-md text-white">
                                <Mail size={18} />
                            </div>
                            <div>
                                <h2 className="text-sm font-black text-white uppercase tracking-tight">Generador de Mensajes</h2>
                                <p className="text-[10px] text-gray-400">Estudio Ejecutivo Javer · Dictado & Envío Rápido</p>
                            </div>
                        </div>

                        {/* Selector de Modos Segmentado */}
                        <div className="flex bg-slate-950 p-1 rounded-xl border border-purple-500/20">
                            <button
                                type="button"
                                onClick={() => setActiveMode('ai')}
                                className={`py-1.5 px-3 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                                    activeMode === 'ai'
                                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                <Sparkles size={13} className={activeMode === 'ai' ? 'text-purple-200' : ''} />
                                <span>1. Redactor IA</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveMode('quick')}
                                className={`py-1.5 px-3 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                                    activeMode === 'quick'
                                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                <Zap size={13} className={activeMode === 'quick' ? 'text-amber-300' : ''} />
                                <span>2. Entregas (0s)</span>
                            </button>
                        </div>

                        {/* Botón Outlook Web */}
                        <button
                            type="button"
                            onClick={() => handleOpenOutlookWeb()}
                            className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black uppercase flex items-center gap-1.5 shadow-md border border-blue-400/30 cursor-pointer shrink-0"
                            title="Abrir Outlook Web Javer 365"
                        >
                            <ExternalLink size={13} />
                            <span>Outlook Web</span>
                        </button>
                    </div>

                    {/* Barra de Utilidades Desplegado (Alejavi, Historial, Reset) */}
                    <div className="grid grid-cols-3 gap-2">
                        <a 
                            href="https://academiartificial.com/noticias-ia/" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 hover:from-blue-600/40 text-blue-300 rounded-xl border border-blue-500/25 text-[11px] font-black uppercase tracking-wider transition-all shadow-sm truncate"
                        >
                            <Newspaper size={12} className="text-blue-400 shrink-0" />
                            <span className="truncate">alejavi noticias</span>
                            <ExternalLink size={10} className="opacity-70 shrink-0" />
                        </a>
                        <button 
                            type="button"
                            onClick={() => setShowHistory(!showHistory)} 
                            className="px-2.5 py-1.5 bg-gray-900 hover:bg-gray-800 rounded-xl text-[11px] font-black uppercase text-gray-300 border border-gray-800 cursor-pointer flex items-center justify-center gap-1.5"
                        >
                            <Clock size={12} className="shrink-0 text-gray-400" />
                            <span>Historial</span>
                        </button>
                        <button 
                            type="button"
                            onClick={handleResetAll} 
                            title="Reiniciar todos los campos" 
                            className="px-2.5 py-1.5 bg-gray-900 hover:bg-red-600/20 text-gray-400 hover:text-red-400 rounded-xl text-[11px] font-black uppercase border border-gray-800 transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                            <RotateCcw size={12} className="shrink-0" />
                            <span>Reset</span>
                        </button>
                    </div>

                    {/* CUADRÍCULA MASTER-DETAIL EN 2 COLUMNAS (50% ENTRADA / 50% SALIDA) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                        {/* ========================================= */}
                        {/* COLUMNA IZQUIERDA: CONSOLA DE COMPOSICIÓN */}
                        {/* ========================================= */}
                        <div className="space-y-4">
                            {/* Tarjeta de Destinatario y Género */}
                            <div className="bg-gray-900/90 rounded-2xl border border-purple-500/25 p-3.5 shadow-xl space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                                        <Users size={14} />
                                        <span>Destinatario:</span>
                                    </span>
                                    <div className="flex bg-slate-950 rounded-lg p-0.5 border border-purple-500/20">
                                        <button
                                            type="button"
                                            onClick={() => setIsNewContactMode(false)}
                                            className={`px-2.5 py-1 rounded-md text-[10px] font-black transition-all cursor-pointer ${
                                                !isNewContactMode ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'
                                            }`}
                                        >
                                            Guardados
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsNewContactMode(true);
                                                setSelectedContactIndex('');
                                            }}
                                            className={`px-2.5 py-1 rounded-md text-[10px] font-black transition-all cursor-pointer ${
                                                isNewContactMode ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'
                                            }`}
                                        >
                                            ➕ No guardado
                                        </button>
                                    </div>
                                </div>

                                {isNewContactMode ? (
                                    <div className="space-y-2 pt-0.5">
                                        <div>
                                            <label className="text-[9px] font-bold uppercase text-gray-400 block mb-0.5">Nombre Completo *</label>
                                            <input
                                                type="text"
                                                value={recipientName}
                                                onChange={(e) => {
                                                    const n = e.target.value;
                                                    setRecipientName(n);
                                                    if (!recipientNickname || recipientNickname === recipientName.split(' ')[0]) {
                                                        setRecipientNickname(n.split(' ')[0]);
                                                    }
                                                }}
                                                placeholder="Ej. Ing. Carlos Salinas"
                                                className="w-full p-2 bg-slate-950 border border-indigo-500/40 rounded-xl text-xs text-white font-bold outline-none focus:border-indigo-400"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="text-[9px] font-bold uppercase text-yellow-400 block mb-0.5">🏷️ Apodo / Saludo</label>
                                                <input
                                                    type="text"
                                                    value={recipientNickname}
                                                    onChange={(e) => setRecipientNickname(e.target.value)}
                                                    placeholder="Ej. Carlos, Beto..."
                                                    className="w-full p-2 bg-slate-950 border border-yellow-500/40 rounded-xl text-xs text-yellow-300 font-bold outline-none focus:border-yellow-400"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-bold uppercase text-gray-400 block mb-0.5">Correo</label>
                                                <input
                                                    type="email"
                                                    value={recipientEmailUser}
                                                    onChange={(e) => setRecipientEmailUser(e.target.value)}
                                                    placeholder="correo@ejemplo.com"
                                                    className="w-full p-2 bg-slate-950 border border-indigo-500/40 rounded-xl text-xs text-white font-mono outline-none focus:border-indigo-400"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 pt-1">
                                            <button
                                                type="button"
                                                onClick={() => handleSaveContactToSupabase()}
                                                disabled={isSavingContact || !recipientName.trim()}
                                                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md disabled:opacity-50"
                                            >
                                                {isSavingContact ? <Spinner size="3" /> : <Save size={12} />}
                                                <span>💾 Guardar en Supabase</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsNewContactMode(false);
                                                    toast.info(`Usando a "${recipientName}" sin guardar`);
                                                }}
                                                disabled={!recipientName.trim()}
                                                className="py-2 px-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                            >
                                                ⚡ Usar solo hoy
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                                            {quickContacts.map(qc => {
                                                const isSelected = selectedContactIndex !== '' && parseInt(selectedContactIndex, 10) === qc.index;
                                                return (
                                                    <button
                                                        key={qc.name}
                                                        type="button"
                                                        onClick={() => selectContactByIndex(qc.index, sortedContacts)}
                                                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                                                            isSelected 
                                                                ? 'bg-purple-600 text-white shadow-sm ring-1 ring-purple-400' 
                                                                : 'bg-slate-950 text-gray-300 border border-gray-800'
                                                        }`}
                                                    >
                                                        {qc.isErik && <span>⭐</span>}
                                                        <span>{qc.name.split(' ')[0]}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <select 
                                            value={selectedContactIndex} 
                                            onChange={handleContactSelect} 
                                            className="w-full p-2 bg-slate-950 border border-gray-800 rounded-xl text-xs text-white font-bold outline-none cursor-pointer"
                                        >
                                            <option value="">Seleccionar de lista completa ({sortedContacts.length})...</option>
                                            {sortedContacts.map((c, i) => (
                                                <option key={i} value={i}>
                                                    {getDBValue(c, 'cliente')} ({getDBValue(c, 'correo')})
                                                </option>
                                            ))}
                                        </select>

                                        {/* Modificar Apodo y Saludo en Modo Plegado Extendido */}
                                        <div className="flex items-center gap-2 p-1.5 bg-slate-950/80 rounded-xl border border-yellow-500/30">
                                            <button
                                                type="button"
                                                onClick={() => setUseNickname(!useNickname)}
                                                className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
                                                    useNickname ? 'bg-yellow-500/20 text-yellow-300' : 'bg-gray-800 text-gray-400'
                                                }`}
                                            >
                                                {useNickname ? '🏷️ Apodo' : 'Formal'}
                                            </button>
                                            <input
                                                type="text"
                                                value={recipientNickname}
                                                onChange={(e) => setRecipientNickname(e.target.value)}
                                                placeholder="Modificar apodo..."
                                                disabled={!useNickname}
                                                className={`flex-1 bg-transparent text-xs font-bold outline-none ${
                                                    useNickname ? 'text-yellow-200 placeholder-yellow-500/40' : 'text-gray-500 opacity-50'
                                                }`}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleSaveContactToSupabase()}
                                                disabled={isSavingContact}
                                                className="px-2 py-1 bg-purple-600/80 hover:bg-purple-600 text-white rounded-lg text-[10px] font-black uppercase transition-colors shrink-0 cursor-pointer"
                                                title="Guardar este apodo en Supabase"
                                            >
                                                {isSavingContact ? '...' : '💾 BD'}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Selector de Género Obligatorio */}
                                <div className="pt-2 border-t border-purple-500/15 flex items-center justify-between gap-2">
                                    <span className="text-[10px] font-black uppercase text-purple-200">
                                        Concordancia de Género:
                                    </span>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setRecipientGender('M')}
                                            className={`py-1 px-3 rounded-lg text-xs font-black uppercase transition-all cursor-pointer ${
                                                recipientGender === 'M'
                                                    ? 'bg-blue-600 text-white shadow ring-1 ring-blue-400'
                                                    : 'bg-slate-950 text-gray-400 hover:text-white border border-gray-800'
                                            }`}
                                        >
                                            👨 H
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setRecipientGender('F')}
                                            className={`py-1 px-3 rounded-lg text-xs font-black uppercase transition-all cursor-pointer ${
                                                recipientGender === 'F'
                                                    ? 'bg-pink-600 text-white shadow ring-1 ring-pink-400'
                                                    : 'bg-slate-950 text-gray-400 hover:text-white border border-gray-800'
                                            }`}
                                        >
                                            👩 M
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Consola de Voz y Redacción (Modo AI) */}
                            {activeMode === 'ai' && (
                                <div className="bg-gradient-to-br from-purple-950/80 via-slate-900/95 to-indigo-950/80 border-2 border-purple-500/40 rounded-3xl p-4 shadow-2xl space-y-3.5">
                                    {/* Micrófono grande central con ondas sonoras */}
                                    <div className="flex flex-col items-center justify-center py-1 space-y-2">
                                        <button
                                            type="button"
                                            onClick={toggleListening}
                                            className={`group relative flex items-center justify-center rounded-full transition-all duration-300 cursor-pointer ${
                                                isListening
                                                    ? 'w-20 h-20 bg-red-600 text-white shadow-[0_0_40px_rgba(239,68,68,0.7)] ring-6 ring-red-500/30 scale-105 animate-pulse'
                                                    : 'w-20 h-20 bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 text-white shadow-[0_0_30px_rgba(168,85,247,0.5)] hover:scale-105 active:scale-95 border-2 border-white/30'
                                            }`}
                                            title={isListening ? "Detener dictado" : "Toca para dictar por voz"}
                                        >
                                            {isListening ? <MicOff size={34} /> : <Mic size={34} />}
                                        </button>
                                        <p className="text-xs font-black uppercase tracking-wider text-white">
                                            {isListening ? '🔴 Escuchando tu voz...' : 'Toca el micrófono para dictar'}
                                        </p>
                                        {isListening && (
                                            <div className="flex items-center justify-center gap-1 h-4">
                                                {[30, 70, 95, 55, 90, 45, 80, 50].map((h, i) => (
                                                    <div
                                                        key={i}
                                                        className="w-1 bg-red-500 rounded-full animate-pulse"
                                                        style={{ height: `${h}%`, animationDelay: `${i * 70}ms` }}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Textarea de Idea con autocompletado */}
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-purple-300">
                                                Idea o Instrucción:
                                            </span>
                                            {idea && (
                                                <button
                                                    type="button"
                                                    onClick={() => setIdea('')}
                                                    className="text-[10px] text-gray-400 hover:text-white flex items-center gap-1 cursor-pointer"
                                                >
                                                    <RotateCcw size={10} />
                                                    <span>Limpiar</span>
                                                </button>
                                            )}
                                        </div>
                                        <div className="relative">
                                            <textarea
                                                ref={ideaRef}
                                                value={idea}
                                                onChange={onIdeaChange}
                                                onKeyDown={handleKeyDown}
                                                placeholder="Dicta con el micrófono o escribe aquí lo que deseas comunicar..."
                                                rows={3}
                                                className="w-full p-3 bg-slate-950/90 border border-purple-500/30 rounded-xl text-xs text-white placeholder-gray-500 outline-none focus:border-purple-400 font-sans shadow-inner resize-none"
                                            />
                                            {suggestion && (
                                                <div 
                                                    onClick={acceptSuggestion}
                                                    className="absolute bottom-2 right-2 px-2 py-0.5 bg-purple-600/30 border border-purple-500/40 text-purple-200 rounded-md text-[10px] font-mono cursor-pointer hover:bg-purple-600/50"
                                                >
                                                    Ctrl/Tab: {suggestion}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Tono y Longitud */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="bg-slate-950/80 p-2 rounded-xl border border-purple-500/20">
                                            <span className="text-[9px] font-bold uppercase text-gray-400 block mb-1">Tono</span>
                                            <div className="grid grid-cols-2 gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => setTone('Profesional')}
                                                    className={`py-1 rounded text-[10px] font-bold cursor-pointer ${
                                                        tone === 'Profesional' ? 'bg-purple-600 text-white' : 'text-gray-400'
                                                    }`}
                                                >
                                                    Profesional
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setTone('Casual')}
                                                    className={`py-1 rounded text-[10px] font-bold cursor-pointer ${
                                                        tone === 'Casual' ? 'bg-purple-600 text-white' : 'text-gray-400'
                                                    }`}
                                                >
                                                    Casual
                                                </button>
                                            </div>
                                        </div>
                                        <div className="bg-slate-950/80 p-2 rounded-xl border border-purple-500/20">
                                            <span className="text-[9px] font-bold uppercase text-gray-400 block mb-1">Longitud</span>
                                            <div className="grid grid-cols-2 gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => setMessageLength('Reducido')}
                                                    className={`py-1 rounded text-[10px] font-bold cursor-pointer ${
                                                        messageLength === 'Reducido' ? 'bg-indigo-600 text-white' : 'text-gray-400'
                                                    }`}
                                                >
                                                    Reducido
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setMessageLength('Normal' as any)}
                                                    className={`py-1 rounded text-[10px] font-bold cursor-pointer ${
                                                        messageLength !== 'Reducido' ? 'bg-indigo-600 text-white' : 'text-gray-400'
                                                    }`}
                                                >
                                                    Normal
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Botón Redactar con IA */}
                                    <button
                                        type="button"
                                        onClick={() => handleGenerate()}
                                        disabled={isLoading || (!idea.trim() && !previousEmail.trim() && attachedImages.length === 0)}
                                        className="w-full py-3.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-xl shadow-purple-600/30 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 cursor-pointer border border-purple-400/30"
                                    >
                                        {isLoading ? (
                                            <>
                                                <RefreshCw className="animate-spin" size={16} />
                                                <span>Redactando Correo con IA...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles size={16} className="text-yellow-300" />
                                                <span>Redactar Correo con IA</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}

                            {/* Consola de Entregas Rápidas (Modo Quick) */}
                            {activeMode === 'quick' && (
                                <div className="bg-gray-900/90 rounded-2xl border border-amber-500/30 p-3.5 shadow-xl space-y-3">
                                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-gray-800">
                                        <div className="flex items-center gap-2">
                                            <Zap size={16} className="text-amber-400" />
                                            <span className="text-xs font-black uppercase text-white">Entrega Rápida</span>
                                        </div>
                                        <div className="flex bg-slate-950 rounded-lg p-0.5 border border-gray-800 text-[10px]">
                                            <button
                                                type="button"
                                                onClick={() => handleSwitchCategory('javer')}
                                                className={`px-2 py-0.5 rounded font-black cursor-pointer ${
                                                    templateCategory === 'javer' ? 'bg-amber-500 text-slate-950' : 'text-gray-400'
                                                }`}
                                            >
                                                🏗️ Javer
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleSwitchCategory('3d')}
                                                className={`px-2 py-0.5 rounded font-black cursor-pointer ${
                                                    templateCategory === '3d' ? 'bg-purple-600 text-white' : 'text-gray-400'
                                                }`}
                                            >
                                                🖨️ 3D
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <span className="text-[9.5px] font-black uppercase text-amber-300 block">Plantillas:</span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {(templateCategory === '3d' ? QUICK_PRESETS_3D : QUICK_PRESETS).map(qp => (
                                                <button
                                                    key={qp.id}
                                                    type="button"
                                                    onClick={() => handleSelectQuickPreset(qp)}
                                                    className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer ${
                                                        activePresetId === qp.id
                                                            ? 'bg-amber-500 text-slate-950 font-black'
                                                            : 'bg-slate-950 text-gray-300 border border-gray-800'
                                                    }`}
                                                >
                                                    {qp.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-1.5 pt-1">
                                        <span className="text-[9.5px] font-black uppercase text-purple-300 block">Entregables:</span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {(templateCategory === '3d' ? DELIVERABLE_OPTIONS_3D : DELIVERABLE_OPTIONS).map(d => {
                                                const isSelected = selectedDeliverables.includes(d);
                                                return (
                                                    <button
                                                        key={d}
                                                        type="button"
                                                        onClick={() => toggleDeliverable(d)}
                                                        className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                                            isSelected ? 'bg-purple-600 text-white' : 'bg-slate-950 text-gray-400 border border-gray-800'
                                                        }`}
                                                    >
                                                        {isSelected ? '✓ ' : ''}{d}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <div className="pt-1">
                                        <label className="text-[9px] font-bold uppercase text-gray-400 block mb-1">Enlace a Nube / SharePoint</label>
                                        <input
                                            type="url"
                                            value={cloudLink}
                                            onChange={e => setCloudLink(e.target.value)}
                                            placeholder="https://javer365.sharepoint.com/..."
                                            className="w-full p-2 bg-slate-950 border border-gray-800 rounded-xl text-xs text-white outline-none focus:border-amber-400"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const generated: GeneratedContent = {
                                                emailSubject: livePreview.emailSubject,
                                                emailBody: livePreview.emailBody,
                                                whatsappMessage: livePreview.whatsappMessage,
                                                improvedIdea: livePreview.improvedIdea
                                            };
                                            setGeneratedContent(generated);
                                            setOriginalContent(generated);
                                            toast.success("Mensaje de entrega generado al instante");
                                        }}
                                        className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg cursor-pointer flex items-center justify-center gap-2"
                                    >
                                        <Zap size={15} />
                                        <span>⚡ Generar Mensaje de Entrega</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* ========================================= */}
                        {/* COLUMNA DERECHA: CONSOLA DE SALIDA & ENVÍO */}
                        {/* ========================================= */}
                        <div className="space-y-4">
                            {generatedContent ? (
                                <div className="space-y-4">
                                    {/* Tarjeta WhatsApp Direct Dispatch */}
                                    <div className="bg-slate-900/95 border-2 border-emerald-500/40 rounded-3xl p-4 shadow-2xl space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-black uppercase text-emerald-400 flex items-center gap-1.5">
                                                <MessageSquare size={16} />
                                                <span>Mensaje WhatsApp Optimizado</span>
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => handleCopyToClipboard(generatedContent.whatsappMessage, 'whatsapp')}
                                                className="text-[10px] text-gray-400 hover:text-white flex items-center gap-1 cursor-pointer"
                                            >
                                                <Copy size={11} />
                                                <span>{copied === 'whatsapp' ? '¡Copiado!' : 'Copiar'}</span>
                                            </button>
                                        </div>

                                        {/* Botón Grande: Enviar por WhatsApp en 1 Toque */}
                                        <button
                                            type="button"
                                            onClick={() => handleSendWhatsApp(generatedContent.whatsappMessage)}
                                            className="w-full py-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60 active:scale-95 transition-all cursor-pointer border border-emerald-400/30"
                                        >
                                            <MessageSquare size={16} />
                                            <span>Enviar por WhatsApp (1 Toque)</span>
                                        </button>

                                        <div className="p-3 bg-slate-950/90 rounded-xl border border-emerald-500/30 max-h-44 overflow-y-auto">
                                            <p className="text-xs text-emerald-100/95 whitespace-pre-wrap leading-relaxed">
                                                {generatedContent.whatsappMessage}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Tarjeta Correo Ejecutivo Formal */}
                                    <div className="bg-slate-900/95 border-2 border-purple-500/40 rounded-3xl p-4 shadow-2xl space-y-3">
                                        <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                                            <span className="text-xs font-black uppercase text-purple-300 flex items-center gap-1.5">
                                                <Mail size={16} />
                                                <span>Correo Ejecutivo Formal</span>
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => handleCopyToClipboard(generatedContent.emailBody, 'email')}
                                                className="text-[10px] text-gray-400 hover:text-white flex items-center gap-1 cursor-pointer"
                                            >
                                                <Copy size={11} />
                                                <span>{copied === 'email' ? '¡Copiado!' : 'Copiar'}</span>
                                            </button>
                                        </div>

                                        {/* Asunto */}
                                        <div className="p-2.5 bg-slate-950 rounded-xl border border-gray-800 flex items-center justify-between">
                                            <p className="text-xs font-bold text-white truncate">
                                                Asunto: {generatedContent.emailSubject}
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => handleCopyToClipboard(generatedContent.emailSubject, 'email')}
                                                className="text-gray-400 hover:text-white p-1"
                                                title="Copiar solo el asunto"
                                            >
                                                <Copy size={12} />
                                            </button>
                                        </div>

                                        {/* Cuerpo */}
                                        <div className="p-3 bg-slate-950/90 rounded-xl border border-gray-800 max-h-60 overflow-y-auto">
                                            <p className="text-xs text-gray-200 whitespace-pre-wrap leading-relaxed">
                                                {generatedContent.emailBody}
                                            </p>
                                        </div>

                                        {/* Botones Adjuntos, .EML Outlook, Envío Directo y Outlook Web */}
                                        <div className="space-y-2 pt-1">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => fileListInputRef.current?.click()}
                                                    className="flex-1 py-2 px-3 bg-purple-600/20 hover:bg-purple-600/35 border border-purple-500/40 text-purple-200 rounded-xl text-[10.5px] font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                                                >
                                                    <Paperclip size={12} />
                                                    <span>📎 Adjuntar Archivos ({realAttachments.length + attachedImages.length})</span>
                                                </button>
                                                {realAttachments.length > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={handleUploadAttachmentsToCloud}
                                                        disabled={isUploadingAttachments}
                                                        className="py-2 px-3 bg-cyan-600/25 hover:bg-cyan-600/40 border border-cyan-500/40 text-cyan-200 rounded-xl text-[10.5px] font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                                                    >
                                                        {isUploadingAttachments ? <RefreshCw size={12} className="animate-spin" /> : <UploadCloud size={12} />}
                                                        <span>☁️ Subir Nube</span>
                                                    </button>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleDownloadEmlDraft(generatedContent.emailSubject, generatedContent.emailBody)}
                                                    className="py-2.5 px-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-[11px] font-black uppercase flex items-center justify-center gap-1.5 shadow-md cursor-pointer border border-indigo-400/30"
                                                    title="Descargar borrador .EML para Outlook con adjuntos incrustados"
                                                >
                                                    <Paperclip size={13} />
                                                    <span>📎 Outlook + Adjuntos (.EML)</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleSendDirectApi(generatedContent.emailSubject, generatedContent.emailBody)}
                                                    disabled={isSendingDirectEmail}
                                                    className="py-2.5 px-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-[11px] font-black uppercase flex items-center justify-center gap-1.5 shadow-md cursor-pointer border border-emerald-400/30 disabled:opacity-50"
                                                    title="Enviar correo con adjuntos directamente desde aquí"
                                                >
                                                    {isSendingDirectEmail ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                                                    <span>🚀 Enviar Directo Aquí</span>
                                                </button>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleOpenOutlookWeb(generatedContent.emailSubject, generatedContent.emailBody)}
                                                className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2 shadow-md cursor-pointer border border-blue-400/30"
                                            >
                                                <ExternalLink size={14} />
                                                <span>Abrir en Outlook Web (Javer 365)</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* Estado Vacío Elegante (Placeholder antes de redactar) */
                                <div className="h-full min-h-[360px] bg-gray-900/60 border-2 border-dashed border-purple-500/25 rounded-3xl p-6 flex flex-col items-center justify-center text-center space-y-4">
                                    <div className="w-16 h-16 rounded-2xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                                        <Sparkles size={28} />
                                    </div>
                                    <div className="space-y-1 max-w-sm">
                                        <h4 className="text-sm font-black text-white uppercase tracking-wider">
                                            Bandeja de Despacho Lista
                                        </h4>
                                        <p className="text-xs text-gray-400 leading-relaxed">
                                            Dicta por voz o escribe tu idea a la izquierda y presiona <strong className="text-purple-300">"Redactar Correo con IA"</strong>.
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2 text-left w-full max-w-xs pt-2">
                                        <div className="p-2.5 bg-slate-950/60 rounded-xl border border-white/5 flex items-center gap-2 text-[11px] text-gray-300">
                                            <MessageSquare size={14} className="text-emerald-400 shrink-0" />
                                            <span>Envío a WhatsApp listo en 1 toque.</span>
                                        </div>
                                        <div className="p-2.5 bg-slate-950/60 rounded-xl border border-white/5 flex items-center gap-2 text-[11px] text-gray-300">
                                            <Mail size={14} className="text-blue-400 shrink-0" />
                                            <span>Correo formal con concordancia y saludo.</span>
                                        </div>
                                        <div className="p-2.5 bg-slate-950/60 rounded-xl border border-white/5 flex items-center gap-2 text-[11px] text-gray-300">
                                            <ExternalLink size={14} className="text-indigo-400 shrink-0" />
                                            <span>Outlook Web precargado en 1 clic.</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}



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

            {/* ========================================================================= */}
            {/* VISTA ESCRITORIO (>= 1024PX): BARRA DE DESTINATARIO Y CUADRÍCULA COMPLETA */}
            {/* ========================================================================= */}
            {isDesktopMode && (
                <>
                    <div className="bg-gray-900/80 backdrop-blur-xl p-3.5 sm:p-4 rounded-2xl border border-purple-500/25 mb-5 shadow-xl space-y-3">
                {/* Fila principal: Indicador Para + Chip Destinatario Activo + Búsqueda Rápida + Acciones */}
                <div className="flex flex-nowrap items-center justify-between gap-2 overflow-x-auto no-scrollbar py-0.5">
                    
                    {/* Destinatario Activo con Saludo y Correo */}
                    <div className="flex items-center gap-2 flex-nowrap shrink-0">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl shadow-md shrink-0 h-8">
                            <Users size={14} />
                            <span className="text-xs font-black uppercase tracking-wider text-purple-100">Para:</span>
                        </div>

                        {/* Ficha Activa */}
                        <div className="flex items-center gap-2 bg-gray-800/90 border border-gray-700/80 rounded-xl px-2.5 py-1 shadow-inner shrink-0 h-8">
                            <span className="text-xs font-black text-white whitespace-nowrap">
                                {recipientTitle ? `${recipientTitle} ` : ''}{recipientName || 'Sin destinatario'}
                            </span>
                            {fullRecipientEmail && (
                                <span className="text-[11px] font-mono text-purple-300/90 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20 truncate max-w-[130px] sm:max-w-[170px]">
                                    {fullRecipientEmail}
                                </span>
                            )}
                            {fullRecipientEmail && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        navigator.clipboard.writeText(fullRecipientEmail);
                                        toast.success("Correo copiado al portapapeles");
                                    }}
                                    className="text-gray-400 hover:text-purple-300 transition-colors p-0.5 cursor-pointer shrink-0"
                                    title="Copiar correo"
                                >
                                    <Copy size={13} />
                                </button>
                            )}
                        </div>

                        {/* Selector directo de Género (👨 H / 👩 M) para la IA */}
                        <div className="flex items-center bg-gray-800/90 border border-gray-700/80 rounded-xl p-0.5 shrink-0 h-8" title="Selecciona si es Hombre o Mujer para asegurar concordancia perfecta en el correo">
                            <button
                                type="button"
                                onClick={() => setRecipientGender('M')}
                                className={`px-2 h-full rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                                    recipientGender === 'M' ? 'bg-blue-600 text-white shadow ring-1 ring-blue-400' : 'text-gray-400 hover:text-white'
                                }`}
                                title="Hombre (Tratamiento en masculino: Estimado, Arq., bienvenido)"
                            >
                                <span>👨 H</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setRecipientGender('F')}
                                className={`px-2 h-full rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                                    recipientGender === 'F' ? 'bg-pink-600 text-white shadow ring-1 ring-pink-400' : 'text-gray-400 hover:text-white'
                                }`}
                                title="Mujer (Tratamiento en femenino: Estimada, Arq., bienvenida)"
                            >
                                <span>👩 M</span>
                            </button>
                        </div>

                        {/* Control de Apodo en vivo: ancho uniforme y compacto igual que las demás pestañas */}
                        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-xl border transition-all shrink-0 h-8 ${
                            useNickname 
                                ? 'bg-yellow-500/10 border-yellow-500/40 text-yellow-300 shadow-sm' 
                                : 'bg-gray-800/80 border-gray-700 text-gray-400'
                        }`} title="Control del apodo con el que la IA saludará y se dirigirá a este contacto">
                            <button
                                type="button"
                                onClick={() => setUseNickname(!useNickname)}
                                className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded cursor-pointer transition-colors shrink-0 ${
                                    useNickname ? 'bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30' : 'bg-gray-700 text-gray-400 hover:text-white'
                                }`}
                                title={useNickname ? "Modo Apodo activo (clic para cambiar a Formal)" : "Modo Formal activo (clic para usar Apodo)"}
                            >
                                {useNickname ? '🏷️ Apodo' : 'Formal'}
                            </button>
                            <input
                                type="text"
                                value={recipientNickname}
                                onChange={(e) => setRecipientNickname(e.target.value)}
                                placeholder="Apodo..."
                                disabled={!useNickname}
                                title="Modifica aquí el apodo para dirigirte a esta persona (ej. Beto, Arqui, Mariana)"
                                className={`bg-transparent text-xs font-bold outline-none w-14 sm:w-16 transition-opacity whitespace-nowrap ${
                                    useNickname ? 'text-yellow-200 placeholder-yellow-500/40' : 'text-gray-500 placeholder-gray-600 cursor-not-allowed opacity-50'
                                }`}
                            />
                        </div>

                        {/* Botón Agregar Contacto */}
                        <button
                            type="button"
                            onClick={() => {
                                const next = !isNewContactMode;
                                setIsNewContactMode(next);
                                if (next) {
                                    setSelectedContactIndex('');
                                    setRecipientName('');
                                    setRecipientNickname('');
                                    setRecipientEmailUser('');
                                    setRecipientTitle('Arq.');
                                    setShowRecipientDetails(false);
                                }
                            }}
                            className={`px-2.5 h-8 rounded-xl border text-[11px] font-black uppercase transition-all cursor-pointer flex items-center gap-1 shrink-0 whitespace-nowrap ${
                                isNewContactMode 
                                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-md ring-1 ring-indigo-300' 
                                    : 'bg-gray-800 text-indigo-300 border-indigo-500/40 hover:bg-gray-700 hover:text-white'
                            }`}
                            title="Agregar un nuevo contacto y guardarlo en Supabase si lo solicitas"
                        >
                            <span>➕ {isNewContactMode ? 'Cancelar' : 'Contacto'}</span>
                        </button>

                        {/* Botón Editar / BD */}
                        <button
                            type="button"
                            onClick={() => {
                                setShowRecipientDetails(!showRecipientDetails);
                                if (!showRecipientDetails) setIsNewContactMode(false);
                            }}
                            className={`px-2.5 h-8 rounded-xl border text-[11px] font-black transition-all cursor-pointer flex items-center gap-1 shrink-0 whitespace-nowrap ${
                                showRecipientDetails 
                                    ? 'bg-purple-600 text-white border-purple-500 shadow-md' 
                                    : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700 hover:text-white'
                            }`}
                            title={showRecipientDetails ? "Ocultar edición de contacto" : "Editar o guardar este contacto en Supabase"}
                        >
                            <Pencil size={11} />
                            <span>{showRecipientDetails ? 'Ocultar' : 'Editar / BD'}</span>
                        </button>
                    </div>
                        <div className="flex items-center gap-2 flex-grow min-w-[200px] shrink-0">
                            {/* Buscador predictivo con sugerencias flotantes */}
                            <div className="relative flex-grow">
                                <div className="flex items-center bg-gray-800 border border-gray-700 rounded-xl px-2.5 h-8 focus-within:border-purple-500 transition-colors">
                                    <Search size={14} className="text-gray-400 mr-2 shrink-0" />
                                    <input 
                                        type="text"
                                        value={contactSearchQuery}
                                        onChange={(e) => setContactSearchQuery(e.target.value)}
                                        onFocus={() => setIsSearchFocused(true)}
                                        placeholder="Buscar contacto o correo..."
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

                                {/* Dropdown predictivo flotante */}
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

                            {/* Selector desplegable de lista completa */}
                            <div className="relative min-w-[160px] hidden sm:block">
                                <select 
                                    value={selectedContactIndex} 
                                    onChange={handleContactSelect} 
                                    className="w-full h-8 px-2.5 py-0 bg-gray-800 border border-gray-700 rounded-xl text-xs text-white font-bold appearance-none pr-7 outline-none focus:border-purple-500/50 cursor-pointer truncate"
                                >
                                    <option value="">Lista ({sortedContacts.length})...</option>
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
                        </div>
                </div>

                {/* Formulario dedicado para Agregar Nuevo Contacto */}
                <AnimatePresence>
                    {isNewContactMode && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden pt-1"
                        >
                            <div className="p-4 bg-gradient-to-r from-purple-950/40 via-gray-900/95 to-indigo-950/40 rounded-2xl border-2 border-indigo-500/50 shadow-2xl space-y-3">
                                <div className="flex items-center justify-between pb-2 border-b border-gray-800">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-indigo-600 text-white rounded-lg shadow">
                                            <Users size={14} />
                                        </div>
                                        <h4 className="text-xs font-black uppercase text-indigo-200 tracking-wider">
                                            Agregar Nuevo Contacto
                                        </h4>
                                        <span className="text-[10px] text-gray-400">
                                            (Se guardará en Supabase solo si lo solicitas)
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsNewContactMode(false)}
                                        className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer text-xs font-bold"
                                        title="Cerrar"
                                    >
                                        ✕
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                                    <div className="sm:col-span-2">
                                        <label className="text-[9px] text-gray-400 font-bold uppercase block mb-1">Título</label>
                                        <select 
                                            value={recipientTitle} 
                                            onChange={e => setRecipientTitle(e.target.value)} 
                                            className="w-full p-2 bg-gray-800 border border-gray-700 rounded-lg text-xs text-purple-300 font-black outline-none cursor-pointer"
                                        >
                                            {titlesList.map(t => <option key={t} value={t}>{t || 'Sin Título'}</option>)}
                                        </select>
                                    </div>

                                    <div className="sm:col-span-4">
                                        <label className="text-[9px] text-gray-400 font-bold uppercase block mb-1">Nombre Completo *</label>
                                        <input 
                                            value={recipientName} 
                                            onChange={e => {
                                                const n = e.target.value;
                                                setRecipientName(n);
                                                if (!recipientNickname || recipientNickname === recipientName.split(' ')[0]) {
                                                    setRecipientNickname(n.split(' ')[0]);
                                                }
                                            }} 
                                            className="w-full p-2 bg-gray-800 border border-gray-700 rounded-lg text-xs text-white font-bold outline-none focus:border-indigo-400" 
                                            placeholder="Ej. Mariana Torres"
                                        />
                                    </div>

                                    <div className="sm:col-span-3">
                                        <label className="text-[9px] text-yellow-400 font-bold uppercase block mb-1 flex items-center gap-1">
                                            <span>🏷️ Apodo / Saludo</span>
                                            <span className="text-[8px] text-gray-400 font-normal">(Trato IA)</span>
                                        </label>
                                        <input 
                                            value={recipientNickname} 
                                            onChange={e => setRecipientNickname(e.target.value)} 
                                            className="w-full p-2 bg-gray-800 border border-yellow-500/50 rounded-lg text-xs text-yellow-300 font-bold outline-none focus:border-yellow-400 placeholder-yellow-500/40" 
                                            placeholder="Ej. Mariana, Beto..."
                                            title="Cómo dirigirme a esta persona en el saludo"
                                        />
                                    </div>

                                    <div className="sm:col-span-3">
                                        <label className="text-[9px] text-gray-400 font-bold uppercase block mb-1">Género</label>
                                        <div className="flex bg-gray-800 rounded-lg border border-gray-700 p-0.5 h-[34px]">
                                            <button 
                                                type="button"
                                                onClick={() => setRecipientGender('M')} 
                                                className={`flex-1 rounded text-[11px] font-black transition-all cursor-pointer ${recipientGender === 'M' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                                            >
                                                👨 H
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={() => setRecipientGender('F')} 
                                                className={`flex-1 rounded text-[11px] font-black transition-all cursor-pointer ${recipientGender === 'F' ? 'bg-pink-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                                            >
                                                👩 M
                                            </button>
                                        </div>
                                    </div>

                                    <div className="sm:col-span-5">
                                        <label className="text-[9px] text-gray-400 font-bold uppercase block mb-1">Correo Electrónico</label>
                                        <div className="flex gap-1 bg-gray-800 p-0.5 rounded-lg border border-gray-700 h-[34px] items-center">
                                            <input 
                                                value={recipientEmailUser} 
                                                onChange={e => setRecipientEmailUser(e.target.value)} 
                                                className="flex-grow bg-transparent px-1.5 text-xs font-bold text-white outline-none min-w-0" 
                                                placeholder="usuario@correo.com"
                                            />
                                            <select 
                                                value={recipientEmailDomain} 
                                                onChange={e => setRecipientEmailDomain(e.target.value)} 
                                                className="bg-gray-900 px-1 py-1 rounded text-[11px] font-black text-purple-400 outline-none cursor-pointer"
                                            >
                                                {emailDomains.map(d => <option key={d} value={d}>{d}</option>)}
                                            </select>
                                            <select 
                                                value={recipientEmailTld} 
                                                onChange={e => setRecipientEmailTld(e.target.value)} 
                                                className="bg-gray-900 px-1 py-1 rounded text-[11px] font-bold text-gray-400 outline-none cursor-pointer"
                                            >
                                                {emailTlds.map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="sm:col-span-3">
                                        <label className="text-[9px] text-gray-400 font-bold uppercase block mb-1">Relación / Empresa</label>
                                        <input
                                            type="text"
                                            value={recipientRelation}
                                            onChange={e => setRecipientRelation(e.target.value)}
                                            placeholder="Javer, Cliente..."
                                            className="w-full p-2 bg-gray-800 border border-gray-700 rounded-lg text-xs text-white font-bold outline-none focus:border-indigo-400"
                                        />
                                    </div>

                                    <div className="sm:col-span-4 flex items-center gap-2">
                                        <button 
                                            type="button"
                                            onClick={() => handleSaveContactToSupabase()} 
                                            disabled={isSavingContact || !recipientName.trim()} 
                                            className="flex-1 h-[34px] bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-black uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md disabled:opacity-50"
                                            title="Guardar contacto en la tabla Contactos de Supabase"
                                        >
                                            {isSavingContact ? <Spinner size="3" /> : <Save size={13} />}
                                            <span>💾 Guardar en Supabase</span>
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => {
                                                setIsNewContactMode(false);
                                                toast.info(`Usando a "${recipientName}" para este correo (sin guardar en Supabase)`);
                                            }} 
                                            disabled={!recipientName.trim()} 
                                            className="px-2.5 h-[34px] bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-bold transition-all cursor-pointer"
                                            title="Usar solo para el correo actual sin guardar en Supabase"
                                        >
                                            ⚡ Usar hoy
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Accesos Rápidos de Contactos Frecuentes (1 Clic) + Selector CC + Saludo Activo */}
                <div className="space-y-2 pt-2 border-t border-gray-800/80">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        {quickContacts.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mr-1">
                                    1 Clic:
                                </span>
                                {quickContacts.map(qc => {
                                    const isSelected = selectedContactIndex !== '' && parseInt(selectedContactIndex, 10) === qc.index;
                                    return (
                                        <button
                                            key={qc.name}
                                            type="button"
                                            onClick={() => selectContactByIndex(qc.index, sortedContacts)}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                                isSelected 
                                                    ? 'bg-purple-600 text-white shadow-sm ring-1 ring-purple-400' 
                                                    : 'bg-gray-800/90 text-gray-300 hover:bg-gray-700 hover:text-white border border-gray-700/70'
                                            }`}
                                        >
                                            {qc.isErik ? <span>⭐</span> : (favorites.some(f => f.trim() === qc.name.trim()) && <Star size={11} className="text-yellow-400" fill="currentColor"/>)}
                                            <span className="truncate max-w-[130px]">{qc.name}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                        <div className="flex items-center gap-2 ml-auto">
                            <button
                                type="button"
                                onClick={() => setShowCcSelector(!showCcSelector)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                                    ccRecipients.length > 0
                                        ? 'bg-blue-600/20 text-blue-300 border-blue-500/40'
                                        : 'bg-gray-800/80 text-gray-400 hover:text-white border-gray-700/70'
                                }`}
                                title="Agregar destinatarios en Copia (CC) para Outlook Web y Correo"
                            >
                                <span>👥 + CC {ccRecipients.length > 0 ? `(${ccRecipients.length})` : ''}</span>
                            </button>
                            <div className="text-[11px] text-gray-400">
                                Saludo activo: <strong className="text-purple-300 font-bold not-italic">"{getPresetGreeting()}:"</strong>
                            </div>
                        </div>
                    </div>

                    {/* Barra desplegable de selección de CC (Copia) en 1 Clic */}
                    {(showCcSelector || ccRecipients.length > 0) && (
                        <div className="p-2.5 bg-gray-950/70 rounded-xl border border-blue-500/25 flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 mr-1">
                                    En Copia (CC):
                                </span>
                                {sortedContacts.map((c, idx) => {
                                    const cName = String(getDBValue(c, 'cliente') || '').trim();
                                    const rawMail = String(getDBValue(c, 'correo') || '').trim();
                                    if (!rawMail) return null;
                                    const cMail = rawMail.includes('@') ? rawMail : `${rawMail}@javer.com.mx`;
                                    if (cMail.toLowerCase() === (fullRecipientEmail || '').toLowerCase()) return null;
                                    const isCc = ccRecipients.some(r => r.email.toLowerCase() === cMail.toLowerCase());
                                    return (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => toggleCcContact(c)}
                                            className={`px-2 py-0.5 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                                isCc
                                                    ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400'
                                                    : 'bg-gray-800/80 text-gray-400 hover:text-white border border-gray-700/60'
                                            }`}
                                            title={`${cName} (${cMail})`}
                                        >
                                            <span>{isCc ? '✓' : '+'}</span>
                                            <span className="truncate max-w-[120px]">{cName}</span>
                                        </button>
                                    );
                                })}
                            </div>
                            {ccRecipients.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setCcRecipients([])}
                                    className="text-[10px] text-red-400 hover:text-red-300 font-bold cursor-pointer ml-auto"
                                >
                                    Limpiar CC
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Formulario editable colapsable para afinar contacto o guardar nuevo en BD */}
                <AnimatePresence>
                    {showRecipientDetails && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden pt-2 border-t border-gray-800"
                        >
                            <div className="p-3.5 bg-gray-950/90 rounded-2xl border border-purple-500/30 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end shadow-xl">
                                <div className="sm:col-span-2">
                                    <label className="text-[9px] text-gray-400 font-bold uppercase block mb-1">Título</label>
                                    <select 
                                        value={recipientTitle} 
                                        onChange={e => setRecipientTitle(e.target.value)} 
                                        className="w-full p-2 bg-gray-800 border border-gray-700 rounded-lg text-xs text-purple-400 font-black outline-none cursor-pointer"
                                    >
                                        {titlesList.map(t => <option key={t} value={t}>{t || 'Sin Título'}</option>)}
                                    </select>
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="text-[9px] text-gray-400 font-bold uppercase block mb-1">Género</label>
                                    <div className="flex bg-gray-800 rounded-lg border border-gray-700 p-0.5 h-[34px]">
                                        <button 
                                            type="button"
                                            onClick={() => setRecipientGender('M')} 
                                            className={`flex-1 rounded text-[11px] font-black transition-all cursor-pointer ${recipientGender === 'M' ? 'bg-blue-600 text-white shadow' : 'text-gray-400'}`}
                                        >
                                            👨 M
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => setRecipientGender('F')} 
                                            className={`flex-1 rounded text-[11px] font-black transition-all cursor-pointer ${recipientGender === 'F' ? 'bg-pink-600 text-white shadow' : 'text-gray-400'}`}
                                        >
                                            👩 F
                                        </button>
                                    </div>
                                </div>

                                <div className="sm:col-span-3">
                                    <label className="text-[9px] text-gray-400 font-bold uppercase block mb-1">Nombre Completo</label>
                                    <input 
                                        value={recipientName} 
                                        onChange={e => setRecipientName(e.target.value)} 
                                        className="w-full p-2 bg-gray-800 border border-gray-700 rounded-lg text-xs text-white font-bold outline-none focus:border-purple-400" 
                                        placeholder="Nombre..."
                                    />
                                </div>

                                {/* Apodo / Cómo dirigirme */}
                                <div className="sm:col-span-2">
                                    <label className="text-[9px] text-yellow-400 font-bold uppercase block mb-1 flex items-center gap-1">
                                        <span>🏷️ Apodo / Saludo</span>
                                    </label>
                                    <input 
                                        value={recipientNickname} 
                                        onChange={e => setRecipientNickname(e.target.value)} 
                                        className="w-full p-2 bg-gray-800 border border-yellow-500/50 rounded-lg text-xs text-yellow-300 font-bold outline-none focus:border-yellow-400" 
                                        placeholder="Ej. Beto, Arqui..."
                                        title="Cómo dirigirme a este contacto. La IA saludará y se dirigirá a esta persona con este apodo."
                                    />
                                </div>

                                <div className="sm:col-span-3">
                                    <label className="text-[9px] text-gray-400 font-bold uppercase block mb-1">Correo Institucional</label>
                                    <div className="flex gap-1 bg-gray-800 p-0.5 rounded-lg border border-gray-700 h-[34px] items-center">
                                        <input 
                                            value={recipientEmailUser} 
                                            onChange={e => setRecipientEmailUser(e.target.value)} 
                                            className="flex-grow bg-transparent px-1.5 text-xs font-bold text-white outline-none min-w-0" 
                                            placeholder="usuario"
                                        />
                                        <select 
                                            value={recipientEmailDomain} 
                                            onChange={e => setRecipientEmailDomain(e.target.value)} 
                                            className="bg-gray-900 px-1 py-1 rounded text-[11px] font-black text-purple-400 outline-none cursor-pointer"
                                        >
                                            {emailDomains.map(d => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                        <select 
                                            value={recipientEmailTld} 
                                            onChange={e => setRecipientEmailTld(e.target.value)} 
                                            className="bg-gray-900 px-1 py-1 rounded text-[11px] font-bold text-gray-400 outline-none cursor-pointer"
                                        >
                                            {emailTlds.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="sm:col-span-3">
                                    <label className="text-[9px] text-gray-400 font-bold uppercase block mb-1">Relación / Empresa</label>
                                    <input 
                                        value={recipientRelation} 
                                        onChange={e => setRecipientRelation(e.target.value)} 
                                        className="w-full p-2 bg-gray-800 border border-gray-700 rounded-lg text-xs text-white font-medium outline-none focus:border-purple-400" 
                                        placeholder="Javer, Cliente..."
                                    />
                                </div>

                                <div className="sm:col-span-9 flex justify-end">
                                    <button 
                                        type="button"
                                        onClick={() => handleSaveContactToSupabase()} 
                                        disabled={isSavingContact || !recipientName.trim()} 
                                        className="px-4 h-[34px] bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-black uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md disabled:opacity-50"
                                        title="Guardar o actualizar este contacto y su apodo en Supabase"
                                    >
                                        {isSavingContact ? <Spinner size="3" /> : <Save size={13} />}
                                        <span>💾 Guardar Cambios en Supabase</span>
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ========================================================================= */}
            {/* MODO 1: REDACTOR LIBRE CON IA (PANTALLA DIVIDIDA: ENTRADA / RESULTADOS) */}
            {/* ========================================================================= */}
            {activeMode === 'ai' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                    {/* PANEL IZQUIERDO: REDACCIÓN LIBRE Y PARÁMETROS */}
                    <div className="lg:col-span-6 space-y-4">
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
                                </div>
                            </div>

                            <div className="space-y-4">
                                {/* PRIORIDAD MICRÓFONO EN CELULAR (SOLO MÓVIL / APP) */}
                                {isMobile && (
                                    <div className="space-y-2.5">
                                        {!isListening ? (
                                            <button
                                                type="button"
                                                onClick={toggleListening}
                                                className="w-full py-3.5 px-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-2xl shadow-xl shadow-purple-600/30 flex items-center justify-between transition-all active:scale-[0.98] border border-purple-400/40 cursor-pointer"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center shadow-inner shrink-0">
                                                        <Mic size={22} className="text-white animate-pulse" />
                                                    </div>
                                                    <div className="text-left">
                                                        <div className="text-xs font-black tracking-wide flex items-center gap-1.5">
                                                            <span>DICTAR POR VOZ</span>
                                                            <span className="text-[9px] font-bold bg-amber-400 text-black px-1.5 py-0.5 rounded-full uppercase">Prioridad Celular</span>
                                                        </div>
                                                        <div className="text-[11px] text-purple-200/90 font-normal">
                                                            {idea ? 'Toca para continuar dictando...' : 'Toca y habla; la IA redactará tu correo'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="px-3 py-1.5 bg-white/10 rounded-xl text-xs font-mono font-bold text-white border border-white/20 shrink-0">
                                                    Hablar 🎙️
                                                </div>
                                            </button>
                                        ) : (
                                            <div className="w-full p-4 bg-gradient-to-r from-red-950/90 via-rose-900/80 to-purple-950/90 border-2 border-red-500 rounded-2xl shadow-xl shadow-red-500/30 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                                                        <span className="text-xs font-black text-white uppercase tracking-wider">Escuchando tu voz...</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={toggleListening}
                                                        className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
                                                    >
                                                        <MicOff size={14} />
                                                        <span>Detener</span>
                                                    </button>
                                                </div>
                                                {/* Animated sound wave bars */}
                                                <div className="flex items-center justify-center gap-1.5 h-8 py-1">
                                                    {[40, 75, 100, 60, 95, 45, 85, 55, 90, 70, 80, 50].map((h, i) => (
                                                        <div
                                                            key={i}
                                                            className="w-1.5 bg-gradient-to-t from-red-500 via-rose-400 to-purple-300 rounded-full animate-pulse"
                                                            style={{ height: `${h}%`, animationDelay: `${i * 60}ms` }}
                                                        />
                                                    ))}
                                                </div>
                                                <p className="text-[11px] text-center text-red-200/90 italic truncate">
                                                    {idea ? `"${idea.slice(-80)}"` : 'Habla claro hacia el micrófono del celular...'}
                                                </p>
                                            </div>
                                        )}

                                        {idea && (
                                            <div className="flex items-center gap-2 pt-1">
                                                <button
                                                    type="button"
                                                    onClick={toggleListening}
                                                    className="flex-1 py-1.5 px-3 bg-purple-900/40 hover:bg-purple-900/60 border border-purple-500/30 rounded-xl text-[11px] font-bold text-purple-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                                >
                                                    <Mic size={13} />
                                                    <span>{isListening ? 'Pausar dictado' : 'Añadir más dictado'}</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => { setIdea(''); toast.info('Texto borrado para nuevo dictado'); }}
                                                    className="py-1.5 px-3 bg-zinc-800/80 hover:bg-zinc-700/80 border border-white/10 rounded-xl text-[11px] font-bold text-zinc-400 hover:text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                                >
                                                    <RotateCcw size={12} />
                                                    <span>Limpiar</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Contenedor de Textarea con Texto Fantasma */}
                                <div className="relative group rounded-xl border border-gray-700 bg-gray-800/90 focus-within:border-purple-500 transition-all overflow-hidden min-h-[140px]">
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
                                        className="w-full p-4 pr-14 bg-transparent text-sm text-white font-medium font-sans min-h-[140px] resize-none outline-none leading-relaxed relative z-10 placeholder-gray-500" 
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

                                {/* Contexto anterior colapsable + Botones de Respuesta en 1 Clic */}
                                <div className="border border-gray-700/60 rounded-xl overflow-hidden bg-gray-900/40">
                                    <button 
                                        type="button"
                                        onClick={() => setShowPreviousContext(!showPreviousContext)} 
                                        className="w-full p-2.5 bg-gray-800/60 text-xs text-left text-gray-300 hover:bg-gray-800 transition-colors flex justify-between items-center font-bold cursor-pointer"
                                    >
                                        <span className="flex items-center gap-1.5">
                                            <span>💬 Contexto anterior / Correo recibido + Respuesta en 1 Clic</span>
                                            {previousEmail.trim() && (
                                                <span className="px-1.5 py-0.5 bg-purple-600/30 text-purple-300 rounded text-[9px] font-black uppercase">Activo</span>
                                            )}
                                        </span>
                                        <span>{showPreviousContext ? '▲' : '▼'}</span>
                                    </button>
                                    {showPreviousContext && (
                                        <div className="p-3 bg-gray-900 border-t border-gray-700/60 space-y-2.5">
                                            <textarea 
                                                value={previousEmail} 
                                                onChange={e => setPreviousEmail(e.target.value)} 
                                                className="w-full p-2.5 bg-gray-950/80 border border-gray-800 rounded-lg text-xs text-gray-300 outline-none min-h-[68px] italic resize-none focus:border-purple-500/60" 
                                                placeholder="Pega aquí el correo o mensaje de WhatsApp recibido para responder con 1 clic..."
                                            />
                                            <div className="space-y-1.5">
                                                <span className="text-[10px] font-black uppercase tracking-wider text-purple-300 block">
                                                    ⚡ Responder en 1 Clic con IA:
                                                </span>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {QUICK_REPLY_INTENTS.map(intent => (
                                                        <button
                                                            key={intent.id}
                                                            type="button"
                                                            disabled={isLoading}
                                                            onClick={() => handleQuickReplyIntent(intent.prompt, intent.label)}
                                                            className="px-2.5 py-1.5 bg-purple-600/15 hover:bg-purple-600 text-purple-200 hover:text-white border border-purple-500/30 rounded-lg text-[11px] font-bold transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
                                                            title={intent.prompt}
                                                        >
                                                            {intent.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Barra de Archivos Adjuntos Reales (.DWG / .PDF / .STL / .XLSX) + Links en Nube + Chips de Fecha Compromiso */}
                                <div className="p-3 bg-gray-950/60 rounded-xl border border-gray-800 space-y-2.5">
                                    {/* Selector y gestor de archivos adjuntos reales */}
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <button
                                                type="button"
                                                onClick={() => fileListInputRef.current?.click()}
                                                className="px-2.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 hover:text-white rounded-lg text-[11px] font-bold border border-indigo-500/30 transition-all cursor-pointer flex items-center gap-1.5"
                                                title="Selecciona o arrastra tus archivos (.pdf, .dwg, .stl, .xlsx, imágenes) para adjuntarlos al correo y listar sus nombres"
                                            >
                                                <Paperclip size={12} />
                                                <span>📎 Adjuntar Archivos (.PDF / .DWG / .STL)</span>
                                            </button>
                                            {(realAttachments.length > 0 || attachedImages.length > 0) && (
                                                <button
                                                    type="button"
                                                    disabled={isUploadingAttachments}
                                                    onClick={handleUploadAttachmentsToCloud}
                                                    className="px-2.5 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 hover:text-white rounded-lg text-[11px] font-bold border border-cyan-500/30 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                                                    title="Subir archivos adjuntos a Supabase y pegar automáticamente los enlaces de descarga directa en el correo y WhatsApp"
                                                >
                                                    <UploadCloud size={12} />
                                                    <span>{isUploadingAttachments ? 'Subiendo...' : '☁️ Subir y Pegar Links en Nube'}</span>
                                                </button>
                                            )}
                                            <span className="text-[10px] text-gray-500 hidden sm:inline">
                                                {realAttachments.length > 0
                                                    ? `${realAttachments.length} archivo(s) listos para adjuntar`
                                                    : 'Se adjuntan en .EML, Nube o Envío Directo'}
                                            </span>
                                        </div>
                                        {attachedFileNames.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={clearAllAttachedFiles}
                                                className="text-[10px] text-red-400 hover:text-red-300 font-bold cursor-pointer"
                                            >
                                                Quitar todos
                                            </button>
                                        )}
                                    </div>

                                    {attachedFileNames.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                                            {attachedFileNames.map((fn, idx) => (
                                                <span
                                                    key={idx}
                                                    className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-indigo-950/70 border border-indigo-500/30 rounded-md text-[10.5px] font-mono text-indigo-200"
                                                >
                                                    <Paperclip size={10} className="text-indigo-400 shrink-0" />
                                                    <span className="truncate max-w-[180px]">{fn}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeAttachedFileByName(fn)}
                                                        className="text-gray-400 hover:text-red-300 font-bold cursor-pointer"
                                                    >
                                                        ✕
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Chips Inteligentes de Fecha Compromiso */}
                                    <div className="pt-2 border-t border-gray-800/80 space-y-1.5">
                                        <div className="flex items-center justify-between gap-2 flex-wrap">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                                                <Clock size={11} />
                                                <span>🗓️ Fecha Compromiso (1 Clic):</span>
                                            </span>
                                            {deadline && (
                                                <button
                                                    type="button"
                                                    onClick={() => setDeadline('')}
                                                    className="text-[9.5px] text-red-400 hover:text-red-300 font-bold cursor-pointer"
                                                >
                                                    Quitar fecha ({deadline})
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {smartDeadlines.map(sd => {
                                                const isSelected = deadline === sd.value;
                                                return (
                                                    <button
                                                        key={sd.label}
                                                        type="button"
                                                        onClick={() => setDeadline(isSelected ? '' : sd.value)}
                                                        className={`px-2 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer border ${
                                                            isSelected
                                                                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                                                                : 'bg-gray-900 text-gray-300 hover:text-white border-gray-700/80 hover:bg-gray-800'
                                                        }`}
                                                        title={`Insertar fecha compromiso: ${sd.value}`}
                                                    >
                                                        {sd.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
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
                            </div>
                        </div>
                    </div>

                    {/* PANEL DERECHO: RESULTADOS EN VIVO (CORREO, WHATSAPP, OUTLOOK WEB O PLACEHOLDER) */}
                    <div className="lg:col-span-6 space-y-4 lg:sticky lg:top-4">
                        {/* Estado: Cargando IA */}
                        {isLoading && (
                            <div className="py-16 flex flex-col items-center justify-center bg-gray-900/80 rounded-2xl border border-purple-500/30 shadow-2xl p-6">
                                <RefreshCw size={40} className="animate-spin text-purple-400 mb-4" />
                                <h4 className="text-sm font-black text-white uppercase tracking-widest">El Estratega está redactando...</h4>
                                <p className="text-xs text-purple-300/80 mt-1.5 text-center">Estructurando asunto, saludo ejecutivo, doble salto y firma institucional</p>
                            </div>
                        )}

                        {/* Estado: Resultados Generados */}
                        {generatedContent && !isLoading && (
                            <div className="space-y-4">
                                {/* TARJETA DE CORREO */}
                                <div className="bg-gray-900/90 rounded-2xl border border-gray-800 overflow-hidden shadow-2xl">
                                    <div className="bg-gray-800/80 px-4 py-2.5 border-b border-gray-800 flex justify-between items-center flex-wrap gap-2">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 bg-purple-600/20 text-purple-400 rounded-lg border border-purple-500/30">
                                                <Mail size={14} />
                                            </div>
                                            <span className="text-xs font-black uppercase text-purple-300">Correo Electrónico</span>
                                            {(realAttachments.length > 0 || attachedImages.length > 0) && (
                                                <span className="text-[10px] font-bold bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">
                                                    📎 {realAttachments.length + attachedImages.length} adjunto(s)
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <button 
                                                onClick={() => handleCopyToClipboard(generatedContent.emailBody, 'email')} 
                                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                                                    copied === 'email' ? 'bg-green-600 text-white border-green-500' : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700'
                                                }`}
                                            >
                                                <Copy size={12} />
                                                <span>{copied === 'email' ? 'Copiado!' : 'Copiar'}</span>
                                            </button>
                                            <button 
                                                onClick={() => handleOpenOutlookWeb(generatedContent.emailSubject, generatedContent.emailBody)} 
                                                className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-black uppercase flex items-center gap-1 shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer border border-blue-400/30"
                                                title="Abrir Outlook Web Javer 365 con este correo y destinatario"
                                            >
                                                <ExternalLink size={12} />
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
                                                className="w-full h-48 bg-gray-800/40 border border-gray-700/80 rounded-xl p-3.5 text-xs text-gray-200 font-sans resize-none outline-none focus:border-purple-500 leading-relaxed shadow-inner" 
                                            />
                                        </div>

                                        {/* BARRA COMBO COMPLETO: ENVÍO CON ADJUNTOS (.EML OUTLOOK / NUBE / ENVÍO DIRECTO API) */}
                                        <div className="pt-2 border-t border-gray-800/80 flex flex-wrap items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handleDownloadEmlDraft(generatedContent.emailSubject, generatedContent.emailBody)}
                                                className="flex-1 min-w-[160px] py-2 px-3 bg-indigo-600/25 hover:bg-indigo-600 text-indigo-200 hover:text-white rounded-xl text-xs font-black uppercase tracking-wider border border-indigo-500/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                                                title="Descarga y abre un borrador .EML en tu Outlook de escritorio con todos los archivos adjuntos ya cargados adentro listos para dar Enviar"
                                            >
                                                <Download size={13} />
                                                <span>📎 Abrir en Outlook con Adjuntos (.EML)</span>
                                            </button>

                                            <button
                                                type="button"
                                                disabled={isSendingDirectEmail}
                                                onClick={() => handleSendDirectApi(generatedContent.emailSubject, generatedContent.emailBody)}
                                                className="flex-1 min-w-[160px] py-2 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black uppercase tracking-wider border border-emerald-400/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
                                                title="Enviar correo con todos los archivos adjuntos directamente desde Rembrandt7 sin abrir otra ventana"
                                            >
                                                <Send size={13} />
                                                <span>{isSendingDirectEmail ? 'Enviando...' : '🚀 Enviar Directo desde Aquí'}</span>
                                            </button>
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

                        {/* Estado: Esperando Idea (Placeholder Elegante sin espacios vacíos) */}
                        {!generatedContent && !isLoading && (
                            <div className="bg-gray-900/60 rounded-2xl border-2 border-dashed border-gray-800 p-8 flex flex-col items-center justify-center text-center space-y-4 min-h-[360px] shadow-inner">
                                <div className="p-4 bg-gradient-to-br from-purple-600/20 to-indigo-600/20 text-purple-300 rounded-2xl border border-purple-500/30 shadow-lg">
                                    <Mail size={32} />
                                </div>
                                <div className="max-w-xs space-y-1.5">
                                    <h4 className="text-sm font-black text-white uppercase tracking-wider">
                                        Vista Previa de Correo y WhatsApp
                                    </h4>
                                    <p className="text-xs text-gray-400 leading-relaxed">
                                        Escribe o dicta tu idea a la izquierda y pulsa <strong className="text-purple-300">"Generar Mensajes con IA"</strong>. Aquí verás tu correo formateado con saludo formal y firma ejecutiva listo para enviar.
                                    </p>
                                </div>
                                <div className="pt-2">
                                    <button
                                        type="button"
                                        onClick={() => handleOpenOutlookWeb()}
                                        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-xl text-xs font-bold border border-gray-700 flex items-center gap-2 transition-all cursor-pointer shadow-sm hover:scale-105"
                                    >
                                        <ExternalLink size={13} className="text-blue-400" />
                                        <span>Abrir borrador en Outlook Web ahora</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* MODO 2: ENTREGAS Y FORMATOS (0s) (PANTALLA DIVIDIDA: CONFIG / PREVIEW) */}
            {/* ========================================================================= */}
            {activeMode === 'quick' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                    {/* PANEL IZQUIERDO: CONFIGURACIÓN MODULAR (PLANTILLAS + CUADRÍCULA 2x2) */}
                    <div className="lg:col-span-6 xl:col-span-7 space-y-4">
                        <div id="section-entregas-formatos" className="bg-gray-900/60 rounded-2xl border border-amber-500/30 p-4 sm:p-5 shadow-xl space-y-4">
                            <div className="flex items-center justify-between pb-3 border-b border-gray-800/80 flex-wrap gap-2">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 bg-gradient-to-r from-amber-600 to-indigo-600 rounded-xl text-white shadow-md">
                                        <Zap size={16} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                                            <span>2. Entregas y Formatos (0s de espera)</span>
                                            <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">Instantáneo</span>
                                        </h3>
                                        <p className="text-[11px] text-gray-400">
                                            {templateCategory === '3d' 
                                                ? 'Cotizaciones 3D, anticipos, piezas listas y envíos STL/G-Code al instante' 
                                                : 'Planos, renders y documentos con plantilla estándar automática y enlaces'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    {/* Switch de Categoría: Arquitectura/Javer vs Impresión 3D */}
                                    <div className="flex bg-gray-950 rounded-xl p-0.5 border border-gray-800 text-[11px]">
                                        <button
                                            type="button"
                                            onClick={() => handleSwitchCategory('javer')}
                                            className={`px-2.5 py-1 rounded-lg font-black transition-all cursor-pointer flex items-center gap-1 ${
                                                templateCategory === 'javer' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-gray-400 hover:text-white'
                                            }`}
                                            title="Plantillas para Arquitectura, Urbanismo y Proyectos Javer"
                                        >
                                            <span>🏗️ Arquitectura / Javer</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleSwitchCategory('3d')}
                                            className={`px-2.5 py-1 rounded-lg font-black transition-all cursor-pointer flex items-center gap-1 ${
                                                templateCategory === '3d' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'
                                            }`}
                                            title="Plantillas para Cotización, Anticipo 50% y Entrega de Impresión 3D"
                                        >
                                            <span>🖨️ Impresión 3D</span>
                                        </button>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleSaveCustomPreset}
                                        className="text-[11px] font-bold text-amber-300 hover:text-white bg-amber-500/10 hover:bg-amber-500/25 border border-amber-500/30 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                                        title="Guardar los entregables y método actuales como tu plantilla personalizada (Sincronizada en Supabase)"
                                    >
                                        <Star size={12} fill="currentColor" />
                                        <span>⭐ Guardar favorita</span>
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {/* Plantillas Rápidas y Favoritas */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-purple-300 block">
                                            Plantillas Rápidas ({templateCategory === '3d' ? '🖨️ Impresión 3D' : '🏗️ Javer / Arq.'} - 1 Clic):
                                        </span>
                                        {customPresets.length > 0 && (
                                            <span className="text-[9.5px] text-amber-300/80 font-bold">☁️ Favoritas sincronizadas en nube</span>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {/* Plantillas personalizadas del usuario */}
                                        {customPresets.map(cp => {
                                            const isSelected = activePresetId === cp.id;
                                            return (
                                                <div key={cp.id} className="inline-flex items-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSelectQuickPreset(cp)}
                                                        className={`px-3 py-1.5 rounded-l-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                                                            isSelected 
                                                                ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-400/50' 
                                                                : 'bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/30'
                                                        }`}
                                                    >
                                                        <Star size={12} fill="currentColor" />
                                                        <span>{cp.name}</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleDeleteCustomPreset(e, cp.id)}
                                                        title="Eliminar plantilla favorita"
                                                        className="px-2 py-1.5 bg-amber-950/60 hover:bg-red-900/60 text-amber-300 hover:text-red-200 border-y border-r border-amber-500/30 rounded-r-xl text-xs transition-colors cursor-pointer"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            );
                                        })}

                                        {/* Plantillas predefinidas según categoría */}
                                        {(templateCategory === '3d' ? QUICK_PRESETS_3D : QUICK_PRESETS).map(qp => {
                                            const isSelected = activePresetId === qp.id;
                                            return (
                                                <button
                                                    key={qp.id}
                                                    type="button"
                                                    onClick={() => handleSelectQuickPreset(qp)}
                                                    className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                                                        isSelected 
                                                            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md ring-2 ring-purple-400/50' 
                                                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white border border-gray-700'
                                                    }`}
                                                >
                                                    <Bookmark size={12} className={isSelected ? 'text-purple-200' : 'text-gray-400'} />
                                                    <span>{qp.name}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Cuadrícula 2x2: 1. Entregables, 2. Métodos, 3. Proyecto, 4. Opciones */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                    {/* Bloque 1: Entregables */}
                                    <div className="bg-gray-950/60 p-3 rounded-xl border border-gray-800 flex flex-col space-y-2">
                                        <div className="flex items-center justify-between pb-1.5 border-b border-gray-800/60">
                                            <span className="text-[11px] font-black uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                                                <CheckCircle2 size={13} className="text-purple-400" />
                                                <span>1. Entregables</span>
                                            </span>
                                            <span className="text-[9px] text-gray-500 font-bold">Múltiple</span>
                                        </div>
                                        <div className="grid grid-cols-1 gap-1 flex-grow">
                                            {(templateCategory === '3d' ? DELIVERABLE_OPTIONS_3D : DELIVERABLE_OPTIONS).map(opt => {
                                                const checked = selectedDeliverables.includes(opt);
                                                return (
                                                    <button
                                                        key={opt}
                                                        type="button"
                                                        onClick={() => toggleDeliverable(opt)}
                                                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                                                            checked 
                                                                ? 'bg-purple-600/30 text-purple-200 border border-purple-500/50 shadow-sm' 
                                                                : 'bg-gray-900/60 text-gray-400 hover:text-gray-200 hover:bg-gray-900 border border-transparent'
                                                        }`}
                                                    >
                                                        <span className="truncate">{opt}</span>
                                                        <span className={`text-[11px] font-bold ${checked ? 'text-purple-400' : 'text-gray-600'}`}>
                                                            {checked ? '✓' : '+'}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Bloque 2: Métodos de Entrega */}
                                    <div className="bg-gray-950/60 p-3 rounded-xl border border-gray-800 flex flex-col space-y-2">
                                        <div className="flex items-center justify-between pb-1.5 border-b border-gray-800/60">
                                            <span className="text-[11px] font-black uppercase tracking-wider text-blue-300 flex items-center gap-1.5">
                                                <Send size={13} className="text-blue-400" />
                                                <span>2. Método</span>
                                            </span>
                                            <span className="text-[9px] text-gray-500 font-bold">1 opción</span>
                                        </div>
                                        <div className="grid grid-cols-1 gap-1.5 flex-grow">
                                            {(templateCategory === '3d' ? METHOD_OPTIONS_3D : METHOD_OPTIONS).map(m => {
                                                const selected = selectedMethod === m;
                                                return (
                                                    <button
                                                        key={m}
                                                        type="button"
                                                        onClick={() => handleSelectMethod(m)}
                                                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                                                            selected 
                                                                ? 'bg-blue-600/30 text-blue-200 border border-blue-500/50 shadow-sm' 
                                                                : 'bg-gray-900/60 text-gray-400 hover:text-gray-200 hover:bg-gray-900 border border-transparent'
                                                        }`}
                                                    >
                                                        <span>{m}</span>
                                                        <span className={`w-2.5 h-2.5 rounded-full border ${selected ? 'bg-blue-500 border-blue-400' : 'border-gray-600'}`} />
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Bloque 3: Proyecto */}
                                    <div className="bg-gray-950/60 p-3 rounded-xl border border-gray-800 flex flex-col space-y-2">
                                        <div className="flex items-center justify-between pb-1.5 border-b border-gray-800/60">
                                            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                                                <Building2 size={13} />
                                                <span>3. Proyecto / Pieza</span>
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
                                                    placeholder={templateCategory === '3d' ? 'Ej. Llavero Logo / Maqueta...' : 'Ej. Bosques...'}
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

                                    {/* Bloque 4: Opciones Adicionales de Entrega (Archivos, Enlace y Fecha Compromiso) */}
                                    <div className="bg-gray-950/60 p-3 rounded-xl border border-gray-800 flex flex-col space-y-2">
                                        <div className="flex items-center justify-between pb-1.5 border-b border-gray-800/60">
                                            <span className="text-[11px] font-black uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                                                <span className="w-4 h-4 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-[9px] font-bold">4</span>
                                                <span>Opciones y Archivos</span>
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
                                            {/* Selector de archivos adjuntos reales + Subir a Nube */}
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => fileListInputRef.current?.click()}
                                                        className="flex-1 py-1.5 px-2 bg-indigo-600/20 hover:bg-indigo-600/35 text-indigo-300 hover:text-white rounded-lg text-[10.5px] font-bold border border-indigo-500/30 transition-all cursor-pointer flex items-center justify-center gap-1"
                                                        title="Selecciona tus archivos (.dwg, .pdf, .stl, .xlsx) para adjuntarlos al correo y listar sus nombres"
                                                    >
                                                        <Paperclip size={11} />
                                                        <span>📎 Adjuntar ({attachedFileNames.length})</span>
                                                    </button>
                                                    {(realAttachments.length > 0 || attachedImages.length > 0) && (
                                                        <button
                                                            type="button"
                                                            disabled={isUploadingAttachments}
                                                            onClick={handleUploadAttachmentsToCloud}
                                                            className="py-1.5 px-2 bg-cyan-600/20 hover:bg-cyan-600/35 text-cyan-300 hover:text-white rounded-lg text-[10px] font-bold border border-cyan-500/30 transition-all cursor-pointer flex items-center gap-1 shrink-0 disabled:opacity-50"
                                                            title="Subir archivos adjuntos a Supabase e insertar link de descarga"
                                                        >
                                                            <UploadCloud size={11} />
                                                            <span>{isUploadingAttachments ? '...' : '☁️ Link'}</span>
                                                        </button>
                                                    )}
                                                </div>
                                                {attachedFileNames.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 max-h-14 overflow-y-auto pt-0.5">
                                                        {attachedFileNames.map((fn, idx) => (
                                                            <span key={idx} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-indigo-950/80 border border-indigo-500/30 rounded text-[9.5px] font-mono text-indigo-200">
                                                                <span className="truncate max-w-[125px]">{fn}</span>
                                                                <button type="button" onClick={() => removeAttachedFileByName(fn)} className="text-gray-400 hover:text-red-300 font-bold cursor-pointer">✕</button>
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

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
                                                        <span>Fecha compromiso (1 Clic):</span>
                                                    </label>
                                                    {deadline && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setDeadline('')}
                                                            className="text-[9px] text-red-400 hover:text-red-300 font-bold cursor-pointer"
                                                        >
                                                            Limpiar
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap gap-1 pb-0.5">
                                                    {smartDeadlines.map(sd => (
                                                        <button
                                                            key={sd.label}
                                                            type="button"
                                                            onClick={() => setDeadline(deadline === sd.value ? '' : sd.value)}
                                                            className={`text-[9px] px-1.5 py-0.5 rounded font-bold cursor-pointer transition-colors ${
                                                                deadline === sd.value
                                                                    ? 'bg-amber-500 text-slate-950'
                                                                    : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                                                            }`}
                                                            title={sd.value}
                                                        >
                                                            {sd.label}
                                                        </button>
                                                    ))}
                                                </div>
                                                <input
                                                    type="text"
                                                    value={deadline}
                                                    onChange={e => setDeadline(e.target.value)}
                                                    placeholder="Ej. este viernes antes de las 2 PM..."
                                                    className="w-full p-2 bg-gray-900 border border-gray-700 rounded-lg text-xs font-medium text-white outline-none focus:border-purple-500 placeholder-gray-500"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* PANEL DERECHO: VISTA PREVIA INMEDIATA (0s DE ESPERA) */}
                    <div className="lg:col-span-6 xl:col-span-5 space-y-4 lg:sticky lg:top-4">
                        <div className="bg-gray-950 rounded-2xl border border-gray-800 overflow-hidden shadow-2xl">
                            <div className="bg-gray-900/90 px-4 py-2.5 border-b border-gray-800 flex items-center justify-between text-xs text-gray-400">
                                <div className="flex items-center gap-2">
                                    <Mail size={14} className="text-purple-400" />
                                    <span className="font-bold text-gray-200">Vista Previa Inmediata (0s)</span>
                                    {(realAttachments.length > 0 || attachedImages.length > 0) && (
                                        <span className="text-[10px] font-bold bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">
                                            📎 {realAttachments.length + attachedImages.length}
                                        </span>
                                    )}
                                </div>
                                <span className="text-[11px] font-medium text-gray-400 truncate max-w-[180px]">
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
                                <div className="p-4 bg-gray-900/50 rounded-xl border border-gray-800 text-xs text-gray-200 whitespace-pre-line leading-relaxed max-h-56 overflow-y-auto font-sans shadow-inner">
                                    {livePreview.emailBody}
                                </div>
                            </div>

                            {/* Barra de acciones de entrega inmediata + Combo Completo de Adjuntos */}
                            <div className="bg-gray-900/70 px-4 py-3 border-t border-gray-800 space-y-2.5">
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                                    <button
                                        type="button"
                                        onClick={handleTransferToAi}
                                        className="w-full sm:w-auto px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 hover:text-white rounded-xl text-xs font-bold border border-purple-500/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                        title="Pasar este texto al redactor libre de IA para expandirlo o pedirle cambios"
                                    >
                                        <Sparkles size={13} />
                                        <span>🪄 Afinar con IA</span>
                                    </button>

                                    <div className="flex items-center gap-1.5 w-full sm:w-auto flex-wrap sm:flex-nowrap">
                                        <button
                                            type="button"
                                            onClick={() => handleCopyToClipboard(livePreview.emailBody, 'preset-email')}
                                            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1 cursor-pointer ${
                                                copied === 'preset-email' ? 'bg-green-600 text-white border-green-500' : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700'
                                            }`}
                                        >
                                            <Copy size={12} />
                                            <span>{copied === 'preset-email' ? 'Copiado!' : 'Copiar'}</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleSendWhatsApp(livePreview.whatsappMessage)}
                                            className="px-2.5 py-1.5 bg-green-600/20 hover:bg-green-600 text-green-300 hover:text-white rounded-xl text-xs font-bold border border-green-500/40 transition-all flex items-center justify-center gap-1 cursor-pointer"
                                        >
                                            <MessageSquare size={12} />
                                            <span>WhatsApp</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleOpenOutlookWeb(livePreview.emailSubject, livePreview.emailBody)}
                                            className="flex-1 sm:flex-initial px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-1 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer border border-blue-400/30"
                                        >
                                            <ExternalLink size={12} />
                                            <span>Outlook Web</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Botones Combo Completo: .EML con Adjuntos para Outlook + Envío Directo API */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-gray-800/80">
                                    <button
                                        type="button"
                                        onClick={() => handleDownloadEmlDraft(livePreview.emailSubject, livePreview.emailBody)}
                                        className="py-2 px-3 bg-indigo-600/25 hover:bg-indigo-600 text-indigo-200 hover:text-white rounded-xl text-[11px] font-black uppercase tracking-wider border border-indigo-500/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                                        title="Descargar y abrir borrador .EML en Outlook con los archivos adjuntos ya cargados adentro"
                                    >
                                        <Download size={13} />
                                        <span>📎 Outlook + Adjuntos (.EML)</span>
                                    </button>
                                    <button
                                        type="button"
                                        disabled={isSendingDirectEmail}
                                        onClick={() => handleSendDirectApi(livePreview.emailSubject, livePreview.emailBody)}
                                        className="py-2 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-[11px] font-black uppercase tracking-wider border border-emerald-400/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
                                        title="Enviar correo con adjuntos directamente desde Rembrandt7 sin abrir otra ventana"
                                    >
                                        <Send size={13} />
                                        <span>{isSendingDirectEmail ? 'Enviando...' : '🚀 Enviar Directo Aquí'}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
                </>
            )}
            
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
