import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Camera,
  Video,
  Upload,
  Sliders,
  Crop,
  RotateCcw,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Download,
  Sparkles,
  Sun,
  Droplets,
  Eye,
  RefreshCw,
  Pipette,
  Plus,
  Trash2,
  Play,
  Pause,
  Scissors,
  Film,
  ArrowUp,
  ArrowDown,
  Volume2,
  VolumeX,
  Image as ImageIcon,
  Wand2,
  Undo2,
  Redo2,
  SplitSquareHorizontal,
  Copy,
  Aperture,
  Grid,
  Palette,
  CloudFog,
  X,
  FileText
} from 'lucide-react';
import { PdfRembTab } from './PdfRembTab';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import { saveMediaBlob, saveMediaUrl } from '../utils/mediaExportHelper';
import {
  ToneCurvesState,
  ColorGradingState,
  createDefaultToneCurves,
  createDefaultColorGrading,
  buildHSL360LUT,
  buildCurveLUT,
  buildColorGradingLUT,
  rgbToHslFast,
  hslToRgbFast,
} from '../utils/cameraRawEngine';
import {
  InteractiveToneCurvePanel,
  ColorGradingThreeWheelsPanel,
} from './CameraRawProPanels';
import {
  VideoClipItem,
  VideoTransitionType,
  VideoCompressionPresetId,
  VIDEO_COMPRESSION_PRESETS,
  createDefaultVideoClip,
  cloneVideoClipsList,
  computeClipTransitionOverlay,
  renderVideoFrameWithHSL,
} from '../utils/videoStudioEngine';
import {
  ActiveVideoPanelType,
  VideoGlobalTimeline,
  VideoInspectorPanels,
} from './VideoStudioInspectorAndTimeline';

type ActiveEditorType = 'none' | 'photo' | 'video';

const IMAGE_EXTENSIONS = /\.(jpe?g|png|webp|avif|gif|bmp|svg|heic|heif|tiff?)$/i;
const VIDEO_EXTENSIONS = /\.(mp4|webm|mov|mkv|avi|m4v|3gp|ogv|mpeg|mpg)$/i;

function isPhotoFile(file: File): boolean {
  return file.type.startsWith('image/') || IMAGE_EXTENSIONS.test(file.name);
}

function isVideoFile(file: File): boolean {
  return file.type.startsWith('video/') || VIDEO_EXTENSIONS.test(file.name);
}

function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
}

export type ColorChannelId =
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'aqua'
  | 'blue'
  | 'purple'
  | 'magenta';

export interface HSLChannelValues {
  hue: number;        // -100 to 100 (Tono)
  saturation: number; // -100 to 100 (Intensidad / Saturación)
  luminance: number;  // -100 to 100 (Luminosidad)
}

export type ColorMixerMap = Record<ColorChannelId, HSLChannelValues>;

export const COLOR_CHANNELS: {
  id: ColorChannelId;
  label: string;
  shortLabel: string;
  centerHue: number;
  swatchClass: string;
  hex: string;
}[] = [
  { id: 'red', label: 'Rojos', shortLabel: 'Rojo', centerHue: 0, swatchClass: 'bg-red-500', hex: '#ef4444' },
  { id: 'orange', label: 'Naranjas', shortLabel: 'Nar', centerHue: 30, swatchClass: 'bg-orange-500', hex: '#f97316' },
  { id: 'yellow', label: 'Amarillos', shortLabel: 'Ama', centerHue: 60, swatchClass: 'bg-yellow-400', hex: '#facc15' },
  { id: 'green', label: 'Verdes', shortLabel: 'Ver', centerHue: 120, swatchClass: 'bg-emerald-500', hex: '#10b981' },
  { id: 'aqua', label: 'Aguamarinas', shortLabel: 'Agua', centerHue: 180, swatchClass: 'bg-cyan-400', hex: '#22d3ee' },
  { id: 'blue', label: 'Azules', shortLabel: 'Azul', centerHue: 230, swatchClass: 'bg-blue-500', hex: '#3b82f6' },
  { id: 'purple', label: 'Púrpuras', shortLabel: 'Púrp', centerHue: 275, swatchClass: 'bg-purple-500', hex: '#a855f7' },
  { id: 'magenta', label: 'Magentas', shortLabel: 'Mag', centerHue: 320, swatchClass: 'bg-pink-500', hex: '#ec4899' },
];

function createDefaultColorMixer(): ColorMixerMap {
  return {
    red: { hue: 0, saturation: 0, luminance: 0 },
    orange: { hue: 0, saturation: 0, luminance: 0 },
    yellow: { hue: 0, saturation: 0, luminance: 0 },
    green: { hue: 0, saturation: 0, luminance: 0 },
    aqua: { hue: 0, saturation: 0, luminance: 0 },
    blue: { hue: 0, saturation: 0, luminance: 0 },
    purple: { hue: 0, saturation: 0, luminance: 0 },
    magenta: { hue: 0, saturation: 0, luminance: 0 },
  };
}

interface PhotoAdjustments {
  // White Balance
  temperature: number; // -100 to 100
  tint: number;        // -100 to 100
  // Tone / Light (Camera Raw)
  exposure: number;    // -100 to 100
  contrast: number;    // -100 to 100
  highlights: number;  // -100 to 100
  shadows: number;     // -100 to 100
  whites: number;      // -100 to 100
  blacks: number;      // -100 to 100
  vibrance: number;    // -100 to 100
  saturation: number;  // -100 to 100
  // Camera Raw Effects (Efectos)
  texture: number;     // -100 to 100 (Textura de frecuencias medias)
  clarity: number;     // -100 to 100 (Claridad / Microcontraste)
  dehaze: number;      // -100 to 100 (Borrar neblina atmosférica)
  glow: number;        // -100 to 100 (Resplandor / Brillo difuso en luces)
  sharpen: number;     // 0 to 100 (Nitidez)
  vignette: number;    // -100 to 100 (Viñeta)
  grain: number;       // 0 to 100 (Grano)
  // Camera Raw Color Mixer (HSL)
  colorMixer: ColorMixerMap;
  // Interactive Tone Curves (RGB, R, G, B)
  toneCurves: ToneCurvesState;
  // 3-Way Color Grading Wheels (Shadows, Midtones, Highlights)
  colorGrading: ColorGradingState;
  // Transform & Geometry
  rotation: number;    // 0, 90, 180, 270
  straighten: number;  // -45 to 45 degrees
  flipH: boolean;
  flipV: boolean;
  // Normalized Crop (0..1)
  cropX: number;
  cropY: number;
  cropW: number;
  cropH: number;
  aspectPreset: string;
}

const DEFAULT_PHOTO_ADJUSTMENTS: PhotoAdjustments = {
  temperature: 0,
  tint: 0,
  exposure: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
  vibrance: 0,
  saturation: 0,
  texture: 0,
  clarity: 0,
  dehaze: 0,
  glow: 0,
  sharpen: 0,
  vignette: 0,
  grain: 0,
  colorMixer: createDefaultColorMixer(),
  toneCurves: createDefaultToneCurves(),
  colorGrading: createDefaultColorGrading(),
  rotation: 0,
  straighten: 0,
  flipH: false,
  flipV: false,
  cropX: 0,
  cropY: 0,
  cropW: 1,
  cropH: 1,
  aspectPreset: 'free',
};

interface CameraRawPreset {
  id: string;
  name: string;
  badge: string;
  values: Partial<PhotoAdjustments>;
}

const CAMERA_RAW_PRESETS: CameraRawPreset[] = [
  {
    id: 'original',
    name: 'Original Neutro',
    badge: 'RAW',
    values: {
      temperature: 0, tint: 0, exposure: 0, contrast: 0,
      highlights: 0, shadows: 0, whites: 0, blacks: 0,
      texture: 0, clarity: 0, dehaze: 0, glow: 0,
      vibrance: 0, saturation: 0, sharpen: 0, vignette: 0, grain: 0,
      colorMixer: createDefaultColorMixer()
    }
  },
  {
    id: 'vivid-raw',
    name: 'Camera Raw Vivo',
    badge: 'PRO',
    values: {
      temperature: 6, tint: 2, exposure: 8, contrast: 18,
      highlights: -22, shadows: 28, whites: 14, blacks: -12,
      texture: 18, clarity: 22, dehaze: 14, glow: 6,
      vibrance: 30, saturation: 6, sharpen: 22, vignette: -10, grain: 0
    }
  },
  {
    id: 'arch-hdr',
    name: 'Arquitectura / Render Pro',
    badge: 'HDR',
    values: {
      temperature: -4, tint: 0, exposure: 10, contrast: 16,
      highlights: -42, shadows: 48, whites: 18, blacks: -14,
      texture: 32, clarity: 36, dehaze: 24, glow: 14,
      vibrance: 20, saturation: 6, sharpen: 35, vignette: 0, grain: 0
    }
  },
  {
    id: 'warm-portrait',
    name: 'Retrato Suave Cálido',
    badge: 'PIEL',
    values: {
      temperature: 22, tint: 5, exposure: 10, contrast: 8,
      highlights: -18, shadows: 22, whites: 8, blacks: -6,
      texture: -24, clarity: -10, dehaze: 0, glow: 22,
      vibrance: 18, saturation: 4, sharpen: 10, vignette: -16, grain: 4
    }
  },
  {
    id: 'cine-teal',
    name: 'Cine Teal & Orange',
    badge: 'FILM',
    values: {
      temperature: -10, tint: -4, exposure: 4, contrast: 26,
      highlights: -28, shadows: 18, whites: 10, blacks: -20,
      texture: 10, clarity: 20, dehaze: 18, glow: 10,
      vibrance: 24, saturation: -4, sharpen: 18, vignette: -26, grain: 10,
      colorMixer: {
        ...createDefaultColorMixer(),
        orange: { hue: -8, saturation: 28, luminance: 12 },
        aqua: { hue: 12, saturation: 35, luminance: -10 },
        blue: { hue: -18, saturation: 24, luminance: -16 },
      }
    }
  },
  {
    id: 'bw-fine',
    name: 'Blanco y Negro Puro',
    badge: 'B&W',
    values: {
      temperature: 0, tint: 0, exposure: 6, contrast: 34,
      highlights: -20, shadows: 16, whites: 24, blacks: -26,
      texture: 28, clarity: 34, dehaze: 22, glow: 8,
      vibrance: 0, saturation: -100, sharpen: 28, vignette: -24, grain: 16
    }
  }
];

const ASPECT_RATIOS: { id: string; label: string; ratio: number | null }[] = [
  { id: 'free', label: 'Original / Libre', ratio: null },
  { id: '1:1', label: '1:1 Cuadrado', ratio: 1 },
  { id: '4:5', label: '4:5 Retrato IG', ratio: 4 / 5 },
  { id: '16:9', label: '16:9 Horizontal', ratio: 16 / 9 },
  { id: '9:16', label: '9:16 Vertical Reel', ratio: 9 / 16 },
  { id: '4:3', label: '4:3 Clásico', ratio: 4 / 3 },
  { id: '3:2', label: '3:2 Fotografía', ratio: 3 / 2 },
];

function clampByte(val: number): number {
  return val < 0 ? 0 : val > 255 ? 255 : val | 0;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      case bn:
        h = (rn - gn) / d + 4;
        break;
    }
    h *= 60;
  }
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hue = ((h % 360) + 360) % 360;
  if (s <= 0) {
    const gray = clampByte(l * 255);
    return [gray, gray, gray];
  }
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  let r1 = 0, g1 = 0, b1 = 0;
  if (hue < 60) [r1, g1, b1] = [c, x, 0];
  else if (hue < 120) [r1, g1, b1] = [x, c, 0];
  else if (hue < 180) [r1, g1, b1] = [0, c, x];
  else if (hue < 240) [r1, g1, b1] = [0, x, c];
  else if (hue < 300) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];

  return [
    clampByte((r1 + m) * 255),
    clampByte((g1 + m) * 255),
    clampByte((b1 + m) * 255),
  ];
}

function angularHueDistance(h1: number, h2: number): number {
  const diff = Math.abs(h1 - h2) % 360;
  return diff > 180 ? 360 - diff : diff;
}

function detectClosestColorChannel(r: number, g: number, b: number): ColorChannelId {
  const [h] = rgbToHsl(r, g, b);
  let best: ColorChannelId = 'red';
  let minDist = 999;
  for (const ch of COLOR_CHANNELS) {
    const d = angularHueDistance(h, ch.centerHue);
    if (d < minDist) {
      minDist = d;
      best = ch.id;
    }
  }
  return best;
}

function formatSeconds(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00.0';
  const mins = Math.floor(sec / 60);
  const rem = sec - mins * 60;
  return `${mins}:${rem < 10 ? '0' : ''}${rem.toFixed(1)}`;
}

const SliderControl: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  gradientClass?: string;
  onChange: (val: number) => void;
  onReset?: () => void;
}> = ({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  gradientClass = 'from-gray-700 via-gray-500 to-purple-500',
  onChange,
  onReset,
}) => {
  const isModified = value !== 0;
  return (
    <div className="space-y-1.5 py-0.5 select-none">
      <div className="flex items-center justify-between text-xs">
        <button
          type="button"
          onDoubleClick={onReset}
          onClick={onReset}
          title="Toca para restablecer este control a 0"
          className={`font-semibold transition-colors text-left flex items-center gap-1.5 ${
            isModified ? 'text-purple-300 hover:text-white' : 'text-gray-300 hover:text-white'
          }`}
        >
          <span>{label}</span>
          {isModified && (
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 inline-block" />
          )}
        </button>
        <div className="flex items-center gap-1.5">
          {isModified && onReset && (
            <button
              type="button"
              onClick={onReset}
              className="text-[11px] text-gray-400 hover:text-purple-300 px-1.5 py-0.5 rounded-md bg-white/5 active:scale-95"
              title="Resetear a 0"
            >
              ↺
            </button>
          )}
          <span
            className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded-lg min-w-[38px] text-center ${
              isModified
                ? 'bg-purple-500/25 text-purple-200 border border-purple-400/40 shadow-sm'
                : 'bg-white/5 text-gray-400 border border-white/5'
            }`}
          >
            {value > 0 && min < 0 ? `+${value}` : value}
            {unit}
          </span>
        </div>
      </div>
      <div className="relative flex items-center py-1">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={`w-full h-2 rounded-full appearance-none cursor-pointer touch-pan-y bg-gradient-to-r ${gradientClass} accent-purple-400`}
        />
      </div>
    </div>
  );
};

const EdicionTab: React.FC = () => {
  // Starts with 'none' so ONLY the top drag-and-drop box is shown until a photo or video is loaded!
  const [activeEditor, setActiveEditor] = useState<ActiveEditorType>('none');
  const [isDraggingGlobal, setIsDraggingGlobal] = useState<boolean>(false);
  const dragDepthRef = useRef<number>(0);

  // ==================== PHOTO STUDIO STATE ====================
  const [photoSourceUrl, setPhotoSourceUrl] = useState<string | null>(null);
  const [photoFileName, setPhotoFileName] = useState<string>('foto-editada');
  const [photoNaturalSize, setPhotoNaturalSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [photoAdj, setPhotoAdj] = useState<PhotoAdjustments>(DEFAULT_PHOTO_ADJUSTMENTS);
  const [history, setHistory] = useState<PhotoAdjustments[]>([DEFAULT_PHOTO_ADJUSTMENTS]);
  const [historyIdx, setHistoryIdx] = useState<number>(0);
  const [activePhotoPanel, setActivePhotoPanel] = useState<'raw' | 'curves' | 'hsl' | 'grading' | 'effects' | 'crop' | 'export'>('raw');
  const [selectedColorChannel, setSelectedColorChannel] = useState<ColorChannelId>('red');
  const [hslViewMode, setHslViewMode] = useState<'channel' | 'hue' | 'saturation' | 'luminance'>('channel');
  const [isPickingColorChannel, setIsPickingColorChannel] = useState<boolean>(false);
  const [hslTatTargetProp, setHslTatTargetProp] = useState<'saturation' | 'luminance' | 'hue'>('saturation');
  const [hslDragState, setHslDragState] = useState<{
    active: boolean;
    channel: ColorChannelId;
    prop: 'saturation' | 'luminance' | 'hue';
    startX: number;
    startVal: number;
    currentVal: number;
  } | null>(null);
  const [showOriginalHold, setShowOriginalHold] = useState<boolean>(false);
  const [splitCompare, setSplitCompare] = useState<boolean>(false);
  const [splitPosition, setSplitPosition] = useState<number>(50);
  const [isDraggingSplitLine, setIsDraggingSplitLine] = useState<boolean>(false);
  const [showShadowClipping, setShowShadowClipping] = useState<boolean>(false);
  const [showHighlightClipping, setShowHighlightClipping] = useState<boolean>(false);
  const [customPresets, setCustomPresets] = useState<CameraRawPreset[]>([]);
  const [isCreatingPreset, setIsCreatingPreset] = useState<boolean>(false);
  const [newPresetName, setNewPresetName] = useState<string>('');
  const [isPickingWhiteBalance, setIsPickingWhiteBalance] = useState<boolean>(false);
  const [showGridOverlay, setShowGridOverlay] = useState<boolean>(false);
  const [exportFormat, setExportFormat] = useState<'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif' | 'application/pdf'>('image/jpeg');
  const [exportQuality, setExportQuality] = useState<number>(92);
  const [exportScale, setExportScale] = useState<number>(1);
  const [estimatedBytes, setEstimatedBytes] = useState<number | null>(null);
  const [histogramData, setHistogramData] = useState<{ r: number[]; g: number[]; b: number[]; l: number[] }>({
    r: new Array(64).fill(0),
    g: new Array(64).fill(0),
    b: new Array(64).fill(0),
    l: new Array(64).fill(0),
  });

  const loadedImageRef = useRef<HTMLImageElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const universalInputRef = useRef<HTMLInputElement | null>(null);
  const [edicionSubMode, setEdicionSubMode] = useState<'media' | 'pdf'>('media');
  const [droppedPdfFiles, setDroppedPdfFiles] = useState<File[]>([]);
  const baseGeometryCacheRef = useRef<{
    key: string;
    width: number;
    height: number;
    pixels: Uint8ClampedArray;
  } | null>(null);
  const rafRenderRef = useRef<number | null>(null);
  const histThrottleRef = useRef<number>(0);

  // ==================== VIDEO STUDIO STATE ====================
  const [videoClips, setVideoClips] = useState<VideoClipItem[]>([]);
  const [videoHistory, setVideoHistory] = useState<VideoClipItem[][]>([]);
  const [videoHistoryIdx, setVideoHistoryIdx] = useState<number>(-1);
  const [activeClipId, setActiveClipId] = useState<string | null>(null);
  const [activeVideoPanel, setActiveVideoPanel] = useState<ActiveVideoPanelType>('hsl');
  const [selectedVideoColorChannel, setSelectedVideoColorChannel] = useState<ColorChannelId>('red');
  const [videoHslViewMode, setVideoHslViewMode] = useState<'channel' | 'saturation' | 'luminance' | 'hue'>('channel');
  const [isPickingVideoColor, setIsPickingVideoColor] = useState<boolean>(false);
  const [videoHslBrushProp, setVideoHslBrushProp] = useState<'saturation' | 'luminance' | 'hue'>('saturation');
  const [videoHslDragState, setVideoHslDragState] = useState<{
    active: boolean;
    channel: ColorChannelId;
    prop: 'saturation' | 'luminance' | 'hue';
    startX: number;
    startVal: number;
    currentVal: number;
  } | null>(null);
  const [videoSplitCompare, setVideoSplitCompare] = useState<boolean>(false);
  const [videoSplitPosition, setVideoSplitPosition] = useState<number>(50);
  const [isDraggingVideoSplit, setIsDraggingVideoSplit] = useState<boolean>(false);
  const [videoHoldOriginal, setVideoHoldOriginal] = useState<boolean>(false);
  const [sequenceFadeIn, setSequenceFadeIn] = useState<{
    enabled: boolean;
    type: 'black' | 'white';
    duration: number;
  }>({ enabled: false, type: 'black', duration: 0.6 });
  const [sequenceFadeOut, setSequenceFadeOut] = useState<{
    enabled: boolean;
    type: 'black' | 'white';
    duration: number;
  }>({ enabled: true, type: 'black', duration: 0.8 });
  const [compressionPresetId, setCompressionPresetId] = useState<VideoCompressionPresetId>('mobile');
  const [customVideoBitrateMbps, setCustomVideoBitrateMbps] = useState<number>(2.2);
  const [exportFps, setExportFps] = useState<24 | 30 | 60>(30);

  const [isPlayingVideo, setIsPlayingVideo] = useState<boolean>(false);
  const [currentVideoTime, setCurrentVideoTime] = useState<number>(0);
  const [isPlayingSequence, setIsPlayingSequence] = useState<boolean>(false);
  const [isExportingVideo, setIsExportingVideo] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [sequenceResolution, setSequenceResolution] = useState<'1280x720' | '1920x1080' | '720x1280' | '1080x1080'>('1280x720');
  const [fitMode, setFitMode] = useState<'blur' | 'contain' | 'cover'>('blur');

  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const videoPreviewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastPhotoHistTimeRef = useRef<number>(0);
  const lastVideoHistTimeRef = useRef<number>(0);
  const shouldAutoPlayNextClipRef = useRef<boolean>(false);
  const switchingClipRef = useRef<boolean>(false);
  const lastUiTimeUpdateRef = useRef<number>(0);

  const activeClip = useMemo(
    () => videoClips.find((c) => c.id === activeClipId) || videoClips[0] || null,
    [videoClips, activeClipId]
  );

  // Push adjustment state to undo/redo stack (coalesces rapid slider ticks within 350ms for 1-step Ctrl+Z)
  const updatePhotoAdj = useCallback(
    (updater: Partial<PhotoAdjustments> | ((prev: PhotoAdjustments) => PhotoAdjustments)) => {
      const now = performance.now();
      const shouldCoalesce = now - lastPhotoHistTimeRef.current < 350;
      lastPhotoHistTimeRef.current = now;

      setPhotoAdj((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
        setHistory((h) => {
          const sliced = h.slice(0, historyIdx + 1);
          if (shouldCoalesce && sliced.length > 1) {
            const replaced = [...sliced.slice(0, -1), next];
            setHistoryIdx(replaced.length - 1);
            return replaced;
          }
          const updated = [...sliced, next].slice(-35);
          setHistoryIdx(updated.length - 1);
          return updated;
        });
        return next;
      });
    },
    [historyIdx]
  );

  // Push video clips state to undo/redo stack (supports Ctrl+Z and Ctrl+Y)
  const commitVideoClips = useCallback(
    (
      updater: VideoClipItem[] | ((prev: VideoClipItem[]) => VideoClipItem[]),
      forceNewHistoryStep = false
    ) => {
      const now = performance.now();
      const shouldCoalesce = !forceNewHistoryStep && now - lastVideoHistTimeRef.current < 350;
      lastVideoHistTimeRef.current = now;

      setVideoClips((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        const snapshot = cloneVideoClipsList(next);
        setVideoHistory((h) => {
          const sliced = h.slice(0, videoHistoryIdx + 1);
          if (shouldCoalesce && sliced.length > 1) {
            const replaced = [...sliced.slice(0, -1), snapshot];
            setVideoHistoryIdx(replaced.length - 1);
            return replaced;
          }
          const updated = [...sliced, snapshot].slice(-30);
          setVideoHistoryIdx(updated.length - 1);
          return updated;
        });
        return next;
      });
    },
    [videoHistoryIdx]
  );

  const handleResetEntirePhoto = () => {
    const fresh: PhotoAdjustments = {
      ...DEFAULT_PHOTO_ADJUSTMENTS,
      colorMixer: createDefaultColorMixer(),
      toneCurves: createDefaultToneCurves(),
      colorGrading: createDefaultColorGrading(),
    };
    updatePhotoAdj(fresh);
    toast.success('Toda la fotografía fue restablecida a su estado original');
  };

  const handleResetCurrentPanel = () => {
    if (activePhotoPanel === 'raw') {
      updatePhotoAdj({
        temperature: 0,
        tint: 0,
        exposure: 0,
        contrast: 0,
        highlights: 0,
        shadows: 0,
        whites: 0,
        blacks: 0,
        vibrance: 0,
        saturation: 0,
      });
      toast.info('Panel de Luz y Equilibrio de Blancos restablecido');
    } else if (activePhotoPanel === 'curves') {
      updatePhotoAdj({ toneCurves: createDefaultToneCurves() });
      toast.info('Curvas de Tonos restablecidas');
    } else if (activePhotoPanel === 'hsl') {
      updatePhotoAdj({ colorMixer: createDefaultColorMixer() });
      toast.info('Mezclador de Colores HSL restablecido');
    } else if (activePhotoPanel === 'grading') {
      updatePhotoAdj({ colorGrading: createDefaultColorGrading() });
      toast.info('Graduación de Color (3 Ruedas) restablecida');
    } else if (activePhotoPanel === 'effects') {
      updatePhotoAdj({
        texture: 0,
        clarity: 0,
        dehaze: 0,
        glow: 0,
        sharpen: 0,
        vignette: 0,
        grain: 0,
      });
      toast.info('Panel de Efectos (Textura, Claridad, Neblina, Resplandor) restablecido');
    } else if (activePhotoPanel === 'crop') {
      updatePhotoAdj({
        rotation: 0,
        straighten: 0,
        flipH: false,
        flipV: false,
        cropX: 0,
        cropY: 0,
        cropW: 1,
        cropH: 1,
        aspectPreset: 'free',
      });
      toast.info('Recorte y Giro restablecidos');
    }
  };

  const handleSaveCustomPreset = () => {
    const trimmed = newPresetName.trim();
    if (!trimmed) {
      toast.warning('Escribe un nombre para tu Preset');
      return;
    }
    const newPreset: CameraRawPreset = {
      id: `custom-${Date.now()}`,
      name: trimmed,
      badge: 'MIO',
      values: {
        temperature: photoAdj.temperature,
        tint: photoAdj.tint,
        exposure: photoAdj.exposure,
        contrast: photoAdj.contrast,
        highlights: photoAdj.highlights,
        shadows: photoAdj.shadows,
        whites: photoAdj.whites,
        blacks: photoAdj.blacks,
        vibrance: photoAdj.vibrance,
        saturation: photoAdj.saturation,
        texture: photoAdj.texture,
        clarity: photoAdj.clarity,
        dehaze: photoAdj.dehaze,
        glow: photoAdj.glow,
        sharpen: photoAdj.sharpen,
        vignette: photoAdj.vignette,
        grain: photoAdj.grain,
        colorMixer: JSON.parse(JSON.stringify(photoAdj.colorMixer)),
        toneCurves: JSON.parse(JSON.stringify(photoAdj.toneCurves)),
        colorGrading: JSON.parse(JSON.stringify(photoAdj.colorGrading)),
      },
    };
    setCustomPresets((prev) => [...prev, newPreset]);
    setNewPresetName('');
    setIsCreatingPreset(false);
    toast.success(`Preset "${trimmed}" guardado en tu barra de Presets`);
  };

  const updateColorMixerChannel = (channel: ColorChannelId, patch: Partial<HSLChannelValues>) => {
    updatePhotoAdj((prev) => ({
      ...prev,
      colorMixer: {
        ...prev.colorMixer,
        [channel]: {
          ...prev.colorMixer[channel],
          ...patch,
        },
      },
    }));
  };

  const handleUndoPhoto = useCallback(() => {
    if (historyIdx > 0) {
      const nextIdx = historyIdx - 1;
      setHistoryIdx(nextIdx);
      setPhotoAdj(history[nextIdx]);
      toast.info('Deshacer aplicado (Ctrl+Z)');
    }
  }, [historyIdx, history]);

  const handleRedoPhoto = useCallback(() => {
    if (historyIdx < history.length - 1) {
      const nextIdx = historyIdx + 1;
      setHistoryIdx(nextIdx);
      setPhotoAdj(history[nextIdx]);
      toast.info('Rehacer aplicado (Ctrl+Y)');
    }
  }, [historyIdx, history]);

  const handleUndoVideo = useCallback(() => {
    if (videoHistoryIdx > 0) {
      const nextIdx = videoHistoryIdx - 1;
      const restored = cloneVideoClipsList(videoHistory[nextIdx]);
      setVideoHistoryIdx(nextIdx);
      setVideoClips(restored);
      if (restored.length > 0 && !restored.some((c) => c.id === activeClipId)) {
        setActiveClipId(restored[0].id);
      }
      toast.info('Deshacer en video aplicado (Ctrl+Z)');
    }
  }, [videoHistoryIdx, videoHistory, activeClipId]);

  const handleRedoVideo = useCallback(() => {
    if (videoHistoryIdx >= 0 && videoHistoryIdx < videoHistory.length - 1) {
      const nextIdx = videoHistoryIdx + 1;
      const restored = cloneVideoClipsList(videoHistory[nextIdx]);
      setVideoHistoryIdx(nextIdx);
      setVideoClips(restored);
      if (restored.length > 0 && !restored.some((c) => c.id === activeClipId)) {
        setActiveClipId(restored[0].id);
      }
      toast.info('Rehacer en video aplicado (Ctrl+Y)');
    }
  }, [videoHistoryIdx, videoHistory, activeClipId]);

  // Global Keyboard Shortcuts: Ctrl+Z (Undo) and Ctrl+Y / Ctrl+Shift+Z (Redo) for both Photo & Video
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (activeEditor === 'none') return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') &&
        (target as HTMLInputElement).type === 'text'
      ) {
        return;
      }

      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      if (!isCtrlOrMeta) return;

      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (activeEditor === 'photo') {
          handleUndoPhoto();
        } else if (activeEditor === 'video') {
          handleUndoVideo();
        }
      } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
        e.preventDefault();
        if (activeEditor === 'photo') {
          handleRedoPhoto();
        } else if (activeEditor === 'video') {
          handleRedoVideo();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeEditor, handleUndoPhoto, handleRedoPhoto, handleUndoVideo, handleRedoVideo]);

  // Load Photo File
  const handlePhotoFiles = (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (isVideoFile(file)) {
      handleVideoFiles(files);
      return;
    }
    if (!isPhotoFile(file)) {
      toast.error('Selecciona un archivo de imagen o video válido');
      return;
    }

    const baseName = file.name.replace(/\.[^/.]+$/, '');
    setPhotoFileName(baseName || 'foto-editada');

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        loadedImageRef.current = img;
        setPhotoNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
        setPhotoSourceUrl(dataUrl);
        const fresh: PhotoAdjustments = {
          ...DEFAULT_PHOTO_ADJUSTMENTS,
          colorMixer: createDefaultColorMixer(),
          toneCurves: createDefaultToneCurves(),
          colorGrading: createDefaultColorGrading(),
        };
        baseGeometryCacheRef.current = null;
        setPhotoAdj(fresh);
        setHistory([fresh]);
        setHistoryIdx(0);
        setActiveEditor('photo');
        toast.success(`Foto detectada → Panel Camera Raw desplegado (${img.naturalWidth} × ${img.naturalHeight} px)`);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // ==================== VIDEO STUDIO HANDLERS ====================
  const handleVideoFiles = (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;
    const arr = Array.from(files);
    const validVideos = arr.filter(isVideoFile);

    if (validVideos.length === 0) {
      if (isPhotoFile(arr[0])) {
        handlePhotoFiles(arr);
        return;
      }
      toast.error('Selecciona uno o varios archivos de video o fotografía válidos');
      return;
    }

    setActiveEditor('video');

    validVideos.forEach((file) => {
      const url = URL.createObjectURL(file);
      const tempVideo = document.createElement('video');
      tempVideo.preload = 'metadata';
      tempVideo.muted = true;
      tempVideo.playsInline = true;
      let finalized = false;

      const finalizeClip = (durVal: number, wVal: number, hVal: number) => {
        if (finalized) return;
        finalized = true;
        const dur = Number.isFinite(durVal) && durVal > 0 ? durVal : 10;
        const newClip = createDefaultVideoClip(
          file,
          url,
          dur,
          wVal || 1280,
          hVal || 720
        );
        commitVideoClips((prev) => {
          const next = [...prev, newClip];
          if (prev.length === 0) {
            setActiveClipId(newClip.id);
          }
          return next;
        }, true);
      };

      tempVideo.onloadedmetadata = () => {
        finalizeClip(tempVideo.duration, tempVideo.videoWidth, tempVideo.videoHeight);
      };
      tempVideo.onerror = () => {
        finalizeClip(10, 1280, 720);
      };
      // Safety fallback in case mobile browser defers metadata on background video element
      setTimeout(() => {
        finalizeClip(tempVideo.duration || 10, tempVideo.videoWidth || 1280, tempVideo.videoHeight || 720);
      }, 1500);

      tempVideo.src = url;
      try {
        tempVideo.load();
      } catch (_) {}
    });

    toast.success(`Video(s) detectado(s) → Estudio de Video desplegado (${validVideos.length} clip${validVideos.length > 1 ? 's' : ''})`);
  };

  // Universal Auto-Detector for Drag & Drop or Unified Picker
  const handleAutoDetectFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const arr = Array.from(files);
    if (arr.some(isPdfFile)) {
      setDroppedPdfFiles(arr.filter(isPdfFile));
      setEdicionSubMode('pdf');
      toast.success('Archivo PDF detectado → Abriendo Remb PDF 2.0');
      return;
    }
    if (arr.some(isVideoFile)) {
      setEdicionSubMode('media');
      handleVideoFiles(arr);
      return;
    }
    if (arr.some(isPhotoFile)) {
      setEdicionSubMode('media');
      handlePhotoFiles(arr);
      return;
    }
    toast.error('Formato no reconocido. Arrastra una foto (JPG, PNG, WEBP, AVIF), un video (MP4, WEBM, MOV) o un PDF.');
  };

  // High-Speed 60fps Camera Raw Pixel Processing Engine
  const renderProcessedPhotoToCanvas = useCallback(
    (
      targetCanvas: HTMLCanvasElement,
      img: HTMLImageElement,
      adj: PhotoAdjustments,
      maxDimensionLimit?: number,
      includeOriginalComparison?: {
        holdOriginal: boolean;
        split: boolean;
        splitPct: number;
        shadowClip?: boolean;
        highlightClip?: boolean;
      }
    ) => {
      const rot = ((adj.rotation % 360) + 360) % 360;
      const swapDims = rot === 90 || rot === 270;

      const cx = Math.max(0, Math.min(0.95, adj.cropX));
      const cy = Math.max(0, Math.min(0.95, adj.cropY));
      const cw = Math.max(0.05, Math.min(1 - cx, adj.cropW));
      const ch = Math.max(0.05, Math.min(1 - cy, adj.cropH));

      const srcX = Math.round(cx * img.naturalWidth);
      const srcY = Math.round(cy * img.naturalHeight);
      const srcW = Math.max(1, Math.round(cw * img.naturalWidth));
      const srcH = Math.max(1, Math.round(ch * img.naturalHeight));

      const baseOutW = swapDims ? srcH : srcW;
      const baseOutH = swapDims ? srcW : srcH;

      let scale = 1;
      if (maxDimensionLimit && Math.max(baseOutW, baseOutH) > maxDimensionLimit) {
        scale = maxDimensionLimit / Math.max(baseOutW, baseOutH);
      }

      const outW = Math.max(1, Math.round(baseOutW * scale));
      const outH = Math.max(1, Math.round(baseOutH * scale));

      if (targetCanvas.width !== outW) targetCanvas.width = outW;
      if (targetCanvas.height !== outH) targetCanvas.height = outH;

      const ctx = targetCanvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      // Geometry cache key: avoids re-decoding the HTMLImageElement on every slider tick!
      const geomKey = maxDimensionLimit
        ? `${img.src.length}:${outW}x${outH}:${rot}:${adj.straighten}:${adj.flipH}:${adj.flipV}:${srcX},${srcY},${srcW},${srcH}`
        : '';

      let imageData: ImageData;
      if (
        maxDimensionLimit &&
        baseGeometryCacheRef.current &&
        baseGeometryCacheRef.current.key === geomKey
      ) {
        imageData = new ImageData(
          new Uint8ClampedArray(baseGeometryCacheRef.current.pixels),
          outW,
          outH
        );
      } else {
        ctx.save();
        ctx.clearRect(0, 0, outW, outH);
        ctx.translate(outW / 2, outH / 2);

        const totalAngleRad = ((rot + adj.straighten) * Math.PI) / 180;
        ctx.rotate(totalAngleRad);

        if (Math.abs(adj.straighten) > 0.1) {
          const rad = Math.abs((adj.straighten * Math.PI) / 180);
          const zoomFactor = 1 + Math.sin(rad) * 1.15;
          ctx.scale(zoomFactor, zoomFactor);
        }

        ctx.scale(adj.flipH ? -1 : 1, adj.flipV ? -1 : 1);

        const drawW = swapDims ? outH : outW;
        const drawH = swapDims ? outW : outH;
        ctx.drawImage(img, srcX, srcY, srcW, srcH, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();

        imageData = ctx.getImageData(0, 0, outW, outH);
        if (maxDimensionLimit) {
          baseGeometryCacheRef.current = {
            key: geomKey,
            width: outW,
            height: outH,
            pixels: new Uint8ClampedArray(imageData.data),
          };
        }
      }

      if (includeOriginalComparison?.holdOriginal) {
        ctx.putImageData(imageData, 0, 0);
        return;
      }

      const data = imageData.data;
      const origCopy = includeOriginalComparison?.split
        ? baseGeometryCacheRef.current?.pixels || new Uint8ClampedArray(data)
        : null;

      // 1. Precompute 360-degree HSL LUT (eliminates all per-pixel Math.cos calls!)
      const hslLUT = buildHSL360LUT(adj.colorMixer);
      // 2. Precompute Interactive Tone Curve LUTs (Master RGB, R, G, B)
      const curveRGB = buildCurveLUT(adj.toneCurves?.rgb || []);
      const curveR = buildCurveLUT(adj.toneCurves?.r || []);
      const curveG = buildCurveLUT(adj.toneCurves?.g || []);
      const curveB = buildCurveLUT(adj.toneCurves?.b || []);
      const hasCustomCurves =
        !curveRGB.isIdentity || !curveR.isIdentity || !curveG.isIdentity || !curveB.isIdentity;
      // 3. Precompute 3-Way Color Grading LUT (Shadows, Midtones, Highlights)
      const gradingLUT = buildColorGradingLUT(adj.colorGrading);

      // Precompute Camera Raw parameters
      const expGain = Math.pow(2, adj.exposure / 45);
      const dehazeNorm = adj.dehaze / 100;
      const contrastVal = (adj.contrast + adj.dehaze * 0.35) * 1.8;
      const contrastFactor = (259 * (contrastVal + 255)) / (255 * (259 - contrastVal));

      const tempShift = adj.temperature * 0.95 + adj.dehaze * 0.08;
      const tintShift = adj.tint * 0.75;

      const highlightsNorm = adj.highlights / 100;
      const shadowsNorm = adj.shadows / 100;
      const whitesNorm = adj.whites / 100;
      const blacksNorm = adj.blacks / 100 - dehazeNorm * 0.22;
      const clarityNorm = adj.clarity / 100;
      const glowNorm = adj.glow / 100;
      const satNorm = 1 + (adj.saturation + adj.dehaze * 0.25) / 100;
      const vibNorm = adj.vibrance / 100;
      const vignetteNorm = adj.vignette / 100;
      const grainNorm = adj.grain / 100;

      // Build Combined 256-entry Tone + Curve LUT per channel
      const rLUT = new Uint8Array(256);
      const gLUT = new Uint8Array(256);
      const bLUT = new Uint8Array(256);

      for (let i = 0; i < 256; i++) {
        let v = (i / 255) * expGain;

        if (dehazeNorm !== 0) {
          if (dehazeNorm > 0) {
            v = Math.pow(Math.max(0, v), 1 + dehazeNorm * 0.42);
          } else {
            v = v * (1 + dehazeNorm * 0.45) - dehazeNorm * 0.38;
          }
        }

        const clampedV = v < 0 ? 0 : v > 1 ? 1 : v;
        const invV = 1 - clampedV;
        const shadowWeight = invV * invV;
        const highlightWeight = clampedV * clampedV;
        v += shadowsNorm * 0.38 * shadowWeight;
        v += highlightsNorm * 0.38 * highlightWeight;

        const blackWeight = shadowWeight * invV;
        const whiteWeight = highlightWeight * clampedV;
        v += blacksNorm * 0.26 * blackWeight;
        v += whitesNorm * 0.26 * whiteWeight;

        if (glowNorm !== 0) {
          v += glowNorm * 0.32 * highlightWeight;
        }

        let byteV = v * 255;
        byteV = contrastFactor * (byteV - 128) + 128;

        if (clarityNorm !== 0) {
          const norm = Math.max(0, Math.min(1, byteV / 255));
          const midMask = 4 * norm * (1 - norm);
          byteV += (norm - 0.5) * clarityNorm * 75 * midMask;
        }

        const baseByte = clampByte(byteV);
        if (hasCustomCurves) {
          const afterMaster = curveRGB.lut[baseByte];
          rLUT[i] = curveR.lut[afterMaster];
          gLUT[i] = curveG.lut[afterMaster];
          bLUT[i] = curveB.lut[afterMaster];
        } else {
          rLUT[i] = baseByte;
          gLUT[i] = baseByte;
          bLUT[i] = baseByte;
        }
      }

      const histR = new Array(64).fill(0);
      const histG = new Array(64).fill(0);
      const histB = new Array(64).fill(0);
      const histL = new Array(64).fill(0);

      const halfW = outW * 0.5;
      const halfH = outH * 0.5;
      const maxDistSq = halfW * halfW + halfH * halfH || 1;
      const splitX = includeOriginalComparison?.split
        ? Math.round((includeOriginalComparison.splitPct / 100) * outW)
        : -1;
      const showSClip = Boolean(includeOriginalComparison?.shadowClip);
      const showHClip = Boolean(includeOriginalComparison?.highlightClip);

      for (let y = 0; y < outH; y++) {
        const dy = y - halfH;
        const dySq = dy * dy;
        for (let x = 0; x < outW; x++) {
          const idx = (y * outW + x) * 4;

          if (origCopy && x < splitX) {
            data[idx] = origCopy[idx];
            data[idx + 1] = origCopy[idx + 1];
            data[idx + 2] = origCopy[idx + 2];
            continue;
          }

          let r = data[idx];
          let g = data[idx + 1];
          let b = data[idx + 2];

          // 1. White Balance
          if (tempShift !== 0 || tintShift !== 0) {
            r = clampByte(r + tempShift + tintShift * 0.45);
            g = clampByte(g - tintShift * 0.7);
            b = clampByte(b - tempShift + tintShift * 0.45);
          }

          // 2. Tone + Dehaze + Clarity + Glow + Custom Curves LUT
          r = rLUT[r];
          g = gLUT[g];
          b = bLUT[b];

          // 3. Fast 360-LUT HSL Color Mixer
          if (hslLUT.active) {
            const [h, s, l] = rgbToHslFast(r, g, b);
            if (s > 0.04) {
              const degIdx = ((h | 0) % 360 + 360) % 360;
              const hueDelta = hslLUT.hueShift[degIdx];
              const satDelta = hslLUT.satShift[degIdx];
              const lumDelta = hslLUT.lumShift[degIdx];

              if (hueDelta !== 0 || satDelta !== 0 || lumDelta !== 0) {
                const nextH = h + hueDelta;
                const nextS = Math.max(0, Math.min(1, s * (1 + satDelta)));
                const nextL = Math.max(0, Math.min(1, l + lumDelta * (1 - Math.abs(2 * l - 1) * 0.5)));
                [r, g, b] = hslToRgbFast(nextH, nextS, nextL);
              }
            }
          }

          // 4. 3-Way Color Grading (Sombras, Medios Tonos, Iluminaciones)
          if (gradingLUT.active) {
            const lumaByte = (r * 77 + g * 150 + b * 29) >> 8;
            r = clampByte(r + gradingLUT.rShift[lumaByte]);
            g = clampByte(g + gradingLUT.gShift[lumaByte]);
            b = clampByte(b + gradingLUT.bShift[lumaByte]);
          }

          // 5. Global Saturation & Vibrance
          if (satNorm !== 1 || vibNorm !== 0) {
            const luma = 0.299 * r + 0.587 * g + 0.114 * b;
            const maxC = r > g ? (r > b ? r : b) : (g > b ? g : b);
            const minC = r < g ? (r < b ? r : b) : (g < b ? g : b);
            const currentSat = (maxC - minC) * 0.00392156862745098;
            const vibBoost = vibNorm * (1 - currentSat * currentSat) * 1.15;
            const totalSat = Math.max(0, satNorm + vibBoost);

            r = clampByte(luma + (r - luma) * totalSat);
            g = clampByte(luma + (g - luma) * totalSat);
            b = clampByte(luma + (b - luma) * totalSat);
          }

          // 6. Optical Vignette
          if (vignetteNorm !== 0) {
            const dx = x - halfW;
            const distRatio = (dx * dx + dySq) / maxDistSq;
            const vigFactor = 1 + vignetteNorm * distRatio * 0.85;
            r = clampByte(r * vigFactor);
            g = clampByte(g * vigFactor);
            b = clampByte(b * vigFactor);
          }

          // 7. Film Grain
          if (grainNorm > 0) {
            const noise = (Math.random() - 0.5) * grainNorm * 64;
            r = clampByte(r + noise);
            g = clampByte(g + noise);
            b = clampByte(b + noise);
          }

          // Sample histogram every 8th pixel for instant speed
          if (((x + y) & 7) === 0) {
            histR[r >> 2]++;
            histG[g >> 2]++;
            histB[b >> 2]++;
            const l = (r * 77 + g * 150 + b * 29) >> 8;
            histL[l >> 2]++;
          }

          // Clipping Warning Overlay (Preview only)
          if (showSClip && r <= 3 && g <= 3 && b <= 3) {
            data[idx] = 34;
            data[idx + 1] = 211;
            data[idx + 2] = 238;
          } else if (showHClip && r >= 252 && g >= 252 && b >= 252) {
            data[idx] = 244;
            data[idx + 1] = 63;
            data[idx + 2] = 94;
          } else {
            data[idx] = r;
            data[idx + 1] = g;
            data[idx + 2] = b;
          }
        }
      }

      // 8. Texture + Sharpen Pass
      if ((adj.texture !== 0 || adj.sharpen > 0) && outW > 6 && outH > 6) {
        const texAmount = (adj.texture / 100) * 0.65;
        const sharpAmount = (adj.sharpen / 100) * 0.75;
        if (Math.abs(texAmount) + Math.abs(sharpAmount) > 0.01) {
          const srcBuf = new Uint8ClampedArray(data);
          const rowStride = outW * 4;
          const step2 = 2;
          for (let y = step2; y < outH - step2; y++) {
            for (let x = step2; x < outW - step2; x++) {
              if (origCopy && x < splitX) continue;
              const i = (y * outW + x) * 4;
              for (let c = 0; c < 3; c++) {
                const center = srcBuf[i + c];
                const avg1 =
                  (srcBuf[i - 4 + c] +
                    srcBuf[i + 4 + c] +
                    srcBuf[i - rowStride + c] +
                    srcBuf[i + rowStride + c]) *
                  0.25;
                const avg2 =
                  (srcBuf[i - 8 + c] +
                    srcBuf[i + 8 + c] +
                    srcBuf[i - rowStride * 2 + c] +
                    srcBuf[i + rowStride * 2 + c]) *
                  0.25;

                const nextVal =
                  center + (center - avg2) * texAmount + (center - avg1) * sharpAmount;
                data[i + c] = clampByte(nextVal);
              }
            }
          }
        }
      }

      // 9. Soft Glow Bloom Pass
      if (adj.glow > 8 && outW > 8 && outH > 8) {
        const bloomAlpha = Math.min(0.55, (adj.glow / 100) * 0.45);
        ctx.putImageData(imageData, 0, 0);
        const glowCanvas = document.createElement('canvas');
        glowCanvas.width = Math.max(16, Math.round(outW / 4));
        glowCanvas.height = Math.max(16, Math.round(outH / 4));
        const gCtx = glowCanvas.getContext('2d');
        if (gCtx) {
          gCtx.filter = 'blur(6px) brightness(125%)';
          gCtx.drawImage(targetCanvas, 0, 0, glowCanvas.width, glowCanvas.height);
          ctx.save();
          ctx.globalCompositeOperation = 'screen';
          ctx.globalAlpha = bloomAlpha;
          ctx.drawImage(glowCanvas, 0, 0, outW, outH);
          ctx.restore();
        }
      } else {
        ctx.putImageData(imageData, 0, 0);
      }

      // 10. Interactive Before/After Split Divider Line & Handle
      if (includeOriginalComparison?.split && splitX > 0) {
        ctx.save();
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(splitX, 0);
        ctx.lineTo(splitX, outH);
        ctx.stroke();

        // Center circular drag handle (< | >)
        const cyMid = outH / 2;
        ctx.beginPath();
        ctx.arc(splitX, cyMid, 16, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(17, 24, 39, 0.9)';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#c084fc';
        ctx.stroke();

        ctx.fillStyle = '#f3e8ff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('◀ ▶', splitX, cyMid + 4);

        ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(0,0,0,0.68)';
        ctx.fillRect(8, 8, 68, 22);
        ctx.fillRect(outW - 86, 8, 78, 22);
        ctx.fillStyle = '#e5e7eb';
        ctx.fillText('ORIGINAL', 14, 23);
        ctx.fillStyle = '#d8b4fe';
        ctx.fillText('EDITADO', outW - 76, 23);
        ctx.restore();
      }

      if (maxDimensionLimit) {
        const now = performance.now();
        if (now - histThrottleRef.current > 75) {
          histThrottleRef.current = now;
          setHistogramData({ r: histR, g: histG, b: histB, l: histL });
        }
      }
    },
    []
  );

  // Schedule 60fps preview render via requestAnimationFrame
  useEffect(() => {
    if (activeEditor !== 'photo' || !loadedImageRef.current || !previewCanvasRef.current) return;
    if (rafRenderRef.current) {
      cancelAnimationFrame(rafRenderRef.current);
    }
    rafRenderRef.current = requestAnimationFrame(() => {
      if (!loadedImageRef.current || !previewCanvasRef.current) return;
      renderProcessedPhotoToCanvas(previewCanvasRef.current, loadedImageRef.current, photoAdj, 960, {
        holdOriginal: showOriginalHold,
        split: splitCompare,
        splitPct: splitPosition,
        shadowClip: showShadowClipping,
        highlightClip: showHighlightClipping,
      });
    });
    return () => {
      if (rafRenderRef.current) cancelAnimationFrame(rafRenderRef.current);
    };
  }, [
    activeEditor,
    photoSourceUrl,
    photoAdj,
    showOriginalHold,
    splitCompare,
    splitPosition,
    showShadowClipping,
    showHighlightClipping,
    renderProcessedPhotoToCanvas,
  ]);

  // Estimate output file size when in export tab
  useEffect(() => {
    if (activeEditor !== 'photo' || !loadedImageRef.current || !previewCanvasRef.current) return;
    if (exportFormat === 'application/pdf') {
      setEstimatedBytes(null);
      return;
    }
    const timer = setTimeout(() => {
      previewCanvasRef.current?.toBlob(
        (blob) => {
          if (blob) {
            const previewPixels = (previewCanvasRef.current?.width || 1) * (previewCanvasRef.current?.height || 1);
            const fullW = Math.round(photoNaturalSize.w * photoAdj.cropW * exportScale);
            const fullH = Math.round(photoNaturalSize.h * photoAdj.cropH * exportScale);
            const fullPixels = Math.max(1, fullW * fullH);
            const ratio = Math.max(1, fullPixels / Math.max(1, previewPixels));
            setEstimatedBytes(Math.round(blob.size * Math.pow(ratio, 0.78)));
          }
        },
        exportFormat,
        exportQuality / 100
      );
    }, 180);
    return () => clearTimeout(timer);
  }, [activeEditor, photoAdj, exportFormat, exportQuality, exportScale, photoNaturalSize]);

  // Interactive Canvas Pointer Handlers:
  // 1. Targeted HSL Color Brush ("Elegir en Foto"): click & hold on a color -> drag RIGHT to increase, drag LEFT to decrease!
  // 2. White Balance Eyedropper
  // 3. Before/After Split Divider Line Drag
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!previewCanvasRef.current) return;
    const canvas = previewCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const normX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const normY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    const x = Math.min(canvas.width - 1, Math.max(0, Math.floor(normX * canvas.width)));
    const y = Math.min(canvas.height - 1, Math.max(0, Math.floor(normY * canvas.height)));

    // If Split Compare is active and user clicks near the split line (and not using eyedropper), drag the split line
    if (
      splitCompare &&
      !isPickingColorChannel &&
      !isPickingWhiteBalance &&
      Math.abs(normX * 100 - splitPosition) < 8
    ) {
      setIsDraggingSplitLine(true);
      canvas.setPointerCapture?.(e.pointerId);
      return;
    }

    if (!isPickingWhiteBalance && !isPickingColorChannel) return;

    // Sample from original base geometry buffer if available so repeated adjustments still detect true source color
    let r = 128,
      g = 128,
      b = 128;
    if (
      baseGeometryCacheRef.current &&
      baseGeometryCacheRef.current.width === canvas.width &&
      baseGeometryCacheRef.current.height === canvas.height
    ) {
      const pIdx = (y * canvas.width + x) * 4;
      r = baseGeometryCacheRef.current.pixels[pIdx];
      g = baseGeometryCacheRef.current.pixels[pIdx + 1];
      b = baseGeometryCacheRef.current.pixels[pIdx + 2];
    } else {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const pixel = ctx.getImageData(x, y, 1, 1).data;
      r = pixel[0];
      g = pixel[1];
      b = pixel[2];
    }

    if (isPickingColorChannel) {
      const detected = detectClosestColorChannel(r, g, b);
      setSelectedColorChannel(detected);
      const targetProp: 'saturation' | 'luminance' | 'hue' =
        hslViewMode === 'hue' || hslViewMode === 'saturation' || hslViewMode === 'luminance'
          ? hslViewMode
          : hslTatTargetProp;
      const startVal = photoAdj.colorMixer[detected][targetProp];
      setHslDragState({
        active: true,
        channel: detected,
        prop: targetProp,
        startX: e.clientX,
        startVal,
        currentVal: startVal,
      });
      canvas.setPointerCapture?.(e.pointerId);
      return;
    }

    if (isPickingWhiteBalance) {
      const avg = (r + g + b) / 3;
      const newTemp = Math.max(-100, Math.min(100, Math.round((b - r) * 0.75)));
      const newTint = Math.max(-100, Math.min(100, Math.round((g - avg) * 0.85)));

      updatePhotoAdj({ temperature: newTemp, tint: newTint });
      setIsPickingWhiteBalance(false);
      toast.success(
        `Balance de blancos calibrado (Temp: ${newTemp > 0 ? `+${newTemp}` : newTemp}, Matiz: ${
          newTint > 0 ? `+${newTint}` : newTint
        })`
      );
    }
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDraggingSplitLine && previewCanvasRef.current) {
      const rect = previewCanvasRef.current.getBoundingClientRect();
      const pct = Math.max(5, Math.min(95, Math.round(((e.clientX - rect.left) / rect.width) * 100)));
      setSplitPosition(pct);
      return;
    }

    if (!hslDragState || !hslDragState.active) return;

    // Dragging RIGHT (+dx) increases value; dragging LEFT (-dx) decreases value
    const dx = e.clientX - hslDragState.startX;
    const delta = Math.round(dx * 0.55);
    const nextVal = Math.max(-100, Math.min(100, hslDragState.startVal + delta));

    if (nextVal !== hslDragState.currentVal) {
      setHslDragState((prev) => (prev ? { ...prev, currentVal: nextVal } : null));
      // Update photoAdj directly during drag for 60fps fluidity without flooding undo history
      setPhotoAdj((prev) => ({
        ...prev,
        colorMixer: {
          ...prev.colorMixer,
          [hslDragState.channel]: {
            ...prev.colorMixer[hslDragState.channel],
            [hslDragState.prop]: nextVal,
          },
        },
      }));
    }
  };

  const handleCanvasPointerUp = () => {
    if (isDraggingSplitLine) {
      setIsDraggingSplitLine(false);
    }
    if (hslDragState && hslDragState.active) {
      // Commit final dragged value into undo history
      const finalChannel = hslDragState.channel;
      const finalProp = hslDragState.prop;
      const finalVal = hslDragState.currentVal;
      setHslDragState(null);
      updateColorMixerChannel(finalChannel, { [finalProp]: finalVal });
    }
  };

  // Auto-Analyze Image Histogram & Apply Optimal Camera Raw Settings
  const handleAutoEnhancePhoto = () => {
    if (!loadedImageRef.current) return;
    const img = loadedImageRef.current;
    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = 256;
    sampleCanvas.height = 256;
    const ctx = sampleCanvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(img, 0, 0, 256, 256);
    const { data } = ctx.getImageData(0, 0, 256, 256);

    let sumR = 0, sumG = 0, sumB = 0, sumL = 0;
    let darkCount = 0, brightCount = 0;
    const totalPixels = data.length / 4;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const l = 0.299 * r + 0.587 * g + 0.114 * b;
      sumR += r;
      sumG += g;
      sumB += b;
      sumL += l;
      if (l < 45) darkCount++;
      if (l > 215) brightCount++;
    }

    const avgR = sumR / totalPixels;
    const avgG = sumG / totalPixels;
    const avgB = sumB / totalPixels;
    const avgL = sumL / totalPixels;

    const autoExp = Math.max(-35, Math.min(35, Math.round(((128 - avgL) / 128) * 42)));
    const autoShadows = Math.min(55, Math.round((darkCount / totalPixels) * 115));
    const autoHighlights = -Math.min(50, Math.round((brightCount / totalPixels) * 125));
    const autoTemp = Math.max(-25, Math.min(25, Math.round((avgB - avgR) * 0.35)));
    const autoTint = Math.max(-18, Math.min(18, Math.round((avgG - (avgR + avgB) / 2) * 0.35)));

    updatePhotoAdj({
      exposure: autoExp,
      contrast: 16,
      highlights: autoHighlights,
      shadows: autoShadows,
      whites: 12,
      blacks: -10,
      temperature: autoTemp,
      tint: autoTint,
      texture: 14,
      clarity: 18,
      dehaze: 10,
      vibrance: 24,
      saturation: 4,
      sharpen: 18,
    });
    toast.success('Auto-Revelado Camera Raw aplicado según histograma de luz');
  };

  // Apply Aspect Ratio Preset to Photo Crop
  const handleSelectAspectPreset = (presetId: string, ratio: number | null) => {
    if (!photoNaturalSize.w || !photoNaturalSize.h) return;
    if (!ratio || presetId === 'free') {
      updatePhotoAdj({ cropX: 0, cropY: 0, cropW: 1, cropH: 1, aspectPreset: 'free' });
      return;
    }

    const rot = ((photoAdj.rotation % 360) + 360) % 360;
    const swap = rot === 90 || rot === 270;
    const imgW = swap ? photoNaturalSize.h : photoNaturalSize.w;
    const imgH = swap ? photoNaturalSize.w : photoNaturalSize.h;
    const currentAspect = imgW / imgH;

    let newW = 1;
    let newH = 1;
    if (currentAspect > ratio) {
      newW = ratio / currentAspect;
    } else {
      newH = currentAspect / ratio;
    }

    updatePhotoAdj({
      cropX: Number(((1 - newW) / 2).toFixed(3)),
      cropY: Number(((1 - newH) / 2).toFixed(3)),
      cropW: Number(newW.toFixed(3)),
      cropH: Number(newH.toFixed(3)),
      aspectPreset: presetId,
    });
  };

  // Export High-Resolution Processed Photo in Selected Format
  const handleExportPhoto = () => {
    if (!loadedImageRef.current) return;
    const img = loadedImageRef.current;
    const exportCanvas = document.createElement('canvas');
    const maxDim = Math.round(Math.max(img.naturalWidth, img.naturalHeight) * exportScale);

    renderProcessedPhotoToCanvas(exportCanvas, img, photoAdj, maxDim);

    if (exportFormat === 'application/pdf') {
      const orientation = exportCanvas.width >= exportCanvas.height ? 'l' : 'p';
      const pdf = new jsPDF({
        orientation,
        unit: 'px',
        format: [exportCanvas.width, exportCanvas.height],
      });
      const dataUrl = exportCanvas.toDataURL('image/jpeg', exportQuality / 100);
      pdf.addImage(dataUrl, 'JPEG', 0, 0, exportCanvas.width, exportCanvas.height);
      pdf.save(`${photoFileName}-raw.pdf`);
      toast.success(`Exportado como PDF (${exportCanvas.width} × ${exportCanvas.height} px)`);
      return;
    }

    const extMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/avif': 'avif',
    };
    const ext = extMap[exportFormat] || 'jpg';

    exportCanvas.toBlob(
      (blob) => {
        if (!blob) {
          toast.error('No se pudo exportar la imagen en este formato');
          return;
        }
        saveMediaBlob(blob, `${photoFileName}-raw.${ext}`);
        toast.success(`Imagen guardada como .${ext.toUpperCase()} (${exportCanvas.width} × ${exportCanvas.height} px)`);
      },
      exportFormat,
      exportQuality / 100
    );
  };

  const updateActiveClip = useCallback(
    (patch: Partial<VideoClipItem>, forceHistoryStep = false) => {
      if (!activeClip) return;
      commitVideoClips(
        (prev) => prev.map((c) => (c.id === activeClip.id ? { ...c, ...patch } : c)),
        forceHistoryStep
      );
    },
    [activeClip, commitVideoClips]
  );

  const updateClipById = useCallback(
    (clipId: string, patch: Partial<VideoClipItem>, forceHistoryStep = true) => {
      commitVideoClips(
        (prev) => prev.map((c) => (c.id === clipId ? { ...c, ...patch } : c)),
        forceHistoryStep
      );
    },
    [commitVideoClips]
  );

  const updateVideoColorMixerChannel = useCallback(
    (channel: ColorChannelId, patch: Partial<HSLChannelValues>) => {
      if (!activeClip) return;
      commitVideoClips((prev) =>
        prev.map((c) =>
          c.id === activeClip.id
            ? {
                ...c,
                colorMixer: {
                  ...c.colorMixer,
                  [channel]: {
                    ...c.colorMixer[channel],
                    ...patch,
                  },
                },
              }
            : c
        )
      );
    },
    [activeClip, commitVideoClips]
  );

  const handleApplyColorMixerToAllClips = () => {
    if (!activeClip) return;
    const clonedMixer = JSON.parse(JSON.stringify(activeClip.colorMixer));
    commitVideoClips(
      (prev) =>
        prev.map((c) => ({
          ...c,
          colorMixer: JSON.parse(JSON.stringify(clonedMixer)),
        })),
      true
    );
    toast.success(`Ajustes de Color HSL aplicados a los ${videoClips.length} videos de la secuencia`);
  };

  const handleResetVideoColorMixer = () => {
    if (!activeClip) return;
    updateActiveClip({ colorMixer: createDefaultColorMixer() }, true);
    toast.info('Colores HSL del video restablecidos a su estado original');
  };

  const handleResetActiveVideoClip = () => {
    if (!activeClip) return;
    updateActiveClip(
      {
        trimStart: 0,
        trimEnd: activeClip.duration,
        rotation: 0,
        flipH: false,
        flipV: false,
        exposure: 0,
        contrast: 0,
        highlights: 0,
        shadows: 0,
        saturation: 0,
        vibrance: 0,
        temperature: 0,
        tint: 0,
        vignette: 0,
        colorMixer: createDefaultColorMixer(),
        muted: false,
        volume: 100,
      },
      true
    );
    toast.success('Ajustes del clip de video restablecidos al original');
  };

  const handleApplyTransitionToAllClips = (type: VideoTransitionType, duration: number) => {
    commitVideoClips(
      (prev) =>
        prev.map((c) => ({
          ...c,
          transitionOutType: type,
          transitionOutDuration: duration,
        })),
      true
    );
    toast.success(
      `Transición (${type === 'black' ? 'A Negro' : type === 'white' ? 'A Blanco' : type === 'crossfade' ? 'Suave' : 'Corte'} • ${duration.toFixed(1)}s) aplicada entre todos los videos`
    );
  };

  const handleSplitActiveClip = () => {
    if (!activeClip) return;
    const splitPoint = Number(currentVideoTime.toFixed(2));
    if (splitPoint <= activeClip.trimStart + 0.3 || splitPoint >= activeClip.trimEnd - 0.3) {
      toast.warning('Coloca la aguja al menos a 0.3s dentro del rango del clip para cortarlo en dos');
      return;
    }

    const firstHalf: VideoClipItem = {
      ...activeClip,
      colorMixer: JSON.parse(JSON.stringify(activeClip.colorMixer)),
      name: `${activeClip.name} (Parte 1)`,
      trimEnd: splitPoint,
    };
    const secondHalf: VideoClipItem = {
      ...activeClip,
      colorMixer: JSON.parse(JSON.stringify(activeClip.colorMixer)),
      id: `clip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: `${activeClip.name} (Parte 2)`,
      trimStart: splitPoint,
    };

    commitVideoClips((prev) => {
      const idx = prev.findIndex((c) => c.id === activeClip.id);
      if (idx === -1) return prev;
      const copy = [...prev];
      copy.splice(idx, 1, firstHalf, secondHalf);
      return copy;
    }, true);
    toast.success(`Video cortado en dos partes en ${formatSeconds(splitPoint)}`);
  };

  const handleDuplicateClip = (clip: VideoClipItem) => {
    const dup: VideoClipItem = {
      ...clip,
      colorMixer: JSON.parse(JSON.stringify(clip.colorMixer)),
      id: `clip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: `${clip.name} (Copia)`,
    };
    commitVideoClips((prev) => {
      const idx = prev.findIndex((c) => c.id === clip.id);
      const copy = [...prev];
      copy.splice(idx + 1, 0, dup);
      return copy;
    }, true);
    toast.success('Clip duplicado en la línea de tiempo');
  };

  const handleMoveClip = (index: number, dir: -1 | 1) => {
    commitVideoClips((prev) => {
      const target = index + dir;
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    }, true);
  };

  const handleRemoveClip = (id: string) => {
    commitVideoClips((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (activeClipId === id) {
        setActiveClipId(next[0]?.id || null);
      }
      if (next.length === 0) {
        setActiveEditor('none');
      }
      return next;
    }, true);
  };

  const handleSeekGlobalVideoTime = (globalSec: number) => {
    if (videoClips.length === 0) return;
    let acc = 0;
    for (const c of videoClips) {
      const dur = Math.max(0.1, c.trimEnd - c.trimStart);
      if (globalSec <= acc + dur + 0.001) {
        const localTime = Math.min(c.trimEnd, Math.max(c.trimStart, c.trimStart + (globalSec - acc)));
        if (activeClip?.id !== c.id) {
          setActiveClipId(c.id);
          setTimeout(() => {
            if (videoElementRef.current) {
              videoElementRef.current.currentTime = localTime;
              setCurrentVideoTime(localTime);
            }
          }, 30);
        } else if (videoElementRef.current) {
          videoElementRef.current.currentTime = localTime;
          setCurrentVideoTime(localTime);
        }
        return;
      }
      acc += dur;
    }
  };

  const handleSelectCompressionPreset = (presetId: VideoCompressionPresetId) => {
    setCompressionPresetId(presetId);
    const found = VIDEO_COMPRESSION_PRESETS.find((p) => p.id === presetId);
    if (found) {
      setCustomVideoBitrateMbps(Number((found.videoBitsPerSecond / 1_000_000).toFixed(1)));
      setExportFps(found.fps);
    }
  };

  // Interactive Pointer Handlers on Video Monitor Canvas:
  // 1. Drag A/B Split Comparison Divider Line (< | >)
  // 2. Targeted HSL Brush ("Elegir en Video"): click & hold on a color in the video -> drag RIGHT to increase, drag LEFT to decrease!
  const handleVideoCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!videoPreviewCanvasRef.current || !activeClip) return;
    const canvas = videoPreviewCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const normX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const normY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    const x = Math.min(canvas.width - 1, Math.max(0, Math.floor(normX * canvas.width)));
    const y = Math.min(canvas.height - 1, Math.max(0, Math.floor(normY * canvas.height)));

    if (videoSplitCompare && !isPickingVideoColor && Math.abs(normX * 100 - videoSplitPosition) < 18) {
      setIsDraggingVideoSplit(true);
      canvas.setPointerCapture?.(e.pointerId);
      return;
    }

    if (isPickingVideoColor) {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const pixel = ctx.getImageData(x, y, 1, 1).data;
      const detected = detectClosestColorChannel(pixel[0], pixel[1], pixel[2]);
      setSelectedVideoColorChannel(detected);
      const targetProp: 'saturation' | 'luminance' | 'hue' =
        videoHslViewMode === 'saturation' ||
        videoHslViewMode === 'luminance' ||
        videoHslViewMode === 'hue'
          ? videoHslViewMode
          : videoHslBrushProp;
      const startVal = activeClip.colorMixer[detected][targetProp];
      setVideoHslDragState({
        active: true,
        channel: detected,
        prop: targetProp,
        startX: e.clientX,
        startVal,
        currentVal: startVal,
      });
      canvas.setPointerCapture?.(e.pointerId);
      return;
    }

    togglePlayActiveClip();
  };

  const handleVideoCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDraggingVideoSplit && videoPreviewCanvasRef.current) {
      const rect = videoPreviewCanvasRef.current.getBoundingClientRect();
      const pct = Math.max(5, Math.min(95, Math.round(((e.clientX - rect.left) / rect.width) * 100)));
      setVideoSplitPosition(pct);
      return;
    }

    if (!videoHslDragState || !videoHslDragState.active || !activeClip) return;
    const dx = e.clientX - videoHslDragState.startX;
    const delta = Math.round(dx * 0.55);
    const nextVal = Math.max(-100, Math.min(100, videoHslDragState.startVal + delta));

    if (nextVal !== videoHslDragState.currentVal) {
      setVideoHslDragState((prev) => (prev ? { ...prev, currentVal: nextVal } : null));
      setVideoClips((prev) =>
        prev.map((c) =>
          c.id === activeClip.id
            ? {
                ...c,
                colorMixer: {
                  ...c.colorMixer,
                  [videoHslDragState.channel]: {
                    ...c.colorMixer[videoHslDragState.channel],
                    [videoHslDragState.prop]: nextVal,
                  },
                },
              }
            : c
        )
      );
    }
  };

  const handleVideoCanvasPointerUp = () => {
    if (isDraggingVideoSplit) {
      setIsDraggingVideoSplit(false);
    }
    if (videoHslDragState && videoHslDragState.active) {
      const finalChannel = videoHslDragState.channel;
      const finalProp = videoHslDragState.prop;
      const finalVal = videoHslDragState.currentVal;
      setVideoHslDragState(null);
      updateVideoColorMixerChannel(finalChannel, { [finalProp]: finalVal });
    }
  };

  const drawVideoFrameToCanvas = useCallback(
    (
      videoEl: HTMLVideoElement,
      canvasEl: HTMLCanvasElement,
      clip: VideoClipItem,
      clipIdx: number,
      isPreviewMonitor = true
    ) => {
      const [baseW, baseH] = sequenceResolution.split('x').map(Number);
      // Use fast 540p/480p buffer on preview monitor for locked 60fps per-pixel HSL, full resolution on export
      const scaleFactor = isPreviewMonitor ? Math.min(1, 854 / Math.max(baseW, baseH)) : 1;
      const targetWidth = Math.max(2, Math.round(baseW * scaleFactor));
      const targetHeight = Math.max(2, Math.round(baseH * scaleFactor));

      renderVideoFrameWithHSL({
        videoEl,
        canvasEl,
        clip,
        clipIndex: clipIdx,
        allClips: videoClips,
        targetWidth,
        targetHeight,
        fitMode,
        comparison: isPreviewMonitor
          ? {
              holdOriginal: videoHoldOriginal,
              split: videoSplitCompare,
              splitPct: videoSplitPosition,
            }
          : undefined,
        sequenceFadeIn,
        sequenceFadeOut,
      });
    },
    [
      sequenceResolution,
      videoClips,
      fitMode,
      videoHoldOriginal,
      videoSplitCompare,
      videoSplitPosition,
      sequenceFadeIn,
      sequenceFadeOut,
    ]
  );

  // Load active clip into videoElementRef, decode first frame immediately, and auto-continue sequence playback
  useEffect(() => {
    const videoEl = videoElementRef.current;
    if (!videoEl || !activeClip) return;

    videoEl.muted = activeClip.muted;
    videoEl.volume = Math.max(0, Math.min(1, activeClip.volume / 100));

    const activeIdx = Math.max(0, videoClips.findIndex((c) => c.id === activeClip.id));

    const renderInitialFrame = () => {
      if (videoPreviewCanvasRef.current && videoEl.readyState >= 2) {
        drawVideoFrameToCanvas(videoEl, videoPreviewCanvasRef.current, activeClip, activeIdx, true);
      }
    };

    if (videoEl.dataset.clipId !== activeClip.id || videoEl.src !== activeClip.url) {
      videoEl.dataset.clipId = activeClip.id;
      const shouldAutoPlay = shouldAutoPlayNextClipRef.current;
      shouldAutoPlayNextClipRef.current = false;

      const onLoadedData = () => {
        const targetStart = Math.max(0.001, activeClip.trimStart);
        const startPlaybackIfRequested = () => {
          renderInitialFrame();
          switchingClipRef.current = false;
          if (shouldAutoPlay) {
            videoEl
              .play()
              .then(() => {
                setIsPlayingVideo(true);
              })
              .catch(() => {
                // Fallback if autoplay with sound is blocked: play muted
                videoEl.muted = true;
                videoEl
                  .play()
                  .then(() => setIsPlayingVideo(true))
                  .catch(() => setIsPlayingVideo(false));
              });
          } else {
            setIsPlayingVideo(false);
          }
        };

        if (Math.abs(videoEl.currentTime - targetStart) > 0.02) {
          const onSeekedOnce = () => {
            videoEl.removeEventListener('seeked', onSeekedOnce);
            startPlaybackIfRequested();
          };
          videoEl.addEventListener('seeked', onSeekedOnce);
          try {
            videoEl.currentTime = targetStart;
          } catch (_) {
            videoEl.removeEventListener('seeked', onSeekedOnce);
            startPlaybackIfRequested();
          }
        } else {
          startPlaybackIfRequested();
        }
        setCurrentVideoTime(activeClip.trimStart);
      };

      videoEl.onloadeddata = onLoadedData;
      videoEl.src = activeClip.url;
      try {
        videoEl.load();
      } catch (_) {}
    } else {
      renderInitialFrame();
    }
  }, [activeClip?.id, activeClip?.url, activeClip?.muted, activeClip?.volume, videoClips, drawVideoFrameToCanvas]);

  useEffect(() => {
    if (activeEditor !== 'video' || !activeClip) return;
    let mounted = true;
    const activeIdx = Math.max(0, videoClips.findIndex((c) => c.id === activeClip.id));

    const advanceOrFinishClip = (videoEl: HTMLVideoElement) => {
      if (switchingClipRef.current) return;
      const currentIdx = videoClips.findIndex((c) => c.id === activeClip.id);
      // Automatically advance to the next joined clip in the sequence if one exists!
      if (currentIdx !== -1 && currentIdx < videoClips.length - 1) {
        switchingClipRef.current = true;
        videoEl.pause();
        const nextClip = videoClips[currentIdx + 1];
        shouldAutoPlayNextClipRef.current = true;
        setActiveClipId(nextClip.id);
      } else {
        // Reached the end of the final clip in the timeline
        videoEl.pause();
        setIsPlayingVideo(false);
        setIsPlayingSequence(false);
        if (videoClips.length > 1 && isPlayingSequence) {
          // Reset playhead to first clip start ready to play again
          const first = videoClips[0];
          shouldAutoPlayNextClipRef.current = false;
          setActiveClipId(first.id);
        } else {
          try {
            videoEl.currentTime = activeClip.trimStart;
            setCurrentVideoTime(activeClip.trimStart);
          } catch (_) {}
        }
      }
    };

    const renderLoop = () => {
      if (!mounted) return;
      const videoEl = videoElementRef.current;
      const canvasEl = videoPreviewCanvasRef.current;
      if (videoEl && canvasEl && videoEl.readyState >= 2) {
        drawVideoFrameToCanvas(videoEl, canvasEl, activeClip, activeIdx, true);

        const now = performance.now();
        if (!videoEl.paused && now - lastUiTimeUpdateRef.current > 55) {
          lastUiTimeUpdateRef.current = now;
          setCurrentVideoTime(videoEl.currentTime);
        }

        // Check if current clip reached its trimEnd or natural EOF while playing
        if (
          !switchingClipRef.current &&
          (isPlayingVideo || !videoEl.paused || videoEl.ended) &&
          (videoEl.ended || videoEl.currentTime >= activeClip.trimEnd - 0.03)
        ) {
          if (isPlayingVideo || !videoEl.paused) {
            advanceOrFinishClip(videoEl);
          }
        }
      }
      animFrameRef.current = requestAnimationFrame(renderLoop);
    };

    animFrameRef.current = requestAnimationFrame(renderLoop);
    return () => {
      mounted = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [activeEditor, activeClip, videoClips, isPlayingVideo, isPlayingSequence, drawVideoFrameToCanvas]);

  const togglePlayActiveClip = () => {
    const videoEl = videoElementRef.current;
    if (!videoEl || !activeClip) return;
    if (videoEl.paused) {
      switchingClipRef.current = false;
      if (videoEl.currentTime < activeClip.trimStart || videoEl.currentTime >= activeClip.trimEnd - 0.05) {
        try {
          videoEl.currentTime = activeClip.trimStart;
          setCurrentVideoTime(activeClip.trimStart);
        } catch (_) {}
      }
      if (videoClips.length > 1) {
        setIsPlayingSequence(true);
      }
      videoEl
        .play()
        .then(() => setIsPlayingVideo(true))
        .catch(() => {
          videoEl.muted = true;
          videoEl
            .play()
            .then(() => setIsPlayingVideo(true))
            .catch(() => setIsPlayingVideo(false));
        });
    } else {
      shouldAutoPlayNextClipRef.current = false;
      switchingClipRef.current = false;
      videoEl.pause();
      setIsPlayingVideo(false);
      setIsPlayingSequence(false);
    }
  };

  const handlePlayAllSequence = () => {
    if (videoClips.length === 0) return;
    const videoEl = videoElementRef.current;
    if (isPlayingVideo && isPlayingSequence && videoEl && !videoEl.paused) {
      shouldAutoPlayNextClipRef.current = false;
      switchingClipRef.current = false;
      videoEl.pause();
      setIsPlayingVideo(false);
      setIsPlayingSequence(false);
      return;
    }

    const first = videoClips[0];
    setIsPlayingSequence(true);
    switchingClipRef.current = false;

    if (activeClip?.id === first.id && videoEl) {
      try {
        videoEl.currentTime = first.trimStart;
        setCurrentVideoTime(first.trimStart);
      } catch (_) {}
      videoEl
        .play()
        .then(() => setIsPlayingVideo(true))
        .catch(() => {
          videoEl.muted = true;
          videoEl.play().then(() => setIsPlayingVideo(true)).catch(() => {});
        });
    } else {
      shouldAutoPlayNextClipRef.current = true;
      setActiveClipId(first.id);
    }
  };

  const handleSnapshotVideoFrame = () => {
    if (!videoPreviewCanvasRef.current || !activeClip) return;
    const dataUrl = videoPreviewCanvasRef.current.toDataURL('image/png');
    saveMediaUrl(dataUrl, `${activeClip.name}-captura-${formatSeconds(currentVideoTime).replace(':', '-')}.png`);
    toast.success('Fotograma actual guardado en alta resolución (PNG)');
  };

  const handleMergeAndExportVideo = async () => {
    if (videoClips.length === 0 || isExportingVideo) return;
    // Pause live monitor before exporting
    if (videoElementRef.current && !videoElementRef.current.paused) {
      videoElementRef.current.pause();
      setIsPlayingVideo(false);
      setIsPlayingSequence(false);
    }

    setIsExportingVideo(true);
    setExportProgress(1);

    const hiddenContainer = document.createElement('div');
    hiddenContainer.className = 'fixed -left-[9999px] top-0 w-2 h-2 opacity-0 pointer-events-none overflow-hidden';
    document.body.appendChild(hiddenContainer);

    try {
      const [baseW, baseH] = sequenceResolution.split('x').map(Number);
      const activePreset = VIDEO_COMPRESSION_PRESETS.find((p) => p.id === compressionPresetId);
      const scale = activePreset ? activePreset.recommendedScale : 1;
      const resW = Math.max(2, Math.round((baseW * scale) / 2) * 2);
      const resH = Math.max(2, Math.round((baseH * scale) / 2) * 2);

      const offCanvas = document.createElement('canvas');
      offCanvas.width = resW;
      offCanvas.height = resH;
      const initCtx = offCanvas.getContext('2d');
      if (initCtx) {
        initCtx.fillStyle = '#07090e';
        initCtx.fillRect(0, 0, resW, resH);
      }

      const stream = offCanvas.captureStream(exportFps);

      let audioCtx: AudioContext | null = null;
      let audioDest: MediaStreamAudioDestinationNode | null = null;
      const hasUnmutedClips = videoClips.some((c) => !c.muted && c.volume > 0);
      if (hasUnmutedClips) {
        try {
          audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          if (audioCtx.state === 'suspended') {
            await audioCtx.resume().catch(() => {});
          }
          audioDest = audioCtx.createMediaStreamDestination();
          audioDest.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
        } catch (_) {}
      }

      // Use codecs that explicitly support BOTH video + audio tracks to avoid corrupt containers
      const mimeCandidates = [
        'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4',
      ];
      const supportedMime =
        mimeCandidates.find((m) => {
          try {
            return MediaRecorder.isTypeSupported(m);
          } catch (_) {
            return false;
          }
        }) || 'video/webm';

      const targetVideoBps = Math.max(500_000, Math.round(customVideoBitrateMbps * 1_000_000));
      const targetAudioBps = activePreset?.audioBitsPerSecond || 128_000;

      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, {
          mimeType: supportedMime,
          videoBitsPerSecond: targetVideoBps,
          audioBitsPerSecond: targetAudioBps,
        });
      } catch (_) {
        recorder = new MediaRecorder(stream);
      }

      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunks.push(ev.data);
      };

      const totalSequenceDuration = videoClips.reduce(
        (acc, c) => acc + Math.max(0.1, c.trimEnd - c.trimStart),
        0
      );
      let elapsedAcc = 0;

      recorder.start(100);

      for (let i = 0; i < videoClips.length; i++) {
        const clip = videoClips[i];
        await new Promise<void>((resolve) => {
          const tempVid = document.createElement('video');
          tempVid.preload = 'auto';
          tempVid.playsInline = true;
          tempVid.muted = clip.muted;
          tempVid.volume = Math.max(0, Math.min(1, clip.volume / 100));
          hiddenContainer.appendChild(tempVid);

          let gainNode: GainNode | null = null;
          if (audioCtx && audioDest && !clip.muted) {
            try {
              const sourceNode = audioCtx.createMediaElementSource(tempVid);
              gainNode = audioCtx.createGain();
              gainNode.gain.value = clip.volume / 100;
              sourceNode.connect(gainNode);
              gainNode.connect(audioDest);
            } catch (_) {}
          }

          let clipStarted = false;
          let clipFinished = false;

          const finishClip = () => {
            if (clipFinished) return;
            clipFinished = true;
            try {
              tempVid.pause();
              tempVid.remove();
            } catch (_) {}
            elapsedAcc += Math.max(0.1, clip.trimEnd - clip.trimStart);
            setExportProgress(Math.min(99, Math.round((elapsedAcc / totalSequenceDuration) * 100)));
            resolve();
          };

          const beginClipRender = async () => {
            if (clipStarted || clipFinished) return;
            clipStarted = true;

            // Render initial frame before play resolves
            renderVideoFrameWithHSL({
              videoEl: tempVid,
              canvasEl: offCanvas,
              clip,
              clipIndex: i,
              allClips: videoClips,
              targetWidth: resW,
              targetHeight: resH,
              fitMode,
              sequenceFadeIn,
              sequenceFadeOut,
            });

            try {
              await tempVid.play();
            } catch (_) {
              tempVid.muted = true;
              try {
                await tempVid.play();
              } catch (__e) {
                finishClip();
                return;
              }
            }

            const stepFrame = () => {
              if (clipFinished) return;
              if (tempVid.ended || tempVid.currentTime >= clip.trimEnd - 0.02) {
                finishClip();
                return;
              }

              renderVideoFrameWithHSL({
                videoEl: tempVid,
                canvasEl: offCanvas,
                clip,
                clipIndex: i,
                allClips: videoClips,
                targetWidth: resW,
                targetHeight: resH,
                fitMode,
                sequenceFadeIn,
                sequenceFadeOut,
              });

              if (gainNode) {
                const trans = computeClipTransitionOverlay(
                  clip,
                  i,
                  videoClips,
                  tempVid.currentTime,
                  sequenceFadeIn,
                  sequenceFadeOut
                );
                gainNode.gain.value = (clip.volume / 100) * trans.audioGainFactor;
              }

              const currentClipElapsed = Math.max(0, tempVid.currentTime - clip.trimStart);
              setExportProgress(
                Math.min(99, Math.round(((elapsedAcc + currentClipElapsed) / totalSequenceDuration) * 100))
              );
              requestAnimationFrame(stepFrame);
            };

            requestAnimationFrame(stepFrame);
          };

          tempVid.onloadeddata = () => {
            const targetStart = Math.max(0.001, clip.trimStart);
            if (Math.abs(tempVid.currentTime - targetStart) > 0.02) {
              const onSeeked = () => {
                tempVid.removeEventListener('seeked', onSeeked);
                beginClipRender();
              };
              tempVid.addEventListener('seeked', onSeeked);
              try {
                tempVid.currentTime = targetStart;
              } catch (_) {
                tempVid.removeEventListener('seeked', onSeeked);
                beginClipRender();
              }
            } else {
              beginClipRender();
            }
          };

          tempVid.onended = () => finishClip();
          tempVid.onerror = () => finishClip();

          tempVid.src = clip.url;
          try {
            tempVid.load();
          } catch (_) {}
        });
      }

      await new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
        if (recorder.state !== 'inactive') {
          recorder.stop();
        } else {
          resolve();
        }
      });

      if (audioCtx) {
        audioCtx.close().catch(() => {});
      }

      const actualMime = recorder.mimeType || supportedMime || 'video/webm';
      const ext = actualMime.includes('mp4') ? 'mp4' : 'webm';
      const finalBlob = new Blob(chunks, { type: actualMime });
      const tag = compressionPresetId === 'mobile' ? 'movil' : compressionPresetId === 'screen' ? 'pantalla' : 'master';
      const outName =
        videoClips.length > 1
          ? `video-unido-${videoClips.length}clips-${tag}.${ext}`
          : `${videoClips[0].name}-${tag}.${ext}`;
      saveMediaBlob(finalBlob, outName);
      setExportProgress(100);
      toast.success(`Video unido y comprimido con éxito (${outName})`);
    } catch (err: any) {
      toast.error(`Error al exportar video: ${err?.message || 'Error desconocido'}`);
    } finally {
      try {
        hiddenContainer.remove();
      } catch (_) {}
      setIsExportingVideo(false);
    }
  };

  const totalVideoSequenceDuration = useMemo(
    () => videoClips.reduce((sum, c) => sum + Math.max(0, c.trimEnd - c.trimStart), 0),
    [videoClips]
  );

  const maxHistValue = useMemo(() => {
    return Math.max(1, ...histogramData.r, ...histogramData.g, ...histogramData.b);
  }, [histogramData]);

  const activeChannelObj = useMemo(
    () => COLOR_CHANNELS.find((c) => c.id === selectedColorChannel) || COLOR_CHANNELS[0],
    [selectedColorChannel]
  );

  return (
    <div
      onDragEnter={(e) => {
        e.preventDefault();
        dragDepthRef.current += 1;
        setIsDraggingGlobal(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
        if (dragDepthRef.current === 0) {
          setIsDraggingGlobal(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        dragDepthRef.current = 0;
        setIsDraggingGlobal(false);
        handleAutoDetectFiles(e.dataTransfer.files);
      }}
      className="relative w-full max-w-screen-2xl mx-auto mt-2 sm:mt-4 px-2 sm:px-4 pb-16 space-y-4"
    >
      {/* FULL-SCREEN AUTO-DETECT DROP OVERLAY */}
      {isDraggingGlobal && (
        <div className="fixed inset-0 z-50 bg-gray-950/85 backdrop-blur-md flex items-center justify-center p-6 pointer-events-none">
          <div className="max-w-lg w-full p-8 rounded-3xl border-2 border-dashed border-purple-400 bg-gradient-to-br from-purple-950/60 via-gray-900/90 to-amber-950/60 text-center shadow-[0_0_60px_rgba(168,85,247,0.4)]">
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/25 border border-purple-400 flex items-center justify-center text-purple-300">
                <Camera size={28} />
              </div>
              <div className="w-14 h-14 rounded-2xl bg-amber-500/25 border border-amber-400 flex items-center justify-center text-amber-300">
                <Video size={28} />
              </div>
            </div>
            <h3 className="text-xl font-black text-white mb-1">
              Suelta aquí tu Foto o Video
            </h3>
            <p className="text-sm text-purple-200">
              Se desplegará automáticamente el estudio de Fotografía (Camera Raw) o de Video según tu archivo
            </p>
          </div>
        </div>
      )}

      {/* Hidden File Inputs */}
      <input
        ref={universalInputRef}
        type="file"
        accept="image/*,video/*,application/pdf,.pdf,.jpg,.jpeg,.png,.webp,.avif,.gif,.bmp,.mp4,.webm,.mov,.mkv,.m4v,.avi"
        multiple
        className="hidden"
        onChange={(e) => {
          handleAutoDetectFiles(e.target.files);
          e.currentTarget.value = '';
        }}
      />

      {/* BARRA SUPERIOR DE INTERCAMBIO EN EDICIÓN: FOTO/VIDEO AL LADO DE PDF */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-gray-950/90 border border-white/10 rounded-2xl px-3.5 py-2 shadow-lg">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEdicionSubMode('media')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition-all border ${
              edicionSubMode === 'media'
                ? 'bg-gradient-to-r from-purple-600/35 to-amber-500/30 border-purple-400/60 text-white shadow-[0_0_18px_rgba(168,85,247,0.3)]'
                : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <Camera size={16} className="text-purple-300" />
            <span>Foto y Video</span>
          </button>

          <button
            type="button"
            onClick={() => setEdicionSubMode('pdf')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition-all border ${
              edicionSubMode === 'pdf'
                ? 'bg-gradient-to-r from-red-600/40 to-rose-600/35 border-red-400/70 text-white shadow-[0_0_18px_rgba(229,50,45,0.35)]'
                : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <FileText size={16} className="text-red-400" />
            <span>PDF</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/25 text-red-200 border border-red-400/40 font-black">
              Remb PDF 2.0
            </span>
          </button>
        </div>

        <span className="text-[11px] text-gray-400 hidden sm:inline">
          {edicionSubMode === 'pdf'
            ? 'Suite completa estilo iLovePDF (24 herramientas 100% locales)'
            : 'Estudio Camera Raw y Editor de Video'}
        </span>
      </div>

      {edicionSubMode === 'pdf' ? (
        <PdfRembTab initialFiles={droppedPdfFiles.length > 0 ? droppedPdfFiles : undefined} />
      ) : (
        <>
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          handlePhotoFiles(e.target.files);
          e.currentTarget.value = '';
        }}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*,.mp4,.webm,.mov,.mkv,.m4v,.avi"
        multiple
        className="hidden"
        onChange={(e) => {
          handleVideoFiles(e.target.files);
          e.currentTarget.value = '';
        }}
      />

      {/* ==================== PRIMER RECUADRO ÚNICO: ARRASTRA Y SUELTA (AUTO-DETECCIÓN) ==================== */}
      <div
        onClick={() => universalInputRef.current?.click()}
        className={`group relative overflow-hidden rounded-3xl border-2 border-dashed transition-all cursor-pointer ${
          activeEditor === 'none'
            ? 'border-purple-500/50 hover:border-amber-400/80 bg-gradient-to-r from-purple-950/40 via-gray-900/95 to-amber-950/40 p-10 sm:p-14 text-center shadow-[0_10px_40px_rgba(0,0,0,0.45)] hover:shadow-[0_0_50px_rgba(168,85,247,0.28)]'
            : 'border-white/15 hover:border-purple-400/60 bg-gray-950/90 px-5 py-3 flex flex-wrap items-center justify-between gap-3 shadow-lg'
        }`}
      >
        {activeEditor === 'none' ? (
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="flex items-center justify-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300 group-hover:scale-110 transition-transform">
                <Camera size={28} />
              </div>
              <div className="w-12 h-12 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                <Upload size={22} />
              </div>
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 group-hover:scale-110 transition-transform">
                <Video size={28} />
              </div>
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Arrastra y suelta aquí tu Foto o Video
              </h2>
              <p className="text-xs sm:text-sm text-gray-300 mt-1.5">
                El panel de edición se desplegará automáticamente aquí abajo de acuerdo a si introduces una{' '}
                <strong className="text-purple-300">Fotografía (Camera Raw)</strong> o un{' '}
                <strong className="text-amber-300">Video (Recorte y Unión)</strong>.
              </p>
            </div>

            <div className="pt-2">
              <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white text-xs sm:text-sm font-extrabold shadow-lg">
                <Upload size={16} />
                Seleccionar Foto o Video de tu equipo
              </span>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-amber-500 flex items-center justify-center text-white shrink-0">
                {activeEditor === 'photo' ? <Camera size={18} /> : <Video size={18} />}
              </div>
              <div className="text-left">
                <p className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-2">
                  <span>Arrastra y suelta otra Foto o Video aquí para cambiar o agregar</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      activeEditor === 'photo'
                        ? 'bg-purple-500/25 text-purple-200 border border-purple-400/40'
                        : 'bg-amber-500/25 text-amber-200 border border-amber-400/40'
                    }`}
                  >
                    {activeEditor === 'photo' ? 'Modo Foto (Camera Raw)' : 'Modo Video (Recorte y Unión)'}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => universalInputRef.current?.click()}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold flex items-center gap-1.5"
              >
                <Upload size={13} />
                Cargar otro archivo
              </button>
              <button
                type="button"
                onClick={() => setActiveEditor('none')}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-300"
                title="Cerrar panel actual"
              >
                <X size={15} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* ==================== DESPLIEGUE AUTOMÁTICO: ESTUDIO DE FOTO (CAMERA RAW) ==================== */}
      {activeEditor === 'photo' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-start animate-fadeIn">
          {/* LEFT / TOP (STICKY ON MOBILE ACROSS ENTIRE INSPECTOR!): MAIN VIEWPORT */}
          <div className="sticky top-1 z-30 lg:static lg:col-span-7 xl:col-span-8 flex flex-col gap-2.5 sm:gap-3">
            <div className="flex flex-col gap-2 bg-[#06080d]/95 lg:bg-transparent backdrop-blur-xl lg:backdrop-blur-none p-2 sm:p-0 rounded-2xl border border-white/15 lg:border-none shadow-[0_14px_36px_rgba(0,0,0,0.85)] lg:shadow-none">
              {/* Sleek Single-Row App Action Bar */}
              <div className="flex items-center justify-between gap-1.5 overflow-x-auto no-scrollbar px-2.5 py-2 rounded-xl bg-gray-900/95 border border-white/10">
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleResetEntirePhoto}
                    className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 text-[11px] sm:text-xs font-extrabold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                    title="Volver toda la fotografía a su estado original"
                  >
                    <RefreshCw size={12} />
                    <span className="hidden sm:inline">Resetear Toda la Foto</span>
                    <span className="sm:hidden">Reset</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleUndoPhoto}
                    disabled={historyIdx <= 0}
                    className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 disabled:opacity-30 active:scale-95"
                    title="Deshacer"
                  >
                    <Undo2 size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={handleRedoPhoto}
                    disabled={historyIdx >= history.length - 1}
                    className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 disabled:opacity-30 active:scale-95"
                    title="Rehacer"
                  >
                    <Redo2 size={14} />
                  </button>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleAutoEnhancePhoto}
                    disabled={!photoSourceUrl}
                    className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-pink-500/20 hover:from-amber-500/30 hover:to-pink-500/30 border border-amber-400/40 text-amber-200 text-[11px] sm:text-xs font-bold flex items-center gap-1 disabled:opacity-40 active:scale-95"
                  >
                    <Wand2 size={12} />
                    <span className="hidden sm:inline">Auto-Revelado</span>
                    <span className="sm:hidden">Auto</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowGridOverlay((v) => !v)}
                    className={`p-1.5 rounded-xl border text-xs transition-all active:scale-95 ${
                      showGridOverlay
                        ? 'bg-purple-500/25 border-purple-400 text-purple-200'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                    }`}
                    title="Mostrar cuadrícula de tercios"
                  >
                    <Grid size={14} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setSplitCompare((v) => !v)}
                    disabled={!photoSourceUrl}
                    className={`px-2.5 py-1.5 rounded-xl border text-[11px] sm:text-xs font-bold flex items-center gap-1 transition-all disabled:opacity-40 active:scale-95 ${
                      splitCompare
                        ? 'bg-purple-600/35 border-purple-400 text-purple-100'
                        : 'bg-white/5 border-white/10 text-gray-300 hover:text-white'
                    }`}
                    title="Dividir pantalla Antes / Después"
                  >
                    <SplitSquareHorizontal size={13} />
                    <span>A/B</span>
                  </button>

                  <button
                    type="button"
                    onMouseDown={() => setShowOriginalHold(true)}
                    onMouseUp={() => setShowOriginalHold(false)}
                    onMouseLeave={() => setShowOriginalHold(false)}
                    onTouchStart={() => setShowOriginalHold(true)}
                    onTouchEnd={() => setShowOriginalHold(false)}
                    disabled={!photoSourceUrl}
                    className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] sm:text-xs text-gray-300 flex items-center gap-1 select-none disabled:opacity-40 active:scale-95"
                    title="Mantén presionado para ver la foto original"
                  >
                    <Eye size={13} />
                    <span>Antes</span>
                  </button>
                </div>
              </div>

              {/* Canvas Viewport */}
              <div className="relative w-full min-h-[210px] sm:min-h-[420px] lg:min-h-[500px] rounded-2xl bg-[#07090e] border border-white/10 flex flex-col items-center justify-center overflow-hidden p-2 sm:p-3 shadow-inner">
                {photoSourceUrl && (
                  <>
                    <div className="relative flex items-center justify-center max-w-full max-h-[34vh] sm:max-h-[54vh] lg:max-h-[65vh]">
                      <canvas
                        ref={previewCanvasRef}
                        onPointerDown={handleCanvasPointerDown}
                        onPointerMove={handleCanvasPointerMove}
                        onPointerUp={handleCanvasPointerUp}
                        onPointerCancel={handleCanvasPointerUp}
                        className={`max-w-full max-h-[34vh] sm:max-h-[54vh] lg:max-h-[65vh] w-auto h-auto object-contain rounded-lg shadow-2xl touch-none select-none ${
                          isPickingWhiteBalance || isPickingColorChannel
                            ? 'cursor-ew-resize ring-2 ring-pink-400'
                            : splitCompare
                            ? 'cursor-ew-resize'
                            : ''
                        }`}
                      />
                      {/* Live Floating HUD when dragging with "Elegir en Foto" (Right = Increase, Left = Decrease) */}
                      {hslDragState && hslDragState.active && (
                        <div className="pointer-events-none absolute top-2 sm:top-4 left-1/2 -translate-x-1/2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl bg-gray-950/95 border border-pink-400/70 shadow-2xl flex items-center gap-2 text-[11px] sm:text-xs font-extrabold text-white whitespace-nowrap">
                          <span
                            className={`w-3 h-3 rounded-full ${
                              COLOR_CHANNELS.find((c) => c.id === hslDragState.channel)?.swatchClass || 'bg-pink-500'
                            }`}
                          />
                          <span>
                            {COLOR_CHANNELS.find((c) => c.id === hslDragState.channel)?.label} •{' '}
                            {hslDragState.prop === 'saturation'
                              ? 'Intensidad'
                              : hslDragState.prop === 'luminance'
                              ? 'Luminosidad'
                              : 'Tono'}
                            :{' '}
                            <strong className="text-pink-300 font-mono text-xs sm:text-sm">
                              {hslDragState.currentVal > 0
                                ? `+${hslDragState.currentVal}`
                                : hslDragState.currentVal}
                            </strong>
                          </span>
                          <span className="hidden sm:inline text-[10px] text-gray-400">
                            (← Rebajar | Aumentar →)
                          </span>
                        </div>
                      )}
                      {showGridOverlay && (
                        <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3 border border-white/30">
                          <div className="border-r border-b border-white/25" />
                          <div className="border-r border-b border-white/25" />
                          <div className="border-b border-white/25" />
                          <div className="border-r border-b border-white/25" />
                          <div className="border-r border-b border-white/25" />
                          <div className="border-b border-white/25" />
                          <div className="border-r border-white/25" />
                          <div className="border-r border-white/25" />
                          <div />
                        </div>
                      )}
                    </div>

                    {splitCompare && (
                      <div className="w-56 sm:w-64 mt-2 flex items-center gap-2 bg-gray-900/95 px-3 py-1 rounded-full border border-purple-500/40">
                        <span className="text-[9px] text-gray-400 font-bold">ANTES</span>
                        <input
                          type="range"
                          min={5}
                          max={95}
                          value={splitPosition}
                          onChange={(e) => setSplitPosition(Number(e.target.value))}
                          className="flex-1 accent-purple-500 h-1.5"
                        />
                        <span className="text-[9px] text-purple-300 font-bold">DESPUÉS</span>
                      </div>
                    )}

                    <div className="mt-1.5 flex flex-wrap items-center justify-between w-full px-1.5 text-[10px] sm:text-[11px] text-gray-400 gap-1">
                      <span>
                        Original: <strong className="text-gray-200">{photoNaturalSize.w}×{photoNaturalSize.h}</strong>
                      </span>
                      {(isPickingWhiteBalance || isPickingColorChannel) && (
                        <span className="text-pink-300 font-bold animate-pulse text-center text-[10px]">
                          {isPickingColorChannel
                            ? 'Toca y arrastra: Derecha (+) Aumentar | Izquierda (-) Rebajar'
                            : 'Toca un punto neutro en la foto para calibrar blancos'}
                        </span>
                      )}
                      <span>
                        Salida:{' '}
                        <strong className="text-purple-300">
                          {Math.round(photoNaturalSize.w * photoAdj.cropW * exportScale)}×
                          {Math.round(photoNaturalSize.h * photoAdj.cropH * exportScale)}
                        </strong>
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT / BOTTOM: CAMERA RAW APP DOCK, PRESETS & INSPECTOR CONTROLS */}
          <div className="lg:col-span-5 xl:col-span-4 bg-gray-950/95 border border-white/10 rounded-2xl p-3 sm:p-4 flex flex-col gap-3 shadow-2xl">
            {/* 7 Inspector Section Tabs FIRST on Mobile so thumb immediately reaches tools below photo! */}
            <div className="flex lg:grid lg:grid-cols-7 gap-1.5 overflow-x-auto no-scrollbar bg-gray-900/95 p-1.5 rounded-2xl border border-white/10 text-[10px] sm:text-[11px] font-extrabold shadow-inner">
              {[
                { id: 'raw', label: 'Luz / WB', icon: <Sun size={14} />, activeBg: 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30' },
                { id: 'curves', label: 'Curvas', icon: <Sliders size={14} />, activeBg: 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30' },
                { id: 'hsl', label: 'Color HSL', icon: <Palette size={14} />, activeBg: 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30' },
                { id: 'grading', label: '3 Ruedas', icon: <Aperture size={14} />, activeBg: 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30' },
                { id: 'effects', label: 'Efectos', icon: <CloudFog size={14} />, activeBg: 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30' },
                { id: 'crop', label: 'Recorte', icon: <Crop size={14} />, activeBg: 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30' },
                { id: 'export', label: 'Guardar', icon: <Download size={14} />, activeBg: 'bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/30' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActivePhotoPanel(tab.id as any)}
                  className={`shrink-0 min-w-[66px] lg:min-w-0 py-2 px-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${
                    activePhotoPanel === tab.id
                      ? tab.activeBg
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {tab.icon}
                  <span className="whitespace-nowrap">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Compact Live RGB Histogram + Clipping Alerts + Panel Reset */}
            <div className="bg-gray-900/90 border border-white/10 rounded-xl p-2 space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowShadowClipping((v) => !v)}
                    className={`px-1.5 py-0.5 rounded border text-[9px] font-extrabold transition-all ${
                      showShadowClipping
                        ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:text-cyan-300'
                    }`}
                    title="Alerta de Sombras Empastadas (marca en azul los negros puros)"
                  >
                    ◀ Sombras
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowHighlightClipping((v) => !v)}
                    className={`px-1.5 py-0.5 rounded border text-[9px] font-extrabold transition-all ${
                      showHighlightClipping
                        ? 'bg-rose-500/30 border-rose-400 text-rose-200'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:text-rose-300'
                    }`}
                    title="Alerta de Altas Luces Quemadas (marca en rojo los blancos quemados)"
                  >
                    Luces ▶
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  {activePhotoPanel !== 'export' && (
                    <button
                      type="button"
                      onClick={handleResetCurrentPanel}
                      className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 text-[10px] font-bold flex items-center gap-1 active:scale-95"
                      title="Restablecer únicamente los controles de este panel"
                    >
                      <RefreshCw size={10} />
                      Reset Panel
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleResetEntirePhoto}
                    className="px-2 py-0.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/30 text-[10px] font-bold flex items-center gap-1 active:scale-95"
                    title="Restablecer toda la foto en general"
                  >
                    <RefreshCw size={10} />
                    Reset Todo
                  </button>
                </div>
              </div>
              <svg viewBox="0 0 64 26" className="w-full h-9 sm:h-11 bg-black/50 rounded-lg overflow-hidden">
                <polygon
                  fill="rgba(255,255,255,0.2)"
                  points={`0,26 ${histogramData.l
                    .map((v, i) => `${i},${26 - Math.min(25, (v / maxHistValue) * 25)}`)
                    .join(' ')} 63,26`}
                />
                <polyline
                  fill="none"
                  stroke="rgba(239,68,68,0.85)"
                  strokeWidth="0.9"
                  points={histogramData.r
                    .map((v, i) => `${i},${26 - Math.min(25, (v / maxHistValue) * 25)}`)
                    .join(' ')}
                />
                <polyline
                  fill="none"
                  stroke="rgba(34,197,94,0.85)"
                  strokeWidth="0.9"
                  points={histogramData.g
                    .map((v, i) => `${i},${26 - Math.min(25, (v / maxHistValue) * 25)}`)
                    .join(' ')}
                />
                <polyline
                  fill="none"
                  stroke="rgba(59,130,246,0.85)"
                  strokeWidth="0.9"
                  points={histogramData.b
                    .map((v, i) => `${i},${26 - Math.min(25, (v / maxHistValue) * 25)}`)
                    .join(' ')}
                />
              </svg>
            </div>

            {/* Camera Raw Presets Strip + Custom Presets */}
            <div className="bg-gray-900/90 border border-white/10 rounded-xl p-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-gray-300 flex items-center gap-1.5">
                  <Sparkles size={12} className="text-purple-400" />
                  Presets Camera Raw
                </span>
                <button
                  type="button"
                  onClick={() => setIsCreatingPreset((v) => !v)}
                  className="px-2.5 py-1 rounded-lg bg-purple-600/25 hover:bg-purple-600/40 border border-purple-400/40 text-[10px] text-purple-200 font-bold flex items-center gap-1 active:scale-95"
                >
                  <Plus size={11} />
                  Guardar Preset
                </button>
              </div>

              {isCreatingPreset && (
                <div className="flex items-center gap-1.5 bg-gray-950/90 p-1.5 rounded-xl border border-purple-500/40">
                  <input
                    type="text"
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    placeholder="Nombre del preset..."
                    className="flex-1 bg-transparent text-xs text-white px-2 py-1 outline-none min-w-0"
                  />
                  <button
                    type="button"
                    onClick={handleSaveCustomPreset}
                    className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shrink-0"
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreatingPreset(false)}
                    className="p-1 text-gray-400 hover:text-white shrink-0"
                  >
                    <X size={13} />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
                {[...customPresets, ...CAMERA_RAW_PRESETS].map((preset) => {
                  const isCustom = preset.id.startsWith('custom-');
                  return (
                    <div
                      key={preset.id}
                      className="shrink-0 flex items-center rounded-xl bg-white/5 hover:bg-purple-500/20 border border-white/10 hover:border-purple-400/50 transition-all active:scale-95"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          updatePhotoAdj((prev) => ({
                            ...prev,
                            ...preset.values,
                            colorMixer: preset.values.colorMixer
                              ? JSON.parse(JSON.stringify(preset.values.colorMixer))
                              : prev.colorMixer,
                            toneCurves: preset.values.toneCurves
                              ? JSON.parse(JSON.stringify(preset.values.toneCurves))
                              : prev.toneCurves,
                            colorGrading: preset.values.colorGrading
                              ? JSON.parse(JSON.stringify(preset.values.colorGrading))
                              : prev.colorGrading,
                          }));
                          toast.success(`Preset "${preset.name}" aplicado`);
                        }}
                        className="px-2.5 py-1.5 text-left"
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                              isCustom
                                ? 'bg-amber-500/30 text-amber-200'
                                : 'bg-purple-500/25 text-purple-200'
                            }`}
                          >
                            {preset.badge}
                          </span>
                          <span className="text-[11px] font-bold text-gray-100 whitespace-nowrap">{preset.name}</span>
                        </div>
                      </button>
                      {isCustom && (
                        <button
                          type="button"
                          onClick={() =>
                            setCustomPresets((prev) => prev.filter((p) => p.id !== preset.id))
                          }
                          className="pr-2 text-gray-400 hover:text-red-300"
                          title="Eliminar preset personalizado"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* PANEL 1: LUZ, TONO Y EQUILIBRIO DE BLANCOS */}
            {activePhotoPanel === 'raw' && (
              <div className="space-y-3.5">
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">
                      Equilibrio de Blancos (WB)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsPickingColorChannel(false);
                        setIsPickingWhiteBalance((v) => !v);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all ${
                        isPickingWhiteBalance
                          ? 'bg-cyan-500 text-gray-950 shadow-lg'
                          : 'bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30'
                      }`}
                    >
                      <Pipette size={12} />
                      {isPickingWhiteBalance ? 'Elige en la foto...' : 'Cuentagotas WB'}
                    </button>
                  </div>

                  <SliderControl
                    label="Temperatura (Frío ↔ Cálido)"
                    value={photoAdj.temperature}
                    min={-100}
                    max={100}
                    gradientClass="from-blue-500 via-gray-400 to-amber-500"
                    onChange={(v) => updatePhotoAdj({ temperature: v })}
                    onReset={() => updatePhotoAdj({ temperature: 0 })}
                  />
                  <SliderControl
                    label="Matiz (Verde ↔ Magenta)"
                    value={photoAdj.tint}
                    min={-100}
                    max={100}
                    gradientClass="from-emerald-500 via-gray-400 to-pink-500"
                    onChange={(v) => updatePhotoAdj({ tint: v })}
                    onReset={() => updatePhotoAdj({ tint: 0 })}
                  />
                </div>

                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-2.5">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-amber-300 block">
                    Luz y Tono (Camera Raw)
                  </span>

                  <SliderControl
                    label="Exposición"
                    value={photoAdj.exposure}
                    min={-100}
                    max={100}
                    onChange={(v) => updatePhotoAdj({ exposure: v })}
                    onReset={() => updatePhotoAdj({ exposure: 0 })}
                  />
                  <SliderControl
                    label="Contraste"
                    value={photoAdj.contrast}
                    min={-100}
                    max={100}
                    onChange={(v) => updatePhotoAdj({ contrast: v })}
                    onReset={() => updatePhotoAdj({ contrast: 0 })}
                  />
                  <SliderControl
                    label="Iluminaciones (Altas Luces)"
                    value={photoAdj.highlights}
                    min={-100}
                    max={100}
                    onChange={(v) => updatePhotoAdj({ highlights: v })}
                    onReset={() => updatePhotoAdj({ highlights: 0 })}
                  />
                  <SliderControl
                    label="Sombras"
                    value={photoAdj.shadows}
                    min={-100}
                    max={100}
                    onChange={(v) => updatePhotoAdj({ shadows: v })}
                    onReset={() => updatePhotoAdj({ shadows: 0 })}
                  />
                  <SliderControl
                    label="Blancos"
                    value={photoAdj.whites}
                    min={-100}
                    max={100}
                    onChange={(v) => updatePhotoAdj({ whites: v })}
                    onReset={() => updatePhotoAdj({ whites: 0 })}
                  />
                  <SliderControl
                    label="Negros"
                    value={photoAdj.blacks}
                    min={-100}
                    max={100}
                    onChange={(v) => updatePhotoAdj({ blacks: v })}
                    onReset={() => updatePhotoAdj({ blacks: 0 })}
                  />
                </div>

                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-2.5">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-pink-300 block">
                    Saturación Global
                  </span>
                  <SliderControl
                    label="Intensidad (Vibrance)"
                    value={photoAdj.vibrance}
                    min={-100}
                    max={100}
                    gradientClass="from-gray-600 via-purple-500 to-pink-500"
                    onChange={(v) => updatePhotoAdj({ vibrance: v })}
                    onReset={() => updatePhotoAdj({ vibrance: 0 })}
                  />
                  <SliderControl
                    label="Saturación"
                    value={photoAdj.saturation}
                    min={-100}
                    max={100}
                    gradientClass="from-gray-700 via-pink-500 to-amber-400"
                    onChange={(v) => updatePhotoAdj({ saturation: v })}
                    onReset={() => updatePhotoAdj({ saturation: 0 })}
                  />
                </div>
              </div>
            )}

            {/* PANEL CURVAS: CURVAS DE TONOS INTERACTIVAS (RGB / R / G / B) */}
            {activePhotoPanel === 'curves' && (
              <InteractiveToneCurvePanel
                curves={photoAdj.toneCurves}
                onChange={(toneCurves) => updatePhotoAdj({ toneCurves })}
              />
            )}

            {/* PANEL 3 RUEDAS: GRADUACIÓN DE COLOR (SOMBRAS, MEDIOS TONOS, ALTAS LUCES) */}
            {activePhotoPanel === 'grading' && (
              <ColorGradingThreeWheelsPanel
                grading={photoAdj.colorGrading}
                onChange={(colorGrading) => updatePhotoAdj({ colorGrading })}
              />
            )}

            {/* PANEL 2: MEZCLADOR DE COLORES HSL (TONO, INTENSIDAD/SATURACIÓN, LUMINOSIDAD POR COLOR) */}
            {activePhotoPanel === 'hsl' && (
              <div className="space-y-3.5">
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-extrabold uppercase tracking-wider text-pink-300 block">
                        Mezclador de Colores (HSL)
                      </span>
                      <span className="text-[11px] text-gray-400">
                        Modifica Tono, Intensidad y Luminosidad por color
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsPickingWhiteBalance(false);
                        setIsPickingColorChannel((v) => !v);
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all ${
                        isPickingColorChannel
                          ? 'bg-pink-500 text-white shadow-lg ring-2 ring-pink-300'
                          : 'bg-pink-500/15 hover:bg-pink-500/25 text-pink-200 border border-pink-500/30'
                      }`}
                      title="Mantén presionado sobre un color en la foto y arrastra a la derecha para aumentar o a la izquierda para rebajar"
                    >
                      <Pipette size={12} />
                      {isPickingColorChannel ? 'Arrastra en Foto (← / →)' : 'Elegir en Foto'}
                    </button>
                  </div>

                  {isPickingColorChannel && (
                    <div className="p-2.5 rounded-xl bg-pink-500/10 border border-pink-500/30 space-y-2">
                      <p className="text-[11px] text-pink-200 font-semibold leading-snug">
                        💡 <strong>Selector Directo Activo:</strong> Mantén presionado el clic sobre cualquier color en la foto y{' '}
                        <strong className="text-white">arrastra a la derecha para aumentar</strong> o{' '}
                        <strong className="text-white">a la izquierda para rebajar</strong>:
                      </p>
                      <div className="grid grid-cols-3 gap-1 bg-gray-900/90 p-1 rounded-lg text-[10px] font-bold">
                        {[
                          { id: 'saturation', label: 'Intensidad / Sat.' },
                          { id: 'luminance', label: 'Luminosidad' },
                          { id: 'hue', label: 'Tono' },
                        ].map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setHslTatTargetProp(t.id as any)}
                            className={`py-1 rounded transition-all ${
                              hslTatTargetProp === t.id
                                ? 'bg-pink-600 text-white'
                                : 'text-gray-400 hover:text-white'
                            }`}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Mode Switcher: Por Color vs Tono vs Intensidad vs Luminosidad */}
                  <div className="grid grid-cols-4 gap-1 bg-gray-900 p-1 rounded-lg border border-white/10 text-[10px] font-bold">
                    {[
                      { id: 'channel', label: 'Por Color' },
                      { id: 'hue', label: 'Tono' },
                      { id: 'saturation', label: 'Intensidad' },
                      { id: 'luminance', label: 'Luminosidad' },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setHslViewMode(m.id as any)}
                        className={`py-1.5 rounded-md transition-all ${
                          hslViewMode === m.id
                            ? 'bg-purple-600 text-white'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>

                  {hslViewMode === 'channel' ? (
                    <>
                      {/* 8 Color Swatches (4x2 thumb-friendly grid on mobile, 8x1 on tablet/desktop) */}
                      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 pt-1">
                        {COLOR_CHANNELS.map((ch) => {
                          const vals = photoAdj.colorMixer[ch.id];
                          const isEdited =
                            vals.hue !== 0 || vals.saturation !== 0 || vals.luminance !== 0;
                          const isSelected = selectedColorChannel === ch.id;
                          return (
                            <button
                              key={ch.id}
                              type="button"
                              onClick={() => setSelectedColorChannel(ch.id)}
                              className={`relative flex flex-col items-center gap-1 p-2 sm:p-1.5 rounded-xl border transition-all active:scale-95 ${
                                isSelected
                                  ? 'bg-white/15 border-white shadow-md scale-[1.03]'
                                  : 'bg-white/5 border-white/10 hover:bg-white/10'
                              }`}
                              title={ch.label}
                            >
                              <span className={`w-6 h-6 sm:w-5 sm:h-5 rounded-full ${ch.swatchClass} shadow-inner`} />
                              <span className="text-[10px] sm:text-[9px] font-bold text-gray-200">
                                {ch.shortLabel}
                              </span>
                              {isEdited && (
                                <span className="w-2 h-2 rounded-full bg-purple-400 absolute top-1 right-1 shadow" />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Sliders for Selected Color Channel */}
                      <div className="pt-2 border-t border-white/10 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white flex items-center gap-2">
                            <span className={`w-3 h-3 rounded-full ${activeChannelObj.swatchClass}`} />
                            Canal: {activeChannelObj.label}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              updateColorMixerChannel(selectedColorChannel, {
                                hue: 0,
                                saturation: 0,
                                luminance: 0,
                              })
                            }
                            className="text-[11px] text-gray-400 hover:text-white"
                          >
                            Reset {activeChannelObj.shortLabel}
                          </button>
                        </div>

                        <SliderControl
                          label={`Tono de ${activeChannelObj.label}`}
                          value={photoAdj.colorMixer[selectedColorChannel].hue}
                          min={-100}
                          max={100}
                          gradientClass="from-rose-500 via-emerald-500 to-indigo-500"
                          onChange={(v) =>
                            updateColorMixerChannel(selectedColorChannel, { hue: v })
                          }
                          onReset={() =>
                            updateColorMixerChannel(selectedColorChannel, { hue: 0 })
                          }
                        />
                        <SliderControl
                          label={`Intensidad / Saturación de ${activeChannelObj.label}`}
                          value={photoAdj.colorMixer[selectedColorChannel].saturation}
                          min={-100}
                          max={100}
                          gradientClass="from-gray-600 via-purple-500 to-pink-500"
                          onChange={(v) =>
                            updateColorMixerChannel(selectedColorChannel, { saturation: v })
                          }
                          onReset={() =>
                            updateColorMixerChannel(selectedColorChannel, { saturation: 0 })
                          }
                        />
                        <SliderControl
                          label={`Luminosidad de ${activeChannelObj.label}`}
                          value={photoAdj.colorMixer[selectedColorChannel].luminance}
                          min={-100}
                          max={100}
                          gradientClass="from-gray-900 via-gray-500 to-white"
                          onChange={(v) =>
                            updateColorMixerChannel(selectedColorChannel, { luminance: v })
                          }
                          onReset={() =>
                            updateColorMixerChannel(selectedColorChannel, { luminance: 0 })
                          }
                        />
                      </div>
                    </>
                  ) : (
                    /* All 8 Channels for Hue OR Saturation OR Luminance */
                    <div className="space-y-2.5 pt-1 max-h-[340px] overflow-y-auto pr-1">
                      {COLOR_CHANNELS.map((ch) => (
                        <SliderControl
                          key={ch.id}
                          label={ch.label}
                          value={photoAdj.colorMixer[ch.id][hslViewMode]}
                          min={-100}
                          max={100}
                          onChange={(v) =>
                            updateColorMixerChannel(ch.id, { [hslViewMode]: v })
                          }
                          onReset={() =>
                            updateColorMixerChannel(ch.id, { [hslViewMode]: 0 })
                          }
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PANEL 3: EFECTOS DE CAMERA RAW (TEXTURA, CLARIDAD, BORRAR NEBLINA, RESPLANDOR, VIÑETA, GRANO) */}
            {activePhotoPanel === 'effects' && (
              <div className="space-y-3.5">
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-amber-300 block">
                    Efectos Camera Raw (Presencia y Atmósfera)
                  </span>

                  <SliderControl
                    label="Textura (Detalle fino / Suavizar piel)"
                    value={photoAdj.texture}
                    min={-100}
                    max={100}
                    onChange={(v) => updatePhotoAdj({ texture: v })}
                    onReset={() => updatePhotoAdj({ texture: 0 })}
                  />
                  <SliderControl
                    label="Claridad (Contraste de medios tonos)"
                    value={photoAdj.clarity}
                    min={-100}
                    max={100}
                    onChange={(v) => updatePhotoAdj({ clarity: v })}
                    onReset={() => updatePhotoAdj({ clarity: 0 })}
                  />
                  <SliderControl
                    label="Borrar Neblina (Dehaze atmosférico)"
                    value={photoAdj.dehaze}
                    min={-100}
                    max={100}
                    gradientClass="from-slate-400 via-indigo-500 to-cyan-400"
                    onChange={(v) => updatePhotoAdj({ dehaze: v })}
                    onReset={() => updatePhotoAdj({ dehaze: 0 })}
                  />
                  <SliderControl
                    label="Resplandor (Brillo suave / Glow en luces)"
                    value={photoAdj.glow}
                    min={-100}
                    max={100}
                    gradientClass="from-gray-700 via-amber-500 to-yellow-300"
                    onChange={(v) => updatePhotoAdj({ glow: v })}
                    onReset={() => updatePhotoAdj({ glow: 0 })}
                  />
                </div>

                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-purple-300 block">
                    Detalle, Viñeta y Grano
                  </span>
                  <SliderControl
                    label="Nitidez (Enfoque de bordes)"
                    value={photoAdj.sharpen}
                    min={0}
                    max={100}
                    onChange={(v) => updatePhotoAdj({ sharpen: v })}
                    onReset={() => updatePhotoAdj({ sharpen: 0 })}
                  />
                  <SliderControl
                    label="Viñeta Óptica (Oscura ↔ Clara)"
                    value={photoAdj.vignette}
                    min={-100}
                    max={100}
                    onChange={(v) => updatePhotoAdj({ vignette: v })}
                    onReset={() => updatePhotoAdj({ vignette: 0 })}
                  />
                  <SliderControl
                    label="Grano de Película"
                    value={photoAdj.grain}
                    min={0}
                    max={100}
                    onChange={(v) => updatePhotoAdj({ grain: v })}
                    onReset={() => updatePhotoAdj({ grain: 0 })}
                  />
                </div>
              </div>
            )}

            {/* PANEL 4: RECORTE Y GEOMETRÍA */}
            {activePhotoPanel === 'crop' && (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-purple-300 block">
                    Giro y Espejo
                  </span>
                  <div className="grid grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => updatePhotoAdj({ rotation: (photoAdj.rotation - 90 + 360) % 360 })}
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex flex-col items-center gap-1 text-xs text-gray-200"
                    >
                      <RotateCcw size={16} />
                      <span>-90°</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => updatePhotoAdj({ rotation: (photoAdj.rotation + 90) % 360 })}
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex flex-col items-center gap-1 text-xs text-gray-200"
                    >
                      <RotateCw size={16} />
                      <span>+90°</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => updatePhotoAdj({ flipH: !photoAdj.flipH })}
                      className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 text-xs ${
                        photoAdj.flipH
                          ? 'bg-purple-600/30 border-purple-400 text-purple-200'
                          : 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-200'
                      }`}
                    >
                      <FlipHorizontal size={16} />
                      <span>Voltear H</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => updatePhotoAdj({ flipV: !photoAdj.flipV })}
                      className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 text-xs ${
                        photoAdj.flipV
                          ? 'bg-purple-600/30 border-purple-400 text-purple-200'
                          : 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-200'
                      }`}
                    >
                      <FlipVertical size={16} />
                      <span>Voltear V</span>
                    </button>
                  </div>

                  <SliderControl
                    label="Enderezar Horizonte (°)"
                    value={photoAdj.straighten}
                    min={-45}
                    max={45}
                    step={0.5}
                    unit="°"
                    onChange={(v) => {
                      setShowGridOverlay(true);
                      updatePhotoAdj({ straighten: v });
                    }}
                    onReset={() => updatePhotoAdj({ straighten: 0 })}
                  />
                </div>

                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-amber-300 block">
                    Proporción de Recorte
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {ASPECT_RATIOS.map((ar) => (
                      <button
                        key={ar.id}
                        type="button"
                        onClick={() => handleSelectAspectPreset(ar.id, ar.ratio)}
                        className={`px-2.5 py-2 rounded-lg text-xs font-bold border text-left transition-all ${
                          photoAdj.aspectPreset === ar.id
                            ? 'bg-purple-600/30 border-purple-400 text-white'
                            : 'bg-white/5 border-white/10 text-gray-300 hover:text-white'
                        }`}
                      >
                        {ar.label}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-2.5 pt-2 border-t border-white/10">
                    <SliderControl
                      label="Desplazar Recorte X (%)"
                      value={Math.round(photoAdj.cropX * 100)}
                      min={0}
                      max={Math.max(0, Math.round((1 - photoAdj.cropW) * 100))}
                      unit="%"
                      onChange={(v) => updatePhotoAdj({ cropX: v / 100 })}
                      onReset={() => updatePhotoAdj({ cropX: 0 })}
                    />
                    <SliderControl
                      label="Desplazar Recorte Y (%)"
                      value={Math.round(photoAdj.cropY * 100)}
                      min={0}
                      max={Math.max(0, Math.round((1 - photoAdj.cropH) * 100))}
                      unit="%"
                      onChange={(v) => updatePhotoAdj({ cropY: v / 100 })}
                      onReset={() => updatePhotoAdj({ cropY: 0 })}
                    />
                    <SliderControl
                      label="Ancho del Área (%)"
                      value={Math.round(photoAdj.cropW * 100)}
                      min={10}
                      max={Math.round((1 - photoAdj.cropX) * 100)}
                      unit="%"
                      onChange={(v) => updatePhotoAdj({ cropW: v / 100, aspectPreset: 'free' })}
                      onReset={() => updatePhotoAdj({ cropX: 0, cropW: 1 })}
                    />
                    <SliderControl
                      label="Alto del Área (%)"
                      value={Math.round(photoAdj.cropH * 100)}
                      min={10}
                      max={Math.round((1 - photoAdj.cropY) * 100)}
                      unit="%"
                      onChange={(v) => updatePhotoAdj({ cropH: v / 100, aspectPreset: 'free' })}
                      onReset={() => updatePhotoAdj({ cropY: 0, cropH: 1 })}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* PANEL 5: EXPORTAR EN MÚLTIPLES FORMATOS */}
            {activePhotoPanel === 'export' && (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
                  <label className="block text-xs font-bold text-gray-300">
                    Nombre del Archivo
                  </label>
                  <input
                    type="text"
                    value={photoFileName}
                    onChange={(e) => setPhotoFileName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-white/15 text-xs text-white focus:border-purple-400 outline-none"
                  />

                  <label className="block text-xs font-bold text-gray-300 pt-1">
                    Formato de Salida
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: 'image/jpeg', label: 'JPG / JPEG', desc: 'Universal y ligero' },
                      { id: 'image/png', label: 'PNG (Lossless)', desc: 'Máxima calidad sin pérdida' },
                      { id: 'image/webp', label: 'WEBP Pro', desc: 'Ideal para web y catálogos' },
                      { id: 'image/avif', label: 'AVIF Next-Gen', desc: 'Ultra compresión HDR' },
                      { id: 'application/pdf', label: 'Documento PDF', desc: 'Listo para enviar/imprimir' },
                    ].map((fmt) => (
                      <button
                        key={fmt.id}
                        type="button"
                        onClick={() => setExportFormat(fmt.id as any)}
                        className={`p-2 rounded-xl border text-left transition-all ${
                          exportFormat === fmt.id
                            ? 'bg-emerald-600/25 border-emerald-400 text-white'
                            : 'bg-white/5 border-white/10 text-gray-300 hover:text-white'
                        }`}
                      >
                        <div className="text-xs font-bold">{fmt.label}</div>
                        <div className="text-[10px] text-gray-400">{fmt.desc}</div>
                      </button>
                    ))}
                  </div>

                  {exportFormat !== 'image/png' && (
                    <SliderControl
                      label="Calidad de Compresión"
                      value={exportQuality}
                      min={10}
                      max={100}
                      unit="%"
                      onChange={setExportQuality}
                      onReset={() => setExportQuality(92)}
                    />
                  )}

                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1.5">
                      Escala de Resolución
                    </label>
                    <div className="grid grid-cols-5 gap-1">
                      {[0.5, 0.75, 1, 1.5, 2].map((sc) => (
                        <button
                          key={sc}
                          type="button"
                          onClick={() => setExportScale(sc)}
                          className={`py-1.5 rounded-lg text-xs font-bold border ${
                            exportScale === sc
                              ? 'bg-purple-600 border-purple-400 text-white'
                              : 'bg-white/5 border-white/10 text-gray-300'
                          }`}
                        >
                          {sc * 100}%
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-gray-900/90 border border-white/10 text-xs space-y-1">
                    <div className="flex justify-between text-gray-400">
                      <span>Resolución final:</span>
                      <span className="font-bold text-white">
                        {Math.round(photoNaturalSize.w * photoAdj.cropW * exportScale)} ×{' '}
                        {Math.round(photoNaturalSize.h * photoAdj.cropH * exportScale)} px
                      </span>
                    </div>
                    {estimatedBytes && (
                      <div className="flex justify-between text-gray-400">
                        <span>Peso estimado:</span>
                        <span className="font-bold text-emerald-300">
                          ~{(estimatedBytes / 1024).toFixed(0)} KB
                        </span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={!photoSourceUrl}
                    onClick={handleExportPhoto}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 disabled:opacity-40"
                  >
                    <Download size={16} />
                    Guardar Imagen Editada
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== DESPLIEGUE AUTOMÁTICO: ESTUDIO DE VIDEO PRO ==================== */}
      {activeEditor === 'video' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-start animate-fadeIn">
          {/* LEFT / CENTER: VIDEO MONITOR & MASTER GLOBAL TIMELINE */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-3">
            <video
              ref={videoElementRef}
              preload="auto"
              playsInline
              className="fixed -left-[9999px] top-0 w-2 h-2 opacity-0 pointer-events-none"
            />

            {/* Sticky Mobile Monitor Wrapper */}
            <div className="sticky top-1 z-30 lg:static flex flex-col gap-2 bg-[#06080d]/95 lg:bg-transparent backdrop-blur-xl lg:backdrop-blur-none p-2 sm:p-0 rounded-2xl border border-white/15 lg:border-none shadow-[0_14px_36px_rgba(0,0,0,0.85)] lg:shadow-none">
              {/* Top Video Action Bar (Includes Undo Ctrl+Z, Redo Ctrl+Y, Split, Compare A/B & Hold Before!) */}
              <div className="flex items-center justify-between gap-1.5 overflow-x-auto no-scrollbar px-2.5 py-2 rounded-xl bg-gray-900/95 border border-white/10">
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-gray-950 text-[11px] sm:text-xs font-black flex items-center gap-1 shadow active:scale-95"
                    title="Cargar uno o varios videos para unir"
                  >
                    <Plus size={13} />
                    <span>+ Videos</span>
                  </button>

                  {activeClip && (
                    <button
                      type="button"
                      onClick={handleResetActiveVideoClip}
                      className="px-2.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 text-[11px] sm:text-xs font-extrabold flex items-center gap-1 active:scale-95"
                      title="Restablecer clip actual al original"
                    >
                      <RefreshCw size={12} />
                      <span className="hidden sm:inline">Reset Clip</span>
                      <span className="sm:hidden">Reset</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleUndoVideo}
                    disabled={videoHistoryIdx <= 0}
                    className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 disabled:opacity-30 active:scale-95"
                    title="Deshacer en video (Ctrl+Z)"
                  >
                    <Undo2 size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={handleRedoVideo}
                    disabled={videoHistoryIdx < 0 || videoHistoryIdx >= videoHistory.length - 1}
                    className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 disabled:opacity-30 active:scale-95"
                    title="Rehacer en video (Ctrl+Y)"
                  >
                    <Redo2 size={14} />
                  </button>
                </div>

                {activeClip && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={handleSplitActiveClip}
                      className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-amber-500/20 border border-white/10 hover:border-amber-400/40 text-[11px] sm:text-xs font-bold text-amber-200 flex items-center gap-1 active:scale-95"
                      title="Cortar el video en dos partes en la posición actual de la aguja"
                    >
                      <Scissors size={13} />
                      <span>Cortar</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSnapshotVideoFrame}
                      className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] sm:text-xs text-gray-200 flex items-center gap-1 active:scale-95"
                      title="Guardar fotograma actual como imagen PNG"
                    >
                      <ImageIcon size={13} />
                      <span className="hidden md:inline">Frame</span>
                    </button>

                    {/* Compare Before / After Split Screen Button */}
                    <button
                      type="button"
                      onClick={() => setVideoSplitCompare((v) => !v)}
                      className={`px-2.5 py-1.5 rounded-xl border text-[11px] sm:text-xs font-extrabold flex items-center gap-1 transition-all active:scale-95 ${
                        videoSplitCompare
                          ? 'bg-amber-500/30 border-amber-400 text-amber-100 shadow'
                          : 'bg-white/5 border-white/10 text-gray-300 hover:text-white'
                      }`}
                      title="Comparar dividiendo la pantalla: Anterior (Original) vs Nuevo (Editado)"
                    >
                      <SplitSquareHorizontal size={13} />
                      <span>Comparar A/B</span>
                    </button>

                    {/* Hold to View Full Original Video */}
                    <button
                      type="button"
                      onMouseDown={() => setVideoHoldOriginal(true)}
                      onMouseUp={() => setVideoHoldOriginal(false)}
                      onMouseLeave={() => setVideoHoldOriginal(false)}
                      onTouchStart={() => setVideoHoldOriginal(true)}
                      onTouchEnd={() => setVideoHoldOriginal(false)}
                      className={`px-2.5 py-1.5 rounded-xl border text-[11px] sm:text-xs font-bold flex items-center gap-1 select-none active:scale-95 ${
                        videoHoldOriginal
                          ? 'bg-amber-500 text-gray-950 border-amber-300'
                          : 'bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300'
                      }`}
                      title="Mantén presionado para ver el video anterior (original) completo"
                    >
                      <Eye size={13} />
                      <span>Antes</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Video Canvas Monitor */}
              <div className="relative w-full min-h-[210px] sm:min-h-[380px] rounded-2xl bg-[#07090e] border border-white/10 flex flex-col items-center justify-center p-2 sm:p-3 overflow-hidden shadow-inner">
                {activeClip && (
                  <>
                    <div className="relative flex items-center justify-center max-w-full max-h-[32vh] sm:max-h-[50vh]">
                      <canvas
                        ref={videoPreviewCanvasRef}
                        onPointerDown={handleVideoCanvasPointerDown}
                        onPointerMove={handleVideoCanvasPointerMove}
                        onPointerUp={handleVideoCanvasPointerUp}
                        onPointerCancel={handleVideoCanvasPointerUp}
                        className={`max-w-full max-h-[32vh] sm:max-h-[50vh] w-auto h-auto object-contain rounded-lg shadow-2xl touch-none ${
                          isPickingVideoColor
                            ? 'cursor-ew-resize ring-2 ring-amber-400'
                            : videoSplitCompare
                            ? 'cursor-ew-resize'
                            : 'cursor-pointer'
                        }`}
                      />

                      {/* Floating HUD when dragging targeted color in Video */}
                      {videoHslDragState && videoHslDragState.active && (
                        <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3.5 py-1.5 rounded-full bg-gray-950/90 border border-amber-400 text-xs font-extrabold text-white shadow-2xl flex items-center gap-2 pointer-events-none">
                          <span
                            className={`w-3 h-3 rounded-full ${
                              COLOR_CHANNELS.find((c) => c.id === videoHslDragState.channel)
                                ?.swatchClass || 'bg-amber-500'
                            }`}
                          />
                          <span>
                            {
                              COLOR_CHANNELS.find((c) => c.id === videoHslDragState.channel)
                                ?.label
                            }{' '}
                            •{' '}
                            {videoHslDragState.prop === 'saturation'
                              ? 'Saturación'
                              : videoHslDragState.prop === 'luminance'
                              ? 'Luminosidad'
                              : 'Tono'}
                            :{' '}
                            <strong className="text-amber-300 font-mono">
                              {videoHslDragState.currentVal > 0
                                ? `+${videoHslDragState.currentVal}`
                                : videoHslDragState.currentVal}
                            </strong>
                          </span>
                        </div>
                      )}

                      {videoHoldOriginal && (
                        <div className="absolute top-3 left-3 px-3 py-1 rounded-lg bg-black/80 border border-amber-400/50 text-amber-300 text-xs font-extrabold pointer-events-none">
                          VIENDO ANTERIOR (ORIGINAL SIN CAMBIOS)
                        </div>
                      )}
                    </div>

                    {/* Quick Clip Transport Bar */}
                    <div className="w-full mt-2.5 pt-2 border-t border-white/10 flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={togglePlayActiveClip}
                        className="p-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold shadow shrink-0 active:scale-95"
                        title={isPlayingVideo ? 'Pausar' : 'Reproducir clip'}
                      >
                        {isPlayingVideo ? <Pause size={15} /> : <Play size={15} />}
                      </button>

                      <span className="font-mono text-[11px] text-amber-300 shrink-0">
                        {formatSeconds(currentVideoTime)} / {formatSeconds(activeClip.duration)}
                      </span>

                      <input
                        type="range"
                        min={0}
                        max={activeClip.duration}
                        step={0.05}
                        value={currentVideoTime}
                        onChange={(e) => {
                          const t = Number(e.target.value);
                          setCurrentVideoTime(t);
                          if (videoElementRef.current) {
                            videoElementRef.current.currentTime = t;
                          }
                        }}
                        className="flex-1 accent-amber-400 h-1.5 cursor-pointer"
                      />

                      {videoSplitCompare && (
                        <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-amber-200 shrink-0">
                          <span>División A/B:</span>
                          <input
                            type="range"
                            min={5}
                            max={95}
                            value={videoSplitPosition}
                            onChange={(e) => setVideoSplitPosition(Number(e.target.value))}
                            className="w-20 accent-amber-400 h-1.5 cursor-pointer"
                          />
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* MASTER GLOBAL MULTI-CLIP TIMELINE (Cut, Join, Reorder & Transition Junctions) */}
            <VideoGlobalTimeline
              videoClips={videoClips}
              activeClip={activeClip}
              currentVideoTime={currentVideoTime}
              isPlayingVideo={isPlayingVideo}
              isPlayingSequence={isPlayingSequence}
              totalSequenceDuration={totalVideoSequenceDuration}
              onSelectClip={(id) => setActiveClipId(id)}
              onSeekGlobalTime={handleSeekGlobalVideoTime}
              onSeekActiveClipTime={(sec) => {
                setCurrentVideoTime(sec);
                if (videoElementRef.current) {
                  videoElementRef.current.currentTime = sec;
                }
              }}
              onUpdateActiveClip={(patch) => updateActiveClip(patch)}
              onTogglePlayClip={togglePlayActiveClip}
              onPlayAllSequence={handlePlayAllSequence}
              onSplitActiveClip={handleSplitActiveClip}
              onAddVideosClick={() => videoInputRef.current?.click()}
              onOpenTransitionForClip={(clipId) => {
                setActiveClipId(clipId);
                setActiveVideoPanel('transitions');
              }}
              onMoveClip={handleMoveClip}
              onDuplicateClip={handleDuplicateClip}
              onRemoveClip={handleRemoveClip}
            />
          </div>

          {/* RIGHT: 5-TAB VIDEO INSPECTOR (Luz/Giro, Color HSL, Transiciones, Varios Videos, Exportar Comprimido) */}
          <div className="lg:col-span-5 xl:col-span-4">
            <VideoInspectorPanels
              activeVideoPanel={activeVideoPanel}
              setActiveVideoPanel={setActiveVideoPanel}
              videoClips={videoClips}
              activeClip={activeClip}
              onSelectClip={(id) => setActiveClipId(id)}
              onUpdateActiveClip={(patch) => updateActiveClip(patch)}
              onUpdateClipById={(id, patch) => updateClipById(id, patch)}
              onUpdateVideoColorMixerChannel={updateVideoColorMixerChannel}
              onApplyColorMixerToAllClips={handleApplyColorMixerToAllClips}
              onResetVideoColorMixer={handleResetVideoColorMixer}
              onResetActiveVideoClip={handleResetActiveVideoClip}
              selectedVideoColorChannel={selectedVideoColorChannel}
              setSelectedVideoColorChannel={setSelectedVideoColorChannel}
              videoHslViewMode={videoHslViewMode}
              setVideoHslViewMode={setVideoHslViewMode}
              isPickingVideoColor={isPickingVideoColor}
              setIsPickingVideoColor={setIsPickingVideoColor}
              videoHslBrushProp={videoHslBrushProp}
              setVideoHslBrushProp={setVideoHslBrushProp}
              sequenceFadeIn={sequenceFadeIn}
              setSequenceFadeIn={setSequenceFadeIn}
              sequenceFadeOut={sequenceFadeOut}
              setSequenceFadeOut={setSequenceFadeOut}
              onApplyTransitionToAllClips={handleApplyTransitionToAllClips}
              onAddVideosClick={() => videoInputRef.current?.click()}
              onMoveClip={handleMoveClip}
              onDuplicateClip={handleDuplicateClip}
              onRemoveClip={handleRemoveClip}
              onSplitActiveClip={handleSplitActiveClip}
              sequenceResolution={sequenceResolution}
              setSequenceResolution={setSequenceResolution}
              fitMode={fitMode}
              setFitMode={setFitMode}
              compressionPresetId={compressionPresetId}
              onSelectCompressionPreset={handleSelectCompressionPreset}
              customVideoBitrateMbps={customVideoBitrateMbps}
              setCustomVideoBitrateMbps={setCustomVideoBitrateMbps}
              exportFps={exportFps}
              setExportFps={setExportFps}
              totalSequenceDuration={totalVideoSequenceDuration}
              isExportingVideo={isExportingVideo}
              exportProgress={exportProgress}
              onExportVideo={handleMergeAndExportVideo}
            />
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
};

export default EdicionTab;
