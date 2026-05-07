
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import Spinner from './common/Spinner';
import IconButton from './common/IconButton';
import { ReferenceImage } from './common/ReferenceImageManager';
import MarkdownRenderer from './common/MarkdownRenderer';
import SmartTextarea from './common/SmartTextarea';
import { SUPABASE_CONFIG } from '../utils/constants';
import { useLinks } from '../contexts/LinkContext';
import { cleanJsonResponse } from '../utils/jsonUtils';
import { History, Trash2, Mail, MessageSquare, Star, Sparkles, Send, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type Tone = 'Profesional' | 'Casual';
type MessageLength = 'Reducido' | 'Medio' | 'Detallado';
type Gender = 'H' | 'M';
type CopiedState = 'email' | 'whatsapp' | null;

interface GeneratedContent {
  emailSubject: string;
  emailBody: string;
  whatsappMessage: string;
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
// Fallback if DB is empty
const predefinedProjects = ['Valle de Los Encinos', 'Cumbre del Norte', 'Xandora'];

// Helper to safely get properties with case-insensitivity and partial matching
const getDBValue = (obj: any, keysToCheck: string[] | string): any => {
    if (!obj) return undefined;
    const keys = Array.isArray(keysToCheck) ? keysToCheck : [keysToCheck];
    
    for (const keyName of keys) {
        const target = keyName.trim().toLowerCase();
        // Exact match first (case insensitive)
        const foundKey = Object.keys(obj).find(k => k.trim().toLowerCase() === target);
        if (foundKey && obj[foundKey] !== undefined && obj[foundKey] !== null) {
            return obj[foundKey];
        }
    }
    return undefined;
};

const stripHtml = (html: string): string => {
    try {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        doc.querySelectorAll('li').forEach(li => {
            li.innerHTML = `\n• ${li.innerHTML}`;
        });
        doc.querySelectorAll('br, p, div').forEach(el => {
            const newline = doc.createTextNode('\n');
            el.parentNode?.replaceChild(newline, el);
        });
        let text = doc.body.textContent || "";
        return text.replace(/\n\s*\n/g, '\n').trim();
    } catch (e) {
        console.error("Could not parse HTML", e);
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

    const history = config.aiHistory?.filter(h => h.type === 'email') || [];
    
    // Data state
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [fraccionamientosList, setFraccionamientosList] = useState<string[]>([]);
    
    const [favorites, setFavorites] = useState<string[]>(() => {
        try {
            return JSON.parse(localStorage.getItem('contact-favorites') || '[]');
        } catch {
            return [];
        }
    });

    const toggleFavorite = (contactName: string) => {
        setFavorites(prev => {
            const newFavs = prev.includes(contactName) 
                ? prev.filter(f => f !== contactName)
                : [...prev, contactName];
            localStorage.setItem('contact-favorites', JSON.stringify(newFavs));
            return newFavs;
        });
    };

    // We use index for selection to ensure we grab the exact object in memory
    const [selectedContactIndex, setSelectedContactIndex] = useState<string>('');
    const [isContactsLoading, setIsContactsLoading] = useState(false);
    const [isSavingContact, setIsSavingContact] = useState(false);

    // Recipient state
    const [recipientTitle, setRecipientTitle] = useState('');
    const [titlesList, setTitlesList] = useState<string[]>(DEFAULT_TITLES); // Dynamic titles
    const [recipientName, setRecipientName] = useState('');
    const [recipientGender, setRecipientGender] = useState<Gender>('H');
    
    // Email construction state
    const [recipientEmailUser, setRecipientEmailUser] = useState('');
    const [recipientEmailDomain, setRecipientEmailDomain] = useState(emailDomains[0]);
    const [customDomain, setCustomDomain] = useState('');
    const [recipientEmailTld, setRecipientEmailTld] = useState(emailTlds[0]);

    const [isLoading, setIsLoading] = useState(false);
    const [isImproving, setIsImproving] = useState<boolean>(false);
    const [selectedImproveStyles, setSelectedImproveStyles] = useState<string[]>(['email', 'whatsapp', 'direct']);
    const [error, setError] = useState<string | null>(null);
    const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
    const [copied, setCopied] = useState<CopiedState>(null);
    const [isDraggingOver, setIsDraggingOver] = useState(false);

    // --- Fetch Contacts & Fraccionamientos from Supabase ---
    const fetchContacts = useCallback(async () => {
        setIsContactsLoading(true);
        try {
            if (!SUPABASE_CONFIG.URL || !SUPABASE_CONFIG.KEY || SUPABASE_CONFIG.KEY.includes('PLACEHOLDER')) {
                console.warn("Supabase credentials not configured. Using empty contacts list.");
                setContacts([]);
                return;
            }

            const response = await fetch(`${SUPABASE_CONFIG.URL}/rest/v1/Contactos?select=*`, {
                headers: {
                    'apikey': SUPABASE_CONFIG.KEY,
                    'Authorization': `Bearer ${SUPABASE_CONFIG.KEY}`,
                    'Content-Type': 'application/json'
                }
            });
            if (response.ok) {
                const data = await response.json();
                // Sort by name
                data.sort((a: Contact, b: Contact) => {
                    const nameA = getDBValue(a, ['cliente', 'nombre', 'name']) || '';
                    const nameB = getDBValue(b, ['cliente', 'nombre', 'name']) || '';
                    return String(nameA).localeCompare(String(nameB));
                });
                setContacts(data);
            } else {
                console.warn(`Failed to fetch contacts: ${response.status} ${response.statusText}`);
                setContacts([]);
            }
        } catch (err) {
            console.warn("Error fetching contacts (network or config issue):", err);
            setContacts([]);
        } finally {
            setIsContactsLoading(false);
        }
    }, []);

    const fetchFraccionamientos = useCallback(async () => {
        try {
            if (!SUPABASE_CONFIG.URL || !SUPABASE_CONFIG.KEY || SUPABASE_CONFIG.KEY.includes('PLACEHOLDER')) {
                console.warn("Supabase credentials not configured. Using predefined projects.");
                setFraccionamientosList(predefinedProjects);
                return;
            }

            // Select * to get sector and fraccionamiento
            const response = await fetch(`${SUPABASE_CONFIG.URL}/rest/v1/Fraccionamientos?select=*`, {
                headers: {
                    'apikey': SUPABASE_CONFIG.KEY,
                    'Authorization': `Bearer ${SUPABASE_CONFIG.KEY}`,
                    'Content-Type': 'application/json'
                }
            });
            if (response.ok) {
                const data = await response.json();
                // Format: "Fraccionamiento - Sector" (if sector exists)
                const uniqueProjects = Array.from(new Set(
                    data.map((item: any) => {
                        const name = getDBValue(item, ['fraccionamiento', 'nombre', 'proyecto']);
                        const sector = getDBValue(item, ['sector', 'etapa']);
                        if (!name) return null;
                        return sector ? `${name} - ${sector}` : name;
                    }).filter((f: any) => f && typeof f === 'string')
                )) as string[];
                uniqueProjects.sort();
                setFraccionamientosList(uniqueProjects);
            } else {
                console.warn(`Failed to fetch fraccionamientos: ${response.status} ${response.statusText}`);
                setFraccionamientosList(predefinedProjects);
            }
        } catch (err) {
            console.warn("Error fetching fraccionamientos (network or config issue):", err);
            setFraccionamientosList(predefinedProjects);
        }
    }, []);

    useEffect(() => {
        fetchContacts();
        fetchFraccionamientos();
    }, [fetchContacts, fetchFraccionamientos]);

    // --- Handle Contact Selection & Auto-Population ---
    const handleContactSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const idxVal = e.target.value;
        setSelectedContactIndex(idxVal);

        if (idxVal === '') {
            setRecipientName('');
            setRecipientTitle('');
            return;
        }

        const idx = parseInt(idxVal, 10);
        if (isNaN(idx) || idx < 0 || idx >= contacts.length) return;

        const contact = contacts[idx];
        
        if (contact) {
            console.log("Selected contact:", contact); // Debug

            // 1. Name - Added more potential column names
            const dbName = getDBValue(contact, ['cliente', 'nombre', 'full_name', 'name', 'nombres', 'client']) || '';
            console.log("Found Name:", dbName);
            setRecipientName(String(dbName));
            
            // 2. Title
            let dbTitle = getDBValue(contact, ['lic', 'titulo', 'title', 'prefix']) || '';
            const lowerTitle = String(dbTitle).trim().toLowerCase().replace('.', '');
            
            if (lowerTitle === 'arquitecto') dbTitle = 'Arq.';
            else if (lowerTitle === 'ingeniero') dbTitle = 'Ing.';
            else if (lowerTitle === 'licenciado') dbTitle = 'Lic.';
            
            if (dbTitle && String(dbTitle).trim() !== '') {
                setTitlesList(prev => {
                    const exists = prev.some(t => t.toLowerCase() === String(dbTitle).toLowerCase());
                    return exists ? prev : [...prev, dbTitle];
                });
                setRecipientTitle(dbTitle);
            } else {
                setRecipientTitle(''); 
            }

            // 3. Gender
            const dbGender = getDBValue(contact, ['genero', 'gender', 'sexo']) || '';
            const gen = String(dbGender).trim().toLowerCase();
            
            if (gen.startsWith('h') || gen.includes('masc') || gen === 'm') { 
                 if(gen === 'm' && !gen.includes('ujer')) {
                     // Ambiguous 'M' handling
                 }
                 if(gen.startsWith('h') || gen.includes('masc')) setRecipientGender('H');
            } 
            if (gen.startsWith('m') || gen.includes('fem') || gen.includes('ujer')) {
                setRecipientGender('M');
            } 

            // 4. Email
            const email = getDBValue(contact, ['correo', 'email', 'mail']) || '';
            if (email && String(email).includes('@')) {
                const parts = email.split('@');
                const userPart = parts[0]; 
                const domainPartFull = parts[1] || '';

                setRecipientEmailUser(userPart); 

                let matched = false;
                if (domainPartFull && domainPartFull.includes('javer')) {
                    setRecipientEmailDomain('@javer');
                    matched = true;
                } else if (domainPartFull && domainPartFull.includes('gmail')) {
                    setRecipientEmailDomain('@gmail');
                    matched = true;
                } else if (domainPartFull && domainPartFull.includes('outlook')) {
                    setRecipientEmailDomain('@outlook');
                    matched = true;
                } else if (domainPartFull && domainPartFull.includes('hotmail')) {
                    setRecipientEmailDomain('@hotmail');
                    matched = true;
                } 

                if (domainPartFull && domainPartFull.endsWith('.com.mx')) setRecipientEmailTld('.com.mx');
                else if (domainPartFull && domainPartFull.endsWith('.com')) setRecipientEmailTld('.com');
                else if (domainPartFull && domainPartFull.endsWith('.es')) setRecipientEmailTld('.es');
                else if (domainPartFull && domainPartFull.endsWith('.mx')) setRecipientEmailTld('.mx');

                if (!matched) {
                    setRecipientEmailDomain('Personalizado');
                    const lastDot = domainPartFull.lastIndexOf('.');
                    if(lastDot !== -1) {
                        setCustomDomain(domainPartFull.substring(0, lastDot));
                    } else {
                        setCustomDomain(domainPartFull);
                    }
                }
            } else if (email) {
                 setRecipientEmailUser(email);
            }
        }
    };

    const fullRecipientEmail = useMemo(() => {
        if (!recipientEmailUser) return '';
        const domainPart = recipientEmailDomain === 'Personalizado' ? `@${customDomain}` : recipientEmailDomain;
        return `${recipientEmailUser}${domainPart}${recipientEmailTld}`;
    }, [recipientEmailUser, recipientEmailDomain, customDomain, recipientEmailTld]);

    const handleGenerate = useCallback(async () => {
        if (!idea.trim() && !previousEmail.trim()) {
            setError('Por favor, introduce la idea principal del mensaje o pega un Correo Anterior para responder.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setGeneratedContent(null);

        try {
            const apiKey = googleApiConfig?.apiKey || process.env.API_KEY || process.env.GEMINI_API_KEY;
            
            if (!apiKey) {
                throw new Error("No se ha configurado la API Key de Gemini. Por favor, revísala en los ajustes.");
            }
            const ai = new GoogleGenAI({ 
                apiKey,
                httpOptions: {
                    baseUrl: `${window.location.origin}/api/proxy/google`
                }
            });
            
            // --- Determine Context and Greeting ---
            // Re-fetch selected contact from state just in case, though we used inputs
            const idx = parseInt(selectedContactIndex, 10);
            const selectedContact = (!isNaN(idx) && idx >= 0 && idx < contacts.length) ? contacts[idx] : undefined;
            
            // Use state values to allow user editing after auto-population
            const dataName = recipientName;
            const dataTitle = recipientTitle;
            const dataGender = recipientGender === 'H' ? 'Hombre' : 'Mujer';
            
            // Apodo is not in UI state, fetch from DB if contact selected
            const dataApodo = selectedContact ? getDBValue(selectedContact, ['apodo', 'nickname', 'alias']) : null;
            
            // Gender Logic for Grammar
            let isMale = true;
            if (dataGender.toLowerCase().startsWith('m') && !dataGender.toLowerCase().includes('masc')) isMale = false;

            // Greeting Logic
            let greetingInstruction = "";
            let nameForContext = dataName || "";

            if (selectedContact && dataApodo && String(dataApodo).trim() !== '') {
                greetingInstruction = `El destinatario tiene el apodo "${dataApodo}". ÚSALO en el saludo (ej. "Hola ${dataApodo}").`;
            } else if (dataName && String(dataName).trim()) {
                greetingInstruction = `Usa OBLIGATORIAMENTE el nombre: "${dataName}".`;
                if(dataTitle) greetingInstruction += ` Incluye el título "${dataTitle}" si es formal.`;
            } else {
                greetingInstruction = "No hay nombre específico, usa un saludo general.";
                nameForContext = "Cliente";
            }

            // Time Greeting
            const hour = new Date().getHours();
            let timeGreeting = "Hola";
            if (hour >= 5 && hour < 12) timeGreeting = "Buenos días";
            else if (hour >= 12 && hour < 20) timeGreeting = "Buenas tardes";
            else timeGreeting = "Buenas noches";

            const genderContextInstruction = isMale 
                ? "Destinatario HOMBRE (gramática masculina: 'invitarlo', 'bienvenido')." 
                : "Destinatario MUJER (gramática femenina: 'invitarla', 'bienvenida').";

            const systemInstruction = `Eres un experto en comunicación corporativa y relaciones públicas de alto nivel.
            
            **ADN DEL USUARIO:**
            ${config.memoria_ia?.estilo ? `- ESTILO DE REDACCIÓN: ${config.memoria_ia.estilo}` : ''}

            **CONTEXTO SITUACIONAL:**
            ${previousEmail.trim() ? `El usuario ha recibido un mensaje anterior que dice:\n"""\n${previousEmail}\n"""\n\n` : ''}

            **REGLAS CRÍTICAS:**
            1. Saludo inicial: Profesional y acorde a la hora del día (${timeGreeting}).
            2. Nombre/Trato: ${greetingInstruction}
            3. Gramática: ${genderContextInstruction}
            4. Objetivo Principal: Tu objetivo es redactar un mensaje IMPECABLE, PROFESIONAL y DIRECTO basado estrictamente en la idea proporcionada por el usuario. 
            5. Formato Email: Usa HTML básico (<b>, <i>, <br>). Firma siempre como "<b>Arq. Rembrandt Blanco Arrambide</b>".
            6. Formato WhatsApp: Sin firma, directo, amable y con emojis profesionales si el tono es casual, pero siempre manteniendo la seriedad corporativa.
            7. Idioma: Español.
            8. Proyecto: Si se menciona un proyecto o fraccionamiento, asegúrate de que esté correctamente integrado en el contexto del mensaje.`;

            const userPrompt = `Genera los mensajes de comunicación profesional considerando lo siguiente:
            - Tono: "${tone}"
            - Longitud: "${messageLength}"
            - Proyecto: "${project || 'General'}"
            ${attachedImages.length > 0 ? `- Adjuntos: Se han incluido ${attachedImages.length} imágenes.` : ''}
            
            Idea / Inspiración adicional: "${idea}"
            
            Recuerda: El objetivo final es comunicar el mensaje de forma clara, profesional y efectiva.`;

            const parts: any[] = [];
            if (attachedImages.length > 0) {
                attachedImages.forEach(img => {
                    parts.push({
                        inlineData: { data: img.base64, mimeType: img.mimeType }
                    });
                });
            }
            parts.push({ text: userPrompt });

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: { parts },
                config: {
                    systemInstruction,
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            emailSubject: { type: Type.STRING, description: "Asunto del correo" },
                            emailBody: { type: Type.STRING, description: "Cuerpo del correo en HTML" },
                            whatsappMessage: { type: Type.STRING, description: "Mensaje de WhatsApp" }
                        },
                        required: ["emailSubject", "emailBody", "whatsappMessage"],
                    },
                },
            });

            const jsonString = response.text.trim();
            try {
                const parsedContent = JSON.parse(cleanJsonResponse(jsonString)) as GeneratedContent;
                setGeneratedContent(parsedContent);

                // Save to history
                const historyItem = {
                    id: Date.now().toString(),
                    type: 'email' as const,
                    original: idea,
                    result: JSON.stringify(parsedContent),
                    timestamp: Date.now()
                };

                updateConfig(prev => ({
                    ...prev,
                    aiHistory: [historyItem, ...(prev.aiHistory || [])].slice(0, 50)
                }));
            } catch (parseError) {
                console.error("Error parsing JSON response:", jsonString);
                throw new Error("La respuesta de la IA no fue un JSON válido. Intenta de nuevo.");
            }

        } catch (e: any) {
            console.error(e);
            let msg = e.message || String(e);
            if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
                msg = "⚠️ Has excedido tu cuota de API (Error 429). El modelo 'gemini-3-flash' está saturado o tu límite gratuito se agotó. Intenta de nuevo en unos minutos.";
            } else if (msg.includes('503')) {
                msg = "⚠️ El servicio de IA está temporalmente no disponible (Error 503). Intenta de nuevo.";
            }
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    }, [idea, previousEmail, tone, messageLength, attachedImages, recipientTitle, recipientName, recipientGender, project, selectedContactIndex, contacts]);

    const handleImproveWithStyle = useCallback(async () => {
        if (!idea.trim() && !previousEmail.trim()) {
            setError('Introduce un borrador o idea para mejorar.');
            return;
        }

        if (selectedImproveStyles.length === 0) {
            setError('Selecciona al menos un estilo para mejorar.');
            return;
        }

        setIsImproving(true);
        setError(null);

        try {
            const apiKey = googleApiConfig?.apiKey || process.env.API_KEY || process.env.GEMINI_API_KEY;
            if (!apiKey) throw new Error("API Key no configurada.");

            const ai = new GoogleGenAI({ 
                apiKey,
                httpOptions: { baseUrl: `${window.location.origin}/api/proxy/google` }
            });

            // Context from existing fields
            const dataName = recipientName;
            const dataTitle = recipientTitle;
            const hour = new Date().getHours();
            let timeGreeting = "Hola";
            if (hour >= 5 && hour < 12) timeGreeting = "Buenos días";
            else if (hour >= 12 && hour < 20) timeGreeting = "Buenas tardes";
            else timeGreeting = "Buenas noches";

            const memoryContext = `
            ${config.memoria_ia?.estilo ? `- ESTILO DE REDACCIÓN: ${config.memoria_ia.estilo}` : ''}
            ${config.memoria_ia?.laboral ? `- CONTEXTO LABORAL: ${config.memoria_ia.laboral}` : ''}`;

            let instructions = [];
            if (selectedImproveStyles.includes('email')) {
                instructions.push(`- CORREO: Genera un correo profesional con HTML básico. Firma: "<b>Arq. Rembrandt Blanco Arrambide</b>". Destinatario: ${dataTitle} ${dataName}. Saludo: ${timeGreeting}.`);
            }
            if (selectedImproveStyles.includes('whatsapp')) {
                instructions.push(`- WHATSAPP: Genera un mensaje directo y amable con emojis. Destinatario: ${dataName}.`);
            }
            if (selectedImproveStyles.includes('direct')) {
                instructions.push(`- MEJORA DIRECTA: Mejora el texto original corrigiendo ortografía, gramática y claridad, manteniendo el formato de idea pero más pulido.`);
            }

            const systemInstruction = `Eres un experto en comunicación corporativa.
            ${memoryContext}
            Genera las versiones solicitadas basándote en la idea del usuario:
            ${instructions.join('\n')}
            
            Responde ÚNICAMENTE con JSON según el esquema, dejando campos vacíos "" si no fueron seleccionados.`;

            const userPrompt = `Texto/Idea actual: "${idea}"
            ${previousEmail.trim() ? `Contexto (mensaje anterior): "${previousEmail}"` : ''}
            Proyecto: "${project || 'General'}"`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: { parts: [{ text: userPrompt }] },
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
                        required: ["emailSubject", "emailBody", "whatsappMessage", "improvedIdea"],
                    },
                },
            });

            const parsed = JSON.parse(cleanJsonResponse(response.text.trim()));
            setGeneratedContent(parsed);
            
            // Add to history
            const historyItem = {
                id: Date.now().toString(),
                type: 'email' as const,
                original: `[Mejora Lote: ${selectedImproveStyles.join(', ')}] ${idea}`,
                result: JSON.stringify(parsed),
                timestamp: Date.now()
            };
            updateConfig(prev => ({ ...prev, aiHistory: [historyItem, ...(prev.aiHistory || [])].slice(0, 50) }));

        } catch (e: any) {
            setError(e.message || "Error al mejorar el mensaje.");
        } finally {
            setIsImproving(false);
        }
    }, [idea, previousEmail, recipientName, recipientTitle, project, googleApiConfig, config, updateConfig, selectedImproveStyles]);

    const toggleStyle = (style: string) => {
        setSelectedImproveStyles(prev => 
            prev.includes(style) 
                ? prev.filter(s => s !== style) 
                : [...prev, style]
        );
    };
  
    const handleCopyToClipboard = async (text: string, type: CopiedState) => {
        if (type === 'email' && generatedContent?.emailBody) {
            const htmlContent = generatedContent.emailBody;
            const plainTextContent = stripHtml(htmlContent);
            try {
                const blob = new Blob([htmlContent], { type: 'text/html' });
                const plainBlob = new Blob([plainTextContent], { type: 'text/plain' });
                const item = new ClipboardItem({ 'text/html': blob, 'text/plain': plainBlob });
                await navigator.clipboard.write([item]);
            } catch (err) {
                navigator.clipboard.writeText(plainTextContent);
            }
        } else {
            navigator.clipboard.writeText(text);
        }
        setCopied(type);
        setTimeout(() => setCopied(null), 2000);
    };
  
    const handleSendEmail = () => {
        if (!generatedContent) return;
        const recipient = fullRecipientEmail ? encodeURIComponent(fullRecipientEmail) : '';
        const subject = encodeURIComponent(generatedContent.emailSubject);
        const body = encodeURIComponent(stripHtml(generatedContent.emailBody));
        window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
    };

    const handleSendWhatsApp = () => {
        if (!generatedContent) return;
        const url = `https://wa.me/?text=${encodeURIComponent(generatedContent.whatsappMessage)}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
             Array.from(e.dataTransfer.files).forEach((file: File) => {
                if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const dataUrl = event.target?.result as string;
                        const base64 = dataUrl.split(',')[1];
                        const newImage: ReferenceImage = {
                            name: `archivo ${attachedImages.length + 1}`,
                            base64,
                            mimeType: file.type,
                            preview: dataUrl,
                        };
                        onAttachmentsChange([...attachedImages, newImage]);
                    };
                    reader.readAsDataURL(file);
                }
            });
        }
    }, [attachedImages, onAttachmentsChange]);
    
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(true);
    };

    // --- SAVE TO DB LOGIC ---
    const handleSaveNewContact = async () => {
        if (!recipientName.trim()) {
            alert("El nombre (Cliente) es obligatorio para guardar.");
            return;
        }

        setIsSavingContact(true);

        const nameToCheck = recipientName.trim().toLowerCase();
        // Check duplication
        const duplicate = contacts.find(c => {
            const cName = getDBValue(c, ['cliente', 'nombre', 'name']) || '';
            return String(cName).trim().toLowerCase() === nameToCheck;
        });

        if (duplicate) {
            alert(`Error: El cliente "${recipientName}" ya está registrado.`);
            setIsSavingContact(false);
            return;
        }

        const payload = {
            cliente: recipientName,
            lic: recipientTitle, 
            genero: recipientGender === 'H' ? 'Hombre' : 'Mujer',
            correo: fullRecipientEmail,
        };

        try {
            const res = await fetch(`${SUPABASE_CONFIG.URL}/rest/v1/Contactos`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_CONFIG.KEY,
                    'Authorization': `Bearer ${SUPABASE_CONFIG.KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                throw new Error("Error al guardar en BD");
            }

            alert("Contacto guardado.");
            fetchContacts(); 
        } catch (e: any) {
            alert("Error: " + e.message);
        } finally {
            setIsSavingContact(false);
        }
    };

    const deleteHistoryItem = (id: string) => {
        updateConfig(prev => ({
            ...prev,
            aiHistory: (prev.aiHistory || []).filter(h => h.id !== id)
        }));
    };

    const clearHistory = () => {
        if (window.confirm('¿Borrar todo el historial de correos?')) {
            updateConfig(prev => ({
                ...prev,
                aiHistory: (prev.aiHistory || []).filter(h => h.type !== 'email')
            }));
        }
    };

    return (
    <div 
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className={`transition-all duration-300 ${isDraggingOver ? 'border-2 border-purple-500 ring-4 ring-purple-500/30' : 'border-2 border-transparent'}`}
    >
        <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Generador de Mensajes</h2>
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
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Últimos Correos</h3>
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
                                history.map(item => {
                                    let parsedResult: GeneratedContent | null = null;
                                    try { parsedResult = JSON.parse(item.result); } catch(e) {}
                                    
                                    return (
                                        <div key={item.id} className="bg-gray-800/50 rounded-lg p-3 border border-gray-700 group relative">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-[10px] text-gray-500">
                                                    {new Date(item.timestamp).toLocaleString()}
                                                </span>
                                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => deleteHistoryItem(item.id)} className="text-gray-400 hover:text-red-400">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                            <p className="text-xs text-gray-300 line-clamp-1 mb-1"><span className="text-gray-500 font-bold">Idea:</span> {item.original}</p>
                                            {parsedResult && (
                                                <div className="flex gap-2 mt-2">
                                                    <button 
                                                        onClick={() => {
                                                            setIdea(item.original || '');
                                                            setGeneratedContent(parsedResult);
                                                            setShowHistory(false);
                                                        }}
                                                        className="text-[10px] bg-purple-600/20 text-purple-400 px-2 py-1 rounded hover:bg-purple-600/40"
                                                    >
                                                        Cargar de nuevo
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* --- Left Column: Inputs --- */}
            <div className="space-y-4">
                
                <div className="space-y-2 border-b border-gray-700 pb-4">
                    <label className="text-sm font-medium text-gray-300">Armador de Correo</label>
                    <div className="flex items-center gap-1 bg-gray-900/50 p-2 rounded-md">
                        <input type="text" value={recipientEmailUser} onChange={e => setRecipientEmailUser(e.target.value)} placeholder="usuario" className="flex-grow p-2 bg-gray-700 rounded-md border border-gray-600 focus:ring-2 focus:ring-purple-500 min-w-0 text-sm"/>
                        
                        {recipientEmailDomain !== 'Personalizado' ? (
                            <select value={recipientEmailDomain} onChange={e => setRecipientEmailDomain(e.target.value)} className="p-2 bg-gray-700 rounded-md border border-gray-600 focus:ring-2 focus:ring-purple-500 text-sm">
                                {emailDomains.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        ) : (
                             <input type="text" value={customDomain} onChange={e => setCustomDomain(e.target.value)} placeholder="dominio.personal" className="flex-grow p-2 bg-gray-700 rounded-md border border-gray-600 focus:ring-2 focus:ring-purple-500 min-w-0 text-sm"/>
                        )}
                        <select value={recipientEmailTld} onChange={e => setRecipientEmailTld(e.target.value)} className="p-2 bg-gray-700 rounded-md border border-gray-600 focus:ring-2 focus:ring-purple-500 text-sm">
                            {emailTlds.map(tld => <option key={tld} value={tld}>{tld}</option>)}
                        </select>
                    </div>
                     {recipientEmailDomain === 'Personalizado' && (
                        <button onClick={() => setRecipientEmailDomain('@javer')} className="text-xs text-purple-400 hover:underline">Volver a dominios predefinidos</button>
                     )}
                    {fullRecipientEmail && <p className="text-xs text-gray-400 bg-gray-900/50 p-2 rounded-md truncate">Email: {fullRecipientEmail}</p>}
                </div>

                <div className="space-y-3 pt-2">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-gray-200">Destinatario (Base de Datos)</h3>
                        <button onClick={fetchContacts} disabled={isContactsLoading} className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded-md text-gray-300" title="Actualizar lista">
                            {isContactsLoading ? <Spinner size="3"/> : '↻ Actualizar BD'}
                        </button>
                    </div>
                     
                     <div className="relative flex items-center gap-2">
                        <select value={selectedContactIndex} onChange={handleContactSelect} className="w-full p-2 bg-gray-700 rounded-md border border-gray-600 focus:ring-2 focus:ring-purple-500 text-sm">
                            <option value="">-- Cargar de Base de Datos --</option>
                            {contacts.map((c, idx) => ({ c, idx }))
                                .sort((a, b) => {
                                    const nameA = String(getDBValue(a.c, ['cliente', 'nombre', 'name']) || '');
                                    const nameB = String(getDBValue(b.c, ['cliente', 'nombre', 'name']) || '');
                                    const isFavA = favorites.includes(nameA);
                                    const isFavB = favorites.includes(nameB);
                                    if (isFavA && !isFavB) return -1;
                                    if (!isFavA && isFavB) return 1;
                                    return nameA.localeCompare(nameB);
                                })
                                .map(({ c, idx }) => {
                                    const cName = getDBValue(c, ['cliente', 'nombre', 'name']);
                                    const cTitle = getDBValue(c, ['lic', 'titulo', 'prefix']) || '';
                                    const isFav = favorites.includes(String(cName));
                                    return <option key={idx} value={idx}>{`${isFav ? '⭐ ' : ''}${cTitle} ${cName}`}</option>;
                                })
                            }
                        </select>
                        <button 
                             onClick={() => {
                                 if (selectedContactIndex !== '') {
                                     const contact = contacts[parseInt(selectedContactIndex, 10)];
                                     const cName = getDBValue(contact, ['cliente', 'nombre', 'name']);
                                     if (cName) toggleFavorite(String(cName));
                                 }
                             }}
                             disabled={selectedContactIndex === ''}
                             className={`shrink-0 flex justify-center items-center h-[38px] w-[38px] rounded-md border transition-colors ${selectedContactIndex !== '' && favorites.includes(String(getDBValue(contacts[parseInt(selectedContactIndex, 10)], ['cliente', 'nombre', 'name']))) ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' : 'bg-gray-700 text-gray-400 border-gray-600 hover:text-white'}`}
                             title="Marcar/Desmarcar Favorito"
                         >
                            <Star size={16} className={selectedContactIndex !== '' && favorites.includes(String(getDBValue(contacts[parseInt(selectedContactIndex, 10)], ['cliente', 'nombre', 'name']))) ? 'fill-current' : ''} />
                         </button>
                        {selectedContactIndex !== '' && (
                            <div className="absolute right-12 top-1/2 -translate-y-1/2 pointer-events-none text-green-400 text-xs font-bold animate-pulse bg-gray-800 px-1 rounded">
                                ✓
                            </div>
                        )}
                     </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                         <select value={recipientTitle} onChange={e => setRecipientTitle(e.target.value)} className="p-2 bg-gray-700 rounded-md border border-gray-600 focus:ring-2 focus:ring-purple-500 text-sm">
                            {titlesList.map((t, idx) => <option key={`${t}-${idx}`} value={t}>{t || 'Título'}</option>)}
                        </select>
                        <input type="text" value={recipientName} onChange={e => setRecipientName(e.target.value)} placeholder="Nombre (Dejar vacío para general)" className="sm:col-span-2 p-2 bg-gray-700 rounded-md border border-gray-600 focus:ring-2 focus:ring-purple-500 text-sm"/>
                    </div>
                    
                    <div className="flex justify-between items-center">
                         <div className="flex items-center gap-4 text-sm">
                            <label className="font-medium text-gray-300">Género:</label>
                            <div className="flex items-center gap-2">
                                <input type="radio" id="genderH" name="gender" value="H" checked={recipientGender === 'H'} onChange={() => setRecipientGender('H')} className="accent-purple-500"/>
                                <label htmlFor="genderH">H</label>
                            </div>
                             <div className="flex items-center gap-2">
                                <input type="radio" id="genderM" name="gender" value="M" checked={recipientGender === 'M'} onChange={() => setRecipientGender('M')} className="accent-purple-500"/>
                                <label htmlFor="genderM">M</label>
                            </div>
                        </div>
                        
                        <button 
                            onClick={handleSaveNewContact} 
                            disabled={isSavingContact || !recipientName}
                            className="text-xs px-3 py-1.5 bg-green-700 hover:bg-green-600 disabled:bg-gray-600 disabled:text-gray-400 rounded-md text-white font-medium flex items-center gap-2 transition-colors"
                        >
                            {isSavingContact ? <Spinner size="3"/> : '+ Guardar Nuevo'}
                        </button>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label htmlFor="idea" className="block mb-2 text-sm font-medium text-gray-300">Idea Principal <span className="text-gray-500 text-xs font-normal">(Opcional si pegas un correo abajo)</span></label>
                        <SmartTextarea id="idea" value={idea} onChange={(e) => setIdea(e.target.value)}
                            placeholder="Ej: 'Recordar sobre la junta de mañana...' o 'Dile que sí apruebo el presupuesto'."
                            className="w-full p-2 bg-gray-700 rounded-md border border-gray-600 focus:ring-2 focus:ring-purple-500 text-sm"
                            rows={3}
                        />
                    </div>

                    <details className="group border border-gray-700 rounded-md bg-gray-900/50">
                        <summary className="cursor-pointer font-medium text-sm text-gray-300 p-3 select-none flex items-center justify-between">
                            Correo o Mensaje Anterior (Para Responder)
                            <span className="text-purple-400 group-open:rotate-180 transition-transform">▼</span>
                        </summary>
                        <div className="p-3 border-t border-gray-700">
                            <SmartTextarea id="previousEmail" value={previousEmail} onChange={(e) => setPreviousEmail(e.target.value)}
                                placeholder="Pega aquí el correo que quieres responder. Si dejas la Idea Principal vacía, te sugeriré qué responder."
                                className="w-full p-2 bg-gray-700 rounded-md border border-gray-600 focus:ring-2 focus:ring-purple-500 text-sm"
                                rows={3}
                            />
                        </div>
                    </details>
                </div>
                
                <div>
                    <label htmlFor="project" className="block mb-2 text-sm font-medium text-gray-300">Fraccionamiento / Proyecto</label>
                    <input
                        type="text"
                        id="project"
                        list="project-list"
                        value={project}
                        onChange={(e) => setProject(e.target.value)}
                        placeholder="Ej: 'Valle de los Encinos - Sector 1' (o seleccionar de la lista)"
                        className="w-full p-2 bg-gray-700 rounded-md border border-gray-600 focus:ring-2 focus:ring-purple-500 text-sm"
                    />
                    <datalist id="project-list">
                        {fraccionamientosList.length > 0 ? (
                            fraccionamientosList.map(p => <option key={p} value={p} />)
                        ) : (
                            predefinedProjects.map(p => <option key={p} value={p} />)
                        )}
                    </datalist>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="tone" className="block mb-2 text-sm font-medium text-gray-300">Tono</label>
                        <select id="tone" value={tone} onChange={(e) => setTone(e.target.value as Tone)}
                            className="w-full p-2 bg-gray-700 rounded-md border border-gray-600 focus:ring-2 focus:ring-purple-500 text-sm"
                        >
                            <option>Profesional</option>
                            <option>Casual</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="length" className="block mb-2 text-sm font-medium text-gray-300">Longitud</label>
                        <select id="length" value={messageLength} onChange={(e) => setMessageLength(e.target.value as MessageLength)}
                            className="w-full p-2 bg-gray-700 rounded-md border border-gray-600 focus:ring-2 focus:ring-purple-500 text-sm"
                        >
                            <option>Reducido</option>
                            <option>Medio</option>
                            <option>Detallado</option>
                        </select>
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <button onClick={handleGenerate} disabled={isLoading || !!isImproving}
                        className="w-full px-6 py-3 font-semibold text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-900/20"
                    >
                        {isLoading ? (
                            <>
                                <Spinner size="5" />
                                <span>Generando...</span>
                            </>
                        ) : (
                            <>
                                <Send size={18} />
                                <span>Generar Mensajes (Ambos)</span>
                            </>
                        )}
                    </button>

                    <button 
                        onClick={handleImproveWithStyle} 
                        disabled={isLoading || isImproving || !idea.trim() || selectedImproveStyles.length === 0}
                        className="w-full px-6 py-3 font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-gray-700 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20"
                    >
                        {isImproving ? (
                            <>
                                <Spinner size="5" />
                                <span>Mejorando...</span>
                            </>
                        ) : (
                            <>
                                <Sparkles size={18} />
                                <span>Mejorar con IA ({selectedImproveStyles.length})</span>
                            </>
                        )}
                    </button>

                    <div className="grid grid-cols-3 gap-2">
                        <button 
                            onClick={() => toggleStyle('email')}
                            className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all group relative ${
                                selectedImproveStyles.includes('email') 
                                ? 'bg-blue-900/30 border-blue-500 text-blue-100 shadow-[0_0_15px_rgba(59,130,246,0.2)]' 
                                : 'bg-gray-800 border-gray-700 text-gray-400 opacity-60'
                            }`}
                        >
                            {selectedImproveStyles.includes('email') && (
                                <div className="absolute top-1 right-1 bg-blue-500 rounded-full p-0.5">
                                    <Check size={8} className="text-white" />
                                </div>
                            )}
                            <Mail size={18} className={selectedImproveStyles.includes('email') ? 'text-blue-400' : ''} />
                            <span className="text-[9px] mt-1 font-bold">Correo</span>
                        </button>
                        <button 
                            onClick={() => toggleStyle('whatsapp')}
                            className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all group relative ${
                                selectedImproveStyles.includes('whatsapp') 
                                ? 'bg-green-900/30 border-green-500 text-green-100 shadow-[0_0_15px_rgba(34,197,94,0.2)]' 
                                : 'bg-gray-800 border-gray-700 text-gray-400 opacity-60'
                            }`}
                        >
                            {selectedImproveStyles.includes('whatsapp') && (
                                <div className="absolute top-1 right-1 bg-green-500 rounded-full p-0.5">
                                    <Check size={8} className="text-white" />
                                </div>
                            )}
                            <MessageSquare size={18} className={selectedImproveStyles.includes('whatsapp') ? 'text-green-400' : ''} />
                            <span className="text-[9px] mt-1 font-bold">WhatsApp</span>
                        </button>
                        <button 
                            onClick={() => toggleStyle('direct')}
                            className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all group relative ${
                                selectedImproveStyles.includes('direct') 
                                ? 'bg-purple-900/30 border-purple-500 text-purple-100 shadow-[0_0_15px_rgba(168,85,247,0.2)]' 
                                : 'bg-gray-800 border-gray-700 text-gray-400 opacity-60'
                            }`}
                        >
                            {selectedImproveStyles.includes('direct') && (
                                <div className="absolute top-1 right-1 bg-purple-500 rounded-full p-0.5">
                                    <Check size={8} className="text-white" />
                                </div>
                            )}
                            <Sparkles size={18} className={selectedImproveStyles.includes('direct') ? 'text-purple-400' : ''} />
                            <span className="text-[9px] mt-1 font-bold">Mejorar</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* --- Right Column: Outputs --- */}
            <div className="space-y-4">
                {isLoading && (
                    <div className="h-full flex flex-col items-center justify-center bg-gray-900/50 rounded-lg p-4">
                        <Spinner />
                        <p className="mt-2 text-gray-400">Generando contenido...</p>
                    </div>
                )}
                {!isLoading && !generatedContent && (
                     <div className="h-full flex flex-col items-center justify-center bg-gray-900/50 rounded-lg p-4 text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                        <p className="mt-2 text-gray-500">El contenido generado aparecerá aquí.</p>
                    </div>
                )}

                {generatedContent && (
                    <div className="space-y-4 animate-fade-in">
                        {/* Email Output */}
                        <div className="bg-gray-900/50 p-4 rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-lg font-semibold text-white">Email Generado</h3>
                                <div className="flex items-center gap-2">
                                    <IconButton tooltip={copied === 'email' ? '¡Copiado!' : 'Copiar como texto enriquecido'} onClick={() => handleCopyToClipboard(generatedContent.emailBody, 'email')}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a1 1 0 011-1h14a1 1 0 110 2H3a1 1 0 01-1-1z" /></svg>
                                    </IconButton>
                                    <IconButton tooltip="Abrir en cliente de correo" onClick={handleSendEmail}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                                    </IconButton>
                                </div>
                            </div>
                            <div className="bg-gray-800 p-3 rounded-md space-y-2">
                                <p className="text-sm"><strong className="text-gray-400">Asunto:</strong> {generatedContent.emailSubject}</p>
                                <div className="border-t border-gray-700 my-1"></div>
                                <div className="text-sm leading-relaxed text-gray-200"><MarkdownRenderer content={generatedContent.emailBody} /></div>
                            </div>
                        </div>

                        {/* WhatsApp Output */}
                        <div className="bg-gray-900/50 p-4 rounded-lg">
                             <div className="flex justify-between items-center mb-2">
                                <h3 className="text-lg font-semibold text-white">Mensaje de WhatsApp</h3>
                                 <div className="flex items-center gap-2">
                                    <IconButton tooltip={copied === 'whatsapp' ? '¡Copiado!' : 'Copiar'} onClick={() => handleCopyToClipboard(generatedContent.whatsappMessage, 'whatsapp')}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a1 1 0 011-1h14a1 1 0 110 2H3a1 1 0 01-1-1z" /></svg>
                                    </IconButton>
                                    <IconButton tooltip="Abrir en WhatsApp" onClick={handleSendWhatsApp}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.886-.001 2.269.655 4.502 1.906 6.344l-1.191 4.353 4.462-1.161z" /></svg>
                                    </IconButton>
                                </div>
                            </div>
                             <div className="bg-gray-800 p-3 rounded-md text-sm leading-relaxed text-gray-200">
                                {generatedContent.whatsappMessage}
                            </div>
                        </div>

                        {/* Mejora Directa Resultados */}
                        {generatedContent.improvedIdea && (
                            <div className="mt-6 border-t border-gray-800 pt-6">
                                <h3 className="text-sm font-bold text-purple-400 flex items-center gap-2 mb-3">
                                    <Sparkles size={16} />
                                    Mejora Directa del Borrador
                                </h3>
                                <div className="p-4 bg-gray-800/40 rounded-2xl border border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.1)]">
                                    <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap italic">
                                        "{generatedContent.improvedIdea}"
                                    </div>
                                    <button 
                                        onClick={() => {
                                            setIdea(generatedContent.improvedIdea || '');
                                            setCopied('email'); 
                                            setTimeout(() => setCopied(null), 2000);
                                        }}
                                        className="mt-3 px-3 py-1.5 text-[10px] font-bold bg-purple-600/20 text-purple-300 border border-purple-500/30 rounded-lg hover:bg-purple-600/40 hover:scale-105 transition-all flex items-center gap-2"
                                    >
                                        <Star size={12} />
                                        USAR COMO IDEA PRINCIPAL
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
        {error && <p className="text-red-400 mt-4 text-center bg-red-900/20 p-2 rounded-md font-medium text-sm">{error}</p>}
    </div>
  );
};

export default EmailGenerator;
