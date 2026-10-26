// High-Performance 60fps Video Studio Engine for Rembrandt7
// Features:
// - 8-Channel Per-Color HSL Mixer for Video (Saturation, Luminance, Hue per color)
// - Camera Raw Tone & Light Controls for Video (Exposure, Contrast, Highlights, Shadows, Temp, Tint, Vignette)
// - Real-time Before / After Split Comparison (A/B draggable split + Hold Original)
// - Customizable Transitions between clips (Fade to Black, Dip to White, Smooth Fade) with configurable duration
// - Smart Compression Profiles for Mobile/WhatsApp, Screen/Presentation, and Master quality

import {
  ColorMixerMap,
  createDefaultColorMixer,
  buildHSL360LUT,
  rgbToHslFast,
  hslToRgbFast,
  clampByte,
} from './cameraRawEngine';

export type VideoTransitionType = 'none' | 'black' | 'white' | 'crossfade';

export interface VideoClipItem {
  id: string;
  name: string;
  file: File;
  fileSize: number; // bytes
  url: string;
  duration: number;
  width: number;
  height: number;
  trimStart: number;
  trimEnd: number;
  rotation: number; // 0, 90, 180, 270
  flipH: boolean;
  flipV: boolean;
  // Light & Color (Global per clip)
  exposure: number;    // -100 to 100
  contrast: number;    // -100 to 100
  highlights: number;  // -100 to 100
  shadows: number;     // -100 to 100
  saturation: number;  // -100 to 100
  vibrance: number;    // -100 to 100
  temperature: number; // -100 to 100
  tint: number;        // -100 to 100
  vignette: number;    // -100 to 100
  // Per-Color HSL Mixer (8 Default Colors: Red, Orange, Yellow, Green, Aqua, Blue, Purple, Magenta)
  colorMixer: ColorMixerMap;
  // Transition to the next clip (and optional fade in on first clip)
  transitionOutType: VideoTransitionType;
  transitionOutDuration: number; // 0.2s to 3.0s (default 0.8s)
  // Audio
  muted: boolean;
  volume: number; // 0 to 100
}

export type VideoCompressionPresetId = 'mobile' | 'screen' | 'master' | 'custom';

export interface VideoCompressionPreset {
  id: VideoCompressionPresetId;
  name: string;
  badge: string;
  subtitle: string;
  recommendedScale: number; // 1 = full sequenceResolution, 0.75 = compact HD
  videoBitsPerSecond: number;
  audioBitsPerSecond: number;
  fps: 24 | 30 | 60;
}

export const VIDEO_COMPRESSION_PRESETS: VideoCompressionPreset[] = [
  {
    id: 'mobile',
    name: 'Celular / WhatsApp / Redes',
    badge: 'COMPRIMIDO LIGERO',
    subtitle: 'Mantiene gran nitidez visual reduciendo el peso un 70%–80%. Ideal para enviar por celular o compartir rápido.',
    recommendedScale: 0.85,
    videoBitsPerSecond: 2_200_000, // 2.2 Mbps
    audioBitsPerSecond: 128_000,
    fps: 30,
  },
  {
    id: 'screen',
    name: 'Pantalla / Web / Presentación',
    badge: 'EQUILIBRADO HD',
    subtitle: 'Balance ideal entre alta definición para pantallas/monitores y archivo comprimido fácil de compartir.',
    recommendedScale: 1.0,
    videoBitsPerSecond: 4_200_000, // 4.2 Mbps
    audioBitsPerSecond: 160_000,
    fps: 30,
  },
  {
    id: 'master',
    name: 'Máxima Calidad (Master Pro)',
    badge: 'ALTA TASA',
    subtitle: 'Compresión mínima para conservar el máximo detalle de color HSL y texturas en pantallas grandes.',
    recommendedScale: 1.0,
    videoBitsPerSecond: 8_500_000, // 8.5 Mbps
    audioBitsPerSecond: 192_000,
    fps: 30,
  },
];

export function createDefaultVideoClip(
  file: File,
  url: string,
  duration: number,
  width: number,
  height: number
): VideoClipItem {
  const cleanDur = Number.isFinite(duration) && duration > 0 ? Number(duration.toFixed(2)) : 10;
  return {
    id: `clip-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: file.name.replace(/\.[^/.]+$/, ''),
    file,
    fileSize: file.size || 0,
    url,
    duration: cleanDur,
    width: width || 1280,
    height: height || 720,
    trimStart: 0,
    trimEnd: cleanDur,
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
    transitionOutType: 'black',
    transitionOutDuration: 0.8,
    muted: false,
    volume: 100,
  };
}

export function cloneVideoClipsList(clips: VideoClipItem[]): VideoClipItem[] {
  return clips.map((c) => ({
    ...c,
    colorMixer: c.colorMixer
      ? JSON.parse(JSON.stringify(c.colorMixer))
      : createDefaultColorMixer(),
  }));
}

export function hasVideoPixelGrading(clip: VideoClipItem): boolean {
  if (!clip) return false;
  if (
    clip.exposure !== 0 ||
    clip.contrast !== 0 ||
    (clip.highlights || 0) !== 0 ||
    (clip.shadows || 0) !== 0 ||
    clip.saturation !== 0 ||
    (clip.vibrance || 0) !== 0 ||
    clip.temperature !== 0 ||
    (clip.tint || 0) !== 0 ||
    (clip.vignette || 0) !== 0
  ) {
    return true;
  }
  if (!clip.colorMixer) return false;
  const hsl = buildHSL360LUT(clip.colorMixer);
  return hsl.active;
}

export function formatBytesToMB(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0.0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb < 1) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${mb.toFixed(1)} MB`;
}

/**
 * Computes transition overlay color & opacity at a given clip playback time.
 * Supports:
 * - Incoming transition from previous clip (first half of transition at start of clip)
 * - Outgoing transition to next clip (second half of transition at end of clip)
 * - Sequence fade-in at clip 0 start & fade-out at last clip end
 */
export function computeClipTransitionOverlay(
  clip: VideoClipItem,
  clipIndex: number,
  allClips: VideoClipItem[],
  currentTimeInClip: number,
  sequenceFadeIn: { enabled: boolean; type: 'black' | 'white'; duration: number },
  sequenceFadeOut: { enabled: boolean; type: 'black' | 'white'; duration: number }
): { color: string | null; alpha: number; audioGainFactor: number } {
  const clipDur = Math.max(0.1, clip.trimEnd - clip.trimStart);
  const elapsedInTrim = Math.max(0, currentTimeInClip - clip.trimStart);
  const remainingInTrim = Math.max(0, clip.trimEnd - currentTimeInClip);

  let overlayColor: string | null = null;
  let alpha = 0;
  let audioGainFactor = 1;

  // 1. Check incoming transition (either from previous clip's transitionOut or sequenceFadeIn on clip 0)
  if (clipIndex === 0 && sequenceFadeIn.enabled && sequenceFadeIn.duration > 0) {
    const fadeDur = Math.min(clipDur * 0.5, sequenceFadeIn.duration);
    if (elapsedInTrim < fadeDur) {
      const progress = elapsedInTrim / fadeDur; // 0 -> 1
      // Smooth cosine ease
      const eased = 0.5 * (1 + Math.cos(progress * Math.PI)); // 1 -> 0
      overlayColor = sequenceFadeIn.type === 'white' ? '#ffffff' : '#000000';
      alpha = eased;
      audioGainFactor = Math.min(audioGainFactor, progress);
    }
  } else if (clipIndex > 0) {
    const prevClip = allClips[clipIndex - 1];
    if (prevClip && prevClip.transitionOutType !== 'none' && prevClip.transitionOutDuration > 0) {
      // Half of the transition happens at the end of prevClip, half at the start of this clip
      const halfDur = Math.min(clipDur * 0.48, prevClip.transitionOutDuration * 0.5);
      if (elapsedInTrim < halfDur && halfDur > 0.02) {
        const progress = elapsedInTrim / halfDur; // 0 -> 1
        const eased = 0.5 * (1 + Math.cos(progress * Math.PI)); // 1 -> 0
        if (prevClip.transitionOutType === 'white') {
          overlayColor = '#ffffff';
          alpha = Math.max(alpha, eased);
        } else {
          // 'black' or 'crossfade' dips smoothly
          overlayColor = '#000000';
          alpha = Math.max(alpha, prevClip.transitionOutType === 'black' ? eased : eased * 0.65);
        }
        audioGainFactor = Math.min(audioGainFactor, 0.25 + 0.75 * progress);
      }
    }
  }

  // 2. Check outgoing transition (either to next clip via clip.transitionOut or sequenceFadeOut on last clip)
  if (clipIndex < allClips.length - 1) {
    if (clip.transitionOutType !== 'none' && clip.transitionOutDuration > 0) {
      const halfDur = Math.min(clipDur * 0.48, clip.transitionOutDuration * 0.5);
      if (remainingInTrim < halfDur && halfDur > 0.02) {
        const progress = 1 - remainingInTrim / halfDur; // 0 -> 1 as it approaches trimEnd
        const eased = 0.5 * (1 - Math.cos(progress * Math.PI)); // 0 -> 1
        if (clip.transitionOutType === 'white') {
          overlayColor = '#ffffff';
          alpha = Math.max(alpha, eased);
        } else {
          overlayColor = '#000000';
          alpha = Math.max(alpha, clip.transitionOutType === 'black' ? eased : eased * 0.65);
        }
        audioGainFactor = Math.min(audioGainFactor, 1 - 0.75 * progress);
      }
    }
  } else if (clipIndex === allClips.length - 1 && sequenceFadeOut.enabled && sequenceFadeOut.duration > 0) {
    const fadeDur = Math.min(clipDur * 0.5, sequenceFadeOut.duration);
    if (remainingInTrim < fadeDur) {
      const progress = 1 - remainingInTrim / fadeDur; // 0 -> 1
      const eased = 0.5 * (1 - Math.cos(progress * Math.PI)); // 0 -> 1
      overlayColor = sequenceFadeOut.type === 'white' ? '#ffffff' : '#000000';
      alpha = Math.max(alpha, eased);
      audioGainFactor = Math.min(audioGainFactor, 1 - progress);
    }
  }

  return { color: overlayColor, alpha: Math.max(0, Math.min(1, alpha)), audioGainFactor };
}

/**
 * Renders a video frame onto targetCanvas with:
 * - Fit mode (blur background, contain, cover), rotation, flip
 * - Per-color 8-channel HSL Mixer + Camera Raw Tone LUTs
 * - Interactive Before / After comparison (Hold Original or Split A/B screen)
 * - Transition overlay (Fade to Black / Dip to White)
 */
export function renderVideoFrameWithHSL(params: {
  videoEl: HTMLVideoElement;
  canvasEl: HTMLCanvasElement;
  clip: VideoClipItem;
  clipIndex: number;
  allClips: VideoClipItem[];
  targetWidth: number;
  targetHeight: number;
  fitMode: 'blur' | 'contain' | 'cover';
  comparison?: {
    holdOriginal: boolean;
    split: boolean;
    splitPct: number;
  };
  sequenceFadeIn: { enabled: boolean; type: 'black' | 'white'; duration: number };
  sequenceFadeOut: { enabled: boolean; type: 'black' | 'white'; duration: number };
}): void {
  const {
    videoEl,
    canvasEl,
    clip,
    clipIndex,
    allClips,
    targetWidth,
    targetHeight,
    fitMode,
    comparison,
    sequenceFadeIn,
    sequenceFadeOut,
  } = params;

  if (canvasEl.width !== targetWidth || canvasEl.height !== targetHeight) {
    canvasEl.width = targetWidth;
    canvasEl.height = targetHeight;
  }

  const ctx = canvasEl.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;

  // Step 1: Draw geometrically transformed raw frame onto canvas
  ctx.save();
  ctx.clearRect(0, 0, targetWidth, targetHeight);

  if (fitMode === 'blur') {
    ctx.save();
    ctx.filter = 'blur(22px) brightness(50%)';
    ctx.drawImage(videoEl, -24, -24, targetWidth + 48, targetHeight + 48);
    ctx.restore();
  } else {
    ctx.fillStyle = '#07090e';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
  }

  ctx.save();
  ctx.translate(targetWidth / 2, targetHeight / 2);
  ctx.rotate((clip.rotation * Math.PI) / 180);
  ctx.scale(clip.flipH ? -1 : 1, clip.flipV ? -1 : 1);

  const rotSwap = clip.rotation % 180 !== 0;
  const vw = rotSwap ? videoEl.videoHeight || 720 : videoEl.videoWidth || 1280;
  const vh = rotSwap ? videoEl.videoWidth || 1280 : videoEl.videoHeight || 720;

  const scale =
    fitMode === 'cover'
      ? Math.max(targetWidth / vw, targetHeight / vh)
      : Math.min(targetWidth / vw, targetHeight / vh);

  const drawW = (videoEl.videoWidth || 1280) * scale;
  const drawH = (videoEl.videoHeight || 720) * scale;

  ctx.drawImage(videoEl, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();
  ctx.restore();

  // If user is holding "Ver Original", skip color grading and show raw geometry
  if (comparison?.holdOriginal) {
    return;
  }

  const needsPixelPass = hasVideoPixelGrading(clip) || Boolean(comparison?.split);

  if (needsPixelPass) {
    const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
    const data = imgData.data;

    const hslLUT = buildHSL360LUT(clip.colorMixer);
    const expGain = Math.pow(2, clip.exposure / 48);
    const contrastVal = clip.contrast * 1.75;
    const contrastFactor = (259 * (contrastVal + 255)) / (255 * (259 - contrastVal));
    const highlightsNorm = (clip.highlights || 0) / 100;
    const shadowsNorm = (clip.shadows || 0) / 100;
    const tempShift = clip.temperature * 0.9;
    const tintShift = (clip.tint || 0) * 0.7;
    const satNorm = 1 + clip.saturation / 100;
    const vibNorm = (clip.vibrance || 0) / 100;
    const vigNorm = (clip.vignette || 0) / 100;

    // 256-entry Tone LUT for ultra-fast per-channel mapping
    const toneLUT = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      let v = (i / 255) * expGain;
      const clampedV = v < 0 ? 0 : v > 1 ? 1 : v;
      const invV = 1 - clampedV;
      v += shadowsNorm * 0.36 * (invV * invV);
      v += highlightsNorm * 0.36 * (clampedV * clampedV);
      let byteV = v * 255;
      byteV = contrastFactor * (byteV - 128) + 128;
      toneLUT[i] = clampByte(byteV);
    }

    const splitX = comparison?.split
      ? Math.round((comparison.splitPct / 100) * targetWidth)
      : -1;

    const halfW = targetWidth * 0.5;
    const halfH = targetHeight * 0.5;
    const maxDistSq = halfW * halfW + halfH * halfH || 1;

    for (let y = 0; y < targetHeight; y++) {
      const dy = y - halfH;
      const dySq = dy * dy;
      for (let x = 0; x < targetWidth; x++) {
        // Left side of Split A/B stays Original (Anterior)!
        if (splitX > 0 && x < splitX) {
          continue;
        }

        const idx = (y * targetWidth + x) * 4;
        let r = data[idx];
        let g = data[idx + 1];
        let b = data[idx + 2];

        // 1. White balance (Temperature & Tint)
        if (tempShift !== 0 || tintShift !== 0) {
          r = clampByte(r + tempShift + tintShift * 0.45);
          g = clampByte(g - tintShift * 0.7);
          b = clampByte(b - tempShift + tintShift * 0.45);
        }

        // 2. Tone LUT (Exposure, Contrast, Highlights, Shadows)
        r = toneLUT[r];
        g = toneLUT[g];
        b = toneLUT[b];

        // 3. 8-Channel Per-Color HSL Mixer (Subir/bajar saturación, oscurecer/aclarar por color)
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
              const nextL = Math.max(
                0,
                Math.min(1, l + lumDelta * (1 - Math.abs(2 * l - 1) * 0.5))
              );
              [r, g, b] = hslToRgbFast(nextH, nextS, nextL);
            }
          }
        }

        // 4. Global Saturation & Vibrance
        if (satNorm !== 1 || vibNorm !== 0) {
          const luma = 0.299 * r + 0.587 * g + 0.114 * b;
          const maxC = r > g ? (r > b ? r : b) : g > b ? g : b;
          const minC = r < g ? (r < b ? r : b) : g < b ? g : b;
          const currentSat = (maxC - minC) * 0.00392156862745098;
          const vibBoost = vibNorm * (1 - currentSat * currentSat) * 1.15;
          const totalSat = Math.max(0, satNorm + vibBoost);

          r = clampByte(luma + (r - luma) * totalSat);
          g = clampByte(luma + (g - luma) * totalSat);
          b = clampByte(luma + (b - luma) * totalSat);
        }

        // 5. Vignette
        if (vigNorm !== 0) {
          const dx = x - halfW;
          const distRatio = (dx * dx + dySq) / maxDistSq;
          const vigFactor = 1 + vigNorm * distRatio * 0.85;
          r = clampByte(r * vigFactor);
          g = clampByte(g * vigFactor);
          b = clampByte(b * vigFactor);
        }

        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
      }
    }

    ctx.putImageData(imgData, 0, 0);

    // Draw Split A/B Divider Line & Labels (ANTERIOR vs NUEVO)
    if (comparison?.split && splitX > 0) {
      ctx.save();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(splitX, 0);
      ctx.lineTo(splitX, targetHeight);
      ctx.stroke();

      const cyMid = targetHeight / 2;
      ctx.beginPath();
      ctx.arc(splitX, cyMid, 16, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(17, 24, 39, 0.92)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#fbbf24';
      ctx.stroke();

      ctx.fillStyle = '#fef3c7';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('◀ ▶', splitX, cyMid + 4);

      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(0,0,0,0.72)';
      ctx.fillRect(8, 8, 74, 22);
      ctx.fillRect(targetWidth - 76, 8, 68, 22);
      ctx.fillStyle = '#e5e7eb';
      ctx.fillText('ANTERIOR', 14, 23);
      ctx.fillStyle = '#fcd34d';
      ctx.fillText('NUEVO', targetWidth - 64, 23);
      ctx.restore();
    }
  }

  // Step 3: Render Transition Overlay (Fade to Black / Dip to White)
  const trans = computeClipTransitionOverlay(
    clip,
    clipIndex,
    allClips,
    videoEl.currentTime,
    sequenceFadeIn,
    sequenceFadeOut
  );

  if (trans.color && trans.alpha > 0.005) {
    ctx.save();
    ctx.globalAlpha = trans.alpha;
    ctx.fillStyle = trans.color;
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    ctx.restore();
  }
}
