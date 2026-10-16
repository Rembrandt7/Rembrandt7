import type { VercelRequest, VercelResponse } from '@vercel/node';

export interface ExternalPrintModel {
  id: string;
  title: string;
  originalTitle: string;
  category: string;
  platform: 'Printables' | 'MakerWorld' | 'Cults3D' | 'Thingiverse' | 'Thangs' | 'Creality Cloud';
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
  likesCount?: number;
  downloadsCount?: number;
}

const PRINTABLES_GRAPHQL_URL = 'https://api.printables.com/graphql/';

const SEARCH_PRINTABLES_QUERY = `
  query SearchModels($query: String!, $limit: Int) {
    searchPrints2(query: $query, limit: $limit, ordering: popular) {
      items {
        id
        name
        slug
        likesCount
        downloadCount
        image {
          filePath
        }
      }
    }
  }
`;

/**
 * Detects the true category of a 3D model from its actual title/name
 * so that categories and descriptions always match the real object.
 */
function inferCategoryFromTitle(rawName: string, fallbackCategory: string): string {
  const n = rawName.toLowerCase();

  if (/\b(lamp|light|lithophane|lantern|bulb|lampshade|candle|nightlight|sconce|iluminaci|lampara)\b/.test(n)) {
    return 'Iluminación & Lámparas';
  }
  if (/\b(planter|vase|pot|succulent|flower\s*pot|bonsai|terrarium|jardiner|maceta|jarron)\b/.test(n)) {
    return 'Decoración & Macetas';
  }
  if (/\b(controller|xbox|ps5|ps4|playstation|dualsense|nintendo|switch|joycon|steam\s*deck|dice|dnd|d&d|pokeball|pokemon|gamer|gaming|console|headset\s*stand)\b/.test(n)) {
    return 'Gaming & Controles';
  }
  if (/\b(keychain|keyring|edc|karambit|otf|fidget|spinner|slider|whistle|multitool|coin|token|llavero|knife)\b/.test(n)) {
    return 'EDC & Llaveros';
  }
  if (/\b(gift\s*box|puzzle\s*box|labyrinth|rose|valentine|christmas|halloween|easter|heart|ornament|trophy|regalo)\b/.test(n)) {
    return 'Temporada & Regalos';
  }
  if (/\b(kitchen|fridge|dispenser|soap|toothbrush|sponge|hook|hanger|clamp|shelf|bracket|wrench|tool|coaster|clip|funnel|opener|bathroom|sink)\b/.test(n)) {
    return 'Hogar & Funcional';
  }
  if (/\b(gridfinity|deskfinity|desk|organizer|stand|holder|dock|magsafe|iphone|phone|laptop|tablet|watch|airpods|cable|charger|sd\s*card|usb|pen\s*holder|headphone)\b/.test(n)) {
    return 'Gadgets & Escritorio';
  }
  if (/\b(articulated|flexi|dragon|axolotl|octopus|turtle|lizard|gecko|shark|snake|dino|rex|cat|dog|frog|capybara|owl|spider|crab|butterfly|print\s*in\s*place|print-in-place)\b/.test(n)) {
    return 'Articulados & Flexi';
  }

  return fallbackCategory || 'Articulados & Flexi';
}

/**
 * Translates common English 3D printing model terms into natural Spanish
 * while keeping the model's distinctive identity so title === image === URL.
 */
function translateModelTitleToSpanish(rawName: string): string {
  let clean = rawName
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const phraseReplacements: Array<[RegExp, string]> = [
    [/\bself[- ]watering planters?\b/gi, 'Maceta Autorriego'],
    [/\bwatering planters?\b/gi, 'Maceta con Riego'],
    [/\bheadphone stands?\b/gi, 'Soporte para Audífonos'],
    [/\bheadset stands?\b/gi, 'Soporte para Audífonos'],
    [/\bcontroller stands?\b/gi, 'Soporte para Control'],
    [/\bcontroller holders?\b/gi, 'Soporte para Control'],
    [/\bphone stands?\b/gi, 'Soporte para Celular'],
    [/\bphone holders?\b/gi, 'Soporte para Celular'],
    [/\blaptop stands?\b/gi, 'Soporte para Laptop'],
    [/\btablet stands?\b/gi, 'Soporte para Tablet'],
    [/\bwatch stands?\b/gi, 'Base para Smartwatch'],
    [/\bcharging stands?\b/gi, 'Base de Carga'],
    [/\bcharger stands?\b/gi, 'Base Cargador'],
    [/\bdesk organizers?\b/gi, 'Organizador de Escritorio'],
    [/\bcable organizers?\b/gi, 'Organizador de Cables'],
    [/\bcable holders?\b/gi, 'Sujetador de Cables'],
    [/\bcable management\b/gi, 'Organizador de Cables'],
    [/\bpen holders?\b/gi, 'Portalápices'],
    [/\bpencil holders?\b/gi, 'Portalápices'],
    [/\bdice towers?\b/gi, 'Torre de Dados'],
    [/\bgift box(es)?\b/gi, 'Caja de Regalo'],
    [/\bpuzzle box(es)?\b/gi, 'Caja Rompecabezas'],
    [/\binfinity cubes?\b/gi, 'Cubo Infinito'],
    [/\bcan dispensers?\b/gi, 'Dispensador de Latas'],
    [/\bdrink dispensers?\b/gi, 'Dispensador de Bebidas'],
    [/\bbattery holders?\b/gi, 'Organizador de Baterías'],
    [/\bbattery organizers?\b/gi, 'Organizador de Baterías'],
    [/\bsd card holders?\b/gi, 'Porta Tarjetas SD'],
    [/\bsoap dish(es)?\b/gi, 'Jabonera'],
    [/\btoothbrush holders?\b/gi, 'Porta Cepillos'],
    [/\bwall mounts?\b/gi, 'Soporte de Pared'],
    [/\bmoon lamps?\b/gi, 'Lámpara Luna'],
    [/\bvoronoi lamps?\b/gi, 'Lámpara Voronoi'],
    [/\bmushroom lamps?\b/gi, 'Lámpara Hongo'],
    [/\bled lamps?\b/gi, 'Lámpara LED'],
    [/\btable lamps?\b/gi, 'Lámpara de Mesa'],
    [/\bdesk lamps?\b/gi, 'Lámpara de Escritorio'],
    [/\bcrystal dragons?\b/gi, 'Dragón de Cristal'],
    [/\bnight spirit dragons?\b/gi, 'Dragón Espíritu Nocturno'],
    [/\barticulated dragons?\b/gi, 'Dragón Articulado'],
    [/\bflexi dragons?\b/gi, 'Dragón Flexi'],
    [/\bflexi rex\b/gi, 'Dinosaurio Flexi Rex'],
    [/\bprint[- ]in[- ]place\b/gi, 'Impresión en 1 Pieza'],
    [/\bno supports?\b/gi, 'Sin Soportes'],
    [/\bsupportless\b/gi, 'Sin Soportes'],
    [/\bwith led stand\b/gi, 'con Base LED'],
    [/\bw\/ led stand\b/gi, 'con Base LED'],
    [/\bstandby mode\b/gi, 'Modo StandBy'],
    [/\bgame cartridges?\b/gi, 'Porta Cartuchos'],
    [/\bfidget knife\b/gi, 'Juguete Kinético OTF'],
    [/\bfidget toys?\b/gi, 'Juguete Fidget Antiestrés'],
    [/\bfidget sliders?\b/gi, 'Slider Fidget Magnético'],
    [/\bspiral vase\b/gi, 'Jarrón en Espiral'],
    [/\bvase mode\b/gi, 'Modo Vaso'],
    [/\blow[- ]poly\b/gi, 'Low Poly'],
  ];

  for (const [regex, replacement] of phraseReplacements) {
    clean = clean.replace(regex, replacement);
  }

  const wordReplacements: Array<[RegExp, string]> = [
    [/\barticulated\b/gi, 'Articulado'],
    [/\bdragon\b/gi, 'Dragón'],
    [/\bdragons\b/gi, 'Dragones'],
    [/\baxolotl\b/gi, 'Ajolote'],
    [/\boctopus\b/gi, 'Pulpo'],
    [/\bturtle\b/gi, 'Tortuga'],
    [/\bshark\b/gi, 'Tiburón'],
    [/\blizard\b/gi, 'Lagarto'],
    [/\bgecko\b/gi, 'Gecko'],
    [/\bsnake\b/gi, 'Serpiente'],
    [/\bfrog\b/gi, 'Rana'],
    [/\bcat\b/gi, 'Gato'],
    [/\bdog\b/gi, 'Perro'],
    [/\bcapybara\b/gi, 'Capibara'],
    [/\bdinosaur\b/gi, 'Dinosaurio'],
    [/\bplanters?\b/gi, 'Maceta'],
    [/\bvases?\b/gi, 'Jarrón'],
    [/\bpots?\b/gi, 'Maceta'],
    [/\blamps?\b/gi, 'Lámpara'],
    [/\blanterns?\b/gi, 'Linterna Decorativa'],
    [/\bkeychains?\b/gi, 'Llavero'],
    [/\bkeyrings?\b/gi, 'Llavero'],
    [/\bcoasters?\b/gi, 'Portavasos'],
    [/\bbookmarks?\b/gi, 'Separador de Libros'],
    [/\borganizers?\b/gi, 'Organizador'],
    [/\bholders?\b/gi, 'Soporte'],
    [/\bstands?\b/gi, 'Soporte'],
    [/\bdocks?\b/gi, 'Base Dock'],
    [/\bdispensers?\b/gi, 'Dispensador'],
    [/\bdrawers?\b/gi, 'Cajonera'],
    [/\bshelf\b/gi, 'Repisa'],
    [/\bhooks?\b/gi, 'Gancho'],
    [/\bclamps?\b/gi, 'Prensa / Sujetador'],
    [/\bwhistles?\b/gi, 'Silbato'],
    [/\broses?\b/gi, 'Rosa'],
    [/\bflowers?\b/gi, 'Flor'],
    [/\bcastles?\b/gi, 'Castillo'],
    [/\btowers?\b/gi, 'Torre'],
    [/\blabyrinth\b/gi, 'Laberinto'],
    [/\bpuzzle\b/gi, 'Rompecabezas'],
    [/\bminimalistic\b/gi, 'Minimalista'],
    [/\bminimalist\b/gi, 'Minimalista'],
    [/\bmodern\b/gi, 'Moderno'],
    [/\bmodular\b/gi, 'Modular'],
    [/\buniversal\b/gi, 'Universal'],
    [/\badjustable\b/gi, 'Ajustable'],
    [/\bfoldable\b/gi, 'Plegable'],
    [/\bfolding\b/gi, 'Plegable'],
    [/\bmagnetic\b/gi, 'Magnético'],
    [/\bcute\b/gi, 'Kawaii'],
    [/\bhelical\b/gi, 'Helicoidal'],
    [/\bgeometric\b/gi, 'Geométrico'],
    [/\bsecret\b/gi, 'Secreto'],
    [/\bfor\b/gi, 'para'],
    [/\bwith\b/gi, 'con'],
    [/\band\b/gi, 'y'],
    [/\bonly\b/gi, 'Solo'],
    [/\bparts\b/gi, 'Piezas'],
  ];

  for (const [regex, replacement] of wordReplacements) {
    clean = clean.replace(regex, replacement);
  }

  clean = clean.replace(/\s+/g, ' ').trim();
  // Capitalize first letter
  if (clean.length > 0) {
    clean = clean.charAt(0).toUpperCase() + clean.slice(1);
  }
  return clean;
}

function buildCategoryPitch(category: string, spanishTitle: string, likes: number, downloads: number): {
  description: string;
  whyItSells: string;
  material: 'PLA' | 'PETG' | 'TPU';
} {
  const statsText = downloads > 0
    ? `con ${downloads.toLocaleString('es-MX')} descargas y ${likes.toLocaleString('es-MX')} likes en Printables`
    : `con ${likes.toLocaleString('es-MX')} likes verificados en Printables`;

  switch (category) {
    case 'Decoración & Macetas':
      return {
        description: `${spanishTitle}: diseño decorativo moderno ${statsText}. Ideal para imprimir en PLA Mate, Madera o PETG.`,
        whyItSells: 'Alta demanda en decoración de interiores, oficinas y bazares de plantas con excelente margen.',
        material: 'PLA',
      };
    case 'Gadgets & Escritorio':
      return {
        description: `${spanishTitle}: accesorio funcional de escritorio ${statsText}. Impresión limpia y resistente.`,
        whyItSells: 'Se vende todo el año para home office, estudiantes y setups de trabajo.',
        material: 'PLA',
      };
    case 'Gaming & Controles':
      return {
        description: `${spanishTitle}: accesorio gamer coleccionable ${statsText}. Excelente acabado en colores neón o bicolor.`,
        whyItSells: 'El nicho gamer y de consolas tiene recompra constante y gran valor percibido como regalo.',
        material: 'PLA',
      };
    case 'Iluminación & Lámparas':
      return {
        description: `${spanishTitle}: luminaria decorativa para luz LED ${statsText}. Diseñada para difusión cálida sin soportes complejos.`,
        whyItSells: 'Las lámparas impresas en 3D multiplican por 4x o 5x el costo del filamento en venta directa.',
        material: 'PLA',
      };
    case 'Hogar & Funcional':
      return {
        description: `${spanishTitle}: solución práctica para el hogar ${statsText}. Impresión sólida y duradera.`,
        whyItSells: 'Resuelve un problema cotidiano inmediato; ideal para demostrar en videos cortos de Reels/TikTok.',
        material: 'PETG',
      };
    case 'EDC & Llaveros':
      return {
        description: `${spanishTitle}: accesorio compacto de rápida impresión ${statsText}. Ideal para producir en serie por cama completa.`,
        whyItSells: 'Bajo consumo de filamento, tiempo de impresión corto y altísima rotación por impulso.',
        material: 'PLA',
      };
    case 'Temporada & Regalos':
      return {
        description: `${spanishTitle}: detalle original listo para regalar ${statsText}. Luce espectacular en filamento PLA Seda (Silk).`,
        whyItSells: 'Regalo llamativo y personalizable con excelente margen de ganancia por pieza.',
        material: 'PLA',
      };
    case 'Articulados & Flexi':
    default:
      return {
        description: `${spanishTitle}: modelo articulado / print-in-place ${statsText}. Se imprime fácil y luce increíble en PLA Silk.`,
        whyItSells: 'Los modelos articulados y fidgets son el producto #1 de compra impulsiva en ferias y redes.',
        material: 'PLA',
      };
  }
}

async function fetchPrintablesQuery(query: string, limit = 16): Promise<any[]> {
  try {
    const gqlRes = await fetch(PRINTABLES_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        query: SEARCH_PRINTABLES_QUERY,
        variables: {
          query,
          limit,
        },
      }),
    });

    if (!gqlRes.ok) return [];
    const data = await gqlRes.json();
    const rawItems = data?.data?.searchPrints2?.items;
    return Array.isArray(rawItems) ? rawItems : [];
  } catch {
    return [];
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const rawQueriesParam = String(req.query.queries || req.body?.queries || '').trim();
  const singleQuery = String(req.query.q || req.body?.query || 'articulated dragon').trim();
  const categoryLabel = String(req.query.category || req.body?.category || 'Articulados & Flexi');
  const excludeParam = String(req.query.exclude || req.body?.exclude || '').trim();

  const excludeSet = new Set(
    excludeParam
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
  );

  const queryList = rawQueriesParam
    ? rawQueriesParam
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .slice(0, 4)
    : [singleQuery];

  try {
    const queryResults = await Promise.all(
      queryList.map(q => fetchPrintablesQuery(q, queryList.length > 1 ? 14 : 24))
    );

    const seenIds = new Set<string>();
    const models: ExternalPrintModel[] = [];

    // Interleave results across all queries so the returned list has maximum variety
    const maxLen = Math.max(0, ...queryResults.map(r => r.length));
    for (let i = 0; i < maxLen; i++) {
      for (let qIdx = 0; qIdx < queryResults.length; qIdx++) {
        const item = queryResults[qIdx][i];
        if (!item?.id || !item?.name || !item?.image?.filePath) continue;

        const fullId = `printables-live-${item.id}`;
        if (seenIds.has(fullId) || excludeSet.has(fullId) || excludeSet.has(String(item.id))) {
          continue;
        }
        seenIds.add(fullId);

        const filePath = String(item.image.filePath).replace(/^\/+/, '');
        const imageUrl = `https://media.printables.com/${filePath}`;
        const slug = item.slug || 'model';
        const url = `https://www.printables.com/model/${item.id}-${slug}`;

        const rawTitle = String(item.name).trim();
        const spanishTitle = translateModelTitleToSpanish(rawTitle);
        const detectedCategory = inferCategoryFromTitle(rawTitle, categoryLabel);
        const likes = Number(item.likesCount) || 0;
        const downloads = Number(item.downloadCount) || 0;

        const pitch = buildCategoryPitch(detectedCategory, spanishTitle, likes, downloads);

        const grams = 40 + ((Number(item.id) + i * 17) % 135);
        const hours = Number((grams / 28).toFixed(1));
        const suggestedPrice = Math.ceil(((grams * 0.45 + hours * 18 + 35) * 2.2) / 10) * 10;

        const queryTags = (queryList[qIdx] || singleQuery)
          .toLowerCase()
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 3);
        const titleWords = rawTitle
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .split(/\s+/)
          .filter(w => w.length > 2)
          .slice(0, 3);
        const tags = Array.from(new Set([...queryTags, ...titleWords])).slice(0, 5);

        const demandBadge =
          downloads >= 10000
            ? `🔥 ${(downloads / 1000).toFixed(0)}k Descargas`
            : likes >= 500
            ? `🔥 ${likes.toLocaleString('es-MX')} Likes`
            : '✨ Novedad Rentable';

        models.push({
          id: fullId,
          title: spanishTitle,
          originalTitle: rawTitle,
          category: detectedCategory,
          platform: 'Printables',
          url,
          imageUrl,
          description: pitch.description,
          whyItSells: pitch.whyItSells,
          tags,
          estimatedGrams: grams,
          estimatedHours: hours,
          suggestedPriceMxn: suggestedPrice,
          material: pitch.material,
          demandBadge,
          likesCount: likes,
          downloadsCount: downloads,
        });
      }
    }

    if (models.length > 0) {
      return res.status(200).json({ ok: true, source: 'printables-live', models });
    }

    return res.status(200).json({ ok: true, source: 'fallback', models: [] });
  } catch (error: any) {
    return res.status(200).json({
      ok: false,
      source: 'fallback',
      error: error?.message || 'Error consultando repositorios externos',
      models: [],
    });
  }
}
