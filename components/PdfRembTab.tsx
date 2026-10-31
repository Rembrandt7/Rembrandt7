import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  ArrowDownAZ,
  ArrowLeft,
  ArrowRight,
  ArrowUpZA,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  Eye,
  FilePlus2,
  FileText,
  Grid,
  History,
  Layers,
  Moon,
  Plus,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Search,
  Shield,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  X,
  Zap
} from 'lucide-react';
import {
  CATEGORY_LABELS,
  PDF_TOOLS,
  PdfToolDefinition,
  ToolCategory,
  ToolId
} from './pdf-remb/toolsCatalog';
import {
  LoadedFileItem,
  NineGridPosition,
  PageDescriptor,
  SplitRangeItem,
  StashedResult,
  addPageNumbersToPdf,
  addWatermarkToPdf,
  buildPdfFromPageDescriptors,
  compareTwoPdfDocuments,
  compressPdfDocument,
  convertImagesToPdf,
  convertOfficeOrTextToPdf,
  convertPdfToExcelXlsx,
  convertPdfToImages,
  convertPdfToWordDocx,
  cropAndAnnotatePdf,
  extractStructuredTextFromPdf,
  formatBytes,
  generateDemoPdfFile,
  inspectAndRenderFile,
  parsePageRanges,
  renderCleanTextDocumentToPdf,
  repairPdfDocument,
  runLocalOcrOnFile,
  signPdfDocument,
  splitPdfDocument,
  stashOutputFile,
  updateMetadataAndProtectPdf
} from './pdf-remb/pdfEngine';
import { ToolIcon } from './pdf-remb/ToolIcon';
import { PositionGridPicker } from './pdf-remb/PositionGridPicker';
import { SignaturePadBox } from './pdf-remb/SignaturePadBox';
import './pdf-remb/PdfRembSuite.css';

interface SessionHistoryEntry {
  result: StashedResult;
  toolTitle: string;
  timestamp: string;
}

export interface PdfRembTabProps {
  initialFiles?: File[];
  initialToolId?: ToolId | null;
}

export const PdfRembTab: React.FC<PdfRembTabProps> = ({
  initialFiles,
  initialToolId = null
}) => {
  // ================= ESTADO GLOBAL DE NAVEGACIÓN =================
  const [selectedToolId, setSelectedToolId] = useState<ToolId | null>(initialToolId);
  const [activeCategory, setActiveCategory] = useState<ToolCategory>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAllMenu, setShowAllMenu] = useState<boolean>(false);
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [historyList, setHistoryList] = useState<SessionHistoryEntry[]>([]);

  // ================= ESTADO DE ARCHIVOS Y PÁGINAS CARGADAS =================
  const [files, setFiles] = useState<LoadedFileItem[]>([]);
  const [pages, setPages] = useState<PageDescriptor[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<StashedResult | null>(null);
  const [viewMode, setViewMode] = useState<'pages' | 'files'>('pages');
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const watermarkImageInputRef = useRef<HTMLInputElement | null>(null);
  const dragPageIdxRef = useRef<number | null>(null);

  // ================= OPCIONES ESPECÍFICAS POR HERRAMIENTA =================
  // Dividir PDF
  const [splitMode, setSplitMode] = useState<'ranges' | 'fixed' | 'all-pages'>('ranges');
  const [splitRanges, setSplitRanges] = useState<SplitRangeItem[]>([{ from: 1, to: 1 }]);
  const [splitFixedStep, setSplitFixedStep] = useState<number>(1);
  const [splitMergeRanges, setSplitMergeRanges] = useState<boolean>(false);

  // Eliminar / Extraer páginas por texto (ej. "1, 3-5")
  const [rangeInputText, setRangeInputText] = useState<string>('');
  const [extractMergeIntoOne, setExtractMergeIntoOne] = useState<boolean>(true);

  // Comprimir PDF
  const [compressLevel, setCompressLevel] = useState<'extreme' | 'recommended' | 'low'>(
    'recommended'
  );

  // Números de página
  const [pageNumPosition, setPageNumPosition] = useState<NineGridPosition>('bottom-right');
  const [pageNumMargin, setPageNumMargin] = useState<number>(28);
  const [pageNumFirst, setPageNumFirst] = useState<number>(1);
  const [pageNumFrom, setPageNumFrom] = useState<number>(1);
  const [pageNumTo, setPageNumTo] = useState<number>(1);
  const [pageNumFormat, setPageNumFormat] = useState<'page-n-of-m' | 'page-n' | 'simple'>(
    'page-n-of-m'
  );
  const [pageNumFontSize, setPageNumFontSize] = useState<number>(11);
  const [pageNumColor, setPageNumColor] = useState<string>('#1E293B');

  // Marca de agua
  const [wmMode, setWmMode] = useState<'text' | 'image'>('text');
  const [wmText, setWmText] = useState<string>('CONFIDENCIAL');
  const [wmPosition, setWmPosition] = useState<NineGridPosition>('center');
  const [wmMosaic, setWmMosaic] = useState<boolean>(false);
  const [wmOpacity, setWmOpacity] = useState<number>(0.28);
  const [wmRotation, setWmRotation] = useState<number>(45);
  const [wmFontSize, setWmFontSize] = useState<number>(46);
  const [wmColor, setWmColor] = useState<string>('#E5322D');
  const [wmImageBytes, setWmImageBytes] = useState<Uint8Array | undefined>(undefined);
  const [wmImageMime, setWmImageMime] = useState<string | undefined>(undefined);
  const [wmImageName, setWmImageName] = useState<string>('');

  // JPG a PDF
  const [jpgOrientation, setJpgOrientation] = useState<'auto' | 'portrait' | 'landscape'>('auto');
  const [jpgPageSize, setJpgPageSize] = useState<'a4' | 'letter' | 'fit'>('a4');
  const [jpgMargin, setJpgMargin] = useState<'none' | 'small' | 'big'>('small');

  // PDF a JPG / PNG
  const [pdfToImgFormat, setPdfToImgFormat] = useState<'jpeg' | 'png'>('jpeg');
  const [pdfToImgDpi, setPdfToImgDpi] = useState<150 | 300>(150);

  // Firmar PDF
  const [sigDataUrl, setSigDataUrl] = useState<string>('');
  const [sigName, setSigName] = useState<string>('Autorizado Remb');
  const [sigIncludeDate, setSigIncludeDate] = useState<boolean>(true);
  const [sigTargetPages, setSigTargetPages] = useState<'last' | 'first' | 'all' | 'custom'>('last');
  const [sigCustomPage, setSigCustomPage] = useState<number>(1);
  const [sigPosition, setSigPosition] = useState<NineGridPosition>('bottom-right');
  const [sigWidth, setSigWidth] = useState<number>(165);

  // OCR PDF
  const [ocrLang, setOcrLang] = useState<'spa' | 'eng' | 'spa+eng'>('spa+eng');
  const [ocrMaxPages, setOcrMaxPages] = useState<number>(5);

  // Recortar / Editar PDF
  const [cropTop, setCropTop] = useState<number>(0);
  const [cropBottom, setCropBottom] = useState<number>(0);
  const [cropLeft, setCropLeft] = useState<number>(0);
  const [cropRight, setCropRight] = useState<number>(0);
  const [editStampText, setEditStampText] = useState<string>('');
  const [redactHeaders, setRedactHeaders] = useState<boolean>(false);

  // Proteger y Metadatos
  const [metaTitle, setMetaTitle] = useState<string>('');
  const [metaAuthor, setMetaAuthor] = useState<string>('');
  const [metaSubject, setMetaSubject] = useState<string>('');
  const [metaKeywords, setMetaKeywords] = useState<string>('');
  const [stripAllMeta, setStripAllMeta] = useState<boolean>(false);
  const [securityBanner, setSecurityBanner] = useState<string>('');

  // HTML / Texto directo
  const [directTextContent, setDirectTextContent] = useState<string>('');

  const activeTool: PdfToolDefinition | null = useMemo(
    () => PDF_TOOLS.find((t) => t.id === selectedToolId) || null,
    [selectedToolId]
  );

  const filteredTools = useMemo(() => {
    return PDF_TOOLS.filter((tool) => {
      const matchesCat = activeCategory === 'all' || tool.category === activeCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchesQuery =
        !q ||
        tool.title.toLowerCase().includes(q) ||
        tool.description.toLowerCase().includes(q) ||
        tool.shortTitle.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  }, [activeCategory, searchQuery]);

  const selectTool = (toolId: ToolId, keepCurrentFiles: boolean = false) => {
    setSelectedToolId(toolId);
    setShowAllMenu(false);
    setErrorMessage(null);
    setResult(null);
    if (!keepCurrentFiles) {
      setFiles([]);
      setPages([]);
      setRangeInputText('');
    }
    if (toolId === 'merge-pdf' || toolId === 'compare-pdf') {
      setViewMode('files');
    } else {
      setViewMode('pages');
    }
  };

  const resetToHome = () => {
    setSelectedToolId(null);
    setFiles([]);
    setPages([]);
    setResult(null);
    setErrorMessage(null);
    setShowAllMenu(false);
  };

  const handleFilesSelected = async (incomingList: FileList | File[]) => {
    const arr = Array.from(incomingList);
    if (arr.length === 0) return;

    setIsLoadingFiles(true);
    setErrorMessage(null);
    setResult(null);

    try {
      const loadedItems: LoadedFileItem[] = [];
      const loadedPages: PageDescriptor[] = [];

      for (const f of arr) {
        const { item, pages: filePages } = await inspectAndRenderFile(f, true, 120);
        loadedItems.push(item);
        loadedPages.push(...filePages);
      }

      setFiles((prev) => {
        const next = activeTool && !activeTool.multiple ? [loadedItems[0]] : [...prev, ...loadedItems];
        return next;
      });

      setPages((prev) => {
        const next = activeTool && !activeTool.multiple ? loadedPages : [...prev, ...loadedPages];
        if (next.length > 0) {
          setPageNumTo(next.length);
          setSplitRanges([{ from: 1, to: next.length }]);
        }
        return next;
      });
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'No se pudo leer uno de los archivos seleccionados.'
      );
    } finally {
      setIsLoadingFiles(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    if (initialFiles && initialFiles.length > 0) {
      if (!selectedToolId) {
        setSelectedToolId(initialFiles.length > 1 ? 'merge-pdf' : 'organize-pdf');
      }
      handleFilesSelected(initialFiles);
    }
  }, [initialFiles]);

  // Generar un PDF de demostración de 4 páginas en un clic para probar cualquier herramienta al instante
  const loadDemoPdf = async () => {
    setIsLoadingFiles(true);
    setErrorMessage(null);
    try {
      const demoFile = await generateDemoPdfFile();
      await handleFilesSelected([demoFile]);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'No se pudo generar el PDF de demostración.'
      );
    } finally {
      setIsLoadingFiles(false);
    }
  };

  // ================= ACCIONES DE PÁGINAS Y ARCHIVOS EN MESA DE TRABAJO =================
  const rotateSinglePage = (uid: string, delta: number) => {
    setPages((prev) =>
      prev.map((p) => (p.uid === uid ? { ...p, rotation: (p.rotation + delta + 360) % 360 } : p))
    );
  };

  const rotateAllPages = (delta: number, filter: 'all' | 'even' | 'odd' = 'all') => {
    setPages((prev) =>
      prev.map((p, idx) => {
        if (filter === 'even' && (idx + 1) % 2 !== 0) return p;
        if (filter === 'odd' && (idx + 1) % 2 === 0) return p;
        return { ...p, rotation: (p.rotation + delta + 360) % 360 };
      })
    );
  };

  const togglePageAction = (uid: string) => {
    if (selectedToolId === 'remove-pages') {
      setPages((prev) => prev.map((p) => (p.uid === uid ? { ...p, deleted: !p.deleted } : p)));
    } else if (selectedToolId === 'extract-pages') {
      setPages((prev) => prev.map((p) => (p.uid === uid ? { ...p, selected: !p.selected } : p)));
    }
  };

  const deletePageFromList = (uid: string) => {
    setPages((prev) => prev.filter((p) => p.uid !== uid));
  };

  const duplicatePageInList = (index: number) => {
    setPages((prev) => {
      const target = prev[index];
      if (!target) return prev;
      const copy: PageDescriptor = {
        ...target,
        uid: `${target.uid}_copy_${Math.random().toString(36).slice(2, 6)}`
      };
      const next = [...prev];
      next.splice(index + 1, 0, copy);
      return next;
    });
  };

  const insertBlankPageAfter = (index: number) => {
    setPages((prev) => {
      const refPage = prev[index];
      const blank: PageDescriptor = {
        uid: `blank_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        fileId: refPage?.fileId || 'blank',
        fileName: 'Página en blanco',
        sourcePageIndex: -1,
        pageNumberLabel: 0,
        rotation: 0,
        selected: false,
        deleted: false,
        isBlank: true,
        width: refPage?.width || 595.28,
        height: refPage?.height || 841.89
      };
      const next = [...prev];
      next.splice(index + 1, 0, blank);
      return next;
    });
  };

  const movePage = (index: number, direction: -1 | 1) => {
    setPages((prev) => {
      const targetIdx = index + direction;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(targetIdx, 0, moved);
      return next;
    });
  };

  const reversePagesOrder = () => {
    setPages((prev) => [...prev].reverse());
  };

  const sortFilesByName = (asc: boolean) => {
    setFiles((prev) => {
      const sorted = [...prev].sort((a, b) =>
        asc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
      );
      const orderMap = new Map(sorted.map((f, idx) => [f.id, idx]));
      setPages((pPrev) =>
        [...pPrev].sort((a, b) => ((orderMap.get(a.fileId) ?? 0) as number) - ((orderMap.get(b.fileId) ?? 0) as number))
      );
      return sorted;
    });
  };

  const removeFileById = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    setPages((prev) => prev.filter((p) => p.fileId !== fileId));
  };

  const applyRangeTextToPages = (text: string) => {
    setRangeInputText(text);
    const nums = new Set(parsePageRanges(text, pages.length));
    if (selectedToolId === 'remove-pages') {
      setPages((prev) => prev.map((p, idx) => ({ ...p, deleted: nums.has(idx + 1) })));
    } else if (selectedToolId === 'extract-pages') {
      setPages((prev) => prev.map((p, idx) => ({ ...p, selected: nums.has(idx + 1) })));
    }
  };

  // ================= EJECUCIÓN PRINCIPAL DE LA HERRAMIENTA ACTIVA =================
  const executeActiveTool = async () => {
    if (!activeTool) return;
    if (files.length === 0 && !(activeTool.id === 'html-to-pdf' && directTextContent.trim())) {
      setErrorMessage('Por favor selecciona al menos un archivo para procesar.');
      return;
    }

    setIsProcessing(true);
    setProgressMessage('Procesando documento localmente...');
    setErrorMessage(null);

    try {
      const primaryFile = files[0];
      const baseName = primaryFile
        ? primaryFile.name.replace(/\.[^.]+$/, '')
        : 'Documento_Remb';
      const totalOriginalBytes = files.reduce((acc, f) => acc + f.size, 0);

      let stashed: StashedResult | null = null;

      switch (activeTool.id) {
        case 'merge-pdf':
        case 'organize-pdf':
        case 'rotate-pdf': {
          const outBytes = await buildPdfFromPageDescriptors(files, pages);
          const suffix =
            activeTool.id === 'merge-pdf'
              ? 'unido'
              : activeTool.id === 'rotate-pdf'
                ? 'rotado'
                : 'ordenado';
          stashed = await stashOutputFile(outBytes, `${baseName}_${suffix}.pdf`, 'application/pdf', {
            summaryText: `Documento generado con éxito (${pages.filter((p) => !p.deleted).length} páginas).`,
            originalBytesTotal: totalOriginalBytes
          });
          break;
        }

        case 'remove-pages': {
          const remaining = pages.filter((p) => !p.deleted);
          if (remaining.length === 0) {
            throw new Error(
              'Has marcado todas las páginas para eliminar. Deja al menos 1 página activa.'
            );
          }
          const outBytes = await buildPdfFromPageDescriptors(files, remaining);
          stashed = await stashOutputFile(
            outBytes,
            `${baseName}_sin_paginas.pdf`,
            'application/pdf',
            {
              summaryText: `Se eliminaron ${pages.length - remaining.length} páginas. El nuevo PDF tiene ${remaining.length} páginas.`,
              originalBytesTotal: totalOriginalBytes
            }
          );
          break;
        }

        case 'extract-pages': {
          const chosen = pages.filter((p) => p.selected);
          const targetPages = chosen.length > 0 ? chosen : pages;
          if (extractMergeIntoOne || targetPages.length === 1) {
            const outBytes = await buildPdfFromPageDescriptors(files, targetPages);
            stashed = await stashOutputFile(
              outBytes,
              `${baseName}_extraido.pdf`,
              'application/pdf',
              {
                summaryText: `Se extrajeron ${targetPages.length} páginas en un nuevo documento PDF.`,
                originalBytesTotal: totalOriginalBytes
              }
            );
          } else {
            const rangeGroups = targetPages.map((p) => ({
              from: p.sourcePageIndex + 1,
              to: p.sourcePageIndex + 1
            }));
            const splitRes = await splitPdfDocument(
              primaryFile,
              'ranges',
              rangeGroups,
              1,
              false
            );
            stashed = await stashOutputFile(splitRes.bytes, splitRes.filename, splitRes.mimeType, {
              summaryText: splitRes.summary
            });
          }
          break;
        }

        case 'split-pdf': {
          const splitRes = await splitPdfDocument(
            primaryFile,
            splitMode,
            splitRanges,
            splitFixedStep,
            splitMergeRanges
          );
          stashed = await stashOutputFile(splitRes.bytes, splitRes.filename, splitRes.mimeType, {
            summaryText: splitRes.summary,
            originalBytesTotal: totalOriginalBytes
          });
          break;
        }

        case 'compress-pdf': {
          const compRes = await compressPdfDocument(
            primaryFile,
            compressLevel,
            (msg) => setProgressMessage(msg)
          );
          stashed = await stashOutputFile(
            compRes.bytes,
            `${baseName}_comprimido.pdf`,
            'application/pdf',
            {
              summaryText: compRes.summary,
              originalBytesTotal: primaryFile.size
            }
          );
          break;
        }

        case 'repair-pdf': {
          const rep = await repairPdfDocument(primaryFile);
          stashed = await stashOutputFile(
            rep.bytes,
            `${baseName}_reparado.pdf`,
            'application/pdf',
            {
              summaryText: `Estructura XRef reconstruida y ${rep.pageCount} páginas verificadas limpiamente.`,
              originalBytesTotal: primaryFile.size
            }
          );
          break;
        }

        case 'ocr-pdf': {
          const ocrRes = await runLocalOcrOnFile(
            primaryFile,
            ocrLang,
            ocrMaxPages,
            (msg) => setProgressMessage(msg)
          );
          stashed = await stashOutputFile(
            ocrRes.pdfBytes,
            `${baseName}_OCR.pdf`,
            'application/pdf',
            {
              summaryText: `OCR completado localmente (${ocrLang}). Puedes descargar el PDF o copiar el texto reconocido.`,
              extraTextPreview: ocrRes.recognizedText
            }
          );
          break;
        }

        case 'jpg-to-pdf': {
          const pdfBytes = await convertImagesToPdf(files, {
            orientation: jpgOrientation,
            pageSize: jpgPageSize,
            margin: jpgMargin
          });
          stashed = await stashOutputFile(
            pdfBytes,
            `${baseName}_imagenes.pdf`,
            'application/pdf',
            {
              summaryText: `Se convirtieron ${files.length} imágenes en un documento PDF.`,
              originalBytesTotal: totalOriginalBytes
            }
          );
          break;
        }

        case 'word-to-pdf':
        case 'powerpoint-to-pdf':
        case 'excel-to-pdf': {
          setProgressMessage('Convirtiendo documento Office a PDF localmente...');
          const conv = await convertOfficeOrTextToPdf(primaryFile);
          stashed = await stashOutputFile(conv.bytes, `${baseName}.pdf`, 'application/pdf', {
            summaryText: `Convertido exitosamente con ${conv.engineUsed}.`,
            originalBytesTotal: primaryFile.size
          });
          break;
        }

        case 'html-to-pdf': {
          let bytes: Uint8Array;
          if (directTextContent.trim()) {
            bytes = await renderCleanTextDocumentToPdf(
              'Documento HTML / Texto - Remb PDF',
              directTextContent
            );
          } else {
            const conv = await convertOfficeOrTextToPdf(primaryFile);
            bytes = conv.bytes;
          }
          stashed = await stashOutputFile(bytes, `${baseName}.pdf`, 'application/pdf', {
            summaryText: 'Contenido convertido y paginado a PDF correctamente.'
          });
          break;
        }

        case 'pdf-to-jpg': {
          const imgRes = await convertPdfToImages(
            primaryFile,
            pdfToImgFormat,
            pdfToImgDpi,
            (msg) => setProgressMessage(msg)
          );
          stashed = await stashOutputFile(imgRes.bytes, imgRes.filename, imgRes.mimeType, {
            summaryText: imgRes.summary
          });
          break;
        }

        case 'pdf-to-word': {
          setProgressMessage('Extrayendo párrafos y construyendo documento Word (.docx)...');
          const docxRes = await convertPdfToWordDocx(primaryFile);
          stashed = await stashOutputFile(
            docxRes.bytes,
            `${baseName}.docx`,
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            {
              summaryText: 'Archivo Microsoft Word (.docx) generado correctamente.',
              extraTextPreview: docxRes.previewText
            }
          );
          break;
        }

        case 'pdf-to-excel': {
          setProgressMessage('Detectando filas y columnas para libro Excel (.xlsx)...');
          const xlsxRes = await convertPdfToExcelXlsx(primaryFile);
          stashed = await stashOutputFile(
            xlsxRes.bytes,
            `${baseName}.xlsx`,
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            {
              summaryText: 'Libro Microsoft Excel (.xlsx) generado con éxito.',
              extraTextPreview: xlsxRes.previewText
            }
          );
          break;
        }

        case 'pdf-to-text': {
          const extracted = await extractStructuredTextFromPdf(primaryFile.bytes);
          const fullText = extracted
            .map((p) => `=== PÁGINA ${p.pageNumber} ===\n${p.rawText}`)
            .join('\n\n');
          const enc = new TextEncoder();
          const txtBytes = enc.encode(fullText);
          stashed = await stashOutputFile(txtBytes, `${baseName}.txt`, 'text/plain; charset=utf-8', {
            summaryText: `Texto extraído de ${extracted.length} páginas.`,
            extraTextPreview: fullText
          });
          break;
        }

        case 'page-numbers': {
          const numberedBytes = await addPageNumbersToPdf(primaryFile, {
            position: pageNumPosition,
            marginPts: pageNumMargin,
            firstNumber: pageNumFirst,
            fromPage: pageNumFrom,
            toPage: pageNumTo,
            formatTemplate: pageNumFormat,
            fontSize: pageNumFontSize,
            colorHex: pageNumColor
          });
          stashed = await stashOutputFile(
            numberedBytes,
            `${baseName}_numerado.pdf`,
            'application/pdf',
            {
              summaryText: 'Numeración de páginas insertada correctamente en el PDF.'
            }
          );
          break;
        }

        case 'watermark-pdf': {
          const wmBytes = await addWatermarkToPdf(primaryFile, {
            mode: wmMode,
            text: wmText,
            imageBytes: wmImageBytes,
            imageMime: wmImageMime,
            position: wmPosition,
            mosaic: wmMosaic,
            opacity: wmOpacity,
            rotationDeg: wmRotation,
            fontSize: wmFontSize,
            colorHex: wmColor
          });
          stashed = await stashOutputFile(
            wmBytes,
            `${baseName}_marca_agua.pdf`,
            'application/pdf',
            {
              summaryText: 'Marca de agua estampada en todas las páginas del documento.'
            }
          );
          break;
        }

        case 'crop-edit-pdf': {
          const editedBytes = await cropAndAnnotatePdf(primaryFile, {
            cropTopPts: cropTop,
            cropBottomPts: cropBottom,
            cropLeftPts: cropLeft,
            cropRightPts: cropRight,
            stampText: editStampText,
            redactHeaderFooter: redactHeaders
          });
          stashed = await stashOutputFile(
            editedBytes,
            `${baseName}_editado.pdf`,
            'application/pdf',
            {
              summaryText: 'Recorte de márgenes y anotaciones aplicados al PDF.'
            }
          );
          break;
        }

        case 'sign-pdf': {
          if (!sigDataUrl) {
            throw new Error('Dibuja, escribe o sube tu firma antes de firmar el PDF.');
          }
          const signedBytes = await signPdfDocument(primaryFile, {
            signaturePngDataUrl: sigDataUrl,
            signerName: sigName,
            includeDate: sigIncludeDate,
            targetPages: sigTargetPages,
            customPageNumber: sigCustomPage,
            position: sigPosition,
            widthPts: sigWidth
          });
          stashed = await stashOutputFile(
            signedBytes,
            `${baseName}_firmado.pdf`,
            'application/pdf',
            {
              summaryText: 'Documento firmado digitalmente con rúbrica visual.'
            }
          );
          break;
        }

        case 'protect-metadata-pdf': {
          const protectedBytes = await updateMetadataAndProtectPdf(primaryFile, {
            title: metaTitle,
            author: metaAuthor,
            subject: metaSubject,
            keywords: metaKeywords,
            stripAllMetadata: stripAllMeta,
            securityBanner
          });
          stashed = await stashOutputFile(
            protectedBytes,
            `${baseName}_seguro.pdf`,
            'application/pdf',
            {
              summaryText: stripAllMeta
                ? 'Metadatos ocultos eliminados y documento sanitizado.'
                : 'Metadatos y cintillo de seguridad actualizados.'
            }
          );
          break;
        }

        case 'compare-pdf': {
          if (files.length < 2) {
            throw new Error('Selecciona al menos 2 archivos PDF para compararlos.');
          }
          const cmp = await compareTwoPdfDocuments(files[0], files[1]);
          stashed = await stashOutputFile(
            cmp.reportPdfBytes,
            `Comparacion_${baseName}.pdf`,
            'application/pdf',
            {
              summaryText: `Comparación completada entre "${files[0].name}" y "${files[1].name}".`,
              extraTextPreview: cmp.diffSummaryText
            }
          );
          break;
        }
      }

      if (stashed) {
        setResult(stashed);
        setHistoryList((prev) => [
          {
            result: stashed!,
            toolTitle: activeTool.title,
            timestamp: new Date().toLocaleTimeString('es-MX', {
              hour: '2-digit',
              minute: '2-digit'
            })
          },
          ...prev
        ]);
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Ocurrió un error al procesar el documento.'
      );
    } finally {
      setIsProcessing(false);
      setProgressMessage('');
    }
  };

  // Encadenar el PDF recién generado hacia otra herramienta sin volver a subirlo
  const continueWithResultInTool = async (nextToolId: ToolId) => {
    if (!result?.rawBytes) return;
    const nextFile = new File([result.rawBytes as unknown as BlobPart], result.filename, {
      type: 'application/pdf'
    });
    selectTool(nextToolId, false);
    await handleFilesSelected([nextFile]);
  };

  const handleWatermarkImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const buf = await f.arrayBuffer();
    setWmImageBytes(new Uint8Array(buf));
    setWmImageMime(f.type || 'image/png');
    setWmImageName(f.name);
  };

  return (
    <div className={`remb-app w-full max-w-screen-2xl mx-auto mt-2 sm:mt-4 ${darkMode ? 'theme-dark' : 'theme-light'}`}>
      {/* ================= BARRA DE NAVEGACIÓN SUPERIOR ESTILO ILOVEPDF ================= */}
      <header className="remb-navbar">
        <div className="remb-navbar-left">
          <button type="button" className="remb-brand" onClick={resetToHome}>
            <span className="remb-brand-word">Remb</span>
            <span className="remb-brand-heart" aria-hidden="true">
              ❤️
            </span>
            <span className="remb-brand-pdf">PDF</span>
            <span className="remb-brand-tag">LOCAL 2.0</span>
          </button>

          <nav className="remb-nav-links">
            <button
              type="button"
              className={`remb-nav-item ${selectedToolId === 'merge-pdf' ? 'active' : ''}`}
              onClick={() => selectTool('merge-pdf')}
            >
              UNIR PDF
            </button>
            <button
              type="button"
              className={`remb-nav-item ${selectedToolId === 'split-pdf' ? 'active' : ''}`}
              onClick={() => selectTool('split-pdf')}
            >
              DIVIDIR PDF
            </button>
            <button
              type="button"
              className={`remb-nav-item ${selectedToolId === 'compress-pdf' ? 'active' : ''}`}
              onClick={() => selectTool('compress-pdf')}
            >
              COMPRIMIR PDF
            </button>
            <button
              type="button"
              className={`remb-nav-item ${selectedToolId === 'pdf-to-word' ? 'active' : ''}`}
              onClick={() => selectTool('pdf-to-word')}
            >
              PDF A WORD
            </button>
            <button
              type="button"
              className={`remb-nav-item ${showAllMenu ? 'active' : ''}`}
              onClick={() => setShowAllMenu((v) => !v)}
            >
              TODAS LAS HERRAMIENTAS PDF <ChevronDown size={15} />
            </button>
          </nav>
        </div>

        <div className="remb-navbar-right">
          <div className="remb-local-pill" title="Tus archivos jamás salen de tu computadora">
            <Shield size={14} />
            <span>100% Local · Sin Límites</span>
          </div>

          <button
            type="button"
            className="remb-icon-btn"
            onClick={() => setShowHistoryModal(true)}
            title="Archivos procesados en esta sesión"
          >
            <History size={18} />
            {historyList.length > 0 && <span className="remb-badge-count">{historyList.length}</span>}
          </button>

          <button
            type="button"
            className="remb-icon-btn"
            onClick={() => setDarkMode((d) => !d)}
            title={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      {/* ================= MEGA-MENÚ DESPLEGABLE "TODAS LAS HERRAMIENTAS PDF" ================= */}
      {showAllMenu && (
        <div className="remb-megamenu-overlay" onClick={() => setShowAllMenu(false)}>
          <div className="remb-megamenu" onClick={(e) => e.stopPropagation()}>
            {CATEGORY_LABELS.filter((c) => c.id !== 'all').map((cat) => (
              <div key={cat.id} className="remb-megamenu-col">
                <h4>{cat.label.toUpperCase()}</h4>
                <ul>
                  {PDF_TOOLS.filter((t) => t.category === cat.id).map((tool) => (
                    <li key={tool.id}>
                      <button type="button" onClick={() => selectTool(tool.id)}>
                        <span
                          className="mega-icon-wrap"
                          style={{ backgroundColor: tool.bgTint, color: tool.color }}
                        >
                          <ToolIcon name={tool.iconName} size={16} color={tool.color} />
                        </span>
                        <span>{tool.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= VISTA 1: CATÁLOGO PRINCIPAL ESTILO ILOVEPDF.COM/ES ================= */}
      {!activeTool && (
        <main className="remb-home">
          <section className="remb-hero">
            <h1>Todas las herramientas que necesitas para trabajar con PDFs</h1>
            <p>
              Une, divide, comprime, convierte, rota, desbloquea y firma tus PDFs 100% local, privado y sin límites con un solo clic.
            </p>

            {/* Barra alineada: Pastillas de Categoría a la izquierda + Buscador al final a la derecha */}
            <div className="remb-filter-bar">
              <div className="remb-category-pills">
                {CATEGORY_LABELS.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    className={`remb-cat-pill ${activeCategory === cat.id ? 'active' : ''}`}
                    onClick={() => setActiveCategory(cat.id)}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="remb-search-bar">
                <Search size={17} className="remb-search-icon" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar herramienta (unir, word, firmar...)"
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="remb-clear-search"
                    onClick={() => setSearchQuery('')}
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Grid de las 24 herramientas (5 columnas) */}
          <section className="remb-tools-grid">
            {filteredTools.map((tool) => (
              <div
                key={tool.id}
                role="button"
                tabIndex={0}
                className="remb-tool-card"
                onClick={() => selectTool(tool.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') selectTool(tool.id);
                }}
              >
                {tool.badge && (
                  <span
                    className="remb-tool-badge"
                    style={{ backgroundColor: tool.bgTint, color: tool.color }}
                  >
                    {tool.badge}
                  </span>
                )}
                <div
                  className="remb-tool-icon-box"
                  style={{ backgroundColor: tool.bgTint, color: tool.color }}
                >
                  <ToolIcon name={tool.iconName} size={28} color={tool.color} />
                </div>
                <h3>{tool.title}</h3>
                <p>{tool.description}</p>
              </div>
            ))}
          </section>
        </main>
      )}

      {/* ================= VISTA 2: WORKSPACE DE LA HERRAMIENTA SELECCIONADA ================= */}
      {activeTool && (
        <main
          className={`remb-workspace ${isDraggingOver ? 'dragging-over' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDraggingOver(true);
          }}
          onDragLeave={() => setIsDraggingOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDraggingOver(false);
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              handleFilesSelected(e.dataTransfer.files);
            }
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={activeTool.accept}
            multiple={activeTool.multiple}
            hidden
            onChange={(e) => {
              if (e.target.files) handleFilesSelected(e.target.files);
            }}
          />

          {/* Subheader con regreso al catálogo */}
          <div className="remb-workspace-topbar">
            <button type="button" className="remb-back-btn" onClick={resetToHome}>
              <ArrowLeft size={16} /> Volver a todas las herramientas
            </button>
            <div className="remb-workspace-title-chip">
              <span
                className="chip-dot"
                style={{ backgroundColor: activeTool.color }}
              />
              <strong>{activeTool.title}</strong>
            </div>
            {files.length > 0 && !result && (
              <button
                type="button"
                className="remb-reset-files-btn"
                onClick={() => {
                  setFiles([]);
                  setPages([]);
                  setResult(null);
                  setErrorMessage(null);
                }}
              >
                <Trash2 size={14} /> Vaciar mesa de trabajo
              </button>
            )}
          </div>

          {errorMessage && (
            <div className="remb-alert-error">
              <span>⚠️ {errorMessage}</span>
              <button type="button" onClick={() => setErrorMessage(null)}>
                <X size={15} />
              </button>
            </div>
          )}

          {/* PASO 1: PANTALLA DE SELECCIÓN DE ARCHIVOS (DROPZONE GIGANTE) */}
          {files.length === 0 && !result && (
            <div className="remb-dropzone-stage">
              <div
                className="remb-dropzone-icon"
                style={{ backgroundColor: activeTool.bgTint, color: activeTool.color }}
              >
                <ToolIcon name={activeTool.iconName} size={44} color={activeTool.color} />
              </div>
              <h2>{activeTool.title}</h2>
              <p className="remb-dropzone-desc">{activeTool.description}</p>

              <button
                type="button"
                className="remb-giant-select-btn"
                style={{ backgroundColor: activeTool.color }}
                disabled={isLoadingFiles}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={22} />
                <span>{isLoadingFiles ? 'Cargando archivos...' : activeTool.acceptLabel}</span>
              </button>

              <span className="remb-drop-hint">o arrastra y suelta tus archivos aquí</span>

              {activeTool.accept.includes('.pdf') && (
                <button
                  type="button"
                  className="remb-demo-btn"
                  onClick={loadDemoPdf}
                  disabled={isLoadingFiles}
                >
                  <Sparkles size={15} /> Probar ahora con un PDF de demostración (4 páginas)
                </button>
              )}

              {activeTool.id === 'html-to-pdf' && (
                <div className="remb-direct-html-box">
                  <label>O escribe / pega tu contenido HTML, Markdown o texto directamente:</label>
                  <textarea
                    rows={6}
                    className="remb-textarea"
                    value={directTextContent}
                    onChange={(e) => setDirectTextContent(e.target.value)}
                    placeholder="Escribe o pega aquí tu texto o código HTML para convertirlo directamente a PDF..."
                  />
                  {directTextContent.trim() && (
                    <button
                      type="button"
                      className="remb-action-submit-btn"
                      style={{ backgroundColor: activeTool.color, marginTop: '12px' }}
                      onClick={executeActiveTool}
                    >
                      Convertir texto a PDF ahora <ArrowRight size={18} />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* PASO 2: MESA DE TRABAJO VISUAL + PANEL LATERAL DERECHO */}
          {files.length > 0 && !result && (
            <div className="remb-studio-layout">
              {/* LADO IZQUIERDO: MINIATURAS DE PÁGINAS O TARJETAS DE ARCHIVOS */}
              <div className="remb-studio-canvas">
                <div className="remb-studio-toolbar">
                  <div className="remb-toolbar-group">
                    {activeTool.multiple && (
                      <button
                        type="button"
                        className="remb-tool-btn primary-tint"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Plus size={15} /> Añadir más archivos
                      </button>
                    )}

                    <button
                      type="button"
                      className={`remb-tool-btn ${viewMode === 'pages' ? 'active' : ''}`}
                      onClick={() => setViewMode('pages')}
                    >
                      <Grid size={15} /> Vista por Páginas ({pages.length})
                    </button>
                    <button
                      type="button"
                      className={`remb-tool-btn ${viewMode === 'files' ? 'active' : ''}`}
                      onClick={() => setViewMode('files')}
                    >
                      <Layers size={15} /> Archivos ({files.length})
                    </button>
                  </div>

                  <div className="remb-toolbar-group">
                    {files.length > 1 && (
                      <>
                        <button
                          type="button"
                          className="remb-tool-btn"
                          title="Ordenar archivos A-Z"
                          onClick={() => sortFilesByName(true)}
                        >
                          <ArrowDownAZ size={15} /> A-Z
                        </button>
                        <button
                          type="button"
                          className="remb-tool-btn"
                          title="Ordenar archivos Z-A"
                          onClick={() => sortFilesByName(false)}
                        >
                          <ArrowUpZA size={15} /> Z-A
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      className="remb-tool-btn"
                      title="Rotar todas las páginas 90° a la derecha"
                      onClick={() => rotateAllPages(90)}
                    >
                      <RotateCw size={15} /> Girar todas
                    </button>
                    <button
                      type="button"
                      className="remb-tool-btn"
                      title="Invertir el orden de todas las páginas"
                      onClick={reversePagesOrder}
                    >
                      <RefreshCw size={15} /> Invertir orden
                    </button>
                  </div>
                </div>

                {/* VISTA POR ARCHIVOS */}
                {viewMode === 'files' && (
                  <div className="remb-files-grid">
                    {files.map((f, idx) => (
                      <div key={f.id} className="remb-file-card">
                        <div className="remb-file-badge">#{idx + 1}</div>
                        <button
                          type="button"
                          className="remb-file-remove"
                          title="Quitar archivo"
                          onClick={() => removeFileById(f.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                        <div className="remb-file-thumb">
                          {f.previewDataUrl ? (
                            <img src={f.previewDataUrl} alt={f.name} />
                          ) : (
                            <FileText size={42} color={activeTool.color} />
                          )}
                        </div>
                        <div className="remb-file-meta">
                          <strong title={f.name}>{f.name}</strong>
                          <span>
                            {f.pageCount} {f.pageCount === 1 ? 'página' : 'páginas'} ·{' '}
                            {formatBytes(f.size)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* VISTA POR PÁGINAS (MINIATURAS INTERACTIVAS) */}
                {viewMode === 'pages' && (
                  <div className="remb-pages-grid">
                    {pages.map((p, idx) => {
                      const isRemoved = p.deleted;
                      const isPicked = p.selected;
                      return (
                        <div
                          key={p.uid}
                          draggable
                          onDragStart={() => {
                            dragPageIdxRef.current = idx;
                          }}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => {
                            const from = dragPageIdxRef.current;
                            if (from === null || from === idx) return;
                            setPages((prev) => {
                              const next = [...prev];
                              const [moved] = next.splice(from, 1);
                              next.splice(idx, 0, moved);
                              return next;
                            });
                            dragPageIdxRef.current = null;
                          }}
                          onClick={() => togglePageAction(p.uid)}
                          className={`remb-page-card ${isRemoved ? 'is-deleted' : ''} ${
                            isPicked ? 'is-selected' : ''
                          }`}
                        >
                          <div className="remb-page-card-top">
                            <span className="remb-page-num">Pág. {idx + 1}</span>
                            <div
                              className="remb-page-mini-actions"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                title="Mover antes"
                                disabled={idx === 0}
                                onClick={() => movePage(idx, -1)}
                              >
                                ←
                              </button>
                              <button
                                type="button"
                                title="Mover después"
                                disabled={idx === pages.length - 1}
                                onClick={() => movePage(idx, 1)}
                              >
                                →
                              </button>
                              <button
                                type="button"
                                title="Girar 90° izquierda"
                                onClick={() => rotateSinglePage(p.uid, -90)}
                              >
                                <RotateCcw size={13} />
                              </button>
                              <button
                                type="button"
                                title="Girar 90° derecha"
                                onClick={() => rotateSinglePage(p.uid, 90)}
                              >
                                <RotateCw size={13} />
                              </button>
                              {selectedToolId === 'organize-pdf' && (
                                <>
                                  <button
                                    type="button"
                                    title="Duplicar página"
                                    onClick={() => duplicatePageInList(idx)}
                                  >
                                    <Copy size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    title="Insertar página en blanco después"
                                    onClick={() => insertBlankPageAfter(idx)}
                                  >
                                    <FilePlus2 size={13} />
                                  </button>
                                </>
                              )}
                              <button
                                type="button"
                                className="danger"
                                title="Quitar esta página"
                                onClick={() =>
                                  selectedToolId === 'remove-pages'
                                    ? togglePageAction(p.uid)
                                    : deletePageFromList(p.uid)
                                }
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>

                          <div className="remb-page-thumb-wrap">
                            {p.thumbnailUrl ? (
                              <img
                                src={p.thumbnailUrl}
                                alt={`Página ${idx + 1}`}
                                style={{ transform: `rotate(${p.rotation}deg)` }}
                              />
                            ) : (
                              <div
                                className="remb-blank-page-placeholder"
                                style={{ transform: `rotate(${p.rotation}deg)` }}
                              >
                                <FileText size={32} />
                                <span>{p.isBlank ? 'Página en Blanco' : `Pág. ${p.pageNumberLabel}`}</span>
                              </div>
                            )}

                            {isRemoved && <div className="remb-page-overlay-badge deleted">ELIMINAR</div>}
                            {isPicked && <div className="remb-page-overlay-badge selected">EXTRAER</div>}
                            {p.rotation !== 0 && (
                              <span className="remb-rotation-pill">{p.rotation}°</span>
                            )}
                          </div>

                          <div className="remb-page-footer-name" title={p.fileName}>
                            {p.fileName}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* LADO DERECHO: PANEL DE CONFIGURACIÓN CONTEXTUAL DE LA HERRAMIENTA */}
              <aside className="remb-studio-sidebar">
                <div className="remb-sidebar-header">
                  <h3>{activeTool.title}</h3>
                  <p>
                    {files.length} {files.length === 1 ? 'archivo cargado' : 'archivos cargados'} ·{' '}
                    {pages.length} {pages.length === 1 ? 'página' : 'páginas'}
                  </p>
                </div>

                <div className="remb-sidebar-body">
                  {/* ---- OPCIONES: UNIR / ORDENAR PDF ---- */}
                  {(activeTool.id === 'merge-pdf' || activeTool.id === 'organize-pdf') && (
                    <div className="remb-opt-group">
                      <div className="remb-info-callout">
                        Arrastra y suelta las miniaturas para cambiar el orden de las páginas o usa
                        los botones de cada tarjeta para girar, duplicar o insertar páginas en blanco.
                      </div>
                    </div>
                  )}

                  {/* ---- OPCIONES: DIVIDIR PDF ---- */}
                  {activeTool.id === 'split-pdf' && (
                    <div className="remb-opt-group">
                      <label className="remb-label">Modo de división:</label>
                      <div className="remb-segmented">
                        <button
                          type="button"
                          className={splitMode === 'ranges' ? 'active' : ''}
                          onClick={() => setSplitMode('ranges')}
                        >
                          Por rangos
                        </button>
                        <button
                          type="button"
                          className={splitMode === 'fixed' ? 'active' : ''}
                          onClick={() => setSplitMode('fixed')}
                        >
                          Fijos
                        </button>
                        <button
                          type="button"
                          className={splitMode === 'all-pages' ? 'active' : ''}
                          onClick={() => setSplitMode('all-pages')}
                        >
                          Todas las págs.
                        </button>
                      </div>

                      {splitMode === 'ranges' && (
                        <div className="remb-ranges-list">
                          {splitRanges.map((rg, idx) => (
                            <div key={idx} className="remb-range-item">
                              <span className="range-tag">Rango #{idx + 1}</span>
                              <div className="range-inputs">
                                <label>
                                  de{' '}
                                  <input
                                    type="number"
                                    min={1}
                                    max={pages.length}
                                    value={rg.from}
                                    onChange={(e) => {
                                      const val = Number(e.target.value);
                                      setSplitRanges((prev) =>
                                        prev.map((item, i) =>
                                          i === idx ? { ...item, from: val } : item
                                        )
                                      );
                                    }}
                                  />
                                </label>
                                <label>
                                  a{' '}
                                  <input
                                    type="number"
                                    min={1}
                                    max={pages.length}
                                    value={rg.to}
                                    onChange={(e) => {
                                      const val = Number(e.target.value);
                                      setSplitRanges((prev) =>
                                        prev.map((item, i) =>
                                          i === idx ? { ...item, to: val } : item
                                        )
                                      );
                                    }}
                                  />
                                </label>
                                {splitRanges.length > 1 && (
                                  <button
                                    type="button"
                                    className="range-del-btn"
                                    onClick={() =>
                                      setSplitRanges((prev) => prev.filter((_, i) => i !== idx))
                                    }
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                          <button
                            type="button"
                            className="remb-secondary-btn"
                            onClick={() =>
                              setSplitRanges((prev) => [
                                ...prev,
                                { from: 1, to: Math.max(1, pages.length) }
                              ])
                            }
                          >
                            <Plus size={14} /> Añadir otro rango
                          </button>

                          <label className="remb-checkbox-row">
                            <input
                              type="checkbox"
                              checked={splitMergeRanges}
                              onChange={(e) => setSplitMergeRanges(e.target.checked)}
                            />
                            <span>Unir todos los rangos en un único archivo PDF</span>
                          </label>
                        </div>
                      )}

                      {splitMode === 'fixed' && (
                        <div className="remb-field">
                          <label>Dividir en archivos PDF cada N páginas:</label>
                          <input
                            type="number"
                            min={1}
                            max={Math.max(1, pages.length)}
                            className="remb-input"
                            value={splitFixedStep}
                            onChange={(e) => setSplitFixedStep(Number(e.target.value))}
                          />
                        </div>
                      )}

                      {splitMode === 'all-pages' && (
                        <div className="remb-info-callout">
                          Cada una de las <strong>{pages.length} páginas</strong> se extraerá como un
                          archivo PDF individual dentro de un paquete ZIP.
                        </div>
                      )}
                    </div>
                  )}

                  {/* ---- OPCIONES: ELIMINAR / EXTRAER PÁGINAS ---- */}
                  {(activeTool.id === 'remove-pages' || activeTool.id === 'extract-pages') && (
                    <div className="remb-opt-group">
                      <div className="remb-info-callout">
                        Haz clic sobre las miniaturas de la izquierda o escribe los números de página:
                      </div>
                      <label className="remb-label">
                        {activeTool.id === 'remove-pages'
                          ? 'Páginas a eliminar (ej. 2, 4-6):'
                          : 'Páginas a extraer (ej. 1, 3-5):'}
                      </label>
                      <input
                        type="text"
                        className="remb-input"
                        placeholder="Ej: 1, 3-5, 8"
                        value={rangeInputText}
                        onChange={(e) => applyRangeTextToPages(e.target.value)}
                      />
                      {activeTool.id === 'extract-pages' && (
                        <label className="remb-checkbox-row">
                          <input
                            type="checkbox"
                            checked={extractMergeIntoOne}
                            onChange={(e) => setExtractMergeIntoOne(e.target.checked)}
                          />
                          <span>Unir páginas extraídas en un único PDF</span>
                        </label>
                      )}
                    </div>
                  )}

                  {/* ---- OPCIONES: COMPRIMIR PDF ---- */}
                  {activeTool.id === 'compress-pdf' && (
                    <div className="remb-opt-group">
                      <label className="remb-label">Nivel de compresión:</label>
                      <div className="remb-compress-cards">
                        {[
                          {
                            id: 'extreme',
                            title: 'Compresión Extrema',
                            desc: 'Menos calidad visual, máxima reducción de peso.'
                          },
                          {
                            id: 'recommended',
                            title: 'Compresión Recomendada',
                            desc: 'Excelente calidad visual y gran reducción de tamaño.'
                          },
                          {
                            id: 'low',
                            title: 'Baja Compresión',
                            desc: 'Máxima fidelidad para planos o documentos de alta nitidez.'
                          }
                        ].map((lvl) => (
                          <button
                            key={lvl.id}
                            type="button"
                            className={`remb-compress-option ${
                              compressLevel === lvl.id ? 'selected' : ''
                            }`}
                            onClick={() => setCompressLevel(lvl.id as any)}
                          >
                            <div className="comp-opt-head">
                              <strong>{lvl.title}</strong>
                              {compressLevel === lvl.id && <CheckCircle2 size={18} color="#22C55E" />}
                            </div>
                            <p>{lvl.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ---- OPCIONES: OCR PDF ---- */}
                  {activeTool.id === 'ocr-pdf' && (
                    <div className="remb-opt-group">
                      <label className="remb-label">Idioma del documento:</label>
                      <select
                        className="remb-select"
                        value={ocrLang}
                        onChange={(e) => setOcrLang(e.target.value as any)}
                      >
                        <option value="spa+eng">Español + Inglés (Bilingüe)</option>
                        <option value="spa">Español</option>
                        <option value="eng">Inglés</option>
                      </select>

                      <label className="remb-label">Máximo de páginas a escanear con OCR:</label>
                      <input
                        type="number"
                        min={1}
                        max={Math.max(1, pages.length)}
                        className="remb-input"
                        value={ocrMaxPages}
                        onChange={(e) => setOcrMaxPages(Number(e.target.value))}
                      />
                    </div>
                  )}

                  {/* ---- OPCIONES: JPG A PDF ---- */}
                  {activeTool.id === 'jpg-to-pdf' && (
                    <div className="remb-opt-group">
                      <label className="remb-label">Orientación de la página:</label>
                      <div className="remb-segmented">
                        <button
                          type="button"
                          className={jpgOrientation === 'auto' ? 'active' : ''}
                          onClick={() => setJpgOrientation('auto')}
                        >
                          Automática
                        </button>
                        <button
                          type="button"
                          className={jpgOrientation === 'portrait' ? 'active' : ''}
                          onClick={() => setJpgOrientation('portrait')}
                        >
                          Vertical
                        </button>
                        <button
                          type="button"
                          className={jpgOrientation === 'landscape' ? 'active' : ''}
                          onClick={() => setJpgOrientation('landscape')}
                        >
                          Horizontal
                        </button>
                      </div>

                      <label className="remb-label">Tamaño de hoja:</label>
                      <select
                        className="remb-select"
                        value={jpgPageSize}
                        onChange={(e) => setJpgPageSize(e.target.value as any)}
                      >
                        <option value="a4">A4 (297 x 210 mm)</option>
                        <option value="letter">Carta US Letter (216 x 279 mm)</option>
                        <option value="fit">Ajustar al tamaño exacto de cada imagen</option>
                      </select>

                      <label className="remb-label">Margen:</label>
                      <div className="remb-segmented">
                        <button
                          type="button"
                          className={jpgMargin === 'none' ? 'active' : ''}
                          onClick={() => setJpgMargin('none')}
                        >
                          Sin margen
                        </button>
                        <button
                          type="button"
                          className={jpgMargin === 'small' ? 'active' : ''}
                          onClick={() => setJpgMargin('small')}
                        >
                          Pequeño
                        </button>
                        <button
                          type="button"
                          className={jpgMargin === 'big' ? 'active' : ''}
                          onClick={() => setJpgMargin('big')}
                        >
                          Grande
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ---- OPCIONES: PDF A JPG / PNG ---- */}
                  {activeTool.id === 'pdf-to-jpg' && (
                    <div className="remb-opt-group">
                      <label className="remb-label">Formato de imagen:</label>
                      <div className="remb-segmented">
                        <button
                          type="button"
                          className={pdfToImgFormat === 'jpeg' ? 'active' : ''}
                          onClick={() => setPdfToImgFormat('jpeg')}
                        >
                          JPG
                        </button>
                        <button
                          type="button"
                          className={pdfToImgFormat === 'png' ? 'active' : ''}
                          onClick={() => setPdfToImgFormat('png')}
                        >
                          PNG (Sin pérdida)
                        </button>
                      </div>

                      <label className="remb-label">Calidad / Resolución:</label>
                      <div className="remb-segmented">
                        <button
                          type="button"
                          className={pdfToImgDpi === 150 ? 'active' : ''}
                          onClick={() => setPdfToImgDpi(150)}
                        >
                          Normal (150 DPI)
                        </button>
                        <button
                          type="button"
                          className={pdfToImgDpi === 300 ? 'active' : ''}
                          onClick={() => setPdfToImgDpi(300)}
                        >
                          Alta (300 DPI)
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ---- OPCIONES: ROTAR PDF ---- */}
                  {activeTool.id === 'rotate-pdf' && (
                    <div className="remb-opt-group">
                      <label className="remb-label">Rotación masiva:</label>
                      <div className="remb-rotate-buttons">
                        <button
                          type="button"
                          className="remb-secondary-btn"
                          onClick={() => rotateAllPages(90, 'all')}
                        >
                          <RotateCw size={15} /> Todas 90° Derecha
                        </button>
                        <button
                          type="button"
                          className="remb-secondary-btn"
                          onClick={() => rotateAllPages(-90, 'all')}
                        >
                          <RotateCcw size={15} /> Todas 90° Izquierda
                        </button>
                        <button
                          type="button"
                          className="remb-secondary-btn"
                          onClick={() => rotateAllPages(90, 'odd')}
                        >
                          Girar solo Impares
                        </button>
                        <button
                          type="button"
                          className="remb-secondary-btn"
                          onClick={() => rotateAllPages(90, 'even')}
                        >
                          Girar solo Pares
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ---- OPCIONES: NÚMEROS DE PÁGINA ---- */}
                  {activeTool.id === 'page-numbers' && (
                    <div className="remb-opt-group">
                      <label className="remb-label">Posición en la hoja:</label>
                      <PositionGridPicker value={pageNumPosition} onChange={setPageNumPosition} />

                      <label className="remb-label">Formato del texto:</label>
                      <select
                        className="remb-select"
                        value={pageNumFormat}
                        onChange={(e) => setPageNumFormat(e.target.value as any)}
                      >
                        <option value="page-n-of-m">Página 1 de {pages.length}</option>
                        <option value="page-n">Página 1</option>
                        <option value="simple">Solo número (1, 2, 3...)</option>
                      </select>

                      <div className="remb-two-cols">
                        <div>
                          <label className="remb-label">Primer número:</label>
                          <input
                            type="number"
                            min={1}
                            className="remb-input"
                            value={pageNumFirst}
                            onChange={(e) => setPageNumFirst(Number(e.target.value))}
                          />
                        </div>
                        <div>
                          <label className="remb-label">Tamaño fuente:</label>
                          <input
                            type="number"
                            min={8}
                            max={36}
                            className="remb-input"
                            value={pageNumFontSize}
                            onChange={(e) => setPageNumFontSize(Number(e.target.value))}
                          />
                        </div>
                      </div>

                      <div className="remb-two-cols">
                        <div>
                          <label className="remb-label">Desde pág.:</label>
                          <input
                            type="number"
                            min={1}
                            max={pages.length}
                            className="remb-input"
                            value={pageNumFrom}
                            onChange={(e) => setPageNumFrom(Number(e.target.value))}
                          />
                        </div>
                        <div>
                          <label className="remb-label">Hasta pág.:</label>
                          <input
                            type="number"
                            min={1}
                            max={pages.length}
                            className="remb-input"
                            value={pageNumTo}
                            onChange={(e) => setPageNumTo(Number(e.target.value))}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ---- OPCIONES: MARCA DE AGUA ---- */}
                  {activeTool.id === 'watermark-pdf' && (
                    <div className="remb-opt-group">
                      <div className="remb-segmented">
                        <button
                          type="button"
                          className={wmMode === 'text' ? 'active' : ''}
                          onClick={() => setWmMode('text')}
                        >
                          Colocar Texto
                        </button>
                        <button
                          type="button"
                          className={wmMode === 'image' ? 'active' : ''}
                          onClick={() => setWmMode('image')}
                        >
                          Colocar Imagen
                        </button>
                      </div>

                      {wmMode === 'text' ? (
                        <>
                          <label className="remb-label">Texto de la marca de agua:</label>
                          <input
                            type="text"
                            className="remb-input"
                            value={wmText}
                            onChange={(e) => setWmText(e.target.value)}
                            placeholder="CONFIDENCIAL / BORRADOR..."
                          />
                          <div className="remb-two-cols">
                            <div>
                              <label className="remb-label">Tamaño:</label>
                              <input
                                type="number"
                                min={14}
                                max={110}
                                className="remb-input"
                                value={wmFontSize}
                                onChange={(e) => setWmFontSize(Number(e.target.value))}
                              />
                            </div>
                            <div>
                              <label className="remb-label">Color:</label>
                              <input
                                type="color"
                                className="remb-color-input"
                                value={wmColor}
                                onChange={(e) => setWmColor(e.target.value)}
                              />
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="remb-field">
                          <input
                            ref={watermarkImageInputRef}
                            type="file"
                            accept="image/png,image/jpeg"
                            hidden
                            onChange={handleWatermarkImageUpload}
                          />
                          <button
                            type="button"
                            className="remb-secondary-btn"
                            onClick={() => watermarkImageInputRef.current?.click()}
                          >
                            <Upload size={14} />{' '}
                            {wmImageName || 'Seleccionar logotipo PNG/JPG'}
                          </button>
                        </div>
                      )}

                      <label className="remb-label">Posición:</label>
                      <PositionGridPicker
                        value={wmPosition}
                        onChange={setWmPosition}
                        disabled={wmMosaic}
                      />

                      {wmMode === 'text' && (
                        <label className="remb-checkbox-row">
                          <input
                            type="checkbox"
                            checked={wmMosaic}
                            onChange={(e) => setWmMosaic(e.target.checked)}
                          />
                          <span>Repetir en modo Mosaico por toda la página</span>
                        </label>
                      )}

                      <div className="remb-two-cols">
                        <div>
                          <label className="remb-label">Opacidad ({Math.round(wmOpacity * 100)}%):</label>
                          <input
                            type="range"
                            min={0.08}
                            max={1}
                            step={0.04}
                            value={wmOpacity}
                            onChange={(e) => setWmOpacity(Number(e.target.value))}
                          />
                        </div>
                        <div>
                          <label className="remb-label">Rotación ({wmRotation}°):</label>
                          <select
                            className="remb-select"
                            value={wmRotation}
                            onChange={(e) => setWmRotation(Number(e.target.value))}
                          >
                            <option value={0}>0° Horizontal</option>
                            <option value={45}>45° Diagonal</option>
                            <option value={-45}>-45° Diagonal inv.</option>
                            <option value={90}>90° Vertical</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ---- OPCIONES: FIRMAR PDF ---- */}
                  {activeTool.id === 'sign-pdf' && (
                    <div className="remb-opt-group">
                      <label className="remb-label">Crea tu firma:</label>
                      <SignaturePadBox onSignatureChange={setSigDataUrl} />

                      <label className="remb-label">Nombre o cargo bajo la firma:</label>
                      <input
                        type="text"
                        className="remb-input"
                        value={sigName}
                        onChange={(e) => setSigName(e.target.value)}
                      />

                      <label className="remb-checkbox-row">
                        <input
                          type="checkbox"
                          checked={sigIncludeDate}
                          onChange={(e) => setSigIncludeDate(e.target.checked)}
                        />
                        <span>Estampar fecha actual junto a la firma</span>
                      </label>

                      <label className="remb-label">Posición de la firma en la hoja:</label>
                      <PositionGridPicker value={sigPosition} onChange={setSigPosition} />

                      <label className="remb-label">¿En qué páginas firmar?</label>
                      <select
                        className="remb-select"
                        value={sigTargetPages}
                        onChange={(e) => setSigTargetPages(e.target.value as any)}
                      >
                        <option value="last">Solo en la última página</option>
                        <option value="first">Solo en la primera página</option>
                        <option value="all">En todas las páginas</option>
                        <option value="custom">En una página específica</option>
                      </select>

                      {sigTargetPages === 'custom' && (
                        <input
                          type="number"
                          min={1}
                          max={pages.length}
                          className="remb-input"
                          value={sigCustomPage}
                          onChange={(e) => setSigCustomPage(Number(e.target.value))}
                        />
                      )}
                    </div>
                  )}

                  {/* ---- OPCIONES: RECORTAR Y ANOTAR PDF ---- */}
                  {activeTool.id === 'crop-edit-pdf' && (
                    <div className="remb-opt-group">
                      <label className="remb-label">Recortar márgenes (puntos PDF):</label>
                      <div className="remb-two-cols">
                        <div>
                          <label className="remb-label">Arriba:</label>
                          <input
                            type="number"
                            min={0}
                            className="remb-input"
                            value={cropTop}
                            onChange={(e) => setCropTop(Number(e.target.value))}
                          />
                        </div>
                        <div>
                          <label className="remb-label">Abajo:</label>
                          <input
                            type="number"
                            min={0}
                            className="remb-input"
                            value={cropBottom}
                            onChange={(e) => setCropBottom(Number(e.target.value))}
                          />
                        </div>
                        <div>
                          <label className="remb-label">Izquierda:</label>
                          <input
                            type="number"
                            min={0}
                            className="remb-input"
                            value={cropLeft}
                            onChange={(e) => setCropLeft(Number(e.target.value))}
                          />
                        </div>
                        <div>
                          <label className="remb-label">Derecha:</label>
                          <input
                            type="number"
                            min={0}
                            className="remb-input"
                            value={cropRight}
                            onChange={(e) => setCropRight(Number(e.target.value))}
                          />
                        </div>
                      </div>

                      <label className="remb-label">Estampar nota en cabecera (opcional):</label>
                      <input
                        type="text"
                        className="remb-input"
                        placeholder="Ej: Expediente Revisado - Javer"
                        value={editStampText}
                        onChange={(e) => setEditStampText(e.target.value)}
                      />

                      <label className="remb-checkbox-row">
                        <input
                          type="checkbox"
                          checked={redactHeaders}
                          onChange={(e) => setRedactHeaders(e.target.checked)}
                        />
                        <span>Limpiar / cubrir encabezados y pies de página antiguos</span>
                      </label>
                    </div>
                  )}

                  {/* ---- OPCIONES: PROTEGER Y METADATOS ---- */}
                  {activeTool.id === 'protect-metadata-pdf' && (
                    <div className="remb-opt-group">
                      <label className="remb-checkbox-row">
                        <input
                          type="checkbox"
                          checked={stripAllMeta}
                          onChange={(e) => setStripAllMeta(e.target.checked)}
                        />
                        <span>Borrar todos los metadatos ocultos (Modo Privacidad)</span>
                      </label>

                      {!stripAllMeta && (
                        <>
                          <label className="remb-label">Título del documento:</label>
                          <input
                            type="text"
                            className="remb-input"
                            value={metaTitle}
                            onChange={(e) => setMetaTitle(e.target.value)}
                            placeholder="Título oficial..."
                          />
                          <label className="remb-label">Autor / Departamento:</label>
                          <input
                            type="text"
                            className="remb-input"
                            value={metaAuthor}
                            onChange={(e) => setMetaAuthor(e.target.value)}
                            placeholder="Autor..."
                          />
                          <label className="remb-label">Asunto:</label>
                          <input
                            type="text"
                            className="remb-input"
                            value={metaSubject}
                            onChange={(e) => setMetaSubject(e.target.value)}
                          />
                          <label className="remb-label">Palabras clave (separadas por coma):</label>
                          <input
                            type="text"
                            className="remb-input"
                            value={metaKeywords}
                            onChange={(e) => setMetaKeywords(e.target.value)}
                          />
                        </>
                      )}

                      <label className="remb-label">Cintillo superior de seguridad (opcional):</label>
                      <input
                        type="text"
                        className="remb-input"
                        value={securityBanner}
                        onChange={(e) => setSecurityBanner(e.target.value)}
                        placeholder="Ej: USO INTERNO EXCLUSIVO - PROHIBIDA SU REPRODUCCIÓN"
                      />
                    </div>
                  )}
                </div>

                {/* BOTÓN GIGANTE DE ACCIÓN PRINCIPAL ABAJO A LA DERECHA */}
                <div className="remb-sidebar-footer">
                  <button
                    type="button"
                    className="remb-action-submit-btn"
                    style={{ backgroundColor: activeTool.color }}
                    disabled={isProcessing}
                    onClick={executeActiveTool}
                  >
                    <span>{isProcessing ? progressMessage || 'Procesando...' : activeTool.actionButtonLabel}</span>
                    <ArrowRight size={20} />
                  </button>
                </div>
              </aside>
            </div>
          )}

          {/* PASO 3: PANTALLA DE RESULTADO, DESCARGA NATIVA Y ENCADENAMIENTO */}
          {result && (
            <div className="remb-result-stage">
              <div className="remb-result-card">
                <div className="remb-result-badge">
                  <CheckCircle2 size={38} color="#16A34A" />
                </div>
                <h2>¡Tu tarea en {activeTool.title} ha finalizado!</h2>
                <p className="remb-result-summary">
                  {result.summaryText || 'Tu archivo ha sido procesado localmente con éxito.'}
                </p>

                <div className="remb-result-file-pill">
                  <FileText size={20} color={activeTool.color} />
                  <div>
                    <strong>{result.filename}</strong>
                    <span>Tamaño final: {formatBytes(result.size)}</span>
                  </div>
                </div>

                <div className="remb-result-actions">
                  <a
                    href={result.downloadUrl}
                    download={result.filename}
                    className="remb-giant-download-btn"
                    style={{ backgroundColor: activeTool.color }}
                  >
                    <Download size={22} />
                    <span>Descargar {result.filename}</span>
                  </a>

                  {result.mimeType === 'application/pdf' && (
                    <a
                      href={result.previewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="remb-open-tab-btn"
                    >
                      <Eye size={18} /> Abrir PDF en pestaña nueva
                    </a>
                  )}
                </div>

                {/* Si generó un PDF, permitir encadenarlo con otra herramienta en 1 clic */}
                {result.rawBytes && (
                  <div className="remb-chain-tools">
                    <h4>Continuar con este archivo resultante en otra herramienta:</h4>
                    <div className="remb-chain-chips">
                      {[
                        'compress-pdf',
                        'page-numbers',
                        'watermark-pdf',
                        'sign-pdf',
                        'split-pdf',
                        'rotate-pdf',
                        'pdf-to-jpg',
                        'pdf-to-word'
                      ]
                        .filter((id) => id !== activeTool.id)
                        .map((id) => {
                          const t = PDF_TOOLS.find((item) => item.id === id)!;
                          return (
                            <button
                              key={t.id}
                              type="button"
                              className="remb-chain-btn"
                              onClick={() => continueWithResultInTool(t.id)}
                            >
                              <ToolIcon name={t.iconName} size={15} color={t.color} />
                              <span>{t.shortTitle}</span>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Vista previa embebida del PDF o del texto extraído */}
                {result.extraTextPreview && (
                  <div className="remb-text-preview-box">
                    <div className="remb-text-preview-head">
                      <strong>Vista previa del contenido extraído / analizado:</strong>
                      <button
                        type="button"
                        className="remb-secondary-btn"
                        onClick={() => navigator.clipboard.writeText(result.extraTextPreview || '')}
                      >
                        <Copy size={13} /> Copiar texto
                      </button>
                    </div>
                    <pre>{result.extraTextPreview}</pre>
                  </div>
                )}

                {result.mimeType === 'application/pdf' && (
                  <div className="remb-pdf-iframe-wrap">
                    <iframe src={result.previewUrl} title="Vista previa del PDF resultante" />
                  </div>
                )}

                <div className="remb-result-bottom">
                  <button
                    type="button"
                    className="remb-secondary-btn"
                    onClick={() => setResult(null)}
                  >
                    <ArrowLeft size={15} /> Volver a ajustar opciones
                  </button>
                  <button type="button" className="remb-secondary-btn" onClick={resetToHome}>
                    Ir al inicio de Remb PDF
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      )}

      {/* ================= MODAL DE HISTORIAL DE SESIÓN ================= */}
      {showHistoryModal && (
        <div className="remb-modal-backdrop" onClick={() => setShowHistoryModal(false)}>
          <div className="remb-modal" onClick={(e) => e.stopPropagation()}>
            <div className="remb-modal-header">
              <h3>Archivos procesados en esta sesión ({historyList.length})</h3>
              <button type="button" onClick={() => setShowHistoryModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="remb-modal-body">
              {historyList.length === 0 ? (
                <p className="remb-empty-history">
                  Aún no has procesado archivos en esta sesión.
                </p>
              ) : (
                <ul className="remb-history-list">
                  {historyList.map((entry, i) => (
                    <li key={i} className="remb-history-item">
                      <div>
                        <strong>{entry.result.filename}</strong>
                        <span>
                          {entry.toolTitle} · {formatBytes(entry.result.size)} · {entry.timestamp}
                        </span>
                      </div>
                      <a
                        href={entry.result.downloadUrl}
                        download={entry.result.filename}
                        className="remb-mini-download"
                      >
                        <Download size={15} /> Descargar
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PdfRembTab;
