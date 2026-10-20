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
    // Exclude Maket AI and CapCut per user request
    if (nameLower.includes('maket') || item.id === 'maket-ai' || item.id === '10' || (hrefNormalized && hrefNormalized.includes('maket.ai'))) {
      continue;
    }
    if (nameLower.includes('capcut') || nameLower.includes('catcup') || item.id === 'capcut' || item.id === '11' || (hrefNormalized && hrefNormalized.includes('capcut.com'))) {
      continue;
    }
    if (nameLower === 'renders remb' || nameLower === 'renders' || item.id === 'renders-remb' || (hrefNormalized && hrefNormalized.includes('renders%20remb'))) {
      continue;
    }
    if (nameLower === 'amazon') {
      item.id = 'amazon';
      item.name = 'Amazon';
      item.category = 'compras';
      item.colorClass = 'text-amber-400 hover:text-amber-300';
      item.iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="w-full h-full"><defs><linearGradient id="amazon-bg-grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#111822"/><stop offset="100%" stop-color="#1a222e"/></linearGradient></defs><rect width="100" height="100" rx="22" fill="url(#amazon-bg-grad)" stroke="#232f3e" stroke-width="1.5"/><rect x="4" y="4" width="92" height="92" rx="18" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1"/><g transform="translate(50, 50) scale(0.68) translate(-50, -50)"><path d="M53.8 47.7c0 3.2.1 5.9-1.4 8.7-1.1 2.1-2.9 3.4-5 3.4-2.9 0-4.6-2.2-4.6-5.5 0-6.5 5.3-7.7 11-7.7v1.1zm7.3-19.4c-.4-.5-1.2-.4-1.7-.1-2.9 1.4-6.4 2-9.6 2-7.5 0-12.7-3.3-12.7-11.2 0-6.2 3.6-10.3 9.4-11.8 4.7-1.1 11-1.2 11-5.7 0-3.6-2.7-5.3-6.6-5.3-4.3 0-6.2 2-6.7 5.7 0 .7-.6 1.2-1.3 1.2l-6.8-.7c-.7-.1-1.2-.6-1.1-1.3.9-7.1 6.7-11.4 15.9-11.4 8.4 0 14.8 4.3 14.8 13v17c0 2.1.8 3.1 1.6 4.1.5.7.5 1.3 0 1.8l-5.8 4.8c-.6.5-1.1.4-1.6-.3-.6-.8-1.2-1.7-1.4-2.8z" fill="#FFFFFF" transform="translate(26, 16) scale(0.78)"/><path d="M22 66c13 8 31 8.8 47 2 1-.4 1.6.3.8 1.2-9 8-24 11-37 6-2-.8-2.8-2-.6-3 1.5-.7 3-1.2 4.6-1.7 1.2-.4 2.4.8 1.2 1.2-10 3.8-22 .7-27-7.4-.3-.5.2-1.1.8-.8 7 4 15 5.8 24 4.8 1.3-.2 1.3-1.9 0-1.7-8 1-16-.8-23-4.6-.6-.3-1.1.3-.8.8z" fill="#FF9900"/><path d="M68 67c-1-.4-2.8.3-4.1.9-.5.3-.4 1 .1 1.2 3.2 1.2 6.4 3.2 8.3 6.2.3.5 1 .3 1.1-.3.3-3.4-.1-7.4-2.2-10.4-.3-.5-1-.4-1.2.1-.6 1.7-1.2 3.5-2 5.3z" fill="#FF9900"/></g></svg>`;
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

  return result;
}


