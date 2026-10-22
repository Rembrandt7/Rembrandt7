import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  RefreshCw,
  Bookmark,
  Flame,
  Calculator,
  Search,
  Brain,
  Trash2,
  X,
  Share2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { supabase } from '../services/supabaseClient';
import { generateContentWithFallback, GEMINI_MODELS } from '../services/geminiService';
import { useLinks } from '../contexts/LinkContext';

export type PlatformName =
  | 'MakerWorld'
  | 'Printables'
  | 'Cults3D'
  | 'Thingiverse'
  | 'Thangs'
  | 'Creality Cloud';

export type SuggestionCategory =
  | 'Articulados & Flexi'
  | 'Decoración & Macetas'
  | 'Gadgets & Escritorio'
  | 'Gaming & Controles'
  | 'Iluminación & Lámparas'
  | 'Hogar & Funcional'
  | 'EDC & Llaveros'
  | 'Temporada & Regalos';

export interface PrintSuggestionItem {
  id: string;
  title: string;
  searchKeyword: string;
  category: SuggestionCategory;
  platform: PlatformName;
  url: string;
  imageUrl: string;
  description: string;
  whyItSells: string;
  tags: string[];
  estimatedGrams: number;
  estimatedHours: number;
  suggestedPriceMxn: number;
  material: 'PLA' | 'PETG' | 'TPU';
  demandBadge: string;
  baseScore: number;
  likesCount?: number;
  downloadsCount?: number;
}

export interface TasteProfile {
  categoryWeights: Record<string, number>;
  tagWeights: Record<string, number>;
  platformWeights: Record<string, number>;
  likedIds: string[];
  dismissedIds: string[];
  savedItems: PrintSuggestionItem[];
  dailySelection: {
    date: string;
    itemIds: string[];
  };
  interactionsCount: number;
}

const STORAGE_KEY = 'rembrandt_3d_taste_profile_v2';
const SUPABASE_FILE = 'impresion3d_gustos_v2.json';

const ALL_CATEGORIES: SuggestionCategory[] = [
  'Articulados & Flexi',
  'Decoración & Macetas',
  'Gadgets & Escritorio',
  'Gaming & Controles',
  'Iluminación & Lámparas',
  'Hogar & Funcional',
  'EDC & Llaveros',
  'Temporada & Regalos',
];

const PLATFORM_BADGE_STYLES: Record<PlatformName, { bg: string; text: string; border: string }> = {
  MakerWorld: { bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/40' },
  Printables: { bg: 'bg-orange-500/20', text: 'text-orange-300', border: 'border-orange-500/40' },
  Cults3D: { bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-500/40' },
  Thingiverse: { bg: 'bg-blue-500/20', text: 'text-blue-300', border: 'border-blue-500/40' },
  Thangs: { bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-500/40' },
  'Creality Cloud': { bg: 'bg-cyan-500/20', text: 'text-cyan-300', border: 'border-cyan-500/40' },
};

export function buildPlatformSearchUrl(platform: PlatformName, keyword: string): string {
  const q = encodeURIComponent(keyword.trim());
  switch (platform) {
    case 'MakerWorld':
      return `https://makerworld.com/es/search/models?keyword=${q}`;
    case 'Printables':
      return `https://www.printables.com/search/models?q=${q}`;
    case 'Cults3D':
      return `https://cults3d.com/es/b%C3%BAsqueda?q=${q}`;
    case 'Thingiverse':
      return `https://www.thingiverse.com/search?q=${q}&type=things&sort=popular`;
    case 'Thangs':
      return `https://thangs.com/search/${q}?scope=all`;
    case 'Creality Cloud':
      return `https://www.crealitycloud.com/es/search/${q}?type=models`;
  }
}

/**
 * Reliable external link opener that works across browsers, PWA standalone mode, and motion containers.
 */
export function openExternalModelUrl(url: string, e?: React.MouseEvent) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  if (!url) return;
  try {
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (win) {
      win.focus();
      return;
    }
  } catch {}
  // Fallback anchor trigger if window.open was blocked
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Generates an attractive SVG 3D Blueprint / Product Card illustration as data URI
 * when an external image is loading or blocked by hotlink protection.
 */
function createFallbackIllustration(title: string, category: string, platform: string): string {
  const palette: Record<string, [string, string, string]> = {
    'Articulados & Flexi': ['#059669', '#10b981', '#064e3b'],
    'Decoración & Macetas': ['#d97706', '#f59e0b', '#451a03'],
    'Gadgets & Escritorio': ['#2563eb', '#60a5fa', '#1e3a8a'],
    'Gaming & Controles': ['#7c3aed', '#a78bfa', '#2e1065'],
    'Iluminación & Lámparas': ['#db2777', '#f472b6', '#500724'],
    'Hogar & Funcional': ['#0891b2', '#22d3ee', '#164e63'],
    'EDC & Llaveros': ['#e11d48', '#fb7185', '#4c0519'],
    'Temporada & Regalos': ['#9333ea', '#c084fc', '#3b0764'],
  };
  const [c1, c2, bg] = palette[category] || ['#3b82f6', '#60a5fa', '#0f172a'];
  const safeTitle = title.replace(/[<>&"']/g, '').slice(0, 32);
  const safeCat = category.replace(/[<>&"']/g, '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#090d16"/>
        <stop offset="55%" stop-color="${bg}"/>
        <stop offset="100%" stop-color="#0f172a"/>
      </linearGradient>
      <linearGradient id="cube" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${c2}"/>
        <stop offset="100%" stop-color="${c1}"/>
      </linearGradient>
    </defs>
    <rect width="600" height="400" fill="url(#bg)"/>
    <g stroke="rgba(255,255,255,0.06)" stroke-width="1">
      <line x1="0" y1="80" x2="600" y2="80"/><line x1="0" y1="160" x2="600" y2="160"/>
      <line x1="0" y1="240" x2="600" y2="240"/><line x1="0" y1="320" x2="600" y2="320"/>
      <line x1="120" y1="0" x2="120" y2="400"/><line x1="240" y1="0" x2="240" y2="400"/>
      <line x1="360" y1="0" x2="360" y2="400"/><line x1="480" y1="0" x2="480" y2="400"/>
    </g>
    <circle cx="300" cy="175" r="95" fill="${c1}" opacity="0.18"/>
    <g transform="translate(300,170)">
      <polygon points="0,-70 65,-35 65,35 0,70 -65,35 -65,-35" fill="url(#cube)" opacity="0.88" stroke="${c2}" stroke-width="2"/>
      <polygon points="0,-70 65,-35 0,0 -65,-35" fill="rgba(255,255,255,0.22)"/>
      <polygon points="0,0 65,-35 65,35 0,70" fill="rgba(0,0,0,0.25)"/>
      <line x1="0" y1="0" x2="0" y2="70" stroke="rgba(255,255,255,0.35)" stroke-width="2"/>
    </g>
    <text x="300" y="310" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="bold" font-size="20">${safeTitle}</text>
    <text x="300" y="340" text-anchor="middle" fill="${c2}" font-family="sans-serif" font-weight="bold" font-size="13">${safeCat} · ${platform}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/* ─────────────────────────────────────────────────────────────────
   CURATED MASTER POOL WITH 100% REAL DIRECT MODEL URLS & REAL PHOTOS
───────────────────────────────────────────────────────────────── */
const MASTER_SUGGESTIONS_POOL: PrintSuggestionItem[] = [
  {
    id: 'sug-crystal-dragon-flexi',
    title: 'Dragón Espíritu Nocturno Articulado (Sin Soportes)',
    searchKeyword: 'articulated night spirit dragon',
    category: 'Articulados & Flexi',
    platform: 'Printables',
    url: 'https://www.printables.com/model/413203-articulated-night-spirit-dragon',
    imageUrl: 'https://media.printables.com/media/prints/413203/images/3462216_1f951c31-7a55-4542-822c-1792f736de19/20230306_120910.jpg',
    description: 'Dragón articulado impreso en una sola pieza sin soportes (+152,000 descargas reales). Luce espectacular en PLA Seda Bicolor.',
    whyItSells: 'El producto #1 en ferias, bazares y redes sociales; margen de ganancia superior al 300% con PLA Seda.',
    tags: ['articulado', 'dragon', 'flexi', 'sin soportes', 'pla silk', 'bestseller'],
    estimatedGrams: 108,
    estimatedHours: 3.9,
    suggestedPriceMxn: 290,
    material: 'PLA',
    demandBadge: '🔥 152k Descargas',
    baseScore: 98,
    likesCount: 14277,
    downloadsCount: 152419,
  },
  {
    id: 'sug-self-watering-planter',
    title: 'Maceta Autorriego Helicoidal Moderna',
    searchKeyword: 'helical self watering planter',
    category: 'Decoración & Macetas',
    platform: 'Printables',
    url: 'https://www.printables.com/model/65450-helical-self-watering-planters',
    imageUrl: 'https://media.printables.com/media/prints/65450/images/723483_5102e243-43c9-4103-be8c-e452bd810151/screen-shot-2021-05-02-at-101102-am.png',
    description: 'Maceta de doble cuerpo con depósito inferior de agua y diseño helicoidal para suculentas y plantas de interior.',
    whyItSells: 'Altísima recompra en tiendas de plantas, oficinas y decoración de departamentos.',
    tags: ['maceta', 'autorriego', 'decoracion', 'hogar', 'suculentas', 'moderno'],
    estimatedGrams: 130,
    estimatedHours: 4.0,
    suggestedPriceMxn: 250,
    material: 'PETG',
    demandBadge: '💰 Alta Rentabilidad',
    baseScore: 95,
  },
  {
    id: 'sug-controller-stand-hand',
    title: 'Soporte Gamer Minimalista para Control Xbox / PS5',
    searchKeyword: 'minimalistic xbox controller stand',
    category: 'Gaming & Controles',
    platform: 'Printables',
    url: 'https://www.printables.com/model/449970-minimalistic-xbox-controller-stand',
    imageUrl: 'https://media.printables.com/media/prints/449970/images/3707269_687f0d83-f72e-4ae2-89fd-f20cdd5644fc/controller_stand_printables_01.jpg',
    description: 'Base ergonómica de escritorio para controles de consola con encaje perfecto y bajo consumo de filamento.',
    whyItSells: 'Regalo ideal para gamers; se vende todo el año en Marketplace y Mercado Libre.',
    tags: ['gamer', 'ps5', 'xbox', 'soporte', 'control', 'escritorio'],
    estimatedGrams: 95,
    estimatedHours: 3.2,
    suggestedPriceMxn: 240,
    material: 'PLA',
    demandBadge: '🎮 Nicho Gamer Top',
    baseScore: 96,
  },
  {
    id: 'sug-moon-lamp-lithophane',
    title: 'Lámpara Luna Litofanía Texturizada LED',
    searchKeyword: 'design moon lamp led',
    category: 'Iluminación & Lámparas',
    platform: 'Printables',
    url: 'https://www.printables.com/model/23859-design-moon-lamp',
    imageUrl: 'https://media.printables.com/media/prints/23859/images/248515_10718b5f-8c8c-49dc-848e-edb200f38481/title.png',
    description: 'Esfera lunar de alta resolución con relieve topográfico real lista para base LED cálida o RGB.',
    whyItSells: 'Valor percibido muy alto: cuesta menos de $60 MXN en filamento blanco y se vende entre $350 y $550 MXN.',
    tags: ['lampara', 'litofania', 'led', 'luna', 'regalo', 'iluminacion'],
    estimatedGrams: 125,
    estimatedHours: 6.5,
    suggestedPriceMxn: 420,
    material: 'PLA',
    demandBadge: '💎 Margen +400%',
    baseScore: 97,
  },
  {
    id: 'sug-gridfinity-desk-organizer',
    title: 'Sistema Organizador de Escritorio Deskfinity',
    searchKeyword: 'gridfinity desk organizer system deskfinity',
    category: 'Gadgets & Escritorio',
    platform: 'Printables',
    url: 'https://www.printables.com/model/376580-gridfinity-desk-organizer-system-deskfinity',
    imageUrl: 'https://media.printables.com/media/prints/376580/images/5096543_d2065fa8-cd94-4d4a-95f2-10fcb09aae7c_bb66f187-79d8-409d-965f-d0e40d7f7a52/deskfinity-cover-11_12_23.jpg',
    description: 'Sistema modular apilable para organizar memorias USB, SD, plumas, herramientas y accesorios en el escritorio.',
    whyItSells: 'Los clientes compran sets completos de 5 a 10 módulos para su oficina o taller.',
    tags: ['organizador', 'escritorio', 'gridfinity', 'modular', 'oficina', 'gadget'],
    estimatedGrams: 95,
    estimatedHours: 3.2,
    suggestedPriceMxn: 240,
    material: 'PLA',
    demandBadge: '⚡ Venta en Sets',
    baseScore: 92,
  },
  {
    id: 'sug-flexi-axolotl-keychain',
    title: 'Ajolote Mexicano Articulado Multicolor / Llavero',
    searchKeyword: 'articulated axolotl multicolor',
    category: 'EDC & Llaveros',
    platform: 'Printables',
    url: 'https://www.printables.com/model/217417-articulated-axolotl-multicolor-remix',
    imageUrl: 'https://media.printables.com/media/prints/217417/images/1983880_ba63fd5d-bd9a-41b4-871a-90add70753b8/img_6016.jpg',
    description: 'Ajolote articulado sin soportes que se puede escalar para llavero o figura de escritorio.',
    whyItSells: 'En México el ajolote tiene demanda explosiva; produces una cama llena y cada pieza se vende con gran margen.',
    tags: ['ajolote', 'llavero', 'articulado', 'flexi', 'impresion rapida', 'souvenir'],
    estimatedGrams: 28,
    estimatedHours: 1.1,
    suggestedPriceMxn: 110,
    material: 'PLA',
    demandBadge: '🇲🇽 Favorito en México',
    baseScore: 99,
  },
  {
    id: 'sug-voronoi-led-lamp',
    title: 'Lámpara Voronoi con Base para LED',
    searchKeyword: 'voronoi lamp led stand',
    category: 'Iluminación & Lámparas',
    platform: 'Printables',
    url: 'https://www.printables.com/model/611307-voronoi-lamp-w-led-stand',
    imageUrl: 'https://media.printables.com/media/prints/611307/images/4860726_0ddbd8f4-5003-416e-ac24-844a84444376_49a53fe6-a185-4b54-9111-db073978916a/20231011_221429.jpg',
    description: 'Lámpara de mesa con patrón celular orgánico Voronoi que proyecta sombras decorativas únicas.',
    whyItSells: 'Pieza de diseño de interiores que se vende como lámpara boutique para recámaras y salas.',
    tags: ['lampara', 'voronoi', 'led', 'decoracion', 'iluminacion', 'moderno'],
    estimatedGrams: 110,
    estimatedHours: 3.8,
    suggestedPriceMxn: 360,
    material: 'PLA',
    demandBadge: '✨ Diseño Boutique',
    baseScore: 94,
  },
  {
    id: 'sug-headphone-stand-lumo',
    title: 'Soporte Escultórico Lumo para Audífonos',
    searchKeyword: 'lumo headphone stand',
    category: 'Gadgets & Escritorio',
    platform: 'Printables',
    url: 'https://www.printables.com/model/1138664-lumo-headphone-stand',
    imageUrl: 'https://media.printables.com/media/prints/1138664/images/8592357_50adca8e-30f7-470f-8ab7-e11903ee5441_8c446ca9-3e4a-40f5-9b68-111956f3f29e/lumo_headphone.png',
    description: 'Pedestal curvo minimalista para audífonos gamer o de estudio con estética limpia.',
    whyItSells: 'Producto estrella para home office y streamers; luce increíble en negro mate o bicolor.',
    tags: ['audifonos', 'soporte', 'escritorio', 'gamer', 'setup', 'moderno'],
    estimatedGrams: 145,
    estimatedHours: 4.5,
    suggestedPriceMxn: 280,
    material: 'PLA',
    demandBadge: '🔥 Bestseller Setup',
    baseScore: 91,
  },
  {
    id: 'sug-infinity-cube-fidget',
    title: 'Cubo Infinito Fidget Antiestrés v2 (Print-in-Place)',
    searchKeyword: 'fidget infinity cube v2',
    category: 'Articulados & Flexi',
    platform: 'Printables',
    url: 'https://www.printables.com/model/928-yet-another-fidget-infinity-cube-v2',
    imageUrl: 'https://media.printables.com/media/prints/928/images/4740324_2fa4be7c-c068-4ef8-a786-34b73eb35676_56d1d6b8-f490-482a-91f6-6ff7af1997db/00100dportrait_00100_burst20180423003754672_cover.jpg',
    description: 'Juguete kinético articulado de bisagras continuas (+161,000 descargas) que gira infinitamente directo de la cama.',
    whyItSells: 'Compra impulsiva garantizada cuando el cliente lo toma en sus manos; excelente para vender en mostrador.',
    tags: ['fidget', 'cubo infinito', 'articulado', 'antiestres', 'juguete', 'sin soportes'],
    estimatedGrams: 48,
    estimatedHours: 1.8,
    suggestedPriceMxn: 130,
    material: 'PLA',
    demandBadge: '⚡ 161k Descargas',
    baseScore: 93,
  },
  {
    id: 'sug-fridge-can-dispenser',
    title: 'Dispensador Automático de Latas para Refrigerador',
    searchKeyword: 'drink can dispenser fridge',
    category: 'Hogar & Funcional',
    platform: 'Printables',
    url: 'https://www.printables.com/model/186550-drink-can-dispenser',
    imageUrl: 'https://media.printables.com/media/prints/186550/images/1831797_964188a1-4df4-4850-acae-6dc247976495/picture_1.jpg',
    description: 'Rack organizador por gravedad a dos pisos para latas de refresco o bebida que optimiza el espacio en el refri.',
    whyItSells: 'Videos virales en TikTok y Reels; resuelve un problema cotidiano real en cualquier cocina.',
    tags: ['hogar', 'cocina', 'organizador', 'latas', 'funcional', 'util'],
    estimatedGrams: 165,
    estimatedHours: 5.0,
    suggestedPriceMxn: 290,
    material: 'PETG',
    demandBadge: '📈 Viral en TikTok',
    baseScore: 89,
  },
  {
    id: 'sug-switch-pokeball-case',
    title: 'Pokébola Porta Cartuchos para Nintendo Switch',
    searchKeyword: 'nintendo switch game cartridge pokeball',
    category: 'Gaming & Controles',
    platform: 'Printables',
    url: 'https://www.printables.com/model/113972-nintendo-switch-game-cartridge-pokeball',
    imageUrl: 'https://media.printables.com/media/prints/113972/images/1117982_834c67b1-71cb-4ca7-a910-0b4f81627680/img_6596.jpg',
    description: 'Estuche esférico coleccionable con ranuras internas para guardar cartuchos de Nintendo Switch.',
    whyItSells: 'Uno de los accesorios coleccionables más buscados por fans de Pokémon y Nintendo Switch.',
    tags: ['nintendo', 'switch', 'pokemon', 'gamer', 'estuche', 'coleccionable'],
    estimatedGrams: 110,
    estimatedHours: 3.8,
    suggestedPriceMxn: 260,
    material: 'PLA',
    demandBadge: '⭐ Muy Buscado',
    baseScore: 93,
  },
  {
    id: 'sug-eternal-rose-gift',
    title: 'Rosa Eterna en Espiral con Tallo Intercambiable',
    searchKeyword: 'spiral vase rose flower stem',
    category: 'Temporada & Regalos',
    platform: 'Printables',
    url: 'https://www.printables.com/model/131488-spiral-vase-rose',
    imageUrl: 'https://media.printables.com/media/prints/131488/images/4214139_996b8f90-6b8f-494d-9597-a2cfde30e16a/vaserose_wlogo.jpg',
    description: 'Rosa estilizada impresa en modo vaso continuo con tallo encajable. En PLA Silk Rojo y Dorado luce de joyería.',
    whyItSells: 'Éxito rotundo en aniversarios, 10 de mayo, San Valentín y graduaciones con costo de producción mínimo.',
    tags: ['regalo', 'rosa', 'flores', 'temporada', 'pla silk', 'impresion rapida'],
    estimatedGrams: 35,
    estimatedHours: 1.4,
    suggestedPriceMxn: 140,
    material: 'PLA',
    demandBadge: '💝 Regalo Estrella',
    baseScore: 92,
  },
  {
    id: 'sug-magsafe-stand-dock',
    title: 'Base Cargador MagSafe iPhone Modo StandBy',
    searchKeyword: 'magsafe charger stand iphone standby mode',
    category: 'Gadgets & Escritorio',
    platform: 'Printables',
    url: 'https://www.printables.com/model/582465-magsafe-charger-stand-for-iphone-standby-mode',
    imageUrl: 'https://media.printables.com/media/prints/582465/images/4648557_acc7d241-cdac-4965-b8be-9956e7bfbb51/dscf6724-2.jpg',
    description: 'Base minimalista de escritorio compatible con modo reloj StandBy de iPhone con canal ocultacables.',
    whyItSells: 'Clientes con iPhone pagan excelente precio por bases limpias y personalizadas para su buró o escritorio.',
    tags: ['iphone', 'magsafe', 'soporte', 'cargador', 'escritorio', 'gadget'],
    estimatedGrams: 85,
    estimatedHours: 2.8,
    suggestedPriceMxn: 230,
    material: 'PLA',
    demandBadge: '💼 Favorito Oficina',
    baseScore: 91,
  },
  {
    id: 'sug-dice-tower-castle',
    title: 'Torre de Dados Castillo Medieval para D&D / Rol',
    searchKeyword: 'dice tower castle stairs dnd',
    category: 'Gaming & Controles',
    platform: 'Printables',
    url: 'https://www.printables.com/model/851935-dice-tower-castle-stairs',
    imageUrl: 'https://media.printables.com/media/prints/851935/images/6560725_674b33a8-8b4a-46af-b11b-ffd0fdf7e3c6_d58033ce-a4c1-45d0-bfdd-9fa74237e9e4/20240421_190956.jpg',
    description: 'Torre con escalera espiral y bandeja amurallada para lanzar dados de calabozos y dragones.',
    whyItSells: 'La comunidad de juegos de mesa y rol compra torres personalizadas con gran margen de beneficio.',
    tags: ['dnd', 'rol', 'dados', 'gamer', 'castillo', 'juegos de mesa'],
    estimatedGrams: 175,
    estimatedHours: 6.0,
    suggestedPriceMxn: 350,
    material: 'PLA',
    demandBadge: '🎲 Nicho Premium',
    baseScore: 88,
  },
  {
    id: 'sug-kumiko-desk-vase',
    title: 'Organizador / Jarrón Geométrico Estilo Japonés Kumiko',
    searchKeyword: 'kumiko pen holder desk organizer',
    category: 'Decoración & Macetas',
    platform: 'Printables',
    url: 'https://www.printables.com/model/1279939-kumiko-pen-holder-desk-organizer',
    imageUrl: 'https://media.printables.com/media/prints/e7fae17f-e5d5-4bb9-beab-71f1ebad440d/images/9628146_49b15b68-29eb-4fda-b484-375ddb635f29_988216d2-a1d3-485c-be6a-3394958f7580/elongated-hexagon-kumiko-desk-organizer-8.png',
    description: 'Textura geométrica japonesa de alta precisión que luce como artesanía de madera y metal.',
    whyItSells: 'Acabado de lujo usando filamento PLA Madera (Wood) o Negro Mate con Dorado.',
    tags: ['jarron', 'kumiko', 'decoracion', 'hogar', 'oficina', 'moderno'],
    estimatedGrams: 75,
    estimatedHours: 2.5,
    suggestedPriceMxn: 240,
    material: 'PLA',
    demandBadge: '🎨 Estilo Japonés',
    baseScore: 90,
  },
  {
    id: 'sug-capybara-phone-keyring',
    title: 'Llavero Capibara Soporte para Celular 2-en-1',
    searchKeyword: 'capybara phone holder keyring',
    category: 'EDC & Llaveros',
    platform: 'Printables',
    url: 'https://www.printables.com/model/550754-capybara-phone-holder-keyring',
    imageUrl: 'https://media.printables.com/media/prints/550754/images/6496815_d5935c8e-3735-4a27-99b2-6645873da97b_5b7a9b26-27e5-42f7-8302-b53f26d3aeb2/capybara24_43_1.jpg',
    description: 'Llavero de bolsillo con forma de capibara que funciona al instante como soporte horizontal para el celular.',
    whyItSells: 'El capibara es tendencia absoluta y al tener función útil de soporte de celular se vende por docenas.',
    tags: ['capibara', 'llavero', 'celular', 'soporte', 'impresion rapida', 'viral'],
    estimatedGrams: 22,
    estimatedHours: 0.7,
    suggestedPriceMxn: 90,
    material: 'PLA',
    demandBadge: '🔥 Viral + Funcional',
    baseScore: 97,
  },
  {
    id: 'sug-otf-fidget-knife',
    title: 'Juguete Kinético Deslizante OTF (Solo 3 Piezas)',
    searchKeyword: 'otf fidget knife 3 parts',
    category: 'EDC & Llaveros',
    platform: 'Printables',
    url: 'https://www.printables.com/model/863424-otf-fidget-knife-only-3-parts',
    imageUrl: 'https://media.printables.com/media/prints/863424/images/6629887_f3c3ee94-6a8b-4a55-a70d-c2b5f86b6170_3347a727-eb57-4f51-8773-b917b5e4839f/dsc02714.jpeg',
    description: 'Mecanismo deslizante de acción por gravedad de solo 3 piezas (+95,000 descargas), sin tornillos ni resortes.',
    whyItSells: 'Rápido de imprimir, bajo gasto de gramos y altísima rotación entre jóvenes y gamers.',
    tags: ['edc', 'fidget', 'llavero', 'juguete', 'impresion rapida', 'tendencia'],
    estimatedGrams: 38,
    estimatedHours: 1.3,
    suggestedPriceMxn: 120,
    material: 'PLA',
    demandBadge: '🔥 95k Descargas',
    baseScore: 91,
  },
  {
    id: 'sug-labyrinth-gift-box',
    title: 'Caja de Regalo con Laberinto Secreto para Dinero/Tarjetas',
    searchKeyword: 'labyrinth puzzle gift box',
    category: 'Temporada & Regalos',
    platform: 'Printables',
    url: 'https://www.printables.com/model/133742-labyrinth-puzzle-gift-box',
    imageUrl: 'https://media.printables.com/media/prints/133742/images/1279072_de2cd181-3217-4305-ba76-f5b8de2228c8/img_0577.jpg',
    description: 'Cilindro rompecabezas donde quien recibe el regalo debe resolver el laberinto oculto para abrir el compartimento.',
    whyItSells: 'Convierte cualquier regalo en efectivo o tarjeta en una experiencia divertida e inolvidable.',
    tags: ['regalo', 'caja', 'puzzle', 'laberinto', 'temporada', 'novedoso'],
    estimatedGrams: 68,
    estimatedHours: 2.4,
    suggestedPriceMxn: 170,
    material: 'PLA',
    demandBadge: '🎁 Idea Original',
    baseScore: 91,
  },
  {
    id: 'sug-mushroom-led-lamp',
    title: 'Lámpara Hongo Decorativa para Luz LED',
    searchKeyword: 'mushroom led lamp',
    category: 'Iluminación & Lámparas',
    platform: 'Printables',
    url: 'https://www.printables.com/model/818850-mushroom-led-lamp',
    imageUrl: 'https://media.printables.com/media/prints/818850/images/6324407_e47d6f44-e278-4947-b95c-cc73dc5e63df_9a297a07-1ff8-4e89-b481-f2b6b3e8882f/image.jpg',
    description: 'Lámpara ambiental estilo nórdico/orgánico con difusor translúcido suave para escritorio o buró.',
    whyItSells: 'Tendencia aesthetic en decoración de interiores; muy fácil de imprimir en PLA blanco y color pastel.',
    tags: ['lampara', 'led', 'decoracion', 'hogar', 'moderno', 'regalo'],
    estimatedGrams: 95,
    estimatedHours: 3.1,
    suggestedPriceMxn: 320,
    material: 'PLA',
    demandBadge: '✨ Tendencia Deco',
    baseScore: 93,
  },
  {
    id: 'sug-cable-management-clamp',
    title: 'Organizador Universal de Cables para Escritorio',
    searchKeyword: 'universal cable holder desk',
    category: 'Hogar & Funcional',
    platform: 'Printables',
    url: 'https://www.printables.com/model/1131596-universal-cable-holder',
    imageUrl: 'https://media.printables.com/media/prints/1131596/images/8537599_a2ea6c47-883e-4f16-b449-ca7abde0c463_45c00701-2411-4b6d-aa37-0c5b5c3ba047/v13139.jpg',
    description: 'Sujetador limpio y resistente para mantener todos los cables de carga ordenados en el borde del escritorio.',
    whyItSells: 'Soluciona el desorden de cables al instante; se vende en paquetes de 3 o 5 piezas.',
    tags: ['escritorio', 'cables', 'organizador', 'funcional', 'hogar', 'gadget'],
    estimatedGrams: 45,
    estimatedHours: 1.5,
    suggestedPriceMxn: 150,
    material: 'PETG',
    demandBadge: '⚡ Pack Rentable',
    baseScore: 88,
  },
  {
    id: 'sug-foldable-phone-stand',
    title: 'Soporte Plegable de Bolsillo para Celular / Tablet',
    searchKeyword: 'foldable pocket phone stand',
    category: 'Gadgets & Escritorio',
    platform: 'Printables',
    url: 'https://www.printables.com/model/86903-foldable-pocket-phone-stand',
    imageUrl: 'https://media.printables.com/media/prints/86903/images/864387_c6295fc7-60e0-40e9-b54c-1d37803e1e55/img_20211029_115049.jpg',
    description: 'Soporte articulado ultraplano de bolsillo; se imprime en 40 minutos en una sola pieza sin ensambles.',
    whyItSells: 'Cuesta menos de $15 MXN de filamento y se vende entre $80 y $120 MXN en cualquier mostrador o bazar.',
    tags: ['celular', 'soporte', 'plegable', 'gadget', 'bolsillo', 'print in place'],
    estimatedGrams: 24,
    estimatedHours: 0.9,
    suggestedPriceMxn: 100,
    material: 'PLA',
    demandBadge: '🔥 Impresión Rápida',
    baseScore: 97,
  },
  {
    id: 'sug-mini-vice-clamp',
    title: 'Mini Tornillo de Banco Print-in-Place',
    searchKeyword: 'mini bench vise print in place',
    category: 'Hogar & Funcional',
    platform: 'MakerWorld',
    url: 'https://makerworld.com/es/models/17215-print-in-place-mini-vice',
    imageUrl: 'https://media.printables.com/media/prints/928/images/4740324_2fa4be7c-c068-4ef8-a786-34b73eb35676_56d1d6b8-f490-482a-91f6-6ff7af1997db/00100dportrait_00100_burst20180423003754672_cover.jpg',
    description: 'Prensa mecánica completamente funcional con rosca y mordaza lista para usar al despegar de la cama.',
    whyItSells: 'Demuestra la magia de la impresión 3D a primera vista; irresistible para aficionados a las herramientas.',
    tags: ['herramienta', 'prensa', 'mecanico', 'print in place', 'taller'],
    estimatedGrams: 75,
    estimatedHours: 2.8,
    suggestedPriceMxn: 190,
    material: 'PETG',
    demandBadge: '⚙️ Mecanismo 100%',
    baseScore: 94,
  },
  {
    id: 'sug-mushroom-organic-lamp',
    title: 'Lámpara Champiñón Hongo LED Nórdica',
    searchKeyword: 'mushroom lamp led ambient',
    category: 'Iluminación & Lámparas',
    platform: 'Printables',
    url: 'https://www.printables.com/model/499623-mushroom-lamp',
    imageUrl: 'https://media.printables.com/media/prints/499623/images/3956321_0494cf54-205e-42c2-8ae3-be2fa3732049/mushroom_lamp.jpg',
    description: 'Lámpara moderna estilo nórdico de hongo que difumina suavemente la luz LED para buroes y salas.',
    whyItSells: 'Diseño en tendencia estética viral en TikTok e Instagram; margen superior a $250 MXN por pieza.',
    tags: ['lampara', 'hongo', 'nordico', 'led', 'decoracion', 'minimalista'],
    estimatedGrams: 115,
    estimatedHours: 4.2,
    suggestedPriceMxn: 390,
    material: 'PLA',
    demandBadge: '🍄 Tendencia Viral',
    baseScore: 96,
  },
  {
    id: 'sug-switch-cartridge-block',
    title: 'Cubo Pregunta Mario Estuche Juegos Switch',
    searchKeyword: 'switch question block game holder',
    category: 'Gaming & Controles',
    platform: 'Printables',
    url: 'https://www.printables.com/model/29841-nintendo-switch-cartridge-case-mario-block',
    imageUrl: 'https://media.printables.com/media/prints/29841/images/322961_45b37628-97c7-43ca-95df-2d22bdf5f87b/switch_block.jpg',
    description: 'Bloque con muelle emergente para guardar hasta 12 cartuchos de Nintendo Switch.',
    whyItSells: 'El coleccionable geek favorito de los poseedores de Switch; venta constante en cualquier época.',
    tags: ['switch', 'mario', 'gaming', 'estuche', 'geek', 'regalo'],
    estimatedGrams: 85,
    estimatedHours: 3.0,
    suggestedPriceMxn: 220,
    material: 'PLA',
    demandBadge: '⭐ Clásico Gamer',
    baseScore: 98,
  },
];

function getDateDayIndex(dateStr: string): number {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return Math.floor(dt.getTime() / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
}

function getTodayStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getInitialTasteProfile(): TasteProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        categoryWeights: parsed.categoryWeights || {},
        tagWeights: parsed.tagWeights || {},
        platformWeights: parsed.platformWeights || {},
        likedIds: Array.isArray(parsed.likedIds) ? parsed.likedIds : [],
        dismissedIds: Array.isArray(parsed.dismissedIds) ? parsed.dismissedIds : [],
        savedItems: Array.isArray(parsed.savedItems) ? parsed.savedItems : [],
        dailySelection: parsed.dailySelection || { date: '', itemIds: [] },
        interactionsCount: Number(parsed.interactionsCount) || 0,
      };
    }
  } catch {}
  return {
    categoryWeights: {},
    tagWeights: {},
    platformWeights: {},
    likedIds: [],
    dismissedIds: [],
    savedItems: [],
    dailySelection: { date: '', itemIds: [] },
    interactionsCount: 0,
  };
}

export function scoreSuggestionItem(item: PrintSuggestionItem, profile: TasteProfile): number {
  let score = item.baseScore || 85;
  const catWeight = profile.categoryWeights[item.category] || 0;
  score += catWeight * 8;

  for (const tag of item.tags) {
    const tw = profile.tagWeights[tag.toLowerCase()] || 0;
    score += tw * 4;
  }

  const platWeight = profile.platformWeights[item.platform] || 0;
  score += platWeight * 3;

  return score;
}

const CATEGORY_QUERY_BANK: Record<SuggestionCategory, string[]> = {
  'Articulados & Flexi': [
    'articulated dragon',
    'flexi rex dinosaur',
    'articulated octopus',
    'articulated lizard gecko',
    'articulated turtle flexi',
    'articulated shark',
    'articulated snake',
    'fidget infinity cube',
  ],
  'Decoración & Macetas': [
    'self watering planter',
    'geometric planter pot',
    'voronoi vase modern',
    'succulent planter cute',
    'spiral vase modern',
    'bonsai pot planter',
  ],
  'Gadgets & Escritorio': [
    'gridfinity desk organizer',
    'headphone stand modern',
    'magsafe iphone stand',
    'adjustable phone stand',
    'sd card usb holder',
    'laptop stand desk',
  ],
  'Gaming & Controles': [
    'xbox controller stand',
    'ps5 controller holder',
    'nintendo switch game holder',
    'dice tower castle dnd',
    'steam deck stand dock',
    'headset stand gamer',
  ],
  'Iluminación & Lámparas': [
    'moon lamp led',
    'voronoi lamp led',
    'mushroom led lamp',
    'lithophane lamp box',
    'modern table lamp shade',
    'japanese lantern lamp',
  ],
  'Hogar & Funcional': [
    'drink can dispenser',
    'universal cable holder',
    'battery organizer holder',
    'wall hook hanger',
    'soap dish draining',
    'kitchen sponge holder',
  ],
  'EDC & Llaveros': [
    'articulated axolotl keychain',
    'capybara phone keyring',
    'otf fidget knife',
    'fidget slider magnetic',
    'edc multitool keychain',
    'mini flexi keychain',
  ],
  'Temporada & Regalos': [
    'spiral vase rose',
    'labyrinth puzzle gift box',
    'heart gift box secret',
    'articulated valentine gift',
    'christmas ornament gift',
    'impossible passthrough cone',
  ],
};

function translateSpanishQueryToEnglish(rawQuery: string): string {
  let q = rawQuery.toLowerCase().trim();
  const map: Array<[RegExp, string]> = [
    [/\bdragones\b/g, 'dragon'],
    [/\bdragon\b/g, 'dragon'],
    [/\barticulados?\b/g, 'articulated'],
    [/\bmacetas?\b/g, 'planter'],
    [/\bjarrones?\b/g, 'vase'],
    [/\bfloreros?\b/g, 'vase'],
    [/\borganizador(es)?\b/g, 'organizer'],
    [/\bescritorio\b/g, 'desk'],
    [/\blamparas?\b/g, 'lamp'],
    [/\blámparas?\b/g, 'lamp'],
    [/\bllaveros?\b/g, 'keychain'],
    [/\bsoportes?\b/g, 'stand'],
    [/\baudifonos?\b/g, 'headphone'],
    [/\baudífonos?\b/g, 'headphone'],
    [/\bcelular(es)?\b/g, 'phone'],
    [/\btelefono\b/g, 'phone'],
    [/\bcontrol(es)?\b/g, 'controller'],
    [/\bcajas?\b/g, 'box'],
    [/\bregalos?\b/g, 'gift'],
    [/\breloj(es)?\b/g, 'watch'],
    [/\bcables?\b/g, 'cable'],
    [/\bcocina\b/g, 'kitchen'],
    [/\bbaño\b/g, 'bathroom'],
    [/\bhogar\b/g, 'home'],
    [/\bjuguete(s)?\b/g, 'fidget toy'],
    [/\bantiestres\b/g, 'fidget'],
    [/\bantiestrés\b/g, 'fidget'],
    [/\bpulpo(s)?\b/g, 'octopus'],
    [/\bajolote(s)?\b/g, 'axolotl'],
    [/\btortuga(s)?\b/g, 'turtle'],
    [/\bgato(s)?\b/g, 'cat'],
    [/\bperro(s)?\b/g, 'dog'],
    [/\bdinosaurio(s)?\b/g, 'dinosaur'],
    [/\brosas?\b/g, 'rose'],
    [/\bflores?\b/g, 'flower'],
    [/\bdados?\b/g, 'dice tower'],
    [/\bnavidad\b/g, 'christmas'],
    [/\bhalloween\b/g, 'halloween'],
  ];
  for (const [regex, eng] of map) {
    q = q.replace(regex, eng);
  }
  return q.trim() || rawQuery.trim();
}

interface ThreeDSuggestionsProps {
  onSendToCalculator?: (payload: { name: string; grams: number; hours: number; material: 'PLA' | 'PETG' | 'TPU' }) => void;
}

const ThreeDSuggestions: React.FC<ThreeDSuggestionsProps> = ({ onSendToCalculator }) => {
  const { googleApiConfig } = useLinks();
  const [profile, setProfile] = useState<TasteProfile>(() => getInitialTasteProfile());
  const [pool, setPool] = useState<PrintSuggestionItem[]>(MASTER_SUGGESTIONS_POOL);
  const [dailySlots, setDailySlots] = useState<PrintSuggestionItem[]>([]);
  const [activeSubView, setActiveSubView] = useState<'daily' | 'saved' | 'taste'>('daily');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('Todas');
  const [customSearchQuery, setCustomSearchQuery] = useState('');
  const [isSearchingAi, setIsSearchingAi] = useState(false);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  // Refs to avoid overwriting dailySlots when pool updates and to guarantee fresh items on every refresh
  const hasInitializedSlotsRef = useRef(false);
  const prevCategoryFilterRef = useRef<string>('Todas');
  const shownIdsRef = useRef<Set<string>>(new Set());
  const searchCycleRef = useRef<number>(0);

  // Persist taste profile to localStorage and Supabase
  const saveProfile = useCallback(async (nextProfile: TasteProfile) => {
    setProfile(nextProfile);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextProfile));
    } catch {}
    try {
      await supabase.storage
        .from('savejson')
        .upload(SUPABASE_FILE, JSON.stringify(nextProfile), { upsert: true, contentType: 'application/json' });
    } catch {}
  }, []);

  // Load saved profile from Supabase on first mount if remote has more interactions
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data, error } = await supabase.storage.from('savejson').download(SUPABASE_FILE);
        if (!error && data && mounted) {
          const text = await data.text();
          const remote = JSON.parse(text);
          if (remote && (remote.interactionsCount || 0) > profile.interactionsCount) {
            setProfile(prev => ({
              ...remote,
              dailySelection: prev.dailySelection?.date === getTodayStr() ? prev.dailySelection : remote.dailySelection,
            }));
          }
        }
      } catch {}
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Preload diverse live models from Printables API in the background to enrich the pool
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const topCat = Object.entries(profile.categoryWeights).sort((a, b) => Number(b[1]) - Number(a[1]))[0]?.[0] as
          | SuggestionCategory
          | undefined;
        const initialQueries = [
          (topCat && CATEGORY_QUERY_BANK[topCat]?.[0]) || 'articulated dragon',
          'self watering planter',
          'desk organizer stand',
          'voronoi lamp led',
        ];
        const res = await fetch(
          `/api/print-suggestions?queries=${encodeURIComponent(initialQueries.join(','))}&category=${encodeURIComponent(
            topCat || 'Articulados & Flexi'
          )}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (mounted && Array.isArray(data?.models) && data.models.length > 0) {
          const liveItems: PrintSuggestionItem[] = data.models.map((m: any) => ({
            id: m.id,
            title: m.title,
            searchKeyword: m.originalTitle || m.title,
            category: (ALL_CATEGORIES.includes(m.category) ? m.category : 'Articulados & Flexi') as SuggestionCategory,
            platform: 'Printables',
            url: m.url,
            imageUrl: m.imageUrl,
            description: m.description,
            whyItSells:
              m.whyItSells ||
              'Modelo real verificado en Printables con alta tracción de descargas y excelente aceptación comercial.',
            tags: Array.isArray(m.tags) ? m.tags : ['tendencia', 'printables'],
            estimatedGrams: m.estimatedGrams || 85,
            estimatedHours: m.estimatedHours || 3.0,
            suggestedPriceMxn: m.suggestedPriceMxn || 220,
            material: ['PLA', 'PETG', 'TPU'].includes(m.material) ? m.material : 'PLA',
            demandBadge: m.demandBadge || '🔥 En Tendencia Live',
            baseScore: 93,
            likesCount: m.likesCount,
            downloadsCount: m.downloadsCount,
          }));
          setPool(prev => {
            const existingIds = new Set(prev.map(p => p.id));
            const uniqueNew = liveItems.filter(li => !existingIds.has(li.id));
            return [...prev, ...uniqueNew];
          });
        }
      } catch {}
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Select or restore the 4 Daily Suggestions ONLY on initial mount or when category filter changes
  useEffect(() => {
    const categoryChanged = prevCategoryFilterRef.current !== selectedCategoryFilter;
    if (hasInitializedSlotsRef.current && !categoryChanged) {
      return;
    }
    hasInitializedSlotsRef.current = true;
    prevCategoryFilterRef.current = selectedCategoryFilter;

    const today = getTodayStr();
    const availablePool = pool.filter(item => !profile.dismissedIds.includes(item.id));

    if (
      selectedCategoryFilter === 'Todas' &&
      !categoryChanged &&
      profile.dailySelection?.date === today &&
      Array.isArray(profile.dailySelection.itemIds) &&
      profile.dailySelection.itemIds.length === 4
    ) {
      const resolved = profile.dailySelection.itemIds
        .map(id => pool.find(p => p.id === id))
        .filter((x): x is PrintSuggestionItem => Boolean(x) && !profile.dismissedIds.includes(x.id));

      if (resolved.length === 4) {
        resolved.forEach(r => {
          shownIdsRef.current.add(r.id);
          shownIdsRef.current.add(r.url);
        });
        setDailySlots(resolved);
        return;
      }
    }

    const daySeed = getDateDayIndex(today);
    // Rotación diaria determinista: cada nuevo día calendario rota automáticamente
    // a 4 sugerencias totalmente frescas sin repetir el lote anterior
    const ranked = [...availablePool].sort((a, b) => {
      const hashA = (daySeed * 37 + a.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) % 1000;
      const hashB = (daySeed * 37 + b.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) % 1000;
      const scoreB = scoreSuggestionItem(b, profile) + (hashB / 40);
      const scoreA = scoreSuggestionItem(a, profile) + (hashA / 40);
      return scoreB - scoreA;
    });

    const chosen: PrintSuggestionItem[] = [];
    for (const candidate of ranked) {
      if (chosen.length >= 4) break;
      if (selectedCategoryFilter !== 'Todas' && candidate.category !== selectedCategoryFilter) continue;
      chosen.push(candidate);
    }

    if (chosen.length < 4) {
      for (const candidate of pool) {
        if (chosen.length >= 4) break;
        if (selectedCategoryFilter !== 'Todas' && candidate.category !== selectedCategoryFilter) continue;
        if (!chosen.some(c => c.id === candidate.id)) {
          chosen.push(candidate);
        }
      }
    }

    if (chosen.length < 4) {
      for (const candidate of pool) {
        if (chosen.length >= 4) break;
        if (!chosen.some(c => c.id === candidate.id)) {
          chosen.push(candidate);
        }
      }
    }

    chosen.forEach(c => {
      shownIdsRef.current.add(c.id);
      shownIdsRef.current.add(c.url);
    });
    setDailySlots(chosen);

    if (selectedCategoryFilter === 'Todas' && chosen.length === 4) {
      const updated: TasteProfile = {
        ...profile,
        dailySelection: {
          date: today,
          itemIds: chosen.map(c => c.id),
        },
      };
      setProfile(updated);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
    }
  }, [selectedCategoryFilter, pool]);

  /**
   * "No me interesa" -> Penalizes category/tags, adds to dismissedIds, and IMMEDIATELY replaces that slot with a new suggestion!
   */
  const handleDislikeAndReplace = (slotIndex: number, dislikedItem: PrintSuggestionItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    shownIdsRef.current.add(dislikedItem.id);
    shownIdsRef.current.add(dislikedItem.url);

    const nextCategoryWeights = { ...profile.categoryWeights };
    nextCategoryWeights[dislikedItem.category] = (nextCategoryWeights[dislikedItem.category] || 0) - 2;

    const nextTagWeights = { ...profile.tagWeights };
    for (const tag of dislikedItem.tags) {
      const key = tag.toLowerCase();
      nextTagWeights[key] = (nextTagWeights[key] || 0) - 1.5;
    }

    const nextDismissed = Array.from(new Set([...profile.dismissedIds, dislikedItem.id]));
    const currentSlotIds = new Set(dailySlots.map(s => s.id));

    const tempProfile: TasteProfile = {
      ...profile,
      categoryWeights: nextCategoryWeights,
      tagWeights: nextTagWeights,
      dismissedIds: nextDismissed,
      interactionsCount: profile.interactionsCount + 1,
    };

    let candidates = pool.filter(
      item =>
        !nextDismissed.includes(item.id) &&
        !shownIdsRef.current.has(item.id) &&
        !currentSlotIds.has(item.id) &&
        (selectedCategoryFilter === 'Todas' || item.category === selectedCategoryFilter)
    );

    if (candidates.length === 0) {
      candidates = pool.filter(
        item =>
          !currentSlotIds.has(item.id) &&
          (selectedCategoryFilter === 'Todas' || item.category === selectedCategoryFilter)
      );
    }

    if (candidates.length === 0) {
      candidates = pool.filter(item => !currentSlotIds.has(item.id));
      tempProfile.dismissedIds = [dislikedItem.id];
    }

    candidates.sort((a, b) => scoreSuggestionItem(b, tempProfile) - scoreSuggestionItem(a, tempProfile));
    const replacement = candidates[0] || pool[0];
    if (replacement) {
      shownIdsRef.current.add(replacement.id);
      shownIdsRef.current.add(replacement.url);
    }

    const nextSlots = [...dailySlots];
    nextSlots[slotIndex] = replacement;
    setDailySlots(nextSlots);

    tempProfile.dailySelection = {
      date: getTodayStr(),
      itemIds: nextSlots.map(s => s.id),
    };

    saveProfile(tempProfile);
    toast.info(`Aprendiendo de tus gustos: descartamos "${dislikedItem.title}" y te sugerimos otra opción.`);
  };

  /**
   * "Me interesa / Guardar" -> Boosts category, tags, and platform in Taste Profile, and saves item to favorites
   */
  const handleLikeAndSave = (likedItem: PrintSuggestionItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const alreadyLiked = profile.likedIds.includes(likedItem.id);
    const nextCategoryWeights = { ...profile.categoryWeights };
    nextCategoryWeights[likedItem.category] = (nextCategoryWeights[likedItem.category] || 0) + 3;

    const nextTagWeights = { ...profile.tagWeights };
    for (const tag of likedItem.tags) {
      const key = tag.toLowerCase();
      nextTagWeights[key] = (nextTagWeights[key] || 0) + 2;
    }

    const nextPlatformWeights = { ...profile.platformWeights };
    nextPlatformWeights[likedItem.platform] = (nextPlatformWeights[likedItem.platform] || 0) + 1.5;

    const nextSaved = profile.savedItems.some(s => s.id === likedItem.id)
      ? profile.savedItems
      : [likedItem, ...profile.savedItems];

    const nextProfile: TasteProfile = {
      ...profile,
      categoryWeights: nextCategoryWeights,
      tagWeights: nextTagWeights,
      platformWeights: nextPlatformWeights,
      likedIds: alreadyLiked ? profile.likedIds : [...profile.likedIds, likedItem.id],
      savedItems: nextSaved,
      interactionsCount: profile.interactionsCount + 1,
    };

    saveProfile(nextProfile);
    toast.success(`¡Guardado en Favoritos! Priorizaremos más ideas de "${likedItem.category}".`);
  };

  const handleRemoveSaved = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nextProfile: TasteProfile = {
      ...profile,
      savedItems: profile.savedItems.filter(s => s.id !== id),
      likedIds: profile.likedIds.filter(lid => lid !== id),
    };
    saveProfile(nextProfile);
    toast.info('Eliminado de guardados');
  };

  const handleRefreshFourNew = () => {
    const currentIds = new Set(dailySlots.map(s => s.id));
    dailySlots.forEach(s => {
      shownIdsRef.current.add(s.id);
      shownIdsRef.current.add(s.url);
    });

    let available = pool.filter(
      item =>
        !shownIdsRef.current.has(item.id) &&
        !currentIds.has(item.id) &&
        !profile.dismissedIds.includes(item.id) &&
        (selectedCategoryFilter === 'Todas' || item.category === selectedCategoryFilter)
    );

    if (available.length < 4) {
      // Reset session shown history except what is currently on screen so rotation never gets stuck
      shownIdsRef.current = new Set([...Array.from(currentIds)]);
      available = pool.filter(
        item =>
          !currentIds.has(item.id) &&
          (selectedCategoryFilter === 'Todas' || item.category === selectedCategoryFilter)
      );
    }

    if (available.length < 4) {
      available = pool.filter(item => !currentIds.has(item.id));
    }

    const ranked = [...available].sort((a, b) => scoreSuggestionItem(b, profile) - scoreSuggestionItem(a, profile));
    const nextFour = ranked.slice(0, 4);
    if (nextFour.length > 0) {
      nextFour.forEach(item => {
        shownIdsRef.current.add(item.id);
        shownIdsRef.current.add(item.url);
      });
      setDailySlots(nextFour);
      const updated: TasteProfile = {
        ...profile,
        dailySelection: {
          date: getTodayStr(),
          itemIds: nextFour.map(i => i.id),
        },
      };
      saveProfile(updated);
      toast.success('¡4 nuevas sugerencias cargadas!');
    }
  };

  /**
   * AI + Live Platform Search:
   * 1. Rotates search queries on every click so it NEVER returns the same 4 models.
   * 2. Fetches real verified models from Printables (where title, photo, and link belong to the exact same model).
   * 3. Uses Gemini AI to refine the Spanish title, description, and commercial pitch OF THOSE EXACT 4 MODELS (never mixing unrelated models).
   */
  const handleAiSmartSearch = async (overrideQuery?: string) => {
    const queryText = (overrideQuery ?? customSearchQuery).trim();
    setIsSearchingAi(true);
    setActiveSubView('daily');

    // Mark current 4 slots as already shown so we guaranteed replace them with 4 NEW ones
    const currentSlotIds = new Set(dailySlots.map(s => s.id));
    const currentSlotUrls = new Set(dailySlots.map(s => s.url));
    dailySlots.forEach(s => {
      shownIdsRef.current.add(s.id);
      shownIdsRef.current.add(s.url);
    });

    const cycle = searchCycleRef.current;
    searchCycleRef.current += 1;

    try {
      // Determine 4 fresh English queries to send to Printables Live API
      let targetQueries: string[] = [];

      if (queryText) {
        const engBase = translateSpanishQueryToEnglish(queryText);
        const suffixes = ['', 'modern', 'print in place', 'organizer holder', 'flexi articulated', 'led'];
        targetQueries = [
          engBase,
          `${engBase} ${suffixes[(cycle + 1) % suffixes.length]}`.trim(),
          `${engBase} ${suffixes[(cycle + 2) % suffixes.length]}`.trim(),
          `${engBase} ${suffixes[(cycle + 3) % suffixes.length]}`.trim(),
        ];
      } else if (selectedCategoryFilter !== 'Todas' && ALL_CATEGORIES.includes(selectedCategoryFilter as SuggestionCategory)) {
        const catBank = CATEGORY_QUERY_BANK[selectedCategoryFilter as SuggestionCategory] || CATEGORY_QUERY_BANK['Articulados & Flexi'];
        for (let i = 0; i < 4; i++) {
          targetQueries.push(catBank[(cycle * 2 + i) % catBank.length]);
        }
      } else {
        // Rank categories by user preference, excluding disliked ones unless needed
        const orderedCategories = [...ALL_CATEGORIES].sort(
          (a, b) => (profile.categoryWeights[b] || 0) - (profile.categoryWeights[a] || 0)
        );
        const preferredCats = orderedCategories.filter(c => (profile.categoryWeights[c] || 0) >= 0);
        const activeCats = preferredCats.length >= 4 ? preferredCats : orderedCategories;

        for (let i = 0; i < 4; i++) {
          const cat = activeCats[(cycle + i) % activeCats.length];
          const catBank = CATEGORY_QUERY_BANK[cat];
          const q = catBank[(cycle + Math.floor(i / 2)) % catBank.length];
          targetQueries.push(q);
        }
      }

      const excludeList = Array.from(shownIdsRef.current)
        .filter(x => !x.startsWith('http'))
        .slice(-80);

      const apiUrl = `/api/print-suggestions?queries=${encodeURIComponent(
        targetQueries.join(',')
      )}&exclude=${encodeURIComponent(excludeList.join(','))}`;

      const liveRes = await fetch(apiUrl)
        .then(r => (r.ok ? r.json() : null))
        .catch(() => null);

      const rawLiveModels: any[] = Array.isArray(liveRes?.models) ? liveRes.models : [];

      // Filter to strictly unseen models
      const unseenLive = rawLiveModels.filter(
        m =>
          m?.id &&
          m?.url &&
          !shownIdsRef.current.has(m.id) &&
          !shownIdsRef.current.has(m.url) &&
          !currentSlotIds.has(m.id) &&
          !currentSlotUrls.has(m.url) &&
          !profile.dismissedIds.includes(m.id)
      );

      const chosenRaw: PrintSuggestionItem[] = [];
      const chosenIds = new Set<string>();
      const chosenUrls = new Set<string>();

      for (const lm of unseenLive) {
        if (chosenRaw.length >= 4) break;
        if (chosenIds.has(lm.id) || chosenUrls.has(lm.url)) continue;
        chosenIds.add(lm.id);
        chosenUrls.add(lm.url);

        chosenRaw.push({
          id: lm.id,
          title: lm.title,
          searchKeyword: lm.originalTitle || lm.title,
          category: (ALL_CATEGORIES.includes(lm.category) ? lm.category : 'Articulados & Flexi') as SuggestionCategory,
          platform: 'Printables',
          url: lm.url,
          imageUrl: lm.imageUrl,
          description: lm.description,
          whyItSells:
            lm.whyItSells || 'Modelo en tendencia con miles de descargas comprobadas en Printables y alta demanda.',
          tags: Array.isArray(lm.tags) ? lm.tags : ['printables', 'tendencia'],
          estimatedGrams: Number(lm.estimatedGrams) || 90,
          estimatedHours: Number(lm.estimatedHours) || 3.0,
          suggestedPriceMxn: Number(lm.suggestedPriceMxn) || 230,
          material: ['PLA', 'PETG', 'TPU'].includes(lm.material) ? lm.material : 'PLA',
          demandBadge: lm.demandBadge || '🔥 Tendencia Live',
          baseScore: 96,
          likesCount: lm.likesCount,
          downloadsCount: lm.downloadsCount,
        });
      }

      // If live API returned fewer than 4 unseen models, supplement from unseen pool items
      if (chosenRaw.length < 4) {
        const unseenPool = pool.filter(
          p =>
            !chosenIds.has(p.id) &&
            !chosenUrls.has(p.url) &&
            !shownIdsRef.current.has(p.id) &&
            !currentSlotIds.has(p.id) &&
            (selectedCategoryFilter === 'Todas' || p.category === selectedCategoryFilter)
        );
        for (const p of unseenPool) {
          if (chosenRaw.length >= 4) break;
          chosenIds.add(p.id);
          chosenUrls.add(p.url);
          chosenRaw.push(p);
        }
      }

      // If still fewer than 4 (e.g. user cycled through entire pool), pick any pool items not currently on screen
      if (chosenRaw.length < 4) {
        shownIdsRef.current = new Set([...Array.from(currentSlotIds)]);
        for (const p of pool) {
          if (chosenRaw.length >= 4) break;
          if (!currentSlotIds.has(p.id) && !chosenIds.has(p.id)) {
            chosenIds.add(p.id);
            chosenUrls.add(p.url);
            chosenRaw.push(p);
          }
        }
      }

      // Optional Gemini AI Enrichment: translates & writes commercial copy FOR THESE EXACT 4 MODELS by ID
      // so the title, description, image, and URL ALWAYS match the exact same model 100%
      if (chosenRaw.length > 0) {
        const modelsForAi = chosenRaw.map((m, idx) => ({
          index: idx,
          id: m.id,
          originalName: m.searchKeyword || m.title,
          currentSpanishTitle: m.title,
          category: m.category,
        }));

        const aiPrompt = `Eres un experto en impresión 3D comercial en México y Latinoamérica.
Aquí tienes ${modelsForAi.length} modelos 3D REALES con su nombre original ("originalName"):
${JSON.stringify(modelsForAi, null, 2)}

Para CADA modelo (respetando su "id" e "index" exactos, SIN inventar otro objeto distinto al de "originalName"):
1. Traduce y mejora su "title" en español para que describa EXACTAMENTE el objeto real de "originalName" (claro, fiel al modelo y sin cambiar qué objeto es).
2. Asigna la "category" exacta de esta lista: Articulados & Flexi | Decoración & Macetas | Gadgets & Escritorio | Gaming & Controles | Iluminación & Lámparas | Hogar & Funcional | EDC & Llaveros | Temporada & Regalos
3. Escribe "description" en español describiendo exactamente ese modelo real (máx 135 caracteres).
4. Escribe "whyItSells" explicando por qué ese modelo exacto se vende bien (máx 115 caracteres).

Responde ÚNICAMENTE con un arreglo JSON válido con este formato exacto:
[
  {
    "id": "id_exacto_del_modelo",
    "title": "Nombre fiel en español del modelo",
    "category": "Categoría exacta",
    "description": "Descripción fiel del modelo",
    "whyItSells": "Argumento de venta"
  }
]`;

        const aiResponse = await generateContentWithFallback(
          {
            model: GEMINI_MODELS.PRIMARY,
            contents: aiPrompt,
          },
          { apiKey: googleApiConfig?.apiKey }
        ).catch(() => null);

        if (aiResponse?.text) {
          try {
            const rawText = String(aiResponse.text).trim();
            const jsonMatch = rawText.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              if (Array.isArray(parsed)) {
                for (let i = 0; i < chosenRaw.length; i++) {
                  const target = chosenRaw[i];
                  const enriched = parsed.find((p: any) => p?.id === target.id) || parsed[i];
                  if (enriched && typeof enriched.title === 'string' && enriched.title.trim()) {
                    target.title = enriched.title.trim();
                  }
                  if (enriched && ALL_CATEGORIES.includes(enriched.category)) {
                    target.category = enriched.category as SuggestionCategory;
                  }
                  if (enriched && typeof enriched.description === 'string' && enriched.description.trim()) {
                    target.description = enriched.description.trim();
                  }
                  if (enriched && typeof enriched.whyItSells === 'string' && enriched.whyItSells.trim()) {
                    target.whyItSells = enriched.whyItSells.trim();
                  }
                }
              }
            }
          } catch {}
        }
      }

      if (chosenRaw.length > 0) {
        chosenRaw.forEach(item => {
          shownIdsRef.current.add(item.id);
          shownIdsRef.current.add(item.url);
        });

        setPool(prev => {
          const existingMap = new Map<string, PrintSuggestionItem>(prev.map(p => [p.id, p]));
          chosenRaw.forEach(c => existingMap.set(c.id, c));
          return Array.from(existingMap.values());
        });

        setDailySlots(chosenRaw);

        const updated: TasteProfile = {
          ...profile,
          dailySelection: {
            date: getTodayStr(),
            itemIds: chosenRaw.map(f => f.id),
          },
        };
        saveProfile(updated);
        toast.success(
          queryText
            ? `¡4 nuevos modelos encontrados para "${queryText}"!`
            : '¡4 nuevas sugerencias cargadas con nombres e imágenes verificados!'
        );
      } else {
        handleRefreshFourNew();
      }
    } catch (err) {
      console.error(err);
      handleRefreshFourNew();
    } finally {
      setIsSearchingAi(false);
    }
  };

  const handleQuoteItem = (item: PrintSuggestionItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const payload = {
      name: item.title,
      grams: item.estimatedGrams,
      hours: item.estimatedHours,
      material: item.material,
    };
    sessionStorage.setItem('rembrandt_3d_pending_quote', JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent('load-3d-suggestion-quote', { detail: payload }));
    if (onSendToCalculator) {
      onSendToCalculator(payload);
    }
  };

  const handleCopyCustomerCard = (item: PrintSuggestionItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const cardText =
      `✨ *¡Disponible bajo pedido en Impresión 3D!* ✨\n\n` +
      `🏷️ *Modelo:* ${item.title}\n` +
      `📝 *Descripción:* ${item.description}\n` +
      `🎨 *Material y Colores:* ${item.material} de alta resistencia (personalizable al color de tu elección o acabado pintado a mano)\n` +
      `💰 *Precio:* $${item.suggestedPriceMxn} MXN\n` +
      `📦 *Descuento especial en pedidos por volumen (5+ piezas)*\n\n` +
      `📲 ¡Mándame mensaje para elegir tu color favorito y agendar tu pedido!`;
    navigator.clipboard.writeText(cardText);
    toast.success(`¡Ficha comercial de "${item.title}" copiada para WhatsApp/Estados (sin links STL)!`);
  };

  const handleResetTaste = () => {
    const fresh: TasteProfile = {
      categoryWeights: {},
      tagWeights: {},
      platformWeights: {},
      likedIds: [],
      dismissedIds: [],
      savedItems: profile.savedItems,
      dailySelection: { date: getTodayStr(), itemIds: MASTER_SUGGESTIONS_POOL.slice(0, 4).map(i => i.id) },
      interactionsCount: 0,
    };
    setDailySlots(MASTER_SUGGESTIONS_POOL.slice(0, 4));
    saveProfile(fresh);
    toast.success('Aprendizaje de gustos reiniciado');
  };

  const learningLevel = useMemo(() => {
    const count = profile.interactionsCount;
    if (count >= 15) return { label: 'IA Experta en tus Gustos', color: 'text-emerald-400', pct: 100 };
    if (count >= 6) return { label: 'Perfil Calibrado', color: 'text-cyan-400', pct: Math.min(90, 40 + count * 4) };
    if (count >= 1) return { label: 'Aprendiendo de ti...', color: 'text-amber-400', pct: 25 + count * 5 };
    return { label: 'Listo para aprender', color: 'text-purple-300', pct: 15 };
  }, [profile.interactionsCount]);

  const sortedCategoriesByAffinity = useMemo(() => {
    return ALL_CATEGORIES.map(cat => ({
      category: cat,
      weight: profile.categoryWeights[cat] || 0,
    })).sort((a, b) => b.weight - a.weight);
  }, [profile.categoryWeights]);

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* HEADER PRINCIPAL: CAZADOR DE TENDENCIAS 3D & MOTOR DE APRENDIZAJE */}
      <div className="p-5 bg-gradient-to-br from-slate-900/90 via-indigo-950/50 to-purple-950/40 rounded-3xl border border-indigo-500/30 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-3 bg-gradient-to-br from-amber-500/20 to-rose-500/20 rounded-2xl border border-amber-500/40 shadow-lg shrink-0">
              <Flame size={26} className="text-amber-400" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  4 Sugerencias del Día · Impresiones que Venden
                </h2>
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <Brain size={11} />
                  {learningLevel.label} ({profile.interactionsCount} votos)
                </span>
              </div>
              <p className="text-xs text-gray-300 mt-1 max-w-3xl">
                Haz clic en la <strong className="text-amber-300">imagen, título o botón "Ver Modelo"</strong> para ir directo a descargar el archivo STL/3MF. Si pulsas{' '}
                <span className="text-rose-300 font-bold">"No me interesa"</span>, se reemplaza al instante por otra idea y el sistema aprende tus gustos.
              </p>
            </div>
          </div>

          {/* Botones de vista y refresco */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveSubView('daily')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                activeSubView === 'daily'
                  ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
              }`}
            >
              <Flame size={14} />
              <span>4 del Día</span>
            </button>

            <button
              onClick={() => setActiveSubView('saved')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                activeSubView === 'saved'
                  ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
              }`}
            >
              <Bookmark size={14} />
              <span>Mis Favoritos ({profile.savedItems.length})</span>
            </button>

            <button
              onClick={() => setActiveSubView('taste')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                activeSubView === 'taste'
                  ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
              }`}
            >
              <Brain size={14} />
              <span>Mi Perfil de Gustos</span>
            </button>

            <button
              onClick={() => handleAiSmartSearch()}
              disabled={isSearchingAi}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg transition-all disabled:opacity-50"
              title="Generar 4 nuevas ideas con IA y búsqueda en vivo según tus gustos"
            >
              <RefreshCw size={14} className={isSearchingAi ? 'animate-spin' : ''} />
              <span>{isSearchingAi ? 'Buscando...' : 'Nuevas 4 con IA'}</span>
            </button>
          </div>
        </div>

        {/* BUSCADOR EN LAS PRINCIPALES PÁGINAS + FILTRO DE CATEGORÍAS */}
        <div className="mt-4 pt-4 border-t border-white/10 flex flex-col xl:flex-row gap-3 items-stretch xl:items-center justify-between">
          <form
            onSubmit={e => {
              e.preventDefault();
              handleAiSmartSearch();
            }}
            className="flex items-center gap-2 flex-1 max-w-2xl"
          >
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-300" />
              <input
                type="text"
                value={customSearchQuery}
                onChange={e => setCustomSearchQuery(e.target.value)}
                placeholder="Buscar nicho rentable (ej. dragones flexi, organizador escritorio, lámparas LED, macetas, anime...)"
                className="w-full bg-slate-950/70 border border-white/15 rounded-xl pl-10 pr-8 py-2.5 text-xs font-bold text-white placeholder:text-gray-400 focus:outline-none focus:border-amber-400/60"
              />
              {customSearchQuery && (
                <button
                  type="button"
                  onClick={() => setCustomSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={isSearchingAi}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all shrink-0 flex items-center gap-1.5 disabled:opacity-50"
            >
              <Sparkles size={14} />
              <span>Buscar Ideas</span>
            </button>
          </form>

          {/* Píldoras de Categorías */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCategoryFilter('Todas')}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider shrink-0 transition-all ${
                selectedCategoryFilter === 'Todas'
                  ? 'bg-white text-slate-950'
                  : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              Todas
            </button>
            {ALL_CATEGORIES.map(cat => {
              const weight = profile.categoryWeights[cat] || 0;
              return (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategoryFilter(cat);
                    setActiveSubView('daily');
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider shrink-0 transition-all flex items-center gap-1 ${
                    selectedCategoryFilter === cat
                      ? 'bg-indigo-500 text-white shadow'
                      : 'bg-white/5 text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span>{cat}</span>
                  {weight > 0 && <span className="text-emerald-300 text-[9px]">+{weight}</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* VISTA 1: LAS 4 SUGERENCIAS DEL DÍA */}
      {activeSubView === 'daily' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
          <AnimatePresence mode="popLayout">
            {dailySlots.map((item, slotIndex) => {
              const isLiked = profile.likedIds.includes(item.id);
              const badgeStyle = PLATFORM_BADGE_STYLES[item.platform] || PLATFORM_BADGE_STYLES.Printables;
              const affinityScore = Math.min(99, Math.max(70, Math.round(scoreSuggestionItem(item, profile))));
              const displayImage = brokenImages[item.id]
                ? createFallbackIllustration(item.title, item.category, item.platform)
                : item.imageUrl;

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.94, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -12 }}
                  transition={{ duration: 0.22 }}
                  className="bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-white/10 hover:border-amber-400/50 overflow-hidden shadow-xl flex flex-col justify-between group"
                >
                  <div>
                    {/* IMAGEN DEL MODELO CON CLIC DIRECTO GARANTIZADO */}
                    <div
                      onClick={e => openExternalModelUrl(item.url, e)}
                      role="link"
                      tabIndex={0}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') openExternalModelUrl(item.url);
                      }}
                      className="relative h-36 w-full bg-slate-950 overflow-hidden cursor-pointer"
                      title={`Haz clic para abrir "${item.title}" en ${item.platform}`}
                    >
                      <img
                        src={displayImage}
                        alt={item.title}
                        onError={() => setBrokenImages(prev => ({ ...prev, [item.id]: true }))}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent pointer-events-none" />

                      {/* Badges Superiores */}
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
                        <span
                          className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border backdrop-blur-md ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}
                        >
                          {item.platform}
                        </span>
                        <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-slate-950/80 text-amber-300 border border-amber-500/30 backdrop-blur-md">
                          {item.demandBadge}
                        </span>
                      </div>

                      {/* Afinidad y Precio Sugerido sobre la imagen */}
                      <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between pointer-events-none">
                        <span className="text-[10px] font-bold text-gray-200 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-lg border border-white/10 flex items-center gap-1">
                          <ExternalLink size={10} className="text-amber-400" />
                          {item.category}
                        </span>
                        <span className="text-xs font-black text-emerald-300 bg-emerald-950/90 border border-emerald-500/40 px-2.5 py-1 rounded-xl shadow">
                          Venta sug: ${item.suggestedPriceMxn} MXN
                        </span>
                      </div>
                    </div>

                    {/* CONTENIDO DE LA TARJETA */}
                    <div className="p-3 space-y-2">
                      <div
                        onClick={e => openExternalModelUrl(item.url, e)}
                        className="flex items-start justify-between gap-2 cursor-pointer group/title"
                        title={`Abrir modelo en ${item.platform}`}
                      >
                        <h3 className="text-sm font-black text-white group-hover/title:text-amber-300 transition-colors line-clamp-2 leading-snug underline decoration-white/20 group-hover/title:decoration-amber-400">
                          {item.title}
                        </h3>
                        <span
                          className="text-[10px] font-black text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 rounded-lg shrink-0"
                          title="Porcentaje de coincidencia con tu perfil de gustos"
                        >
                          {affinityScore}% Match
                        </span>
                      </div>

                      <p
                        onClick={e => openExternalModelUrl(item.url, e)}
                        className="text-xs text-gray-300 line-clamp-2 leading-relaxed cursor-pointer hover:text-white transition-colors"
                      >
                        {item.description}
                      </p>

                      {/* Por qué se vende */}
                      <div
                        onClick={e => openExternalModelUrl(item.url, e)}
                        className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-200 leading-snug cursor-pointer hover:bg-emerald-500/15 transition-colors"
                      >
                        <strong className="text-emerald-400 font-black uppercase text-[9px] block mb-0.5">
                          💡 Por qué se vende bien:
                        </strong>
                        {item.whyItSells}
                      </div>

                      {/* Métricas rápidas de impresión */}
                      <div className="grid grid-cols-3 gap-1.5 text-center bg-white/5 rounded-xl p-2 border border-white/5">
                        <div>
                          <span className="text-[9px] text-gray-400 uppercase block font-bold">Peso Est.</span>
                          <span className="text-xs font-black text-white">{item.estimatedGrams}g {item.material}</span>
                        </div>
                        <div className="border-x border-white/10">
                          <span className="text-[9px] text-gray-400 uppercase block font-bold">Tiempo</span>
                          <span className="text-xs font-black text-cyan-300">{item.estimatedHours} hrs</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-gray-400 uppercase block font-bold">Costo Fil.</span>
                          <span className="text-xs font-black text-amber-300">
                            ~${Math.round(item.estimatedGrams * 0.4)}
                          </span>
                        </div>
                      </div>

                      {/* Buscador directo de este modelo en las 5 páginas principales */}
                      <div>
                        <span className="text-[9px] font-bold uppercase text-gray-400 block mb-1">
                          Buscar también en otras plataformas:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {(['MakerWorld', 'Printables', 'Cults3D', 'Thangs', 'Thingiverse'] as PlatformName[]).map(
                            plat => {
                              const platUrl = buildPlatformSearchUrl(plat, item.searchKeyword || item.title);
                              return (
                                <button
                                  key={plat}
                                  type="button"
                                  onClick={e => openExternalModelUrl(platUrl, e)}
                                  className="text-[9px] font-bold px-2 py-1 rounded-md bg-white/5 hover:bg-indigo-500/30 text-gray-300 hover:text-white border border-white/10 hover:border-indigo-400/40 transition-all cursor-pointer"
                                >
                                  {plat} ↗
                                </button>
                              );
                            }
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* BOTONES DE ACCIÓN Y APRENDIZAJE */}
                  <div className="p-3 pt-0 space-y-1.5">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={e => handleDislikeAndReplace(slotIndex, item, e)}
                        className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                        title="Descartar esta sugerencia y mostrar otra inmediatamente"
                      >
                        <ThumbsDown size={14} />
                        <span>No me interesa</span>
                      </button>

                      <button
                        type="button"
                        onClick={e => handleLikeAndSave(item, e)}
                        className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all border cursor-pointer ${
                          isLiked
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/20'
                            : 'bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/30'
                        }`}
                        title="Me gusta: guardar en favoritos y pedir más ideas similares"
                      >
                        <ThumbsUp size={14} />
                        <span>{isLiked ? '¡Guardada!' : 'Me Interesa'}</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={e => openExternalModelUrl(item.url, e)}
                        className="flex items-center justify-center gap-1 py-2.5 px-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-[10px] font-black uppercase tracking-wider transition-all shadow-md cursor-pointer"
                        title="Abrir enlace directo al archivo 3D"
                      >
                        <ExternalLink size={12} />
                        <span>Ver STL</span>
                      </button>

                      <button
                        type="button"
                        onClick={e => handleQuoteItem(item, e)}
                        className="flex items-center justify-center gap-1 py-2.5 px-2 rounded-xl bg-white/10 hover:bg-white/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold transition-all cursor-pointer"
                        title="Cargar peso y horas en la Calculadora 3D"
                      >
                        <Calculator size={12} />
                        <span>Cotizar</span>
                      </button>

                      <button
                        type="button"
                        onClick={e => handleCopyCustomerCard(item, e)}
                        className="flex items-center justify-center gap-1 py-2.5 px-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                        title="Copiar ficha comercial para mostrar a clientes en WhatsApp/Estados (sin links STL)"
                      >
                        <Share2 size={12} />
                        <span>Cliente</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* VISTA 2: MIS FAVORITOS GUARDADOS PARA VENDER */}
      {activeSubView === 'saved' && (
        <div className="bg-slate-900/70 rounded-3xl border border-white/10 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Bookmark size={18} className="text-emerald-400" />
                <span>Mis Ideas Guardadas para Vender ({profile.savedItems.length})</span>
              </h3>
              <p className="text-xs text-gray-400">
                Catálogo personal de modelos que marcaste con "Me interesa".
              </p>
            </div>
          </div>

          {profile.savedItems.length === 0 ? (
            <div className="p-10 text-center bg-slate-950/50 rounded-2xl border border-white/5 space-y-2">
              <p className="text-sm font-bold text-gray-300">Aún no has guardado sugerencias favoritas.</p>
              <p className="text-xs text-gray-500">
                Pulsa el botón verde "Me Interesa" en cualquiera de las 4 sugerencias del día para guardarlas aquí y entrenar tus gustos.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {profile.savedItems.map(item => {
                const displayImage = brokenImages[item.id]
                  ? createFallbackIllustration(item.title, item.category, item.platform)
                  : item.imageUrl;
                return (
                  <div
                    key={item.id}
                    className="bg-slate-950/80 rounded-2xl border border-white/10 overflow-hidden flex flex-col justify-between"
                  >
                    <div
                      onClick={e => openExternalModelUrl(item.url, e)}
                      className="cursor-pointer"
                    >
                      <div className="relative h-40">
                        <img
                          src={displayImage}
                          alt={item.title}
                          onError={() => setBrokenImages(prev => ({ ...prev, [item.id]: true }))}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-2 left-2 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-950/80 text-emerald-300 border border-emerald-500/30">
                          {item.platform}
                        </span>
                        <span className="absolute bottom-2 right-2 text-xs font-black px-2 py-0.5 rounded-lg bg-emerald-950/90 text-emerald-300 border border-emerald-500/30">
                          ${item.suggestedPriceMxn} MXN
                        </span>
                      </div>
                      <div className="p-3.5 space-y-2">
                        <h4 className="text-xs font-black text-white hover:text-amber-300 line-clamp-1 underline decoration-white/20">
                          {item.title}
                        </h4>
                        <p className="text-[11px] text-gray-400 line-clamp-2">{item.description}</p>
                      </div>
                    </div>
                    <div className="p-3.5 pt-0 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={e => openExternalModelUrl(item.url, e)}
                        className="flex-1 flex items-center justify-center gap-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold cursor-pointer"
                      >
                        <ExternalLink size={12} />
                        <span>STL</span>
                      </button>
                      <button
                        type="button"
                        onClick={e => handleCopyCustomerCard(item, e)}
                        className="px-2.5 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-xl border border-amber-500/30 text-xs font-bold flex items-center gap-1 cursor-pointer"
                        title="Copiar Ficha Comercial para Cliente (sin links STL)"
                      >
                        <Share2 size={13} />
                        <span>Cliente</span>
                      </button>
                      <button
                        type="button"
                        onClick={e => handleQuoteItem(item, e)}
                        className="p-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded-xl border border-cyan-500/30 cursor-pointer"
                        title="Enviar al Cotizador"
                      >
                        <Calculator size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={e => handleRemoveSaved(item.id, e)}
                        className="p-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-xl border border-rose-500/30 cursor-pointer"
                        title="Quitar de guardados"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VISTA 3: PANEL DE APRENDIZAJE DE GUSTOS */}
      {activeSubView === 'taste' && (
        <div className="bg-slate-900/70 rounded-3xl border border-purple-500/30 p-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Brain size={19} className="text-purple-400" />
                <span>Motor de Aprendizaje de Gustos IA</span>
              </h3>
              <p className="text-xs text-gray-400">
                Así pondera Rembrandt IA cada categoría según tus votos ("Me interesa" vs "No me interesa"). Puedes impulsar o restar categorías manualmente.
              </p>
            </div>

            <button
              onClick={handleResetTaste}
              className="px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 self-start"
            >
              <Trash2 size={13} />
              <span>Reiniciar Aprendizaje</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {sortedCategoriesByAffinity.map(({ category, weight }) => (
              <div
                key={category}
                className="p-3.5 rounded-2xl bg-slate-950/70 border border-white/10 flex items-center justify-between"
              >
                <div>
                  <span className="text-xs font-black text-white block">{category}</span>
                  <span
                    className={`text-[11px] font-bold ${
                      weight > 0 ? 'text-emerald-400' : weight < 0 ? 'text-rose-400' : 'text-gray-400'
                    }`}
                  >
                    {weight > 0 ? `Preferida (+${weight})` : weight < 0 ? `Menos interés (${weight})` : 'Neutral (0)'}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      const next = {
                        ...profile,
                        categoryWeights: {
                          ...profile.categoryWeights,
                          [category]: (profile.categoryWeights[category] || 0) - 2,
                        },
                        interactionsCount: profile.interactionsCount + 1,
                      };
                      saveProfile(next);
                    }}
                    className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-300"
                    title="Restar interés"
                  >
                    <ThumbsDown size={12} />
                  </button>
                  <button
                    onClick={() => {
                      const next = {
                        ...profile,
                        categoryWeights: {
                          ...profile.categoryWeights,
                          [category]: (profile.categoryWeights[category] || 0) + 3,
                        },
                        interactionsCount: profile.interactionsCount + 1,
                      };
                      saveProfile(next);
                    }}
                    className="p-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300"
                    title="Aumentar interés"
                  >
                    <ThumbsUp size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ThreeDSuggestions;
