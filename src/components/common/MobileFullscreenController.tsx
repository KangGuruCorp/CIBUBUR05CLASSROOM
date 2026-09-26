import React, { useEffect, useState, useCallback } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  const userAgent = navigator.userAgent || (navigator as any).vendor || (window as any).opera || '';
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const isSmallScreen = window.innerWidth <= 820;
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  return isMobileUA || (isSmallScreen && isTouch);
};

export const requestFullscreen = async (): Promise<boolean> => {
  try {
    const doc = document as any;
    const docEl = document.documentElement as any;
    const isFs =
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement;

    if (!isFs) {
      const req =
        docEl.requestFullscreen ||
        docEl.webkitRequestFullscreen ||
        docEl.mozRequestFullScreen ||
        docEl.msRequestFullscreen;

      if (req) {
        await req.call(docEl);
        return true;
      }
    }
  } catch (err) {
    // Browser may block if not user triggered
  }
  return false;
};

export const exitFullscreen = async (): Promise<boolean> => {
  try {
    const doc = document as any;
    const isFs =
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement;

    if (isFs) {
      const exit =
        doc.exitFullscreen ||
        doc.webkitExitFullscreen ||
        doc.mozCancelFullScreen ||
        doc.msExitFullscreen;

      if (exit) {
        await exit.call(doc);
        return true;
      }
    }
  } catch (err) {}
  return false;
};

export const MobileFullscreenController: React.FC = () => {
  const [isMobile, setIsMobile] = useState<boolean>(() => isMobileDevice());
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Check fullscreen state
  const updateFsState = useCallback(() => {
    const doc = document as any;
    const fs = Boolean(
      doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
    );
    setIsFullscreen(fs);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(isMobileDevice());
      updateFsState();
    };

    window.addEventListener('resize', handleResize);
    document.addEventListener('fullscreenchange', updateFsState);
    document.addEventListener('webkitfullscreenchange', updateFsState);
    document.addEventListener('mozfullscreenchange', updateFsState);
    document.addEventListener('MSFullscreenChange', updateFsState);

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('fullscreenchange', updateFsState);
      document.removeEventListener('webkitfullscreenchange', updateFsState);
      document.removeEventListener('mozfullscreenchange', updateFsState);
      document.removeEventListener('MSFullscreenChange', updateFsState);
    };
  }, [updateFsState]);

  // Otomatis aktifkan Fullscreen saat pertama kali disentuh/diklik di layar HP (Mobile)
  useEffect(() => {
    if (!isMobile) return;

    let hasRequested = false;
    const handleUserInteraction = () => {
      if (hasRequested) return;
      hasRequested = true;
      requestFullscreen();
    };

    window.addEventListener('touchstart', handleUserInteraction, { passive: true });
    window.addEventListener('touchend', handleUserInteraction, { passive: true });
    window.addEventListener('click', handleUserInteraction, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleUserInteraction);
      window.removeEventListener('touchend', handleUserInteraction);
      window.removeEventListener('click', handleUserInteraction);
    };
  }, [isMobile]);

  // Jika bukan mobile, tidak perlu render tombol melayang
  if (!isMobile) return null;

  return (
    <div className="fixed bottom-20 left-3 z-40 sm:hidden">
      {!isFullscreen ? (
        <button
          type="button"
          onClick={() => requestFullscreen()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-900 text-white text-[11px] font-bold shadow-xl backdrop-blur-md border border-white/20 active:scale-95 transition-all"
          title="Tampilkan Layar Penuh"
        >
          <Maximize2 className="w-3.5 h-3.5 text-[#FFD83D]" />
          <span>Layar Penuh</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => exitFullscreen()}
          className="p-2 rounded-full bg-slate-900/60 hover:bg-slate-900 text-white shadow-md backdrop-blur-md border border-white/20 active:scale-95 transition-all opacity-40 hover:opacity-100"
          title="Keluar Layar Penuh"
        >
          <Minimize2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
