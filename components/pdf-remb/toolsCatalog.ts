export type ToolCategory =
  | 'all'
  | 'organize'
  | 'optimize'
  | 'convert-to-pdf'
  | 'convert-from-pdf'
  | 'edit'
  | 'security';

export type ToolId =
  | 'merge-pdf'
  | 'split-pdf'
  | 'remove-pages'
  | 'extract-pages'
  | 'organize-pdf'
  | 'compress-pdf'
  | 'repair-pdf'
  | 'ocr-pdf'
  | 'jpg-to-pdf'
  | 'word-to-pdf'
  | 'powerpoint-to-pdf'
  | 'excel-to-pdf'
  | 'html-to-pdf'
  | 'pdf-to-jpg'
  | 'pdf-to-word'
  | 'pdf-to-excel'
  | 'pdf-to-text'
  | 'rotate-pdf'
  | 'page-numbers'
  | 'watermark-pdf'
  | 'crop-edit-pdf'
  | 'sign-pdf'
  | 'protect-metadata-pdf'
  | 'compare-pdf';

export interface PdfToolDefinition {
  id: ToolId;
  title: string;
  shortTitle: string;
  description: string;
  category: Exclude<ToolCategory, 'all'>;
  color: string;
  bgTint: string;
  accept: string;
  acceptLabel: string;
  multiple: boolean;
  badge?: string;
  actionButtonLabel: string;
  iconName:
    | 'merge'
    | 'split'
    | 'remove'
    | 'extract'
    | 'organize'
    | 'compress'
    | 'repair'
    | 'ocr'
    | 'jpg-in'
    | 'word-in'
    | 'ppt-in'
    | 'excel-in'
    | 'html-in'
    | 'jpg-out'
    | 'word-out'
    | 'excel-out'
    | 'text-out'
    | 'rotate'
    | 'numbers'
    | 'watermark'
    | 'edit'
    | 'sign'
    | 'security'
    | 'compare';
}

export const CATEGORY_LABELS: { id: ToolCategory; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'organize', label: 'Organizar PDF' },
  { id: 'optimize', label: 'Optimizar PDF' },
  { id: 'convert-to-pdf', label: 'Convertir a PDF' },
  { id: 'convert-from-pdf', label: 'Convertir desde PDF' },
  { id: 'edit', label: 'Editar PDF' },
  { id: 'security', label: 'Seguridad PDF' }
];

export const PDF_TOOLS: PdfToolDefinition[] = [
  // ================= ORGANIZAR PDF =================
  {
    id: 'merge-pdf',
    title: 'Unir PDF',
    shortTitle: 'Unir PDF',
    description:
      'Une varios archivos PDF e imágenes en un solo documento y ordénalos como prefieras.',
    category: 'organize',
    color: '#E5322D',
    bgTint: 'rgba(229, 50, 45, 0.10)',
    accept: '.pdf,application/pdf,image/jpeg,image/png,image/webp',
    acceptLabel: 'Seleccionar archivos PDF',
    multiple: true,
    actionButtonLabel: 'Unir PDF',
    iconName: 'merge'
  },
  {
    id: 'split-pdf',
    title: 'Dividir PDF',
    shortTitle: 'Dividir PDF',
    description:
      'Separa una página o un conjunto de páginas por rangos personalizados o intervalos fijos.',
    category: 'organize',
    color: '#E5322D',
    bgTint: 'rgba(229, 50, 45, 0.10)',
    accept: '.pdf,application/pdf',
    acceptLabel: 'Seleccionar archivo PDF',
    multiple: false,
    actionButtonLabel: 'Dividir PDF',
    iconName: 'split'
  },
  {
    id: 'remove-pages',
    title: 'Eliminar páginas',
    shortTitle: 'Eliminar páginas',
    description:
      'Haz clic sobre las páginas que no necesitas para quitarlas de tu documento PDF al instante.',
    category: 'organize',
    color: '#E5322D',
    bgTint: 'rgba(229, 50, 45, 0.10)',
    accept: '.pdf,application/pdf',
    acceptLabel: 'Seleccionar archivo PDF',
    multiple: false,
    actionButtonLabel: 'Eliminar páginas seleccionadas',
    iconName: 'remove'
  },
  {
    id: 'extract-pages',
    title: 'Extraer páginas',
    shortTitle: 'Extraer páginas',
    description:
      'Selecciona las páginas exactas que deseas conservar para generar un nuevo archivo PDF o ZIP.',
    category: 'organize',
    color: '#E5322D',
    bgTint: 'rgba(229, 50, 45, 0.10)',
    accept: '.pdf,application/pdf',
    acceptLabel: 'Seleccionar archivo PDF',
    multiple: false,
    actionButtonLabel: 'Extraer páginas',
    iconName: 'extract'
  },
  {
    id: 'organize-pdf',
    title: 'Ordenar PDF',
    shortTitle: 'Ordenar PDF',
    description:
      'Reordena páginas arrastrándolas, gíralas, duplícalas, inserta páginas en blanco o invierte el orden.',
    category: 'organize',
    color: '#E5322D',
    bgTint: 'rgba(229, 50, 45, 0.10)',
    accept: '.pdf,application/pdf',
    acceptLabel: 'Seleccionar archivos PDF',
    multiple: true,
    actionButtonLabel: 'Guardar PDF ordenado',
    iconName: 'organize'
  },

  // ================= OPTIMIZAR PDF =================
  {
    id: 'compress-pdf',
    title: 'Comprimir PDF',
    shortTitle: 'Comprimir PDF',
    description:
      'Reduce drásticamente el peso de tus documentos PDF manteniendo la máxima calidad visual posible.',
    category: 'optimize',
    color: '#16A34A',
    bgTint: 'rgba(22, 163, 74, 0.10)',
    accept: '.pdf,application/pdf',
    acceptLabel: 'Seleccionar archivo PDF',
    multiple: false,
    badge: 'POPULAR',
    actionButtonLabel: 'Comprimir PDF',
    iconName: 'compress'
  },
  {
    id: 'repair-pdf',
    title: 'Reparar PDF',
    shortTitle: 'Reparar PDF',
    description:
      'Reconstruye la tabla de objetos y flujos internos de un archivo PDF dañado o con errores de lectura.',
    category: 'optimize',
    color: '#16A34A',
    bgTint: 'rgba(22, 163, 74, 0.10)',
    accept: '.pdf,application/pdf',
    acceptLabel: 'Seleccionar archivo PDF',
    multiple: false,
    actionButtonLabel: 'Reparar y reconstruir PDF',
    iconName: 'repair'
  },
  {
    id: 'ocr-pdf',
    title: 'OCR PDF',
    shortTitle: 'OCR PDF',
    description:
      'Reconoce texto en documentos escaneados o imágenes (Español / Inglés) para copiarlo y buscarlo.',
    category: 'optimize',
    color: '#16A34A',
    bgTint: 'rgba(22, 163, 74, 0.10)',
    accept: '.pdf,application/pdf,image/jpeg,image/png,image/webp',
    acceptLabel: 'Seleccionar PDF escaneado o Imagen',
    multiple: false,
    badge: 'IA LOCAL',
    actionButtonLabel: 'Ejecutar reconocimiento OCR',
    iconName: 'ocr'
  },

  // ================= CONVERTIR A PDF =================
  {
    id: 'jpg-to-pdf',
    title: 'JPG a PDF',
    shortTitle: 'JPG a PDF',
    description:
      'Convierte tus imágenes JPG, PNG y WebP a PDF. Configura orientación, tamaño de hoja y márgenes.',
    category: 'convert-to-pdf',
    color: '#D97706',
    bgTint: 'rgba(217, 119, 6, 0.12)',
    accept: 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp',
    acceptLabel: 'Seleccionar imágenes JPG / PNG',
    multiple: true,
    actionButtonLabel: 'Convertir imágenes a PDF',
    iconName: 'jpg-in'
  },
  {
    id: 'word-to-pdf',
    title: 'WORD a PDF',
    shortTitle: 'WORD a PDF',
    description:
      'Convierte tus documentos DOCX y DOC a PDF al instante en tu navegador.',
    category: 'convert-to-pdf',
    color: '#2563EB',
    bgTint: 'rgba(37, 99, 235, 0.10)',
    accept: '.docx,.doc,.rtf,.txt',
    acceptLabel: 'Seleccionar documento Word',
    multiple: false,
    actionButtonLabel: 'Convertir Word a PDF',
    iconName: 'word-in'
  },
  {
    id: 'powerpoint-to-pdf',
    title: 'POWERPOINT a PDF',
    shortTitle: 'PPT a PDF',
    description:
      'Convierte tus presentaciones PPTX y PPT a documentos PDF listos para enviar o imprimir.',
    category: 'convert-to-pdf',
    color: '#EA580C',
    bgTint: 'rgba(234, 88, 12, 0.10)',
    accept: '.pptx,.ppt',
    acceptLabel: 'Seleccionar presentación PowerPoint',
    multiple: false,
    actionButtonLabel: 'Convertir PowerPoint a PDF',
    iconName: 'ppt-in'
  },
  {
    id: 'excel-to-pdf',
    title: 'EXCEL a PDF',
    shortTitle: 'EXCEL a PDF',
    description:
      'Convierte hojas de cálculo XLSX, XLS y CSV a tablas PDF perfectamente estructuradas y legibles.',
    category: 'convert-to-pdf',
    color: '#15803D',
    bgTint: 'rgba(21, 128, 61, 0.10)',
    accept: '.xlsx,.xls,.csv',
    acceptLabel: 'Seleccionar libro Excel / CSV',
    multiple: false,
    actionButtonLabel: 'Convertir Excel a PDF',
    iconName: 'excel-in'
  },
  {
    id: 'html-to-pdf',
    title: 'HTML / Texto a PDF',
    shortTitle: 'HTML a PDF',
    description:
      'Convierte archivos HTML, Markdown, TXT o escribe texto directamente para maquetarlo en PDF.',
    category: 'convert-to-pdf',
    color: '#0284C7',
    bgTint: 'rgba(2, 132, 199, 0.10)',
    accept: '.html,.htm,.txt,.md',
    acceptLabel: 'Seleccionar archivo HTML / TXT',
    multiple: false,
    actionButtonLabel: 'Convertir a PDF',
    iconName: 'html-in'
  },

  // ================= CONVERTIR DESDE PDF =================
  {
    id: 'pdf-to-jpg',
    title: 'PDF a JPG / PNG',
    shortTitle: 'PDF a JPG',
    description:
      'Extrae todas las páginas de un PDF como imágenes de alta resolución (150 o 300 DPI) en JPG o PNG.',
    category: 'convert-from-pdf',
    color: '#D97706',
    bgTint: 'rgba(217, 119, 6, 0.12)',
    accept: '.pdf,application/pdf',
    acceptLabel: 'Seleccionar archivo PDF',
    multiple: false,
    actionButtonLabel: 'Convertir PDF a Imágenes',
    iconName: 'jpg-out'
  },
  {
    id: 'pdf-to-word',
    title: 'PDF a WORD',
    shortTitle: 'PDF a WORD',
    description:
      'Convierte tus PDFs a documentos DOCX de Microsoft Word 100% editables con estructura por párrafos.',
    category: 'convert-from-pdf',
    color: '#2563EB',
    bgTint: 'rgba(37, 99, 235, 0.10)',
    accept: '.pdf,application/pdf',
    acceptLabel: 'Seleccionar archivo PDF',
    multiple: false,
    badge: 'DOCX REAL',
    actionButtonLabel: 'Convertir a Word (.docx)',
    iconName: 'word-out'
  },
  {
    id: 'pdf-to-excel',
    title: 'PDF a EXCEL',
    shortTitle: 'PDF a EXCEL',
    description:
      'Detecta filas y columnas en tu PDF y extráelas directamente a un libro XLSX de Microsoft Excel.',
    category: 'convert-from-pdf',
    color: '#15803D',
    bgTint: 'rgba(21, 128, 61, 0.10)',
    accept: '.pdf,application/pdf',
    acceptLabel: 'Seleccionar archivo PDF',
    multiple: false,
    badge: 'XLSX REAL',
    actionButtonLabel: 'Convertir a Excel (.xlsx)',
    iconName: 'excel-out'
  },
  {
    id: 'pdf-to-text',
    title: 'PDF a Texto / Markdown',
    shortTitle: 'PDF a Texto',
    description:
      'Extrae todo el contenido textual limpio de cualquier PDF para copiarlo o guardarlo en TXT.',
    category: 'convert-from-pdf',
    color: '#4F46E5',
    bgTint: 'rgba(79, 70, 229, 0.10)',
    accept: '.pdf,application/pdf',
    acceptLabel: 'Seleccionar archivo PDF',
    multiple: false,
    actionButtonLabel: 'Extraer texto completo',
    iconName: 'text-out'
  },

  // ================= EDITAR PDF =================
  {
    id: 'rotate-pdf',
    title: 'Rotar PDF',
    shortTitle: 'Rotar PDF',
    description:
      'Gira páginas individuales o todas las páginas (pares, impares, horizontales o verticales) con vista previa.',
    category: 'edit',
    color: '#9333EA',
    bgTint: 'rgba(147, 51, 234, 0.10)',
    accept: '.pdf,application/pdf',
    acceptLabel: 'Seleccionar archivo PDF',
    multiple: true,
    actionButtonLabel: 'Aplicar rotación al PDF',
    iconName: 'rotate'
  },
  {
    id: 'page-numbers',
    title: 'Números de página',
    shortTitle: 'Números de página',
    description:
      'Añade numeración personalizada eligiendo la posición en cuadrícula de 9 puntos, formato, fuente y rango.',
    category: 'edit',
    color: '#9333EA',
    bgTint: 'rgba(147, 51, 234, 0.10)',
    accept: '.pdf,application/pdf',
    acceptLabel: 'Seleccionar archivo PDF',
    multiple: false,
    actionButtonLabel: 'Insertar números de página',
    iconName: 'numbers'
  },
  {
    id: 'watermark-pdf',
    title: 'Marca de agua',
    shortTitle: 'Marca de agua',
    description:
      'Estampa un texto o logotipo PNG/JPG sobre tu PDF. Elige modo mosaico, opacidad, rotación y posición.',
    category: 'edit',
    color: '#9333EA',
    bgTint: 'rgba(147, 51, 234, 0.10)',
    accept: '.pdf,application/pdf',
    acceptLabel: 'Seleccionar archivo PDF',
    multiple: false,
    actionButtonLabel: 'Estampar marca de agua',
    iconName: 'watermark'
  },
  {
    id: 'crop-edit-pdf',
    title: 'Recortar y Anotar PDF',
    shortTitle: 'Editar / Recortar',
    description:
      'Ajusta márgenes de recorte (CropBox) de todas las páginas o agrega cintillos y notas de texto.',
    category: 'edit',
    color: '#9333EA',
    bgTint: 'rgba(147, 51, 234, 0.10)',
    accept: '.pdf,application/pdf',
    acceptLabel: 'Seleccionar archivo PDF',
    multiple: false,
    actionButtonLabel: 'Aplicar cambios al PDF',
    iconName: 'edit'
  },

  // ================= SEGURIDAD PDF =================
  {
    id: 'sign-pdf',
    title: 'Firmar PDF',
    shortTitle: 'Firmar PDF',
    description:
      'Dibuja tu firma con el mouse, escríbela con tipografía caligráfica o sube tu rúbrica PNG con sello de fecha.',
    category: 'security',
    color: '#0D9488',
    bgTint: 'rgba(13, 148, 136, 0.10)',
    accept: '.pdf,application/pdf',
    acceptLabel: 'Seleccionar archivo PDF',
    multiple: false,
    badge: 'FIRMA DIGITAL',
    actionButtonLabel: 'Firmar documento PDF',
    iconName: 'sign'
  },
  {
    id: 'protect-metadata-pdf',
    title: 'Proteger y Metadatos',
    shortTitle: 'Metadatos y Sello',
    description:
      'Limpia metadatos ocultos de privacidad, edita Autor/Título o estampa un cintillo de confidencialidad.',
    category: 'security',
    color: '#0D9488',
    bgTint: 'rgba(13, 148, 136, 0.10)',
    accept: '.pdf,application/pdf',
    acceptLabel: 'Seleccionar archivo PDF',
    multiple: false,
    actionButtonLabel: 'Aplicar blindaje y metadatos',
    iconName: 'security'
  },
  {
    id: 'compare-pdf',
    title: 'Comparar PDF',
    shortTitle: 'Comparar PDF',
    description:
      'Compara dos versiones de un PDF página por página para detectar diferencias de texto y generar reporte.',
    category: 'security',
    color: '#0D9488',
    bgTint: 'rgba(13, 148, 136, 0.10)',
    accept: '.pdf,application/pdf',
    acceptLabel: 'Seleccionar los 2 archivos PDF',
    multiple: true,
    actionButtonLabel: 'Comparar ambos PDFs',
    iconName: 'compare'
  }
];
