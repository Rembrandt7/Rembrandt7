import React, { useEffect, useRef, useState } from 'react';
import { Eraser, PenTool, Type, Upload } from 'lucide-react';

interface SignaturePadBoxProps {
  onSignatureChange: (pngDataUrl: string) => void;
}

export const SignaturePadBox: React.FC<SignaturePadBoxProps> = ({ onSignatureChange }) => {
  const [tab, setTab] = useState<'draw' | 'type' | 'upload'>('draw');
  const [strokeColor, setStrokeColor] = useState<string>('#0F2942');
  const [typedName, setTypedName] = useState<string>('Ing. Rembrant');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);

  // Inicializar lienzo con una firma de ejemplo elegante para que funcione de inmediato si el usuario pulsa Firmar
  useEffect(() => {
    if (tab === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Trazo inicial elegante
      ctx.beginPath();
      ctx.moveTo(45, 95);
      ctx.bezierCurveTo(75, 25, 130, 120, 185, 55);
      ctx.bezierCurveTo(220, 35, 255, 95, 320, 68);
      ctx.stroke();
      onSignatureChange(canvas.toDataURL('image/png'));
    }
  }, []);

  // Cuando está en modo texto caligráfico, generar PNG automáticamente
  useEffect(() => {
    if (tab !== 'type') return;
    const off = document.createElement('canvas');
    off.width = 420;
    off.height = 140;
    const ctx = off.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, off.width, off.height);
    ctx.fillStyle = strokeColor;
    ctx.font = 'italic 600 46px "Georgia", "Times New Roman", serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(typedName || 'Firma', 28, 72);

    // Línea decorativa inferior
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(28, 108);
    ctx.quadraticCurveTo(180, 96, 360, 112);
    ctx.stroke();

    onSignatureChange(off.toDataURL('image/png'));
  }, [tab, typedName, strokeColor]);

  const getCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      const t = e.touches[0];
      return {
        x: (t.clientX - rect.left) * scaleX,
        y: (t.clientY - rect.top) * scaleY
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    isDrawingRef.current = true;
    const { x, y } = getCoords(e);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const drawMove = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawingRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawingRef.current || !canvasRef.current) return;
    isDrawingRef.current = false;
    onSignatureChange(canvasRef.current.toDataURL('image/png'));
  };

  const clearCanvas = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    onSignatureChange(canvasRef.current.toDataURL('image/png'));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onSignatureChange(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="sig-pad-container">
      <div className="sig-tabs">
        <button
          type="button"
          className={`sig-tab-btn ${tab === 'draw' ? 'active' : ''}`}
          onClick={() => setTab('draw')}
        >
          <PenTool size={14} /> Dibujar
        </button>
        <button
          type="button"
          className={`sig-tab-btn ${tab === 'type' ? 'active' : ''}`}
          onClick={() => setTab('type')}
        >
          <Type size={14} /> Escribir
        </button>
        <button
          type="button"
          className={`sig-tab-btn ${tab === 'upload' ? 'active' : ''}`}
          onClick={() => setTab('upload')}
        >
          <Upload size={14} /> Subir Imagen
        </button>
      </div>

      <div className="sig-colors-row">
        <span>Tinta:</span>
        {[
          { hex: '#0F2942', name: 'Azul Firma' },
          { hex: '#111827', name: 'Negro' },
          { hex: '#B91C1C', name: 'Rojo Sello' }
        ].map((c) => (
          <button
            key={c.hex}
            type="button"
            title={c.name}
            onClick={() => setStrokeColor(c.hex)}
            className={`sig-color-dot ${strokeColor === c.hex ? 'selected' : ''}`}
            style={{ backgroundColor: c.hex }}
          />
        ))}
      </div>

      {tab === 'draw' && (
        <div className="sig-canvas-wrap">
          <canvas
            ref={canvasRef}
            width={400}
            height={135}
            className="sig-canvas"
            onMouseDown={startDrawing}
            onMouseMove={drawMove}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={drawMove}
            onTouchEnd={stopDrawing}
          />
          <button type="button" className="sig-clear-btn" onClick={clearCanvas}>
            <Eraser size={13} /> Limpiar trazo
          </button>
        </div>
      )}

      {tab === 'type' && (
        <div className="sig-type-wrap">
          <input
            type="text"
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            placeholder="Escribe tu nombre o iniciales..."
            className="remb-input"
          />
          <div className="sig-type-preview" style={{ color: strokeColor }}>
            {typedName || 'Firma'}
          </div>
        </div>
      )}

      {tab === 'upload' && (
        <div className="sig-upload-wrap">
          <label className="sig-upload-label">
            <Upload size={20} />
            <span>Subir firma en PNG o JPG</span>
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImageUpload} hidden />
          </label>
        </div>
      )}
    </div>
  );
};
