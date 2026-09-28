import { LinkItem } from '../types';

export type LinkCategory = 'trabajo' | 'compras' | 'social';
export type LinkCategoryFilter = 'todos' | LinkCategory;

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

  // 3. Trabajo (default for productivity/work: Notion, Flow, Maket AI, CapCut, etc.)
  return 'trabajo';
}

export interface CategoryDefinition {
  id: LinkCategoryFilter;
  label: string;
  iconType: 'all' | 'trabajo' | 'compras' | 'social';
  accentClass: string;
  activeClass: string;
  hoverClass: string;
}

export const CATEGORY_DEFINITIONS: CategoryDefinition[] = [
  {
    id: 'todos',
    label: 'Todos',
    iconType: 'all',
    accentClass: 'text-gray-400',
    activeClass: 'bg-white/20 text-white border-white/40 shadow-[0_0_15px_rgba(255,255,255,0.15)] ring-1 ring-white/30',
    hoverClass: 'hover:bg-white/10 hover:text-gray-200'
  },
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
 * Ensures Javer, Flow, and other links are never duplicated.
 */
export function normalizeAndDeduplicateLinksBar(links: LinkItem[]): LinkItem[] {
  if (!Array.isArray(links)) return [];
  const seenNames = new Set<string>();
  const seenHrefs = new Set<string>();
  const result: LinkItem[] = [];

  for (const item of links) {
    if (!item || !item.name) continue;
    const nameLower = item.name.trim().toLowerCase();
    const hrefNormalized = (item.href || '').trim().toLowerCase().replace(/\/$/, '');

    // Check duplicate by name
    if (nameLower && seenNames.has(nameLower)) {
      continue;
    }

    // Check duplicate by normalized URL
    if (hrefNormalized && seenHrefs.has(hrefNormalized)) {
      continue;
    }

    // Handle clubjaver vs portal.javer confusion
    if ((nameLower === 'javer' || nameLower === 'club javer') && (seenHrefs.has('https://portal.javer.net/paginas/index.aspx') || seenHrefs.has('https://clubjaver.com'))) {
      continue;
    }

    // Handle flow duplicate (Google Flow vs Club Javer named Flow)
    if (nameLower === 'flow' && hrefNormalized.includes('clubjaver.com') && (seenNames.has('flow') || links.some(l => (l.href || '').includes('labs.google/fx/es/tools/flow')))) {
      continue;
    }

    if (nameLower) seenNames.add(nameLower);
    if (hrefNormalized) seenHrefs.add(hrefNormalized);
    result.push(item);
  }

  return result;
}

