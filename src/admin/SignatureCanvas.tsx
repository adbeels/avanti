import { useEffect, useRef, useState } from 'react';
import { Eraser, PencilLine } from 'lucide-react';

interface SignatureCanvasProps {
  onChange: (dataUrl: string | null) => void;
  width?: number;
  height?: number;
  disabled?: boolean;
}

/**
 * Canvas de firma que soporta mouse y touch (pointer events).
 * Genera un PNG dataURL que se reporta vía onChange.
 *
 * Optimizado para touch screens: bloquea el scroll mientras se firma.
 */
export default function SignatureCanvas({ onChange, width = 480, height = 180, disabled = false }: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const drawing = useRef(false);
  const [isEmpty, setIsEmpty] = useState(true);

  // Inicializar canvas con fondo blanco
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0a0a0a';
  }, []);

  const getPoint = (e: PointerEvent | React.PointerEvent): { x: number; y: number } => {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * c.width,
      y: ((e.clientY - rect.top) / rect.height) * c.height,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    e.preventDefault();
    const c = canvasRef.current!;
    c.setPointerCapture(e.pointerId);
    drawing.current = true;
    lastPoint.current = getPoint(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || disabled) return;
    e.preventDefault();
    const c = canvasRef.current!;
    const ctx = c.getContext('2d');
    if (!ctx || !lastPoint.current) return;
    const p = getPoint(e);
    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastPoint.current = p;
    if (isEmpty) setIsEmpty(false);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    drawing.current = false;
    lastPoint.current = null;
    try { canvasRef.current?.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    // Reportar dataURL al padre
    const c = canvasRef.current!;
    onChange(c.toDataURL('image/png'));
  };

  const clear = () => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, c.width, c.height);
    setIsEmpty(true);
    onChange(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-500 uppercase tracking-wide font-bold flex items-center gap-1">
          <PencilLine size={11} /> Firma del receptor
        </span>
        <button
          type="button"
          onClick={clear}
          disabled={disabled || isEmpty}
          className="flex items-center gap-1 px-2 py-1 text-[10px] text-gray-500 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Limpiar firma"
        >
          <Eraser size={11} /> Limpiar
        </button>
      </div>

      <div className={`relative border rounded-lg overflow-hidden ${isEmpty ? 'border-amber-800/40' : 'border-green-700/40'} bg-white`}>
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="block w-full touch-none cursor-crosshair"
          style={{ touchAction: 'none', height: `${height}px` }}
        />
        {isEmpty && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
            <span className="italic">Firma aquí con el dedo o lápiz</span>
          </div>
        )}
        {disabled && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-gray-50/80">
            <span className="text-gray-500 text-xs italic">Firma capturada (solo lectura)</span>
          </div>
        )}
      </div>
    </div>
  );
}
