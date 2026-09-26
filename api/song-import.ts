import type { VercelRequest, VercelResponse } from '@vercel/node';

export async function scrapeSongAndMedia(urlOrQuery: string) {
  let title = '';
  let artist = '';
  let key = '';
  let content = '';
  let mediaUrl = '';

  const trimmed = urlOrQuery.trim();
  const isUrl = trimmed.startsWith('http://') || trimmed.startsWith('https://');

  if (isUrl && trimmed.includes('lacuerda.net')) {
    try {
      const res = await fetch(trimmed, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
        }
      });

      if (res.ok) {
        const html = await res.text();

        // Title
        const titleMatch = html.match(/<h1[^>]*><a[^>]*>([^<]+)<\/a>/i) || html.match(/<TITLE>([^,:]+)/i);
        if (titleMatch) title = titleMatch[1].trim();

        // Artist
        const artistMatch = html.match(/<h2[^>]*><a[^>]*>([^<]+)<\/a>/i) || html.match(/Acordes de ([^:]+):/i);
        if (artistMatch) artist = artistMatch[1].trim();

        // Fallback artist / title from URL path
        if (!title || !artist) {
          const parts = trimmed.split('/').filter(Boolean);
          const last = parts[parts.length - 1]?.replace(/\.shtml.*/, '');
          const artistPart = parts[parts.length - 2];
          if (!title && last) title = last.charAt(0).toUpperCase() + last.slice(1).replace(/_/g, ' ');
          if (!artist && artistPart) artist = artistPart.charAt(0).toUpperCase() + artistPart.slice(1).replace(/_/g, ' ');
        }

        // Content (Chords & Lyrics)
        const bodyMatch = html.match(/<div id=t_body><PRE>([\s\S]*?)<\/PRE>/i) || html.match(/<PRE>([\s\S]*?)<\/PRE>/i);
        if (bodyMatch) {
          let raw = bodyMatch[1];
          raw = raw.replace(/<A>([^<]+)<\/A>/gi, '$1');
          raw = raw.replace(/<div><\/div>/gi, '');
          raw = raw.replace(/<br\s*[\/]?>/gi, '\n');
          raw = raw.replace(/<[^>]+>/g, '');
          raw = raw.replace(/&aacute;/gi, 'á').replace(/&eacute;/gi, 'é').replace(/&iacute;/gi, 'í')
                   .replace(/&oacute;/gi, 'ó').replace(/&uacute;/gi, 'ú').replace(/&ntilde;/gi, 'ñ')
                   .replace(/&iquest;/gi, '¿').replace(/&iexcl;/gi, '¡').replace(/&quot;/gi, '"')
                   .replace(/&amp;/gi, '&');
          content = raw.trim();
        }

        // Key detection
        const capoMatch = content.match(/Capotraste en ([^\n\r]+)/i);
        if (capoMatch) {
          key = `Capo ${capoMatch[1].trim()}`;
        } else {
          const firstChordMatch = content.match(/\b([A-G](?:#|b)?(?:m|maj|min)?)\b/);
          if (firstChordMatch) {
            key = firstChordMatch[1];
          }
        }
      }
    } catch (err: any) {
      console.error('Error fetching LaCuerda:', err);
    }
  }

  // Parse title & artist if still missing
  if (!title && !artist) {
    if (trimmed.includes('-')) {
      const parts = trimmed.split('-');
      artist = parts[0].trim();
      title = parts.slice(1).join('-').trim();
    } else {
      title = trimmed;
    }
  }

  // Search YouTube video automatically
  const searchQuery = `${artist} ${title} video oficial`.trim();
  if (searchQuery) {
    try {
      const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
      const ytRes = await fetch(ytUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
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
  // Allow CORS
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
