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

/**
 * Normalizes and removes duplicate links in linksBar.
 * Ensures Javer, Flow, and other links are never duplicated and each has a strictly unique ID.
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

    // Resolve legacy ID collisions where Javer shared id '1' with Mercado Libre
    // or Flow shared id '10' with Maket AI
    if (nameLower === 'javer' && (item.id === '1' || !item.id)) {
      item.id = 'javer';
    }
    if (nameLower === 'flow' && (item.id === '10' || !item.id)) {
      item.id = 'flow';
    }
    if (nameLower === 'makerworld' || nameLower === 'maker world') {
      item.id = 'makerworld';
      item.name = 'MakerWorld';
      item.category = 'trabajo';
      item.href = 'https://makerworld.com/es';
      item.colorClass = 'text-teal-400 hover:text-teal-300';
      item.outlineColor = '#10b981';
      item.outlineWidth = 10;
      item.iconSvg = `<img src="/makerworld_premium.png" class="w-10 h-10 object-contain rounded-xl" alt="MakerWorld" />`;
    }
    if (nameLower === 'maket ai' || nameLower === 'maket') {
      item.id = 'maket-ai';
      item.name = 'Maket AI';
      item.category = 'trabajo';
      item.href = 'https://app.maket.ai/dashboard';
      item.colorClass = 'text-sky-400 hover:text-sky-300';
      item.iconSvg = `<svg viewBox="0 0 100 100" class="w-full h-full p-0.5" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="maket-bp-bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#0b1e36"/><stop offset="50%" stop-color="#072a4a"/><stop offset="100%" stop-color="#034373"/></linearGradient><pattern id="maket-bp-grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="#38bdf8" stroke-width="0.6" stroke-opacity="0.25"/></pattern></defs><rect width="100" height="100" rx="22" fill="url(#maket-bp-bg)" stroke="#38bdf8" stroke-width="1.5" stroke-opacity="0.4"/><rect x="5" y="5" width="90" height="90" rx="17" fill="url(#maket-bp-grid)"/><rect x="20" y="20" width="60" height="56" rx="2" fill="none" stroke="#38bdf8" stroke-width="3.5" stroke-linejoin="round"/><line x1="20" y1="48" x2="52" y2="48" stroke="#7dd3fc" stroke-width="3" stroke-linecap="square"/><line x1="52" y1="48" x2="52" y2="76" stroke="#7dd3fc" stroke-width="3" stroke-linecap="square"/><line x1="52" y1="36" x2="80" y2="36" stroke="#7dd3fc" stroke-width="3" stroke-linecap="square"/><line x1="36" y1="48" x2="48" y2="48" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/><path d="M 36 48 A 12 12 0 0 0 48 36" fill="none" stroke="#bae6fd" stroke-width="1.5" stroke-dasharray="2.5,2"/><line x1="30" y1="20" x2="46" y2="20" stroke="#ffffff" stroke-width="3.5"/><line x1="20" y1="83" x2="80" y2="83" stroke="#93c5fd" stroke-width="1.2"/><line x1="20" y1="80" x2="20" y2="86" stroke="#93c5fd" stroke-width="1.5"/><line x1="80" y1="80" x2="80" y2="86" stroke="#93c5fd" stroke-width="1.5"/><polygon points="20,83 24,81.5 24,84.5" fill="#93c5fd"/><polygon points="80,83 76,81.5 76,84.5" fill="#93c5fd"/><circle cx="70" cy="27" r="5" fill="#072a4a" stroke="#38bdf8" stroke-width="1"/><polygon points="70,23 72,27 70,26" fill="#38bdf8"/><polygon points="70,23 68,27 70,26" fill="#ffffff"/></svg>`;
    }
    if (nameLower === 'capcut') {
      item.id = 'capcut';
      item.name = 'CapCut';
      item.category = 'trabajo';
      item.href = 'https://www.capcut.com/my-edit?start_tab=video';
      item.colorClass = 'text-cyan-400 hover:text-cyan-300';
      item.iconSvg = `<svg viewBox="0 0 100 100" class="w-full h-full p-0.5" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="capcut-tile-bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#0a0a0f"/><stop offset="50%" stop-color="#12131a"/><stop offset="100%" stop-color="#181a24"/></linearGradient><linearGradient id="capcut-blade-top" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#e2e8f0"/></linearGradient></defs><rect width="100" height="100" rx="22" fill="url(#capcut-tile-bg)" stroke="#272935" stroke-width="1.5"/><rect x="4" y="4" width="92" height="92" rx="19" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1"/><g transform="translate(0, 0)"><path d="M 23 27 C 21.5 27 20 28.5 20 30.5 L 20 37 C 20 38.5 20.8 39.8 22.2 40.5 L 50 56.5 L 77.8 40.5 C 79.2 39.8 80 38.5 80 37 L 80 30.5 C 80 28.5 78.5 27 77 27 C 76 27 75 27.5 74.2 28 L 50 42 L 25.8 28 C 25 27.5 24 27 23 27 Z" fill="url(#capcut-blade-top)"/><path d="M 23 73 C 21.5 73 20 71.5 20 69.5 L 20 63 C 20 61.5 20.8 60.2 22.2 59.5 L 50 43.5 L 77.8 59.5 C 79.2 60.2 80 61.5 80 63 L 80 69.5 C 80 71.5 78.5 73 77 73 C 76 73 75 72.5 74.2 72 L 50 58 L 25.8 72 C 25 72.5 24 73 23 73 Z" fill="url(#capcut-blade-top)"/></g></svg>`;
    }
    if (nameLower === 'renders remb' || nameLower === 'renders' || item.id === 'renders-remb') {
      item.id = 'renders-remb';
      item.name = 'Renders Remb';
      item.category = 'trabajo';
      item.href = 'https://javer-my.sharepoint.com/personal/rblanco_javer_com_mx/Documents/Renders%20Remb';
      item.colorClass = 'text-violet-400 hover:text-violet-300';
      item.outlineColor = '#8b5cf6';
      item.outlineWidth = 10;
      item.iconSvg = `<svg viewBox="0 0 100 100" class="w-full h-full p-0.5" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="rr-bg-grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#0f172a"/><stop offset="50%" stop-color="#1e1b4b"/><stop offset="100%" stop-color="#31104b"/></linearGradient><linearGradient id="rr-cube-top" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#a855f7"/><stop offset="100%" stop-color="#6366f1"/></linearGradient><linearGradient id="rr-cube-left" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#4f46e5"/><stop offset="100%" stop-color="#3730a3"/></linearGradient><linearGradient id="rr-cube-right" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#7c3aed"/><stop offset="100%" stop-color="#581c87"/></linearGradient><linearGradient id="rr-sun-grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#38bdf8"/><stop offset="100%" stop-color="#06b6d4"/></linearGradient></defs><rect width="100" height="100" rx="22" fill="url(#rr-bg-grad)" stroke="#8b5cf6" stroke-width="1.5" stroke-opacity="0.5"/><rect x="4" y="4" width="92" height="92" rx="18" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1"/><g transform="translate(50, 48)"><polygon points="0,-28 26,-13 0,2 -26,-13" fill="url(#rr-cube-top)" stroke="#c084fc" stroke-width="1" stroke-linejoin="round"/><polygon points="-26,-13 0,2 0,32 -26,17" fill="url(#rr-cube-left)" stroke="#818cf8" stroke-width="1" stroke-linejoin="round"/><polygon points="0,2 26,-13 26,17 0,32" fill="url(#rr-cube-right)" stroke="#a855f7" stroke-width="1" stroke-linejoin="round"/><circle cx="0" cy="2" r="3" fill="#ffffff" opacity="0.9"/></g><circle cx="25" cy="24" r="5" fill="url(#rr-sun-grad)"/><path d="M 20 78 L 32 78 M 26 72 L 26 84" stroke="#38bdf8" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/><text x="50" y="91" font-family="system-ui, sans-serif" font-size="9" font-weight="900" fill="#e2e8f0" text-anchor="middle" letter-spacing="1">RENDERS</text></svg>`;
    }
    if (nameLower === 'amazon') {
      item.id = 'amazon';
      item.name = 'Amazon';
      item.category = 'compras';
      item.colorClass = 'text-amber-400 hover:text-amber-300';
      item.iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="w-full h-full p-0.5"><defs><linearGradient id="amazon-bg-grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#131921"/><stop offset="100%" stop-color="#1f2833"/></linearGradient></defs><rect width="100" height="100" rx="22" fill="url(#amazon-bg-grad)" stroke="#232f3e" stroke-width="1.5"/><rect x="4" y="4" width="92" height="92" rx="18" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1"/><path d="M53.8 47.7c0 3.2.1 5.9-1.4 8.7-1.1 2.1-2.9 3.4-5 3.4-2.9 0-4.6-2.2-4.6-5.5 0-6.5 5.3-7.7 11-7.7v1.1zm7.3-19.4c-.4-.5-1.2-.4-1.7-.1-2.9 1.4-6.4 2-9.6 2-7.5 0-12.7-3.3-12.7-11.2 0-6.2 3.6-10.3 9.4-11.8 4.7-1.1 11-1.2 11-5.7 0-3.6-2.7-5.3-6.6-5.3-4.3 0-6.2 2-6.7 5.7 0 .7-.6 1.2-1.3 1.2l-6.8-.7c-.7-.1-1.2-.6-1.1-1.3.9-7.1 6.7-11.4 15.9-11.4 8.4 0 14.8 4.3 14.8 13v17c0 2.1.8 3.1 1.6 4.1.5.7.5 1.3 0 1.8l-5.8 4.8c-.6.5-1.1.4-1.6-.3-.6-.8-1.2-1.7-1.4-2.8z" fill="#FFFFFF" transform="translate(18, 12) scale(0.65)"/><path d="M22 68c13 8 31 8.8 47 2 1-.4 1.6.3.8 1.2-9 8-24 11-37 6-2-.8-2.8-2-.6-3 1.5-.7 3-1.2 4.6-1.7 1.2-.4 2.4.8 1.2 1.2-10 3.8-22 .7-27-7.4-.3-.5.2-1.1.8-.8 7 4 15 5.8 24 4.8 1.3-.2 1.3-1.9 0-1.7-8 1-16-.8-23-4.6-.6-.3-1.1.3-.8.8z" fill="#FF9900"/><path d="M68 69c-1-.4-2.8.3-4.1.9-.5.3-.4 1 .1 1.2 3.2 1.2 6.4 3.2 8.3 6.2.3.5 1 .3 1.1-.3.3-3.4-.1-7.4-2.2-10.4-.3-.5-1-.4-1.2.1-.6 1.7-1.2 3.5-2 5.3z" fill="#FF9900"/></svg>`;
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

  // Ensure Renders Remb is always included in linksBar
  if (!result.some(l => l.id === 'renders-remb' || (l.name || '').toLowerCase() === 'renders remb')) {
    result.push({
      id: 'renders-remb',
      name: 'Renders Remb',
      category: 'trabajo',
      href: 'https://javer-my.sharepoint.com/personal/rblanco_javer_com_mx/Documents/Renders%20Remb',
      colorClass: 'text-violet-400 hover:text-violet-300',
      outlineColor: '#8b5cf6',
      outlineWidth: 10,
      iconSvg: `<svg viewBox="0 0 100 100" class="w-full h-full p-0.5" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="rr-bg-grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#0f172a"/><stop offset="50%" stop-color="#1e1b4b"/><stop offset="100%" stop-color="#31104b"/></linearGradient><linearGradient id="rr-cube-top" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#a855f7"/><stop offset="100%" stop-color="#6366f1"/></linearGradient><linearGradient id="rr-cube-left" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#4f46e5"/><stop offset="100%" stop-color="#3730a3"/></linearGradient><linearGradient id="rr-cube-right" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#7c3aed"/><stop offset="100%" stop-color="#581c87"/></linearGradient><linearGradient id="rr-sun-grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#38bdf8"/><stop offset="100%" stop-color="#06b6d4"/></linearGradient></defs><rect width="100" height="100" rx="22" fill="url(#rr-bg-grad)" stroke="#8b5cf6" stroke-width="1.5" stroke-opacity="0.5"/><rect x="4" y="4" width="92" height="92" rx="18" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1"/><g transform="translate(50, 48)"><polygon points="0,-28 26,-13 0,2 -26,-13" fill="url(#rr-cube-top)" stroke="#c084fc" stroke-width="1" stroke-linejoin="round"/><polygon points="-26,-13 0,2 0,32 -26,17" fill="url(#rr-cube-left)" stroke="#818cf8" stroke-width="1" stroke-linejoin="round"/><polygon points="0,2 26,-13 26,17 0,32" fill="url(#rr-cube-right)" stroke="#a855f7" stroke-width="1" stroke-linejoin="round"/><circle cx="0" cy="2" r="3" fill="#ffffff" opacity="0.9"/></g><circle cx="25" cy="24" r="5" fill="url(#rr-sun-grad)"/><path d="M 20 78 L 32 78 M 26 72 L 26 84" stroke="#38bdf8" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/><text x="50" y="91" font-family="system-ui, sans-serif" font-size="9" font-weight="900" fill="#e2e8f0" text-anchor="middle" letter-spacing="1">RENDERS</text></svg>`
    });
  }

  return result;
}


