import type { VercelRequest, VercelResponse } from '@vercel/node';

function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&aacute;/gi, 'á').replace(/&eacute;/gi, 'é').replace(/&iacute;/gi, 'í')
    .replace(/&oacute;/gi, 'ó').replace(/&uacute;/gi, 'ú').replace(/&ntilde;/gi, 'ñ')
    .replace(/&Aacute;/gi, 'Á').replace(/&Eacute;/gi, 'É').replace(/&Iacute;/gi, 'Í')
    .replace(/&Oacute;/gi, 'Ó').replace(/&Uacute;/gi, 'Ú').replace(/&Ntilde;/gi, 'Ñ')
    .replace(/&iquest;/gi, '¿').replace(/&iexcl;/gi, '¡').replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, '&').replace(/&nbsp;/gi, ' ').replace(/&#39;/g, "'")
    .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>');
}

function cleanGuitarChordsAndLyrics(rawHtml: string): string {
  if (!rawHtml) return '';
  let raw = rawHtml;

  // Replace inner tags around chord names
  raw = raw.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '$1');
  raw = raw.replace(/<a[^>]*>([\s\S]*?)<\/a>/gi, '$1');
  raw = raw.replace(/<span[^>]*>([\s\S]*?)<\/span>/gi, '$1');
  raw = raw.replace(/<br\s*[\/]?>/gi, '\n');
  raw = raw.replace(/<\/div>/gi, '\n');
  raw = raw.replace(/<\/p>/gi, '\n');
  raw = raw.replace(/<[^>]+>/g, '');

  const lines = decodeHtmlEntities(raw).split('\n').map(l => l.trimEnd());
  const cleaned: string[] = [];

  const isTabDrawingLine = (l: string): boolean => {
    const t = l.trim();
    if (/^\[Tab\s*[\s\S]*\]$/i.test(t)) return true;
    if (/^[a-gA-G]?\|[\-\d\s\|xX\(\)\/\\\*\#\.\+pbrh~]+\|?/i.test(t) && t.includes('-')) return true;
    if (/^(e|B|G|D|A|E)\|/i.test(t)) return true;
    return false;
  };

  for (const line of lines) {
    if (isTabDrawingLine(line)) continue;

    if (line.trim().length === 0) {
      if (cleaned.length > 0 && cleaned[cleaned.length - 1] !== '') {
        cleaned.push('');
      }
    } else {
      cleaned.push(line);
    }
  }

  return cleaned.join('\n').trim();
}

export async function scrapeSongAndMedia(urlOrQuery: string) {
  let title = '';
  let artist = '';
  let key = '';
  let content = '';
  let mediaUrl = '';

  const trimmed = urlOrQuery.trim();
  const isUrl = trimmed.startsWith('http://') || trimmed.startsWith('https://');

  if (isUrl) {
    try {
      const parsedUrl = new URL(trimmed);
      const hostname = parsedUrl.hostname.toLowerCase();

      const res = await fetch(trimmed, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'es-ES,es;q=0.9,pt-BR,pt;q=0.8,en;q=0.7'
        }
      });

      if (res.ok) {
        const html = await res.text();

        // --- HANDLER: CifraClub (.com / .com.br / .es) ---
        if (hostname.includes('cifraclub')) {
          const ogTitle = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
          if (ogTitle) {
            const parts = ogTitle[1].split('-');
            if (parts.length >= 2) {
              title = parts[0].trim();
              artist = parts[1].replace(/\|.*/, '').trim();
            } else {
              title = ogTitle[1].replace(/\|.*/, '').trim();
            }
          }

          if (!title) {
            const h1Match = html.match(/<h1[^>]*class=["'][^"']*t1[^"']*["'][^>]*>([^<]+)<\/h1>/i) || html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
            if (h1Match) title = h1Match[1].trim();
          }

          if (!artist) {
            const artistMatch = html.match(/<h2[^>]*class=["'][^"']*t3[^"']*["'][^>]*><a[^>]*>([^<]+)<\/a>/i) ||
                                html.match(/<a[^>]*class=["'][^"']*js-modal-trigger[^"']*["'][^>]*>([^<]+)<\/a>/i);
            if (artistMatch) artist = artistMatch[1].trim();
          }

          const cifraMatch = html.match(/<pre[^>]*class=["'][^"']*cifra_cnt[^"']*["'][^>]*>([\s\S]*?)<\/pre>/i) ||
                             html.match(/<pre[^>]*class=["'][^"']*js-tab_ct[^"']*["'][^>]*>([\s\S]*?)<\/pre>/i) ||
                             html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);

          if (cifraMatch) {
            content = cleanGuitarChordsAndLyrics(cifraMatch[1]);
          }

          const tomMatch = html.match(/Tom:\s*<a[^>]*>([^<]+)<\/a>/i) || html.match(/class=["'][^"']*js-modal-trigger[^"']*data-tom=["']([^"']+)["']/i);
          if (tomMatch) key = tomMatch[1].trim();
        }

        // --- HANDLER: LaCuerda.net ---
        else if (hostname.includes('lacuerda.net')) {
          const titleMatch = html.match(/<h1[^>]*><a[^>]*>([^<]+)<\/a>/i) || html.match(/<TITLE>([^,:]+)/i);
          if (titleMatch) title = titleMatch[1].trim();

          const artistMatch = html.match(/<h2[^>]*><a[^>]*>([^<]+)<\/a>/i) || html.match(/Acordes de ([^:]+):/i);
          if (artistMatch) artist = artistMatch[1].trim();

          const bodyMatch = html.match(/<div id=t_body><PRE>([\s\S]*?)<\/PRE>/i) || html.match(/<PRE>([\s\S]*?)<\/PRE>/i);
          if (bodyMatch) {
            content = cleanGuitarChordsAndLyrics(bodyMatch[1]);
          }
        }

        // --- GENERIC HANDLER for any other chord site ---
        if (!content) {
          const ogTitle = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
          if (ogTitle && !title) {
            const parts = ogTitle[1].split(/[-|–]/);
            if (parts.length >= 2) {
              title = parts[0].trim();
              artist = parts[1].replace(/Chords|Tab|Acordes|Letra.*/gi, '').trim();
            } else {
              title = ogTitle[1].trim();
            }
          }

          if (!title) {
            const pageTitle = html.match(/<title[^>]*>([^<]+)<\/title>/i);
            if (pageTitle) {
              const cleanTitle = decodeHtmlEntities(pageTitle[1]);
              const parts = cleanTitle.split(/[-|–]/);
              if (parts.length >= 2) {
                artist = parts[0].trim();
                title = parts[1].replace(/Chords|Tab|Acordes|Letra.*/gi, '').trim();
              } else {
                title = cleanTitle.replace(/Chords|Tab|Acordes|Letra.*/gi, '').trim();
              }
            }
          }

          const preMatch = html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i) ||
                           html.match(/<code[^>]*>([\s\S]*?)<\/code>/i) ||
                           html.match(/<div[^>]*class=["'][^"']*(?:cifra|chords|tab-body|tab_cnt)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
          if (preMatch) {
            content = cleanGuitarChordsAndLyrics(preMatch[1]);
          }
        }

        // Fallback artist / title from URL path
        if (!title || !artist) {
          const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);
          if (pathSegments.length >= 2) {
            const last = pathSegments[pathSegments.length - 1].replace(/\.(shtml|html|php|asp).*/, '').replace(/[-_]/g, ' ');
            const prev = pathSegments[pathSegments.length - 2].replace(/[-_]/g, ' ');
            if (!title && last) title = last.charAt(0).toUpperCase() + last.slice(1);
            if (!artist && prev) artist = prev.charAt(0).toUpperCase() + prev.slice(1);
          }
        }

        // Key detection if missing
        if (!key && content) {
          const capoMatch = content.match(/Capo(?:raste)?\s*(?:en|at)?\s*([0-9a-zA-Z#]+)/i);
          if (capoMatch) {
            key = `Capo ${capoMatch[1].trim()}`;
          } else {
            const firstChordMatch = content.match(/\b([A-G](?:#|b)?(?:m|maj|min)?)\b/);
            if (firstChordMatch) key = firstChordMatch[1];
          }
        }
      }
    } catch (err: any) {
      console.error('Error fetching song URL:', err);
    }
  }

  // Parse title & artist if query was plain text
  if (!title && !artist) {
    if (trimmed.includes('-')) {
      const parts = trimmed.split('-');
      artist = parts[0].trim();
      title = parts.slice(1).join('-').trim();
    } else {
      title = trimmed;
    }
  }

  if (title) title = decodeHtmlEntities(title);
  if (artist) artist = decodeHtmlEntities(artist);

  // Search YouTube video automatically
  const searchQuery = `${artist} ${title} video oficial`.trim();
  if (searchQuery && searchQuery.length > 2) {
    try {
      const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
      const ytRes = await fetch(ytUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
        }
      });
      if (ytRes.ok) {
        const ytHtml = await ytRes.text();
        const videoIdMatch = ytHtml.match(/"videoId":"([\w-]{11})"/);
        if (videoIdMatch && videoIdMatch[1]) {
          mediaUrl = `https://www.youtube.com/watch?v=${videoIdMatch[1]}`;
        }
      }
    } catch (e) {
      console.error('Error searching YouTube:', e);
    }
  }

  return { title, artist, key, content, mediaUrl };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const query = (req.body?.query || req.body?.url || req.query?.query || req.query?.url || '') as string;
  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ error: 'Missing query or url parameter' });
  }

  try {
    const data = await scrapeSongAndMedia(query);
    return res.status(200).json({
      success: true,
      ...data
    });
  } catch (error: any) {
    console.error('Song import error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error processing song import'
    });
  }
}
