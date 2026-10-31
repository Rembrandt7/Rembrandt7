// Lazy browser-side ESM loaders via esm.sh (0 MB added to node_modules / Vercel)
let pdfLibPromise: Promise<any> | null = null;
async function getPdfLib() {
  if (!pdfLibPromise) {
    const url = 'https://esm.sh/pdf-lib@1.17.1';
    pdfLibPromise = import(/* @vite-ignore */ url);
  }
  return pdfLibPromise;
}

let pdfJsPromise: Promise<any> | null = null;
async function getPdfJs() {
  if (!pdfJsPromise) {
    const url = 'https://esm.sh/pdfjs-dist@4.10.38';
    pdfJsPromise = import(/* @vite-ignore */ url).then((mod) => {
      if (mod?.GlobalWorkerOptions && !mod.GlobalWorkerOptions.workerSrc) {
        mod.GlobalWorkerOptions.workerSrc =
          'https://esm.sh/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
      }
      return mod;
    });
  }
  return pdfJsPromise;
}

let jszipPromise: Promise<any> | null = null;
async function getJSZip() {
  if (!jszipPromise) {
    const url = 'https://esm.sh/jszip@3.10.1';
    jszipPromise = import(/* @vite-ignore */ url).then((m) => m.default || m);
  }
  return jszipPromise;
}

let mammothPromise: Promise<any> | null = null;
async function getMammoth() {
  if (!mammothPromise) {
    const url = 'https://esm.sh/mammoth@1.9.0';
    mammothPromise = import(/* @vite-ignore */ url).then((m) => m.default || m);
  }
  return mammothPromise;
}

let xlsxPromise: Promise<any> | null = null;
async function getXlsx() {
  if (!xlsxPromise) {
    const url = 'https://esm.sh/xlsx@0.18.5';
    xlsxPromise = import(/* @vite-ignore */ url);
  }
  return xlsxPromise;
}

let docxPromise: Promise<any> | null = null;
async function getDocx() {
  if (!docxPromise) {
    const url = 'https://esm.sh/docx@9.5.0';
    docxPromise = import(/* @vite-ignore */ url);
  }
  return docxPromise;
}

let tesseractPromise: Promise<any> | null = null;
async function getTesseract() {
  if (!tesseractPromise) {
    const url = 'https://esm.sh/tesseract.js@5.1.1';
    tesseractPromise = import(/* @vite-ignore */ url).then((m) => m.default || m);
  }
  return tesseractPromise;
}

export interface LoadedFileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  mimeType: string;
  bytes: Uint8Array;
  pageCount: number;
  previewDataUrl?: string;
}

export interface PageDescriptor {
  uid: string;
  fileId: string;
  fileName: string;
  sourcePageIndex: number; // 0-indexed en el archivo origen (-1 si es página en blanco)
  pageNumberLabel: number; // 1-indexed
  rotation: number; // 0, 90, 180, 270
  thumbnailUrl?: string;
  selected: boolean;
  deleted: boolean;
  isBlank?: boolean;
  width: number;
  height: number;
}

export type NineGridPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'middle-left'
  | 'center'
  | 'middle-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export interface StashedResult {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  downloadUrl: string;
  previewUrl: string;
  summaryText?: string;
  extraTextPreview?: string;
  originalBytesTotal?: number;
  rawBytes?: Uint8Array;
}

// Formatea bytes a KB / MB legibles
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// Sanitiza texto para fuentes estándar WinAnsi de pdf-lib
export function sanitizeWinAnsi(input: string): string {
  return input
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, '');
}

// Convierte color HEX (#RRGGBB) a rgb() de pdf-lib
export async function hexToPdfRgb(hex: string) {
  const { rgb } = await getPdfLib();
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;
  return rgb(isNaN(r) ? 0 : r, isNaN(g) ? 0 : g, isNaN(b) ? 0 : b);
}

// Genera URL en memoria del navegador para descarga directa y vista previa instantánea (0 servidor)
export async function stashOutputFile(
  bytes: Uint8Array,
  filename: string,
  mimeType: string,
  extra?: { summaryText?: string; extraTextPreview?: string; originalBytesTotal?: number }
): Promise<StashedResult> {
  const outBlob = new Blob([bytes as unknown as BlobPart], { type: mimeType });
  const blobUrl = URL.createObjectURL(outBlob);
  return {
    id: `remb_pdf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    filename,
    size: bytes.byteLength,
    mimeType,
    downloadUrl: blobUrl,
    previewUrl: blobUrl,
    summaryText: extra?.summaryText,
    extraTextPreview: extra?.extraTextPreview,
    originalBytesTotal: extra?.originalBytesTotal,
    rawBytes: bytes
  };
}

// Genera un PDF de demostración de 4 páginas en un clic
export async function generateDemoPdfFile(): Promise<File> {
  const { PDFDocument, StandardFonts, rgb } = await getPdfLib();
  const demoDoc = await PDFDocument.create();
  const fontBold = await demoDoc.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await demoDoc.embedFont(StandardFonts.Helvetica);

  const colors = [
    rgb(0.89, 0.19, 0.18),
    rgb(0.14, 0.39, 0.92),
    rgb(0.08, 0.64, 0.29),
    rgb(0.58, 0.2, 0.92)
  ];

  for (let i = 1; i <= 4; i++) {
    const p = demoDoc.addPage([595.28, 841.89]);
    p.drawRectangle({
      x: 36,
      y: 740,
      width: 523,
      height: 64,
      color: colors[i - 1]
    });
    p.drawText(`REMB PDF 2.0 - DOCUMENTO DEMO (PAGINA ${i} DE 4)`, {
      x: 54,
      y: 766,
      size: 16,
      font: fontBold,
      color: rgb(1, 1, 1)
    });
    p.drawText(`Reporte Ejecutivo Local - Seccion #${i}`, {
      x: 50,
      y: 690,
      size: 14,
      font: fontBold,
      color: rgb(0.1, 0.15, 0.25)
    });
    const sampleRows = [
      `Concepto ${i}.1   |   Proyecto Residencial Norte   |   $145,200.00 MXN   |   APROBADO`,
      `Concepto ${i}.2   |   Infraestructura Urbanizacion |   $389,500.00 MXN   |   EN REVISION`,
      `Concepto ${i}.3   |   Supervision de Obra Civil    |   $92,800.00 MXN    |   COMPLETADO`,
      `Concepto ${i}.4   |   Control de Calidad Local     |   $64,120.00 MXN    |   APROBADO`
    ];
    sampleRows.forEach((row, rIdx) => {
      p.drawText(row, {
        x: 50,
        y: 640 - rIdx * 28,
        size: 11,
        font: fontReg,
        color: rgb(0.2, 0.25, 0.33)
      });
    });
    p.drawText(
      `Este documento de prueba fue generado 100% en memoria por Remb PDF para probar herramientas de`,
      { x: 50, y: 480, size: 10.5, font: fontReg, color: rgb(0.35, 0.4, 0.48) }
    );
    p.drawText(
      `Unir, Dividir, Comprimir, Rotar, Marca de Agua, Numeracion, Firma, Word y Excel sin subir nada a internet.`,
      { x: 50, y: 462, size: 10.5, font: fontReg, color: rgb(0.35, 0.4, 0.48) }
    );
  }

  const pdfBytes = await demoDoc.save();
  return new File([pdfBytes as unknown as BlobPart], 'Demostracion_Remb_PDF_4_Paginas.pdf', {
    type: 'application/pdf'
  });
}

export async function repairPdfDocument(
  file: LoadedFileItem
): Promise<{ bytes: Uint8Array; pageCount: number }> {
  const { PDFDocument } = await getPdfLib();
  const doc = await PDFDocument.load(file.bytes, { ignoreEncryption: true });
  const cleanDoc = await PDFDocument.create();
  const indices = doc.getPageIndices();
  const copied = await cleanDoc.copyPages(doc, indices);
  copied.forEach((p: any) => cleanDoc.addPage(p));
  cleanDoc.setProducer('Remb PDF Repair Engine');
  const repairedBytes = await cleanDoc.save({ useObjectStreams: true });
  return { bytes: repairedBytes, pageCount: copied.length };
}

// Renderiza una página de un PDF a imagen DataURL usando pdfjs-dist
export async function renderPdfPageToDataUrl(
  pdfDocProxy: any,
  pageNumber1Based: number,
  scale: number = 0.45,
  format: 'image/jpeg' | 'image/png' = 'image/jpeg',
  quality: number = 0.78
): Promise<{ dataUrl: string; width: number; height: number }> {
  const page = await pdfDocProxy.getPage(pageNumber1Based);
  const baseViewport = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({
    canvasContext: ctx,
    viewport
  }).promise;

  const dataUrl = canvas.toDataURL(format, quality);
  return {
    dataUrl,
    width: baseViewport.width,
    height: baseViewport.height
  };
}

// Carga un archivo (PDF, Imagen u Office) y genera miniaturas de sus páginas
export async function inspectAndRenderFile(
  file: File,
  renderAllPageThumbnails: boolean = true,
  maxThumbnails: number = 80
): Promise<{ item: LoadedFileItem; pages: PageDescriptor[] }> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const id = `file_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const isPdf =
    file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  const isImage =
    file.type.startsWith('image/') ||
    /\.(jpe?g|png|webp)$/i.test(file.name);

  if (isPdf) {
    const pdfjsLib = await getPdfJs();
    const loadingTask = pdfjsLib.getDocument({ data: bytes.slice(0) });
    const pdfProxy = await loadingTask.promise;
    const numPages = pdfProxy.numPages;
    const pages: PageDescriptor[] = [];
    let firstThumb: string | undefined;

    const limit = renderAllPageThumbnails ? Math.min(numPages, maxThumbnails) : 1;

    for (let p = 1; p <= numPages; p++) {
      let thumbUrl: string | undefined;
      let w = 595.28;
      let h = 841.89;

      if (p <= limit) {
        try {
          const rendered = await renderPdfPageToDataUrl(pdfProxy, p, 0.38, 'image/jpeg', 0.72);
          thumbUrl = rendered.dataUrl;
          w = rendered.width;
          h = rendered.height;
          if (p === 1) firstThumb = thumbUrl;
        } catch {
          // Si alguna página falla al renderizar miniatura, continuamos con dimensiones estándar
        }
      }

      pages.push({
        uid: `${id}_p${p}_${Math.random().toString(36).slice(2, 6)}`,
        fileId: id,
        fileName: file.name,
        sourcePageIndex: p - 1,
        pageNumberLabel: p,
        rotation: 0,
        thumbnailUrl: thumbUrl,
        selected: false,
        deleted: false,
        width: w,
        height: h
      });
    }

    return {
      item: {
        id,
        file,
        name: file.name,
        size: file.size,
        mimeType: 'application/pdf',
        bytes,
        pageCount: numPages,
        previewDataUrl: firstThumb
      },
      pages
    };
  }

  if (isImage) {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const dims = await new Promise<{ w: number; h: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth || 600, h: img.naturalHeight || 800 });
      img.onerror = () => resolve({ w: 600, h: 800 });
      img.src = dataUrl;
    });

    const page: PageDescriptor = {
      uid: `${id}_img1`,
      fileId: id,
      fileName: file.name,
      sourcePageIndex: 0,
      pageNumberLabel: 1,
      rotation: 0,
      thumbnailUrl: dataUrl,
      selected: false,
      deleted: false,
      width: dims.w,
      height: dims.h
    };

    return {
      item: {
        id,
        file,
        name: file.name,
        size: file.size,
        mimeType: file.type || 'image/jpeg',
        bytes,
        pageCount: 1,
        previewDataUrl: dataUrl
      },
      pages: [page]
    };
  }

  // Archivos Office / HTML / TXT
  return {
    item: {
      id,
      file,
      name: file.name,
      size: file.size,
      mimeType: file.type || 'application/octet-stream',
      bytes,
      pageCount: 1
    },
    pages: [
      {
        uid: `${id}_doc1`,
        fileId: id,
        fileName: file.name,
        sourcePageIndex: 0,
        pageNumberLabel: 1,
        rotation: 0,
        selected: false,
        deleted: false,
        width: 595.28,
        height: 841.89
      }
    ]
  };
}

// Convierte cualquier imagen DataURL o bytes (incluso WebP) a PNG o JPG integrable en pdf-lib
async function embedImageFileInPdf(pdfDoc: any, item: LoadedFileItem) {
  const lower = item.name.toLowerCase();
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg') || item.mimeType === 'image/jpeg') {
    return pdfDoc.embedJpg(item.bytes);
  }
  if (lower.endsWith('.png') || item.mimeType === 'image/png') {
    return pdfDoc.embedPng(item.bytes);
  }
  // Si es WebP u otro formato, lo pasamos por un canvas a PNG
  const dataUrl = item.previewDataUrl!;
  const pngBytes = await new Promise<Uint8Array>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth || 800;
      c.height = img.naturalHeight || 600;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      c.toBlob((blob) => {
        if (!blob) return reject(new Error('No se pudo convertir la imagen'));
        blob.arrayBuffer().then((ab) => resolve(new Uint8Array(ab)));
      }, 'image/png');
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
  return pdfDoc.embedPng(pngBytes);
}

// ============================================================================
// 1. RECONSTRUCTOR UNIVERSAL DE PÁGINAS (Unir, Ordenar, Eliminar, Extraer, Rotar)
// ============================================================================
export async function buildPdfFromPageDescriptors(
  files: LoadedFileItem[],
  pages: PageDescriptor[]
): Promise<Uint8Array> {
  const { PDFDocument, degrees } = await getPdfLib();
  const outPdf = await PDFDocument.create();
  const fileMap = new Map<string, LoadedFileItem>();
  files.forEach((f) => fileMap.set(f.id, f));

  const loadedPdfDocs = new Map<string, any>();

  for (const desc of pages) {
    if (desc.deleted) continue;

    if (desc.isBlank || desc.sourcePageIndex < 0) {
      const blankPage = outPdf.addPage([desc.width || 595.28, desc.height || 841.89]);
      if (desc.rotation) {
        blankPage.setRotation(degrees(desc.rotation % 360));
      }
      continue;
    }

    const srcFile = fileMap.get(desc.fileId);
    if (!srcFile) continue;

    const isPdf =
      srcFile.mimeType === 'application/pdf' || srcFile.name.toLowerCase().endsWith('.pdf');

    if (isPdf) {
      let srcDoc = loadedPdfDocs.get(srcFile.id);
      if (!srcDoc) {
        srcDoc = await PDFDocument.load(srcFile.bytes, { ignoreEncryption: true });
        loadedPdfDocs.set(srcFile.id, srcDoc);
      }
      const [copiedPage] = await outPdf.copyPages(srcDoc, [desc.sourcePageIndex]);
      const currentRot = copiedPage.getRotation().angle || 0;
      copiedPage.setRotation(degrees((currentRot + desc.rotation) % 360));
      outPdf.addPage(copiedPage);
    } else {
      // Es una imagen intercalada en Unir PDF
      const embeddedImg = await embedImageFileInPdf(outPdf, srcFile);
      const page = outPdf.addPage([595.28, 841.89]);
      const scaled = embeddedImg.scaleToFit(555, 800);
      page.drawImage(embeddedImg, {
        x: (595.28 - scaled.width) / 2,
        y: (841.89 - scaled.height) / 2,
        width: scaled.width,
        height: scaled.height
      });
      if (desc.rotation) {
        page.setRotation(degrees(desc.rotation % 360));
      }
    }
  }

  return outPdf.save();
}

// ============================================================================
// 2. DIVIDIR PDF (Por rangos, intervalos fijos o todas las páginas en ZIP)
// ============================================================================
export interface SplitRangeItem {
  from: number;
  to: number;
}

export async function splitPdfDocument(
  file: LoadedFileItem,
  mode: 'ranges' | 'fixed' | 'all-pages',
  ranges: SplitRangeItem[],
  fixedStep: number,
  mergeRangesIntoSinglePdf: boolean
): Promise<{ bytes: Uint8Array; filename: string; mimeType: string; summary: string }> {
  const { PDFDocument } = await getPdfLib();
  const JSZip = await getJSZip();
  const srcDoc = await PDFDocument.load(file.bytes, { ignoreEncryption: true });
  const totalPages = srcDoc.getPageCount();
  const baseName = file.name.replace(/\.pdf$/i, '');

  const computedRanges: SplitRangeItem[] = [];
  if (mode === 'ranges') {
    for (const r of ranges) {
      const from = Math.max(1, Math.min(totalPages, r.from));
      const to = Math.max(from, Math.min(totalPages, r.to));
      computedRanges.push({ from, to });
    }
  } else if (mode === 'fixed') {
    const step = Math.max(1, fixedStep);
    for (let start = 1; start <= totalPages; start += step) {
      computedRanges.push({
        from: start,
        to: Math.min(totalPages, start + step - 1)
      });
    }
  } else {
    for (let p = 1; p <= totalPages; p++) {
      computedRanges.push({ from: p, to: p });
    }
  }

  if (computedRanges.length === 1 || (mode === 'ranges' && mergeRangesIntoSinglePdf)) {
    const outPdf = await PDFDocument.create();
    for (const r of computedRanges) {
      const indices: number[] = [];
      for (let p = r.from; p <= r.to; p++) indices.push(p - 1);
      const copied = await outPdf.copyPages(srcDoc, indices);
      copied.forEach((cp: any) => outPdf.addPage(cp));
    }
    const bytes = await outPdf.save();
    return {
      bytes,
      filename: `${baseName}_dividido.pdf`,
      mimeType: 'application/pdf',
      summary: `PDF dividido correctamente (${outPdf.getPageCount()} páginas extraídas).`
    };
  }

  // Múltiples archivos PDF -> empaquetados en un archivo .ZIP
  const zip = new JSZip();
  for (let i = 0; i < computedRanges.length; i++) {
    const r = computedRanges[i];
    const partPdf = await PDFDocument.create();
    const indices: number[] = [];
    for (let p = r.from; p <= r.to; p++) indices.push(p - 1);
    const copied = await partPdf.copyPages(srcDoc, indices);
    copied.forEach((cp: any) => partPdf.addPage(cp));
    const partBytes = await partPdf.save();
    const label = r.from === r.to ? `pag_${r.from}` : `pags_${r.from}_a_${r.to}`;
    zip.file(`${baseName}_${label}.pdf`, partBytes);
  }

  const zipBytes = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
  return {
    bytes: zipBytes,
    filename: `${baseName}_dividido_${computedRanges.length}_archivos.zip`,
    mimeType: 'application/zip',
    summary: `Se generaron ${computedRanges.length} archivos PDF independientes dentro del paquete ZIP.`
  };
}

// ============================================================================
// 3. COMPRIMIR PDF (3 niveles estilo iLovePDF: Extrema, Recomendada, Baja)
// ============================================================================
export async function compressPdfDocument(
  file: LoadedFileItem,
  level: 'extreme' | 'recommended' | 'low',
  onProgress?: (msg: string) => void
): Promise<{ bytes: Uint8Array; summary: string }> {
  const { PDFDocument } = await getPdfLib();
  const pdfjsLib = await getPdfJs();
  onProgress?.('Analizando flujos de objetos del PDF...');
  const srcDoc = await PDFDocument.load(file.bytes, { ignoreEncryption: true });

  // Paso 1: Optimización sin pérdida por flujos de objetos
  const structuralBytes = await srcDoc.save({
    useObjectStreams: true,
    addDefaultPage: false
  });

  if (level === 'low') {
    const best = structuralBytes.byteLength < file.size ? structuralBytes : file.bytes;
    const savedPct = Math.max(0, Math.round((1 - best.byteLength / file.size) * 100));
    return {
      bytes: best,
      summary: `Optimización de baja compresión completada (Alta calidad conservada, ahorro del ${savedPct}%).`
    };
  }

  // Paso 2: Re-muestreo inteligente de páginas para Compresión Recomendada o Extrema
  const scale = level === 'extreme' ? 1.05 : 1.45;
  const quality = level === 'extreme' ? 0.52 : 0.74;

  const loadingTask = pdfjsLib.getDocument({ data: file.bytes.slice(0) });
  const pdfProxy = await loadingTask.promise;
  const numPages = pdfProxy.numPages;
  const recompressedPdf = await PDFDocument.create();

  for (let p = 1; p <= numPages; p++) {
    onProgress?.(`Comprimiendo página ${p} de ${numPages}...`);
    const rendered = await renderPdfPageToDataUrl(pdfProxy, p, scale, 'image/jpeg', quality);
    const jpgBytes = await fetch(rendered.dataUrl).then((r) => r.arrayBuffer());
    const embeddedJpg = await recompressedPdf.embedJpg(jpgBytes);
    const page = recompressedPdf.addPage([rendered.width, rendered.height]);
    page.drawImage(embeddedJpg, {
      x: 0,
      y: 0,
      width: rendered.width,
      height: rendered.height
    });
  }

  const rasterBytes = await recompressedPdf.save({ useObjectStreams: true });

  // Elegimos automáticamente el resultado más liviano entre el estructural y el remuestreado
  const candidates = [file.bytes, structuralBytes, rasterBytes].sort(
    (a, b) => a.byteLength - b.byteLength
  );
  const smallest = candidates[0];
  const savedPct = Math.max(0, Math.round((1 - smallest.byteLength / file.size) * 100));

  return {
    bytes: smallest,
    summary: `De ${formatBytes(file.size)} a ${formatBytes(smallest.byteLength)} (${savedPct}% de reducción).`
  };
}

// ============================================================================
// 4. NÚMEROS DE PÁGINA (Cuadrícula de 9 posiciones, formato, margen y rango)
// ============================================================================
export interface PageNumbersOptions {
  position: NineGridPosition;
  marginPts: number;
  firstNumber: number;
  fromPage: number;
  toPage: number;
  formatTemplate: 'page-n-of-m' | 'page-n' | 'simple';
  fontSize: number;
  colorHex: string;
}

function computeNineGridCoordinates(
  pos: NineGridPosition,
  pageW: number,
  pageH: number,
  boxW: number,
  boxH: number,
  margin: number
): { x: number; y: number } {
  let x = (pageW - boxW) / 2;
  let y = (pageH - boxH) / 2;

  if (pos.endsWith('left')) x = margin;
  else if (pos.endsWith('right')) x = Math.max(margin, pageW - boxW - margin);

  if (pos.startsWith('top')) y = Math.max(margin, pageH - boxH - margin);
  else if (pos.startsWith('bottom')) y = margin;

  return { x, y };
}

export async function addPageNumbersToPdf(
  file: LoadedFileItem,
  opts: PageNumbersOptions
): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts } = await getPdfLib();
  const pdfDoc = await PDFDocument.load(file.bytes, { ignoreEncryption: true });
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();
  const total = pages.length;
  const color = await hexToPdfRgb(opts.colorHex);

  const startIdx = Math.max(0, opts.fromPage - 1);
  const endIdx = Math.min(total - 1, opts.toPage - 1);

  for (let i = startIdx; i <= endIdx; i++) {
    const page = pages[i];
    const { width, height } = page.getSize();
    const numValue = opts.firstNumber + (i - startIdx);

    let label = `${numValue}`;
    if (opts.formatTemplate === 'page-n-of-m') {
      label = `Pagina ${numValue} de ${total}`;
    } else if (opts.formatTemplate === 'page-n') {
      label = `Pagina ${numValue}`;
    }

    const safeLabel = sanitizeWinAnsi(label);
    const textWidth = font.widthOfTextAtSize(safeLabel, opts.fontSize);
    const { x, y } = computeNineGridCoordinates(
      opts.position,
      width,
      height,
      textWidth,
      opts.fontSize,
      opts.marginPts
    );

    page.drawText(safeLabel, {
      x,
      y,
      size: opts.fontSize,
      font,
      color
    });
  }

  return pdfDoc.save();
}

// ============================================================================
// 5. MARCA DE AGUA (Texto o Imagen PNG/JPG, Mosaico, Opacidad y Rotación)
// ============================================================================
export interface WatermarkOptions {
  mode: 'text' | 'image';
  text: string;
  imageBytes?: Uint8Array;
  imageMime?: string;
  position: NineGridPosition;
  mosaic: boolean;
  opacity: number;
  rotationDeg: number;
  fontSize: number;
  colorHex: string;
}

export async function addWatermarkToPdf(
  file: LoadedFileItem,
  opts: WatermarkOptions
): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, degrees } = await getPdfLib();
  const pdfDoc = await PDFDocument.load(file.bytes, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const color = await hexToPdfRgb(opts.colorHex);

  let embeddedLogo: any = null;
  if (opts.mode === 'image' && opts.imageBytes) {
    if (opts.imageMime?.includes('png')) {
      embeddedLogo = await pdfDoc.embedPng(opts.imageBytes);
    } else {
      embeddedLogo = await pdfDoc.embedJpg(opts.imageBytes);
    }
  }

  for (const page of pages) {
    const { width, height } = page.getSize();

    if (opts.mode === 'text') {
      const safeText = sanitizeWinAnsi(opts.text || 'CONFIDENCIAL');
      const textW = font.widthOfTextAtSize(safeText, opts.fontSize);

      if (opts.mosaic) {
        const stepX = Math.max(180, textW + 90);
        const stepY = Math.max(140, opts.fontSize * 3.5);
        for (let y = 40; y < height; y += stepY) {
          for (let x = 30; x < width; x += stepX) {
            page.drawText(safeText, {
              x,
              y,
              size: opts.fontSize,
              font,
              color,
              opacity: opts.opacity,
              rotate: degrees(opts.rotationDeg)
            });
          }
        }
      } else {
        const { x, y } = computeNineGridCoordinates(
          opts.position,
          width,
          height,
          textW,
          opts.fontSize,
          36
        );
        page.drawText(safeText, {
          x,
          y,
          size: opts.fontSize,
          font,
          color,
          opacity: opts.opacity,
          rotate: degrees(opts.rotationDeg)
        });
      }
    } else if (embeddedLogo) {
      const scaled = embeddedLogo.scaleToFit(180, 180);
      const { x, y } = computeNineGridCoordinates(
        opts.position,
        width,
        height,
        scaled.width,
        scaled.height,
        36
      );
      page.drawImage(embeddedLogo, {
        x,
        y,
        width: scaled.width,
        height: scaled.height,
        opacity: opts.opacity,
        rotate: degrees(opts.rotationDeg)
      });
    }
  }

  return pdfDoc.save();
}

// ============================================================================
// 6. FIRMAR PDF (Dibujo en Canvas, Texto caligráfico o Imagen subida + Sello)
// ============================================================================
export interface SignPdfOptions {
  signaturePngDataUrl: string;
  signerName: string;
  includeDate: boolean;
  targetPages: 'last' | 'first' | 'all' | 'custom';
  customPageNumber: number;
  position: NineGridPosition;
  widthPts: number;
}

export async function signPdfDocument(
  file: LoadedFileItem,
  opts: SignPdfOptions
): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await getPdfLib();
  const pdfDoc = await PDFDocument.load(file.bytes, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const pngBytes = await fetch(opts.signaturePngDataUrl).then((r) => r.arrayBuffer());
  const sigImg = await pdfDoc.embedPng(pngBytes);
  const ratio = sigImg.height / Math.max(1, sigImg.width);
  const sigW = opts.widthPts || 160;
  const sigH = sigW * ratio;

  const targetIndices: number[] = [];
  if (opts.targetPages === 'all') {
    pages.forEach((_: any, idx: number) => targetIndices.push(idx));
  } else if (opts.targetPages === 'first') {
    targetIndices.push(0);
  } else if (opts.targetPages === 'custom') {
    const idx = Math.max(0, Math.min(pages.length - 1, opts.customPageNumber - 1));
    targetIndices.push(idx);
  } else {
    targetIndices.push(pages.length - 1);
  }

  const dateStr = new Date().toLocaleDateString('es-MX', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  for (const idx of targetIndices) {
    const page = pages[idx];
    const { width, height } = page.getSize();
    const { x, y } = computeNineGridCoordinates(
      opts.position,
      width,
      height,
      sigW,
      sigH + 24,
      36
    );

    page.drawImage(sigImg, {
      x,
      y: y + 16,
      width: sigW,
      height: sigH
    });

    const footerParts: string[] = [];
    if (opts.signerName.trim()) footerParts.push(`Firmado: ${opts.signerName.trim()}`);
    if (opts.includeDate) footerParts.push(`Fecha: ${dateStr}`);

    if (footerParts.length > 0) {
      const caption = sanitizeWinAnsi(footerParts.join(' | '));
      page.drawText(caption, {
        x,
        y: y + 4,
        size: 8.5,
        font,
        color: rgb(0.22, 0.25, 0.32)
      });
    }
  }

  return pdfDoc.save();
}

// ============================================================================
// 7. JPG / PNG A PDF (Orientación, Tamaño de hoja A4/Carta/Ajustar, Márgenes)
// ============================================================================
export interface ImagesToPdfOptions {
  orientation: 'auto' | 'portrait' | 'landscape';
  pageSize: 'a4' | 'letter' | 'fit';
  margin: 'none' | 'small' | 'big';
}

export async function convertImagesToPdf(
  files: LoadedFileItem[],
  opts: ImagesToPdfOptions
): Promise<Uint8Array> {
  const { PDFDocument } = await getPdfLib();
  const pdfDoc = await PDFDocument.create();
  const marginPts = opts.margin === 'none' ? 0 : opts.margin === 'small' ? 24 : 54;

  for (const item of files) {
    const embedded = await embedImageFileInPdf(pdfDoc, item);
    const imgW = embedded.width;
    const imgH = embedded.height;

    if (opts.pageSize === 'fit') {
      const page = pdfDoc.addPage([imgW + marginPts * 2, imgH + marginPts * 2]);
      page.drawImage(embedded, {
        x: marginPts,
        y: marginPts,
        width: imgW,
        height: imgH
      });
      continue;
    }

    const baseSize: [number, number] =
      opts.pageSize === 'letter' ? [612, 792] : [595.28, 841.89];

    let isLandscape = opts.orientation === 'landscape';
    if (opts.orientation === 'auto') {
      isLandscape = imgW > imgH;
    }

    const pageW = isLandscape ? baseSize[1] : baseSize[0];
    const pageH = isLandscape ? baseSize[0] : baseSize[1];
    const page = pdfDoc.addPage([pageW, pageH]);

    const availW = Math.max(50, pageW - marginPts * 2);
    const availH = Math.max(50, pageH - marginPts * 2);
    const scaled = embedded.scaleToFit(availW, availH);

    page.drawImage(embedded, {
      x: (pageW - scaled.width) / 2,
      y: (pageH - scaled.height) / 2,
      width: scaled.width,
      height: scaled.height
    });
  }

  return pdfDoc.save();
}

// ============================================================================
// 8. PDF A JPG / PNG (Imagen individual si es 1 pág, o archivo .ZIP si son varias)
// ============================================================================
export async function convertPdfToImages(
  file: LoadedFileItem,
  format: 'jpeg' | 'png',
  dpi: 150 | 300,
  onProgress?: (msg: string) => void
): Promise<{ bytes: Uint8Array; filename: string; mimeType: string; summary: string }> {
  const pdfjsLib = await getPdfJs();
  const JSZip = await getJSZip();
  const scale = dpi === 300 ? 2.6 : 1.65;
  const mime = format === 'png' ? 'image/png' : 'image/jpeg';
  const ext = format === 'png' ? 'png' : 'jpg';
  const baseName = file.name.replace(/\.pdf$/i, '');

  const loadingTask = pdfjsLib.getDocument({ data: file.bytes.slice(0) });
  const pdfProxy = await loadingTask.promise;
  const numPages = pdfProxy.numPages;

  if (numPages === 1) {
    onProgress?.('Renderizando página a imagen de alta definición...');
    const rendered = await renderPdfPageToDataUrl(pdfProxy, 1, scale, mime, 0.92);
    const ab = await fetch(rendered.dataUrl).then((r) => r.arrayBuffer());
    return {
      bytes: new Uint8Array(ab),
      filename: `${baseName}_pag_1.${ext}`,
      mimeType: mime,
      summary: `Página convertida a imagen ${ext.toUpperCase()} (${dpi} DPI).`
    };
  }

  const zip = new JSZip();
  for (let p = 1; p <= numPages; p++) {
    onProgress?.(`Convirtiendo página ${p} de ${numPages} a ${ext.toUpperCase()}...`);
    const rendered = await renderPdfPageToDataUrl(pdfProxy, p, scale, mime, 0.9);
    const ab = await fetch(rendered.dataUrl).then((r) => r.arrayBuffer());
    const padNum = String(p).padStart(2, '0');
    zip.file(`${baseName}_pagina_${padNum}.${ext}`, new Uint8Array(ab));
  }

  const zipBytes = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
  return {
    bytes: zipBytes,
    filename: `${baseName}_imagenes_${ext}.zip`,
    mimeType: 'application/zip',
    summary: `Se extrajeron las ${numPages} páginas como imágenes ${ext.toUpperCase()} (${dpi} DPI) en un paquete ZIP.`
  };
}

// ============================================================================
// 9. EXTRACTOR ESTRUCTURADO DE TEXTO Y TABLAS (Para PDF a Word, Excel y Texto)
// ============================================================================
export interface ExtractedPageStructure {
  pageNumber: number;
  lines: { y: number; cells: { x: number; text: string }[]; fullLine: string }[];
  rawText: string;
}

export async function extractStructuredTextFromPdf(
  pdfBytes: Uint8Array
): Promise<ExtractedPageStructure[]> {
  const pdfjsLib = await getPdfJs();
  const loadingTask = pdfjsLib.getDocument({ data: pdfBytes.slice(0) });
  const pdfProxy = await loadingTask.promise;
  const result: ExtractedPageStructure[] = [];

  for (let p = 1; p <= pdfProxy.numPages; p++) {
    const page = await pdfProxy.getPage(p);
    const textContent = await page.getTextContent();
    const rowBuckets: { y: number; items: { x: number; str: string }[] }[] = [];

    for (const rawItem of textContent.items as any[]) {
      const str = (rawItem.str || '').trim();
      if (!str) continue;
      const x = rawItem.transform ? rawItem.transform[4] : 0;
      const y = rawItem.transform ? rawItem.transform[5] : 0;

      // Agrupar elementos que están en la misma línea horizontal (tolerancia de 4.5 pts)
      let bucket = rowBuckets.find((b) => Math.abs(b.y - y) <= 4.5);
      if (!bucket) {
        bucket = { y, items: [] };
        rowBuckets.push(bucket);
      }
      bucket.items.push({ x, str });
    }

    // Ordenar de arriba hacia abajo (en coordenadas PDF, mayor Y es más arriba)
    rowBuckets.sort((a, b) => b.y - a.y);

    const lines = rowBuckets.map((b) => {
      b.items.sort((a, c) => a.x - c.x);
      const cells = b.items.map((it) => ({ x: it.x, text: it.str }));
      return {
        y: b.y,
        cells,
        fullLine: cells.map((c) => c.text).join('   ')
      };
    });

    result.push({
      pageNumber: p,
      lines,
      rawText: lines.map((l) => l.fullLine).join('\n')
    });
  }

  return result;
}

// ============================================================================
// 10. PDF A WORD (.DOCX real editable con librería `docx`)
// ============================================================================
export async function convertPdfToWordDocx(
  file: LoadedFileItem
): Promise<{ bytes: Uint8Array; previewText: string }> {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await getDocx();
  const pages = await extractStructuredTextFromPdf(file.bytes);
  const children: any[] = [];
  const previewChunks: string[] = [];

  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: file.name.replace(/\.pdf$/i, ''), bold: true })]
    })
  );

  for (const page of pages) {
    previewChunks.push(`--- PÁGINA ${page.pageNumber} ---\n${page.rawText}`);

    children.push(
      new Paragraph({
        spacing: { before: 280, after: 120 },
        children: [
          new TextRun({
            text: `Página ${page.pageNumber}`,
            bold: true,
            color: 'E5322D',
            size: 22
          })
        ]
      })
    );

    if (page.lines.length === 0) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: '[Página sin texto seleccionable — Usa la herramienta OCR PDF si es un documento escaneado]',
              italics: true,
              color: '666666'
            })
          ]
        })
      );
    } else {
      for (const ln of page.lines) {
        children.push(
          new Paragraph({
            spacing: { after: 100 },
            children: [new TextRun({ text: ln.fullLine, size: 22 })]
          })
        );
      }
    }
  }

  const doc = new Document({
    sections: [{ properties: {}, children }]
  });

  const blob = await Packer.toBlob(doc);
  const ab = await blob.arrayBuffer();
  return {
    bytes: new Uint8Array(ab),
    previewText: previewChunks.join('\n\n')
  };
}

// ============================================================================
// 11. PDF A EXCEL (.XLSX real con hojas por página y detección de columnas)
// ============================================================================
export async function convertPdfToExcelXlsx(
  file: LoadedFileItem
): Promise<{ bytes: Uint8Array; previewText: string }> {
  const XLSX = await getXlsx();
  const pages = await extractStructuredTextFromPdf(file.bytes);
  const wb = XLSX.utils.book_new();
  const allRowsCombined: string[][] = [];

  for (const page of pages) {
    const sheetRows: string[][] = [];
    for (const ln of page.lines) {
      // Si un elemento tiene bloques separados por 2+ espacios o múltiples celdas X, los separamos en columnas
      const rowCells: string[] = [];
      for (const cell of ln.cells) {
        const subParts = cell.text.split(/\s{2,}|\t+/).filter(Boolean);
        rowCells.push(...subParts);
      }
      if (rowCells.length > 0) {
        sheetRows.push(rowCells);
        allRowsCombined.push([`Pág ${page.pageNumber}`, ...rowCells]);
      }
    }

    const ws = XLSX.utils.aoa_to_sheet(
      sheetRows.length > 0 ? sheetRows : [['Sin datos tabulares en esta página']]
    );
    XLSX.utils.book_append_sheet(wb, ws, `Pagina_${page.pageNumber}`);
  }

  if (pages.length > 1 && allRowsCombined.length > 0) {
    const consolidated = XLSX.utils.aoa_to_sheet([
      ['Página', 'Columna 1', 'Columna 2', 'Columna 3', 'Columna 4'],
      ...allRowsCombined
    ]);
    XLSX.utils.book_append_sheet(wb, consolidated, 'Consolidado_Total');
  }

  const outBuf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const previewText = allRowsCombined
    .slice(0, 40)
    .map((r) => r.join('  |  '))
    .join('\n');

  return {
    bytes: new Uint8Array(outBuf),
    previewText: previewText || 'Libro Excel generado correctamente.'
  };
}

// ============================================================================
// 12. WORD / EXCEL / POWERPOINT / HTML / TXT A PDF
// ============================================================================
export async function convertOfficeOrTextToPdf(
  file: LoadedFileItem
): Promise<{ bytes: Uint8Array; engineUsed: string }> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  // Motor directo en el navegador (Mammoth para DOCX, SheetJS para XLSX/CSV)
  let extractedTitle = file.name;
  let bodyLines: string[] = [];

  if (ext === 'docx') {
    const mammoth = await getMammoth();
    const res = await mammoth.extractRawText({ arrayBuffer: file.bytes.buffer.slice(0) as ArrayBuffer });
    bodyLines = (res.value || '').split(/\r?\n/);
  } else if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
    const XLSX = await getXlsx();
    const wb = XLSX.read(file.bytes, { type: 'array' });
    for (const sheetName of wb.SheetNames) {
      bodyLines.push(`=== HOJA: ${sheetName} ===`);
      const rows = XLSX.utils.sheet_to_json<any[]>(wb.Sheets[sheetName], { header: 1 });
      for (const r of rows) {
        if (Array.isArray(r) && r.length > 0) {
          bodyLines.push(r.map((c) => (c ?? '').toString()).join('   |   '));
        }
      }
      bodyLines.push('');
    }
  } else {
    const decoder = new TextDecoder('utf-8');
    const raw = decoder.decode(file.bytes);
    const stripped =
      ext === 'html' || ext === 'htm'
        ? raw.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ')
        : raw;
    bodyLines = stripped.split(/\r?\n/);
  }

  const pdfBytes = await renderCleanTextDocumentToPdf(extractedTitle, bodyLines.join('\n'));
  return {
    bytes: pdfBytes,
    engineUsed: 'Motor Local de Navegador (Remb PDF Engine)'
  };
}

// Maqueta texto largo o tablas en un PDF multipágina limpio
export async function renderCleanTextDocumentToPdf(
  title: string,
  content: string
): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await getPdfLib();
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const pageW = 595.28;
  const pageH = 841.89;
  const margin = 46;
  const maxLineW = pageW - margin * 2;
  const fontSize = 10.5;
  const lineHeight = 15;

  let page = pdfDoc.addPage([pageW, pageH]);
  let cursorY = pageH - margin;

  // Encabezado del documento
  page.drawText(sanitizeWinAnsi(title), {
    x: margin,
    y: cursorY,
    size: 14,
    font: fontBold,
    color: rgb(0.89, 0.19, 0.18)
  });
  cursorY -= 26;

  const paragraphs = content.split(/\r?\n/);

  for (const rawPara of paragraphs) {
    const cleanPara = sanitizeWinAnsi(rawPara);
    if (!cleanPara.trim()) {
      cursorY -= lineHeight * 0.7;
      if (cursorY < margin) {
        page = pdfDoc.addPage([pageW, pageH]);
        cursorY = pageH - margin;
      }
      continue;
    }

    const words = cleanPara.split(/\s+/);
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = fontRegular.widthOfTextAtSize(testLine, fontSize);
      if (width > maxLineW && currentLine) {
        if (cursorY < margin) {
          page = pdfDoc.addPage([pageW, pageH]);
          cursorY = pageH - margin;
        }
        page.drawText(currentLine, {
          x: margin,
          y: cursorY,
          size: fontSize,
          font: fontRegular,
          color: rgb(0.12, 0.16, 0.22)
        });
        cursorY -= lineHeight;
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      if (cursorY < margin) {
        page = pdfDoc.addPage([pageW, pageH]);
        cursorY = pageH - margin;
      }
      page.drawText(currentLine, {
        x: margin,
        y: cursorY,
        size: fontSize,
        font: fontRegular,
        color: rgb(0.12, 0.16, 0.22)
      });
      cursorY -= lineHeight;
    }
  }

  return pdfDoc.save();
}

// ============================================================================
// 13. RECORTAR Y ANOTAR PDF (Ajuste de márgenes CropBox y sello de nota)
// ============================================================================
export interface CropAndEditOptions {
  cropTopPts: number;
  cropBottomPts: number;
  cropLeftPts: number;
  cropRightPts: number;
  stampText: string;
  redactHeaderFooter: boolean;
}

export async function cropAndAnnotatePdf(
  file: LoadedFileItem,
  opts: CropAndEditOptions
): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await getPdfLib();
  const pdfDoc = await PDFDocument.load(file.bytes, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  for (const page of pages) {
    const { width, height } = page.getSize();

    if (opts.redactHeaderFooter) {
      // Cubrir con franja blanca limpia encabezados y pies de página antiguos
      page.drawRectangle({
        x: 0,
        y: height - 36,
        width,
        height: 36,
        color: rgb(1, 1, 1)
      });
      page.drawRectangle({
        x: 0,
        y: 0,
        width,
        height: 36,
        color: rgb(1, 1, 1)
      });
    }

    if (
      opts.cropTopPts > 0 ||
      opts.cropBottomPts > 0 ||
      opts.cropLeftPts > 0 ||
      opts.cropRightPts > 0
    ) {
      const newX = Math.min(width / 3, Math.max(0, opts.cropLeftPts));
      const newY = Math.min(height / 3, Math.max(0, opts.cropBottomPts));
      const newW = Math.max(100, width - newX - Math.max(0, opts.cropRightPts));
      const newH = Math.max(100, height - newY - Math.max(0, opts.cropTopPts));
      page.setCropBox(newX, newY, newW, newH);
    }

    if (opts.stampText.trim()) {
      const safe = sanitizeWinAnsi(opts.stampText.trim());
      page.drawText(safe, {
        x: 36,
        y: height - 26,
        size: 10,
        font,
        color: rgb(0.85, 0.15, 0.15)
      });
    }
  }

  return pdfDoc.save();
}

// ============================================================================
// 14. PROTEGER Y METADATOS PDF (Limpieza de privacidad o edición de Autor/Título)
// ============================================================================
export interface MetadataSecurityOptions {
  title: string;
  author: string;
  subject: string;
  keywords: string;
  stripAllMetadata: boolean;
  securityBanner: string;
}

export async function updateMetadataAndProtectPdf(
  file: LoadedFileItem,
  opts: MetadataSecurityOptions
): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await getPdfLib();
  const pdfDoc = await PDFDocument.load(file.bytes, { ignoreEncryption: true });

  if (opts.stripAllMetadata) {
    pdfDoc.setTitle('');
    pdfDoc.setAuthor('');
    pdfDoc.setSubject('');
    pdfDoc.setKeywords([]);
    pdfDoc.setProducer('Remb PDF Privacy Sanitizer');
    pdfDoc.setCreator('');
  } else {
    if (opts.title) pdfDoc.setTitle(opts.title);
    if (opts.author) pdfDoc.setAuthor(opts.author);
    if (opts.subject) pdfDoc.setSubject(opts.subject);
    if (opts.keywords) {
      pdfDoc.setKeywords(
        opts.keywords
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean)
      );
    }
  }

  if (opts.securityBanner.trim()) {
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const banner = sanitizeWinAnsi(opts.securityBanner.trim());
    for (const page of pdfDoc.getPages()) {
      const { width, height } = page.getSize();
      page.drawRectangle({
        x: 0,
        y: height - 22,
        width,
        height: 22,
        color: rgb(0.89, 0.19, 0.18)
      });
      page.drawText(banner, {
        x: 16,
        y: height - 15,
        size: 9,
        font,
        color: rgb(1, 1, 1)
      });
    }
  }

  return pdfDoc.save();
}

// ============================================================================
// 15. COMPARAR DOS ARCHIVOS PDF (Reporte detallado de diferencias por página)
// ============================================================================
export async function compareTwoPdfDocuments(
  fileA: LoadedFileItem,
  fileB: LoadedFileItem
): Promise<{ reportPdfBytes: Uint8Array; diffSummaryText: string }> {
  const pagesA = await extractStructuredTextFromPdf(fileA.bytes);
  const pagesB = await extractStructuredTextFromPdf(fileB.bytes);
  const maxPages = Math.max(pagesA.length, pagesB.length);

  const reportLines: string[] = [
    `ARCHIVO BASE (A): ${fileA.name} (${pagesA.length} paginas, ${formatBytes(fileA.size)})`,
    `ARCHIVO COMPARADO (B): ${fileB.name} (${pagesB.length} paginas, ${formatBytes(fileB.size)})`,
    '--------------------------------------------------------------------------------',
    ''
  ];

  let identicalPages = 0;
  let modifiedPages = 0;

  for (let i = 0; i < maxPages; i++) {
    const pA = pagesA[i]?.rawText.trim() || '';
    const pB = pagesB[i]?.rawText.trim() || '';

    if (pA === pB) {
      identicalPages++;
      reportLines.push(`[PAGINA ${i + 1}] -> IDENTICA (Sin cambios detectados en el texto)`);
    } else {
      modifiedPages++;
      reportLines.push(`[PAGINA ${i + 1}] -> DIFERENCIAS DETECTADAS:`);
      const linesA = new Set(pA.split('\n').map((s) => s.trim()).filter(Boolean));
      const linesB = new Set(pB.split('\n').map((s) => s.trim()).filter(Boolean));

      for (const l of linesA) {
        if (!linesB.has(l)) {
          reportLines.push(`   - ELIMINADO EN B: ${l}`);
        }
      }
      for (const l of linesB) {
        if (!linesA.has(l)) {
          reportLines.push(`   + AGREGADO EN B:  ${l}`);
        }
      }
    }
    reportLines.push('');
  }

  reportLines.unshift(
    `RESUMEN: ${identicalPages} paginas identicas | ${modifiedPages} paginas con cambios.`,
    ''
  );

  const fullText = reportLines.join('\n');
  const reportPdfBytes = await renderCleanTextDocumentToPdf(
    `Reporte de Comparacion PDF - Remb PDF`,
    fullText
  );

  return {
    reportPdfBytes,
    diffSummaryText: fullText
  };
}

// ============================================================================
// 16. OCR PDF LOCAL (Con Tesseract.js en Español e Inglés)
// ============================================================================
export async function runLocalOcrOnFile(
  file: LoadedFileItem,
  lang: 'spa' | 'eng' | 'spa+eng',
  maxPagesToOcr: number,
  onProgress?: (msg: string) => void
): Promise<{ pdfBytes: Uint8Array; recognizedText: string }> {
  const Tesseract = await getTesseract();
  const pdfjsLib = await getPdfJs();
  const isPdf =
    file.mimeType === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  const collectedText: string[] = [];

  if (isPdf) {
    const loadingTask = pdfjsLib.getDocument({ data: file.bytes.slice(0) });
    const pdfProxy = await loadingTask.promise;
    const limit = Math.min(pdfProxy.numPages, maxPagesToOcr);

    for (let p = 1; p <= limit; p++) {
      onProgress?.(`Ejecutando OCR en página ${p} de ${limit} (${lang})...`);
      const rendered = await renderPdfPageToDataUrl(pdfProxy, p, 1.8, 'image/png', 0.92);
      const res = await Tesseract.recognize(rendered.dataUrl, lang);
      collectedText.push(`=== PÁGINA ${p} ===\n${res.data.text.trim()}`);
    }
  } else {
    onProgress?.(`Ejecutando reconocimiento óptico de caracteres (${lang})...`);
    const res = await Tesseract.recognize(file.previewDataUrl!, lang);
    collectedText.push(res.data.text.trim());
  }

  const finalTxt = collectedText.join('\n\n');
  const pdfBytes = await renderCleanTextDocumentToPdf(
    `Documento OCR Reconocido - ${file.name}`,
    finalTxt || 'No se detectaron caracteres legibles en la imagen.'
  );

  return {
    pdfBytes,
    recognizedText: finalTxt
  };
}

// Parsea expresiones como "1, 3, 5-8" a un arreglo de números 1-based
export function parsePageRanges(input: string, maxPages: number): number[] {
  const picked = new Set<number>();
  const parts = input
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  for (const part of parts) {
    if (part.includes('-')) {
      const [aStr, bStr] = part.split('-');
      const a = parseInt(aStr, 10);
      const b = parseInt(bStr, 10);
      if (!isNaN(a) && !isNaN(b)) {
        const start = Math.max(1, Math.min(a, b));
        const end = Math.min(maxPages, Math.max(a, b));
        for (let i = start; i <= end; i++) picked.add(i);
      }
    } else {
      const n = parseInt(part, 10);
      if (!isNaN(n) && n >= 1 && n <= maxPages) {
        picked.add(n);
      }
    }
  }
  return Array.from(picked).sort((a, b) => a - b);
}
