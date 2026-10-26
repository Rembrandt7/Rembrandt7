import React, { useState, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import {
  ToneCurvesState,
  ColorGradingState,
  ColorWheelState,
  buildCurveLUT,
  createDefaultToneCurves,
  createDefaultColorGrading,
} from '../utils/cameraRawEngine';

// ==================== 1. INTERACTIVE TONE CURVES PANEL (RGB / R / G / B) ====================
export const InteractiveToneCurvePanel: React.FC<{
  curves: ToneCurvesState;
  onChange: (next: ToneCurvesState) => void;
}> = ({ curves, onChange }) => {
  const [activeCurveChannel, setActiveCurveChannel] = useState<'rgb' | 'r' | 'g' | 'b'>('rgb');
  const [draggingPointIdx, setDraggingPointIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const currentPoints = curves[activeCurveChannel] || [
    { x: 0, y: 0 },
    { x: 255, y: 255 },
  ];

  const { lut } = buildCurveLUT(currentPoints);

  const channelMeta: Record<
    'rgb' | 'r' | 'g' | 'b',
    { label: string; shortLabel: string; stroke: string; badgeClass: string; dotColor: string }
  > = {
    rgb: {
      label: 'RGB Maestro',
      shortLabel: 'RGB',
      stroke: '#f3f4f6',
      badgeClass: 'bg-white/20 text-white border-white/40 shadow-sm',
      dotColor: 'bg-white',
    },
    r: {
      label: 'Rojo',
      shortLabel: 'Rojo',
      stroke: '#ef4444',
      badgeClass: 'bg-red-500/25 text-red-200 border-red-400/50 shadow-sm',
      dotColor: 'bg-red-500',
    },
    g: {
      label: 'Verde',
      shortLabel: 'Verde',
      stroke: '#22c55e',
      badgeClass: 'bg-emerald-500/25 text-emerald-200 border-emerald-400/50 shadow-sm',
      dotColor: 'bg-emerald-500',
    },
    b: {
      label: 'Azul',
      shortLabel: 'Azul',
      stroke: '#3b82f6',
      badgeClass: 'bg-blue-500/25 text-blue-200 border-blue-400/50 shadow-sm',
      dotColor: 'bg-blue-500',
    },
  };

  const getCoordsFromEvent = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const normX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const normY = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));
    return {
      x: Math.round(normX * 255),
      y: Math.round(normY * 255),
    };
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const pt = getCoordsFromEvent(e);
    const sorted = [...currentPoints].sort((a, b) => a.x - b.x);

    // Larger 22-unit touch radius so fingers on mobile easily grab existing points
    const nearIdx = sorted.findIndex((p) => Math.hypot(p.x - pt.x, p.y - pt.y) < 22);

    if (nearIdx !== -1) {
      setDraggingPointIdx(nearIdx);
      (e.target as Element).setPointerCapture?.(e.pointerId);
      return;
    }

    if (sorted.length >= 8) return;
    const nextPts = [...sorted, pt].sort((a, b) => a.x - b.x);
    const insertedIdx = nextPts.findIndex((p) => p.x === pt.x && p.y === pt.y);
    onChange({
      ...curves,
      [activeCurveChannel]: nextPts,
    });
    setDraggingPointIdx(insertedIdx);
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (draggingPointIdx === null) return;
    const pt = getCoordsFromEvent(e);
    const sorted = [...currentPoints].sort((a, b) => a.x - b.x);
    if (!sorted[draggingPointIdx]) return;

    const updated = sorted.map((p, idx) => {
      if (idx !== draggingPointIdx) return p;
      if (idx === 0) return { x: 0, y: pt.y };
      if (idx === sorted.length - 1) return { x: 255, y: pt.y };
      const minX = sorted[idx - 1].x + 6;
      const maxX = sorted[idx + 1].x - 6;
      return {
        x: Math.max(minX, Math.min(maxX, pt.x)),
        y: pt.y,
      };
    });

    onChange({
      ...curves,
      [activeCurveChannel]: updated,
    });
  };

  const handlePointerUp = () => {
    setDraggingPointIdx(null);
  };

  const handleRemovePoint = (idx: number) => {
    const sorted = [...currentPoints].sort((a, b) => a.x - b.x);
    if (idx <= 0 || idx >= sorted.length - 1) return;
    const filtered = sorted.filter((_, i) => i !== idx);
    onChange({
      ...curves,
      [activeCurveChannel]: filtered,
    });
  };

  const applyCurvePreset = (
    presetType: 'linear' | 's-contrast' | 'matte' | 'soft-high' | 'warm-film'
  ) => {
    if (presetType === 'linear') {
      onChange(createDefaultToneCurves());
      return;
    }
    if (presetType === 's-contrast') {
      onChange({
        ...curves,
        rgb: [
          { x: 0, y: 0 },
          { x: 64, y: 46 },
          { x: 192, y: 210 },
          { x: 255, y: 255 },
        ],
      });
      return;
    }
    if (presetType === 'matte') {
      onChange({
        ...curves,
        rgb: [
          { x: 0, y: 28 },
          { x: 70, y: 62 },
          { x: 190, y: 204 },
          { x: 255, y: 242 },
        ],
      });
      return;
    }
    if (presetType === 'soft-high') {
      onChange({
        ...curves,
        rgb: [
          { x: 0, y: 0 },
          { x: 85, y: 92 },
          { x: 185, y: 198 },
          { x: 255, y: 232 },
        ],
      });
      return;
    }
    if (presetType === 'warm-film') {
      onChange({
        rgb: [
          { x: 0, y: 16 },
          { x: 64, y: 54 },
          { x: 192, y: 206 },
          { x: 255, y: 250 },
        ],
        r: [
          { x: 0, y: 0 },
          { x: 140, y: 150 },
          { x: 255, y: 255 },
        ],
        g: [
          { x: 0, y: 0 },
          { x: 255, y: 255 },
        ],
        b: [
          { x: 0, y: 14 },
          { x: 140, y: 128 },
          { x: 255, y: 240 },
        ],
      });
    }
  };

  const polylinePoints = Array.from({ length: 64 }, (_, i) => {
    const x = i * 4;
    const y = 255 - lut[x];
    return `${x},${y}`;
  })
    .concat([`255,${255 - lut[255]}`])
    .join(' ');

  return (
    <div className="p-3 sm:p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3 select-none">
      <div className="flex items-center justify-between gap-2">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-wider text-purple-300 block">
            Curvas de Tonos Interactivas
          </span>
          <span className="text-[10px] text-gray-400">
            Toca para añadir/mover puntos • Doble toque para borrar
          </span>
        </div>
        <button
          type="button"
          onClick={() =>
            onChange({
              ...curves,
              [activeCurveChannel]: [
                { x: 0, y: 0 },
                { x: 255, y: 255 },
              ],
            })
          }
          className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold text-gray-200 flex items-center gap-1 shrink-0 active:scale-95 transition-transform"
        >
          <RefreshCw size={11} />
          Reset Canal
        </button>
      </div>

      {/* Channel Switcher: RGB | R | G | B */}
      <div className="grid grid-cols-4 gap-1.5 bg-gray-900/90 p-1 rounded-xl border border-white/10 text-[11px] font-bold">
        {(['rgb', 'r', 'g', 'b'] as const).map((ch) => (
          <button
            key={ch}
            type="button"
            onClick={() => setActiveCurveChannel(ch)}
            className={`py-2 rounded-lg border flex items-center justify-center gap-1.5 transition-all ${
              activeCurveChannel === ch
                ? channelMeta[ch].badgeClass
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${channelMeta[ch].dotColor}`} />
            <span>{channelMeta[ch].shortLabel}</span>
          </button>
        ))}
      </div>

      {/* Interactive 256x256 Curve Graph */}
      <div className="relative w-full aspect-square max-w-[230px] sm:max-w-[255px] mx-auto bg-[#07090e] rounded-2xl border border-white/15 overflow-hidden shadow-inner">
        <svg
          ref={svgRef}
          viewBox="0 0 255 255"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="w-full h-full cursor-crosshair touch-none"
        >
          {[64, 128, 192].map((pos) => (
            <React.Fragment key={pos}>
              <line
                x1={pos}
                y1={0}
                x2={pos}
                y2={255}
                stroke="rgba(255,255,255,0.07)"
                strokeWidth="1"
              />
              <line
                x1={0}
                y1={pos}
                x2={255}
                y2={pos}
                stroke="rgba(255,255,255,0.07)"
                strokeWidth="1"
              />
            </React.Fragment>
          ))}

          <line
            x1={0}
            y1={255}
            x2={255}
            y2={0}
            stroke="rgba(255,255,255,0.18)"
            strokeDasharray="4 4"
            strokeWidth="1"
          />

          <polyline
            fill="none"
            stroke={channelMeta[activeCurveChannel].stroke}
            strokeWidth="2.75"
            points={polylinePoints}
          />

          {currentPoints
            .slice()
            .sort((a, b) => a.x - b.x)
            .map((pt, idx) => (
              <circle
                key={`${idx}-${pt.x}`}
                cx={pt.x}
                cy={255 - pt.y}
                r={draggingPointIdx === idx ? 8 : 6}
                fill="#090b10"
                stroke={channelMeta[activeCurveChannel].stroke}
                strokeWidth="2.75"
                onDoubleClick={(ev) => {
                  ev.stopPropagation();
                  handleRemovePoint(idx);
                }}
                className="cursor-grab active:cursor-grabbing"
              />
            ))}
        </svg>
      </div>

      {/* Quick Curve Presets (Horizontal Pill Strip on Mobile) */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
          Curvas Preestablecidas:
        </span>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: 'linear', label: 'Lineal' },
            { id: 's-contrast', label: 'Contraste en S' },
            { id: 'matte', label: 'Matte / Faded' },
            { id: 'soft-high', label: 'Luces Suaves' },
            { id: 'warm-film', label: 'Película Cálida' },
          ].map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyCurvePreset(p.id as any)}
              className="shrink-0 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-purple-500/20 border border-white/10 hover:border-purple-400/40 text-[11px] font-bold text-gray-200 active:scale-95 transition-all"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ==================== 2. 3-WAY COLOR GRADING WHEELS (SOMBRAS, MEDIOS TONOS, ALTAS LUCES) ====================
const SingleColorWheel: React.FC<{
  title: string;
  subtitle: string;
  wheel: ColorWheelState;
  onChange: (next: ColorWheelState) => void;
}> = ({ title, subtitle, wheel, onChange }) => {
  const wheelRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const updateFromPointer = (clientX: number, clientY: number) => {
    if (!wheelRef.current) return;
    const rect = wheelRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const radius = rect.width / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const dist = Math.min(radius, Math.hypot(dx, dy));
    let angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (angleDeg < 0) angleDeg += 360;
    const sat = Math.round((dist / radius) * 100);
    onChange({
      ...wheel,
      hue: Math.round(angleDeg),
      saturation: sat,
    });
  };

  const rad = (wheel.hue * Math.PI) / 180;
  const normDist = (wheel.saturation / 100) * 44;
  const handleX = 50 + Math.cos(rad) * normDist;
  const handleY = 50 + Math.sin(rad) * normDist;

  return (
    <div className="flex flex-col items-center bg-gray-900/85 border border-white/10 rounded-2xl p-2 sm:p-2.5 space-y-2">
      <div className="flex items-center justify-between w-full px-0.5">
        <div>
          <span className="text-[11px] font-extrabold text-white block leading-tight">{title}</span>
          <span className="text-[9px] text-gray-400 font-mono">{subtitle}</span>
        </div>
        {(wheel.saturation > 0 || wheel.luminance !== 0) && (
          <button
            type="button"
            onClick={() => onChange({ hue: 0, saturation: 0, luminance: 0 })}
            className="text-[11px] text-purple-300 hover:text-white px-1 font-bold"
            title="Resetear rueda"
          >
            ↺
          </button>
        )}
      </div>

      {/* Circular Hue/Saturation Wheel */}
      <div
        ref={wheelRef}
        onPointerDown={(e) => {
          setDragging(true);
          (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
          updateFromPointer(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (!dragging) return;
          updateFromPointer(e.clientX, e.clientY);
        }}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
        onDoubleClick={() => onChange({ ...wheel, saturation: 0 })}
        style={{
          background:
            'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 72%), conic-gradient(from 90deg, #ef4444, #f59e0b, #eab308, #22c55e, #06b6d4, #3b82f6, #a855f7, #ec4899, #ef4444)',
        }}
        className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-white/20 shadow-inner cursor-crosshair touch-none select-none"
      >
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-gray-900/60" />
        </div>

        <div
          style={{
            left: `${handleX}%`,
            top: `${handleY}%`,
            backgroundColor:
              wheel.saturation > 0 ? `hsl(${wheel.hue}, 85%, 55%)` : '#ffffff',
          }}
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-gray-950 shadow-md"
        />
      </div>

      {/* Luminance Slider for this Tonal Range */}
      <div className="w-full space-y-1 pt-0.5">
        <div className="flex justify-between text-[9px] text-gray-400 font-semibold px-0.5">
          <span>Lum</span>
          <span className="font-mono text-gray-200">
            {wheel.luminance > 0 ? `+${wheel.luminance}` : wheel.luminance}
          </span>
        </div>
        <input
          type="range"
          min={-100}
          max={100}
          value={wheel.luminance}
          onChange={(e) => onChange({ ...wheel, luminance: Number(e.target.value) })}
          className="w-full h-1.5 rounded appearance-none bg-gradient-to-r from-gray-950 via-gray-500 to-white accent-purple-400 cursor-pointer"
        />
      </div>
    </div>
  );
};

export const ColorGradingThreeWheelsPanel: React.FC<{
  grading: ColorGradingState;
  onChange: (next: ColorGradingState) => void;
}> = ({ grading, onChange }) => {
  const [mobileActiveWheel, setMobileActiveWheel] = useState<'all' | 'shadows' | 'midtones' | 'highlights'>('all');

  return (
    <div className="p-3 sm:p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3 select-none">
      <div className="flex items-center justify-between gap-2">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-wider text-amber-300 block">
            Graduación de Color (3 Ruedas)
          </span>
          <span className="text-[10px] text-gray-400">
            Tiñe Sombras, Medios Tonos e Iluminaciones
          </span>
        </div>
        <button
          type="button"
          onClick={() => onChange(createDefaultColorGrading())}
          className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold text-gray-200 flex items-center gap-1 shrink-0 active:scale-95 transition-transform"
        >
          <RefreshCw size={11} />
          Reset 3 Ruedas
        </button>
      </div>

      {/* Mobile View Mode Selector (3 Ruedas Juntas vs Individual Grande para el pulgar) */}
      <div className="grid grid-cols-4 gap-1 bg-gray-900/90 p-1 rounded-xl border border-white/10 text-[10px] font-bold sm:hidden">
        {[
          { id: 'all', label: '3 Ruedas' },
          { id: 'shadows', label: 'Sombras' },
          { id: 'midtones', label: 'Medios' },
          { id: 'highlights', label: 'Luces' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setMobileActiveWheel(tab.id as any)}
            className={`py-1.5 rounded-lg transition-all ${
              mobileActiveWheel === tab.id
                ? 'bg-purple-600 text-white shadow'
                : 'text-gray-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 3 Circular Wheels Grid */}
      <div
        className={
          mobileActiveWheel === 'all'
            ? 'grid grid-cols-3 gap-1.5 sm:gap-2'
            : 'grid grid-cols-1 max-w-[220px] mx-auto'
        }
      >
        {(mobileActiveWheel === 'all' || mobileActiveWheel === 'shadows') && (
          <SingleColorWheel
            title="Sombras"
            subtitle={`T:${grading.shadows.hue}° S:${grading.shadows.saturation}`}
            wheel={grading.shadows}
            onChange={(shadows) => onChange({ ...grading, shadows })}
          />
        )}
        {(mobileActiveWheel === 'all' || mobileActiveWheel === 'midtones') && (
          <SingleColorWheel
            title="Medios"
            subtitle={`T:${grading.midtones.hue}° S:${grading.midtones.saturation}`}
            wheel={grading.midtones}
            onChange={(midtones) => onChange({ ...grading, midtones })}
          />
        )}
        {(mobileActiveWheel === 'all' || mobileActiveWheel === 'highlights') && (
          <SingleColorWheel
            title="Luces"
            subtitle={`T:${grading.highlights.hue}° S:${grading.highlights.saturation}`}
            wheel={grading.highlights}
            onChange={(highlights) => onChange({ ...grading, highlights })}
          />
        )}
      </div>

      {/* Blending & Balance Sliders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/10">
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-gray-300 font-semibold">
            <span>Fusión (Blending)</span>
            <span className="font-mono text-purple-300">{grading.blending}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={grading.blending}
            onChange={(e) => onChange({ ...grading, blending: Number(e.target.value) })}
            className="w-full h-2 rounded-lg bg-gray-800 accent-purple-400 cursor-pointer"
          />
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-gray-300 font-semibold">
            <span>Equilibrio (Balance)</span>
            <span className="font-mono text-amber-300">
              {grading.balance > 0 ? `+${grading.balance}` : grading.balance}
            </span>
          </div>
          <input
            type="range"
            min={-100}
            max={100}
            value={grading.balance}
            onChange={(e) => onChange({ ...grading, balance: Number(e.target.value) })}
            className="w-full h-2 rounded-lg bg-gray-800 accent-amber-400 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
