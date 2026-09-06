import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Circle,
  Copy,
  Download,
  Eraser,
  Hand,
  Lock,
  Minus,
  MousePointer,
  PenTool,
  Printer,
  RotateCcw,
  Share2,
  Sparkles,
  Square,
  StickyNote,
  Trash2,
  Type,
  Unlock,
  Users,
  ZoomIn,
  ZoomOut,
  X,
  Plus,
  Home,
} from 'lucide-react';
import {
  BoardDrawingPoint,
  BoardElement,
  BoardElementType,
  BoardParticipant,
  CollabBoard,
} from '../../types/collabBoard';
import {
  clearAllBoardElements,
  removeBoardElement,
  toggleBoardLock,
  updateBoard,
  updateBoardParticipant,
  upsertBoardElement,
} from '../../services/boardService';
import { isFirestoreQuotaExceeded } from '../../lib/firestoreSync';
import { PEN_COLORS, STICKY_COLORS, STROKE_WIDTHS } from '../../utils/boardTemplates';
import { ConfirmDialog } from '../common/ConfirmDialog';

interface CollabBoardCanvasProps {
  board: CollabBoard;
  currentUser: {
    uid: string;
    displayName: string;
    role: 'teacher' | 'student' | 'admin';
    avatar?: string;
  };
  onBack: () => void;
  onExit?: () => void;
}

type ToolMode = 'select' | 'hand' | 'sticky' | 'pen' | 'text' | 'shape' | 'eraser';

export const CollabBoardCanvas: React.FC<CollabBoardCanvasProps> = ({
  board,
  currentUser,
  onBack,
  onExit,
}) => {
  const isTeacher = currentUser.role === 'teacher' || currentUser.role === 'admin';
  const myParticipant = board.activeParticipants?.[currentUser.uid];
  const canEdit = isTeacher || (!board.isLocked && (myParticipant?.canEdit ?? true));

  // Canvas viewport & transform state
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  // Active tool state
  const [activeTool, setActiveTool] = useState<ToolMode>('select');
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  // Styling tool options
  const [activeStickyColor, setActiveStickyColor] = useState(STICKY_COLORS[0].bg);
  const [activePenColor, setActivePenColor] = useState(PEN_COLORS[0].hex);
  const [activeStrokeWidth, setActiveStrokeWidth] = useState(STROKE_WIDTHS[1].width);
  const [activeShapeType, setActiveShapeType] = useState<'rectangle' | 'circle' | 'arrow' | 'line'>('rectangle');

  // Drawing state (freehand pen)
  const [isDrawing, setIsDrawing] = useState(false);
  const isDrawingRef = useRef(false);
  const currentStrokePoints = useRef<BoardDrawingPoint[]>([]);

  // Dragging elements state
  const [isDraggingElement, setIsDraggingElement] = useState(false);
  const dragStartPos = useRef<{ mouseX: number; mouseY: number; elemX: number; elemY: number }>({
    mouseX: 0,
    mouseY: 0,
    elemX: 0,
    elemY: 0,
  });

  // Modals & Panels
  const [showShareModal, setShowShareModal] = useState(false);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [exporting, setExporting] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const liveCanvasRef = useRef<HTMLCanvasElement>(null);

  // Send participant heartbeat
  useEffect(() => {
    if (isFirestoreQuotaExceeded()) return;

    const participant: BoardParticipant = {
      userId: currentUser.uid,
      name: currentUser.displayName,
      avatar: currentUser.avatar,
      role: isTeacher ? 'teacher' : 'student',
      canEdit: myParticipant?.canEdit ?? true,
      lastActive: new Date().toISOString(),
    };
    updateBoardParticipant(board.id, participant);

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && !isFirestoreQuotaExceeded()) {
        updateBoardParticipant(board.id, {
          ...participant,
          lastActive: new Date().toISOString(),
        });
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [board.id, currentUser, isTeacher, myParticipant?.canEdit]);

  // Convert client viewport coordinates to canvas virtual world coordinates
  const screenToWorld = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return { x: 0, y: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      const x = (clientX - rect.left - pan.x) / scale;
      const y = (clientY - rect.top - pan.y) / scale;
      return { x, y };
    },
    [pan, scale]
  );

  // Center canvas on first render
  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPan({ x: Math.max(20, (rect.width - 1200) / 2), y: 40 });
    }
  }, []);

  // Redraw existing drawing elements on the HTML5 canvas layer
  useEffect(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw all stored drawing strokes
    const elements = Object.values(board.elements || {});
    elements.forEach((elem) => {
      if (elem.type === 'drawing' && elem.points && elem.points.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = elem.color;
        ctx.lineWidth = elem.strokeWidth || 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const [start, ...rest] = elem.points;
        ctx.moveTo(start.x, start.y);
        for (const pt of rest) {
          ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();
      }
    });
  }, [board.elements]);

  // Handle Zoom
  const handleZoom = (delta: number) => {
    setScale((prev) => {
      const next = Math.min(2.0, Math.max(0.4, Number((prev + delta).toFixed(2))));
      return next;
    });
  };

  const handleResetZoom = () => {
    setScale(1);
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPan({ x: Math.max(20, (rect.width - 1200) / 2), y: 40 });
    }
  };

  // Pointer Down on Stage
  const handlePointerDown = (e: React.PointerEvent) => {
    // If clicked on an interactive element (textarea, button, etc.), don't override
    const target = e.target as HTMLElement;
    if (target.closest('.board-interactive-control')) return;

    const { x: worldX, y: worldY } = screenToWorld(e.clientX, e.clientY);

    // Hand/Pan tool or spacebar/middle click
    if (activeTool === 'hand' || e.button === 1 || e.altKey) {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      return;
    }

    if (!canEdit) {
      return;
    }

    // Sticky Note Creation
    if (activeTool === 'sticky') {
      const newId = `sticky_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newElem: BoardElement = {
        id: newId,
        type: 'sticky',
        x: Math.round(worldX - 100),
        y: Math.round(worldY - 75),
        width: 200,
        height: 160,
        color: activeStickyColor,
        text: '',
        authorId: currentUser.uid,
        authorName: currentUser.displayName,
        authorRole: currentUser.role === 'teacher' ? 'teacher' : 'student',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      upsertBoardElement(board.id, newElem);
      setSelectedElementId(newId);
      setActiveTool('select');
      return;
    }

    // Text Box Creation
    if (activeTool === 'text') {
      const newId = `text_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newElem: BoardElement = {
        id: newId,
        type: 'text',
        x: Math.round(worldX),
        y: Math.round(worldY),
        width: 260,
        height: 60,
        color: 'transparent',
        textColor: '#1E293B',
        text: 'Ketik teks di sini...',
        fontSize: 18,
        authorId: currentUser.uid,
        authorName: currentUser.displayName,
        authorRole: currentUser.role === 'teacher' ? 'teacher' : 'student',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      upsertBoardElement(board.id, newElem);
      setSelectedElementId(newId);
      setActiveTool('select');
      return;
    }

    // Shape Creation
    if (activeTool === 'shape') {
      const newId = `shape_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newElem: BoardElement = {
        id: newId,
        type: 'shape',
        shapeType: activeShapeType,
        x: Math.round(worldX - 100),
        y: Math.round(worldY - 50),
        width: activeShapeType === 'line' || activeShapeType === 'arrow' ? 240 : 200,
        height: activeShapeType === 'line' || activeShapeType === 'arrow' ? 40 : 120,
        color: activeStickyColor,
        text: activeShapeType === 'rectangle' || activeShapeType === 'circle' ? '' : undefined,
        authorId: currentUser.uid,
        authorName: currentUser.displayName,
        authorRole: currentUser.role === 'teacher' ? 'teacher' : 'student',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      upsertBoardElement(board.id, newElem);
      setSelectedElementId(newId);
      setActiveTool('select');
      return;
    }

    // Freehand Pen Tool
    if (activeTool === 'pen') {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {}
      isDrawingRef.current = true;
      setIsDrawing(true);
      currentStrokePoints.current = [{ x: worldX, y: worldY }];

      // Immediately render dot on the live overlay canvas
      const liveCanvas = liveCanvasRef.current;
      if (liveCanvas) {
        const ctx = liveCanvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, liveCanvas.width, liveCanvas.height);
          ctx.beginPath();
          ctx.arc(worldX, worldY, Math.max(1.5, activeStrokeWidth / 2), 0, Math.PI * 2);
          ctx.fillStyle = activePenColor;
          ctx.fill();
        }
      }
      return;
    }

    // Deselect if clicking on empty canvas
    setSelectedElementId(null);
  };

  // Pointer Move
  const handlePointerMove = (e: React.PointerEvent) => {
    // Canvas Pan
    if (isPanning) {
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      });
      return;
    }

    // Element Drag
    if (isDraggingElement && selectedElementId && canEdit) {
      const dx = (e.clientX - dragStartPos.current.mouseX) / scale;
      const dy = (e.clientY - dragStartPos.current.mouseY) / scale;
      const elem = board.elements?.[selectedElementId];
      if (elem) {
        const newX = Math.round(dragStartPos.current.elemX + dx);
        const newY = Math.round(dragStartPos.current.elemY + dy);
        // Only broadcast if changed
        if (elem.x !== newX || elem.y !== newY) {
          upsertBoardElement(board.id, {
            ...elem,
            x: newX,
            y: newY,
            updatedAt: new Date().toISOString(),
          });
        }
      }
      return;
    }

    // Freehand Drawing (Real-time 60fps render on live overlay canvas)
    if (isDrawingRef.current && canEdit) {
      const { x: worldX, y: worldY } = screenToWorld(e.clientX, e.clientY);
      const pts = currentStrokePoints.current;
      const lastPt = pts[pts.length - 1];

      // Only add point if moved at least 1.5 units
      if (!lastPt || Math.hypot(worldX - lastPt.x, worldY - lastPt.y) >= 1.5) {
        pts.push({ x: worldX, y: worldY });
      }

      // Draw real-time stroke on live overlay canvas
      const liveCanvas = liveCanvasRef.current;
      if (liveCanvas && pts.length > 0) {
        const ctx = liveCanvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, liveCanvas.width, liveCanvas.height);
          ctx.beginPath();
          ctx.strokeStyle = activePenColor;
          ctx.lineWidth = activeStrokeWidth;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          if (pts.length === 1) {
            ctx.arc(pts[0].x, pts[0].y, Math.max(1.5, activeStrokeWidth / 2), 0, Math.PI * 2);
            ctx.fillStyle = activePenColor;
            ctx.fill();
          } else {
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) {
              ctx.lineTo(pts[i].x, pts[i].y);
            }
            ctx.stroke();
          }
        }
      }
      return;
    }
  };

  // Pointer Up
  const handlePointerUp = (e?: React.PointerEvent) => {
    if (isPanning) {
      setIsPanning(false);
    }

    if (isDraggingElement) {
      setIsDraggingElement(false);
    }

    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      setIsDrawing(false);

      if (e) {
        try {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
          }
        } catch {}
      }

      // Clear the temporary live drawing canvas
      const liveCanvas = liveCanvasRef.current;
      if (liveCanvas) {
        const ctx = liveCanvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, liveCanvas.width, liveCanvas.height);
      }

      const pts = currentStrokePoints.current;
      if (pts.length > 0) {
        const finalPoints =
          pts.length === 1
            ? [{ ...pts[0] }, { x: pts[0].x + 0.1, y: pts[0].y + 0.1 }]
            : [...pts];

        // Draw immediately onto the base canvas so there is ZERO delay/flash before Firestore updates
        const baseCanvas = drawCanvasRef.current;
        if (baseCanvas) {
          const ctx = baseCanvas.getContext('2d');
          if (ctx) {
            ctx.beginPath();
            ctx.strokeStyle = activePenColor;
            ctx.lineWidth = activeStrokeWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.moveTo(finalPoints[0].x, finalPoints[0].y);
            for (let i = 1; i < finalPoints.length; i++) {
              ctx.lineTo(finalPoints[i].x, finalPoints[i].y);
            }
            ctx.stroke();
          }
        }

        const newStrokeId = `draw_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const newStroke: BoardElement = {
          id: newStrokeId,
          type: 'drawing',
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          color: activePenColor,
          strokeWidth: activeStrokeWidth,
          points: finalPoints,
          authorId: currentUser.uid,
          authorName: currentUser.displayName,
          authorRole: currentUser.role === 'teacher' ? 'teacher' : 'student',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        upsertBoardElement(board.id, newStroke);
      }
      currentStrokePoints.current = [];
    }
  };

  // Drag start on single element
  const handleElementDragStart = (e: React.PointerEvent, elem: BoardElement) => {
    e.stopPropagation();
    if (!canEdit) return;

    if (activeTool === 'eraser') {
      removeBoardElement(board.id, elem.id);
      return;
    }

    setSelectedElementId(elem.id);
    setIsDraggingElement(true);
    dragStartPos.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      elemX: elem.x,
      elemY: elem.y,
    };
  };

  // Delete selected item
  const handleDeleteSelected = () => {
    if (!selectedElementId || !canEdit) return;
    removeBoardElement(board.id, selectedElementId);
    setSelectedElementId(null);
  };

  // Change color of selected sticky note
  const handleColorChangeSelected = (color: string) => {
    if (!selectedElementId || !canEdit) return;
    const elem = board.elements?.[selectedElementId];
    if (elem) {
      upsertBoardElement(board.id, {
        ...elem,
        color,
        updatedAt: new Date().toISOString(),
      });
    }
  };

  // Copy join code
  const handleCopyCode = () => {
    navigator.clipboard.writeText(board.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Export board as PNG image
  const handleExportPNG = async () => {
    setExporting(true);
    try {
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = 1920;
      exportCanvas.height = 1080;
      const ctx = exportCanvas.getContext('2d');
      if (!ctx) return;

      // Clean background
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

      // Subtle grid dots
      ctx.fillStyle = '#E2E8F0';
      for (let x = 20; x < exportCanvas.width; x += 30) {
        for (let y = 20; y < exportCanvas.height; y += 30) {
          ctx.beginPath();
          ctx.arc(x, y, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Title banner at top
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 28px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(board.title, 60, 60);

      ctx.font = '16px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#64748B';
      ctx.fillText(`Papan Ide Kolaborasi • Kode: ${board.code} • Dibuat oleh: ${board.creatorName}`, 60, 90);

      // Render elements
      const elements = Object.values(board.elements || {});

      // 1. Render drawings first
      elements.forEach((elem) => {
        if (elem.type === 'drawing' && elem.points && elem.points.length > 1) {
          ctx.beginPath();
          ctx.strokeStyle = elem.color;
          ctx.lineWidth = elem.strokeWidth || 4;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          const [first, ...rest] = elem.points;
          ctx.moveTo(first.x, first.y);
          for (const pt of rest) {
            ctx.lineTo(pt.x, pt.y);
          }
          ctx.stroke();
        }
      });

      // 2. Render shapes
      elements.forEach((elem) => {
        if (elem.type === 'shape') {
          ctx.fillStyle = elem.color;
          ctx.strokeStyle = '#00000020';
          ctx.lineWidth = 2;

          if (elem.shapeType === 'rectangle') {
            ctx.beginPath();
            ctx.roundRect(elem.x, elem.y, elem.width, elem.height, 8);
            ctx.fill();
            ctx.stroke();
            if (elem.text) {
              ctx.fillStyle = '#1E293B';
              ctx.font = 'bold 15px "Plus Jakarta Sans", sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(elem.text, elem.x + elem.width / 2, elem.y + elem.height / 2);
              ctx.textAlign = 'start';
            }
          } else if (elem.shapeType === 'circle') {
            ctx.beginPath();
            ctx.arc(
              elem.x + elem.width / 2,
              elem.y + elem.height / 2,
              elem.width / 2,
              0,
              Math.PI * 2
            );
            ctx.fill();
            ctx.stroke();
            if (elem.text) {
              ctx.fillStyle = '#1E293B';
              ctx.font = 'bold 16px "Plus Jakarta Sans", sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              const lines = elem.text.split('\n');
              lines.forEach((line, idx) => {
                ctx.fillText(
                  line,
                  elem.x + elem.width / 2,
                  elem.y + elem.height / 2 - (lines.length - 1) * 10 + idx * 22
                );
              });
              ctx.textAlign = 'start';
            }
          }
        }
      });

      // 3. Render Sticky Notes
      elements.forEach((elem) => {
        if (elem.type === 'sticky') {
          // Shadow
          ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
          ctx.beginPath();
          ctx.roundRect(elem.x + 4, elem.y + 6, elem.width, elem.height, 12);
          ctx.fill();

          // Card body
          ctx.fillStyle = elem.color;
          ctx.beginPath();
          ctx.roundRect(elem.x, elem.y, elem.width, elem.height, 12);
          ctx.fill();
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Author label
          ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
          ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
          ctx.fillText(`✍️ ${elem.authorName}`, elem.x + 14, elem.y + 22);

          // Sticky text (multi-line wrapping)
          ctx.fillStyle = '#1E293B';
          ctx.font = '14px "Plus Jakarta Sans", sans-serif';
          const text = elem.text || '';
          const words = text.split(' ');
          let line = '';
          let curY = elem.y + 44;
          const maxWidth = elem.width - 28;

          for (const word of words) {
            const testLine = line + word + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && line.length > 0) {
              ctx.fillText(line, elem.x + 14, curY);
              line = word + ' ';
              curY += 20;
            } else {
              line = testLine;
            }
          }
          ctx.fillText(line, elem.x + 14, curY);
        }
      });

      // 4. Render Text elements
      elements.forEach((elem) => {
        if (elem.type === 'text') {
          ctx.fillStyle = elem.textColor || '#1E293B';
          ctx.font = `bold ${elem.fontSize || 18}px "Plus Jakarta Sans", sans-serif`;
          ctx.fillText(elem.text || '', elem.x, elem.y + 24);
        }
      });

      // Download triggered
      const link = document.createElement('a');
      link.download = `Papan_Ide_${board.code}_${board.title.replace(/\s+/g, '_')}.png`;
      link.href = exportCanvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Export failed', err);
    } finally {
      setExporting(false);
    }
  };

  const activeParticipantsList = Object.values(board.activeParticipants || {}).filter(
    (p) => Date.now() - new Date(p.lastActive).getTime() < 60000 // active in last 60 seconds
  );

  return (
    <div className="relative w-full h-full min-h-screen flex flex-col bg-slate-100 overflow-hidden select-none">
      {/* Top Navbar */}
      <div className="h-16 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between z-20 shadow-xs">
        {/* Left: Back & Title */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
            title="Kembali ke Daftar Papan"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 truncate max-w-[180px] sm:max-w-xs md:max-w-md">
                {board.title}
              </h1>
              {board.isLocked && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                  <Lock className="w-3 h-3" />
                  <span>Terkunci</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              Papan Kolaborasi • Dibuat oleh {board.creatorName}
            </p>
          </div>
        </div>

        {/* Center: Share Code Pill */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs sm:text-sm font-semibold transition-all cursor-pointer"
            title="Bagikan Kode Sesi"
          >
            <Share2 className="w-4 h-4 text-indigo-600" />
            <span className="font-mono tracking-wider font-bold">{board.code}</span>
          </button>
        </div>

        {/* Right: Actions & Participants */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Active Participants Button */}
          <button
            type="button"
            onClick={() => setShowParticipantsModal(true)}
            className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-slate-700 hover:bg-slate-100 text-xs sm:text-sm font-medium transition-colors cursor-pointer"
            title="Lihat Peserta Aktif"
          >
            <Users className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Peserta:</span>
            <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
              {activeParticipantsList.length || 1}
            </span>
          </button>

          {/* Teacher Lock / Unlock Controls */}
          {isTeacher && (
            <button
              type="button"
              onClick={() => toggleBoardLock(board.id, !board.isLocked)}
              className={`p-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                board.isLocked
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
              title={board.isLocked ? 'Buka Kunci Papan' : 'Kunci Papan (Mode Presentasi)'}
            >
              {board.isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              <span className="hidden md:inline">
                {board.isLocked ? 'Buka Kunci' : 'Kunci Papan'}
              </span>
            </button>
          )}

          {/* Export PNG */}
          <button
            type="button"
            onClick={handleExportPNG}
            disabled={exporting}
            className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Unduh Papan sebagai Gambar (PNG)"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span className="hidden lg:inline">Ekspor PNG</span>
          </button>

          {/* Print / PDF */}
          <button
            type="button"
            onClick={() => window.print()}
            className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 text-xs sm:text-sm font-medium transition-colors hidden sm:flex items-center gap-1.5 cursor-pointer"
            title="Cetak Papan"
          >
            <Printer className="w-4 h-4 text-slate-600" />
          </button>

          {/* Exit to Main Dashboard */}
          {onExit && (
            <button
              type="button"
              onClick={onExit}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl text-slate-700 hover:bg-slate-100 border border-slate-200 text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ml-1"
              title="Keluar ke Menu Utama"
            >
              <Home className="w-4 h-4 text-indigo-600" />
              <span className="hidden md:inline">Menu Utama</span>
            </button>
          )}
        </div>
      </div>

      {/* Locked Notice Banner */}
      {board.isLocked && !isTeacher && (
        <div className="bg-amber-500 text-white px-4 py-2 text-xs sm:text-sm font-medium flex items-center justify-center gap-2 shadow-xs z-10">
          <Lock className="w-4 h-4" />
          <span>
            Papan sedang dikunci oleh Guru untuk sesi presentasi. Kamu dapat melihat ide teman-teman tanpa mengubah kanvas.
          </span>
        </div>
      )}

      {/* Main Interactive Stage */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`relative flex-1 w-full h-full overflow-hidden touch-none ${
          activeTool === 'hand' || isPanning ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
        }`}
        style={{
          backgroundImage: `radial-gradient(#CBD5E1 1.5px, transparent 1.5px)`,
          backgroundSize: '24px 24px',
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      >
        {/* World Transform Container */}
        <div
          className="absolute origin-top-left transition-none"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            width: '3200px',
            height: '2400px',
          }}
        >
          {/* Layer 1: HTML5 Canvas for Freehand Drawing Strokes */}
          <canvas
            ref={drawCanvasRef}
            width={3200}
            height={2400}
            className="absolute inset-0 pointer-events-none z-0"
          />

          {/* Layer 2: Interactive SVG and DOM Elements (Shapes, Sticky Notes, Text) */}
          {Object.values(board.elements || {}).map((elem) => {
            if (elem.type === 'drawing') return null; // rendered on canvas

            const isSelected = selectedElementId === elem.id;

            // Render Shapes
            if (elem.type === 'shape') {
              return (
                <div
                  key={elem.id}
                  onPointerDown={(e) => handleElementDragStart(e, elem)}
                  className={`absolute group cursor-move transition-shadow ${
                    isSelected ? 'ring-2 ring-indigo-500 ring-offset-2' : ''
                  }`}
                  style={{
                    left: `${elem.x}px`,
                    top: `${elem.y}px`,
                    width: `${elem.width}px`,
                    height: `${elem.height}px`,
                    zIndex: elem.zIndex || 5,
                  }}
                >
                  {elem.shapeType === 'rectangle' && (
                    <div
                      className="w-full h-full rounded-xl border-2 border-slate-300 shadow-xs flex items-center justify-center p-3 text-center"
                      style={{ backgroundColor: elem.color }}
                    >
                      {elem.text && (
                        <span className="font-bold text-slate-800 text-sm sm:text-base leading-tight">
                          {elem.text}
                        </span>
                      )}
                    </div>
                  )}

                  {elem.shapeType === 'circle' && (
                    <div
                      className="w-full h-full rounded-full border-2 border-slate-300 shadow-xs flex items-center justify-center p-4 text-center"
                      style={{ backgroundColor: elem.color }}
                    >
                      {elem.text && (
                        <span className="font-bold text-slate-800 text-sm sm:text-base whitespace-pre-line leading-tight">
                          {elem.text}
                        </span>
                      )}
                    </div>
                  )}

                  {elem.shapeType === 'arrow' && (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-full h-1.5 bg-slate-700 relative">
                        <ArrowRight className="absolute right-0 -top-3 w-7 h-7 text-slate-700" />
                      </div>
                    </div>
                  )}

                  {elem.shapeType === 'line' && (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-full h-1 bg-slate-600 rounded-full" />
                    </div>
                  )}

                  {/* Delete button on hover for author or teacher */}
                  {isSelected && canEdit && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSelected();
                      }}
                      className="board-interactive-control absolute -top-3 -right-3 p-1.5 bg-rose-600 text-white rounded-full shadow-md hover:bg-rose-700 cursor-pointer"
                      title="Hapus Bentuk"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            }

            // Render Text Box
            if (elem.type === 'text') {
              return (
                <div
                  key={elem.id}
                  onPointerDown={(e) => handleElementDragStart(e, elem)}
                  className={`absolute group cursor-move p-2 rounded-lg ${
                    isSelected ? 'ring-2 ring-indigo-500 bg-indigo-50/20' : ''
                  }`}
                  style={{
                    left: `${elem.x}px`,
                    top: `${elem.y}px`,
                    width: `${elem.width}px`,
                    zIndex: elem.zIndex || 10,
                  }}
                >
                  <input
                    type="text"
                    disabled={!canEdit}
                    value={elem.text || ''}
                    onChange={(e) => {
                      upsertBoardElement(board.id, {
                        ...elem,
                        text: e.target.value,
                        updatedAt: new Date().toISOString(),
                      });
                    }}
                    className="board-interactive-control w-full bg-transparent font-bold tracking-tight text-slate-800 border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-hidden"
                    style={{ fontSize: `${elem.fontSize || 18}px` }}
                  />
                  {isSelected && canEdit && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSelected();
                      }}
                      className="board-interactive-control absolute -top-3 -right-3 p-1.5 bg-rose-600 text-white rounded-full shadow-md hover:bg-rose-700 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            }

            // Render Sticky Note
            return (
              <div
                key={elem.id}
                onPointerDown={(e) => handleElementDragStart(e, elem)}
                className={`absolute group cursor-move rounded-2xl p-3 sm:p-4 shadow-md transition-all flex flex-col justify-between ${
                  isSelected ? 'ring-3 ring-indigo-500 ring-offset-2 scale-[1.02] shadow-xl' : 'hover:shadow-lg'
                }`}
                style={{
                  left: `${elem.x}px`,
                  top: `${elem.y}px`,
                  width: `${elem.width}px`,
                  height: `${elem.height}px`,
                  backgroundColor: elem.color,
                  zIndex: elem.zIndex || 15,
                }}
              >
                {/* Author Header & Delete Button */}
                <div className="flex items-center justify-between pb-1.5 border-b border-black/10">
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <span className="text-[11px] font-bold text-slate-800/80 truncate">
                      ✍️ {elem.authorName}
                    </span>
                    {elem.authorRole === 'teacher' && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-indigo-600 text-white">
                        Guru
                      </span>
                    )}
                  </div>

                  {canEdit && (elem.authorId === currentUser.uid || isTeacher) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeBoardElement(board.id, elem.id);
                      }}
                      className="board-interactive-control p-1 text-slate-600 hover:text-rose-600 hover:bg-black/5 rounded-md cursor-pointer transition-colors"
                      title="Hapus Sticky Note"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Sticky Note Editable Textarea */}
                <textarea
                  disabled={!canEdit}
                  placeholder="Ketik idemu di sini..."
                  value={elem.text || ''}
                  onChange={(e) => {
                    upsertBoardElement(board.id, {
                      ...elem,
                      text: e.target.value,
                      updatedAt: new Date().toISOString(),
                    });
                  }}
                  className="board-interactive-control flex-1 w-full bg-transparent resize-none text-slate-900 font-medium text-xs sm:text-sm leading-relaxed p-1 focus:outline-hidden placeholder:text-black/30"
                />

                {/* Color quick-switch bar on selection */}
                {isSelected && canEdit && (
                  <div className="board-interactive-control flex items-center justify-center gap-1 pt-1 border-t border-black/10">
                    {STICKY_COLORS.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleColorChangeSelected(c.bg);
                        }}
                        className={`w-4 h-4 rounded-full border border-black/20 transition-transform ${
                          elem.color === c.bg ? 'scale-125 ring-2 ring-black/30' : 'hover:scale-110'
                        }`}
                        style={{ backgroundColor: c.bg }}
                        title={c.name}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Layer 3: Live Drawing Canvas for Active Pen Stroke Preview (Real-time 60fps) */}
          <canvas
            ref={liveCanvasRef}
            width={3200}
            height={2400}
            className="absolute inset-0 pointer-events-none z-30"
          />
        </div>
      </div>

      {/* Floating Bottom Toolbar (Child-friendly, large buttons for SD students) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xl px-3 py-2 flex items-center gap-1.5 sm:gap-2">
        {/* Select Tool */}
        <button
          type="button"
          onClick={() => setActiveTool('select')}
          className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl transition-all cursor-pointer flex flex-col items-center justify-center ${
            activeTool === 'select'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
          title="Pilih & Pindahkan Objek"
        >
          <MousePointer className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className="text-[10px] font-semibold mt-0.5 hidden md:block">Pilih</span>
        </button>

        {/* Hand / Pan Tool */}
        <button
          type="button"
          onClick={() => setActiveTool('hand')}
          className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl transition-all cursor-pointer flex flex-col items-center justify-center ${
            activeTool === 'hand'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
          title="Geser Kanvas (Pan)"
        >
          <Hand className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className="text-[10px] font-semibold mt-0.5 hidden md:block">Geser</span>
        </button>

        <div className="w-px h-8 bg-slate-200 mx-1" />

        {/* Sticky Note Tool */}
        <div className="relative group">
          <button
            type="button"
            disabled={!canEdit}
            onClick={() => setActiveTool('sticky')}
            className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl transition-all cursor-pointer flex flex-col items-center justify-center ${
              !canEdit ? 'opacity-40 cursor-not-allowed' : ''
            } ${
              activeTool === 'sticky'
                ? 'bg-amber-400 text-amber-950 ring-2 ring-amber-500 shadow-md'
                : 'text-amber-600 hover:bg-amber-50'
            }`}
            title="Tempel Catatan (Sticky Note)"
          >
            <StickyNote className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="text-[10px] font-semibold mt-0.5 hidden md:block">Catatan</span>
          </button>
        </div>

        {/* Digital Pen Tool */}
        <button
          type="button"
          disabled={!canEdit}
          onClick={() => setActiveTool('pen')}
          className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl transition-all cursor-pointer flex flex-col items-center justify-center ${
            !canEdit ? 'opacity-40 cursor-not-allowed' : ''
          } ${
            activeTool === 'pen'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
              : 'text-blue-600 hover:bg-blue-50'
          }`}
          title="Pena Digital (Menggambar Bebas)"
        >
          <PenTool className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className="text-[10px] font-semibold mt-0.5 hidden md:block">Pena</span>
        </button>

        {/* Text Tool */}
        <button
          type="button"
          disabled={!canEdit}
          onClick={() => setActiveTool('text')}
          className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl transition-all cursor-pointer flex flex-col items-center justify-center ${
            !canEdit ? 'opacity-40 cursor-not-allowed' : ''
          } ${
            activeTool === 'text'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/30'
              : 'text-emerald-600 hover:bg-emerald-50'
          }`}
          title="Kotak Teks"
        >
          <Type className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className="text-[10px] font-semibold mt-0.5 hidden md:block">Teks</span>
        </button>

        {/* Shape Tool */}
        <button
          type="button"
          disabled={!canEdit}
          onClick={() => setActiveTool('shape')}
          className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl transition-all cursor-pointer flex flex-col items-center justify-center ${
            !canEdit ? 'opacity-40 cursor-not-allowed' : ''
          } ${
            activeTool === 'shape'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-500/30'
              : 'text-purple-600 hover:bg-purple-50'
          }`}
          title="Bentuk Dasar (Kotak / Lingkaran / Panah)"
        >
          <Square className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className="text-[10px] font-semibold mt-0.5 hidden md:block">Bentuk</span>
        </button>

        {/* Eraser Tool */}
        <button
          type="button"
          disabled={!canEdit}
          onClick={() => setActiveTool('eraser')}
          className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl transition-all cursor-pointer flex flex-col items-center justify-center ${
            !canEdit ? 'opacity-40 cursor-not-allowed' : ''
          } ${
            activeTool === 'eraser'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-500/30'
              : 'text-rose-600 hover:bg-rose-50'
          }`}
          title="Penghapus"
        >
          <Eraser className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className="text-[10px] font-semibold mt-0.5 hidden md:block">Hapus</span>
        </button>

        <div className="w-px h-8 bg-slate-200 mx-1 hidden sm:block" />

        {/* Clear All Board (Teacher or author) */}
        {isTeacher && (
          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer flex flex-col items-center justify-center"
            title="Bersihkan Seluruh Papan"
          >
            <Trash2 className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="text-[10px] font-semibold mt-0.5 hidden md:block">Bersih</span>
          </button>
        )}
      </div>

      {/* Floating Sub-Toolbar (Active Color / Stroke Selector) */}
      {canEdit && (activeTool === 'sticky' || activeTool === 'pen' || activeTool === 'shape') && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-lg px-3 py-2 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
          {activeTool === 'sticky' && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-600 mr-1">Warna:</span>
              {STICKY_COLORS.map((col) => (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => setActiveStickyColor(col.bg)}
                  className={`w-6 h-6 rounded-full border border-black/20 transition-all ${
                    activeStickyColor === col.bg ? 'scale-125 ring-2 ring-indigo-500' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: col.bg }}
                  title={col.name}
                />
              ))}
            </div>
          )}

          {activeTool === 'pen' && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                {PEN_COLORS.map((col) => (
                  <button
                    key={col.hex}
                    type="button"
                    onClick={() => setActivePenColor(col.hex)}
                    className={`w-6 h-6 rounded-full border border-black/20 transition-all ${
                      activePenColor === col.hex ? 'scale-125 ring-2 ring-indigo-500' : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: col.hex }}
                    title={col.name}
                  />
                ))}
              </div>
              <div className="w-px h-5 bg-slate-200" />
              <div className="flex items-center gap-1">
                {STROKE_WIDTHS.map((s) => (
                  <button
                    key={s.width}
                    type="button"
                    onClick={() => setActiveStrokeWidth(s.width)}
                    className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                      activeStrokeWidth === s.width
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTool === 'shape' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveShapeType('rectangle')}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 ${
                  activeShapeType === 'rectangle' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                <Square className="w-4 h-4" />
                <span>Persegi</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveShapeType('circle')}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 ${
                  activeShapeType === 'circle' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                <Circle className="w-4 h-4" />
                <span>Lingkaran</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveShapeType('arrow')}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 ${
                  activeShapeType === 'arrow' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                <ArrowRight className="w-4 h-4" />
                <span>Panah</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Floating Zoom Controls (Bottom Right) */}
      <div className="absolute bottom-4 right-4 z-20 bg-white rounded-2xl border border-slate-200 shadow-md p-1.5 flex items-center gap-1">
        <button
          type="button"
          onClick={() => handleZoom(-0.15)}
          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
          title="Perkecil Kanvas"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleResetZoom}
          className="px-2 py-1 text-xs font-mono font-bold text-slate-700 hover:bg-slate-100 rounded-md cursor-pointer"
          title="Reset Ukuran (100%)"
        >
          {Math.round(scale * 100)}%
        </button>
        <button
          type="button"
          onClick={() => handleZoom(0.15)}
          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
          title="Perbesar Kanvas"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>

      {/* Share Session Code Modal (Large display for classroom projectors) */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 text-center shadow-2xl space-y-6">
            <div className="w-16 h-16 rounded-3xl bg-indigo-50 border border-indigo-100 text-indigo-600 mx-auto flex items-center justify-center">
              <Share2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-bold text-slate-900">Kode Sesi Papan Ide</h3>
              <p className="text-sm text-slate-500">
                Siswa dapat langsung bergabung dengan memasukkan kode berikut di perangkat mereka:
              </p>
            </div>

            <div className="bg-slate-50 border-2 border-indigo-200 rounded-2xl p-4 sm:p-6 flex flex-col items-center justify-center">
              <span className="text-4xl sm:text-5xl font-black font-mono tracking-widest text-indigo-700">
                {board.code}
              </span>
              <span className="text-xs font-medium text-slate-500 mt-2">
                Tampilkan di proyektor kelas atau bagikan ke siswa
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleCopyCode}
                className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-indigo-500/20"
              >
                {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedCode ? 'Kode Tersalin!' : 'Salin Kode'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="py-3 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm cursor-pointer transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Participants Modal */}
      {showParticipantsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900">Peserta Aktif ({activeParticipantsList.length})</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowParticipantsModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
              {activeParticipantsList.map((p) => (
                <div
                  key={p.userId}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{p.name}</span>
                        {p.role === 'teacher' && (
                          <span className="text-[9px] px-1 rounded-sm bg-indigo-600 text-white font-semibold">
                            Guru
                          </span>
                        )}
                      </p>
                      <span className="text-[10px] text-emerald-600 font-medium">● Online di Papan</span>
                    </div>
                  </div>

                  {/* Teacher can toggle student edit rights */}
                  {isTeacher && p.role === 'student' && (
                    <button
                      type="button"
                      onClick={() => {
                        const nextEdit = !p.canEdit;
                        updateBoardParticipant(board.id, {
                          ...p,
                          canEdit: nextEdit,
                        });
                      }}
                      className={`text-xs px-2 py-1 rounded-lg font-semibold cursor-pointer ${
                        p.canEdit
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                      }`}
                    >
                      {p.canEdit ? 'Bisa Edit' : 'Hanya Lihat'}
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowParticipantsModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Confirm Clear Canvas Dialog */}
      <ConfirmDialog
        isOpen={showClearConfirm}
        title="Bersihkan Seluruh Papan?"
        message="Semua catatan, coretan, dan bentuk di papan ini akan dihapus. Tindakan ini tidak dapat dibatalkan."
        confirmText="Ya, Bersihkan Papan"
        cancelText="Batal"
        isDanger={true}
        onConfirm={() => {
          clearAllBoardElements(board.id);
          setShowClearConfirm(false);
        }}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  );
};
