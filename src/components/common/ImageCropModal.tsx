import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Check,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  RefreshCw,
  Circle,
  Square,
  Crop,
  Move,
} from 'lucide-react';

interface ImageCropModalProps {
  isOpen: boolean;
  imageSrc: string;
  onClose?: () => void;
  onCancel?: () => void;
  onCropComplete: (croppedDataUrl: string) => void;
  title?: string;
  initialShape?: 'circle' | 'square';
  aspectRatio?: number;
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  imageSrc,
  onClose,
  onCancel,
  onCropComplete,
  title = 'Sesuaikan Ukuran & Posisi Foto',
  initialShape = 'circle',
  aspectRatio,
}) => {
  const handleDismiss = onClose || onCancel || (() => {});
  // Viewport size in pixels
  const VIEWPORT_SIZE = 280;

  const [scale, setScale] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [rotation, setRotation] = useState<number>(0); // 0, 90, 180, 270
  const [flipH, setFlipH] = useState<boolean>(false);
  const [maskShape, setMaskShape] = useState<'circle' | 'square'>(initialShape);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [pinchDist, setPinchDist] = useState<number | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const imgRef = useRef<HTMLImageElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  // Reset state when opening or when image changes
  useEffect(() => {
    if (isOpen && imageSrc) {
      setScale(1);
      setPan({ x: 0, y: 0 });
      setRotation(0);
      setFlipH(false);
      setMaskShape(initialShape);
      setIsDragging(false);
      setPinchDist(null);

      // Preload image to get natural dimensions
      const img = new Image();
      img.onload = () => {
        setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.src = imageSrc;
    }
  }, [isOpen, imageSrc, initialShape]);

  // Calculate base display dimensions to cover the viewport
  const getBaseDimensions = useCallback(() => {
    if (!imageDimensions) return { baseW: VIEWPORT_SIZE, baseH: VIEWPORT_SIZE, coverScale: 1 };
    const { width: nw, height: nh } = imageDimensions;

    // Effective dimensions based on rotation
    const isSideways = rotation === 90 || rotation === 270;
    const effW = isSideways ? nh : nw;
    const effH = isSideways ? nw : nh;

    // Scale to cover VIEWPORT_SIZE x VIEWPORT_SIZE
    const coverScale = Math.max(VIEWPORT_SIZE / effW, VIEWPORT_SIZE / effH);
    const baseW = nw * coverScale;
    const baseH = nh * coverScale;

    return { baseW, baseH, coverScale };
  }, [imageDimensions, rotation, VIEWPORT_SIZE]);

  // Clamp pan so image fills the viewport without showing empty edges
  const clampPan = useCallback(
    (newPan: { x: number; y: number }, currentScale: number, currentRot: number) => {
      const { baseW, baseH } = getBaseDimensions();
      const isSideways = currentRot === 90 || currentRot === 270;
      const effW = (isSideways ? baseH : baseW) * currentScale;
      const effH = (isSideways ? baseW : baseH) * currentScale;

      const maxPanX = Math.max(0, (effW - VIEWPORT_SIZE) / 2);
      const maxPanY = Math.max(0, (effH - VIEWPORT_SIZE) / 2);

      return {
        x: Math.max(-maxPanX, Math.min(maxPanX, newPan.x)),
        y: Math.max(-maxPanY, Math.min(maxPanY, newPan.y)),
      };
    },
    [getBaseDimensions, VIEWPORT_SIZE]
  );

  // Auto re-clamp pan when scale or rotation changes
  useEffect(() => {
    setPan((prev) => clampPan(prev, scale, rotation));
  }, [scale, rotation, clampPan]);

  // Drag handlers (Mouse)
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const rawPan = {
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    };
    setPan(clampPan(rawPan, scale, rotation));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers (Mobile & Tablet)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y,
      });
      setPinchDist(null);
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setPinchDist(dist);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      const rawPan = {
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      };
      setPan(clampPan(rawPan, scale, rotation));
    } else if (e.touches.length === 2 && pinchDist !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = dist / pinchDist;
      setScale((prev) => {
        const next = Math.max(1, Math.min(3, prev * ratio));
        return Number(next.toFixed(2));
      });
      setPinchDist(dist);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setPinchDist(null);
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    setScale((prev) => {
      const next = Math.max(1, Math.min(3, prev + delta));
      return Number(next.toFixed(2));
    });
  };

  // Quick zoom adjustments
  const handleZoomIn = () => {
    setScale((prev) => Number(Math.min(3, prev + 0.15).toFixed(2)));
  };

  const handleZoomOut = () => {
    setScale((prev) => Number(Math.max(1, prev - 0.15).toFixed(2)));
  };

  // Rotation & Flip
  const handleRotateRight = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleRotateLeft = () => {
    setRotation((prev) => (prev - 90 + 360) % 360);
  };

  const handleToggleFlip = () => {
    setFlipH((prev) => !prev);
  };

  const handleReset = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
    setRotation(0);
    setFlipH(false);
  };

  // Export cropped 400x400 image
  const handleApplyCrop = async () => {
    if (!imageSrc) return;
    setIsExporting(true);

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Gagal memuat gambar untuk di-crop.'));
        img.src = imageSrc;
      });

      const OUTPUT_SIZE = 400;
      const ratio = OUTPUT_SIZE / VIEWPORT_SIZE;

      const canvas = document.createElement('canvas');
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Gagal menginisialisasi kanvas gambar.');
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Move to center of canvas
      ctx.translate(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2);

      // Apply pan scaled up to output resolution
      ctx.translate(pan.x * ratio, pan.y * ratio);

      // Apply zoom
      ctx.scale(scale, scale);

      // Apply rotation
      ctx.rotate((rotation * Math.PI) / 180);

      // Apply horizontal flip
      ctx.scale(flipH ? -1 : 1, 1);

      // Draw base image centered
      const { baseW, baseH } = getBaseDimensions();
      const drawW = baseW * ratio;
      const drawH = baseH * ratio;

      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);

      // Export as high quality JPEG
      let croppedDataUrl = '';
      try {
        croppedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
      } catch (err) {
        croppedDataUrl = canvas.toDataURL('image/png');
      }

      onCropComplete(croppedDataUrl);
      handleDismiss();
    } catch (err) {
      console.error('Failed to crop image:', err);
      // If canvas export failed (e.g. CORS on remote URL), pass original imageSrc as fallback
      onCropComplete(imageSrc);
      handleDismiss();
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  const { baseW, baseH } = getBaseDimensions();

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 text-white rounded-3xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <Crop className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-display tracking-tight">
                {title}
              </h3>
              <p className="text-[11px] text-slate-400">
                Geser posisi, sesuaikan ukuran (zoom), dan putar foto
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Batal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport Area */}
        <div className="p-4 sm:p-5 flex flex-col items-center justify-center bg-slate-950 select-none">
          {/* Viewport box */}
          <div
            ref={viewportRef}
            style={{ width: VIEWPORT_SIZE, height: VIEWPORT_SIZE }}
            className={`relative rounded-2xl overflow-hidden border-2 border-indigo-500/60 shadow-2xl touch-none ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
          >
            {/* The Image */}
            {imageSrc && (
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Crop preview"
                draggable={false}
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  width: `${baseW}px`,
                  height: `${baseH}px`,
                  maxWidth: 'none',
                  maxHeight: 'none',
                  transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${scale}) rotate(${rotation}deg) scaleX(${
                    flipH ? -1 : 1
                  })`,
                  transformOrigin: 'center center',
                  userSelect: 'none',
                  pointerEvents: 'none',
                  transition: isDragging ? 'none' : 'transform 0.08s ease-out',
                }}
              />
            )}

            {/* Mask Vignette Overlay */}
            <div
              className={`absolute inset-0 pointer-events-none transition-all duration-200 ${
                maskShape === 'circle'
                  ? 'rounded-full ring-2 ring-indigo-400/90 shadow-[0_0_0_9999px_rgba(15,23,42,0.72)]'
                  : 'rounded-2xl ring-2 ring-indigo-400/90 shadow-[0_0_0_9999px_rgba(15,23,42,0.72)]'
              }`}
            />

            {/* Rule of thirds grid lines inside the mask */}
            <div className="absolute inset-0 pointer-events-none opacity-25">
              <div className="w-full h-full grid grid-cols-3 grid-rows-3">
                <div className="border-r border-b border-white" />
                <div className="border-r border-b border-white" />
                <div className="border-b border-white" />
                <div className="border-r border-b border-white" />
                <div className="border-r border-b border-white" />
                <div className="border-b border-white" />
                <div className="border-r border-white" />
                <div className="border-r border-white" />
                <div />
              </div>
            </div>

            {/* Drag Hint Tag */}
            <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 pointer-events-none px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-xs border border-white/10 text-[10px] font-semibold text-slate-200 flex items-center gap-1 shadow-xs">
              <Move className="w-3 h-3 text-indigo-400" />
              <span>Geser untuk atur posisi</span>
            </div>
          </div>

          {/* Mask Shape Switcher & Reset */}
          <div className="mt-3 flex items-center justify-between w-full max-w-[280px]">
            <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
              <button
                type="button"
                onClick={() => setMaskShape('circle')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  maskShape === 'circle'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Bentuk pratinjau bulat"
              >
                <Circle className="w-3.5 h-3.5" />
                <span>Bulat</span>
              </button>
              <button
                type="button"
                onClick={() => setMaskShape('square')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  maskShape === 'square'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Bentuk pratinjau kotak"
              >
                <Square className="w-3.5 h-3.5" />
                <span>Kotak</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Kembalikan zoom dan posisi ke semula"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Controls Toolbar */}
        <div className="p-4 sm:p-5 bg-slate-900 space-y-4 border-t border-slate-800">
          {/* Zoom Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <ZoomIn className="w-3.5 h-3.5 text-indigo-400" />
                <span>Ukuran Foto (Zoom)</span>
              </span>
              <span className="font-mono text-indigo-400 font-bold">
                {Math.round(scale * 100)}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={scale <= 1}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 transition-colors cursor-pointer"
                title="Perkecil"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <input
                type="range"
                min="1"
                max="3"
                step="0.02"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="flex-1 accent-indigo-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
              />
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={scale >= 3}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 transition-colors cursor-pointer"
                title="Perbesar"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Transform Buttons: Rotate & Flip */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handleRotateLeft}
              className="py-2 px-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700/60 text-xs font-semibold text-slate-300 hover:text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              title="Putar 90 derajat ke kiri"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Putar Kiri</span>
            </button>
            <button
              type="button"
              onClick={handleRotateRight}
              className="py-2 px-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700/60 text-xs font-semibold text-slate-300 hover:text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              title="Putar 90 derajat ke kanan"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Putar Kanan</span>
            </button>
            <button
              type="button"
              onClick={handleToggleFlip}
              className={`py-2 px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                flipH
                  ? 'bg-indigo-600/30 border-indigo-500/50 text-indigo-300'
                  : 'bg-slate-800/90 hover:bg-slate-700 border-slate-700/60 text-slate-300 hover:text-white'
              }`}
              title="Balik horizontal (mirror foto selfie)"
            >
              <FlipHorizontal className="w-3.5 h-3.5" />
              <span>Cermin</span>
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleDismiss}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={isExporting}
            onClick={handleApplyCrop}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>{isExporting ? 'Memproses Potongan...' : 'Terapkan Foto'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
