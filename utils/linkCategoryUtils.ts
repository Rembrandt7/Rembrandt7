import { LinkItem } from '../types';

export type LinkCategory = 'trabajo' | 'compras' | 'social';
export type LinkCategoryFilter = LinkCategory;

/**
 * Automatically infers the category of a link if not explicitly set.
 */
export function inferLinkCategory(item: Partial<LinkItem>): LinkCategory {
  if (item.category) {
    return item.category;
  }

  const name = (item.name || '').toLowerCase();
  const href = (item.href || '').toLowerCase();

  // 1. Compras (Mercado Libre, Amazon, etc.)
  if (
    name.includes('mercado') ||
    name.includes('amazon') ||
    name.includes('aliexpress') ||
    name.includes('walmart') ||
    name.includes('ebay') ||
    name.includes('shein') ||
    name.includes('temu') ||
    name.includes('compra') ||
    href.includes('mercadolibre') ||
    href.includes('amazon') ||
    href.includes('aliexpress') ||
    href.includes('walmart') ||
    href.includes('ebay') ||
    href.includes('temu')
  ) {
    return 'compras';
  }

  // 2. Social (WhatsApp, Facebook, Instagram, Pinterest, X/Twitter, etc.)
  if (
    name.includes('whatsapp') ||
    name.includes('facebook') ||
    name.includes('instagram') ||
    name.includes('pinterest') ||
    name.includes('twitter') ||
    name === 'x' ||
    name.includes('tik tok') ||
    name.includes('tiktok') ||
    name.includes('reddit') ||
    name.includes('discord') ||
    name.includes('telegram') ||
    href.includes('whatsapp') ||
    href.includes('facebook') ||
    href.includes('fb.com') ||
    href.includes('instagram') ||
    href.includes('pinterest') ||
    href.includes('twitter') ||
    href.includes('x.com') ||
    href.includes('tiktok') ||
    href.includes('discord') ||
    href.includes('telegram')
  ) {
    return 'social';
  }

  // 3. Trabajo (default for productivity/work: Notion, Flow, Javer, MakerWorld, Maket AI, CapCut, etc.)
  return 'trabajo';
}

export interface CategoryDefinition {
  id: LinkCategory;
  label: string;
  iconType: 'trabajo' | 'compras' | 'social';
  accentClass: string;
  activeClass: string;
  hoverClass: string;
}

export const CATEGORY_DEFINITIONS: CategoryDefinition[] = [
  {
    id: 'trabajo',
    label: 'Trabajo',
    iconType: 'trabajo',
    accentClass: 'text-blue-400',
    activeClass: 'bg-blue-600/30 text-blue-300 border-blue-400/50 shadow-[0_0_15px_rgba(59,130,246,0.3)] ring-1 ring-blue-400/40',
    hoverClass: 'hover:bg-blue-500/10 hover:text-blue-300'
  },
  {
    id: 'compras',
    label: 'Compras',
    iconType: 'compras',
    accentClass: 'text-amber-400',
    activeClass: 'bg-amber-600/30 text-amber-300 border-amber-400/50 shadow-[0_0_15px_rgba(245,158,11,0.3)] ring-1 ring-amber-400/40',
    hoverClass: 'hover:bg-amber-500/10 hover:text-amber-300'
  },
  {
    id: 'social',
    label: 'Social',
    iconType: 'social',
    accentClass: 'text-pink-400',
    activeClass: 'bg-pink-600/30 text-pink-300 border-pink-400/50 shadow-[0_0_15px_rgba(236,72,153,0.3)] ring-1 ring-pink-400/40',
    hoverClass: 'hover:bg-pink-500/10 hover:text-pink-300'
  }
];

export const CANONICAL_LINKS_MAP: Record<string, Partial<LinkItem>> = {
  'mercadolibre': {
    id: '1',
    name: 'Mercado Libre',
    href: 'https://www.mercadolibre.com.mx/',
    category: 'compras',
    colorClass: 'text-yellow-400 hover:text-yellow-300',
    iconSvg: `<img src="/mercadolibre_premium.png" class="w-10 h-10 object-contain" />`
  },
  'mercado libre': {
    id: '1',
    name: 'Mercado Libre',
    href: 'https://www.mercadolibre.com.mx/',
    category: 'compras',
    colorClass: 'text-yellow-400 hover:text-yellow-300',
    iconSvg: `<img src="/mercadolibre_premium.png" class="w-10 h-10 object-contain" />`
  },
  'amazon': {
    id: 'amazon',
    name: 'Amazon',
    href: 'https://www.amazon.com.mx/',
    category: 'compras',
    colorClass: 'text-amber-400 hover:text-amber-300',
    iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="w-full h-full"><defs><linearGradient id="amazon-bg-grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#111822"/><stop offset="100%" stop-color="#1a222e"/></linearGradient></defs><rect width="100" height="100" rx="22" fill="url(#amazon-bg-grad)" stroke="#232f3e" stroke-width="1.5"/><rect x="4" y="4" width="92" height="92" rx="18" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1"/><g transform="translate(50, 50) scale(0.68) translate(-50, -50)"><path d="M53.8 47.7c0 3.2.1 5.9-1.4 8.7-1.1 2.1-2.9 3.4-5 3.4-2.9 0-4.6-2.2-4.6-5.5 0-6.5 5.3-7.7 11-7.7v1.1zm7.3-19.4c-.4-.5-1.2-.4-1.7-.1-2.9 1.4-6.4 2-9.6 2-7.5 0-12.7-3.3-12.7-11.2 0-6.2 3.6-10.3 9.4-11.8 4.7-1.1 11-1.2 11-5.7 0-3.6-2.7-5.3-6.6-5.3-4.3 0-6.2 2-6.7 5.7 0 .7-.6 1.2-1.3 1.2l-6.8-.7c-.7-.1-1.2-.6-1.1-1.3.9-7.1 6.7-11.4 15.9-11.4 8.4 0 14.8 4.3 14.8 13v17c0 2.1.8 3.1 1.6 4.1.5.7.5 1.3 0 1.8l-5.8 4.8c-.6.5-1.1.4-1.6-.3-.6-.8-1.2-1.7-1.4-2.8z" fill="#FFFFFF" transform="translate(26, 16) scale(0.78)"/><path d="M22 66c13 8 31 8.8 47 2 1-.4 1.6.3.8 1.2-9 8-24 11-37 6-2-.8-2.8-2-.6-3 1.5-.7 3-1.2 4.6-1.7 1.2-.4 2.4.8 1.2 1.2-10 3.8-22 .7-27-7.4-.3-.5.2-1.1.8-.8 7 4 15 5.8 24 4.8 1.3-.2 1.3-1.9 0-1.7-8 1-16-.8-23-4.6-.6-.3-1.1.3-.8.8z" fill="#FF9900"/><path d="M68 67c-1-.4-2.8.3-4.1.9-.5.3-.4 1 .1 1.2 3.2 1.2 6.4 3.2 8.3 6.2.3.5 1 .3 1.1-.3.3-3.4-.1-7.4-2.2-10.4-.3-.5-1-.4-1.2.1-.6 1.7-1.2 3.5-2 5.3z" fill="#FF9900"/></g></svg>`
  },
  'whatsapp': {
    id: '2',
    name: 'WhatsApp',
    href: 'https://web.whatsapp.com/',
    category: 'social',
    colorClass: 'text-green-500 hover:text-green-400',
    iconSvg: `<svg viewBox="0 0 64 64" class="w-full h-full" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="wa-green-bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#2be06e"/><stop offset="60%" stop-color="#22c55e"/><stop offset="100%" stop-color="#15803d"/></linearGradient></defs><rect x="2" y="2" width="60" height="60" rx="16" fill="url(#wa-green-bg)" stroke="#86efac" stroke-width="1.2" stroke-opacity="0.5"/><g transform="translate(13, 13) scale(1.583)"><path fill="#ffffff" d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.196 8.196 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24m-3.53 3.63c-.19 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.47 1.07 2.89 1.21 3.09.15.2 2.1 3.2 5.08 4.49 2.49 1.07 2.99.86 3.53.81.54-.05 1.74-.71 1.99-1.4.24-.68.24-1.27.17-1.4-.07-.12-.27-.2-.56-.34-.3-.15-1.74-.86-2.01-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.34.22-.64.07-.3-.15-1.26-.46-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.14-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.6-.49-.51-.67-.52h-.57z"/></g></svg>`,
    outlineColor: '#22c55e',
    outlineWidth: 8
  },
  'notion': {
    id: '3',
    name: 'Notion',
    href: 'https://www.notion.so/',
    category: 'trabajo',
    colorClass: 'text-white hover:text-gray-300',
    iconSvg: `<svg viewBox="0 0 64 64" class="w-full h-full" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="notion-bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#26221f"/><stop offset="50%" stop-color="#1c1917"/><stop offset="100%" stop-color="#0f0e0d"/></linearGradient></defs><rect x="2" y="2" width="60" height="60" rx="16" fill="url(#notion-bg)" stroke="#f59e0b" stroke-width="1.6" stroke-opacity="0.6"/><g transform="translate(13, 13) scale(1.583)"><path fill="#ffffff" d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.69c-.466-.373-.84-.466-1.586-.42L3.899 2.25c-.466.047-.56.28-.373.513l.933 1.445zm-.42 3.125v13.634c0 .84.42 1.12 1.306 1.073l14.195-.84c.886-.046.98-.56.98-1.213V6.353c0-.653-.28-.933-.886-.886L5.345 6.307c-.7.046-1.306.326-1.306 1.026zm12.37.933c.093.42 0 .84-.373.886l-.7.14v8.586c-.513.28-1.026.466-1.493.466-.793 0-1.026-.28-1.633-1.026l-4.76-7.464v7.324l1.4.326c0 .42-.326.746-.746.746H4.832c-.093-.42.093-.746.513-.793l.886-.187V9.387l-1.12-.093c0-.42.233-.746.653-.793l3.36-.233 5.087 7.79V9.107l-1.213-.14c0-.42.28-.746.7-.793l3.08-.233z"/></g></svg>`,
    outlineColor: '#f59e0b',
    outlineWidth: 8
  },
  'javer': {
    id: 'javer',
    name: 'Javer',
    href: 'https://portal.javer.net/Paginas/Index.aspx',
    category: 'trabajo',
    colorClass: 'text-red-600 hover:text-red-500',
    iconSvg: `<svg viewBox="0 0 64 64" class="w-full h-full" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="jav-bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#2a080c"/><stop offset="50%" stop-color="#180406"/><stop offset="100%" stop-color="#0a0102"/></linearGradient><linearGradient id="jav-grad-red" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ff3b44"/><stop offset="30%" stop-color="#e11d24"/><stop offset="100%" stop-color="#b91319"/></linearGradient></defs><rect x="2" y="2" width="60" height="60" rx="16" fill="url(#jav-bg)" stroke="#e11d24" stroke-width="1.6" stroke-opacity="0.8"/><g transform="translate(12.5, 12.5) scale(0.228)"><path d="M 111.0 0.0 L 60.0 0.0 L 54.0 7.0 L 43.0 24.0 L 20.0 55.0 L 1.0 83.0 L 54.0 82.0 L 110.0 3.0 Z" fill="url(#jav-grad-red)" /><path d="M 126.0 21.0 L 123.0 24.0 L 119.0 31.0 L 72.0 97.0 L 66.0 104.0 L 15.0 104.0 L 20.0 113.0 L 28.0 123.0 L 80.0 123.0 L 138.0 41.0 L 138.0 39.0 Z" fill="url(#jav-grad-red)" /><path d="M 148.0 54.0 L 146.0 55.0 L 139.0 66.0 L 88.0 137.0 L 37.0 137.0 L 48.0 154.0 L 102.0 155.0 L 159.0 75.0 L 160.0 72.0 Z" fill="url(#jav-grad-red)" /><path d="M 170.0 89.0 L 161.0 89.0 L 120.0 148.0 L 107.0 165.0 L 65.0 165.0 L 61.0 171.0 L 112.0 171.0 L 120.0 161.0 L 131.0 144.0 L 151.0 117.0 L 157.0 107.0 Z" fill="url(#jav-grad-red)" /></g></svg>`,
    outlineColor: '#ef4444',
    outlineWidth: 8
  },
  'flow': {
    id: 'flow',
    name: 'Flow',
    href: 'https://labs.google/fx/es/tools/flow',
    category: 'trabajo',
    colorClass: 'text-red-500 hover:text-red-400',
    iconSvg: `<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" fill="none"><defs><linearGradient id="gradRed" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#EA4335;stop-opacity:1" /><stop offset="100%" style="stop-color:#D32F2F;stop-opacity:1" /></linearGradient><linearGradient id="gradBlue" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" style="stop-color:#4285F4;stop-opacity:1" /><stop offset="100%" style="stop-color:#3367D6;stop-opacity:1" /></linearGradient><linearGradient id="gradGreen" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" style="stop-color:#34A853;stop-opacity:1" /><stop offset="100%" style="stop-color:#0F9D58;stop-opacity:1" /></linearGradient><linearGradient id="gradYellow" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" style="stop-color:#FBBC05;stop-opacity:1" /><stop offset="100%" style="stop-color:#F9AB00;stop-opacity:1" /></linearGradient></defs><g transform="translate(256, 256) scale(0.85) translate(-256, -256)"><path d="M 160,340 C 230,340 282,172 352,172" stroke="url(#gradGreen)" stroke-width="80" stroke-linecap="round" /><path d="M 160,172 A 84,84 0 0,0 160,340" stroke="url(#gradBlue)" stroke-width="80" stroke-linecap="round" /><path d="M 352,340 A 84,84 0 0,0 352,172" stroke="url(#gradYellow)" stroke-width="80" stroke-linecap="round" /><path d="M 160,172 C 230,172 282,340 352,340" stroke="url(#gradRed)" stroke-width="80" stroke-linecap="round" /></g></svg>`,
    outlineColor: '#ff0000',
    outlineWidth: 15
  },
  'makerworld': {
    id: 'makerworld',
    name: 'MakerWorld',
    href: 'https://makerworld.com/es',
    category: 'trabajo',
    colorClass: 'text-teal-400 hover:text-teal-300',
    iconSvg: `<img src="/makerworld_premium.png" class="w-10 h-10 object-contain rounded-xl" />`,
    outlineColor: '#10b981',
    outlineWidth: 10
  },
  'rendair': {
    id: 'rendair',
    name: 'Rendair',
    href: 'https://rendair.ai/dashboard',
    category: 'trabajo',
    colorClass: 'hover:text-teal-400',
    iconSvg: `<svg viewBox="0 0 64 64" class="w-full h-full" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="60" height="60" rx="16" fill="#0c1017" stroke="#10b981" stroke-width="1.8" stroke-opacity="0.6"/><rect x="21" y="20" width="10" height="24" rx="5" fill="#ffffff"/><rect x="35" y="20" width="10" height="10" rx="5" fill="#ffffff"/></svg>`,
    outlineColor: '#10b981',
    outlineWidth: 8
  },
  'pinterest': {
    id: '5',
    name: 'Pinterest',
    href: 'https://www.pinterest.com.mx/Rembrandtro/pines-creados/',
    category: 'social',
    colorClass: 'text-red-500 hover:text-red-400',
    iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.965 1.406-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.259 7.929-7.259 4.164 0 7.399 2.965 7.399 6.931 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.992 5.367 18.623 0 12.017 0z"/></svg>`
  },
  'facebook': {
    id: '6',
    name: 'Facebook',
    href: 'https://www.facebook.com/',
    category: 'social',
    colorClass: 'text-blue-600 hover:text-blue-500',
    iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`
  },
  'instagram': {
    id: '7',
    name: 'Instagram',
    href: 'https://www.instagram.com/',
    category: 'social',
    colorClass: 'text-pink-500 hover:text-pink-400',
    iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>`
  },
  'x': {
    id: '8',
    name: 'X',
    href: 'https://x.com/',
    category: 'social',
    colorClass: 'text-white hover:text-gray-300',
    iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 7.688 8.502 11.25h-6.657l-5.214-6.817L4.99 21.188H1.68l7.73-8.235L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`
  },
  'maket ai': {
    id: '10',
    name: 'Maket AI',
    href: 'https://app.maket.ai/dashboard',
    category: 'trabajo',
    colorClass: 'text-sky-400 hover:text-sky-300',
    iconSvg: `<svg viewBox="0 0 100 100" class="w-full h-full p-0.5" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="maket-bp-bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#0b1e36"/><stop offset="50%" stop-color="#072a4a"/><stop offset="100%" stop-color="#034373"/></linearGradient><pattern id="maket-bp-grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="#38bdf8" stroke-width="0.6" stroke-opacity="0.25"/></pattern></defs><rect width="100" height="100" rx="22" fill="url(#maket-bp-bg)" stroke="#38bdf8" stroke-width="1.5" stroke-opacity="0.4"/><rect x="5" y="5" width="90" height="90" rx="17" fill="url(#maket-bp-grid)"/><rect x="20" y="20" width="60" height="56" rx="2" fill="none" stroke="#38bdf8" stroke-width="3.5" stroke-linejoin="round"/><line x1="20" y1="48" x2="52" y2="48" stroke="#7dd3fc" stroke-width="3" stroke-linecap="square"/><line x1="52" y1="48" x2="52" y2="76" stroke="#7dd3fc" stroke-width="3" stroke-linecap="square"/><line x1="52" y1="36" x2="80" y2="36" stroke="#7dd3fc" stroke-width="3" stroke-linecap="square"/><line x1="36" y1="48" x2="48" y2="48" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/><path d="M 36 48 A 12 12 0 0 0 48 36" fill="none" stroke="#bae6fd" stroke-width="1.5" stroke-dasharray="2.5,2"/><line x1="30" y1="20" x2="46" y2="20" stroke="#ffffff" stroke-width="3.5"/><line x1="20" y1="83" x2="80" y2="83" stroke="#93c5fd" stroke-width="1.2"/><line x1="20" y1="80" x2="20" y2="86" stroke="#93c5fd" stroke-width="1.5"/><line x1="80" y1="80" x2="80" y2="86" stroke="#93c5fd" stroke-width="1.5"/><polygon points="20,83 24,81.5 24,84.5" fill="#93c5fd"/><polygon points="80,83 76,81.5 76,84.5" fill="#93c5fd"/><circle cx="70" cy="27" r="5" fill="#072a4a" stroke="#38bdf8" stroke-width="1"/><polygon points="70,23 72,27 70,26" fill="#38bdf8"/><polygon points="70,23 68,27 70,26" fill="#ffffff"/></svg>`
  },
  'maket': {
    id: '10',
    name: 'Maket AI',
    href: 'https://app.maket.ai/dashboard',
    category: 'trabajo',
    colorClass: 'text-sky-400 hover:text-sky-300',
    iconSvg: `<svg viewBox="0 0 100 100" class="w-full h-full p-0.5" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="maket-bp-bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#0b1e36"/><stop offset="50%" stop-color="#072a4a"/><stop offset="100%" stop-color="#034373"/></linearGradient><pattern id="maket-bp-grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="#38bdf8" stroke-width="0.6" stroke-opacity="0.25"/></pattern></defs><rect width="100" height="100" rx="22" fill="url(#maket-bp-bg)" stroke="#38bdf8" stroke-width="1.5" stroke-opacity="0.4"/><rect x="5" y="5" width="90" height="90" rx="17" fill="url(#maket-bp-grid)"/><rect x="20" y="20" width="60" height="56" rx="2" fill="none" stroke="#38bdf8" stroke-width="3.5" stroke-linejoin="round"/><line x1="20" y1="48" x2="52" y2="48" stroke="#7dd3fc" stroke-width="3" stroke-linecap="square"/><line x1="52" y1="48" x2="52" y2="76" stroke="#7dd3fc" stroke-width="3" stroke-linecap="square"/><line x1="52" y1="36" x2="80" y2="36" stroke="#7dd3fc" stroke-width="3" stroke-linecap="square"/><line x1="36" y1="48" x2="48" y2="48" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/><path d="M 36 48 A 12 12 0 0 0 48 36" fill="none" stroke="#bae6fd" stroke-width="1.5" stroke-dasharray="2.5,2"/><line x1="30" y1="20" x2="46" y2="20" stroke="#ffffff" stroke-width="3.5"/><line x1="20" y1="83" x2="80" y2="83" stroke="#93c5fd" stroke-width="1.2"/><line x1="20" y1="80" x2="20" y2="86" stroke="#93c5fd" stroke-width="1.5"/><line x1="80" y1="80" x2="80" y2="86" stroke="#93c5fd" stroke-width="1.5"/><polygon points="20,83 24,81.5 24,84.5" fill="#93c5fd"/><polygon points="80,83 76,81.5 76,84.5" fill="#93c5fd"/><circle cx="70" cy="27" r="5" fill="#072a4a" stroke="#38bdf8" stroke-width="1"/><polygon points="70,23 72,27 70,26" fill="#38bdf8"/><polygon points="70,23 68,27 70,26" fill="#ffffff"/></svg>`
  },
  'capcut': {
    id: '11',
    name: 'CapCut',
    href: 'https://www.capcut.com/my-edit?start_tab=video',
    category: 'trabajo',
    colorClass: 'text-cyan-400 hover:text-cyan-300',
    iconSvg: `<svg viewBox="0 0 100 100" class="w-full h-full" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="capcut-tile-bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#0a0a0f"/><stop offset="50%" stop-color="#12131a"/><stop offset="100%" stop-color="#181a24"/></linearGradient><linearGradient id="capcut-blade-top" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#e2e8f0"/></linearGradient></defs><rect width="100" height="100" rx="22" fill="url(#capcut-tile-bg)" stroke="#272935" stroke-width="1.5"/><rect x="4" y="4" width="92" height="92" rx="19" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1"/><g transform="translate(50, 50) scale(0.68) translate(-50, -50)"><path d="M 23 27 C 21.5 27 20 28.5 20 30.5 L 20 37 C 20 38.5 20.8 39.8 22.2 40.5 L 50 56.5 L 77.8 40.5 C 79.2 39.8 80 38.5 80 37 L 80 30.5 C 80 28.5 78.5 27 77 27 C 76 27 75 27.5 74.2 28 L 50 42 L 25.8 28 C 25 72.5 24 73 23 73 Z" fill="url(#capcut-blade-top)"/><path d="M 23 73 C 21.5 73 20 71.5 20 69.5 L 20 63 C 20 61.5 20.8 60.2 22.2 59.5 L 50 43.5 L 77.8 59.5 C 79.2 60.2 80 61.5 80 63 L 80 69.5 C 80 71.5 78.5 73 77 73 C 76 73 75 72.5 74.2 72 L 50 58 L 25.8 72 C 25 72.5 24 73 23 73 Z" fill="url(#capcut-blade-top)"/></g></svg>`
  },
  'youtube': {
    id: 'youtube',
    name: 'YouTube',
    href: 'https://www.youtube.com/',
    category: 'social',
    colorClass: 'text-red-600 hover:text-red-500',
    iconSvg: `<svg viewBox="0 0 24 24" class="w-8 h-8 fill-current"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`
  }
};

/**
 * Normalizes and removes duplicate links in linksBar.
 * Ensures Javer, Flow, Rendair, Amazon, and all canonical links are never duplicated,
 * and always retain their original, high-quality, authentic icons and styling.
 */
export function normalizeAndDeduplicateLinksBar(links: LinkItem[]): LinkItem[] {
  if (!Array.isArray(links)) return [];
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  const seenHrefs = new Set<string>();
  const result: LinkItem[] = [];

  for (const rawItem of links) {
    if (!rawItem || !rawItem.name) continue;
    const item = { ...rawItem };
    const nameLower = item.name.trim().toLowerCase();
    const hrefNormalized = (item.href || '').trim().toLowerCase().replace(/\/$/, '');

    // Exclude Compresor, CapCut and Maket AI from linksBar (per explicit user instruction)
    if (nameLower.includes('compresor') || item.id === 'compresor' || item.id === 'qa-2') {
      continue;
    }
    if (nameLower.includes('capcut') || item.id === '11' || item.id === 'capcut') {
      continue;
    }
    if (nameLower.includes('maket') || item.id === '10' || item.id === 'maket') {
      continue;
    }
    if (nameLower === 'renders remb' || nameLower === 'renders' || item.id === 'renders-remb' || (hrefNormalized && hrefNormalized.includes('renders%20remb'))) {
      continue;
    }

    // Synchronize and restore authentic default icons & attributes if canonical
    const canonical = CANONICAL_LINKS_MAP[nameLower] || CANONICAL_LINKS_MAP[item.id?.toLowerCase()];
    if (canonical) {
      if (canonical.id && (!item.id || item.id === '1' || item.id === '10')) {
        item.id = canonical.id;
      }
      item.name = canonical.name || item.name;
      item.category = canonical.category || item.category;
      item.colorClass = canonical.colorClass || item.colorClass;
      // Always enforce authentic icons for canonical links (especially Javer, WhatsApp, Notion, Rendair)
      if (nameLower === 'javer' || nameLower === 'whatsapp' || nameLower === 'notion' || nameLower === 'rendair' || !item.iconSvg) {
        item.iconSvg = canonical.iconSvg!;
      } else {
        item.iconSvg = canonical.iconSvg || item.iconSvg;
      }
      if (canonical.outlineColor) item.outlineColor = canonical.outlineColor;
      if (canonical.outlineWidth) item.outlineWidth = canonical.outlineWidth;
    }

    // Check duplicate by normalized name
    if (nameLower && seenNames.has(nameLower)) {
      continue;
    }

    // Check duplicate by normalized URL
    if (hrefNormalized && seenHrefs.has(hrefNormalized)) {
      continue;
    }

    // Handle clubjaver vs portal.javer confusion (keep portal or first)
    if (
      (nameLower === 'javer' || nameLower === 'club javer' || nameLower === 'portal javer') &&
      (seenNames.has('javer') || seenHrefs.has('https://portal.javer.net/paginas/index.aspx') || seenHrefs.has('https://clubjaver.com'))
    ) {
      continue;
    }

    // Handle flow duplicate (Google Flow vs Club Javer named Flow)
    if (
      (nameLower === 'flow' || nameLower === 'google flow') &&
      (seenNames.has('flow') || seenHrefs.has('https://labs.google/fx/es/tools/flow'))
    ) {
      continue;
    }

    // Ensure category is inferred if missing
    if (!item.category) {
      item.category = inferLinkCategory(item);
    }

    // Ensure every single item has a globally unique ID within linksBar
    if (!item.id || seenIds.has(item.id)) {
      item.id = `${item.id || 'link'}_${nameLower.replace(/[^a-z0-9]/g, '') || Date.now()}`;
    }

    seenNames.add(nameLower);
    seenIds.add(item.id);
    if (hrefNormalized) seenHrefs.add(hrefNormalized);
    result.push(item);
  }

  // Ensure all authentic canonical links are always present in linksBar (excluding CapCut & Maket AI per user request)
  const MANDATORY_CANONICALS = [
    'javer',
    'makerworld',
    'whatsapp',
    'notion',
    'youtube',
    'flow',
    'rendair',
    'mercadolibre',
    'amazon',
    'pinterest',
    'facebook',
    'instagram',
    'x'
  ];

  for (const key of MANDATORY_CANONICALS) {
    const isPresent = seenNames.has(key) || 
      (key === 'mercadolibre' && seenNames.has('mercado libre'));

    if (!isPresent) {
      const def = CANONICAL_LINKS_MAP[key];
      if (def) {
        result.push({
          id: def.id || key,
          name: def.name!,
          href: def.href!,
          category: def.category!,
          colorClass: def.colorClass!,
          iconSvg: def.iconSvg!,
          outlineColor: def.outlineColor,
          outlineWidth: def.outlineWidth
        });
        seenNames.add(key);
      }
    }
  }

  // Desired authentic visual order matching the original layout with Rendair in centro de trabajos
  const DESIRED_ORDER = [
    'makerworld',
    'whatsapp',
    'notion',
    'youtube',
    'flow',
    'rendair',
    'mercadolibre',
    'amazon',
    'pinterest',
    'facebook',
    'instagram',
    'x'
  ];

  // If the list is the canonical set, sort them in the exact order from the screenshot
  const isDefaultSet = result.every(item => {
    const n = (item.name || '').toLowerCase().trim();
    return n === 'javer' || DESIRED_ORDER.includes(n) || n === 'mercado libre';
  });

  if (isDefaultSet) {
    const getOrderRank = (item: LinkItem) => {
      const n = (item.name || '').toLowerCase().trim();
      if (n === 'javer') return -1;
      if (n === 'mercado libre') return DESIRED_ORDER.indexOf('mercadolibre');
      const idx = DESIRED_ORDER.indexOf(n);
      return idx !== -1 ? idx : 999;
    };
    result.sort((a, b) => getOrderRank(a) - getOrderRank(b));
  }

  return result;
}


