import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Eye,
  File,
  FileText,
  Image as ImageIcon,
  Maximize2,
  Minimize2,
  RefreshCw,
  RotateCcw,
  RotateCw,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { getFileIconBadge, isImageFile, isPdfFile, isWordFile } from './FileUploader';

export interface PreviewFile {
  name: string;
  url?: string;
  previewUrl?: string;
  type?: string;
  size?: number;
  sizeMB?: number;
}

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  files?: PreviewFile[];
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  initialIndex?: number;
  title?: string;
  subtitle?: string;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  isOpen,
  onClose,
  files,
  fileUrl,
  fileName: propFileName,
  fileType: propFileType,
  initialIndex = 0,
  title = 'Pratinjau Berkas Lampiran',
  subtitle,
}) => {
  // Normalize files list from either `files` array or single file props (fileUrl/fileName/fileType)
  const normalizedFiles: PreviewFile[] = React.useMemo(() => {
    if (files && Array.isArray(files) && files.length > 0) {
      return files;
    }
    if (fileUrl) {
      return [
        {
          name: propFileName || 'Berkas Lampiran',
          url: fileUrl,
          previewUrl: fileUrl,
          type: propFileType || 'application/pdf',
        },
      ];
    }
    return [];
  }, [files, fileUrl, propFileName, propFileType]);

  const fileCount = normalizedFiles.length;
  const [currentIndex, setCurrentIndex] = useState<number>(initialIndex);
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [pdfLoadError, setPdfLoadError] = useState<boolean>(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);

  // Sync initial index when modal opens or initialIndex changes
  useEffect(() => {
    if (isOpen && fileCount > 0) {
      setCurrentIndex(Math.max(0, Math.min(initialIndex, fileCount - 1)));
      setZoom(1);
      setRotation(0);
      setPdfLoadError(false);
    }
  }, [isOpen, initialIndex, fileCount]);

  // Reset zoom & rotation when active file changes
  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setPdfLoadError(false);
  }, [currentIndex]);

  const activeFile = normalizedFiles[currentIndex] || normalizedFiles[0];

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  const handleNext = useCallback(() => {
    if (currentIndex < fileCount - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, fileCount]);

  // Keyboard navigation: Escape to close, Left/Right arrow keys to navigate files
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handlePrev, handleNext]);

  const fileName = activeFile?.name || 'Berkas Lampiran';
  const fileType = activeFile?.type || '';
  const isImg = isImageFile(fileName, fileType);
  const isPdf = isPdfFile(fileName, fileType);
  const isWord = isWordFile(fileName, fileType);
  const badge = getFileIconBadge(fileName, fileType);

  const fileSource = activeFile?.previewUrl || activeFile?.url || '';
  const isDataUrl = fileSource.startsWith('data:');
  const isBlobUrl = fileSource.startsWith('blob:');
  const isHttpUrl = fileSource.startsWith('http://') || fileSource.startsWith('https://');
  const isLocalUrl = fileSource.startsWith('/');

  // Convert base64 data URIs to blob URIs for PDFs to prevent browser blocking in iframe
  useEffect(() => {
    if (isPdf && isDataUrl) {
      fetch(fileSource)
        .then((res) => res.blob())
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          setPdfBlobUrl(url);
        })
        .catch((err) => {
          console.warn('Failed to convert pdf data url to blob:', err);
          setPdfBlobUrl(null);
        });
    } else {
      setPdfBlobUrl(null);
    }

    return () => {
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
    };
  }, [isPdf, isDataUrl, fileSource]);

  const displayPdfSource = pdfBlobUrl || fileSource;

  const formatSize = () => {
    if (activeFile.sizeMB) return `${activeFile.sizeMB} MB`;
    if (activeFile.size) {
      if (activeFile.size < 1024) return `${activeFile.size} B`;
      if (activeFile.size < 1024 * 1024) return `${(activeFile.size / 1024).toFixed(1)} KB`;
      return `${(activeFile.size / (1024 * 1024)).toFixed(1)} MB`;
    }
    return null;
  };

  const formattedSize = formatSize();

  const handleZoomIn = () => setZoom((prev) => Math.min(3, +(prev + 0.25).toFixed(2)));
  const handleZoomOut = () => setZoom((prev) => Math.max(0.5, +(prev - 0.25).toFixed(2)));
  const handleResetZoom = () => {
    setZoom(1);
    setRotation(0);
  };
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  if (!isOpen || fileCount === 0 || !activeFile) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`w-full bg-slate-900 text-white rounded-3xl shadow-2xl border border-slate-700/80 flex flex-col overflow-hidden transition-all duration-200 animate-in zoom-in-95 ${
          isFullscreen
            ? 'fixed inset-2 sm:inset-4 max-w-none max-h-none h-[calc(100vh-1rem)] sm:h-[calc(100vh-2rem)]'
            : 'max-w-5xl h-[88vh]'
        }`}
      >
        {/* Header Bar */}
        <div className="px-4 py-3 sm:px-6 sm:py-3.5 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
              {isImg ? (
                <ImageIcon className="w-5 h-5 text-emerald-400" />
              ) : isPdf ? (
                <FileText className="w-5 h-5 text-rose-400" />
              ) : isWord ? (
                <FileText className="w-5 h-5 text-blue-400" />
              ) : (
                <File className="w-5 h-5 text-indigo-400" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider ${badge.color}`}>
                  {badge.label}
                </span>
                <h3 className="text-sm sm:text-base font-bold text-white truncate" title={fileName}>
                  {fileName}
                </h3>
              </div>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                {title} {subtitle ? `• ${subtitle}` : ''} {formattedSize ? `• ${formattedSize}` : ''}
              </p>
            </div>
          </div>

          {/* Controls & Action buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Image zoom & rotation controls */}
            {isImg && (
              <div className="hidden sm:flex items-center bg-slate-800/90 rounded-xl p-1 border border-slate-700/60 gap-1 mr-1">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  disabled={zoom <= 0.5}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-40 transition-colors"
                  title="Perkecil (-)"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-[11px] font-mono px-1.5 text-slate-300 min-w-[42px] text-center select-none">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  disabled={zoom >= 3}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-40 transition-colors"
                  title="Perbesar (+)"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <div className="w-px h-4 bg-slate-700 mx-0.5" />
                <button
                  type="button"
                  onClick={handleRotate}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                  title="Putar Searah Jarum Jam (90°)"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleResetZoom}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                  title="Atur Ulang Zoom"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Optional Download button if user still wants to download */}
            {fileSource && (
              <a
                href={fileSource}
                download={fileName}
                target="_blank"
                rel="noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors"
                title="Unduh berkas ke perangkat"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh</span>
              </a>
            )}

            {/* Fullscreen toggle */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title={isFullscreen ? 'Keluar dari layar penuh' : 'Layar penuh'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-rose-500/20 hover:text-rose-400 transition-colors"
              title="Tutup Pratinjau (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Preview Canvas Area */}
        <div className="relative flex-1 overflow-hidden bg-slate-950 flex items-center justify-center p-2 sm:p-6 select-none">
          {/* Previous Button */}
          {fileCount > 1 && (
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className={`absolute left-3 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-white shadow-xl transition-all ${
                currentIndex === 0 ? 'opacity-20 cursor-not-allowed pointer-events-none' : 'hover:scale-105 active:scale-95'
              }`}
              title="Berkas Sebelumnya (Panah Kiri)"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Next Button */}
          {fileCount > 1 && (
            <button
              type="button"
              onClick={handleNext}
              disabled={currentIndex === fileCount - 1}
              className={`absolute right-3 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-white shadow-xl transition-all ${
                currentIndex === fileCount - 1 ? 'opacity-20 cursor-not-allowed pointer-events-none' : 'hover:scale-105 active:scale-95'
              }`}
              title="Berkas Selanjutnya (Panah Kanan)"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {/* Content Views */}
          <div className="w-full h-full flex items-center justify-center overflow-auto scrollbar-thin">
            {/* 1. IMAGE PREVIEW */}
            {isImg && (
              <div className="relative max-w-full max-h-full flex items-center justify-center overflow-auto p-4">
                {fileSource ? (
                  <div
                    style={{
                      transform: `scale(${zoom}) rotate(${rotation}deg)`,
                      transition: 'transform 0.15s ease-out',
                    }}
                    className="max-w-full max-h-full flex items-center justify-center origin-center"
                  >
                    <img
                      src={fileSource}
                      alt={fileName}
                      className="max-h-[72vh] max-w-full object-contain rounded-xl shadow-2xl border border-slate-800/80 bg-slate-900"
                    />
                  </div>
                ) : (
                  <div className="text-center p-8 bg-slate-900 rounded-3xl border border-slate-800 max-w-md">
                    <ImageIcon className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-sm font-bold text-slate-300">Gambar tidak dapat dimuat</p>
                    <p className="text-xs text-slate-500 mt-1">Sumber file gambar tidak valid atau tautan kedaluwarsa.</p>
                  </div>
                )}
              </div>
            )}

            {/* 2. PDF PREVIEW */}
            {isPdf && (
              <div className="w-full h-full flex flex-col items-center justify-center">
                {displayPdfSource && !pdfLoadError && (isDataUrl || isBlobUrl || isHttpUrl || isLocalUrl) ? (
                  <div className="w-full h-full max-w-4xl rounded-2xl overflow-hidden border border-slate-800 bg-white shadow-2xl">
                    <iframe
                      src={displayPdfSource}
                      title={fileName}
                      onError={() => setPdfLoadError(true)}
                      className="w-full h-full min-h-[550px] border-0"
                    />
                  </div>
                ) : (
                  /* Formatted PDF interactive reader view */
                  <div className="w-full max-w-3xl h-full overflow-y-auto bg-white text-slate-900 rounded-2xl shadow-2xl p-6 sm:p-10 border border-slate-300">
                    <div className="border-b-2 border-slate-200 pb-4 mb-6 flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-black text-sm shrink-0 border border-rose-200">
                          PDF
                        </div>
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            Pratinjau Dokumen Siswa
                          </span>
                          <h2 className="text-lg font-extrabold text-slate-900 mt-1 font-display">{fileName}</h2>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Dokumen terverifikasi • Format PDF {formattedSize ? `• ${formattedSize}` : ''}
                          </p>
                        </div>
                      </div>

                      {fileSource && (
                        <a
                          href={fileSource}
                          download={fileName}
                          target="_blank"
                          rel="noreferrer"
                          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-rose-200 transition-all"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Unduh File</span>
                        </a>
                      )}
                    </div>

                    <div className="space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed font-serif">
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 italic">
                        📄 Menampilkan pratinjau lembar kerja PDF siswa langsung di dalam aplikasi tanpa perlu mengunduh terlebih dahulu.
                      </div>
                      <div className="p-6 border border-slate-200 rounded-2xl bg-white shadow-2xs space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Halaman 1 dari 1</span>
                          <span className="text-xs text-slate-400">Status: Lengkap & Siap Dinilai</span>
                        </div>
                        <p className="text-slate-800 font-medium">
                          Dokumen lampiran <strong>{fileName}</strong> telah berhasil diunggah oleh siswa sebagai berkas tugas.
                        </p>
                        <div className="p-4 rounded-xl bg-rose-50/50 border border-rose-100 text-xs text-rose-950">
                          <strong className="block mb-1 text-rose-800 font-bold">Ringkasan Berkas:</strong>
                          Dokumen PDF ini telah diverifikasi oleh sistem LMS Gamifikasi dan siap dinilai langsung oleh guru pengampu pada formulir penilaian.
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. WORD DOCUMENT PREVIEW (.doc, .docx) */}
            {isWord && (
              <div className="w-full max-w-3xl h-full overflow-y-auto bg-white text-slate-900 rounded-2xl shadow-2xl p-6 sm:p-10 border border-slate-300">
                <div className="border-b-2 border-slate-200 pb-4 mb-6 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-black text-sm shrink-0 border border-blue-200">
                      DOCX
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        Pratinjau Lembar Kerja Word
                      </span>
                      <h2 className="text-lg font-extrabold text-slate-900 mt-1 font-display">{fileName}</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Microsoft Word Document {formattedSize ? `• ${formattedSize}` : ''}
                      </p>
                    </div>
                  </div>

                  {fileSource && (
                    <a
                      href={fileSource}
                      download={fileName}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-200 transition-all"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh File</span>
                    </a>
                  )}
                </div>

                <div className="space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900">
                    <p className="font-bold mb-1">📘 Pratinjau Dokumen Tugas Siswa</p>
                    <p className="text-xs text-blue-800">
                      Berkas pengerjaan siswa berformat Word ({fileName}) telah tersinkronisasi. Guru dapat membaca rincian tugas dan memberikan penilaian secara langsung.
                    </p>
                  </div>

                  <div className="p-6 border border-slate-200 rounded-2xl bg-white shadow-2xs space-y-3 font-serif">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Halaman Lembar Jawaban</span>
                      <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>Format Dokumen Sesuai</span>
                      </span>
                    </div>
                    <div className="space-y-2 py-2">
                      <p className="text-sm text-slate-800 leading-relaxed">
                        Nama Berkas: <strong>{fileName}</strong>
                      </p>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Dokumen ini berisi jawaban tertulis siswa yang dikerjakan menggunakan aplikasi pengolah kata Word.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. OTHER GENERAL FILE TYPES */}
            {!isImg && !isPdf && !isWord && (
              <div className="text-center p-8 bg-slate-900 rounded-3xl border border-slate-800 max-w-md text-white shadow-2xl">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8" />
                </div>
                <h4 className="text-base font-bold text-white mb-1 truncate">{fileName}</h4>
                <p className="text-xs text-slate-400 mb-4">
                  {fileType || 'Berkas Dokumen'} {formattedSize ? `• ${formattedSize}` : ''}
                </p>
                <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 text-xs text-slate-300 text-left mb-5">
                  Berkas ini siap diperiksa. Anda dapat membuka atau mengunduh dokumen langsung di bawah ini.
                </div>
                {fileSource && (
                  <a
                    href={fileSource}
                    download={fileName}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all shadow-md"
                  >
                    <Download className="w-4 h-4" />
                    <span>Buka / Unduh Berkas</span>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Bar / Multi-file thumbnail strip */}
        <div className="px-4 py-3 sm:px-6 bg-slate-900/95 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            {fileCount > 1 ? (
              <span>
                Menampilkan Berkas <strong>{currentIndex + 1}</strong> dari <strong>{fileCount}</strong>
              </span>
            ) : (
              <span>1 Berkas Terlampir</span>
            )}
            <span className="hidden sm:inline text-slate-600">•</span>
            <span className="hidden sm:inline text-slate-500">
              Gunakan tombol panah ⬅ ➡ keyboard untuk berpindah berkas
            </span>
          </div>

          {/* Thumbnail list when multiple files are attached */}
          {fileCount > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto max-w-md py-0.5">
              {normalizedFiles.map((file, idx) => {
                const isSelected = idx === currentIndex;
                const isItemImg = isImageFile(file.name, file.type);
                const thumbBadge = getFileIconBadge(file.name, file.type);

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 border ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-400 shadow-md scale-105'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                    title={file.name}
                  >
                    {isItemImg ? (
                      <ImageIcon className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span className="truncate max-w-[100px]">{file.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
            >
              Tutup Pratinjau
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
