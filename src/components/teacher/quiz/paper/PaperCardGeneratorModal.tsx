import React, { useState, useMemo } from 'react';
import {
  Printer,
  X,
  Users,
  LayoutGrid,
  FileText,
  Sparkles,
  Download,
  Info,
  CheckCircle2,
  Palette,
  Loader2,
} from 'lucide-react';
import { useApp } from '../../../../context/AppContext';
import { PaperCardStudentInfo } from '../../../../types/paperMode';
import { getArucoSvgString } from '../../../../utils/aruco';

export const CARD_COLOR_THEMES = [
  {
    id: 'rainbow',
    name: 'Warna-Warni (Estetik)',
    primary: '#4f46e5',
    border: '#6366f1',
    gradient: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
    bgBadge: '#eef2ff',
    textBadge: '#3730a3',
    accent: '#818cf8',
  },
  {
    id: 'indigo',
    name: 'Indigo & Violet',
    primary: '#4f46e5',
    border: '#6366f1',
    gradient: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
    bgBadge: '#eef2ff',
    textBadge: '#3730a3',
    accent: '#818cf8',
  },
  {
    id: 'emerald',
    name: 'Emerald & Teal',
    primary: '#059669',
    border: '#10b981',
    gradient: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)',
    bgBadge: '#ecfdf5',
    textBadge: '#065f46',
    accent: '#34d399',
  },
  {
    id: 'rose',
    name: 'Rose & Pink',
    primary: '#e11d48',
    border: '#f43f5e',
    gradient: 'linear-gradient(135deg, #e11d48 0%, #db2777 100%)',
    bgBadge: '#fff1f2',
    textBadge: '#9f1239',
    accent: '#fb7185',
  },
  {
    id: 'amber',
    name: 'Amber & Sunset',
    primary: '#d97706',
    border: '#f59e0b',
    gradient: 'linear-gradient(135deg, #d97706 0%, #ea580c 100%)',
    bgBadge: '#fffbeb',
    textBadge: '#92400e',
    accent: '#fbbf24',
  },
  {
    id: 'cyan',
    name: 'Cyan & Sky',
    primary: '#0891b2',
    border: '#06b6d4',
    gradient: 'linear-gradient(135deg, #0891b2 0%, #2563eb 100%)',
    bgBadge: '#ecfeff',
    textBadge: '#155e75',
    accent: '#22d3ee',
  },
  {
    id: 'purple',
    name: 'Purple Cosmic',
    primary: '#9333ea',
    border: '#a855f7',
    gradient: 'linear-gradient(135deg, #9333ea 0%, #c026d3 100%)',
    bgBadge: '#faf5ff',
    textBadge: '#6b21a8',
    accent: '#c084fc',
  },
];

interface PaperCardGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultClassId?: string;
}

export const PaperCardGeneratorModal: React.FC<PaperCardGeneratorModalProps> = ({
  isOpen,
  onClose,
  defaultClassId,
}) => {
  const { classes = [], users = [], currentClassId } = useApp();
  
  // Total students count
  const allStudents = useMemo(() => {
    return users.filter((u) => u.role === 'student');
  }, [users]);

  const [selectedClassId, setSelectedClassId] = useState<string>(
    defaultClassId || currentClassId || (classes[0]?.id ?? 'all')
  );
  const [cardsPerPage, setCardsPerPage] = useState<1 | 2>(2);
  const [cardType, setCardType] = useState<'students' | 'generic'>('students');
  const [genericCount, setGenericCount] = useState<number>(36);
  const [colorMode, setColorMode] = useState<string>('rainbow');
  const [isPrinting, setIsPrinting] = useState<boolean>(false);

  const activeClass = useMemo(() => {
    if (selectedClassId === 'all') return { id: 'all', name: 'Semua Siswa' };
    return classes.find((c) => c.id === selectedClassId);
  }, [classes, selectedClassId]);

  // Students in selected class or all students
  const filteredStudents = useMemo(() => {
    let list = allStudents;
    if (selectedClassId && selectedClassId !== 'all') {
      list = list.filter(
        (u) => u.classIds?.includes(selectedClassId) || (u as any).classId === selectedClassId
      );
    }
    return list.sort((a, b) => {
      const numA = a.absentNumber ?? 999;
      const numB = b.absentNumber ?? 999;
      if (numA !== numB) return numA - numB;
      return a.displayName.localeCompare(b.displayName);
    });
  }, [allStudents, selectedClassId]);

  // Helper to get theme for card
  const getCardTheme = (idx: number) => {
    if (colorMode === 'rainbow') {
      const rainbowPool = CARD_COLOR_THEMES.slice(1);
      return rainbowPool[idx % rainbowPool.length];
    }
    return CARD_COLOR_THEMES.find((t) => t.id === colorMode) || CARD_COLOR_THEMES[1];
  };

  // List of card data to generate
  const cardDataList = useMemo<PaperCardStudentInfo[]>(() => {
    if (cardType === 'generic') {
      return Array.from({ length: genericCount }, (_, i) => ({
        studentId: `generic_${i + 1}`,
        markerId: i + 1,
        studentName: `Siswa #${i + 1}`,
        absentNumber: i + 1,
        className: activeClass?.name || 'Semua Siswa',
      }));
    }

    return filteredStudents.map((st, index) => {
      const markerId = st.absentNumber && st.absentNumber > 0 ? st.absentNumber : index + 1;
      const studentClass = classes.find((c) => st.classIds?.includes(c.id) || (st as any).classId === c.id);
      return {
        studentId: st.uid,
        markerId,
        studentName: st.displayName,
        absentNumber: st.absentNumber ?? index + 1,
        studentNumber: st.studentNumber,
        className: studentClass?.name || activeClass?.name || 'Kelas Siswa',
      };
    });
  }, [cardType, genericCount, filteredStudents, activeClass, classes]);

  // Clean, isolated multi-page printing via hidden iframe
  const handlePrint = () => {
    if (cardDataList.length === 0) return;
    setIsPrinting(true);

    const iframeId = 'paper-cards-print-iframe';
    const oldIframe = document.getElementById(iframeId);
    if (oldIframe && document.body.contains(oldIframe)) {
      document.body.removeChild(oldIframe);
    }

    const iframe = document.createElement('iframe');
    iframe.id = iframeId;
    iframe.setAttribute(
      'style',
      'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;z-index:-999;'
    );
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      setIsPrinting(false);
      window.print();
      return;
    }

    const cardsHtml = cardDataList.map((card, idx) => {
      const theme = getCardTheme(idx);
      const isTwoPerPage = cardsPerPage === 2;
      const isPageBreakAfter = !isTwoPerPage || (idx % 2 === 1 && idx < cardDataList.length - 1);
      const markerSize = isTwoPerPage ? '84mm' : '150mm';
      const svg = getArucoSvgString(card.markerId, markerSize);

      return `
        <div class="print-card" style="
          border: 2px solid ${theme.border};
          border-radius: 14px;
          background: #ffffff;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: ${isTwoPerPage ? '5mm 7mm' : '12mm 12mm'};
          height: ${isTwoPerPage ? '133mm' : '273mm'};
          max-height: ${isTwoPerPage ? '133mm' : '273mm'};
          margin-bottom: ${isTwoPerPage && idx % 2 === 0 ? '6mm' : '0'};
          box-sizing: border-box;
          page-break-inside: avoid;
          break-inside: avoid;
          position: relative;
          overflow: hidden;
          ${isPageBreakAfter ? 'page-break-after: always; break-after: page;' : ''}
        ">
          <!-- Top aesthetic color strip -->
          <div style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background: ${theme.gradient};"></div>

          <!-- Header -->
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #f1f5f9; padding-bottom: 5px;">
            <div>
              <div style="display: inline-block; font-size: 8.5px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: ${theme.primary}; background: ${theme.bgBadge}; padding: 2px 7px; border-radius: 9999px;">
                GAMI-CLASS • MODUS KERTAS
              </div>
              <div style="font-size: ${isTwoPerPage ? '15px' : '19px'}; font-weight: 900; color: #0f172a; margin-top: 2px; line-height: 1.2;">
                ${card.studentName}
              </div>
              <div style="font-size: 10px; font-weight: 600; color: #64748b; margin-top: 1px;">
                ${card.className} • No. Absen: <strong style="color: #0f172a; font-weight: 800;">${card.absentNumber}</strong>
              </div>
            </div>
            <div style="text-align: right; background: ${theme.bgBadge}; border: 1.5px solid ${theme.accent}; border-radius: 12px; padding: 4px 10px;">
              <div style="font-size: 8px; font-weight: 800; color: ${theme.textBadge}; text-transform: uppercase; letter-spacing: 0.05em;">MARKER ID</div>
              <div style="font-size: ${isTwoPerPage ? '18px' : '22px'}; font-weight: 900; color: ${theme.textBadge}; line-height: 1;">#${card.markerId}</div>
            </div>
          </div>

          <!-- Marker Area with Enlarged High-Visibility Barcode & Subtle Anti-Cheating A, B, C, D (Tanpa kata 'sisi') -->
          <div style="position: relative; width: ${isTwoPerPage ? '98mm' : '165mm'}; height: ${isTwoPerPage ? '94mm' : '160mm'}; margin: auto; display: flex; align-items: center; justify-content: center;">
            
            <!-- TOP (A) -->
            <div style="position: absolute; top: 0; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; gap: 1px;">
              <span style="font-size: 9px; font-weight: 700; color: #94a3b8; line-height: 1;">▲</span>
              <span style="font-size: 10.5px; font-weight: 700; color: #64748b; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; padding: 1px 6px; line-height: 1.2;">A</span>
            </div>

            <!-- RIGHT (B) -->
            <div style="position: absolute; right: 0; top: 50%; transform: translateY(-50%); display: flex; align-items: center; gap: 2px;">
              <span style="font-size: 10.5px; font-weight: 700; color: #64748b; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; padding: 1px 6px; line-height: 1.2;">B</span>
              <span style="font-size: 9px; font-weight: 700; color: #94a3b8; line-height: 1;">▶</span>
            </div>

            <!-- BOTTOM (C) -->
            <div style="position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; gap: 1px;">
              <span style="font-size: 10.5px; font-weight: 700; color: #64748b; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; padding: 1px 6px; line-height: 1.2;">C</span>
              <span style="font-size: 9px; font-weight: 700; color: #94a3b8; line-height: 1;">▼</span>
            </div>

            <!-- LEFT (D) -->
            <div style="position: absolute; left: 0; top: 50%; transform: translateY(-50%); display: flex; align-items: center; gap: 2px;">
              <span style="font-size: 9px; font-weight: 700; color: #94a3b8; line-height: 1;">◀</span>
              <span style="font-size: 10.5px; font-weight: 700; color: #64748b; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; padding: 1px 6px; line-height: 1.2;">D</span>
            </div>

            <!-- Central ArUco SVG (Extra Large for maximum camera visibility) -->
            <div style="background: #ffffff; padding: 4px; border: 1.5px dashed ${theme.border}; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
              ${svg}
            </div>
          </div>

          <!-- Footer Instructions (Tanpa kata 'sisi') -->
          <div style="border-top: 1.5px solid #f1f5f9; padding-top: 3px; font-size: 8.5px; text-align: center; color: #64748b; font-weight: 600;">
            Petunjuk: Posisikan huruf pilihan jawabanmu (A, B, C, atau D) di posisi <strong style="color: #0f172a; font-weight: 800;">paling atas</strong>, lalu angkat kartu menghadap ke arah guru.
          </div>
        </div>
      `;
    }).join('');

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cetak Kartu Siswa Paper Mode (${cardDataList.length} Kartu)</title>
          <meta charset="utf-8" />
          <style>
            @page {
              size: A4 portrait;
              margin: 8mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            html, body {
              margin: 0;
              padding: 0;
              background: #ffffff;
              color: #0f172a;
              font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            }
            .print-card {
              box-sizing: border-box;
            }
          </style>
        </head>
        <body>
          ${cardsHtml}
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      setIsPrinting(false);
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 3000);
    }, 500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[94vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-600 text-white flex items-center justify-between shadow-xs shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-xs flex items-center justify-center border border-white/20">
              <Printer className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                Generator Kartu Marker Siswa
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-900">
                  Paper Mode
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400 text-slate-900 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Estetik & Anti-Contek
                </span>
              </h2>
              <p className="text-xs text-indigo-100">
                Kartu jawaban ArUco berwarna-warni dengan label A, B, C, D samar anti-contek
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options Toolbar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 shrink-0 text-xs">
          {/* Class Select */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Pilih Rombel / Siswa:
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-indigo-500 shadow-2xs"
            >
              <option value="all">Semua Siswa ({allStudents.length} Siswa)</option>
              {classes.map((c) => {
                const count = users.filter(
                  (u) => u.role === 'student' && (u.classIds?.includes(c.id) || (u as any).classId === c.id)
                ).length;
                return (
                  <option key={c.id} value={c.id}>
                    {c.name} ({count} Siswa)
                  </option>
                );
              })}
            </select>
          </div>

          {/* Mode: Siswa Rombel vs Generic */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Format Nama:
            </label>
            <div className="flex bg-slate-200/80 p-0.5 rounded-xl font-bold">
              <button
                type="button"
                onClick={() => setCardType('students')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  cardType === 'students'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Nama Siswa ({filteredStudents.length})
              </button>
              <button
                type="button"
                onClick={() => setCardType('generic')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  cardType === 'generic'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Generik (#1-{genericCount})
              </button>
            </div>
          </div>

          {/* Color Mode / Theme */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Palette className="w-3.5 h-3.5 text-indigo-600" />
              Tema Warna Kartu:
            </label>
            <select
              value={colorMode}
              onChange={(e) => setColorMode(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-indigo-500 shadow-2xs"
            >
              {CARD_COLOR_THEMES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Layout per Halaman */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Ukuran Kertas:
            </label>
            <div className="flex bg-slate-200/80 p-0.5 rounded-xl font-bold">
              <button
                type="button"
                onClick={() => setCardsPerPage(2)}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  cardsPerPage === 2
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                2 Kartu / A4 (Standar)
              </button>
              <button
                type="button"
                onClick={() => setCardsPerPage(1)}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  cardsPerPage === 1
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                1 Kartu / A4 (Besar)
              </button>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="px-6 py-2.5 bg-indigo-50/80 border-b border-indigo-100 flex flex-wrap items-center justify-between gap-3 text-xs text-indigo-900">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              Total <strong>{cardDataList.length} kartu</strong> siap cetak (
              {Math.ceil(cardDataList.length / cardsPerPage)} lembar kertas A4).
              Huruf <strong>A, B, C, D dibuat samar</strong> agar tidak dapat dicontek teman sekelas.
            </span>
          </div>
          <button
            type="button"
            onClick={handlePrint}
            disabled={isPrinting || cardDataList.length === 0}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black rounded-xl shadow-xs transition-all flex items-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
          >
            {isPrinting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menyiapkan Dokumen...</span>
              </>
            ) : (
              <>
                <Printer className="w-4 h-4" />
                <span>Cetak Semua Kartu ({cardDataList.length})</span>
              </>
            )}
          </button>
        </div>

        {/* Scrollable Preview Area */}
        <div className="flex-1 p-6 overflow-y-auto bg-slate-100/80">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {cardDataList.map((card, idx) => {
              const theme = getCardTheme(idx);
              return (
                <div
                  key={card.studentId || idx}
                  className="bg-white rounded-2xl border-2 shadow-xs relative flex flex-col justify-between overflow-hidden transition-transform hover:-translate-y-0.5"
                  style={{ borderColor: theme.border }}
                >
                  {/* Top aesthetic color strip */}
                  <div
                    className="h-1.5 w-full"
                    style={{ background: theme.gradient }}
                  />

                  <div className="p-4 flex flex-col justify-between flex-1">
                    {/* Header info */}
                    <div className="flex justify-between items-start border-b border-slate-100 pb-2.5 mb-2.5">
                      <div>
                        <span
                          className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full inline-block mb-1"
                          style={{
                            background: theme.bgBadge,
                            color: theme.primary,
                          }}
                        >
                          GAMI-CLASS • MODUS KERTAS
                        </span>
                        <h4 className="text-base font-black text-slate-900 leading-tight">
                          {card.studentName}
                        </h4>
                        <p className="text-xs font-semibold text-slate-500">
                          {card.className} • No. Absen:{' '}
                          <strong className="text-slate-800 font-extrabold">{card.absentNumber}</strong>
                        </p>
                      </div>
                      <div
                        className="text-right border rounded-xl px-2.5 py-1"
                        style={{
                          background: theme.bgBadge,
                          borderColor: theme.accent,
                        }}
                      >
                        <span
                          className="text-[8px] font-black uppercase block tracking-wider"
                          style={{ color: theme.textBadge }}
                        >
                          MARKER ID
                        </span>
                        <span
                          className="text-lg font-black leading-none"
                          style={{ color: theme.textBadge }}
                        >
                          #{card.markerId}
                        </span>
                      </div>
                    </div>

                    {/* ArUco Marker with Enlarged High-Visibility Barcode & Discrete Anti-Cheating A, B, C, D (Tanpa kata 'sisi') */}
                    <div className="relative w-64 h-64 mx-auto my-2 flex items-center justify-center">
                      {/* Top side (A) */}
                      <div className="absolute top-0.5 left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5 z-10">
                        <span className="text-[9px] font-bold text-slate-400">▲</span>
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100/90 border border-slate-200 rounded px-1.5 py-0.5 leading-none shadow-2xs">
                          A
                        </span>
                      </div>

                      {/* Right side (B) */}
                      <div className="absolute right-0.5 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100/90 border border-slate-200 rounded px-1.5 py-0.5 leading-none shadow-2xs">
                          B
                        </span>
                        <span className="text-[9px] font-bold text-slate-400">▶</span>
                      </div>

                      {/* Bottom side (C) */}
                      <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5 z-10">
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100/90 border border-slate-200 rounded px-1.5 py-0.5 leading-none shadow-2xs">
                          C
                        </span>
                        <span className="text-[9px] font-bold text-slate-400">▼</span>
                      </div>

                      {/* Left side (D) */}
                      <div className="absolute left-0.5 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
                        <span className="text-[9px] font-bold text-slate-400">◀</span>
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100/90 border border-slate-200 rounded px-1.5 py-0.5 leading-none shadow-2xs">
                          D
                        </span>
                      </div>

                      {/* Central ArUco SVG (Extra Large) */}
                      <div
                        className="w-44 h-44 border-1.5 border-dashed rounded-xl p-1.5 bg-white flex items-center justify-center shadow-xs"
                        style={{ borderColor: theme.border }}
                        dangerouslySetInnerHTML={{
                          __html: getArucoSvgString(card.markerId, '160px'),
                        }}
                      />
                    </div>

                    {/* Footer instructions (Tanpa kata 'sisi') */}
                    <div className="border-t border-slate-100 pt-2 mt-2 text-[9.5px] text-center text-slate-500 font-medium">
                      Petunjuk: Posisikan huruf jawabanmu (A, B, C, atau D) di posisi <strong className="text-slate-800">paling atas</strong>, lalu angkat kartu menghadap ke guru.
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={handlePrint}
            disabled={isPrinting || cardDataList.length === 0}
            className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isPrinting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menyiapkan Dokumen...</span>
              </>
            ) : (
              <>
                <Printer className="w-4 h-4" />
                <span>Cetak Semua Kartu ({cardDataList.length} Siswa)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
