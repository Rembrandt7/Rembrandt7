import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { AppConfig, LinkItem, LinkSection, TabConfig, NutritionData, Note, AppNotification, GoogleApiConfig } from '../types';
import { supabase } from '../services/supabaseClient';
import { toast } from 'sonner';

const INITIAL_TABS: TabConfig[] = [
    { id: 'email-gen', label: 'Email', type: 'system', componentKey: 'Generador de Email', isVisible: true, icon: 'Mail' },
    { id: 'commands', label: 'Comandos', type: 'system', componentKey: 'Comandos', isVisible: true, icon: 'Terminal' },
    { id: 'database', label: 'Base de Datos', type: 'system', componentKey: 'Base de Datos', isVisible: true, icon: 'Database' },
    { id: 'useful-tools', label: 'Herramientas Útiles', type: 'system', componentKey: 'Herramientas Útiles', isVisible: true, icon: 'Briefcase' },
    { id: 'calendar', label: 'Calendario', type: 'system', componentKey: 'Calendario', isVisible: true, icon: 'Calendar' },
    { id: 'credenciales', label: 'Credenciales', type: 'system', componentKey: 'Credenciales', isVisible: true, icon: 'Lock' },
    { id: 'finanzas', label: 'Finanzas', type: 'system', componentKey: 'Finanzas', isVisible: true, icon: 'TrendingUp' },
    { id: 'notas', label: 'Notas', type: 'system', componentKey: 'Notas', isVisible: true, icon: 'Edit' },
    { id: 'nutricion', label: 'Nutrición', type: 'system', componentKey: 'Nutricion', isVisible: true, icon: 'Heart' },
    { id: 'video-gen', label: 'Video', type: 'system', componentKey: 'Generador de Video', isVisible: true, icon: 'Video' },
    { id: '3d-print', label: 'Impresión 3D', type: 'system', componentKey: 'Impresión 3D', isVisible: true, icon: 'Box' },
];

const INITIAL_CONFIG: AppConfig = {
  version: 2,
  tabs: INITIAL_TABS,
  commands: [],
  commandGroups: [],
  aiHistory: [],
  reminders: [],
  calendarEvents: [],
  calendarTokens: [],
  notes: [],
  notifications: [],
  lastNotificationCheck: '',
  vacationConfig: {
    initialDays: 11,
    resetDate: '07-21',
    daysAfterReset: 26
  },
  credenciales: [],
  estudios: [],
  news: [],
  finanzasNews: [],
  aiTutorials: [],
  memoria_ia: {
    perfil: "",
    estilo: "",
    laboral: "",
    personal: ""
  }, linksBar: [
    {
        id: '1',
        href: "https://www.mercadolibre.com.mx/",
        name: "Mercado Libre",
        colorClass: "text-yellow-400 hover:text-yellow-300",
        iconSvg: `<img src="/mercadolibre_premium.png" class="w-10 h-10 object-contain" />`
    },
    {
        id: 'amazon',
        href: "https://www.amazon.com.mx/",
        name: "Amazon",
        colorClass: "text-amber-400 hover:text-amber-300",
        iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="w-full h-full p-0.5"><rect width="100" height="100" rx="22" fill="#131921"/><path d="M53.8 47.7c0 3.2.1 5.9-1.4 8.7-1.1 2.1-2.9 3.4-5 3.4-2.9 0-4.6-2.2-4.6-5.5 0-6.5 5.3-7.7 11-7.7v1.1zm7.3-19.4c-.4-.5-1.2-.4-1.7-.1-2.9 1.4-6.4 2-9.6 2-7.5 0-12.7-3.3-12.7-11.2 0-6.2 3.6-10.3 9.4-11.8 4.7-1.1 11-1.2 11-5.7 0-3.6-2.7-5.3-6.6-5.3-4.3 0-6.2 2-6.7 5.7 0 .7-.6 1.2-1.3 1.2l-6.8-.7c-.7-.1-1.2-.6-1.1-1.3.9-7.1 6.7-11.4 15.9-11.4 8.4 0 14.8 4.3 14.8 13v17c0 2.1.8 3.1 1.6 4.1.5.7.5 1.3 0 1.8l-5.8 4.8c-.6.5-1.1.4-1.6-.3-.6-.8-1.2-1.7-1.4-2.8z" fill="#FFFFFF" transform="translate(18, 12) scale(0.65)"/><path d="M22 68c13 8 31 8.8 47 2 1-.4 1.6.3.8 1.2-9 8-24 11-37 6-2-.8-2.8-2-.6-3 1.5-.7 3-1.2 4.6-1.7 1.2-.4 2.4.8 1.2 1.2-10 3.8-22 .7-27-7.4-.3-.5.2-1.1.8-.8 7 4 15 5.8 24 4.8 1.3-.2 1.3-1.9 0-1.7-8 1-16-.8-23-4.6-.6-.3-1.1.3-.8.8z" fill="#FF9900"/><path d="M68 69c-1-.4-2.8.3-4.1.9-.5.3-.4 1 .1 1.2 3.2 1.2 6.4 3.2 8.3 6.2.3.5 1 .3 1.1-.3.3-3.4-.1-7.4-2.2-10.4-.3-.5-1-.4-1.2.1-.6 1.7-1.2 3.5-2 5.3z" fill="#FF9900"/></svg>`
    },
    {
        id: '2',
        href: "https://web.whatsapp.com/",
        name: "WhatsApp",
        colorClass: "text-green-500 hover:text-green-400",
        iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.886-.001 2.269.655 4.502 1.906 6.344l-1.191 4.353 4.462-1.161z" /></svg>`
    },
    {
        id: '3',
        href: "https://www.notion.so/",
        name: "Notion",
        colorClass: "text-white hover:text-gray-300",
        iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M4.021 1.761A.97.97 0 0 0 3 2.754V21.36c0 .546.438.986.97.972.032.004.064.004.096 0h16.29a.952.952 0 0 0 .963-.951V2.623a.952.952 0 0 0-.963-.951H4.117a.65.65 0 0 0-.096.09zM5.38 4.28h2.24l6.983 11.233V4.28h2.096v15.226h-2.12L7.65 8.358v11.148H5.38V4.28z"/></svg>`
    },
    {
        id: '4',
        href: "https://clubjaver.com/",
        name: "Flow",
        colorClass: "text-blue-500 hover:text-blue-400",
        iconSvg: `<img src="/flow_premium.png" class="w-10 h-10 object-contain" />`
    },

    {
        id: '5',
        href: "https://www.pinterest.com.mx/Rembrandtro/pines-creados/",
        name: "Pinterest",
        colorClass: "text-red-500 hover:text-red-400",
        iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.965 1.406-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.259 7.929-7.259 4.164 0 7.399 2.965 7.399 6.931 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.992 5.367 18.623 0 12.017 0z"/></svg>`
    },
    {
        id: '6',
        href: "https://www.facebook.com/",
        name: "Facebook",
        colorClass: "text-blue-600 hover:text-blue-500",
        iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`
    },
    {
        id: '7',
        href: "https://www.instagram.com/",
        name: "Instagram",
        colorClass: "text-pink-500 hover:text-pink-400",
        iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>`
    },
    {
        id: '8',
        href: "https://x.com/",
        name: "X",
        colorClass: "text-white hover:text-gray-300",
        iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 7.688 8.502 11.25h-6.657l-5.214-6.817L4.99 21.188H1.68l7.73-8.235L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`
    },
    {
        id: '10',
        href: "https://app.maket.ai/dashboard",
        name: "Maket AI",
        colorClass: "text-indigo-400 hover:text-indigo-300",
        iconSvg: `<svg class="w-full h-full text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="4"></rect><path d="M9 3v18"></path><path d="M3 12h18"></path><path d="M15 3v18"></path><circle cx="12" cy="12" r="3" opacity="0.3"></circle><path d="M12 9l3 3-3 3-3-3z"></path></svg>`
    },
    {
        id: '11',
        href: "https://www.capcut.com/my-edit?start_tab=video",
        name: "CapCut",
        colorClass: "text-cyan-400 hover:text-cyan-300",
        iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" fill="none"><defs><linearGradient id="capcut-grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#00f2fe" /><stop offset="100%" stop-color="#4facfe" /></linearGradient></defs><path d="M24.189 6.442V2.671l-4.535 2.383V4.91c.002-1.505-1.078-2.411-2.638-2.411H2.64C.993 2.5 0 3.407 0 4.91V8.72L6.354 12 0 15.316v3.8C0 20.595 1 21.5 2.64 21.5h14.373c1.56 0 2.639-.907 2.639-2.382v-.197l4.536 2.409v-3.828L13.64 12 24.189 6.443zM9.982 13.873l7.797 4.083H2.157l7.825-4.083zm7.741-7.828l-7.742 4.057-7.825-4.057h15.567z" fill="url(#capcut-grad)"/></svg>`
    }
  ],

  aiSidebar: {
    models: [
        { id: 'ai-1', name: 'ChatGPT', href: 'https://chatgpt.com/', colorClass: 'text-teal-400 hover:text-teal-300', iconSvg: '<svg class="w-full h-full fill-current" viewBox="0 0 24 24"><path d="M18,4H6A2,2 0 0,0 4,6V18A2,2 0 0,0 6,20H18A2,2 0 0,0 20,18V6A2,2 0 0,0 18,4M9,8H11V10H9V8M13,8H15V10H13V8M9,12H15V16H9V12Z" /></svg>' },
        { id: 'ai-2', name: 'Qwen', href: 'https://chat.qwen.ai/', colorClass: 'hover:text-purple-500', iconSvg: '<svg class="w-full h-full" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="32" r="28" fill="#8b5cf6"/><text x="32" y="44" fontFamily="Arial, sans-serif" fontSize="32" fontWeight="bold" fill="white" textAnchor="middle">Q</text></svg>' },
        { id: 'ai-3', name: 'Grok', href: 'https://grok.com/', colorClass: 'hover:text-gray-200', iconSvg: '<svg class="w-full h-full fill-none stroke-current stroke-[8]" viewBox="0 0 64 64"><circle cx="32" cy="32" r="26" /><line x1="16" y1="48" x2="48" y2="16" strokeLinecap="round"/></svg>' },
        { id: 'ai-4', name: 'DeepSeek', href: 'https://chat.deepseek.com/', colorClass: 'text-blue-600 hover:text-blue-500', iconSvg: '<svg class="w-full h-full fill-current" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/><path d="M12 6c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zm0 4c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-1 1 1z"/></svg>' },
        { id: 'ai-5', name: 'Claude', href: 'https://claude.ai/new', colorClass: 'text-orange-400 hover:text-orange-300', iconSvg: '<svg class="w-full h-full fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" /></svg>' }
    ],
    quickAccess: [
        { id: 'qa-1', name: 'Rendair', href: 'https://app.rendair.ai/generate/image', colorClass: 'hover:text-teal-400', iconSvg: '<svg class="w-full h-full" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="32" r="28" fill="#4fd1c5"/><text x="32" y="42" fontFamily="Arial, sans-serif" fontSize="28" fontWeight="bold" fill="black" textAnchor="middle">r</text></svg>' },
        { id: 'qa-javer', name: 'Javer Data Center', href: 'https://aistudio.google.com/apps/3a3196da-cb37-40b8-9a5d-48e74634248d?showPreview=true&showAssistant=true', colorClass: 'hover:text-blue-400', iconSvg: '<svg class="w-full h-full" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="javer-dc-grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#3b82f6" /><stop offset="50%" stop-color="#06b6d4" /><stop offset="100%" stop-color="#3b82f6" /></linearGradient></defs><rect x="3" y="3" width="18" height="18" rx="3" stroke="url(#javer-dc-grad)" stroke-width="2" /><line x1="3" y1="9" x2="21" y2="9" stroke="url(#javer-dc-grad)" stroke-width="1.5" /><line x1="3" y1="15" x2="21" y2="15" stroke="url(#javer-dc-grad)" stroke-width="1.5" stroke-dasharray="2 2" /><circle cx="7" cy="6" r="1" fill="#60a5fa" /><circle cx="11" cy="6" r="1" fill="#34d399" /><circle cx="7" cy="12" r="1" fill="#34d399" /><circle cx="11" cy="12" r="1" fill="#60a5fa" /><circle cx="7" cy="18" r="1" fill="#f43f5e" /><circle cx="11" cy="18" r="1" fill="#34d399" /><path d="M17 5v11a3 3 0 0 1-5 2.2" stroke="url(#javer-dc-grad)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>' },
        { id: 'qa-2', name: 'Compresor', href: 'https://aistudio.google.com/apps/drive/1SqLlOs1puc_GGSLIqmhQetfRwL-8hiFK?showAssistant=true&resourceKey=&showPreview=true', colorClass: 'hover:text-yellow-400', iconSvg: '<svg class="w-full h-full fill-none stroke-current stroke-2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14h6m-6 4h6m6-10h4m-4 4h4M4 10l4-4m0 0l4 4m-4-4v12M20 14l-4 4m0 0l-4-4m4 4V6" /></svg>' },
        { id: 'qa-3', name: 'iLovePDF', href: 'https://www.ilovepdf.com/es', colorClass: 'hover:text-red-500', iconSvg: '<svg class="w-full h-full" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><rect width="56" height="56" x="4" y="4" rx="8" fill="currentColor"/><text x="32" y="42" fontFamily="Arial, sans-serif" fontSize="22" fontWeight="bold" fill="#111827" textAnchor="middle">PDF</text></svg>' },
        { id: 'qa-4', name: 'Cotizador', href: 'https://aistudio.google.com/apps/drive/1k2aQBZLy96kILLEDYp5JlJX92eQJUUoJ?showPreview=true&showAssistant=true', colorClass: 'hover:text-lime-500', iconSvg: '<svg class="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>' },
        { id: 'qa-5', name: 'Organizador', href: 'https://aistudio.google.com/apps/drive/1EdmjF7bFOnJwakUISXZlEVDfVm4SOBO3?showAssistant=true&showPreview=true&resourceKey=', colorClass: 'hover:text-purple-400', iconSvg: '<svg class="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><line x1="12" y1="11" x2="12" y2="17"></line><line x1="9" y1="14" x2="15" y2="14"></line></svg>' },
        { id: 'qa-6', name: 'Áreas Municipales', href: 'https://aistudio.google.com/apps/drive/1oRwFCp8iRi3JnKINAWDpd5sye4eYFtXu?showPreview=true&showAssistant=true&resourceKey=', colorClass: 'hover:text-orange-500', iconSvg: '<svg class="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18v-8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8z" /><path d="M3 10a2 2 0 0 1 .7-1.7L12 3l8.3 5.3a2 2 0 0 1 .7 1.7V11H3V10z" /><line x1="9" y1="21" x2="9" y2="11" /><line x1="15" y1="21" x2="15" y2="11" /></svg>' },
        { id: 'qa-7', name: 'Deberes', href: 'https://aistudio.google.com/apps/drive/1hSiVHK6jdb7S9cCUQGAI1dVw7gPPzzVl?showAssistant=true&showPreview=true&resourceKey=', colorClass: 'hover:text-green-500', iconSvg: '<svg class="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" transform="translate(-1, 1)" /></svg>' },
        { id: 'qa-8', name: 'Convertio', href: 'https://convertio.co/es/download/e6b1e34a2e937c3a18305b732b341a602788c1/', colorClass: 'hover:text-red-400', iconSvg: '<svg class="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v12" /><path d="M12 7L8 3L4 7" /><path d="M16 21V9" /><path d="M12 17l4 4l4-4" /></svg>' },
        { id: 'qa-9', name: 'Vectorizar', href: 'https://aistudio.google.com/apps/drive/1MqPBVGYa3rBl2lGs5-8DhKUIltCigjmI?showAssistant=true&showPreview=true&resourceKey=', colorClass: 'hover:text-pink-500', iconSvg: '<svg class="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="M2 2l7.586 7.586" /><circle cx="11" cy="11" r="2" /></svg>' },
        { id: 'qa-10', name: 'Reve', href: 'https://app.reve.com/home', colorClass: 'hover:text-rose-500', iconSvg: '<svg class="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>' },
        { id: 'qa-11', name: 'Sherwin Williams', href: 'https://aistudio.google.com/apps/drive/1us6w9OBHDw-PWZrgIjW1G5ER1QdLTnCD?showAssistant=true&resourceKey=&showPreview=true', colorClass: 'hover:text-blue-500', iconSvg: '<svg class="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" /></svg>' }
    ]
  },
  rightSidebar: [
    {
        id: 'rs-1',
        title: "Imágenes",
        subtitle: "Retoque",
        gradient: "from-pink-400 to-rose-500",
        items: [
            { id: 'rs-1-1', href: "https://aistudio.google.com/apps/drive/1nHX4gWa66Uh3UsHJ_hWK1tBHOlgo-0Q0?showPreview=true&showAssistant=true", name: "Editor Renders", description: "Edición de Renders", colorClass: "hover:text-purple-400", iconSvg: '<svg class="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>' },
            { id: 'rs-1-2', href: "https://aistudio.google.com/apps/drive/1wuKNQoGvg6M3rEoT2hiURnL_V4lyzBkn?showPreview=true&showAssistant=true", name: "Texturas IA", description: "Generador de Texturas", colorClass: "hover:text-amber-400", iconSvg: '<svg class="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><path d="M3 9h18" /><path d="M9 21V9" /></svg>' },
            { id: 'rs-1-3', href: "https://huggingface.co/spaces/multimodalart/qwen-image-multiple-angles-3d-camera", name: "3dcamara", description: "Ángulos múltiples 3D", colorClass: "hover:text-green-400", iconSvg: '<svg class="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a7 7 0 0 1 7.08 7c0 1.27-.33 2.47-.9 3.52L12 22 5.82 12.52A7 7 0 0 1 12 2z"/><circle cx="12" cy="9" r="2.5"/></svg>' },
            { id: 'rs-1-4', href: "https://www.lookx.ai/pc/gc/i2i", name: "Look X", description: "Imagen a Imagen", colorClass: "hover:text-rose-400", iconSvg: '<svg class="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a7 7 0 0 1 7.08 7c0 1.27-.33 2.47-.9 3.52L12 22 5.82 12.52A7 7 0 0 1 12 2z"/><circle cx="12" cy="9" r="2.5"/></svg>' },
            { id: 'rs-1-5', href: "https://www.upscale.media/es/upload", name: "Upscale", description: "Mejorar resolución", colorClass: "hover:text-cyan-400", iconSvg: '<svg class="w-full h-full" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="upscaleGradientSide" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor="#3b82f6" /><stop offset="100%" stopColor="#14b8a6" /></linearGradient></defs><rect x="16" y="16" width="40" height="40" rx="4" fill="url(#upscaleGradientSide)" fillOpacity="0.5"/><rect x="8" y="8" width="28" height="28" rx="4" fill="url(#upscaleGradientSide)"/><path d="M38 30 L46 22 M46 22 L38 22 M46 22 L46 30" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></svg>' },
            { id: 'rs-1-6', href: "https://www.watermarkremover.io/es", name: "WatermarkRemover", description: "Elimina marcas", colorClass: "hover:text-blue-400", iconSvg: '<svg class="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>' },
            { id: 'rs-1-7', href: "https://app.reve.com/home", name: "Reve", description: "Plataforma de edición", colorClass: "hover:text-rose-500", iconSvg: '<svg class="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>' },
            { id: 'rs-1-8', href: "https://www.seaart.ai/es/create/image?id=f8172af6747ec762bcf847bd60fdf7cd&model_ver_no=2c39fe1f-f5d6-4b50-a273-499677f2f7a9", name: "SeaArt", description: "Arte con IA", colorClass: "hover:text-indigo-400", iconSvg: '<svg class="w-full h-full" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="32" r="28" fill="currentColor"/><text x="32" y="44" fontFamily="Arial, sans-serif" fontSize="32" fontWeight="bold" fill="black" textAnchor="middle">S</text></svg>' },
            { id: 'rs-1-9', href: "https://deevid.ai/es/ai-avatar", name: "Deevid Avatar", description: "Avatares IA", colorClass: "hover:text-red-400", iconSvg: '<svg class="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>' }
        ]
    },
    {
        id: 'rs-2',
        title: "Video",
        subtitle: "Producción",
        gradient: "from-purple-500 to-indigo-600",
        items: [
            { id: 'rs-2-1', href: "https://digen.ai/es/explore", name: "Digen", description: "Generador de video", colorClass: "hover:text-purple-300", iconSvg: '<svg class="w-full h-full" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="32" r="28" fill="currentColor"/><text x="32" y="44" fontFamily="Arial, sans-serif" fontSize="32" fontWeight="bold" fill="black" textAnchor="middle">D</text></svg>' },
            { id: 'rs-2-2', href: "https://runwayml.com/", name: "Runway", description: "Suite Gen-2", colorClass: "hover:text-yellow-500", iconSvg: '<svg class="w-full h-full" viewBox="0 0 24 24" fill="currentColor"><path d="M5.5 2C3.5 2 2 3.5 2 5.5v13C2 20.5 3.5 22 5.5 22h13c2 0 3.5-1.5 3.5-3.5v-13C22 3.5 20.5 2 18.5 2h-13zM8 7l10 5-10 5V7z"/></svg>' },
            { id: 'rs-2-3', href: "https://lumalabs.ai/dream-machine", name: "Luma", description: "Dream Machine", colorClass: "hover:text-emerald-500", iconSvg: '<svg class="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 16a6 6 0 1 1 6-6 6 6 0 0 1-6 6z" /><path d="M12 8v4l3 3" /></svg>' },
            { id: 'rs-2-4', href: "https://klingai.com/", name: "Kling AI", description: "Generador Video", colorClass: "hover:text-blue-500", iconSvg: '<svg class="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>' },
            { id: 'rs-2-5', href: "https://grok.com/", name: "Grok", description: "Asistente IA", colorClass: "hover:text-gray-300", iconSvg: '<svg class="w-full h-full" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="32" r="26" stroke="currentColor" strokeWidth="8"/><line x1="16" y1="48" x2="48" y2="16" stroke="currentColor" strokeWidth="8" strokeLinecap="round"/></svg>' },
            { id: 'rs-2-6', href: "https://meta.ai/", name: "Meta AI", description: "IA Creativa", colorClass: "hover:text-purple-400", iconSvg: '<svg class="w-full h-full" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="32" r="26" stroke="currentColor" strokeWidth="8" /></svg>' },
            { id: 'rs-2-8', href: "https://www.clicmayores.com/videoflow.html#google_vignette", name: "Editor Click Mayores", description: "Editor Online", colorClass: "hover:text-blue-500", iconSvg: '<svg class="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line><line x1="8.12" y1="8.12" x2="12" y2="12"></line></svg>' }
        ]
    },
    {
        id: 'rs-3',
        title: "Audio",
        subtitle: "Sonido y Voz",
        gradient: "from-green-400 to-teal-500",
        items: [
            { id: 'rs-3-1', href: "https://kyutai.org/tts", name: "Kyutai", description: "Audio a Audio", colorClass: "hover:text-red-400", iconSvg: '<svg class="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 14a4 4 0 1 1 4-4 4 4 0 0 1-4 4z"></path><path d="M12 8v8"></path></svg>' },
            { id: 'rs-3-2', href: "https://suno.com/", name: "Suno", description: "Música IA", colorClass: "hover:text-white", iconSvg: '<svg class="w-full h-full" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="4" fill="black" /></svg>' },
            { id: 'rs-3-3', href: "https://elevenlabs.io/", name: "ElevenLabs", description: "Voces Reales", colorClass: "hover:text-gray-200", iconSvg: '<svg class="w-full h-full" viewBox="0 0 24 24" fill="currentColor"><path d="M4 12v-4a8 8 0 0 1 16 0v4" stroke="currentColor" strokeWidth="2" fill="none" /><rect x="2" y="12" width="4" height="8" rx="1" /><rect x="18" y="12" width="4" height="8" rx="1" /></svg>' },
            { id: 'rs-3-4', href: "https://labs.google/fx/es/tools/music-fx-dj", name: "MusicFX", description: "Google Labs", colorClass: "hover:text-red-500", iconSvg: '<svg class="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>' },
            { id: 'rs-3-5', href: "https://www.udio.com/", name: "Udio", description: "Alta Fidelidad", colorClass: "hover:text-pink-500", iconSvg: '<svg class="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v18M3 12h18" /><circle cx="12" cy="12" r="9" /></svg>' }
        ]
    },
    {
        id: 'rs-4',
        title: "Herramientas",
        subtitle: "Variados",
        gradient: "from-yellow-400 to-orange-500",
        items: [
            { id: 'rs-4-1', href: "https://www.meshy.ai/workspace", name: "Meshy", description: "Generación 3D con IA", colorClass: "hover:text-indigo-400", iconSvg: '<svg class="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-5-14a2 2 0 0 0-3.48 0l-5 14a2 2 0 0 0 1.74 3h10a2 2 0 0 0 1.74-3Z" /><path d="M7 14.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" /></svg>' },
            { id: 'rs-4-2', href: "https://www.hitem3d.ai/create", name: "Hitem3D", description: "Modelos 3D", colorClass: "hover:text-purple-500", iconSvg: '<svg class="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>' },
            { id: 'rs-4-3', href: "https://gamma.app/", name: "Gamma", description: "Presentaciones IA", colorClass: "hover:text-blue-500", iconSvg: '<svg class="w-full h-full" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="32" r="28" fill="currentColor"/><text x="32" y="44" fontFamily="Arial, sans-serif" fontSize="32" fontWeight="bold" fill="white" textAnchor="middle">G</text></svg>' },
            { id: 'rs-4-4', href: "https://www.canva.com/", name: "Canva", description: "Diseño gráfico", colorClass: "hover:text-cyan-400", iconSvg: '<svg class="w-full h-full" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="32" r="28" fill="currentColor"/><text x="32" y="44" fontFamily="Arial, sans-serif" fontSize="32" fontWeight="bold" fill="#111827" textAnchor="middle">C</text></svg>' },
            { id: 'rs-4-5', href: "https://aidemos.meta.com/segment-anything/gallery/" , name: "Sam", description: "Segment Anything", colorClass: "hover:text-indigo-500", iconSvg: '<svg class="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>' },
            { id: 'rs-4-6', href: "https://magiceraser.org/es/remove-watermark-from-video/", name: "Magic Eraser", description: "Quita marcas", colorClass: "hover:text-orange-400", iconSvg: '<svg class="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 5H9l-7 7 7 7h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Z" /><line x1="18" y1="9" x2="12" y2="15" /><line x1="12" y1="9" x2="18" y2="15" /></svg>' },
            { id: 'rs-4-7', href: "https://www.clicmayores.com/xprompt.html", name: "Prompt Video", description: "Herramienta", colorClass: "hover:text-orange-500", iconSvg: '<svg class="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>' },
            { id: 'rs-4-8', href: "https://www.clicmayores.com/x.html", name: "Click Mayores", description: "Recursos", colorClass: "hover:text-emerald-500", iconSvg: '<svg class="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 14a4 4 0 1 1 4-4 4 4 0 0 1-4 4z" /><path d="M10 9l5 3-5 3z" /></svg>' }
        ]
    }
  ],
  googleDock: [
    { id: 'gd-1', name: "Gemini", href: "https://gemini.google.com/app", colorClass: "bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-red-600/20 border border-white/10 shadow-[0_0_15px_rgba(155,114,203,0.2)]", iconSvg: '<svg viewBox="0 0 24 24" class="w-full h-full filter drop-shadow-[0_0_5px_rgba(155,114,203,0.3)]"><defs><linearGradient id="gemini-dock-item" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#4E87F5" /><stop offset="50%" stopColor="#9B72CB" /><stop offset="100%" stopColor="#D96570" /></linearGradient></defs><path fill="url(#gemini-dock-item)" d="M12 2L14.8 8.6L21.4 11.4L14.8 14.2L12 20.8L9.2 14.2L2.6 11.4L9.2 8.6L12 2Z" /></svg>' },
    { id: 'gd-2', name: "AI Studio", href: "https://aistudio.google.com/", colorClass: "text-blue-400", iconSvg: '<svg viewBox="0 0 24 24" class="w-8 h-8 fill-current"><path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 17.404L18 18.333l-.259-.929a2.5 2.5 0 00-1.714-1.714l-.929-.259.929-.259a2.5 2.5 0 001.714-1.714l.259-.929.259.929a2.5 2.5 0 001.714 1.714l.929.259-.929.259a2.5 2.5 0 00-1.714 1.714z" /></svg>' },
    { id: 'gd-3', name: "Búsqueda", href: "https://www.google.com", colorClass: "text-blue-400", iconSvg: '<svg viewBox="0 0 24 24" class="w-8 h-8 fill-current"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" /></svg>' },
    { id: 'gd-4', name: "Gmail", href: "https://mail.google.com", colorClass: "text-red-500", iconSvg: '<svg viewBox="0 0 24 24" class="w-8 h-8 fill-current"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" /></svg>' },
    { id: 'gd-5', name: "Drive", href: "https://drive.google.com", colorClass: "text-green-500", iconSvg: '<svg viewBox="0 0 87.3 78" class="w-8 h-8"><path d="m6.6 66.85 25.3-43.8 25.3 43.8H6.6z" fill="#0066da" opacity=".3"/><path d="M23.1 27H62l18.7 32.4H42L23.1 27z" fill="#00ac47"/><path d="m55.2 6.6 25.3 43.8H42.7L17.4 6.6h37.8z" fill="#ea4335"/><path d="m6.6 66.85 18.9-32.8 18.9 32.8H6.6z" fill="#00832d"/><path d="m53.55 10.95-18.9 32.8h37.8l-18.9-32.8z" fill="#2684fc"/><path d="m39.15 63.3 12.6-21.8h25.2l-12.6 21.8h-25.2z" fill="#ffba00"/></svg>' },
    { id: 'gd-7', name: "Calendar", href: "https://calendar.google.com", colorClass: "text-blue-600", iconSvg: '<svg viewBox="0 0 24 24" class="w-8 h-8 fill-current"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2zm-7 5h5v5h-5v-5z"/></svg>' },
    { id: 'gd-8', name: "Photos", href: "https://photos.google.com", colorClass: "text-red-500", iconSvg: '<svg viewBox="0 0 24 24" class="w-8 h-8"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" fill="currentColor"/></svg>' },
    { id: 'gd-9', name: "Maps", href: "https://maps.google.com", colorClass: "text-green-500", iconSvg: '<svg viewBox="0 0 24 24" class="w-8 h-8 fill-current"><path d="M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.11V5l6 2.11V19z"/></svg>' },
    { id: 'gd-10', name: "Earth", href: "https://earth.google.com/web/", colorClass: "text-blue-400", iconSvg: '<svg viewBox="0 0 24 24" class="w-8 h-8 fill-current"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>' },
    { id: 'gd-11', name: "YouTube", href: "https://www.youtube.com/", colorClass: "text-red-600", iconSvg: '<svg viewBox="0 0 24 24" class="w-8 h-8 fill-current"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>' },
    { id: 'gd-12', name: "NotebookLM", href: "https://notebooklm.google.com/", colorClass: "text-emerald-400", iconSvg: '<svg viewBox="0 0 24 24" class="w-8 h-8 fill-none stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>' },
    { id: 'gd-14', name: "Mixboard", href: "https://labs.google.com/mixboard/welcome", colorClass: "text-fuchsia-500", iconSvg: '<svg viewBox="0 0 24 24" class="w-8 h-8 fill-none stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /></svg>' },
    { id: 'gd-15', name: "Stitch", href: "https://stitch.withgoogle.com/?pli=1", colorClass: "text-pink-500", iconSvg: '<svg viewBox="0 0 24 24" class="w-8 h-8 fill-none stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>' },
    { id: 'gd-17', name: "Word", href: "https://docs.google.com", colorClass: "text-blue-500", iconSvg: '<svg viewBox="0 0 24 24" class="w-8 h-8 fill-blue-500"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>' },
    { id: 'gd-18', name: "Excel", href: "https://sheets.google.com", colorClass: "text-green-600", iconSvg: '<svg viewBox="0 0 24 24" class="w-8 h-8 fill-green-500"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>' },
    { id: 'gd-19', name: "PowerPoint", href: "https://slides.google.com", colorClass: "text-yellow-500", iconSvg: '<svg viewBox="0 0 24 24" class="w-8 h-8 fill-yellow-500"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 15c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2zm3-6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2zm3 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2z"/></svg>' }
  ],
  usefulTools: [
    {
        id: 'ut-1',
        title: 'Herramientas Útiles',
        gradient: 'from-yellow-400 to-orange-500',
        iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>',
        items: [
            { id: 'ut-1-1', name: "Magic Eraser", description: "Quita marcas de agua y objetos de videos.", href: "https://magiceraser.org/es/remove-watermark-from-video/", colorClass: "hover:shadow-orange-500/20", iconSvg: '<svg class="w-full h-full text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 5H9l-7 7 7 7h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Z" /><line x1="18" y1="9" x2="12" y2="15" /><line x1="12" y1="9" x2="18" y2="15" /></svg>' },
            { id: 'ut-1-2', name: "WatermarkRemover", description: "Elimina marcas de agua de imágenes gratis.", href: "https://www.watermarkremover.io/es", colorClass: "hover:shadow-blue-500/20", iconSvg: '<svg class="w-full h-full text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>' },
            { id: 'ut-1-3', name: "Letras (GenType)", description: "Crea alfabetos personalizados con IA.", href: "https://labs.google/gentype", colorClass: "hover:shadow-yellow-500/20", iconSvg: '<svg class="w-full h-full text-yellow-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7V4h16v3" /><path d="M9 20h6" /><path d="M12 4v16" /></svg>' },
            { id: 'ut-1-4', name: "Vectorizar", description: "Convierte imágenes a vectores.", href: "https://aistudio.google.com/apps/drive/1MqPBVGYa3rBl2lGs5-8DhKUIltCigjmI?showAssistant=true&showPreview=true&resourceKey=", colorClass: "hover:shadow-pink-500/20", iconSvg: '<svg class="w-full h-full text-pink-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="M2 2l7.586 7.586" /><circle cx="11" cy="11" r="2" /></svg>' }
        ]
    },
    {
        id: 'ut-2',
        title: 'Editores de Imágenes',
        gradient: 'from-pink-400 to-rose-600',
        iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>',
        items: []
    },
    {
        id: 'ut-3',
        title: 'Editores de Video',
        gradient: 'from-purple-400 to-indigo-600',
        iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>',
        items: []
    },
    {
        id: 'ut-4',
        title: 'Editores de Audio',
        gradient: 'from-cyan-400 to-blue-600',
        iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>',
        items: []
    },
    {
        id: 'ut-5',
        title: '3D',
        gradient: 'from-indigo-400 to-blue-600',
        iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /></svg>',
        items: [
            { id: 'ut-5-1', name: "Thingiverse", description: "Modelos 3D gratis", href: "https://www.thingiverse.com/", colorClass: "hover:shadow-blue-500/20", iconSvg: '<svg class="w-full h-full text-blue-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>' },
            { id: 'ut-5-2', name: "Cults3D", description: "Modelos 3D premium y gratis", href: "https://cults3d.com/es", colorClass: "hover:shadow-purple-500/20", iconSvg: '<svg class="w-full h-full text-purple-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z"/></svg>' },
            { id: 'ut-5-3', name: "MyMiniFactory", description: "Modelos 3D de alta calidad", href: "https://www.myminifactory.com/", colorClass: "hover:shadow-green-500/20", iconSvg: '<svg class="w-full h-full text-green-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 19h20L12 2zm0 4.83L18.17 17H5.83L12 6.83z"/></svg>' },
            { id: 'ut-5-4', name: "Thangs", description: "Buscador de modelos 3D", href: "https://thangs.com/", colorClass: "hover:shadow-orange-500/20", iconSvg: '<svg class="w-full h-full text-orange-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7v10l10 5 10-5V7l-10-5zm0 2.18L19.82 8 12 11.82 4.18 8 12 4.18zM4 15.18l7 3.5v-7.18l-7-3.5v7.18zm16 0l-7 3.5v-7.18l7-3.5v7.18z"/></svg>' },
            { id: 'ut-5-5', name: "MakerWorld", description: "Diseños de la comunidad Bambu Lab", href: "https://makerworld.com/es", colorClass: "hover:shadow-teal-500/20", iconSvg: '<svg class="w-full h-full text-teal-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>' }
        ]
    },
    {
        id: 'ut-6',
        title: 'Programación',
        gradient: 'from-emerald-400 to-cyan-600',
        iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>',
        items: [
            { id: 'ut-6-1', name: "Bolt", description: "Asistente de código", href: "https://bolt.new/", colorClass: "hover:shadow-emerald-500/20", iconSvg: '<svg class="w-full h-full text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>' },
            { id: 'ut-6-2', name: "Lovable", description: "Desarrollo con IA", href: "https://lovable.dev/", colorClass: "hover:shadow-cyan-500/20", iconSvg: '<svg class=\"w-full h-full text-cyan-400\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" strokeWidth=\"2\" strokeLinecap=\"round\" strokeLinejoin=\"round\"><path d=\"M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z\"></path></svg>' },
            { id: 'ut-6-3', name: "V0", description: "Generador de UI", href: "https://v0.dev/", colorClass: "hover:shadow-blue-500/20", iconSvg: '<svg class=\"w-full h-full text-blue-500\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" strokeWidth=\"2\" strokeLinecap=\"round\" strokeLinejoin=\"round\"><path d=\"M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6\"></path></svg>' },
            { id: 'ut-6-4', name: "Cursor", description: "Editor de código IA", href: "https://www.cursor.com/", colorClass: "hover:shadow-indigo-500/20", iconSvg: '<svg class=\"w-full h-full text-indigo-400\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" strokeWidth=\"2\" strokeLinecap=\"round\" strokeLinejoin=\"round\"><path d=\"M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z\"></path><path d=\"M13 13l6 6\"></path></svg>' }
        ]
    },
    {
        id: 'ut-7',
        title: 'Multiherramientas',
        gradient: 'from-orange-400 to-red-600',
        iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" /></svg>',
        items: []
    },
    {
        id: 'ut-8',
        title: 'Google',
        gradient: 'from-blue-400 to-red-500',
        iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>',
        items: []
    },
    {
        id: 'ut-9',
        title: 'Varios',
        gradient: 'from-slate-400 to-slate-600',
        iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>',
        items: []
    }
  ]
};

interface LinkContextType {
  config: AppConfig;
  updateConfig: (newConfig: AppConfig | ((prev: AppConfig) => AppConfig)) => void;
  saveConfigToFile: () => void;
  loadConfigFromFile: (file: File) => void;
  saveAsDefault: () => Promise<void>;
  saveToSupabase: (configOverride?: AppConfig) => Promise<void>;
  resetToDefaults: () => void;
  fetchConfigFromSupabaseManual: () => Promise<void>;
  isEditing: boolean;
  toggleEditing: () => void;
  configFilename: string;
  setConfigFilename: (name: string) => void;
  nutritionData: NutritionData;
  updateNutritionData: (newData: NutritionData | ((prev: NutritionData) => NutritionData)) => void;
  saveNutritionDataToSupabase: (showToast?: boolean) => Promise<void>;
  fetchNutritionDataFromSupabase: (showToast?: boolean) => Promise<void>;
  saveNotesToSupabase: (notes: Note[], updatedAt?: number) => Promise<void>;
  fetchNotesFromSupabase: () => Promise<{ notes: Note[], updatedAt?: number } | null>;
  saveShoppingToSupabase: (notes: Note[], updatedAt?: number) => Promise<void>;
  fetchShoppingFromSupabase: () => Promise<{ notes: Note[], updatedAt?: number } | null>;
  saveEstudiosToSupabase: (notes: Note[], updatedAt?: number) => Promise<void>;
  fetchEstudiosFromSupabase: () => Promise<{ notes: Note[], updatedAt?: number } | null>;
  updateNotifications: (newNotifications: AppNotification[]) => void;
  isShoppingEditMode: boolean;
  setShoppingEditMode: (val: boolean) => void;
  isNotesEditMode: boolean;
  setNotesEditMode: (val: boolean) => void;
  isEstudiosEditMode: boolean;
  setEstudiosEditMode: (val: boolean) => void;
  googleApiConfig: GoogleApiConfig | null;
  updateGoogleApiConfig: (config: GoogleApiConfig | null) => void;
}

const LinkContext = createContext<LinkContextType | undefined>(undefined);

const salvageMalformedNotes = (text: string, defaultCategory: string): { notes: Note[], updatedAt?: number } | null => {
  try {
    console.warn(`Attempting to salvage malformed JSON in ${defaultCategory}.json...`);
    let parsedNotes: Note[] = [];
    let salvagedText = "";

    // Try to extract the notes array using regex
    const notesRegex = /"notes"\s*:\s*(\[(?:[^[\]]|\[(?:[^[\]]|\[[^[\]]*\])*\])*\])/;
    const match = text.match(notesRegex);
    if (match) {
      try {
        parsedNotes = JSON.parse(match[1]);
      } catch (e2) {
        console.error("Could not parse extracted notes array");
      }
    } else {
      // Maybe the file is just an array
      const arrayRegex = /^(\[(?:[^[\]]|\[(?:[^[\]]|\[[^[\]]*\])*\])*\])/;
      const arrayMatch = text.trim().match(arrayRegex);
      if (arrayMatch) {
        try {
          parsedNotes = JSON.parse(arrayMatch[1]);
        } catch (e3) {
          console.error("Could not parse extracted array");
        }
      }
    }

    // Try to find the text the user added.
    const lastBrace = text.lastIndexOf('}');
    const lastBracket = text.lastIndexOf(']');
    const lastValidChar = Math.max(lastBrace, lastBracket);
    
    if (lastValidChar !== -1) {
      const afterLastValid = text.substring(lastValidChar + 1).trim();
      if (afterLastValid) {
        salvagedText = afterLastValid;
      }
    }
    
    if (!salvagedText) {
      // Maybe they added it inside the brace, after updatedAt
      const afterUpdatedAt = text.split(/"updatedAt"\s*:\s*\d+/);
      if (afterUpdatedAt.length > 1) {
        let potentialText = afterUpdatedAt[1].replace(/}/g, '').trim();
        potentialText = potentialText.replace(/^,/, '').trim(); // remove leading comma
        potentialText = potentialText.replace(/^"/, '').replace(/"$/, '').trim(); // remove quotes
        if (potentialText) {
          salvagedText = potentialText;
        }
      }
    }

    if (salvagedText) {
      const cleanText = salvagedText.replace(/\\n/g, ' ').trim();
      if (cleanText) {
        parsedNotes.push({
          id: crypto.randomUUID(),
          title: cleanText,
          text: '',
          completed: false,
          category: defaultCategory as any,
          createdAt: Date.now()
        });
      }
    }

    if (parsedNotes.length === 0 && text.trim()) {
      // If we couldn't parse anything at all, just turn the whole file into a single note!
      // This guarantees we don't lose their data.
      parsedNotes.push({
        id: crypto.randomUUID(),
        title: "Contenido recuperado (Error de formato)",
        text: text,
        completed: false,
        category: defaultCategory as any,
        createdAt: Date.now()
      });
    }

    if (parsedNotes.length > 0) {
      // Deduplicate
      const seen = new Set();
      const uniqueNotes = parsedNotes.filter(note => {
        if (!note.id) note.id = crypto.randomUUID();
        if (seen.has(note.id)) return false;
        seen.add(note.id);
        return true;
      });
      return { notes: uniqueNotes, updatedAt: Date.now() };
    }
    
    return null;
  } catch (e) {
    console.error('Failed to salvage JSON:', e);
    return null;
  }
};

export const LinkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<AppConfig>(INITIAL_CONFIG);
  const [isLoaded, setIsLoaded] = useState(false);
  const configRef = useRef<AppConfig>(config);
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  const [isEditing, setIsEditing] = useState(false);
  const [isShoppingEditMode, setShoppingEditMode] = useState(false);
  const [isNotesEditMode, setNotesEditMode] = useState(false);
  const [isEstudiosEditMode, setEstudiosEditMode] = useState(false);

  const [googleApiConfig, setGoogleApiConfigState] = useState<GoogleApiConfig | null>(() => {
    try {
      const stored = localStorage.getItem('googleApiConfig');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const updateGoogleApiConfig = (newConfig: GoogleApiConfig | null) => {
    setGoogleApiConfigState(newConfig);
    if (newConfig) {
      localStorage.setItem('googleApiConfig', JSON.stringify(newConfig));
      const updatedConfig = { ...configRef.current, googleApiConfig: newConfig };
      setConfig(updatedConfig);
      saveToSupabase(updatedConfig).catch(err => console.error("Error saving googleApiConfig to Supabase:", err));
    } else {
      localStorage.removeItem('googleApiConfig');
      const updatedConfig = { ...configRef.current };
      delete updatedConfig.googleApiConfig;
      setConfig(updatedConfig);
      saveToSupabase(updatedConfig).catch(err => console.error("Error clearing googleApiConfig from Supabase:", err));
    }
  };

  const [configFilename, setConfigFilenameState] = useState(() => {
    return localStorage.getItem('supabaseConfigFilename') || 'rembrandt_config.json';
  });
  const [nutritionData, setNutritionData] = useState<NutritionData>({ profile: {}, logs: [] });
  const nutritionDataRef = useRef<NutritionData>(nutritionData);
  useEffect(() => {
    nutritionDataRef.current = nutritionData;
  }, [nutritionData]);

  const fetchNutritionDataFromSupabase = React.useCallback(async (showToast = false) => {
    try {
      const { data, error } = await supabase
        .storage
        .from('savejson')
        .download('nutricion_remb.json');
        
      if (error) {
        if (error.message?.includes('Object not found') || error.name === 'StorageApiError') {
          const localData = localStorage.getItem('nutricion_remb');
          if (localData) setNutritionData(JSON.parse(localData));
          return;
        }
        throw error;
      }
      
      if (data) {
        const text = await data.text();
        const json = JSON.parse(text);
        setNutritionData(json);
        localStorage.setItem('nutricion_remb', JSON.stringify(json));
        if (showToast) toast.success('Datos de nutrición cargados desde la nube');
      }
    } catch (error) {
      console.error('Error fetching nutrition data:', error);
      const localData = localStorage.getItem('nutricion_remb');
      if (localData) setNutritionData(JSON.parse(localData));
      if (showToast) toast.error('Error al cargar datos de nutrición');
    }
  }, []);

  const updateNotifications = React.useCallback((newNotifications: AppNotification[]) => {
    setConfig(prev => ({ ...prev, notifications: newNotifications }));
  }, []);

  const setConfigFilename = (name: string) => {
    setConfigFilenameState(name);
    localStorage.setItem('supabaseConfigFilename', name);
  };

  // Load from Supabase on mount
  useEffect(() => {
    fetchNutritionDataFromSupabase();

    const fetchConfigFromSupabase = async () => {
      try {
        console.log(`Fetching config ${configFilename} from Supabase...`);
        
        const { data, error } = await supabase
          .storage
          .from('savejson')
          .download(configFilename);

        if (error) {
            if (error.message?.includes('Object not found') || error.name === 'StorageApiError') {
                console.log('No remote config found in Supabase, falling back to local storage.');
                return; // Exit early, let the localStorage useEffect handle it
            }
            console.error('Error downloading config:', error);
            throw error;
        }

        console.log('Config downloaded, parsing...');

        const text = await data.text();
        const json = JSON.parse(text);
        console.log('Config fetched from Supabase:', json);

        let finalConfig = json;
        let localParsed: any = null;

        // Check if local config is newer
        const savedConfig = localStorage.getItem('appLinksConfig');
        if (savedConfig) {
          try {
            localParsed = JSON.parse(savedConfig);
            // If local is newer, keep local and sync to Supabase
            if (localParsed.updatedAt && (!json.updatedAt || localParsed.updatedAt > json.updatedAt)) {
              console.log('Local config is newer than Supabase config. Keeping local version.');
              finalConfig = localParsed;
            }
          } catch (e) {
            console.error('Error comparing local and remote config:', e);
          }
        }

        // Migration logic (same as localStorage)
        if (!finalConfig.usefulTools || !Array.isArray(finalConfig.usefulTools)) {
          finalConfig.usefulTools = INITIAL_CONFIG.usefulTools;
        }

        if (!finalConfig.googleDock || !Array.isArray(finalConfig.googleDock)) {
          finalConfig.googleDock = INITIAL_CONFIG.googleDock;
        }
        
        // Ensure commands exist
        if (!finalConfig.commands || !Array.isArray(finalConfig.commands)) {
          finalConfig.commands = [];
        }

        // Ensure calendarEvents exist
        if (!finalConfig.calendarEvents || !Array.isArray(finalConfig.calendarEvents)) {
          finalConfig.calendarEvents = [];
        }

        // Ensure calendarTokens exist
        if (!finalConfig.calendarTokens || !Array.isArray(finalConfig.calendarTokens)) {
          finalConfig.calendarTokens = [];
        }

        // Ensure notes exist
        if (!finalConfig.notes || !Array.isArray(finalConfig.notes)) {
          finalConfig.notes = [];
        } else {
          // Migration: Add category to existing notes
          finalConfig.notes = finalConfig.notes.map((n: any) => ({ ...n, category: n.category || 'notas' }));
        }
        
        // Migration: Tabs
        if (!finalConfig.tabs || !Array.isArray(finalConfig.tabs)) {
          finalConfig.tabs = INITIAL_TABS;
        } else {
          // Remove Noticias tab if present
          finalConfig.tabs = finalConfig.tabs.filter((t: any) => t.id !== 'dashboard');
          
          // Force new labels
          finalConfig.tabs = finalConfig.tabs.map((t: any) => {
            if (t.id === 'email-gen') return { ...t, label: 'Email' };
            if (t.id === 'video-gen') return { ...t, label: 'Video' };
            return t;
          });

          if (!finalConfig.tabs.find((t: any) => t.componentKey === 'Generador de Video')) {
            const videoTab = INITIAL_TABS.find(t => t.componentKey === 'Generador de Video');
            if (videoTab) {
              finalConfig.tabs.push(videoTab);
            }
          }
        }

        // Restored linksBar items migration
        if (finalConfig.linksBar && Array.isArray(finalConfig.linksBar)) {
          const missingLinks = INITIAL_CONFIG.linksBar.filter(initialLink => 
            !finalConfig.linksBar.find((l: any) => l.name === initialLink.name)
          );
          
          if (missingLinks.length > 0) {
            finalConfig.linksBar = [...finalConfig.linksBar, ...missingLinks];
          }
        }

        // Ensure credenciales and estudios exist
        if (!finalConfig.credenciales || !Array.isArray(finalConfig.credenciales)) {
          finalConfig.credenciales = [];
        }
        if (!finalConfig.estudios || !Array.isArray(finalConfig.estudios)) {
          finalConfig.estudios = [];
        }
        if (!finalConfig.news || !Array.isArray(finalConfig.news)) {
          finalConfig.news = [];
        }
        if (!finalConfig.finanzasNews || !Array.isArray(finalConfig.finanzasNews)) {
          finalConfig.finanzasNews = [];
        }
        if (!finalConfig.aiTutorials || !Array.isArray(finalConfig.aiTutorials)) {
          finalConfig.aiTutorials = [];
        }
        if (!finalConfig.notifications) {
          finalConfig.notifications = [];
        }
        if (!finalConfig.lastNotificationCheck) {
          finalConfig.lastNotificationCheck = '';
        }
        if (typeof finalConfig.memoria_ia === 'string') {
          finalConfig.memoria_ia = {
            perfil: "",
            estilo: "",
            laboral: "",
            personal: finalConfig.memoria_ia
          };
        } else if (!finalConfig.memoria_ia) {
          finalConfig.memoria_ia = INITIAL_CONFIG.memoria_ia;
        }

        if (finalConfig.usefulTools && Array.isArray(finalConfig.usefulTools)) {
          const section3D = finalConfig.usefulTools.find((s: any) => s.id === 'ut-5');
          if (section3D) {
            if (section3D.title === '3D') section3D.title = 'Impresión 3D';
            const default3D = INITIAL_CONFIG.usefulTools.find(s => s.id === 'ut-5')?.items || [];
            default3D.forEach(defaultItem => {
              if (!section3D.items.find((l: any) => l.name === defaultItem.name)) {
                section3D.items.push(defaultItem);
              }
            });
            const mwItem = section3D.items.find((l: any) => l.name === 'MakerWorld');
            if (mwItem) {
              mwItem.href = 'https://makerworld.com/es';
            }
          }
        }

        if (finalConfig.aiSidebar && finalConfig.aiSidebar.quickAccess) {
          const hasJaver = finalConfig.aiSidebar.quickAccess.some((l: any) => l.name === 'Javer Data Center' || l.href.includes('3a3196da-cb37-40b8-9a5d-48e74634248d'));
          if (!hasJaver) {
            const javerLink = INITIAL_CONFIG.aiSidebar.quickAccess.find(l => l.name === 'Javer Data Center');
            if (javerLink) {
              const compIndex = finalConfig.aiSidebar.quickAccess.findIndex((l: any) => l.name === 'Compresor');
              if (compIndex !== -1) {
                finalConfig.aiSidebar.quickAccess.splice(compIndex, 0, javerLink);
              } else {
                finalConfig.aiSidebar.quickAccess.unshift(javerLink);
              }
            }
          }
        }

        // Migration for notes into config
        console.log('Checking for notes in separate files...');
        try {
          const [remoteNotesData, remoteShoppingData, remoteEstudiosData] = await Promise.all([
            fetchNotesFromSupabase().catch(() => null),
            fetchShoppingFromSupabase().catch(() => null),
            fetchEstudiosFromSupabase().catch(() => null)
          ]);

          let currentNotes: Note[] = finalConfig.notes || [];
          let needsUpdate = false;

          // Merge local googleApiConfig into Supabase config if missing
          let localGoogleApiConfig: GoogleApiConfig | null = null;
          try {
            const stored = localStorage.getItem('googleApiConfig');
            if (stored) localGoogleApiConfig = JSON.parse(stored);
          } catch (e) {
            console.error('Error parsing local googleApiConfig:', e);
          }

          if (!finalConfig.googleApiConfig && localGoogleApiConfig) {
            finalConfig.googleApiConfig = localGoogleApiConfig;
            needsUpdate = true;
          } else if (finalConfig.googleApiConfig) {
            setGoogleApiConfigState(finalConfig.googleApiConfig);
            localStorage.setItem('googleApiConfig', JSON.stringify(finalConfig.googleApiConfig));
          }

          const mergeNotes = (remoteData: { notes: Note[], updatedAt?: number } | null, categories: string[]) => {
            if (!remoteData) return;
            const { notes: remoteNotes } = remoteData;
            
            // Ensure all remote notes have an ID and a valid category
            remoteNotes.forEach(n => {
              if (!n.id) n.id = crypto.randomUUID();
              if (!n.category || !categories.includes(n.category)) {
                n.category = categories[0] as any;
              }
            });

            // Remove existing notes of these categories
            currentNotes = currentNotes.filter(n => !categories.includes(n.category));
            
            // Add all notes from the remote file
            currentNotes.push(...remoteNotes);
            needsUpdate = true;
          };

          mergeNotes(remoteNotesData, ['notas', 'recientes']);
          mergeNotes(remoteShoppingData, ['compras']);
          mergeNotes(remoteEstudiosData, ['estudios']);

          if (needsUpdate || !finalConfig.notesMigrated) {
            finalConfig.notes = currentNotes;
            finalConfig.notesMigrated = true;
            finalConfig.updatedAt = Date.now(); // Mark as updated
            needsUpdate = true;
          }

          if (needsUpdate || finalConfig === localParsed) {
            saveToSupabase(finalConfig).catch(err => console.error("Syncing merged config to Supabase failed:", err));
          }
        } catch (error) {
          console.error('Error during notes migration/sync:', error);
        }

        setConfig(finalConfig);
        setIsLoaded(true);
        localStorage.setItem('appLinksConfig', JSON.stringify(finalConfig));

        // Success toast
        toast.success('Configuración cargada de Supabase');

      } catch (error: any) {
        console.error('Error processing Supabase config:', error);
        // Optional: Show toast for error
        toast.error(`Error Supabase: ${error.message || 'Unknown error'}`);
      }
    };

    fetchConfigFromSupabase();
  }, [configFilename]);

  // Load from localStorage on mount
  useEffect(() => {
    const savedConfig = localStorage.getItem('appLinksConfig');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        
        // Check version - if missing or old, just update it instead of resetting
        if (!parsed.version || parsed.version < 1) {
          console.log("Config version mismatch or missing. Updating to current version.");
          parsed.version = INITIAL_CONFIG.version;
        }

        if (parsed && typeof parsed === 'object') {
          // Ensure tabs exist
          if (!parsed.tabs || !Array.isArray(parsed.tabs)) {
            parsed.tabs = INITIAL_TABS;
          } else {
            if (!parsed.tabs.find((t: any) => t.componentKey === 'Generador de Video')) {
              const videoTab = INITIAL_TABS.find(t => t.componentKey === 'Generador de Video');
              if (videoTab) {
                parsed.tabs.push(videoTab);
              }
            }
          }
          // Ensure usefulTools exist and have the new sections
          if (!parsed.usefulTools || !Array.isArray(parsed.usefulTools)) {
            parsed.usefulTools = INITIAL_CONFIG.usefulTools;
          } else {
            // Merge missing sections from INITIAL_CONFIG
            const existingIds = new Set(parsed.usefulTools.map((s: any) => s.id));
            INITIAL_CONFIG.usefulTools.forEach(section => {
              if (!existingIds.has(section.id)) {
                parsed.usefulTools.push(section);
              }
            });
          }
          // Ensure commands exist
          if (!parsed.commands || !Array.isArray(parsed.commands)) {
            parsed.commands = [];
          }

          // Ensure calendarEvents exist
          if (!parsed.calendarEvents || !Array.isArray(parsed.calendarEvents)) {
            parsed.calendarEvents = [];
          }

          // Ensure calendarTokens exist
          if (!parsed.calendarTokens || !Array.isArray(parsed.calendarTokens)) {
            parsed.calendarTokens = [];
          }

          // Ensure notes exist
          if (!parsed.notes || !Array.isArray(parsed.notes)) {
            parsed.notes = [];
          } else {
            // Migration: Add category to existing notes
            parsed.notes = parsed.notes.map((n: any) => ({ ...n, category: n.category || 'notas' }));
          }
          
          // Add missing links to linksBar
          if (parsed.linksBar && Array.isArray(parsed.linksBar)) {
            const missingLinks = INITIAL_CONFIG.linksBar.filter(initialLink => 
              !parsed.linksBar.find((l: any) => l.name === initialLink.name)
            );

            if (missingLinks.length > 0) {
              parsed.linksBar = [...parsed.linksBar, ...missingLinks];
            }
          }

          // Ensure credenciales and estudios exist
          if (!parsed.credenciales) {
            parsed.credenciales = [];
          }
          if (!parsed.estudios) {
            parsed.estudios = [];
          }
          if (!parsed.news) {
            parsed.news = [];
          }
          if (!parsed.aiTutorials) {
            parsed.aiTutorials = [];
          }
          if (!parsed.notifications) {
            parsed.notifications = [];
          }
          if (!parsed.lastNotificationCheck) {
            parsed.lastNotificationCheck = '';
          }
          if (typeof parsed.memoria_ia === 'string') {
             parsed.memoria_ia = {
               perfil: "",
               estilo: "",
               laboral: "",
               personal: parsed.memoria_ia
             };
          } else if (!parsed.memoria_ia) {
             parsed.memoria_ia = INITIAL_CONFIG.memoria_ia;
          }

          if (parsed.usefulTools && Array.isArray(parsed.usefulTools)) {
            const section3D = parsed.usefulTools.find((s: any) => s.id === 'ut-5');
            if (section3D) {
              if (section3D.title === '3D') section3D.title = 'Impresión 3D';
              const default3D = INITIAL_CONFIG.usefulTools.find(s => s.id === 'ut-5')?.items || [];
              default3D.forEach(defaultItem => {
                if (!section3D.items.find((l: any) => l.name === defaultItem.name)) {
                  section3D.items.push(defaultItem);
                }
              });
              const mwItem = section3D.items.find((l: any) => l.name === 'MakerWorld');
              if (mwItem) {
                mwItem.href = 'https://makerworld.com/es';
              }
            }
          }

          if (parsed.aiSidebar && parsed.aiSidebar.quickAccess) {
            const hasJaver = parsed.aiSidebar.quickAccess.some((l: any) => l.name === 'Javer Data Center' || l.href.includes('3a3196da-cb37-40b8-9a5d-48e74634248d'));
            if (!hasJaver) {
              const javerLink = INITIAL_CONFIG.aiSidebar.quickAccess.find(l => l.name === 'Javer Data Center');
              if (javerLink) {
                const compIndex = parsed.aiSidebar.quickAccess.findIndex((l: any) => l.name === 'Compresor');
                if (compIndex !== -1) {
                  parsed.aiSidebar.quickAccess.splice(compIndex, 0, javerLink);
                } else {
                  parsed.aiSidebar.quickAccess.unshift(javerLink);
                }
              }
            }
          }

          setConfig(parsed);
          setIsLoaded(true);
        }
      } catch (e) {
        console.error('Failed to parse saved config', e);
        // If parse fails, reset to defaults
        setConfig(INITIAL_CONFIG);
        localStorage.setItem('appLinksConfig', JSON.stringify(INITIAL_CONFIG));
      }
    }
  }, []);

  // Save to localStorage and Supabase on change
  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem('appLinksConfig', JSON.stringify(config));
    saveToSupabase().catch(err => console.error("Auto-save to Supabase failed:", err));
  }, [config, isLoaded]);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const configSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const retryOperation = async <T extends unknown>(operation: () => Promise<T>, maxRetries = 3, delay = 1000): Promise<T> => {
    let lastError: any;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        const isRetryable = error.status === 502 || error.status === 503 || error.status === 504 || error.message?.includes('fetch');
        if (!isRetryable) throw error;
        console.warn(`Operation failed (attempt ${i + 1}/${maxRetries}), retrying in ${delay}ms...`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }
    throw lastError;
  };

  const saveNotesToSupabase = React.useCallback(async (notesToSave: Note[], updatedAt?: number) => {
    try {
      // Enforce strict structure for 'notas' and 'estudios'
      const seen = new Set();
      const uniqueNotes = notesToSave
        .filter(note => {
          if (seen.has(note.id)) return false;
          seen.add(note.id);
          return true;
        })
        .map(note => {
          return {
            id: note.id,
            text: note.text || '',
            category: note.category === 'recientes' ? 'recientes' : 'notas',
            completed: !!note.completed
          };
        });

      await retryOperation(async () => {
        const content = JSON.stringify({
          notes: uniqueNotes,
          updatedAt: updatedAt || Date.now()
        }, null, 2);
        const { error } = await supabase
          .storage
          .from('savejson')
          .upload('notas.json', content, {
            contentType: 'application/json',
            upsert: true
          });
        if (error) throw error;
      });
      console.log('Notes and Estudios saved to Supabase (notas.json)');
    } catch (error) {
      console.error('Error saving notes to Supabase:', error);
      toast.error('Error al guardar notas en la nube');
    }
  }, []);

  const fetchNotesFromSupabase = React.useCallback(async (): Promise<{ notes: Note[], updatedAt?: number } | null> => {
    try {
      const { data, error } = await supabase
        .storage
        .from('savejson')
        .download('notas.json');

      if (error) {
        if (error.message?.includes('Object not found')) return null;
        throw error;
      }

      const text = await data.text();
      try {
        const parsed = JSON.parse(text);
        const notes = Array.isArray(parsed) ? parsed : (parsed?.notes || []);
        const updatedAt = Array.isArray(parsed) ? undefined : parsed?.updatedAt;
        
        // Deduplicate after fetching
        if (Array.isArray(notes)) {
          const seen = new Set();
          const uniqueNotes = notes.filter(note => {
            if (!note.id) note.id = crypto.randomUUID();
            if (seen.has(note.id)) return false;
            seen.add(note.id);
            return true;
          });
          return { notes: uniqueNotes, updatedAt };
        }
        return { notes: [], updatedAt };
      } catch (e) {
        console.error('Malformed JSON in notas.json:', text);
        return salvageMalformedNotes(text, 'notas');
      }
    } catch (error) {
      console.error('Error fetching notes from Supabase:', error);
      return null;
    }
  }, []);

  const saveShoppingToSupabase = React.useCallback(async (notesToSave: Note[], updatedAt?: number) => {
    try {
      // Deduplicate and enforce strict structure before saving
      const seen = new Set();
      const uniqueNotes = notesToSave
        .filter(note => {
          if (seen.has(note.id)) return false;
          seen.add(note.id);
          return true;
        })
        .map(note => ({
          id: note.id,
          text: note.text,
          category: 'compras' as const,
          completed: !!note.completed,
          quantity: note.quantity || '1 pieza'
        }));

      await retryOperation(async () => {
        const content = JSON.stringify({
          notes: uniqueNotes,
          updatedAt: updatedAt || Date.now()
        }, null, 2);
        const { error } = await supabase
          .storage
          .from('savejson')
          .upload('compras.json', content, {
            contentType: 'application/json',
            upsert: true
          });
        if (error) throw error;
      });
      console.log('Shopping list saved to Supabase (compras.json)');
    } catch (error) {
      console.error('Error saving shopping to Supabase:', error);
      toast.error('Error al guardar lista de compras en la nube');
    }
  }, []);

  const fetchShoppingFromSupabase = React.useCallback(async (): Promise<{ notes: Note[], updatedAt?: number } | null> => {
    try {
      const { data, error } = await supabase
        .storage
        .from('savejson')
        .download('compras.json');

      if (error) {
        if (error.message?.includes('Object not found')) return null;
        throw error;
      }

      const text = await data.text();
      try {
        const parsed = JSON.parse(text);
        const notes = Array.isArray(parsed) ? parsed : (parsed?.notes || []);
        const updatedAt = Array.isArray(parsed) ? undefined : parsed?.updatedAt;

        // Deduplicate after fetching
        if (Array.isArray(notes)) {
          const seen = new Set();
          const uniqueNotes = notes.filter(note => {
            if (!note.id) note.id = crypto.randomUUID();
            if (seen.has(note.id)) return false;
            seen.add(note.id);
            return true;
          });
          return { notes: uniqueNotes, updatedAt };
        }
        return { notes: [], updatedAt };
      } catch (e) {
        console.error('Malformed JSON in compras.json:', text);
        return salvageMalformedNotes(text, 'compras');
      }
    } catch (error) {
      console.error('Error fetching shopping from Supabase:', error);
      return null;
    }
  }, []);

  const saveEstudiosToSupabase = React.useCallback(async (notesToSave: Note[], updatedAt?: number) => {
    try {
      // Enforce strict structure for 'estudios'
      const seen = new Set();
      const uniqueNotes = notesToSave
        .filter(note => {
          if (seen.has(note.id)) return false;
          seen.add(note.id);
          return true;
        })
        .map(note => ({
          id: note.id,
          title: note.title || '',
          text: note.text || '',
          category: 'estudios' as const,
          progress: note.progress || 0,
          link: note.link || '',
          completed: !!note.completed
        }));

      await retryOperation(async () => {
        const content = JSON.stringify({
          notes: uniqueNotes,
          updatedAt: updatedAt || Date.now()
        }, null, 2);
        const { error } = await supabase
          .storage
          .from('savejson')
          .upload('estudios.json', content, {
            contentType: 'application/json',
            upsert: true
          });
        if (error) throw error;
      });
      console.log('Estudios saved to Supabase (estudios.json)');
    } catch (error) {
      console.error('Error saving estudios to Supabase:', error);
      toast.error('Error al guardar estudios en la nube');
    }
  }, []);

  const fetchEstudiosFromSupabase = React.useCallback(async (): Promise<{ notes: Note[], updatedAt?: number } | null> => {
    try {
      const { data, error } = await supabase
        .storage
        .from('savejson')
        .download('estudios.json');

      if (error) {
        if (error.message?.includes('Object not found')) return null;
        throw error;
      }

      const text = await data.text();
      try {
        const parsed = JSON.parse(text);
        const notes = Array.isArray(parsed) ? parsed : (parsed?.notes || []);
        const updatedAt = Array.isArray(parsed) ? undefined : parsed?.updatedAt;

        // Deduplicate after fetching
        if (Array.isArray(notes)) {
          const seen = new Set();
          const uniqueNotes = notes.filter(note => {
            if (!note.id) note.id = crypto.randomUUID();
            if (seen.has(note.id)) return false;
            seen.add(note.id);
            return true;
          });
          return { notes: uniqueNotes, updatedAt };
        }
        return { notes: [], updatedAt };
      } catch (e) {
        console.error('Malformed JSON in estudios.json:', text);
        return salvageMalformedNotes(text, 'estudios');
      }
    } catch (error) {
      console.error('Error fetching estudios from Supabase:', error);
      return null;
    }
  }, []);

  // Sync notes to separate files whenever config.notes changes
  useEffect(() => {
    if (config.notes) {
      const notasNotes = config.notes.filter(n => ['recientes', 'notas'].includes(n.category));
      const shoppingNotes = config.notes.filter(n => n.category === 'compras');
      const estudiosNotes = config.notes.filter(n => n.category === 'estudios');
      
      // Save to local storage as fallback (immediate)
      localStorage.setItem('notas_json', JSON.stringify(notasNotes));
      localStorage.setItem('compras_json', JSON.stringify(shoppingNotes));
      localStorage.setItem('estudios_json', JSON.stringify(estudiosNotes));
      
      // Debounce saving to Supabase
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        // Siempre guardar para no perder cambios, como marcar casillas sin entrar en modo edición
        saveNotesToSupabase(notasNotes, config.updatedAt);
        saveShoppingToSupabase(shoppingNotes, config.updatedAt);
        saveEstudiosToSupabase(estudiosNotes, config.updatedAt);
      }, 2000); // 2 second debounce
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [config.notes, saveNotesToSupabase, saveShoppingToSupabase, isNotesEditMode, isShoppingEditMode, isEstudiosEditMode]);

  // Polling for notes files to "autologue"
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      // Only poll if we are NOT in edit mode for that category
      let needsUpdate = false;
      let currentNotes = [...(configRef.current.notes || [])];

      try {
        const [remoteNotesData, remoteShoppingData, remoteEstudiosData] = await Promise.all([
          !isNotesEditMode ? fetchNotesFromSupabase().catch(() => null) : Promise.resolve(null),
          !isShoppingEditMode ? fetchShoppingFromSupabase().catch(() => null) : Promise.resolve(null),
          !isEstudiosEditMode ? fetchEstudiosFromSupabase().catch(() => null) : Promise.resolve(null)
        ]);

        const mergeNotes = (remoteData: { notes: Note[], updatedAt?: number } | null, categories: string[]) => {
          if (!remoteData) return;
          const { notes: remoteNotes } = remoteData;
          
          // Check if anything actually changed to avoid unnecessary re-renders
          const existingNotesOfCategory = currentNotes.filter(n => categories.includes(n.category));
          const remoteNotesJson = JSON.stringify(remoteNotes);
          const existingNotesJson = JSON.stringify(existingNotesOfCategory);
          
          if (remoteNotesJson !== existingNotesJson) {
            currentNotes = currentNotes.filter(n => !categories.includes(n.category));
            currentNotes.push(...remoteNotes);
            needsUpdate = true;
          }
        };

        if (!isNotesEditMode) mergeNotes(remoteNotesData, ['notas', 'recientes']);
        if (!isShoppingEditMode) mergeNotes(remoteShoppingData, ['compras']);
        if (!isEstudiosEditMode) mergeNotes(remoteEstudiosData, ['estudios']);

        if (needsUpdate) {
          console.log('Polling: Merging remote notes into local state');
          setConfig(prev => ({ ...prev, notes: currentNotes }));
        }
      } catch (err) {
        console.error('Polling failed:', err);
      }
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(pollInterval);
  }, [isNotesEditMode, isShoppingEditMode, isEstudiosEditMode, fetchNotesFromSupabase, fetchShoppingFromSupabase]);

  const updateConfig = React.useCallback((newConfig: AppConfig | ((prev: AppConfig) => AppConfig)) => {
    const now = Date.now();
    if (typeof newConfig === 'function') {
      setConfig(prev => {
        const next = { ...newConfig(prev), updatedAt: now };
        configRef.current = next;
        return next;
      });
    } else {
      const next = { ...newConfig, updatedAt: now };
      configRef.current = next;
      setConfig(next);
    }
  }, []);

  const updateNutritionData = React.useCallback((newData: NutritionData | ((prev: NutritionData) => NutritionData)) => {
    if (typeof newData === 'function') {
      setNutritionData(prev => {
        const updated = newData(prev);
        nutritionDataRef.current = updated;
        localStorage.setItem('nutricion_remb', JSON.stringify(updated));
        return updated;
      });
    } else {
      nutritionDataRef.current = newData;
      setNutritionData(newData);
      localStorage.setItem('nutricion_remb', JSON.stringify(newData));
    }
  }, []);

  const saveNutritionDataToSupabase = React.useCallback(async (showToast = true) => {
    try {
      await retryOperation(async () => {
        const { error } = await supabase
          .storage
          .from('savejson')
          .upload('nutricion_remb.json', JSON.stringify(nutritionDataRef.current, null, 2), {
            contentType: 'application/json',
            upsert: true
          });
        if (error) throw error;
      });
      if (showToast) toast.success('Datos de nutrición guardados en la nube');
    } catch (e: any) {
      if (showToast) toast.error(`Error al guardar nutrición: ${e.message}`);
    }
  }, []);

  const saveAsDefault = async () => {
    try {
      localStorage.setItem('appLinksConfig', JSON.stringify(config));
      toast.success('¡Configuración guardada localmente!');
    } catch (e) {
      toast.error('Fallo al guardar la configuración');
    }
  };

  const saveToSupabase = async (configOverride?: AppConfig) => {
    // Debounce manual saves too if they happen rapidly
    if (configSaveTimeoutRef.current) {
      clearTimeout(configSaveTimeoutRef.current);
    }

    return new Promise<void>((resolve, reject) => {
      configSaveTimeoutRef.current = setTimeout(async () => {
        try {
          const configToSave = configOverride || configRef.current;
          // Backup logic: Create a backup once per day
          const today = new Date().toISOString().split('T')[0];
          const lastBackupDate = localStorage.getItem('lastBackupDate');

          if (lastBackupDate !== today) {
            const backupFilename = configFilename.replace('.json', '_backup.json');
            await retryOperation(async () => {
              await supabase
                .storage
                .from('savejson')
                .upload(backupFilename, JSON.stringify(configToSave, null, 2), {
                  contentType: 'application/json',
                  upsert: true
                });
            }).catch(err => console.warn("Daily backup failed:", err));
            localStorage.setItem('lastBackupDate', today);
            console.log(`Backup created: ${backupFilename}`);
          }

          // Save to Supabase
          await retryOperation(async () => {
            const { error } = await supabase
              .storage
              .from('savejson')
              .upload(configFilename, JSON.stringify(configToSave, null, 2), {
                  contentType: 'application/json',
                  upsert: true
              });
            if (error) throw error;
          });

          // Ensure it's set to auto-load
          localStorage.setItem('supabaseConfigFilename', configFilename);
          localStorage.setItem('appLinksConfig', JSON.stringify(configToSave)); // Also save locally as fallback

          toast.success(`¡Guardado en Supabase como ${configFilename}!`);
          resolve();
        } catch (e: any) {
          toast.error(`Error al guardar en Supabase: ${e.message}`);
          reject(e);
        }
      }, 500); // 500ms debounce for manual/triggered saves
    });
  };

  const resetToDefaults = () => {
    if (window.confirm('¿Estás seguro de restablecer la configuración original? Se perderán tus cambios actuales.')) {
      localStorage.removeItem('appLinksConfig');
      setConfig(INITIAL_CONFIG);
      window.location.reload();
    }
  };

  const saveConfigToFile = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(config, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "rembrandt_config.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const loadConfigFromFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        
        // Migration: Ensure usefulTools exist
        if (!json.usefulTools || !Array.isArray(json.usefulTools)) {
          json.usefulTools = INITIAL_CONFIG.usefulTools;
        }

        // Ensure googleDock exists
        if (!json.googleDock || !Array.isArray(json.googleDock)) {
          json.googleDock = INITIAL_CONFIG.googleDock;
        }

        // Ensure commands exist
        if (!json.commands) {
          json.commands = [];
        }

        // Ensure calendarEvents exist
        if (!json.calendarEvents) {
          json.calendarEvents = [];
        }

        // Ensure calendarTokens exist
        if (!json.calendarTokens) {
          json.calendarTokens = [];
        }

        // Ensure vacationConfig exists
        if (!json.vacationConfig) {
          json.vacationConfig = INITIAL_CONFIG.vacationConfig;
        }

        // Ensure credenciales and estudios exist
        if (!json.credenciales) {
          json.credenciales = [];
        }
        if (!json.estudios) {
          json.estudios = [];
        }
        if (!json.news) {
          json.news = [];
        }
        if (!json.aiTutorials) {
          json.aiTutorials = [];
        }
        if (!json.memoria_ia) {
          json.memoria_ia = "";
        }
        
        // Migration: Tabs
        if (json.tabs && Array.isArray(json.tabs)) {
          const existingTabIds = new Set(json.tabs.map((t: any) => t.id));
          INITIAL_TABS.forEach(systemTab => {
            if (!existingTabIds.has(systemTab.id)) {
              json.tabs.push(systemTab);
            }
          });
        } else {
          json.tabs = INITIAL_TABS;
        }

        json.version = INITIAL_CONFIG.version;

        setConfig(json);
        localStorage.setItem('appLinksConfig', JSON.stringify(json));
        
        // Automatically save to Supabase so it persists across reloads
        saveToSupabase(json).catch(err => console.error("Auto-save to Supabase failed:", err));

        alert('Configuración cargada exitosamente y guardada en la nube.');
      } catch (error) {
        console.error('Error loading config file:', error);
        alert('Error al leer el archivo JSON.');
      }
    };
    reader.readAsText(file);
  };

  const fetchConfigFromSupabaseManual = async () => {
    try {
      console.log(`Manually fetching config ${configFilename} from Supabase...`);
      
      const { data: signedUrlData, error: signedUrlError } = await supabase
        .storage
        .from('savejson')
        .createSignedUrl(configFilename, 60);

      if (signedUrlError) {
          if (signedUrlError.message?.includes('Object not found') || signedUrlError.name === 'StorageApiError') {
              alert(`No se encontró configuración en Supabase (${configFilename}).`);
              return;
          }
          throw signedUrlError;
      }

      const response = await fetch(signedUrlData.signedUrl);

      if (!response.ok) {
          throw new Error(`Fetch failed with status: ${response.status} ${response.statusText}`);
      }

      const json = await response.json();
      
      // Migration logic
      if (!json.usefulTools || !Array.isArray(json.usefulTools)) {
        json.usefulTools = INITIAL_CONFIG.usefulTools;
      }

      if (!json.googleDock || !Array.isArray(json.googleDock)) {
        json.googleDock = INITIAL_CONFIG.googleDock;
      }
      
      // Ensure commands exist
      if (!json.commands || !Array.isArray(json.commands)) {
        json.commands = [];
      }

      // Ensure calendarEvents exist
      if (!json.calendarEvents || !Array.isArray(json.calendarEvents)) {
        json.calendarEvents = [];
      } else {
        // Cleanup: remove AI database entries that might have been accidentally added as work events
        json.calendarEvents = json.calendarEvents.filter((e: any) => {
          if (e.type === 'trabajo') {
            const content = (e.title + ' ' + (e.description || '')).toLowerCase();
            if (content.includes('memoria_ia') || content.length > 1000) {
              return false;
            }
          }
          return true;
        });
      }

      // Ensure notes exist
      if (!json.notes || !Array.isArray(json.notes)) {
        json.notes = [];
      } else {
        // Cleanup: remove AI database entries from notes
        json.notes = json.notes.filter((n: any) => {
          if (n.category === 'trabajo') {
            const content = (n.title + ' ' + n.text).toLowerCase();
            if (content.includes('memoria_ia') || content.length > 1000) {
              return false;
            }
          }
          return true;
        });
      }

      // Ensure calendarTokens exist
      if (!json.calendarTokens || !Array.isArray(json.calendarTokens)) {
        json.calendarTokens = [];
      }

      // Ensure vacationConfig exists
      if (!json.vacationConfig) {
        json.vacationConfig = INITIAL_CONFIG.vacationConfig;
      }

      // Ensure credenciales and estudios exist
      if (!json.credenciales || !Array.isArray(json.credenciales)) {
        json.credenciales = [];
      }
      if (!json.estudios || !Array.isArray(json.estudios)) {
        json.estudios = [];
      }
      if (!json.news || !Array.isArray(json.news)) {
        json.news = [];
      }
      if (!json.finanzasNews || !Array.isArray(json.finanzasNews)) {
        json.finanzasNews = [];
      }
      if (!json.aiTutorials || !Array.isArray(json.aiTutorials)) {
        json.aiTutorials = [];
      }
      
      if (json.tabs && Array.isArray(json.tabs)) {
        // Remove Noticias tab if present
        json.tabs = json.tabs.filter((t: any) => t.id !== 'dashboard');
        
        // Force new labels
        json.tabs = json.tabs.map((t: any) => {
          if (t.id === 'email-gen') return { ...t, label: 'Email' };
          if (t.id === 'video-gen') return { ...t, label: 'Video' };
          return t;
        });

        // Add missing system tabs
        const existingTabIds = new Set(json.tabs.map((t: any) => t.id));
        INITIAL_TABS.forEach(systemTab => {
          if (!existingTabIds.has(systemTab.id)) {
            json.tabs.push(systemTab);
          }
        });
      } else {
        json.tabs = INITIAL_TABS;
      }

      if (json.linksBar && Array.isArray(json.linksBar)) {
        const missingLinks = INITIAL_CONFIG.linksBar.filter(initialLink => 
          !json.linksBar.find((l: any) => l.name === initialLink.name)
        );

        if (missingLinks.length > 0) {
          json.linksBar = [...json.linksBar, ...missingLinks];
        }
      }

      setConfig(json);
      localStorage.setItem('appLinksConfig', JSON.stringify(json));

      const toast = document.createElement('div');
      toast.className = 'fixed bottom-4 right-4 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-2xl z-[9999] animate-fade-in flex items-center gap-2 font-bold';
      toast.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> Configuración cargada de Supabase';
      document.body.appendChild(toast);
      setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.5s ease';
      setTimeout(() => toast.remove(), 500);
      }, 3000);

    } catch (error: any) {
      console.error('Error processing Supabase config:', error);
      alert(`Error al cargar desde Supabase: ${error.message || 'Unknown error'}`);
    }
  };

  const toggleEditing = React.useCallback(() => setIsEditing(prev => !prev), []);

  const value = React.useMemo(() => ({
    config,
    updateConfig,
    saveConfigToFile,
    loadConfigFromFile,
    saveAsDefault,
    saveToSupabase,
    resetToDefaults,
    fetchConfigFromSupabaseManual,
    isEditing,
    toggleEditing,
    configFilename,
    setConfigFilename,
    nutritionData,
    updateNutritionData,
    saveNutritionDataToSupabase,
    fetchNutritionDataFromSupabase,
    saveNotesToSupabase,
    fetchNotesFromSupabase,
    saveShoppingToSupabase,
    fetchShoppingFromSupabase,
    saveEstudiosToSupabase,
    fetchEstudiosFromSupabase,
    updateNotifications,
    isShoppingEditMode,
    setShoppingEditMode,
    isNotesEditMode,
    setNotesEditMode,
    isEstudiosEditMode,
    setEstudiosEditMode,
    googleApiConfig,
    updateGoogleApiConfig
  }), [config, isEditing, updateConfig, toggleEditing, configFilename, nutritionData, updateNutritionData, saveNutritionDataToSupabase, fetchNutritionDataFromSupabase, saveNotesToSupabase, fetchNotesFromSupabase, saveShoppingToSupabase, fetchShoppingFromSupabase, saveEstudiosToSupabase, fetchEstudiosFromSupabase, updateNotifications, isShoppingEditMode, isNotesEditMode, isEstudiosEditMode, googleApiConfig]);

  return (
    <LinkContext.Provider value={value}>
      {children}
    </LinkContext.Provider>
  );
};

export const useLinks = () => {
  const context = useContext(LinkContext);
  if (context === undefined) {
    throw new Error('useLinks must be used within a LinkProvider');
  }
  return context;
};
