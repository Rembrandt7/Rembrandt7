import React from 'react';
import {
  Sliders,
  Palette,
  Sparkles,
  Film,
  Download,
  RefreshCw,
  Pipette,
  Plus,
  Trash2,
  Play,
  Pause,
  Scissors,
  ArrowUp,
  ArrowDown,
  Volume2,
  VolumeX,
  RotateCcw,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Copy,
  Upload,
  Check,
  Smartphone,
  Monitor,
  Award,
} from 'lucide-react';
import {
  COLOR_CHANNELS,
  ColorChannelId,
  HSLChannelValues,
} from '../utils/cameraRawEngine';
import {
  VideoClipItem,
  VideoTransitionType,
  VideoCompressionPresetId,
  VIDEO_COMPRESSION_PRESETS,
  formatBytesToMB,
} from '../utils/videoStudioEngine';

export type ActiveVideoPanelType = 'light' | 'hsl' | 'transitions' | 'clips' | 'export';

function formatSeconds(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00.0';
  const mins = Math.floor(sec / 60);
  const rem = sec - mins * 60;
  return `${mins}:${rem < 10 ? '0' : ''}${rem.toFixed(1)}`;
}

const VideoSliderControl: React.FC<{
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
  gradientClass = 'from-gray-700 via-gray-500 to-amber-500',
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
          title="Toca para restablecer a 0"
          className={`font-semibold transition-colors text-left flex items-center gap-1.5 ${
            isModified ? 'text-amber-300 hover:text-white' : 'text-gray-300 hover:text-white'
          }`}
        >
          <span>{label}</span>
          {isModified && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />}
        </button>
        <div className="flex items-center gap-1.5">
          {isModified && onReset && (
            <button
              type="button"
              onClick={onReset}
              className="text-[11px] text-gray-400 hover:text-amber-300 px-1.5 py-0.5 rounded-md bg-white/5 active:scale-95"
              title="Resetear a 0"
            >
              ↺
            </button>
          )}
          <span
            className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded-lg min-w-[38px] text-center ${
              isModified
                ? 'bg-amber-500/25 text-amber-200 border border-amber-400/40 shadow-sm'
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
          className={`w-full h-2 rounded-full appearance-none cursor-pointer touch-pan-y bg-gradient-to-r ${gradientClass} accent-amber-400`}
        />
      </div>
    </div>
  );
};

// ==================== GLOBAL MULTI-CLIP TIMELINE ====================
export const VideoGlobalTimeline: React.FC<{
  videoClips: VideoClipItem[];
  activeClip: VideoClipItem | null;
  currentVideoTime: number;
  isPlayingVideo: boolean;
  isPlayingSequence: boolean;
  totalSequenceDuration: number;
  onSelectClip: (clipId: string) => void;
  onSeekGlobalTime: (globalSec: number) => void;
  onSeekActiveClipTime: (clipSec: number) => void;
  onUpdateActiveClip: (patch: Partial<VideoClipItem>) => void;
  onTogglePlayClip: () => void;
  onPlayAllSequence: () => void;
  onSplitActiveClip: () => void;
  onAddVideosClick: () => void;
  onOpenTransitionForClip: (clipId: string) => void;
  onMoveClip: (index: number, dir: -1 | 1) => void;
  onDuplicateClip: (clip: VideoClipItem) => void;
  onRemoveClip: (id: string) => void;
}> = ({
  videoClips,
  activeClip,
  currentVideoTime,
  isPlayingVideo,
  isPlayingSequence,
  totalSequenceDuration,
  onSelectClip,
  onSeekGlobalTime,
  onSeekActiveClipTime,
  onUpdateActiveClip,
  onTogglePlayClip,
  onPlayAllSequence,
  onSplitActiveClip,
  onAddVideosClick,
  onOpenTransitionForClip,
  onMoveClip,
  onDuplicateClip,
  onRemoveClip,
}) => {
  // Compute global playhead position across all clips
  let globalElapsedBeforeActive = 0;
  for (const c of videoClips) {
    if (activeClip && c.id === activeClip.id) break;
    globalElapsedBeforeActive += Math.max(0.1, c.trimEnd - c.trimStart);
  }
  const activeElapsedInTrim = activeClip
    ? Math.max(0, Math.min(activeClip.trimEnd - activeClip.trimStart, currentVideoTime - activeClip.trimStart))
    : 0;
  const globalPlayheadSec = Math.min(
    totalSequenceDuration,
    globalElapsedBeforeActive + activeElapsedInTrim
  );

  return (
    <div className="bg-gray-900/95 border border-white/10 rounded-2xl p-3 sm:p-4 space-y-3 shadow-xl">
      {/* Header Row: Global Timeline Title & Sequence Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
            <Film size={14} />
            Línea de Tiempo General ({videoClips.length} {videoClips.length === 1 ? 'clip' : 'clips unidos'})
          </span>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-200 border border-amber-500/30">
            Aguja Global: {formatSeconds(globalPlayheadSec)} / {formatSeconds(totalSequenceDuration)}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={onPlayAllSequence}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all active:scale-95 ${
              isPlayingSequence && isPlayingVideo
                ? 'bg-amber-500 text-gray-950 shadow-lg shadow-amber-500/25'
                : 'bg-purple-600/30 hover:bg-purple-600/45 border border-purple-400/40 text-purple-100'
            }`}
          >
            {isPlayingSequence && isPlayingVideo ? <Pause size={13} /> : <Play size={13} />}
            <span>Reproducir Toda la Secuencia</span>
          </button>

          <button
            type="button"
            onClick={onSplitActiveClip}
            disabled={!activeClip}
            className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-amber-500/20 border border-white/10 hover:border-amber-400/40 text-xs font-bold text-amber-200 flex items-center gap-1 active:scale-95 disabled:opacity-40"
            title="Divide el clip actual en dos partes en la posición de la aguja"
          >
            <Scissors size={13} />
            <span>Cortar en Aguja</span>
          </button>

          <button
            type="button"
            onClick={onAddVideosClick}
            className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 text-xs font-extrabold flex items-center gap-1 active:scale-95"
          >
            <Plus size={13} />
            <span>Unir Videos</span>
          </button>
        </div>
      </div>

      {/* Master Sequence Scrubber Bar (0:00 -> Total Joined Duration) */}
      <div className="space-y-1 bg-gray-950/90 p-2.5 rounded-xl border border-white/10">
        <div className="flex items-center justify-between text-[10px] font-mono text-gray-400 px-0.5">
          <span>0:00.0 (Inicio)</span>
          <span>{formatSeconds(totalSequenceDuration * 0.25)}</span>
          <span>{formatSeconds(totalSequenceDuration * 0.5)}</span>
          <span>{formatSeconds(totalSequenceDuration * 0.75)}</span>
          <span className="text-amber-300 font-bold">{formatSeconds(totalSequenceDuration)} (Fin)</span>
        </div>

        <input
          type="range"
          min={0}
          max={Math.max(0.1, totalSequenceDuration)}
          step={0.05}
          value={globalPlayheadSec}
          onChange={(e) => onSeekGlobalTime(Number(e.target.value))}
          className="w-full h-2.5 rounded-full appearance-none cursor-pointer touch-pan-y bg-gradient-to-r from-amber-500/40 via-purple-500/40 to-emerald-500/40 accent-amber-400"
          title="Arrastra para moverte por toda la línea de tiempo unida"
        />

        {/* Visual Multi-Clip Track with Transition Junctions */}
        <div className="pt-2 overflow-x-auto no-scrollbar">
          <div className="flex items-stretch gap-1 min-w-full pb-1">
            {videoClips.map((clip, idx) => {
              const isSelected = activeClip?.id === clip.id;
              const clipDur = Math.max(0.1, clip.trimEnd - clip.trimStart);
              const widthPct = Math.max(
                14,
                Math.round((clipDur / Math.max(0.1, totalSequenceDuration)) * 100)
              );
              const clipPlayheadPct = isSelected
                ? Math.max(
                    0,
                    Math.min(100, ((currentVideoTime - clip.trimStart) / clipDur) * 100)
                  )
                : 0;

              return (
                <React.Fragment key={clip.id}>
                  {/* Proportional Visual Clip Block */}
                  <div
                    onClick={() => onSelectClip(clip.id)}
                    style={{ flex: `${widthPct} 1 130px` }}
                    className={`relative group rounded-xl p-2 border cursor-pointer transition-all overflow-hidden select-none ${
                      isSelected
                        ? 'bg-gradient-to-r from-amber-500/25 via-amber-500/15 to-purple-500/20 border-amber-400 shadow-[0_0_16px_rgba(245,158,11,0.25)]'
                        : 'bg-white/[0.04] border-white/10 hover:bg-white/[0.08] hover:border-white/25'
                    }`}
                  >
                    {/* Live Playhead Indicator inside Active Clip */}
                    {isSelected && (
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-amber-400 shadow-[0_0_8px_#fbbf24] pointer-events-none z-10"
                        style={{ left: `${clipPlayheadPct}%` }}
                      />
                    )}

                    <div className="flex items-center justify-between gap-1.5 relative z-20">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={`w-5 h-5 rounded-md font-black text-[10px] flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-amber-400 text-gray-950'
                              : 'bg-white/10 text-gray-300'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold text-white truncate">
                          {clip.name}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/50 text-amber-300 shrink-0">
                        {formatSeconds(clipDur)}
                      </span>
                    </div>

                    <div className="mt-1.5 flex items-center justify-between text-[10px] text-gray-400 relative z-20">
                      <span className="font-mono">
                        In: {formatSeconds(clip.trimStart)} → Out: {formatSeconds(clip.trimEnd)}
                      </span>
                      <div
                        className="flex items-center gap-0.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => onMoveClip(idx, -1)}
                          disabled={idx === 0}
                          className="p-1 rounded hover:bg-white/10 text-gray-300 disabled:opacity-25"
                          title="Mover antes"
                        >
                          <ArrowUp size={11} className="-rotate-90" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onMoveClip(idx, 1)}
                          disabled={idx === videoClips.length - 1}
                          className="p-1 rounded hover:bg-white/10 text-gray-300 disabled:opacity-25"
                          title="Mover después"
                        >
                          <ArrowDown size={11} className="-rotate-90" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDuplicateClip(clip)}
                          className="p-1 rounded hover:bg-white/10 text-gray-300"
                          title="Duplicar clip"
                        >
                          <Copy size={11} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemoveClip(clip.id)}
                          className="p-1 rounded hover:bg-red-500/25 text-red-300"
                          title="Quitar clip"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Interactive Transition Pill Between Clip i and Clip i+1 */}
                  {idx < videoClips.length - 1 && (
                    <button
                      type="button"
                      onClick={() => onOpenTransitionForClip(clip.id)}
                      title="Haz clic para configurar la transición entre estos dos videos (Negro, Blanco y Duración)"
                      className={`shrink-0 px-2 py-1 rounded-xl border flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold transition-all active:scale-95 ${
                        clip.transitionOutType === 'white'
                          ? 'bg-white/20 border-white/60 text-white shadow-sm'
                          : clip.transitionOutType === 'black'
                          ? 'bg-gray-950 border-purple-400/60 text-purple-200 shadow-sm'
                          : clip.transitionOutType === 'crossfade'
                          ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                          : 'bg-white/5 border-white/10 text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      <Sparkles size={11} />
                      <span>
                        {clip.transitionOutType === 'black'
                          ? 'A Negro'
                          : clip.transitionOutType === 'white'
                          ? 'A Blanco'
                          : clip.transitionOutType === 'crossfade'
                          ? 'Suave'
                          : 'Corte'}
                      </span>
                      {clip.transitionOutType !== 'none' && (
                        <span className="font-mono text-[9px] opacity-85">
                          {clip.transitionOutDuration.toFixed(1)}s
                        </span>
                      )}
                    </button>
                  )}
                </React.Fragment>
              );
            })}

            {/* Quick Add Video Block at the end of timeline */}
            <button
              type="button"
              onClick={onAddVideosClick}
              className="shrink-0 px-3 py-2 rounded-xl border border-dashed border-amber-500/40 hover:border-amber-400 bg-amber-500/5 hover:bg-amber-500/15 text-amber-300 text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all"
              title="Añadir más videos al final de la línea de tiempo"
            >
              <Plus size={15} />
              <span className="text-[10px]">+ Video</span>
            </button>
          </div>
        </div>
      </div>

      {/* Selected Clip Fine Trim Controls (In / Out) */}
      {activeClip && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-950/75 p-2.5 rounded-xl border border-white/10">
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-emerald-300 font-bold">
                Recorte Inicio (In): {formatSeconds(activeClip.trimStart)}
              </span>
              <button
                type="button"
                onClick={() =>
                  onUpdateActiveClip({
                    trimStart: Math.min(
                      Number(currentVideoTime.toFixed(1)),
                      activeClip.trimEnd - 0.2
                    ),
                  })
                }
                className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 font-semibold"
              >
                Usar Posición Actual
              </button>
            </div>
            <input
              type="range"
              min={0}
              max={Math.max(0.1, activeClip.trimEnd - 0.2)}
              step={0.1}
              value={activeClip.trimStart}
              onChange={(e) => {
                const val = Number(e.target.value);
                onUpdateActiveClip({ trimStart: val });
                onSeekActiveClipTime(val);
              }}
              className="w-full accent-emerald-400 h-1.5 cursor-pointer"
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-rose-300 font-bold">
                Recorte Fin (Out): {formatSeconds(activeClip.trimEnd)}
              </span>
              <button
                type="button"
                onClick={() =>
                  onUpdateActiveClip({
                    trimEnd: Math.max(
                      Number(currentVideoTime.toFixed(1)),
                      activeClip.trimStart + 0.2
                    ),
                  })
                }
                className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 font-semibold"
              >
                Usar Posición Actual
              </button>
            </div>
            <input
              type="range"
              min={Math.min(activeClip.duration, activeClip.trimStart + 0.2)}
              max={activeClip.duration}
              step={0.1}
              value={activeClip.trimEnd}
              onChange={(e) => {
                const val = Number(e.target.value);
                onUpdateActiveClip({ trimEnd: val });
                onSeekActiveClipTime(val);
              }}
              className="w-full accent-rose-400 h-1.5 cursor-pointer"
            />
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== 5-TAB VIDEO INSPECTOR DOCK & PANELS ====================
export const VideoInspectorPanels: React.FC<{
  activeVideoPanel: ActiveVideoPanelType;
  setActiveVideoPanel: (panel: ActiveVideoPanelType) => void;
  videoClips: VideoClipItem[];
  activeClip: VideoClipItem | null;
  onSelectClip: (id: string) => void;
  onUpdateActiveClip: (patch: Partial<VideoClipItem>) => void;
  onUpdateClipById: (id: string, patch: Partial<VideoClipItem>) => void;
  onUpdateVideoColorMixerChannel: (channel: ColorChannelId, patch: Partial<HSLChannelValues>) => void;
  onApplyColorMixerToAllClips: () => void;
  onResetVideoColorMixer: () => void;
  onResetActiveVideoClip: () => void;
  selectedVideoColorChannel: ColorChannelId;
  setSelectedVideoColorChannel: (ch: ColorChannelId) => void;
  videoHslViewMode: 'channel' | 'saturation' | 'luminance' | 'hue';
  setVideoHslViewMode: (m: 'channel' | 'saturation' | 'luminance' | 'hue') => void;
  isPickingVideoColor: boolean;
  setIsPickingVideoColor: React.Dispatch<React.SetStateAction<boolean>>;
  videoHslBrushProp: 'saturation' | 'luminance' | 'hue';
  setVideoHslBrushProp: (p: 'saturation' | 'luminance' | 'hue') => void;
  sequenceFadeIn: { enabled: boolean; type: 'black' | 'white'; duration: number };
  setSequenceFadeIn: React.Dispatch<
    React.SetStateAction<{ enabled: boolean; type: 'black' | 'white'; duration: number }>
  >;
  sequenceFadeOut: { enabled: boolean; type: 'black' | 'white'; duration: number };
  setSequenceFadeOut: React.Dispatch<
    React.SetStateAction<{ enabled: boolean; type: 'black' | 'white'; duration: number }>
  >;
  onApplyTransitionToAllClips: (type: VideoTransitionType, duration: number) => void;
  onAddVideosClick: () => void;
  onMoveClip: (index: number, dir: -1 | 1) => void;
  onDuplicateClip: (clip: VideoClipItem) => void;
  onRemoveClip: (id: string) => void;
  onSplitActiveClip: () => void;
  // Export & Compression props
  sequenceResolution: '1280x720' | '1920x1080' | '720x1280' | '1080x1080';
  setSequenceResolution: (r: '1280x720' | '1920x1080' | '720x1280' | '1080x1080') => void;
  fitMode: 'blur' | 'contain' | 'cover';
  setFitMode: (m: 'blur' | 'contain' | 'cover') => void;
  compressionPresetId: VideoCompressionPresetId;
  onSelectCompressionPreset: (id: VideoCompressionPresetId) => void;
  customVideoBitrateMbps: number;
  setCustomVideoBitrateMbps: (mbps: number) => void;
  exportFps: 24 | 30 | 60;
  setExportFps: (fps: 24 | 30 | 60) => void;
  totalSequenceDuration: number;
  isExportingVideo: boolean;
  exportProgress: number;
  onExportVideo: () => void;
}> = ({
  activeVideoPanel,
  setActiveVideoPanel,
  videoClips,
  activeClip,
  onSelectClip,
  onUpdateActiveClip,
  onUpdateClipById,
  onUpdateVideoColorMixerChannel,
  onApplyColorMixerToAllClips,
  onResetVideoColorMixer,
  onResetActiveVideoClip,
  selectedVideoColorChannel,
  setSelectedVideoColorChannel,
  videoHslViewMode,
  setVideoHslViewMode,
  isPickingVideoColor,
  setIsPickingVideoColor,
  videoHslBrushProp,
  setVideoHslBrushProp,
  sequenceFadeIn,
  setSequenceFadeIn,
  sequenceFadeOut,
  setSequenceFadeOut,
  onApplyTransitionToAllClips,
  onAddVideosClick,
  onMoveClip,
  onDuplicateClip,
  onRemoveClip,
  onSplitActiveClip,
  sequenceResolution,
  setSequenceResolution,
  fitMode,
  setFitMode,
  compressionPresetId,
  onSelectCompressionPreset,
  customVideoBitrateMbps,
  setCustomVideoBitrateMbps,
  exportFps,
  setExportFps,
  totalSequenceDuration,
  isExportingVideo,
  exportProgress,
  onExportVideo,
}) => {
  const activeChannelObj =
    COLOR_CHANNELS.find((c) => c.id === selectedVideoColorChannel) || COLOR_CHANNELS[0];

  const totalOriginalBytes = videoClips.reduce((acc, c) => acc + (c.fileSize || 0), 0);
  // Estimate compressed output size: (videoBitsPerSecond + audioBitsPerSecond) * duration / 8
  const estimatedCompressedBytes = Math.round(
    ((customVideoBitrateMbps * 1_000_000 + 128_000) * Math.max(1, totalSequenceDuration)) / 8
  );
  const savingsPct =
    totalOriginalBytes > 0 && estimatedCompressedBytes < totalOriginalBytes
      ? Math.round(((totalOriginalBytes - estimatedCompressedBytes) / totalOriginalBytes) * 100)
      : 0;

  const activeClipIndex = activeClip
    ? videoClips.findIndex((c) => c.id === activeClip.id)
    : -1;

  return (
    <div className="bg-gray-950/95 border border-white/10 rounded-2xl p-3 sm:p-4 flex flex-col gap-3.5 shadow-2xl">
      {/* 5-Tab Swipeable Video App Dock */}
      <div className="flex lg:grid lg:grid-cols-5 gap-1.5 bg-gray-900/95 p-1.5 rounded-2xl border border-white/10 overflow-x-auto no-scrollbar">
        {[
          { id: 'light', label: 'Luz / Giro', icon: Sliders },
          { id: 'hsl', label: 'Color HSL', icon: Palette },
          { id: 'transitions', label: 'Transiciones', icon: Sparkles },
          { id: 'clips', label: `Videos (${videoClips.length})`, icon: Film },
          { id: 'export', label: 'Exportar', icon: Download },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeVideoPanel === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveVideoPanel(tab.id as ActiveVideoPanelType);
                if (tab.id !== 'hsl') setIsPickingVideoColor(false);
              }}
              className={`min-w-[76px] lg:min-w-0 shrink-0 py-2 px-2 rounded-xl text-[11px] font-extrabold flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${
                active
                  ? 'bg-gradient-to-b from-amber-500 to-orange-600 text-gray-950 shadow-lg shadow-amber-500/30 border border-amber-300/60'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={14} />
              <span className="truncate max-w-full">{tab.label}</span>
              {active && <span className="w-1.5 h-1.5 rounded-full bg-gray-950" />}
            </button>
          );
        })}
      </div>

      {/* ==================== TAB 1: LUZ, COLOR GLOBAL, GIRO Y AUDIO ==================== */}
      {activeVideoPanel === 'light' && activeClip && (
        <div className="space-y-4 max-h-[58vh] overflow-y-auto pr-1 custom-scrollbar">
          {/* Light & Global Color */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-amber-300">
                Luz y Tono (Clip #{activeClipIndex + 1})
              </span>
              <button
                type="button"
                onClick={onResetActiveVideoClip}
                className="text-[11px] text-rose-300 hover:text-rose-200 flex items-center gap-1 font-bold"
              >
                <RefreshCw size={11} />
                Resetear Clip
              </button>
            </div>

            <VideoSliderControl
              label="Exposición / Brillo"
              value={activeClip.exposure}
              min={-100}
              max={100}
              onChange={(v) => onUpdateActiveClip({ exposure: v })}
              onReset={() => onUpdateActiveClip({ exposure: 0 })}
            />
            <VideoSliderControl
              label="Contraste"
              value={activeClip.contrast}
              min={-100}
              max={100}
              onChange={(v) => onUpdateActiveClip({ contrast: v })}
              onReset={() => onUpdateActiveClip({ contrast: 0 })}
            />
            <VideoSliderControl
              label="Iluminaciones (Luces Altas)"
              value={activeClip.highlights || 0}
              min={-100}
              max={100}
              onChange={(v) => onUpdateActiveClip({ highlights: v })}
              onReset={() => onUpdateActiveClip({ highlights: 0 })}
            />
            <VideoSliderControl
              label="Sombras (Aclarar / Oscurecer)"
              value={activeClip.shadows || 0}
              min={-100}
              max={100}
              onChange={(v) => onUpdateActiveClip({ shadows: v })}
              onReset={() => onUpdateActiveClip({ shadows: 0 })}
            />
            <VideoSliderControl
              label="Saturación General"
              value={activeClip.saturation}
              min={-100}
              max={100}
              gradientClass="from-gray-600 via-pink-500 to-amber-400"
              onChange={(v) => onUpdateActiveClip({ saturation: v })}
              onReset={() => onUpdateActiveClip({ saturation: 0 })}
            />
            <VideoSliderControl
              label="Intensidad / Vibrancia"
              value={activeClip.vibrance || 0}
              min={-100}
              max={100}
              gradientClass="from-gray-600 via-purple-500 to-cyan-400"
              onChange={(v) => onUpdateActiveClip({ vibrance: v })}
              onReset={() => onUpdateActiveClip({ vibrance: 0 })}
            />
            <VideoSliderControl
              label="Temperatura (Frío ↔ Cálido)"
              value={activeClip.temperature}
              min={-100}
              max={100}
              gradientClass="from-blue-500 via-gray-400 to-amber-500"
              onChange={(v) => onUpdateActiveClip({ temperature: v })}
              onReset={() => onUpdateActiveClip({ temperature: 0 })}
            />
            <VideoSliderControl
              label="Matiz (Verde ↔ Magenta)"
              value={activeClip.tint || 0}
              min={-100}
              max={100}
              gradientClass="from-emerald-500 via-gray-400 to-pink-500"
              onChange={(v) => onUpdateActiveClip({ tint: v })}
              onReset={() => onUpdateActiveClip({ tint: 0 })}
            />
            <VideoSliderControl
              label="Viñeta Cinematográfica"
              value={activeClip.vignette || 0}
              min={-100}
              max={100}
              onChange={(v) => onUpdateActiveClip({ vignette: v })}
              onReset={() => onUpdateActiveClip({ vignette: 0 })}
            />
          </div>

          {/* Geometry & Audio */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
            <span className="text-xs font-extrabold uppercase tracking-wider text-purple-300 block">
              Giro, Espejo y Audio del Clip
            </span>

            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() =>
                  onUpdateActiveClip({ rotation: (activeClip.rotation - 90 + 360) % 360 })
                }
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex flex-col items-center gap-1 text-xs text-gray-200"
              >
                <RotateCcw size={15} />
                <span>-90°</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  onUpdateActiveClip({ rotation: (activeClip.rotation + 90) % 360 })
                }
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex flex-col items-center gap-1 text-xs text-gray-200"
              >
                <RotateCw size={15} />
                <span>+90°</span>
              </button>
              <button
                type="button"
                onClick={() => onUpdateActiveClip({ flipH: !activeClip.flipH })}
                className={`p-2 rounded-xl border flex flex-col items-center gap-1 text-xs ${
                  activeClip.flipH
                    ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                    : 'bg-white/5 border-white/10 text-gray-200'
                }`}
              >
                <FlipHorizontal size={15} />
                <span>Espejo H</span>
              </button>
              <button
                type="button"
                onClick={() => onUpdateActiveClip({ flipV: !activeClip.flipV })}
                className={`p-2 rounded-xl border flex flex-col items-center gap-1 text-xs ${
                  activeClip.flipV
                    ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                    : 'bg-white/5 border-white/10 text-gray-200'
                }`}
              >
                <FlipVertical size={15} />
                <span>Espejo V</span>
              </button>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => onUpdateActiveClip({ muted: !activeClip.muted })}
                className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold ${
                  activeClip.muted
                    ? 'bg-red-500/25 border-red-400 text-red-200'
                    : 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200'
                }`}
              >
                {activeClip.muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                <span>{activeClip.muted ? 'Audio Silenciado (Mudo)' : 'Audio Activo'}</span>
              </button>
            </div>

            {!activeClip.muted && (
              <VideoSliderControl
                label="Volumen del Clip"
                value={activeClip.volume}
                min={0}
                max={100}
                unit="%"
                onChange={(v) => onUpdateActiveClip({ volume: v })}
                onReset={() => onUpdateActiveClip({ volume: 100 })}
              />
            )}
          </div>
        </div>
      )}

      {/* ==================== TAB 2: APARTADO EXCLUSIVO COLOR HSL POR COLOR ==================== */}
      {activeVideoPanel === 'hsl' && activeClip && (
        <div className="space-y-3.5 max-h-[58vh] overflow-y-auto pr-1 custom-scrollbar">
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-amber-300 block">
                  Control por Color en Video (HSL)
                </span>
                <p className="text-[11px] text-gray-400">
                  Sube o baja la saturación y oscurece o aclara cada color por separado
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsPickingVideoColor((v) => !v)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border flex items-center gap-1 font-bold transition-all ${
                    isPickingVideoColor
                      ? 'bg-amber-500 text-gray-950 border-amber-300 shadow-lg'
                      : 'bg-white/5 border-white/10 text-gray-300 hover:text-white'
                  }`}
                  title="Toca un color en el video y arrastra a la derecha (+) o izquierda (-)"
                >
                  <Pipette size={12} />
                  {isPickingVideoColor ? 'Arrastra en Video ↔' : 'Elegir en Video'}
                </button>
                <button
                  type="button"
                  onClick={onResetVideoColorMixer}
                  className="text-[11px] text-rose-300 hover:text-rose-200 flex items-center gap-1 font-bold px-2 py-1 rounded-lg bg-rose-500/10 border border-rose-500/25"
                >
                  <RefreshCw size={11} />
                  Reset
                </button>
              </div>
            </div>

            {isPickingVideoColor && (
              <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-400/40 space-y-2">
                <p className="text-[11px] text-amber-200 font-semibold">
                  Pincel activo: Toca un color en el monitor de video y{' '}
                  <strong>arrastra a la derecha para subir</strong> o{' '}
                  <strong>a la izquierda para bajar</strong>:
                </p>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { id: 'saturation', label: 'Saturación' },
                    { id: 'luminance', label: 'Luminosidad (Luz)' },
                    { id: 'hue', label: 'Tono / Matiz' },
                  ].map((prop) => (
                    <button
                      key={prop.id}
                      type="button"
                      onClick={() => setVideoHslBrushProp(prop.id as any)}
                      className={`py-1 px-2 rounded-lg text-[10px] font-extrabold border transition-all ${
                        videoHslBrushProp === prop.id
                          ? 'bg-amber-500 text-gray-950 border-amber-300'
                          : 'bg-gray-900/70 text-gray-300 border-white/10'
                      }`}
                    >
                      {prop.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Mode Switcher: Por Color vs Todos los colores */}
            <div className="grid grid-cols-4 gap-1 bg-gray-900 p-1 rounded-xl border border-white/10">
              {[
                { id: 'channel', label: 'Por Color' },
                { id: 'saturation', label: 'Saturación' },
                { id: 'luminance', label: 'Luz / Oscuro' },
                { id: 'hue', label: 'Tono' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setVideoHslViewMode(m.id as any)}
                  className={`py-1.5 rounded-lg text-[10px] font-extrabold transition-all ${
                    videoHslViewMode === m.id
                      ? 'bg-amber-500 text-gray-950 shadow'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {videoHslViewMode === 'channel' ? (
              <>
                {/* 8 Default Color Swatches */}
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 pt-1">
                  {COLOR_CHANNELS.map((ch) => {
                    const isSel = selectedVideoColorChannel === ch.id;
                    const vals = activeClip.colorMixer[ch.id];
                    const hasMod =
                      vals.hue !== 0 || vals.saturation !== 0 || vals.luminance !== 0;
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => setSelectedVideoColorChannel(ch.id)}
                        className={`relative flex flex-col items-center gap-1 py-2 px-1 rounded-xl border transition-all active:scale-95 ${
                          isSel
                            ? 'bg-white/15 border-white shadow-md scale-105'
                            : 'bg-white/[0.03] border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-full ${ch.swatchClass} shadow-inner border border-white/30`}
                        />
                        <span className="text-[10px] font-extrabold text-gray-200">
                          {ch.shortLabel}
                        </span>
                        {hasMod && (
                          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Selected Color Sliders: Saturation (Subir/Bajar), Luminance (Oscurecer/Aclarar), Hue */}
                <div className="p-3 rounded-xl bg-gray-900/90 border border-white/10 space-y-3 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-white flex items-center gap-2">
                      <span
                        className={`w-3.5 h-3.5 rounded-full ${activeChannelObj.swatchClass} inline-block`}
                      />
                      Ajustando Color: {activeChannelObj.label}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateVideoColorMixerChannel(selectedVideoColorChannel, {
                          hue: 0,
                          saturation: 0,
                          luminance: 0,
                        })
                      }
                      className="text-[10px] text-gray-400 hover:text-white underline"
                    >
                      Resetear {activeChannelObj.shortLabel}
                    </button>
                  </div>

                  <VideoSliderControl
                    label={`Saturación de ${activeChannelObj.label} (Bajar ↔ Subir)`}
                    value={activeClip.colorMixer[selectedVideoColorChannel].saturation}
                    min={-100}
                    max={100}
                    gradientClass="from-gray-600 via-gray-400 to-amber-500"
                    onChange={(v) =>
                      onUpdateVideoColorMixerChannel(selectedVideoColorChannel, {
                        saturation: v,
                      })
                    }
                    onReset={() =>
                      onUpdateVideoColorMixerChannel(selectedVideoColorChannel, {
                        saturation: 0,
                      })
                    }
                  />

                  <VideoSliderControl
                    label={`Luminosidad de ${activeChannelObj.label} (Oscurecer ↔ Aclarar)`}
                    value={activeClip.colorMixer[selectedVideoColorChannel].luminance}
                    min={-100}
                    max={100}
                    gradientClass="from-gray-950 via-gray-500 to-white"
                    onChange={(v) =>
                      onUpdateVideoColorMixerChannel(selectedVideoColorChannel, {
                        luminance: v,
                      })
                    }
                    onReset={() =>
                      onUpdateVideoColorMixerChannel(selectedVideoColorChannel, {
                        luminance: 0,
                      })
                    }
                  />

                  <VideoSliderControl
                    label={`Tono / Matiz de ${activeChannelObj.label}`}
                    value={activeClip.colorMixer[selectedVideoColorChannel].hue}
                    min={-100}
                    max={100}
                    gradientClass="from-rose-500 via-emerald-400 to-indigo-500"
                    onChange={(v) =>
                      onUpdateVideoColorMixerChannel(selectedVideoColorChannel, {
                        hue: v,
                      })
                    }
                    onReset={() =>
                      onUpdateVideoColorMixerChannel(selectedVideoColorChannel, {
                        hue: 0,
                      })
                    }
                  />
                </div>
              </>
            ) : (
              /* All 8 Colors Listed Together for Rapid Multi-Color Grading */
              <div className="space-y-2.5 pt-1">
                {COLOR_CHANNELS.map((ch) => {
                  const val = activeClip.colorMixer[ch.id][videoHslViewMode];
                  return (
                    <VideoSliderControl
                      key={ch.id}
                      label={`${ch.label} (${
                        videoHslViewMode === 'saturation'
                          ? 'Saturación'
                          : videoHslViewMode === 'luminance'
                          ? 'Oscurecer / Aclarar'
                          : 'Tono'
                      })`}
                      value={val}
                      min={-100}
                      max={100}
                      gradientClass={
                        videoHslViewMode === 'luminance'
                          ? 'from-gray-950 via-gray-500 to-white'
                          : 'from-gray-700 via-gray-400 to-amber-500'
                      }
                      onChange={(v) =>
                        onUpdateVideoColorMixerChannel(ch.id, { [videoHslViewMode]: v })
                      }
                      onReset={() =>
                        onUpdateVideoColorMixerChannel(ch.id, { [videoHslViewMode]: 0 })
                      }
                    />
                  );
                })}
              </div>
            )}

            {videoClips.length > 1 && (
              <button
                type="button"
                onClick={onApplyColorMixerToAllClips}
                className="w-full py-2 px-3 rounded-xl bg-purple-600/25 hover:bg-purple-600/35 border border-purple-400/40 text-purple-200 text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all active:scale-95"
              >
                <Check size={14} />
                Copiar estos ajustes de Color HSL a todos los {videoClips.length} videos
              </button>
            )}
          </div>
        </div>
      )}

      {/* ==================== TAB 3: TRANSICIONES (DEGRADAR A NEGRO O BLANCO Y DURACIÓN) ==================== */}
      {activeVideoPanel === 'transitions' && activeClip && (
        <div className="space-y-3.5 max-h-[58vh] overflow-y-auto pr-1 custom-scrollbar">
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-amber-300 block">
                Efectos de Transición entre un Video y Otro
              </span>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Elige degradar a negro o a blanco y cuánto tiempo dura la transición al pasar al siguiente clip.
              </p>
            </div>

            {/* Transition Type Selector for Active Clip */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-200">
                Transición después de Clip #{activeClipIndex + 1} ({activeClip.name}):
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    id: 'black',
                    title: 'Degradar a Negro',
                    desc: 'Fundido cinematográfico a negro',
                    swatch: 'bg-gray-950 border-gray-500',
                  },
                  {
                    id: 'white',
                    title: 'Degradar a Blanco',
                    desc: 'Fundido luminoso hacia blanco',
                    swatch: 'bg-white border-amber-300',
                  },
                  {
                    id: 'crossfade',
                    title: 'Atenuación Suave',
                    desc: 'Transición ligera entre tomas',
                    swatch: 'bg-gradient-to-r from-purple-500 to-amber-500 border-purple-300',
                  },
                  {
                    id: 'none',
                    title: 'Corte Directo',
                    desc: 'Sin transición (cambio inmediato)',
                    swatch: 'bg-gray-700 border-gray-500',
                  },
                ].map((opt) => {
                  const isSel = activeClip.transitionOutType === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        onUpdateActiveClip({ transitionOutType: opt.id as VideoTransitionType })
                      }
                      className={`p-2.5 rounded-xl border text-left transition-all flex items-start gap-2.5 active:scale-95 ${
                        isSel
                          ? 'bg-amber-500/20 border-amber-400 text-white shadow-md'
                          : 'bg-white/[0.03] border-white/10 text-gray-300 hover:bg-white/[0.06]'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded-full border shrink-0 mt-0.5 ${opt.swatch}`}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold truncate">{opt.title}</p>
                        <p className="text-[10px] text-gray-400 leading-tight mt-0.5">
                          {opt.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Transition Duration Control */}
            {activeClip.transitionOutType !== 'none' && (
              <div className="p-3 rounded-xl bg-gray-900/90 border border-white/10 space-y-2.5">
                <VideoSliderControl
                  label="Duración de la Transición (Segundos)"
                  value={activeClip.transitionOutDuration}
                  min={0.2}
                  max={3.0}
                  step={0.1}
                  unit="s"
                  gradientClass="from-purple-600 via-amber-500 to-emerald-400"
                  onChange={(v) =>
                    onUpdateActiveClip({ transitionOutDuration: Number(v.toFixed(1)) })
                  }
                  onReset={() => onUpdateActiveClip({ transitionOutDuration: 0.8 })}
                />

                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-gray-400 mr-1">Rápidos:</span>
                  {[0.3, 0.5, 0.8, 1.2, 1.8, 2.5].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => onUpdateActiveClip({ transitionOutDuration: sec })}
                      className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold border ${
                        Math.abs(activeClip.transitionOutDuration - sec) < 0.05
                          ? 'bg-amber-500 text-gray-950 border-amber-300'
                          : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {sec.toFixed(1)}s
                    </button>
                  ))}
                </div>
              </div>
            )}

            {videoClips.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  onApplyTransitionToAllClips(
                    activeClip.transitionOutType,
                    activeClip.transitionOutDuration
                  )
                }
                className="w-full py-2 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 text-xs font-extrabold flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Sparkles size={13} />
                Aplicar esta transición ({activeClip.transitionOutDuration.toFixed(1)}s) entre todos los videos
              </button>
            )}
          </div>

          {/* All Junctions Between Videos Overview */}
          {videoClips.length > 1 && (
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-purple-300 block">
                Uniones entre tus Videos ({videoClips.length - 1})
              </span>
              <div className="space-y-1.5">
                {videoClips.slice(0, -1).map((c, i) => {
                  const nextC = videoClips[i + 1];
                  return (
                    <div
                      key={c.id}
                      className="flex items-center justify-between gap-2 p-2 rounded-xl bg-gray-900/80 border border-white/10 text-xs"
                    >
                      <span className="text-gray-200 font-semibold truncate">
                        #{i + 1} {c.name} <strong className="text-amber-400">→</strong> #{i + 2}{' '}
                        {nextC.name}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {(['black', 'white', 'none'] as VideoTransitionType[]).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => onUpdateClipById(c.id, { transitionOutType: t })}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              c.transitionOutType === t
                                ? 'bg-amber-500 text-gray-950 border-amber-300'
                                : 'bg-white/5 text-gray-400 border-white/10'
                            }`}
                          >
                            {t === 'black' ? 'Negro' : t === 'white' ? 'Blanco' : 'Corte'}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Start & End of Sequence Fades */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-2.5">
            <span className="text-xs font-extrabold uppercase tracking-wider text-gray-300 block">
              Inicio y Fin General del Video
            </span>

            <div className="flex items-center justify-between gap-2 text-xs">
              <label className="flex items-center gap-2 text-gray-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sequenceFadeIn.enabled}
                  onChange={(e) =>
                    setSequenceFadeIn((prev) => ({ ...prev, enabled: e.target.checked }))
                  }
                  className="accent-amber-500 w-4 h-4 rounded"
                />
                <span>Iniciar primer video desde fundido</span>
              </label>
              {sequenceFadeIn.enabled && (
                <div className="flex items-center gap-1">
                  {(['black', 'white'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSequenceFadeIn((prev) => ({ ...prev, type: t }))}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        sequenceFadeIn.type === t
                          ? 'bg-amber-500 text-gray-950 border-amber-300'
                          : 'bg-white/5 text-gray-400 border-white/10'
                      }`}
                    >
                      {t === 'black' ? 'Negro' : 'Blanco'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 text-xs">
              <label className="flex items-center gap-2 text-gray-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sequenceFadeOut.enabled}
                  onChange={(e) =>
                    setSequenceFadeOut((prev) => ({ ...prev, enabled: e.target.checked }))
                  }
                  className="accent-amber-500 w-4 h-4 rounded"
                />
                <span>Terminar último video con fundido</span>
              </label>
              {sequenceFadeOut.enabled && (
                <div className="flex items-center gap-1">
                  {(['black', 'white'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSequenceFadeOut((prev) => ({ ...prev, type: t }))}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        sequenceFadeOut.type === t
                          ? 'bg-amber-500 text-gray-950 border-amber-300'
                          : 'bg-white/5 text-gray-400 border-white/10'
                      }`}
                    >
                      {t === 'black' ? 'Negro' : 'Blanco'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 4: APARTADO PARA CARGAR VARIOS VIDEOS ==================== */}
      {activeVideoPanel === 'clips' && (
        <div className="space-y-3.5 max-h-[58vh] overflow-y-auto pr-1 custom-scrollbar">
          <div
            onClick={onAddVideosClick}
            className="p-4 rounded-2xl border-2 border-dashed border-amber-500/50 hover:border-amber-400 bg-gradient-to-br from-amber-500/10 via-gray-900 to-purple-500/10 text-center cursor-pointer transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 mx-auto mb-2 group-hover:scale-110 transition-transform">
              <Upload size={20} />
            </div>
            <p className="text-xs font-extrabold text-white">
              Cargar Varios Videos para Unir
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Selecciona 1 o múltiples archivos MP4, WEBM o MOV al mismo tiempo
            </p>
          </div>

          <div className="flex items-center justify-between text-xs px-1">
            <span className="font-extrabold text-gray-300 uppercase tracking-wider">
              Cola de Videos ({videoClips.length})
            </span>
            <span className="text-amber-300 font-mono text-[11px]">
              Peso Original Total: {formatBytesToMB(totalOriginalBytes)}
            </span>
          </div>

          <div className="space-y-2">
            {videoClips.map((clip, idx) => {
              const isSel = activeClip?.id === clip.id;
              const netDur = Math.max(0.1, clip.trimEnd - clip.trimStart);
              return (
                <div
                  key={clip.id}
                  onClick={() => onSelectClip(clip.id)}
                  className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                    isSel
                      ? 'bg-amber-500/15 border-amber-400 shadow'
                      : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-300 font-black text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{clip.name}</p>
                        <p className="text-[10px] text-gray-400 font-mono">
                          {clip.width}×{clip.height} • Útil: {formatSeconds(netDur)} •{' '}
                          {formatBytesToMB(clip.fileSize)}
                        </p>
                      </div>
                    </div>

                    <div
                      className="flex items-center gap-1 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => onMoveClip(idx, -1)}
                        disabled={idx === 0}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 disabled:opacity-30"
                        title="Subir"
                      >
                        <ArrowUp size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onMoveClip(idx, 1)}
                        disabled={idx === videoClips.length - 1}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 disabled:opacity-30"
                        title="Bajar"
                      >
                        <ArrowDown size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDuplicateClip(clip)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300"
                        title="Duplicar"
                      >
                        <Copy size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveClip(clip.id)}
                        className="p-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/30 text-red-300"
                        title="Eliminar"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {activeClip && (
            <button
              type="button"
              onClick={onSplitActiveClip}
              className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-amber-500/20 border border-white/10 hover:border-amber-400/40 text-xs font-extrabold text-amber-200 flex items-center justify-center gap-1.5"
            >
              <Scissors size={14} />
              Dividir Clip Seleccionado en la Posición de la Aguja
            </button>
          )}
        </div>
      )}

      {/* ==================== TAB 5: EXPORTACIÓN Y COMPRESIÓN INTELIGENTE ==================== */}
      {activeVideoPanel === 'export' && (
        <div className="space-y-3.5 max-h-[58vh] overflow-y-auto pr-1 custom-scrollbar">
          {/* Compression Target Profiles (Celular / Pantalla / Master) */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-2.5">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-300 block">
                Modo de Compresión Inteligente (Alta Calidad)
              </span>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Optimiza el peso sin perder nitidez visual según dónde lo vayas a mostrar o compartir:
              </p>
            </div>

            <div className="space-y-2">
              {VIDEO_COMPRESSION_PRESETS.map((preset) => {
                const isSel = compressionPresetId === preset.id;
                const Icon =
                  preset.id === 'mobile'
                    ? Smartphone
                    : preset.id === 'screen'
                    ? Monitor
                    : Award;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => onSelectCompressionPreset(preset.id)}
                    className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-start gap-2.5 active:scale-98 ${
                      isSel
                        ? 'bg-emerald-500/15 border-emerald-400 text-white shadow-md'
                        : 'bg-white/[0.03] border-white/10 text-gray-300 hover:bg-white/[0.06]'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        isSel
                          ? 'bg-emerald-500 text-gray-950'
                          : 'bg-white/10 text-gray-300'
                      }`}
                    >
                      <Icon size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-extrabold">{preset.name}</span>
                        <span
                          className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                            isSel
                              ? 'bg-emerald-400 text-gray-950'
                              : 'bg-white/10 text-gray-300'
                          }`}
                        >
                          {preset.badge}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 leading-snug mt-0.5">
                        {preset.subtitle}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fine Bitrate & FPS Controls */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
            <VideoSliderControl
              label="Tasa de Bits (Calidad vs Compresión)"
              value={customVideoBitrateMbps}
              min={1.0}
              max={12.0}
              step={0.2}
              unit=" Mbps"
              gradientClass="from-emerald-500 via-amber-500 to-purple-500"
              onChange={(v) => setCustomVideoBitrateMbps(Number(v.toFixed(1)))}
              onReset={() => setCustomVideoBitrateMbps(2.2)}
            />

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">
                  Fluidez (Fotogramas)
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {([24, 30, 60] as const).map((fps) => (
                    <button
                      key={fps}
                      type="button"
                      onClick={() => setExportFps(fps)}
                      className={`py-1.5 rounded-lg text-[11px] font-bold border ${
                        exportFps === fps
                          ? 'bg-amber-500/25 border-amber-400 text-white'
                          : 'bg-white/5 border-white/10 text-gray-300'
                      }`}
                    >
                      {fps} FPS
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-gray-400 mb-1">
                  Relleno de Bordes
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { id: 'blur', label: 'Blur' },
                    { id: 'contain', label: 'Negro' },
                    { id: 'cover', label: 'Llenar' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setFitMode(m.id as any)}
                      className={`py-1.5 rounded-lg text-[11px] font-bold border ${
                        fitMode === m.id
                          ? 'bg-purple-600/30 border-purple-400 text-white'
                          : 'bg-white/5 border-white/10 text-gray-300'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-gray-400 mb-1">
                Formato de Pantalla (Celular Vertical / Monitor Horizontal)
              </label>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                {[
                  { id: '1280x720', label: '16:9 HD Ligero (1280×720)' },
                  { id: '1920x1080', label: '16:9 Full HD (1920×1080)' },
                  { id: '720x1280', label: '9:16 Celular Vertical (Reels)' },
                  { id: '1080x1080', label: '1:1 Cuadrado (Post)' },
                ].map((res) => (
                  <button
                    key={res.id}
                    type="button"
                    onClick={() => setSequenceResolution(res.id as any)}
                    className={`p-2 rounded-lg border font-bold text-left text-[11px] ${
                      sequenceResolution === res.id
                        ? 'bg-amber-500/25 border-amber-400 text-white'
                        : 'bg-white/5 border-white/10 text-gray-300'
                    }`}
                  >
                    {res.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Live File Size & Compression Comparison Card */}
          <div className="p-3 rounded-xl bg-gray-900/95 border border-emerald-500/30 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Peso Original de tus Videos:</span>
              <span className="font-mono font-bold text-gray-200">
                {formatBytesToMB(totalOriginalBytes)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-emerald-300 font-bold">
                Peso Comprimido Estimado:
              </span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-black text-emerald-300 text-sm">
                  ~{formatBytesToMB(estimatedCompressedBytes)}
                </span>
                {savingsPct > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/25 text-emerald-200 border border-emerald-400/40 font-extrabold">
                    -{savingsPct}% más ligero
                  </span>
                )}
              </div>
            </div>
          </div>

          {isExportingVideo && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-amber-300 font-bold">
                <span>Renderizando color HSL, transiciones y comprimiendo...</span>
                <span>{exportProgress}%</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-gray-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 via-emerald-500 to-teal-400 transition-all"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
            </div>
          )}

          <button
            type="button"
            disabled={videoClips.length === 0 || isExportingVideo}
            onClick={onExportVideo}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-500 hover:from-emerald-400 hover:to-amber-400 text-gray-950 font-black text-sm shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 disabled:opacity-40 active:scale-98"
          >
            <Download size={16} />
            {isExportingVideo
              ? `Comprimiendo y Exportando (${exportProgress}%)...`
              : videoClips.length > 1
              ? `Unir ${videoClips.length} Videos y Exportar Comprimido`
              : 'Exportar Video Comprimido en Alta Calidad'}
          </button>
        </div>
      )}
    </div>
  );
};
