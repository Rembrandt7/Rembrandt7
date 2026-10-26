// High-performance 60fps Camera Raw Pixel Engine for Rembrandt7
// Includes:
// - 360-degree precomputed HSL Color Mixer LUT (zero per-pixel trig overhead)
// - 256-entry Monotonic Spline / Piecewise Tone Curve LUTs (Master RGB, R, G, B)
// - 3-Way Color Grading (Shadows, Midtones, Highlights) with Blending & Balance
// - Highlight & Shadow Clipping Warning Overlays
// - Base ImageData Geometry Cache for zero-decode interactive slider dragging

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

export interface CurvePoint {
  x: number; // 0 to 255
  y: number; // 0 to 255
}

export interface ToneCurvesState {
  rgb: CurvePoint[];
  r: CurvePoint[];
  g: CurvePoint[];
  b: CurvePoint[];
}

export interface ColorWheelState {
  hue: number;        // 0 to 360
  saturation: number; // 0 to 100
  luminance: number;  // -100 to 100
}

export interface ColorGradingState {
  shadows: ColorWheelState;
  midtones: ColorWheelState;
  highlights: ColorWheelState;
  blending: number; // 0 to 100 (default 50)
  balance: number;  // -100 to 100 (default 0)
}

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

export function createDefaultColorMixer(): ColorMixerMap {
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

export function createDefaultToneCurves(): ToneCurvesState {
  return {
    rgb: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
    r: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
    g: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
    b: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
  };
}

export function createDefaultColorGrading(): ColorGradingState {
  return {
    shadows: { hue: 210, saturation: 0, luminance: 0 },
    midtones: { hue: 35, saturation: 0, luminance: 0 },
    highlights: { hue: 45, saturation: 0, luminance: 0 },
    blending: 50,
    balance: 0,
  };
}

export function clampByte(val: number): number {
  return val < 0 ? 0 : val > 255 ? 255 : val | 0;
}

export function angularHueDistance(h1: number, h2: number): number {
  const diff = Math.abs(h1 - h2) % 360;
  return diff > 180 ? 360 - diff : diff;
}

export function rgbToHslFast(r: number, g: number, b: number): [number, number, number] {
  const rn = r * 0.00392156862745098;
  const gn = g * 0.00392156862745098;
  const bn = b * 0.00392156862745098;
  const max = rn > gn ? (rn > bn ? rn : bn) : (gn > bn ? gn : bn);
  const min = rn < gn ? (rn < bn ? rn : bn) : (gn < bn ? gn : bn);
  let h = 0;
  let s = 0;
  const l = (max + min) * 0.5;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rn) {
      h = (gn - bn) / d + (gn < bn ? 6 : 0);
    } else if (max === gn) {
      h = (bn - rn) / d + 2;
    } else {
      h = (rn - gn) / d + 4;
    }
    h *= 60;
  }
  return [h, s, l];
}

export function hslToRgbFast(h: number, s: number, l: number): [number, number, number] {
  const hue = ((h % 360) + 360) % 360;
  if (s <= 0) {
    const gray = clampByte(l * 255);
    return [gray, gray, gray];
  }
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c * 0.5;
  let r1 = 0, g1 = 0, b1 = 0;
  if (hue < 60) { r1 = c; g1 = x; b1 = 0; }
  else if (hue < 120) { r1 = x; g1 = c; b1 = 0; }
  else if (hue < 180) { r1 = 0; g1 = c; b1 = x; }
  else if (hue < 240) { r1 = 0; g1 = x; b1 = c; }
  else if (hue < 300) { r1 = x; g1 = 0; b1 = c; }
  else { r1 = c; g1 = 0; b1 = x; }

  return [
    clampByte((r1 + m) * 255),
    clampByte((g1 + m) * 255),
    clampByte((b1 + m) * 255),
  ];
}

export function detectClosestColorChannel(r: number, g: number, b: number): ColorChannelId {
  const [h] = rgbToHslFast(r, g, b);
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

/**
 * Precomputes a 360-entry lookup table for Hue, Saturation, and Luminance shifts
 * so pixel processing never executes trigonometric functions per pixel!
 */
export function buildHSL360LUT(colorMixer: ColorMixerMap): {
  active: boolean;
  hueShift: Float32Array;
  satShift: Float32Array;
  lumShift: Float32Array;
} {
  const active = COLOR_CHANNELS.some((ch) => {
    const v = colorMixer[ch.id];
    return v && (v.hue !== 0 || v.saturation !== 0 || v.luminance !== 0);
  });

  const hueShift = new Float32Array(360);
  const satShift = new Float32Array(360);
  const lumShift = new Float32Array(360);

  if (!active) {
    return { active: false, hueShift, satShift, lumShift };
  }

  const bandwidth = 42;
  for (let deg = 0; deg < 360; deg++) {
    let hD = 0;
    let sD = 0;
    let lD = 0;
    for (const ch of COLOR_CHANNELS) {
      const dist = angularHueDistance(deg, ch.centerHue);
      if (dist < bandwidth) {
        const w = 0.5 * (1 + Math.cos((dist / bandwidth) * Math.PI));
        const cVal = colorMixer[ch.id];
        hD += cVal.hue * 0.42 * w;
        sD += (cVal.saturation / 100) * w;
        lD += (cVal.luminance / 100) * 0.36 * w;
      }
    }
    hueShift[deg] = hD;
    satShift[deg] = sD;
    lumShift[deg] = lD;
  }

  return { active: true, hueShift, satShift, lumShift };
}

/**
 * Evaluates a smooth monotonic cubic Hermite spline (or piecewise linear for 2 points)
 * across 256 byte values.
 */
export function buildCurveLUT(points: CurvePoint[]): { isIdentity: boolean; lut: Uint8Array } {
  const lut = new Uint8Array(256);
  if (!points || points.length < 2) {
    for (let i = 0; i < 256; i++) lut[i] = i;
    return { isIdentity: true, lut };
  }

  const sorted = [...points].sort((a, b) => a.x - b.x);
  if (
    sorted.length === 2 &&
    sorted[0].x === 0 &&
    sorted[0].y === 0 &&
    sorted[1].x === 255 &&
    sorted[1].y === 255
  ) {
    for (let i = 0; i < 256; i++) lut[i] = i;
    return { isIdentity: true, lut };
  }

  const n = sorted.length;
  const xs = sorted.map((p) => p.x);
  const ys = sorted.map((p) => p.y);

  // Compute secants and tangents (Fritsch-Carlson monotonic cubic spline)
  const dys: number[] = [];
  const dxs: number[] = [];
  const ms: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const dx = Math.max(0.001, xs[i + 1] - xs[i]);
    const dy = ys[i + 1] - ys[i];
    dxs.push(dx);
    dys.push(dy);
    ms.push(dy / dx);
  }

  const c1s: number[] = [ms[0]];
  for (let i = 0; i < dxs.length - 1; i++) {
    const m = ms[i];
    const mNext = ms[i + 1];
    if (m * mNext <= 0) {
      c1s.push(0);
    } else {
      const dx = dxs[i];
      const dxNext = dxs[i + 1];
      const common = dx + dxNext;
      c1s.push((3 * common) / ((common + dxNext) / m + (common + dx) / mNext));
    }
  }
  c1s.push(ms[ms.length - 1]);

  const c2s: number[] = [];
  const c3s: number[] = [];
  for (let i = 0; i < c1s.length - 1; i++) {
    const c1 = c1s[i];
    const m = ms[i];
    const invDx = 1 / dxs[i];
    const common = c1 + c1s[i + 1] - m - m;
    c2s.push((m - c1 - common) * invDx);
    c3s.push(common * invDx * invDx);
  }

  for (let x = 0; x < 256; x++) {
    if (x <= xs[0]) {
      lut[x] = clampByte(ys[0]);
      continue;
    }
    if (x >= xs[n - 1]) {
      lut[x] = clampByte(ys[n - 1]);
      continue;
    }
    let seg = 0;
    for (let i = 0; i < n - 1; i++) {
      if (x >= xs[i] && x <= xs[i + 1]) {
        seg = i;
        break;
      }
    }
    const diff = x - xs[seg];
    const diffSq = diff * diff;
    const val = ys[seg] + c1s[seg] * diff + c2s[seg] * diffSq + c3s[seg] * diff * diffSq;
    lut[x] = clampByte(Math.round(val));
  }

  return { isIdentity: false, lut };
}

export function isColorGradingActive(cg: ColorGradingState): boolean {
  if (!cg) return false;
  return (
    cg.shadows.saturation > 0 ||
    cg.shadows.luminance !== 0 ||
    cg.midtones.saturation > 0 ||
    cg.midtones.luminance !== 0 ||
    cg.highlights.saturation > 0 ||
    cg.highlights.luminance !== 0
  );
}

/**
 * Precomputes RGB offsets across 256 luminance levels for 3-Way Color Grading
 * (Shadows, Midtones, Highlights) so per-pixel grading is a single array lookup!
 */
export function buildColorGradingLUT(cg: ColorGradingState): {
  active: boolean;
  rShift: Int16Array;
  gShift: Int16Array;
  bShift: Int16Array;
} {
  const rShift = new Int16Array(256);
  const gShift = new Int16Array(256);
  const bShift = new Int16Array(256);

  if (!isColorGradingActive(cg)) {
    return { active: false, rShift, gShift, bShift };
  }

  const wheelToOffset = (w: ColorWheelState) => {
    const rad = (w.hue * Math.PI) / 180;
    const strength = (w.saturation / 100) * 68;
    const lumOffset = (w.luminance / 100) * 42;
    // Convert hue angle to opponent RGB tint vectors
    const rTint = Math.cos(rad) * strength + lumOffset;
    const gTint = Math.cos(rad - (2 * Math.PI) / 3) * strength + lumOffset;
    const bTint = Math.cos(rad - (4 * Math.PI) / 3) * strength + lumOffset;
    return [rTint, gTint, bTint];
  };

  const [sr, sg, sb] = wheelToOffset(cg.shadows);
  const [mr, mg, mb] = wheelToOffset(cg.midtones);
  const [hr, hg, hb] = wheelToOffset(cg.highlights);

  const balanceShift = (cg.balance / 100) * 0.28;
  const blendFactor = 0.5 + (cg.blending / 100) * 0.8;

  for (let i = 0; i < 256; i++) {
    const t = Math.max(0, Math.min(1, i / 255 - balanceShift));
    const sWeight = Math.pow(1 - t, 1.8 / blendFactor);
    const hWeight = Math.pow(t, 1.8 / blendFactor);
    const mWeight = Math.max(0, 1 - Math.abs(2 * t - 1) * (1.25 / blendFactor));

    rShift[i] = Math.round(sr * sWeight + mr * mWeight + hr * hWeight);
    gShift[i] = Math.round(sg * sWeight + mg * mWeight + hg * hWeight);
    bShift[i] = Math.round(sb * sWeight + mb * mWeight + hb * hWeight);
  }

  return { active: true, rShift, gShift, bShift };
}
